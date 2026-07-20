import base64
import io
import json
import os
import subprocess
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import server


class CodexCallTest(unittest.TestCase):
    def test_call_reply_pins_sol_high(self):
        output = {
            'verdict': 'match',
            'reaction': 'Nice!',
            'model': '',
            'say': 'What would you like?',
            'ko': '무엇을 원하세요?',
            'replies': ['Coffee, please.'],
        }
        completed = SimpleNamespace(
            stdout=json.dumps(output), stderr='', returncode=0,
        )

        with patch('server.subprocess.run', return_value=completed) as run:
            reply = server.call_reply({'scenario': 'cafe', 'user': 'Hello'})

        command = run.call_args.args[0]
        self.assertEqual(command[command.index('--model') + 1], 'gpt-5.6-sol')
        configs = {
            command[i + 1] for i, arg in enumerate(command) if arg == '--config'
        }
        disabled = {
            command[i + 1] for i, arg in enumerate(command) if arg == '--disable'
        }
        self.assertIn('model_reasoning_effort="high"', configs)
        self.assertIn('approval_policy="never"', configs)
        self.assertIn('web_search="disabled"', configs)
        self.assertIn('project_doc_max_bytes=0', configs)
        self.assertEqual(disabled, set(server.TEXT_ONLY_FEATURES))
        self.assertIn('--ephemeral', command)
        self.assertIn('--ignore-rules', command)
        self.assertIn('--strict-config', command)
        self.assertEqual(command[command.index('--sandbox') + 1], 'read-only')
        self.assertTrue(run.call_args.kwargs['check'])
        self.assertEqual(run.call_args.kwargs['cwd'], server.ROOT)
        self.assertEqual(reply['say'], output['say'])

    def test_failed_codex_run_is_rejected(self):
        error = subprocess.CalledProcessError(1, ['codex', 'exec'])
        with patch('server.subprocess.run', side_effect=error):
            with self.assertRaises(subprocess.CalledProcessError):
                server.call_reply({'scenario': 'cafe', 'user': 'Hello'})


class ServerAuthTest(unittest.TestCase):
    @staticmethod
    def handler(authorization=None):
        handler = object.__new__(server.Handler)
        handler.path = '/call/reply'
        handler.headers = {'Content-Length': '2'}
        if authorization:
            handler.headers['Authorization'] = authorization
        handler.rfile = io.BytesIO(b'{}')
        handler._json = Mock()
        return handler

    def test_static_files_stay_public(self):
        self.assertNotIn('do_GET', server.Handler.__dict__)

    def test_call_fails_closed_without_credentials(self):
        handler = self.handler()
        with patch.dict(os.environ, {}, clear=True), \
                patch('server.call_reply') as call:
            handler.do_POST()
        handler._json.assert_called_once_with(
            503, {'error': 'call authentication is not configured'}, (
                ('Connection', 'close'),
            ),
        )
        self.assertTrue(handler.close_connection)
        call.assert_not_called()

    def test_call_requires_valid_basic_credentials(self):
        environment = {
            'LIME_CALL_USER': 'learner',
            'LIME_CALL_PASSWORD': 'not-a-real-password',
        }
        valid = base64.b64encode(b'learner:not-a-real-password').decode()
        denied = self.handler('Basic invalid')
        accepted = self.handler(f'Basic {valid}')
        with patch.dict(os.environ, environment, clear=True), \
                patch('server.call_reply', return_value={'say': 'Hello'}) as call:
            denied.do_POST()
            accepted.do_POST()
        denied._json.assert_called_once_with(
            401, {'error': 'authentication required'}, (
                ('WWW-Authenticate', 'Basic realm="LIME call", charset="UTF-8"'),
                ('Connection', 'close'),
            ),
        )
        self.assertTrue(denied.close_connection)
        accepted._json.assert_called_once_with(200, {'say': 'Hello'})
        call.assert_called_once_with({})


if __name__ == '__main__':
    unittest.main()
