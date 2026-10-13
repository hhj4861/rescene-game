"""Review-only patch for clean, published linked-worktree container observations.

Does not install itself or touch completion state. Apply through the normal hook
review/trust workflow after approval. All file ownership and receipt checks stay.
"""
import argparse
import difflib
import hashlib
import importlib.util
from pathlib import Path

FUNCTION = r'''
def published_worktree_container(root, path, call, data, remotes=None):
    """Recover a legacy directory sentinel only with current Git/remote proof."""
    if (not isinstance(path, str) or not path.endswith('/')
            or path in data['files'] or path in data.get('unknown', {})
            or path in call.get('paths', []) or path in call.get('known_before', {})
            or path in call.get('new_paths', [])
            or call.get('snapshot', {}).get(path) not in (None, 'unsupported')):
        return None
    relative = Path(path)
    if relative.is_absolute() or '..' in relative.parts or str(relative) + '/' != path:
        return None
    target = Path(root) / relative
    worktrees = registered_worktrees(root)
    if target not in worktrees or target.resolve() != target or not target.is_dir():
        return None
    # Reuse the existing same-common-dir and exact registered-root validation.
    scoped_root, _ = file_scope(root, path + '.task-finish-container-probe', worktrees)
    if scoped_root != str(target):
        return None

    def state():
        # Include untracked files, staged edits and deletions. Ignored build/cache
        # files remain outside normal Git observation, just as in dirty().
        if run(scoped_root, 'status', '--porcelain=v1', '-z',
               '--untracked-files=all').stdout:
            raise GuardError('작업 폴더 내부 변경을 파일 단위로 먼저 확인하세요: ' + path)
        current, name = head(scoped_root), branch(scoped_root)
        if not current or not name:
            raise GuardError('작업 폴더 HEAD/브랜치를 확인할 수 없음: ' + path)
        remote = git(scoped_root, 'config', '--get', 'branch.' + name + '.remote', required=False)
        ref = git(scoped_root, 'config', '--get', 'branch.' + name + '.merge', required=False)
        if not remote or remote == '.' or not ref.startswith('refs/heads/'):
            raise GuardError('작업 폴더 원격 upstream이 없음: ' + path)
        url = git(scoped_root, 'remote', 'get-url', remote)
        return current, name, remote, ref, url

    before = state()
    # A single Git observation sees one remote ref snapshot, like ls-remote
    # with multiple ref arguments. Never reuse it across observed tool calls.
    remotes = {} if remotes is None else remotes
    key = before[4]
    # Plain relative local remotes resolve against each working directory.
    if ':' not in key and not os.path.isabs(key):
        key = (scoped_root, key)
    if key not in remotes:
        result = run(scoped_root, 'ls-remote', '--heads', before[2], timeout=8, required=False)
        if result.returncode:
            raise GuardError('작업 폴더 원격 ref 확인 실패: ' + path)
        refs = {}
        for line in result.stdout.decode().splitlines():
            fields = line.split('\t')
            if (len(fields) != 2 or not re.fullmatch(r'[0-9a-f]{40,64}', fields[0])
                    or not fields[1].startswith('refs/heads/') or fields[1] in refs):
                raise GuardError('작업 폴더 원격 ref 응답을 확인할 수 없음: ' + path)
            refs[fields[1]] = fields[0]
        remotes[key] = (refs, time.time())
    refs, remote_checked_at = remotes[key]
    remote_head = refs.get(before[3])
    if not remote_head or (remote_head != before[0] and run(
            scoped_root, 'merge-base', '--is-ancestor', before[0], remote_head,
            required=False).returncode):
        raise GuardError('작업 폴더 HEAD의 원격 반영이 확인되지 않음: ' + path)
    if (state() != before or target not in registered_worktrees(root)
            or file_scope(root, path + '.task-finish-container-probe')[0] != scoped_root):
        raise GuardError('작업 폴더 검증 중 상태가 변경됨: ' + path)
    return {'root': scoped_root, 'head': before[0], 'branch': before[1],
            'remote': before[2], 'ref': before[3], 'checked_at': time.time(),
            'remote_checked_at': remote_checked_at,
            'source': 'clean-registered-worktree-live-upstream'}

'''

OLD_UNSUPPORTED = """                if value == 'unsupported':
                    raise GuardError('관찰할 수 없는 파일: ' + path)
"""
NEW_UNSUPPORTED = """                if value == 'unsupported':
                    proof = published_worktree_container(root, path, call, data, remote_observation)
                    if proof is None:
                        raise GuardError('관찰할 수 없는 파일: ' + path)
                    container_evidence[path] = proof
                    continue
"""
OLD_PATHS = "            paths = set(call['known_before']) | set(call['snapshot']) | set(view.dirty) | changed_commits"
OLD_FINISHED = "                latest.setdefault('finished_calls', {})[call_id] = {'terminal': receipt, 'reconciled_at': time.time()}"


def patched(source):
    if 'def published_worktree_container(' in source:
        raise ValueError('Container recovery already present; review the installed version')
    for anchor in ('def reconcile_calls(', OLD_UNSUPPORTED, OLD_PATHS, OLD_FINISHED):
        if source.count(anchor) != 1:
            raise ValueError('Hook structure changed; review before applying')
    candidate = source.replace('def reconcile_calls(', FUNCTION + 'def reconcile_calls(', 1)
    candidate = candidate.replace(OLD_PATHS, '            container_evidence = {}\n            remote_observation = {}\n' + OLD_PATHS, 1)
    candidate = candidate.replace(OLD_UNSUPPORTED, NEW_UNSUPPORTED, 1)
    candidate = candidate.replace(OLD_FINISHED, OLD_FINISHED + "\n                if container_evidence:\n                    latest['finished_calls'][call_id]['worktree_containers'] = container_evidence", 1)
    compile(candidate, '<candidate-gate>', 'exec')
    return candidate


def load_gate(path):
    spec = importlib.util.spec_from_file_location('gate_under_test', path)
    module = importlib.util.module_from_spec(spec)
    exec(compile(patched(path.read_text()), str(path), 'exec'), module.__dict__)
    return module


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--gate', type=Path, default=Path.home() / '.codex/hooks/task-finish/gate.py')
    parser.add_argument('--diff', action='store_true')
    args = parser.parse_args()
    source = args.gate.read_text()
    candidate = patched(source)
    if args.diff:
        print(''.join(difflib.unified_diff(source.splitlines(True), candidate.splitlines(True),
                                         fromfile='installed/gate.py', tofile='candidate/gate.py')), end='')
    else:
        print('Installed SHA-256:', hashlib.sha256(source.encode()).hexdigest())
        print('Candidate SHA-256:', hashlib.sha256(candidate.encode()).hexdigest())
        print('Review only: no hook, trust settings, transcripts or state changed.')
