import copy
import hashlib
import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('repair', Path(__file__).with_name('repair-task-finish-review-capacity.py'))
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)
gate = repair.load_gate(Path.home() / '.codex/hooks/task-finish/gate.py')


class CapacityRecovery(unittest.TestCase):
    def setUp(self):
        self.path = Path('/trusted/session.jsonl')
        self.key = 'pending-call'
        self.source = 'text(await tools.exec_command({cmd:"printf first"}));\ntext(await tools.exec_command({cmd:"printf second"}));'
        meta = {'turn_id': 'turn'}
        self.rows = [
            {'timestamp': '1970-01-01T00:00:01Z', 'type': 'response_item', 'payload': {
                'type': 'custom_tool_call', 'name': 'exec', 'call_id': 'outer',
                'input': self.source, 'internal_chat_message_metadata_passthrough': meta}},
            {'timestamp': '1970-01-01T00:00:03Z', 'type': 'response_item', 'payload': {
                'type': 'custom_tool_call_output', 'call_id': 'outer',
                'internal_chat_message_metadata_passthrough': meta, 'output': [
                    {'type': 'input_text', 'text': 'Script failed\nWall time 2.0 seconds\nOutput:\n'},
                    {'type': 'input_text', 'text': repair.FAILURE}]}}
        ]
        self.call = {'tool_name': 'Bash', 'dispatch_version': 19, 'dispatch_checked': True,
                     'prepared_at': 2, 'turn_id': 'turn', 'transcript_path': str(self.path),
                     'paths': [], 'new_paths': [], 'batch_dispatch': {
                         'outer_call_id': 'outer', 'thread_id': 'sid', 'turn_id': 'turn',
                         'transcript_path': str(self.path), 'step_index': 0,
                         'source_sha256': hashlib.sha256(self.source.encode()).hexdigest()}}

    def receipt(self, calls=None):
        with patch.object(gate, 'host_records', return_value=('sid', self.path, self.rows)):
            return gate.batch_failure_receipt('sid', '/project', self.key, self.call,
                                              calls or {self.key: self.call})

    def test_exact_host_failure_is_not_started_not_success(self):
        before = copy.deepcopy((self.call, self.rows))
        result = self.receipt()
        self.assertEqual(result['status'], 'not_started')
        self.assertIsNone(result['exit_code'])
        self.assertEqual(result['step_index'], 0)
        self.assertEqual((self.call, self.rows), before)

    def test_changed_error_fails(self):
        self.rows[1]['payload']['output'][1]['text'] += ' changed'
        self.assertIsNone(self.receipt())

    def test_success_wrapper_fails(self):
        self.rows[1]['payload']['output'][0]['text'] = 'Script completed\nWall time 2.0 seconds\nOutput:\n'
        self.assertIsNone(self.receipt())

    def test_wrong_turn_fails(self):
        self.rows[1]['payload']['internal_chat_message_metadata_passthrough'] = {'turn_id': 'other'}
        self.assertIsNone(self.receipt())

    def test_wrong_source_digest_fails(self):
        self.call['batch_dispatch']['source_sha256'] = '0' * 64
        self.assertIsNone(self.receipt())

    def test_wrong_step_fails(self):
        self.call['batch_dispatch']['step_index'] = 1
        self.assertIsNone(self.receipt())

    def test_unchecked_or_legacy_binding_fails(self):
        self.call['dispatch_checked'] = False
        self.assertIsNone(self.receipt())
        self.call['dispatch_checked'] = True
        self.call['dispatch_version'] = 18
        self.assertIsNone(self.receipt())

    def test_missing_and_duplicate_reply_fail(self):
        self.rows.append(copy.deepcopy(self.rows[1]))
        self.assertIsNone(self.receipt())
        self.rows = self.rows[:1]
        self.assertIsNone(self.receipt())

    def test_multiple_pending_calls_fail(self):
        self.assertIsNone(self.receipt({self.key: self.call, 'other': copy.deepcopy(self.call)}))

    def native(self, kind='item_completed', key='pending-call', at='02.500'):
        self.rows.append({'timestamp': '1970-01-01T00:00:' + at + 'Z', 'type': 'event_msg',
                          'payload': {'type': kind, 'thread_id': 'sid', 'turn_id': 'turn',
                                      'item': {'id': key, 'type': 'CommandExecution', 'status': 'completed', 'exit_code': 0}}})

    def test_native_start_prevents_nonexecution_claim(self):
        self.native(kind='item_started')
        self.assertIsNone(self.receipt())

    def test_native_completion_prevents_nonexecution_claim(self):
        self.native()
        self.assertIsNone(self.receipt())

    def test_other_native_command_in_window_fails(self):
        self.native(key='other')
        self.assertIsNone(self.receipt())

    def test_late_native_completion_of_target_fails(self):
        self.native(at='04.000')
        self.assertIsNone(self.receipt())

    def test_untrusted_host_document_fails(self):
        with patch.object(gate, 'host_records', return_value=None):
            self.assertIsNone(gate.batch_failure_receipt('sid', '/project', self.key, self.call, {self.key: self.call}))

    def test_reapplying_patch_requires_review(self):
        source = (Path.home() / '.codex/hooks/task-finish/gate.py').read_text()
        with self.assertRaises(ValueError): repair.patched(repair.patched(source))


if __name__ == '__main__':
    unittest.main(verbosity=2)
