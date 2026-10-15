import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';

import 'data/repositories/game_repository.dart';
import 'data/services/webview_service.dart';
import 'ui/game_screen.dart';
import 'ui/game_view_model.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ArcadeApp());
}

class ArcadeApp extends StatefulWidget {
  const ArcadeApp({super.key});
  @override
  State<ArcadeApp> createState() => _ArcadeAppState();
}

class _ArcadeAppState extends State<ArcadeApp> {
  late final WebViewService browser;
  late final GameViewModel model;
  @override
  void initState() {
    super.initState();
    browser = WebViewService();
    model = GameViewModel(
      WebGameRepository(
        browser: browser,
        loadBridge: () => rootBundle.loadString('assets/host_bridge.js'),
        location: GameLocation(
          const String.fromEnvironment(
            'ARCADE_URL',
            defaultValue: productionGameUrl,
          ),
          allowLocal: kDebugMode,
        ),
        openExternal: (url) =>
            launchUrl(url, mode: LaunchMode.externalApplication),
      ),
    );
  }

  @override
  void dispose() {
    model.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: '리센느 작은 오락실',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff234454)),
      scaffoldBackgroundColor: const Color(0xffedf5f2),
      useMaterial3: true,
    ),
    home: GameScreen(
      viewModel: model,
      game: WebViewWidget(controller: browser.controller),
    ),
  );
}
