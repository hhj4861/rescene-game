import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

class BrowserEvents {
  const BrowserEvents({
    required this.started,
    required this.progress,
    required this.finished,
    required this.failed,
    required this.notice,
  });
  final VoidCallback started;
  final ValueChanged<int> progress;
  final ValueChanged<String> finished;
  final ValueChanged<String> failed;
  final ValueChanged<String> notice;
}

abstract interface class BrowserPort {
  Future<void> configure(
    BrowserEvents events,
    Future<bool> Function(String url, bool isMainFrame) navigate,
  );
  Future<void> load(Uri url);
  Future<Object> evaluate(String script);
}

// All platform-plugin calls stay here; repositories and widgets are testable
// without creating a native WebView.
class WebViewService implements BrowserPort {
  WebViewService() {
    final params = WebViewPlatform.instance is WebKitWebViewPlatform
        ? WebKitWebViewControllerCreationParams(
            allowsInlineMediaPlayback: true,
            mediaTypesRequiringUserAction: const <PlaybackMediaTypes>{},
          )
        : const PlatformWebViewControllerCreationParams();
    controller = WebViewController.fromPlatformCreationParams(params);
  }
  late final WebViewController controller;
  Uri? _mainUrl;

  @override
  Future<void> configure(
    BrowserEvents events,
    Future<bool> Function(String, bool) navigate,
  ) async {
    await controller.setJavaScriptMode(JavaScriptMode.unrestricted);
    await controller.setBackgroundColor(const Color(0xffedf5f2));
    if (controller.platform case final AndroidWebViewController android) {
      await android.setMediaPlaybackRequiresUserGesture(false);
      await AndroidWebViewController.enableDebugging(kDebugMode);
    }
    await controller.setNavigationDelegate(
      NavigationDelegate(
        onProgress: events.progress,
        onPageStarted: (url) {
          _mainUrl = Uri.tryParse(url);
          events.started();
        },
        onPageFinished: events.finished,
        onWebResourceError: (error) {
          // A blocked YouTube iframe must not replace a playable game.
          if (error.isForMainFrame == true) events.failed('게임을 불러오지 못했어요.');
        },
        onHttpError: (error) {
          if (error.request?.uri == _mainUrl && _mainUrl != null) {
            events.failed('게임을 불러오지 못했어요.');
          }
        },
        onNavigationRequest: (request) async =>
            await navigate(request.url, request.isMainFrame)
            ? NavigationDecision.navigate
            : NavigationDecision.prevent,
      ),
    );
  }

  @override
  Future<void> load(Uri url) {
    _mainUrl = url;
    return controller.loadRequest(url);
  }

  @override
  Future<Object> evaluate(String script) =>
      controller.runJavaScriptReturningResult(script);
}
