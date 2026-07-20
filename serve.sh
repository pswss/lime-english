#!/bin/sh
# 라임(LIME) 로컬 서버 (테일넷 전체에서 접속 가능)
# 사용: ./serve.sh  (백그라운드 자동 실행, 로그: /tmp/duolingo-server.log)
cd "$(dirname "$0")" || exit 1
PORT=8642 # server.py에 고정된 포트 (인자로 못 바꿈)
if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "이미 포트 $PORT 에서 실행 중"
  exit 0
fi
nohup python3 server.py >/tmp/duolingo-server.log 2>&1 &
echo "서버 시작: http://localhost:$PORT"
