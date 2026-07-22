# 라임(LIME) 정적 서버
# - 정적 GET: Cache-Control max-age=60 (+SimpleHTTPRequestHandler의 Last-Modified 재검증)
#   → 매 로드 전체 재전송 방지. 60초 내 배포 시 모듈 버전 혼합 가능성은 감수 (짧은 창)
# - HTTP/1.1 keep-alive + 넉넉한 backlog → 모듈 13개 동시 fetch에서 connection reset 방지
# - POST /__err → 클라이언트 에러 비컨 수집 (/tmp/duolingo-client-errors.log)
# - POST /call/reply → HTTP Basic 인증 후 영상 통화 LLM 대화
import base64
import hmac
import json
import os
import shutil
import subprocess
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# launchd 환경엔 PATH가 최소라 Codex 절대경로를 찾아둔다
ROOT = Path(__file__).parent
CODEX_BIN = shutil.which('codex') or str(Path.home() / '.local/bin/codex')
CODEX_MODEL = 'gpt-5.6-sol'
CODEX_EFFORT = 'high'
TEXT_ONLY_FEATURES = (
    'apps',
    'browser_use',
    'browser_use_external',
    'browser_use_full_cdp_access',
    'code_mode_host',
    'computer_use',
    'image_generation',
    'in_app_browser',
    'multi_agent',
    'plugins',
    'remote_plugin',
    'shell_snapshot',
    'shell_tool',
    'unified_exec',
    'workspace_dependencies',
)
TEXT_ONLY_ARGS = (
    'exec', '--ephemeral', '--ignore-user-config', '--ignore-rules',
    '--strict-config', '--sandbox', 'read-only',
    *(arg for feature in TEXT_ONLY_FEATURES for arg in ('--disable', feature)),
    '--config', 'approval_policy="never"',
    '--config', 'web_search="disabled"',
    '--config', 'project_doc_max_bytes=0',
)

CALL_PROMPT = '''You are Emma, a friendly 26-year-old American English tutor on a video call with a Korean learner.
Scenario: {scenario}

Conversation so far:
{history}

The learner just said: "{user}"

Reply with ONLY a JSON object (no markdown fence, no other text):
{{
  "verdict": "match" or "recast",
  "reaction": "short warm reaction to what they said (max 8 words)",
  "model": "if verdict is recast: the corrected, natural version of the learner's sentence. else empty string",
  "say": "your next line: respond to what they actually said, then ask ONE simple follow-up question (1-2 short sentences)",
  "ko": "natural Korean translation of say",
  "replies": ["two or three", "short example answers", "the learner could give"]
}}

Rules: use "recast" only when the learner's sentence has a real grammar or word-choice error worth gently correcting.
Keep vocabulary simple (CEFR A2-B1) and sentences short. Stay in the scenario. Never break character, never mention being an AI.'''


def call_authorized(header):
    user = os.environ.get('LIME_CALL_USER', '')
    password = os.environ.get('LIME_CALL_PASSWORD', '')
    if not user or ':' in user or len(password) < 16:
        return None
    scheme, _, token = (header or '').partition(' ')
    if scheme.lower() != 'basic':
        return False
    try:
        supplied = base64.b64decode(token, validate=True)
    except (ValueError, TypeError):
        return False
    expected = f'{user}:{password}'.encode('utf-8')
    return hmac.compare_digest(supplied, expected)


def call_reply(payload):
    history = payload.get('history') or []
    lines = []
    for h in history[-12:]:
        who = 'Emma' if h.get('who') == 'emma' else 'Learner'
        lines.append(f"{who}: {h.get('text', '')}")
    prompt = CALL_PROMPT.format(
        scenario=str(payload.get('scenario', 'free conversation'))[:200],
        history='\n'.join(lines) or '(call just started)',
        user=str(payload.get('user', ''))[:500],
    )
    out = subprocess.run(
        [CODEX_BIN, *TEXT_ONLY_ARGS, '--model', CODEX_MODEL,
         '--config', f'model_reasoning_effort="{CODEX_EFFORT}"', '-'],
        input=prompt, capture_output=True, text=True, timeout=90, cwd=ROOT,
        check=True,
    )
    text = out.stdout.strip()
    start, end = text.find('{'), text.rfind('}')
    if start == -1 or end <= start:
        raise ValueError('no JSON in Codex output')
    data = json.loads(text[start:end + 1])
    # 최소 검증 + 기본값
    return {
        'verdict': 'recast' if data.get('verdict') == 'recast' else 'match',
        'reaction': str(data.get('reaction', 'Nice!')),
        'model': str(data.get('model', '')),
        'say': str(data.get('say') or "Sorry, could you say that again?"),
        'ko': str(data.get('ko', '')),
        'replies': [str(r) for r in (data.get('replies') or [])][:3],
    }


class Handler(SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def end_headers(self):
        if self.command == 'GET':
            self.send_header('Cache-Control', 'max-age=60')
        else:
            self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    def _empty(self, code):
        self.send_response(code)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def _json(self, code, obj, headers=()):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        for name, value in headers:
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path == '/call/reply':
            authorized = call_authorized(self.headers.get('Authorization'))
            if authorized is None:
                self.close_connection = True
                self._json(503, {'error': 'call authentication is not configured'}, (
                    ('Connection', 'close'),
                ))
                return
            if not authorized:
                self.close_connection = True
                self._json(401, {'error': 'authentication required'}, (
                    ('WWW-Authenticate', 'Basic realm="LIME call", charset="UTF-8"'),
                    ('Connection', 'close'),
                ))
                return
        n = int(self.headers.get('Content-Length', '0') or 0)
        body = self.rfile.read(n).decode('utf-8', 'replace')
        if self.path == '/__err':
            with open('/tmp/duolingo-client-errors.log', 'a') as f:
                f.write(time.strftime('%H:%M:%S ') + body + '\n')
            self._empty(204)
        elif self.path == '/call/reply':
            try:
                self._json(200, call_reply(json.loads(body)))
            except Exception as e:
                # 상세(로컬 경로 등)는 서버 로그에만 — 응답은 일반 메시지
                print(f'/call/reply error: {e!r}', file=sys.stderr, flush=True)
                self._json(502, {'error': 'call engine failed'})
        else:
            self._empty(404)

    def log_message(self, *args):
        pass


class Server(ThreadingHTTPServer):
    request_queue_size = 64
    daemon_threads = True


if __name__ == '__main__':
    Server(('0.0.0.0', 8642), Handler).serve_forever()
