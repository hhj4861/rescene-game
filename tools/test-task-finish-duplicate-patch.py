import copy
import importlib.util
import json
import unittest
import sys
sys.dont_write_bytecode = True
from pathlib import Path
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('repair',Path(__file__).with_name('repair-task-finish-duplicate-patch.py'))
repair=importlib.util.module_from_spec(spec);spec.loader.exec_module(repair)
gate=repair.load_gate(Path.home()/'.codex/hooks/task-finish/gate.py')

class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.root='/project';self.path=Path('/trusted/session.jsonl');self.id='failed-call'
        self.call={'tool_name':'apply_patch','dispatch_version':19,'dispatch_checked':True,'prepared_at':2,'turn_id':'turn','transcript_path':str(self.path),'paths':['model.js']}
        source='*** Begin Patch\n*** Delete File: /project/model.js\n*** Add File: /project/model.js\n+new code\n*** End Patch'
        meta={'turn_id':'turn'}
        self.rows=[{'timestamp':'1970-01-01T00:00:01Z','type':'response_item','payload':{'type':'custom_tool_call','name':'exec','call_id':'outer','input':'text(await tools.apply_patch('+json.dumps(source)+'));','internal_chat_message_metadata_passthrough':meta}}, {'timestamp':'1970-01-01T00:00:03Z','type':'response_item','payload':{'type':'custom_tool_call_output','call_id':'outer','internal_chat_message_metadata_passthrough':meta,'output':[{'type':'input_text','text':'Script failed\nWall time 2.0 seconds\nOutput:\n'},{'type':'input_text','text':'Script error:\napply_patch verification failed: invalid patch: multiple operations target /project/model.js'}]}}]
    def receipt(self,calls=None):
        with patch.object(gate,'host_records',return_value=('sid',self.path,self.rows)):
            return gate.duplicate_single_patch_receipt('sid',self.root,self.id,self.call,calls or {self.id:self.call})
    def test_exact_failure_never_means_success(self):
        result=self.receipt();self.assertEqual(result['status'],'failed');self.assertIsNone(result['exit_code']);self.assertEqual(len(result['record_sha256']),64)
    def test_wrong_path(self):
        self.call['paths']=['other.js'];self.assertIsNone(self.receipt())
    def test_wrong_turn(self):
        self.rows[1]['payload']['internal_chat_message_metadata_passthrough']={'turn_id':'other'};self.assertIsNone(self.receipt())
    def test_missing_or_duplicate_reply(self):
        self.rows.append(copy.deepcopy(self.rows[1]));self.assertIsNone(self.receipt());self.rows=self.rows[:1];self.assertIsNone(self.receipt())
    def test_success_envelope_is_not_failure(self):
        self.rows[1]['payload']['output'][0]['text']='Script completed\nWall time 2.0 seconds\nOutput:\n';self.assertIsNone(self.receipt())
    def test_dynamic_source_refused(self):
        self.rows[0]['payload']['input']='text(await tools.apply_patch(variable));';self.assertIsNone(self.receipt())
    def test_sibling_prevents_attribution(self):
        self.assertIsNone(self.receipt({self.id:self.call,'sibling':copy.deepcopy(self.call)}))
    def test_native_execution_prevents_recovery(self):
        self.rows.append({'timestamp':'1970-01-01T00:00:02Z','type':'event_msg','payload':{'type':'item_completed','item':{'id':'native','type':'FileChange'}}});self.assertIsNone(self.receipt())
    def test_install_is_idempotent(self):
        source=(Path.home()/'.codex/hooks/task-finish/gate.py').read_text();self.assertEqual(repair.patched(repair.patched(source)),repair.patched(source))

if __name__=='__main__':unittest.main()
