"""Review-only compatibility patch for an exact host approval-review failure.

Recognizes not_started, never success. Does not install or edit gate state.
"""
import argparse
import difflib
import hashlib
import importlib.util
from pathlib import Path

FAILURE = 'Script error:\nexec_command failed: CreateProcess { message: "Rejected(\\"Automatic approval review failed: Selected model is at capacity. Please try a different model.\\\\nThe action was not executed because automatic approval review could not be completed. This is a review failure, not a determination that the action is unsafe. Do not bypass the approval check; resolve the error or ask the user for guidance.\\")" }'

ANCHOR = """            elif failure.startswith(prefix + 'This action was rejected due to unacceptable risk.'):
                status = 'declined'
"""
INSERT = """            elif (failure == {failure}
                    and parser is literal_batch and binding == 'batch_dispatch'
                    and index == 0 and known and call.get('dispatch_version') == 19
                    and call.get('dispatch_checked') is True):
                # An authenticated host refusal is not command stdout. Reject any
                # contradictory start/completion instead of inferring nonexecution.
                if any(row.get('type') == 'event_msg'
                       and row.get('payload', {{}}).get('type') in ('item_started', 'item_completed')
                       and (row['payload'].get('item', {{}}).get('id') == call_id
                            or row['payload'].get('thread_id') == link['thread_id']
                            and row['payload'].get('turn_id') == link['turn_id']
                            and row['payload'].get('item', {{}}).get('type') in ('CommandExecution', 'FileChange')
                            and started <= host_time(row) <= ended)
                       for row in records):
                    return None
                status = 'not_started'
""".format(failure=repr(FAILURE))


def patched(source):
    start = source.index('def batch_failure_receipt(')
    end = source.index('\ndef added_files(', start)
    fragment = source[start:end]
    if 'Selected model is at capacity.' in fragment:
        raise ValueError('Capacity recognition already installed; review the current version')
    if fragment.count(ANCHOR) != 1:
        raise ValueError('Receipt classifier changed; review before applying')
    result = source[:start] + fragment.replace(ANCHOR, INSERT + ANCHOR, 1) + source[end:]
    compile(result, '<candidate-gate>', 'exec')
    return result


def load_gate(path):
    spec = importlib.util.spec_from_file_location('candidate_gate', path)
    module = importlib.util.module_from_spec(spec)
    exec(compile(patched(path.read_text()), str(path), 'exec'), module.__dict__)
    return module


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gate', type=Path, default=Path.home() / '.codex/hooks/task-finish/gate.py')
    parser.add_argument('--diff', action='store_true')
    args = parser.parse_args()
    source = args.gate.read_text(); candidate = patched(source)
    if args.diff:
        print(''.join(difflib.unified_diff(source.splitlines(True), candidate.splitlines(True),
                                         fromfile='installed/gate.py', tofile='candidate/gate.py')), end='')
    else:
        print('Installed SHA-256:', hashlib.sha256(source.encode()).hexdigest())
        print('Candidate SHA-256:', hashlib.sha256(candidate.encode()).hexdigest())
        print('Review only; no installation or state edits.')
