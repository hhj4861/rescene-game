"""Regression tests against a candidate hook, using isolated local Git remotes."""
import copy
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('repair', Path(__file__).with_name('repair-task-finish-worktree-containers.py'))
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)
gate = repair.load_gate(Path.home() / '.codex/hooks/task-finish/gate.py')


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.PIPE, text=True).strip()


class ContainerRecovery(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='container-test-')
        self.base = Path(self.tmp.name).resolve()
        self.root = self.base / 'repo'
        self.root.mkdir()
        git(self.root, 'init', '-b', 'main')
        git(self.root, 'config', 'user.email', 'fixture@example.invalid')
        git(self.root, 'config', 'user.name', 'Fixture')
        # macOS Git otherwise records NFC child paths beneath an NFD iCloud root.
        git(self.root, 'config', 'core.precomposeUnicode', 'false')
        (self.root / 'file.txt').write_text('original\n')
        git(self.root, 'add', 'file.txt')
        git(self.root, 'commit', '-m', 'fixture baseline')
        git(self.base, 'init', '--bare', str(self.base / 'remote.git'))
        git(self.root, 'remote', 'add', 'origin', str(self.base / 'remote.git'))
        git(self.root, 'push', '-u', 'origin', 'main')
        self.child = self.root / '.worktrees' / 'feature'
        git(self.root, 'worktree', 'add', '-b', 'feature', str(self.child))
        git(self.child, 'push', '-u', 'origin', 'feature')
        self.path = '.worktrees/feature/'
        self.call = {'snapshot': {self.path: 'unsupported'}, 'known_before': {},
                     'new_paths': [], 'paths': [], 'head': gate.head(str(self.root)),
                     'terminal': {'source': 'PostToolUse', 'exit_code': 0}}
        self.data = {'files': {}, 'unknown': {}}

    def tearDown(self):
        self.tmp.cleanup()

    def proof(self):
        return gate.published_worktree_container(str(self.root), self.path, self.call, self.data)

    def test_clean_published_linked_worktree(self):
        before = copy.deepcopy((self.call, self.data))
        proof = self.proof()
        self.assertEqual(proof['head'], gate.head(str(self.child)))
        self.assertEqual(proof['ref'], 'refs/heads/feature')
        self.assertEqual((self.call, self.data), before)

    def test_modified_file_fails(self):
        (self.child / 'file.txt').write_text('changed\n')
        with self.assertRaises(gate.GuardError): self.proof()

    def test_staged_file_fails(self):
        (self.child / 'file.txt').write_text('changed\n')
        git(self.child, 'add', 'file.txt')
        with self.assertRaises(gate.GuardError): self.proof()

    def test_untracked_file_fails(self):
        (self.child / 'extra.txt').write_text('unfinished')
        with self.assertRaises(gate.GuardError): self.proof()

    def test_deleted_file_fails(self):
        (self.child / 'file.txt').unlink()
        with self.assertRaises(gate.GuardError): self.proof()

    def test_unpushed_commit_fails(self):
        (self.child / 'file.txt').write_text('unpublished')
        git(self.child, 'commit', '-am', 'unpublished')
        with self.assertRaises(gate.GuardError): self.proof()

    def test_missing_upstream_fails(self):
        git(self.child, 'branch', '--unset-upstream')
        with self.assertRaises(gate.GuardError): self.proof()

    def test_remote_failure_fails(self):
        git(self.root, 'remote', 'set-url', 'origin', str(self.base / 'missing.git'))
        with self.assertRaises(gate.GuardError): self.proof()

    def test_detached_head_fails(self):
        git(self.child, 'checkout', '--detach')
        with self.assertRaises(gate.GuardError): self.proof()

    def test_changed_during_remote_check_fails(self):
        def remote(*args):
            (self.child / 'extra.txt').write_text('concurrent work')
        with patch.object(gate, 'remote_contains', side_effect=remote):
            with self.assertRaises(gate.GuardError): self.proof()

    def test_unknown_or_explicit_directory_is_never_adopted(self):
        for key in ('files', 'unknown'):
            with self.subTest(key=key):
                self.data[key][self.path] = {}
                self.assertIsNone(self.proof())
                self.data[key].clear()
        for key in ('paths', 'new_paths', 'known_before'):
            with self.subTest(key=key):
                self.call[key] = {self.path: 'unsupported'} if key == 'known_before' else [self.path]
                self.assertIsNone(self.proof())
                self.call[key] = {} if key == 'known_before' else []

    def test_missing_legacy_snapshot_fails_closed(self):
        self.call['snapshot'] = {}
        self.assertIsNone(self.proof())

    def test_ordinary_directory_fails_closed(self):
        self.path = 'ordinary/'
        (self.root / 'ordinary').mkdir()
        self.call['snapshot'] = {self.path: 'unsupported'}
        self.assertIsNone(self.proof())

    def test_separate_nested_repository_fails_closed(self):
        self.path = 'nested/'
        (self.root / 'nested').mkdir()
        git(self.root / 'nested', 'init')
        self.call['snapshot'] = {self.path: 'unsupported'}
        self.assertIsNone(self.proof())

    def test_symlink_alias_fails_closed(self):
        (self.root / 'alias').symlink_to(self.child, target_is_directory=True)
        self.path = 'alias/'
        self.call['snapshot'] = {self.path: 'unsupported'}
        self.assertIsNone(self.proof())

    def test_invalid_relative_path_fails_closed(self):
        for path in ('/absolute/', '../outside/', './.worktrees/feature/', '.worktrees//feature/'):
            with self.subTest(path=path):
                self.path = path
                self.call['snapshot'] = {path: 'unsupported'}
                self.assertIsNone(self.proof())

    def reconcile(self, terminal=True, own=False):
        store = gate.Store(self.base / 'state')
        state = store.get('fixture-session', str(self.root))
        call = copy.deepcopy(self.call)
        if not terminal: call.pop('terminal')
        state['calls']['fixture-call'] = call
        if own:
            path = '.worktrees/feature/file.txt'
            gate.track_file(state, str(self.root), path)
            state['files'][path]['edited'] = True
        with store.transaction(): store.save('fixture-session', str(self.root), state)
        result = gate.reconcile_calls(store, 'fixture-session', str(self.root), recover=False)
        store.db.close()
        return result

    def test_reconcile_records_proof_without_erasing_ownership(self):
        result = self.reconcile(own=True)
        self.assertFalse(result['calls'])
        self.assertIn('.worktrees/feature/file.txt', result['files'])
        receipt = result['finished_calls']['fixture-call']
        self.assertEqual(receipt['terminal'], self.call['terminal'])
        self.assertIn(self.path, receipt['worktree_containers'])
        self.assertNotEqual(result['status'], 'complete')

    def test_reconcile_without_terminal_stays_pending(self):
        result = self.reconcile(terminal=False)
        self.assertIn('fixture-call', result['calls'])
        self.assertFalse(result.get('finished_calls'))

    def test_reconcile_dirty_container_stays_unfinished(self):
        (self.child / 'extra.txt').write_text('unfinished')
        result = self.reconcile()
        self.assertIn('fixture-call', result['calls'])
        self.assertEqual(result['status'], 'unfinished')
        self.assertFalse(result.get('finished_calls'))

    def test_reconcile_keeps_parent_unknown_change(self):
        (self.root / 'file.txt').write_text('unregistered edit')
        result = self.reconcile()
        self.assertFalse(result['calls'])
        self.assertIn('file.txt', result['unknown'])
        self.assertEqual(result['status'], 'pending')

    def test_duplicate_patch_rejected(self):
        source = (Path.home() / '.codex/hooks/task-finish/gate.py').read_text()
        with self.assertRaises(ValueError): repair.patched(repair.patched(source))


if __name__ == '__main__':
    if not os.environ.get('TMPDIR'):
        raise SystemExit('Set TMPDIR to the designated task artifact directory')
    unittest.main(verbosity=2)
