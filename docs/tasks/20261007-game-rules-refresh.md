# Arcade rules refresh

Based on the latest remote `main` at `5c420c38106f347ab50ccacfdd689115761d5409`.

- Picker order: Minami, Woni, May, Zena, Liv. Stable game IDs and best scores remain unchanged.
- Liv: the first actual song-item pickup starts a 120-second boss wait. Further pickups do not reset it. The round lasts up to 300 seconds. Older 60-second saves receive the longer budget; old early bosses are removed and the wait starts from the resumed play time if an item was already collected.
- Woni: replace target tapping with Charmander's three-lane flame adventure. Collect berries, fire at rocks and avoid water; five consecutive berries grant eight seconds of fever protection and faster fire. Keyboard arrows / 1–3 select lanes and F / Space fires. The round lasts 90 seconds. Old target-board snapshots are discarded while stage/life progress and best scores remain.
- Minami: start with a 50% life gauge. Successful notes add `2 + min(4, combo / 10)` percentage points, capped at 100%; misses subtract 12 points and break the combo. Empty gauge ends the round immediately. Surviving the 60-second chart clears the stage. Paused and buffered playback do not advance the chart.
- May: 180-second rounds and targets of 18, 24, 30, 36, 42 pops for the first five stages, increasing toward 72. Hurry mode begins at 120 seconds. Every third pop drops the special honey voice collectible; ordinary speed and size items never trigger singing.
- Zena: new boards grow from 6×6 to 7×7, 8×8, 9×9 and 10×10, capped there to keep mobile cells usable. Matches, cross explosions, gravity, hints, rolling pins, drag targets and keyboard movement use the actual board width. Older 6×6 boards remain resumable. Breaking special bread drops a song collectible; the user explicitly picks it up with the song-item button. Uncollected song items carry across stages and reloads.
- Stage backgrounds change colors and scenery with the stage for every game.
- May and Zena item singing lasts 60 seconds of playback, continuing through results and into the next stage. Pause freezes its remaining duration; mute, leaving the game and explicit voice replay stop it. Reload does not replay consumed items. Another pickup during the active song does not restart its minute.

The repository contains short individual singing clips rather than minute-long audio. This change loops those existing clips for a minute; it does not manufacture a longer performance or replace them with group songs. Source links are preserved.

Validation: unit tests cover boss timing, gauge recovery/depletion, board widths and gravity, honey versus normal pickups, legacy saves, carried gifts, stage themes and the singing timer. Browser checks cover desktop/mobile input, larger boards, explicit pickup, pause/reload, stage transitions and actual bundled media. Official YouTube integration checks use the existing fake API; live YouTube delivery and physical devices are outside these automated checks.

Verified results:
- Unit suite: 135 passed, no failures.
- ESLint and Vite production build passed.
- Desktop/mobile system Chromium: 219 distinct tests passed; 3 tests skipped by existing touch/CDP conditions. The initial full run had 215 passes and four failures from old May goal fixtures. Updating those two fixtures and rerunning them in both projects produced four passes. No browser failures remain unresolved.
- Inspected desktop and mobile screenshots for the new Charmander adventure and Zena's 10×10 board.
- WebKit and live YouTube delivery were not run in this task.

Review fixes: legacy Zena boards keep their original width through shuffles and automatic reshuffles, then grow on the next stage. Timed item songs resume when returning to a result screen and when continuing into the next stage. Regression checks passed: 136 unit tests, ESLint, production build, and all 12 desktop/mobile Chromium tests in game-revision.spec.js.
