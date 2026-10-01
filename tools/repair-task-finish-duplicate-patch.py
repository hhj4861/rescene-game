"""Narrow, evidence-based recovery for a host-rejected Delete+Add patch.

Run without --install to review the patch. Installation requires --expect-sha256
of the existing hook and preserves its backup. Never edits state or transcripts.
"""
import argparse
import hashlib
import importlib.util
from pathlib import Path

FUNCTION = r'''
def duplicate_single_patch_receipt(sid, root, call_id, call, calls):
    """Only an exact host duplicate-path failure; no fabricated completion."""
    try:
        prepared = call['prepared_at']
        if (call.get('tool_name') != 'apply_patch' or call.get('dispatch_version') != 19
                or call.get('dispatch_checked') is not True or call.get('terminal')
                or type(prepared) not in (int, float) or not float('-inf') < prepared < float('inf')
                or not call.get('turn_id') or any(k == 'dispatch' or k.endswith('_dispatch') for k in call)):
            return None
        document = host_records(call['transcript_path'], sid, root, turn=call['turn_id'], before=prepared)
        if not document:
            return None
        thread, path, records = document
        if call.get('actor_thread_id') not in (None, thread):
            return None
        # One indexed pass, avoiding repeated transcript reads for each old request.
        records = list(records)
        by_id = {}
        for row in records:
            p = row.get('payload', {})
            if row.get('type') == 'response_item' and p.get('call_id'):
                by_id.setdefault(p['call_id'], []).append(row)
        candidates = []
        for rows in by_id.values():
            request = rows[0]; p = request.get('payload', {})
            if (p.get('type') != 'custom_tool_call' or p.get('name') != 'exec'
                    or p.get('internal_chat_message_metadata_passthrough', {}).get('turn_id') != call['turn_id']
                    or host_time(request) > prepared):
                continue
            if len(rows) == 2 and rows[1]['payload'].get('type') == 'custom_tool_call_output' and host_time(rows[1]) < prepared:
                continue
            candidates.append(rows)
        if len(candidates) != 1 or len(candidates[0]) != 2:
            return None
        request, reply = candidates[0]; p, q = request['payload'], reply['payload']
        start, end = host_time(request), host_time(reply)
        if (q.get('type') != 'custom_tool_call_output' or not start <= prepared < end
                or q.get('internal_chat_message_metadata_passthrough', {}).get('turn_id') != call['turn_id']):
            return None
        source = p.get('input')
        if not isinstance(source, str) or len(source.encode()) > 262144:
            return None
        match = re.fullmatch(r'\s*text\(await tools\.apply_patch\(("(?:[^"\\]|\\.)*")\)\);?\s*', source, re.S)
        if not match:
            return None
        patch = json.loads(match[1]); lines = patch.splitlines()
        if (len(lines) < 5 or lines[0] != '*** Begin Patch' or lines[-1] != '*** End Patch'
                or not lines[1].startswith('*** Delete File: ') or not lines[2].startswith('*** Add File: ')
                or any(not line.startswith('+') for line in lines[3:-1])):
            return None
        filename = lines[1][len('*** Delete File: '):]
        if not Path(filename).is_absolute() or lines[2] != '*** Add File: ' + filename:
            return None
        relative = str(Path(filename).resolve().relative_to(Path(root).resolve()))
        if call.get('paths') != [relative]:
            return None
        output = host_output(q.get('output'))
        if (not output or len(output) != 2
                or not re.fullmatch(r'Script failed\nWall time [0-9.]+ seconds\nOutput:\n', output[0]['text'])
                or output[1]['text'] != 'Script error:\napply_patch verification failed: invalid patch: multiple operations target ' + filename):
            return None
        siblings = [key for key, other in calls.items()
                    if str(Path(other.get('transcript_path', '')).resolve()) == str(path)
                    and other.get('turn_id') == call['turn_id']
                    and start <= other.get('prepared_at', -1) < end]
        if siblings != [call_id]:
            return None
        for row in records:
            event = row.get('payload', {})
            if (row.get('type') == 'response_item'
                    and event.get('type') in ('custom_tool_call', 'function_call')
                    and row != request and start <= host_time(row) <= end):
                return None
            if row.get('type') == 'event_msg' and event.get('type') == 'item_completed':
                item = event.get('item', {})
                if (item.get('id') == call_id or item.get('type') in ('FileChange', 'CommandExecution')
                        and start <= host_time(row) <= end):
                    return None
        return {'source': 'duplicate-single-patch-failure', 'status': 'failed', 'exit_code': None,
                'outer_call_id': p['call_id'], 'thread_id': thread, 'transcript_path': str(path),
                'turn_id': call['turn_id'], 'source_sha256': hashlib.sha256(source.encode()).hexdigest(),
                'record_sha256': hashlib.sha256(json.dumps([request, reply], sort_keys=True).encode()).hexdigest()}
    except (OSError, ValueError, TypeError, AttributeError, IndexError, KeyError, OverflowError, RecursionError):
        return None

'''


def patched(source):
    anchor = '                       or single_caught_patch_receipt(sid, root, call_id, call, current[\'calls\'])'
    if 'def duplicate_single_patch_receipt(' in source:
        return source
    if source.count(anchor) != 1 or source.count('def reconcile_calls(') != 1:
        raise ValueError('Hook structure changed; review before installing')
    if source.count('MAX_TRANSCRIPT_RECORD_BYTES = 16 * 1024 * 1024') != 1:
        raise ValueError('Transcript bound changed; review required')
    source = source.replace('MAX_TRANSCRIPT_RECORD_BYTES = 16 * 1024 * 1024', 'MAX_TRANSCRIPT_RECORD_BYTES = 32 * 1024 * 1024', 1)
    return source.replace('def reconcile_calls(', FUNCTION + 'def reconcile_calls(', 1).replace(
        anchor, '                       or duplicate_single_patch_receipt(sid, root, call_id, call, current[\'calls\'])\n' + anchor, 1)


def load_gate(path):
    spec = importlib.util.spec_from_file_location('gate_under_test', path)
    module = importlib.util.module_from_spec(spec)
    exec(compile(patched(path.read_text()), str(path), 'exec'), module.__dict__)
    return module


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--install', action='store_true')
    parser.add_argument('--expect-sha256')
    args = parser.parse_args()
    target = Path.home() / '.codex/hooks/task-finish/gate.py'
    original = target.read_bytes(); digest = hashlib.sha256(original).hexdigest()
    candidate = patched(original.decode()).encode()
    compile(candidate, str(target), 'exec')
    if args.install:
        if args.expect_sha256 != digest:
            raise SystemExit('Existing hook digest changed; installation refused')
        backup = target.parent / 'backups' / ('gate-before-duplicate-patch-' + digest + '.py')
        if not backup.exists():
            backup.write_bytes(original); backup.chmod(0o600)
        if target.read_bytes() != original:
            raise SystemExit('Concurrent hook edit; installation refused')
        target.write_bytes(candidate)
        print('Installed narrow recovery; original backup:', backup)
    else:
        print('Current SHA-256:', digest)
        print('Patch adds duplicate-path failure evidence recognition only.')
