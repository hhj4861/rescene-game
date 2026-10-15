import 'package:flutter_test/flutter_test.dart';
import 'package:rescene_arcade/ui/game_view_model.dart';

import 'fakes.dart';

void main() {
  test('failed loads remain errors even when WebView emits page-finished; retry recovers', () async {
    final repository = FakeRepository();
    final vm = GameViewModel(repository);
    await vm.start();
    repository.events!.progress(40);
    expect(vm.progress, 40);
    repository.events!.failed('offline');
    repository.events!.finished('https://example.com');
    expect(vm.error, 'offline');
    expect(vm.ready, false);
    expect(vm.loading, false);
    await vm.retry();
    expect(repository.starts, 2);
    expect(vm.error, null);
    repository.events!.finished('https://example.com');
    expect(vm.ready, true);
    expect(vm.loading, false);
    vm.dispose();
  });
  test('platform initialization failures are retryable', () async {
    final repository = FakeRepository()..failStart = true;
    final vm = GameViewModel(repository);
    await vm.start();
    expect(vm.error, isNotNull);
    repository.failStart = false;
    await vm.retry();
    expect(repository.starts, 2);
    repository.events!.finished('https://example.com');
    expect(vm.ready, true);
    vm.dispose();
  });
  test('only a ready page receives native back and lifecycle calls', () async {
    final repository = FakeRepository();
    final model = GameViewModel(repository);
    await model.start();
    expect(await model.back(), false);
    await model.pause();
    expect(repository.pauses, 0);
    await model.resumeMedia();
    repository.events!.finished('https://example.com');
    expect(await model.back(), true);
    await model.pause();
    await model.resumeMedia();
    expect(repository.pauses, 1);
    expect(repository.resumes, 1);
    repository.handlesBack = false;
    expect(await model.back(), false);
    model.dispose();
  });
  test('a page finishing in the background receives the pending pause', () async {
    final repository = FakeRepository();
    final model = GameViewModel(repository);
    await model.start();
    await model.pause();
    expect(repository.pauses, 0);
    repository.events!.finished('https://example.com');
    expect(repository.pauses, 1);
    model.dispose();
  });
  test('late platform callbacks after disposal are ignored', () async {
    final repository = FakeRepository();
    final model = GameViewModel(repository);
    await model.start();
    model.dispose();
    repository.events!.started();
    repository.events!.progress(100);
    repository.events!.finished('url');
    repository.events!.failed('late failure');
    repository.events!.notice('late notice');
    expect(model.error, null);
    expect(model.notice, null);
  });
}
