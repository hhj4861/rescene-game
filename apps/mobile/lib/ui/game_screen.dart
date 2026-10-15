import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'game_view_model.dart';

class GameScreen extends StatefulWidget {
  const GameScreen({super.key, required this.viewModel, required this.game});
  final GameViewModel viewModel;
  final Widget game;
  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> with WidgetsBindingObserver {
  bool _backgrounded = false, _handlingBack = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(widget.viewModel.start());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (_backgrounded) unawaited(widget.viewModel.resumeMedia());
      _backgrounded = false;
    } else if (!_backgrounded) {
      _backgrounded = true;
      unawaited(widget.viewModel.pause());
    }
  }

  Future<void> _back() async {
    if (_handlingBack) return;
    _handlingBack = true;
    try {
      if (!await widget.viewModel.back() && mounted) {
        await SystemNavigator.pop();
      }
    } finally {
      _handlingBack = false;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: false,
    onPopInvokedWithResult: (didPop, _) {
      if (!didPop) unawaited(_back());
    },
    child: Scaffold(
      body: SafeArea(
        child: ListenableBuilder(
          listenable: widget.viewModel,
          builder: (context, _) {
            final model = widget.viewModel;
            return Column(
              children: [
                if (model.notice case final String message)
                  MaterialBanner(
                    content: Text(message),
                    actions: [
                      IconButton(
                        tooltip: '닫기',
                        onPressed: model.dismissNotice,
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                Expanded(
                  child: Stack(
                    children: [
                      Positioned.fill(child: widget.game),
                      if (model.loading)
                        LinearProgressIndicator(
                          value: model.progress == 0
                              ? null
                              : model.progress / 100,
                        ),
                      if (model.error case final String error)
                        Positioned.fill(
                          child: ColoredBox(
                            color: Theme.of(context).scaffoldBackgroundColor,
                            child: Center(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(
                                      Icons.wifi_off_rounded,
                                      size: 40,
                                    ),
                                    const SizedBox(height: 16),
                                    Text(error, textAlign: TextAlign.center),
                                    const SizedBox(height: 8),
                                    const Text('인터넷 연결을 확인해 주세요.'),
                                    const SizedBox(height: 20),
                                    FilledButton(
                                      onPressed: model.retry,
                                      child: const Text('다시 시도'),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    ),
  );
}
