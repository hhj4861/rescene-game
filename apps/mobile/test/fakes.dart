import 'package:rescene_arcade/data/repositories/game_repository.dart';
import 'package:rescene_arcade/data/services/webview_service.dart';

class FakeRepository implements GameRepository {
  BrowserEvents? events;
  int starts = 0, pauses = 0, resumes = 0, backs = 0;
  bool failStart = false, handlesBack = true;
  @override
  Future<void> start(BrowserEvents callbacks) async {
    starts++;
    events = callbacks;
    callbacks.started();
    if (failStart) throw StateError('offline');
  }

  @override
  Future<void> reload() async {}
  @override
  Future<bool> back() async {
    backs++;
    return handlesBack;
  }

  @override
  Future<void> pause() async {
    pauses++;
  }

  @override
  Future<void> resumeMedia() async {
    resumes++;
  }
}

class FakeBrowser implements BrowserPort {
  late BrowserEvents events;
  late Future<bool> Function(String, bool) navigate;
  final loads = <Uri>[], scripts = <String>[];
  Object result = true;
  @override
  Future<void> configure(
    BrowserEvents callbacks,
    Future<bool> Function(String, bool) rule,
  ) async {
    events = callbacks;
    navigate = rule;
  }

  @override
  Future<void> load(Uri url) async {
    loads.add(url);
  }

  @override
  Future<Object> evaluate(String script) async {
    scripts.add(script);
    return result;
  }
}
