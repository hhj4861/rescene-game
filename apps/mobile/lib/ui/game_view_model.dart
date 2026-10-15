import 'dart:async';

import 'package:flutter/foundation.dart';

import '../data/repositories/game_repository.dart';
import '../data/services/webview_service.dart';

class GameViewModel extends ChangeNotifier {
  GameViewModel(this.repository);
  final GameRepository repository;
  bool ready = false, loading = true, _disposed = false, _starting = false;
  bool _backgrounded = false;
  int progress = 0;
  String? error, notice;

  void _changed() {
    if (!_disposed) notifyListeners();
  }

  void _failed(String message) {
    if (_disposed) return;
    error = message;
    loading = false;
    ready = false;
    _changed();
  }

  Future<void> start() async {
    if (_starting || _disposed) return;
    _starting = true;
    try {
      await repository.start(
        BrowserEvents(
          started: () {
            if (_disposed) return;
            loading = true;
            ready = false;
            progress = 0;
            _changed();
          },
          progress: (value) {
            if (_disposed) return;
            progress = value.clamp(0, 100);
            _changed();
          },
          finished: (_) {
            if (_disposed || error != null) return;
            ready = true;
            loading = false;
            if (_backgrounded) unawaited(pause());
            _changed();
          },
          failed: _failed,
          notice: (message) {
            if (_disposed) return;
            notice = message;
            _changed();
          },
        ),
      );
    } catch (_) {
      _failed('게임을 불러오지 못했어요.');
    } finally {
      _starting = false;
    }
  }

  Future<void> retry() async {
    if (loading || _disposed) return;
    error = null;
    notice = null;
    progress = 0;
    ready = false;
    loading = true;
    _changed();
    // Reinitializing also recovers a failed platform setup, not only a bad URL load.
    await start();
  }

  Future<bool> back() async {
    if (!ready) return false;
    try {
      return await repository.back();
    } catch (_) {
      return false;
    }
  }

  Future<void> pause() async {
    _backgrounded = true;
    if (!ready) return;
    try {
      await repository.pause();
    } catch (_) {
      /* WebView may be shutting down. */
    }
  }

  Future<void> resumeMedia() async {
    _backgrounded = false;
    if (!ready) return;
    try {
      await repository.resumeMedia();
    } catch (_) {
      /* Keep the game available. */
    }
  }

  void dismissNotice() {
    notice = null;
    _changed();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}
