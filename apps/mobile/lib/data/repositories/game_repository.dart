import '../services/webview_service.dart';

const productionGameUrl = 'https://rescene-arcade.pages.dev/';

enum NavigationTarget { game, frame, external, blocked }

class GameLocation {
  GameLocation(String value, {bool allowLocal = false})
    : url = Uri.parse(value) {
    final local =
        allowLocal &&
        url.scheme == 'http' &&
        const {'localhost', '127.0.0.1', '10.0.2.2', '::1'}.contains(url.host);
    if ((!local && url.scheme != 'https') ||
        url.host.isEmpty ||
        url.userInfo.isNotEmpty) {
      throw ArgumentError(
        'ARCADE_URL must be HTTPS (debug also permits local HTTP).',
      );
    }
  }
  final Uri url;
  NavigationTarget target(String value, bool mainFrame) {
    final next = Uri.tryParse(value);
    if (next == null || next.userInfo.isNotEmpty) {
      return NavigationTarget.blocked;
    }
    if (next.scheme == url.scheme &&
        next.host == url.host &&
        next.port == url.port) {
      return mainFrame ? NavigationTarget.game : NavigationTarget.frame;
    }
    if (!mainFrame && (next.scheme == 'https' || value == 'about:blank')) {
      return NavigationTarget.frame;
    }
    if (mainFrame && next.scheme == 'https' && next.host.isNotEmpty) {
      return NavigationTarget.external;
    }
    return NavigationTarget.blocked;
  }
}

abstract interface class GameRepository {
  Future<void> start(BrowserEvents events);
  Future<void> reload();
  Future<bool> back();
  Future<void> pause();
  Future<void> resumeMedia();
}

class WebGameRepository implements GameRepository {
  WebGameRepository({
    required this.browser,
    required this.location,
    required this.openExternal,
    required this.loadBridge,
  });
  final Future<String> Function() loadBridge;
  final BrowserPort browser;
  final GameLocation location;
  final Future<bool> Function(Uri) openExternal;

  static const backScript = 'window.resceneNativeApp.back()';
  static const pauseScript = 'window.resceneNativeApp.pause()';
  static const resumeScript = 'window.resceneNativeApp.resumeMedia()';

  @override
  Future<void> start(BrowserEvents events) async {
    await browser.configure(
      BrowserEvents(
        started: events.started,
        progress: events.progress,
        failed: events.failed,
        notice: events.notice,
        finished: (url) async {
          if (location.target(url, true) != NavigationTarget.game) return;
          try {
            await browser.evaluate(await loadBridge());
            events.finished(url);
          } catch (_) {
            events.failed('게임을 준비하지 못했어요.');
          }
        },
      ),
      (url, mainFrame) async {
        final target = location.target(url, mainFrame);
        if (target == NavigationTarget.external) {
          try {
            await pause();
          } catch (_) {
            /* Loading pages may not have the bridge yet. */
          }
          try {
            if (!await openExternal(Uri.parse(url))) {
              events.notice('링크를 열 수 없어요.');
            }
          } catch (_) {
            events.notice('링크를 열 수 없어요.');
          }
        }
        return target == NavigationTarget.game ||
            target == NavigationTarget.frame;
      },
    );
    await reload();
  }

  @override
  Future<void> reload() => browser.load(location.url);
  @override
  Future<bool> back() async {
    final handled = await browser.evaluate(backScript);
    return handled == true || handled == 'true';
  }

  @override
  Future<void> pause() async {
    await browser.evaluate(pauseScript);
  }

  @override
  Future<void> resumeMedia() async {
    await browser.evaluate(resumeScript);
  }
}
