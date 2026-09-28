import test from 'node:test';
import assert from 'node:assert/strict';
import { resultSummary, sceneFor } from '../../src/survival/art.js';
test('round loss, season elimination, runner-up and champion have distinct screen messages', () => {
  const round={ranking:[{teamId:'rival',total:450},{teamId:'team-0',total:400},{teamId:'last',total:200}],pairs:[['team-0','rival']],eliminated:['last']};
  const s={round:3,phase:'learned',rounds:{3:round}};
  assert.equal(resultSummary(s).outcome,'survived');
  assert.match(resultSummary(s).title,/패배.*진출/);
  round.eliminated=['team-0'];
  assert.equal(resultSummary(s).outcome,'eliminated');
  assert.doesNotMatch(resultSummary(s).title,/진출|우승/);
  s.round=10;s.rounds[10]=round;
  assert.match(resultSummary(s).title,/준우승/);
  s.champion='team-0';round.eliminated=[];
  assert.equal(resultSummary(s).outcome,'champion');
  assert.equal(sceneFor({...s,phase:'reflection'}),'reflection');
  assert.equal(sceneFor({...s,phase:'complete'}),'finale');
});
