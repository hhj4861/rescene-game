"""Add strict host-evidence recovery for projected/parenthesized literal calls.

Never edits completion state or transcripts. Candidate/install preserves other
installed extensions; only official reconcile consumes the new evidence reader.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import tempfile

MARKER = '# task-finish: projected literal dispatch v14'
EXTENSION = r'''
# task-finish: projected literal dispatch v14
def projected_batch(source):
    """Data-only parsing; a new wrapper is required, never reinterpret old grammar."""
    try:
        parser = LiteralBatch(source, allow_poll=True)
        steps, changed = [], False
        while parser.peek() is not None:
            parser.take('text'); parser.take('(')
            wrapped = parser.peek() == '('
            if wrapped: parser.take('('); changed = True
            for token in ('await', 'tools', '.'):
                parser.take(token)
            name = parser.take(); parser.take('('); args = parser.expression(); parser.take(')')
            projection = 'full'
            if wrapped:
                parser.take(')')
                if parser.peek() == '.':
                    parser.take('.'); parser.take('output'); projection = 'output'
            parser.take(')'); parser.take(';')
            if name == 'exec_command' and isinstance(args, dict) and isinstance(args.get('cmd'), str):
                step = ('Bash', args['cmd'], projection)
            elif name == 'apply_patch' and isinstance(args, str) and projection == 'full':
                step = ('apply_patch', args, projection)
            elif name == 'write_stdin' and isinstance(args, dict) and projection == 'full':
                if (set(args) - {'session_id', 'chars', 'yield_time_ms', 'max_output_tokens'}
                        or type(args.get('session_id')) is not int or args['session_id'] <= 0
                        or args.get('chars', '') != ''
                        or any(type(args[k]) is not int or args[k] <= 0 for k in ('yield_time_ms', 'max_output_tokens') if k in args)):
                    return None
                step = ('poll', args, projection)
            else: return None
            steps.append(step)
            if len(steps) > 100: return None
        return steps if changed and len(steps) >= 2 else None
    except (ValueError, TypeError, IndexError, SyntaxError, RecursionError):
        return None


def projected_context(event, sid, root):
    try:
        found = batch_envelope(event, sid, root, time.time(), projected_batch)
        if not found: return None
        link, steps, _, records = found
        tool = event.get('tool_name'); command = (event.get('tool_input') or {}).get('command')
        indices = [i for i, step in enumerate(steps) if step[0] == tool and step[1] == command]
        if len(indices) != 1: return None
        return dict(link, step_index=indices[0])
    except (OSError, ValueError, TypeError, AttributeError, IndexError, KeyError):
        return None


def projected_reply(records, link):
    """Follow one host cell through identity-checked waits to a unique failure."""
    replies = [r for r in records if r.get('type') == 'response_item'
               and r.get('payload', {}).get('type') == 'custom_tool_call_output'
               and r['payload'].get('call_id') == link['outer_call_id']]
    if len(replies) != 1: return None
    reply = replies[0]; output = host_output(reply['payload'].get('output'))
    if not output: return None
    chain, chunks = [reply], output[1:]
    cell = yielded_cell(reply['payload'].get('output'))
    if cell:
        owners = [r for r in records if r.get('type') == 'response_item'
                  and r.get('payload', {}).get('type') == 'custom_tool_call_output'
                  and yielded_cell(r['payload'].get('output')) == cell]
        if len(owners) != 1: return None
        ended = False
        for wait in records:
            p = wait.get('payload', {})
            if wait.get('type') != 'response_item' or p.get('type') != 'function_call' or p.get('name') != 'wait': continue
            args = json.loads(p.get('arguments', '{}'))
            if args.get('cell_id') != cell: continue
            if ended or args.get('terminate') or host_time(wait) <= host_time(chain[-1]): return None
            matches = [r for r in records if r.get('type') == 'response_item'
                       and r.get('payload', {}).get('type') == 'function_call_output'
                       and r['payload'].get('call_id') == p.get('call_id')]
            if len(matches) != 1 or host_time(matches[0]) <= host_time(wait): return None
            reply = matches[0]; output = host_output(reply['payload'].get('output'))
            if not output: return None
            chain.extend([wait, reply]); chunks.extend(output[1:])
            if yielded_cell(reply['payload'].get('output')) == cell: continue
            ended = True
        if not ended: return None
    if (any(r['payload'].get('internal_chat_message_metadata_passthrough', {}).get('turn_id') != link['turn_id'] for r in chain)
            or not re.fullmatch(r'Script failed\nWall time [0-9.]+ seconds\nOutput:\n', output[0]['text'])):
        return None
    return reply, chunks, chain


def projected_failure_receipt(sid, root, call_id, call, calls):
    try:
        found = batch_envelope(call, sid, root, call['prepared_at'], projected_batch)
        if not found: return None
        link, steps, request, records = found
        known = call.get('projected_dispatch'); version = call.get('dispatch_version')
        if not known and not (type(version) is int and 1 <= version <= 13): return None
        if not known and any(value for key, value in call.items() if key == 'dispatch' or key.endswith('_dispatch')): return None
        if known and any(known.get(k) != v for k, v in link.items()): return None
        # No previous parser accepted this source: legacy recovery cannot turn an
        # earlier recognized-input mismatch into permission to invent a binding.
        if any(parser(request['payload']['input']) is not None for parser in
               (literal_batch, polled_batch, leading_poll_batch, trailing_poll_batch, mixed_literal_batch)): return None
        response = projected_reply(records, link)
        if not response: return None
        reply, chunks, chain = response
        started, prepared, ended = host_time(request), call['prepared_at'], host_time(reply)
        index = len(chunks) - 1
        if (not started <= prepared < ended or index < 0 or index >= len(steps)
                or steps[index][0] not in ('Bash', 'apply_patch') or steps[index][0] != call.get('tool_name')
                or known and known.get('step_index') != index): return None
        outstanding = [key for key, other in calls.items() if other.get('transcript_path') == call.get('transcript_path')
                       and other.get('turn_id') == call.get('turn_id') and started <= other.get('prepared_at', -1) < ended
                       and not other.get('terminal')]
        if outstanding != [call_id]: return None
        native = [r for r in records if r.get('type') == 'event_msg' and r.get('payload', {}).get('type') == 'item_completed'
                  and r['payload'].get('item', {}).get('type') in ('CommandExecution', 'FileChange')]
        if any(r['payload'].get('item', {}).get('id') == call_id for r in native): return None
        evidence, used = [], set()
        for i, (kind, args, projection) in enumerate(steps[:index]):
            if kind not in ('Bash', 'poll'): return None
            matches = []
            for row in native:
                event = row['payload']; item = event.get('item', {})
                if item.get('type') != 'CommandExecution': continue
                if kind == 'poll':
                    if str(item.get('process_id')) != str(args['session_id']): continue
                else:
                    command = item.get('command')
                    if (not isinstance(command, list) or len(command) != 3 or command[1] not in ('-c', '-lc', '-ic', '-ilc')
                            or command[2] != args or not started <= event.get('started_at_ms', -1) / 1000 < prepared): continue
                matches.append(row)
            if len(matches) != 1: return None
            row = matches[0]; event = row['payload']; item = event['item']
            if (event.get('thread_id') != link['thread_id'] or event.get('turn_id') != link['turn_id']
                    or not isinstance(item.get('id'), str) or not item['id'] or item['id'] in used
                    or item.get('status') not in ('completed', 'failed') or type(item.get('exit_code')) is not int
                    or item['status'] == 'failed' and item['exit_code'] == 0 or not canonical_cwd(item.get('cwd'))
                    or event.get('started_at_ms', float('inf')) > event.get('completed_at_ms', -1)
                    or event.get('completed_at_ms', float('inf')) / 1000 > host_time(row)): return None
            if projection == 'output':
                if chunks[i]['text'] != item.get('aggregated_output') or host_time(row) > prepared: return None
            else:
                result = json.loads(chunks[i]['text'])
                if not isinstance(result, dict): return None
                code, process = result.get('exit_code'), result.get('session_id')
                # A yielded prefix may end after dispatch failure. Reconcile waits
                # for its real terminal event instead of inventing an earlier end.
                if process is not None:
                    if type(process) is not int or code is not None or str(process) != str(item.get('process_id')): return None
                elif type(code) is not int or code != item['exit_code'] or host_time(row) > prepared: return None
            used.add(item['id']); evidence.append(row)
        if any((started <= r['payload'].get('started_at_ms', -1) / 1000 < ended
                or r['payload'].get('item', {}).get('type') == 'FileChange' and started <= host_time(r) < ended)
               and r['payload'].get('thread_id') == link['thread_id'] and r['payload'].get('turn_id') == link['turn_id']
               and r['payload'].get('item', {}).get('id') not in used for r in native): return None
        failure = chunks[-1]['text']; status = None
        if call.get('tool_name') == 'apply_patch' and failure.startswith('Script error:\napply_patch verification failed: '): status = 'failed'
        timeout = ('Script error:\nexec_command failed: CreateProcess { message: "Rejected(\\"'
                   'The automatic permission approval review did not finish before its deadline. '
                   'Do not assume the action is unsafe based on the timeout alone. '
                   'You may retry once, or ask the user for guidance or explicit approval.\\")" }')
        if call.get('tool_name') == 'Bash' and failure == timeout: status = 'not_started'
        if status is None: return None
        return {'source': 'projected-host-dispatch-failure', 'status': status, 'exit_code': None, **link,
                'step_index': index, 'prefix_item_ids': sorted(used),
                'record_sha256': hashlib.sha256(json.dumps([request, *chain, *evidence], sort_keys=True).encode()).hexdigest()}
    except (OSError, ValueError, TypeError, AttributeError, IndexError, KeyError, RecursionError, OverflowError):
        return None

'''


def transformations():
    changes = [
        ('def reconcile_calls(store, sid, root, recover=True, only=None):', EXTENSION + '\ndef reconcile_calls(store, sid, root, recover=True, only=None):'),
        ("or mixed_literal_failure_receipt(sid, root, call_id, call, current['calls'])", "or mixed_literal_failure_receipt(sid, root, call_id, call, current['calls'])\n                       or projected_failure_receipt(sid, root, call_id, call, current['calls'])"),
    ]
    # Exact anchors reject concurrent/unsupported installed versions.
    changes += [
        ("        mixed_literal_dispatch = batch_dispatch_context(event, sid, root, mixed_literal_batch) if not any((dispatch, batch_dispatch, polled_dispatch, settled_dispatch, trailing_poll_dispatch, leading_poll_dispatch)) else None", "        mixed_literal_dispatch = batch_dispatch_context(event, sid, root, mixed_literal_batch) if not any((dispatch, batch_dispatch, polled_dispatch, settled_dispatch, trailing_poll_dispatch, leading_poll_dispatch)) else None\n        projected_dispatch = projected_context(event, sid, root) if not any((dispatch, batch_dispatch, polled_dispatch, settled_dispatch, trailing_poll_dispatch, leading_poll_dispatch, mixed_literal_dispatch)) else None"),
        ("'dispatch_checked': True, 'dispatch_version': 13}", "'dispatch_checked': True, 'dispatch_version': 14}\n            if projected_dispatch:\n                prepared['projected_dispatch'] = projected_dispatch"),
    ]
    return changes


def patch(source):
    if MARKER in source:
        raise ValueError('already installed; inspect rather than stacking patches')
    for old, new in transformations():
        if source.count(old) != 1: raise ValueError('installed source anchor mismatch: ' + old[:70])
        source = source.replace(old, new, 1)
    compile(source, '<candidate-gate>', 'exec')
    return source


def original(source):
    """Read-only inverse for repeatable tests; never writes the installed file."""
    for old, new in reversed(transformations()):
        if source.count(new) != 1: raise ValueError('modified installation cannot be reversed for tests')
        source = source.replace(new, old, 1)
    return source


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['candidate', 'install'])
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--expect-sha256')
    args = parser.parse_args()
    before = args.source.read_bytes(); digest = hashlib.sha256(before).hexdigest()
    if args.mode == 'candidate':
        if not args.output: parser.error('--output required')
        args.output.write_text(patch(before.decode()))
        print(json.dumps({'source_sha256': digest, 'candidate_sha256': hashlib.sha256(args.output.read_bytes()).hexdigest()}))
        return
    if not args.expect_sha256 or digest != args.expect_sha256: raise ValueError('source changed since verification')
    after = patch(before.decode()).encode()
    protected = [args.source.parent.parent.parent / name for name in ('hooks.json', 'config.toml', 'AGENTS.md', 'SESSION_MEMORY.md')]
    hashes = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in protected}
    backup = args.source.parent / 'backups' / ('projected-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    backup.mkdir(mode=0o700); (backup/'gate.py').write_bytes(before)
    fd, temp = tempfile.mkstemp(dir=args.source.parent, prefix='.projected-')
    try:
        with os.fdopen(fd, 'wb') as stream: stream.write(after); stream.flush(); os.fsync(stream.fileno())
        os.chmod(temp, args.source.stat().st_mode & 0o777)
        if hashlib.sha256(args.source.read_bytes()).hexdigest() != digest: raise ValueError('concurrent installation')
        os.replace(temp, args.source)
    finally:
        if os.path.exists(temp): os.unlink(temp)
    assert hashes == {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in protected}
    print(json.dumps({'before': digest, 'after': hashlib.sha256(after).hexdigest(), 'backup': str(backup), 'protected_configuration_unchanged': True}))


if __name__ == '__main__': main()
