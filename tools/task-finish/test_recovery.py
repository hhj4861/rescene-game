import copy
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import types
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('recovery', Path(__file__).with_name('recovery.py'))
recovery = importlib.util.module_from_spec(spec); spec.loader.exec_module(recovery)
gate = types.ModuleType('candidate_gate')
source = Path('/Users/admin/.codex/hooks/task-finish/gate.py').read_text()
if recovery.MARKER in source: source = recovery.original(source)
exec(compile(recovery.patch(source), '<candidate>', 'exec'), gate.__dict__)
BASE = 1767225600
META = {'turn_id': 'turn'}

def row(kind, seconds, payload):
    return {'type': kind, 'timestamp': datetime.fromtimestamp(BASE+seconds, timezone.utc).isoformat(), 'payload': payload}

def event(identifier, process, command, start, end, output='prefix output\n'):
    return row('event_msg', end, {'type': 'item_completed', 'thread_id': 'session', 'turn_id': 'turn',
        'started_at_ms': (BASE+start)*1000, 'completed_at_ms': (BASE+end)*1000,
        'item': {'id': identifier, 'type': 'CommandExecution', 'process_id': str(process), 'command': ['/bin/zsh','-lc',command],
                 'cwd': 'file:///repo', 'status': 'completed', 'exit_code': 0, 'aggregated_output': output}})

def text(value): return {'type':'input_text', 'text':value}

def shell(command): return 'text(await tools.exec_command('+json.dumps({'cmd': command})+'));'

class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.call = {'prepared_at': BASE+20, 'dispatch_version':12, 'dispatch_checked':True,
                     'transcript_path':'/host','turn_id':'turn','tool_name':'apply_patch'}
        self.source = 'text((await tools.exec_command({cmd:"prefix"})).output);text(await tools.apply_patch("bad"));'
        self.events = [event('prefix',11,'prefix',11,15)]
        self.prefix = ['prefix output\n']
        self.failure = 'Script error:\napply_patch verification failed: invalid patch: duplicate target'
        self.wait = False

    def records(self):
        rows=[row('session_meta',0,{'id':'session','cwd':'/repo'}),row('response_item',10,{
            'type':'custom_tool_call','name':'exec','call_id':'outer','input':self.source,'internal_chat_message_metadata_passthrough':META}),*self.events]
        if self.wait:
            rows.append(row('response_item',25,{'type':'custom_tool_call_output','call_id':'outer', 'internal_chat_message_metadata_passthrough':META,
                'output':[text('Script running with cell ID cell1\nWall time 15.0 seconds\nOutput:\n'),*[text(v) for v in self.prefix]]}))
            rows.append(row('response_item',35,{'type':'function_call','name':'wait','call_id':'wait1','arguments':json.dumps({'cell_id':'cell1'}),'internal_chat_message_metadata_passthrough':META}))
            rows.append(row('response_item',40,{'type':'function_call_output','call_id':'wait1','internal_chat_message_metadata_passthrough':META,
                'output':[text('Script failed\nWall time 0.0 seconds\nOutput:\n'),text(self.failure)]}))
        else:
            rows.append(row('response_item',30,{'type':'custom_tool_call_output','call_id':'outer','internal_chat_message_metadata_passthrough':META,
                'output':[text('Script failed\nWall time 20.0 seconds\nOutput:\n'),*[text(v) for v in self.prefix],text(self.failure)]}))
        return sorted(rows,key=lambda r:r['timestamp'])

    def receipt(self, mutate=None, extra=None):
        records=self.records()
        if mutate: mutate(records)
        calls={'pending':self.call,**(extra or {})}
        with patch.object(gate,'host_records',return_value=('session',Path('/host'),records)):
            return gate.projected_failure_receipt('session','/repo','pending',self.call,calls)

    def timeout_fixture(self):
        self.source='text(await tools.write_stdin({session_id:11,chars:""}));'+shell('review')+'text((await tools.exec_command({cmd:"denied"})));'
        self.call['tool_name']='Bash';self.events=[event('poll',11,'old',1,12),event('review',12,'review',14,32)]
        self.prefix=[json.dumps({'exit_code':0}),json.dumps({'session_id':12})];self.wait=True
        self.failure='Script error:\nexec_command failed: CreateProcess { message: "Rejected(\\"The automatic permission approval review did not finish before its deadline. Do not assume the action is unsafe based on the timeout alone. You may retry once, or ask the user for guidance or explicit approval.\\")" }'

    def test_patch_failure_requires_exact_native_stdout(self):
        r=self.receipt();self.assertEqual(r['status'],'failed');self.assertIsNone(r['exit_code']);self.assertEqual(r['prefix_item_ids'],['prefix'])
        self.prefix=['different'];self.assertIsNone(self.receipt())

    def test_running_prefix_and_waited_timeout_use_actual_termination(self):
        self.timeout_fixture();r=self.receipt();self.assertEqual(r['status'],'not_started');self.assertIsNone(r['exit_code']);self.assertEqual(r['prefix_item_ids'],['poll','review'])

    def test_missing_duplicate_wrong_turn_and_running_prefix_are_rejected(self):
        for modify in [lambda r:r.pop(2),lambda r:r.insert(2,copy.deepcopy(r[2])),lambda r:r[2]['payload'].update(turn_id='other'),
                       lambda r:r[2]['payload']['item'].update(status='in_progress'),lambda r:r[2]['payload']['item'].update(exit_code=None),
                       lambda r:r[2]['payload']['item'].update(aggregated_output='fake')]:
            with self.subTest(modify=modify):self.assertIsNone(self.receipt(modify))

    def test_host_failure_cannot_be_stdout_or_success(self):
        self.failure='success';self.assertIsNone(self.receipt())
        self.failure='Script error:\napply_patch verification failed: bad'
        self.assertIsNone(self.receipt(lambda r:r[-1]['payload']['output'][0].update(text='Script completed\nWall time 1.0 seconds\nOutput:\n')))

    def test_failed_call_with_native_execution_or_extra_execution_is_rejected(self):
        self.assertIsNone(self.receipt(lambda r:r.insert(3,event('pending',22,'bad',18,19))))
        self.assertIsNone(self.receipt(lambda r:r.insert(3,event('extra',22,'other',18,19))))

    def test_file_change_without_command_start_timestamp_is_rejected(self):
        extra = row('event_msg', 29, {'type':'item_completed', 'thread_id':'session', 'turn_id':'turn',
                    'item': {'type':'FileChange','id':'extra-file','status':'completed'}})
        self.assertIsNone(self.receipt(lambda r:r.insert(-1,extra)))

    def test_ambiguous_pending_pre_is_rejected(self):
        self.assertIsNone(self.receipt(extra={'other':dict(self.call)}))

    def test_unsupported_and_dynamic_grammar_rejected(self):
        for source in [self.source.replace('.output','.stderr'),self.source.replace('await tools','tools'),
                       self.source+'throw Error("bad");',self.source.replace('cmd:"prefix"','cmd:unknown'),
                       'text(await tools.write_stdin({session_id:1,chars:"x"}));text((await tools.exec_command({cmd:"x"})));',
                       shell('prefix')+'text(await tools.apply_patch("bad"));']:
            with self.subTest(source=source):self.assertIsNone(gate.projected_batch(source))

    def test_new_pre_binding_requires_exact_input_and_rejects_rewritten_source(self):
        records=self.records()
        event_data={**self.call,'tool_input':{'command':'bad'}}
        with patch.object(gate,'host_records',return_value=('session',Path('/host'),records)), patch.object(gate.time,'time',return_value=BASE+20):
            link=gate.projected_context(event_data,'session','/repo')
            self.assertEqual(link['step_index'],1)
            self.assertIsNone(gate.projected_context({**event_data,'tool_input':{'command':'other'}},'session','/repo'))
        self.call.update(dispatch_version=14,projected_dispatch=link)
        self.assertEqual(self.receipt()['status'],'failed')
        self.source=self.source.replace('"bad"','"different"')
        self.assertIsNone(self.receipt())

    def test_current_version_without_pre_binding_is_not_recovered(self):
        self.call['dispatch_version']=14;self.assertIsNone(self.receipt())

    def test_existing_incompatible_binding_is_preserved(self):
        self.call['batch_dispatch']={'outer_call_id':'other'};self.assertIsNone(self.receipt())

    def test_wait_wrong_cell_turn_duplicate_cancel_and_missing_result_rejected(self):
        self.timeout_fixture()
        mutations=[lambda r:r[-2]['payload'].update(arguments=json.dumps({'cell_id':'other'})),
                   lambda r:r[-2]['payload'].update(arguments=json.dumps({'cell_id':'cell1','terminate':True})),
                   lambda r:r[-1]['payload'].update(internal_chat_message_metadata_passthrough={'turn_id':'other'}),
                   lambda r:r.append(copy.deepcopy(r[-1])),lambda r:r.pop()]
        for mutate in mutations:
            with self.subTest(mutate=mutate):self.assertIsNone(self.receipt(mutate))

    def test_prefix_requires_real_termination_and_matches_returned_process(self):
        self.timeout_fixture();self.prefix[1]=json.dumps({'session_id':99});self.assertIsNone(self.receipt())
        self.timeout_fixture();self.events[1]=event('review',12,'review',14,45);self.assertEqual(self.receipt()['status'],'not_started')
        self.events[1]['payload']['item']['status']='in_progress';self.assertIsNone(self.receipt())

    def test_reasoning_is_not_an_unaccounted_process(self):
        extra = row('event_msg', 29, {'type': 'item_completed', 'thread_id': 'session', 'turn_id': 'turn',
                    'started_at_ms': (BASE+28)*1000, 'item': {'type': 'Reasoning', 'id': 'thought'}})
        self.assertEqual(self.receipt(lambda r:r.insert(-1,extra))['status'], 'failed')

    def test_patch_changes_only_evidence_reader_and_pre_binding(self):
        candidate=recovery.patch(source)
        for function,next_function in [('def stop_event(', 'def handle('),('def check(', 'def stop_event(')]:
            old=source[source.index(function):source.index(next_function)]
            new=candidate[candidate.index(function):candidate.index(next_function)]
            self.assertEqual(old,new)
        self.assertRaises(ValueError,recovery.patch,candidate)
        self.assertEqual(recovery.original(candidate),source)

if __name__=='__main__': unittest.main()
