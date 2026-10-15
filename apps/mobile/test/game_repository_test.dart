import 'package:flutter_test/flutter_test.dart';
import 'package:rescene_arcade/data/repositories/game_repository.dart';
import 'package:rescene_arcade/data/services/webview_service.dart';

import 'fakes.dart';

void main() {
  test('only the configured origin stays in the app; HTTPS frames and external links are distinct', () {
    final location = GameLocation(productionGameUrl);
    expect(
      location.target('${productionGameUrl}arcade-room.html', true),
      NavigationTarget.game,
    );
    expect(
      location.target('https://www.youtube.com/embed/test', false),
      NavigationTarget.frame,
    );
    expect(
      location.target('https://www.youtube.com/watch?v=test', true),
      NavigationTarget.external,
    );
    expect(
      location.target('https://rescene-arcade.pages.dev.evil.example/', true),
      NavigationTarget.external,
    );
    for (final value in [
      'javascript:alert(1)',
      'file:///etc/passwd',
      'intent://youtube',
      'http://example.com',
      'https://user:pass@example.com',
    ]) {
      expect(
        location.target(value, true),
        NavigationTarget.blocked,
        reason: value,
      );
    }
  });
  test('debug permits only local HTTP; release rejects it and credentials', () {
    expect(
      GameLocation('http://10.0.2.2:4325/', allowLocal: true).url.port,
      4325,
    );
    for (final value in [
      'http://10.0.2.2:4325/',
      'https://user:pass@example.com/',
      'file:///game',
    ]) {
      expect(() => GameLocation(value), throwsArgumentError);
    }
    expect(
      () => GameLocation('http://remote.example/', allowLocal: true),
      throwsArgumentError,
    );
  });
  test('bridge installs only on the game origin and outbound links pause without navigating the WebView', () async {
    final browser = FakeBrowser(),
        opened = <Uri>[],
        finished = <String>[],
        notices = <String>[];
    final repository = WebGameRepository(
      browser: browser,
      location: GameLocation(productionGameUrl),
      loadBridge: () async => 'trusted bridge',
      openExternal: (url) async {
        opened.add(url);
        return false;
      },
    );
    await repository.start(
      BrowserEvents(
        started: () {},
        progress: (_) {},
        finished: finished.add,
        failed: (_) => fail('unexpected error'),
        notice: notices.add,
      ),
    );
    expect(browser.loads, [Uri.parse(productionGameUrl)]);
    browser.events.finished('https://www.youtube.com/');
    await Future<void>.delayed(Duration.zero);
    expect(browser.scripts, isEmpty);
    browser.events.finished(productionGameUrl);
    await Future<void>.delayed(Duration.zero);
    expect(browser.scripts, ['trusted bridge']);
    expect(finished, [productionGameUrl]);
    expect(
      await browser.navigate('https://youtube.com/watch?v=test', true),
      false,
    );
    expect(browser.scripts.last, WebGameRepository.pauseScript);
    expect(opened.single.host, 'youtube.com');
    expect(notices, ['링크를 열 수 없어요.']);
    expect(
      await browser.navigate('https://youtube.com/embed/test', false),
      true,
    );
    expect(opened.length, 1);
    browser.result = 'false';
    expect(await repository.back(), false);
    browser.result = 'true';
    expect(await repository.back(), true);
  });
}
