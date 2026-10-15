import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rescene_arcade/ui/game_screen.dart';
import 'package:rescene_arcade/ui/game_view_model.dart';

import 'fakes.dart';

void main() {
  testWidgets(
    'load errors offer retry; external-link notices keep the game visible',
    (tester) async {
      final repository = FakeRepository();
      final vm = GameViewModel(repository);
      await tester.pumpWidget(
        MaterialApp(
          home: GameScreen(viewModel: vm, game: const Text('game canvas')),
        ),
      );
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      repository.events!.failed('게임을 불러오지 못했어요.');
      await tester.pump();
      expect(find.text('다시 시도'), findsOneWidget);
      await tester.tap(find.text('다시 시도'));
      await tester.pump();
      expect(repository.starts, 2);
      repository.events!.finished('https://example.com');
      await tester.pump();
      expect(find.byType(LinearProgressIndicator), findsNothing);
      repository.events!.notice('링크를 열 수 없어요.');
      await tester.pump();
      expect(find.text('game canvas'), findsOneWidget);
      expect(find.byType(MaterialBanner), findsOneWidget);
      await tester.tap(find.byTooltip('닫기'));
      await tester.pump();
      expect(find.byType(MaterialBanner), findsNothing);
      await tester.pumpWidget(const SizedBox());
      vm.dispose();
    },
  );
  testWidgets(
    'background lifecycle pauses once and foreground does not restart the game',
    (tester) async {
      final repository = FakeRepository();
      final vm = GameViewModel(repository);
      await tester.pumpWidget(
        MaterialApp(
          home: GameScreen(viewModel: vm, game: const SizedBox.expand()),
        ),
      );
      repository.events!.finished('https://example.com');
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      expect(repository.pauses, 1);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(repository.resumes, 1);
      expect(repository.starts, 1);
      await tester.pumpWidget(const SizedBox());
      vm.dispose();
    },
  );
}
