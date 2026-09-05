import { describe, it, expect } from 'vitest';
import { GameState } from '../src/core/GameState';
import { xpForLevel } from '../src/systems/progression';
import { addItem, equipItem } from '../src/systems/inventory';
import { equipMeme, unlockMeme } from '../src/systems/memes';
import { getItem } from '../src/data/index';
import type { QuestDef } from '../src/data/schema';

const dlg = { offer: 'o', inProgress: 'p', complete: 'c' };
const QUESTS: QuestDef[] = [
  { id: 'q1', chapter: 1, type: 'main', title: 't', description: '', giver: 'npc_woni', map: 'm',
    objectives: [{ kind: 'kill', target: 'slime', count: 1 }],
    rewards: { xp: 20, hearts: 5, items: [{ id: 'food_mulhoe', count: 2 }], meme: 'may_grip', fame: 1, flags: ['f1'], openMemeSlot: true }, dialogues: dlg },
];

describe('newGame', () => {
  it('starts a level-1 member at the prologue map with full hp/mp', () => {
    const gs = GameState.newGame('woni', QUESTS);
    expect(gs.player).toMatchObject({ member: 'woni', level: 1, xp: 0, sp: 0, hp: 120, mp: 40 });
    expect(gs.location).toEqual({ mapId: 'ch0_geoje', spawnId: 'start' });
    expect(gs.chapter).toBe(0);
    expect(gs.hearts).toBe(0);
    expect(gs.memes.equipped).toEqual([null]);
  });
});

describe('stats', () => {
  it('adds equipment and meme passives to level stats', () => {
    const gs = GameState.newGame('woni', QUESTS);
    gs.inventory = equipItem(addItem(gs.inventory, 'equip_inear_basic'), getItem('equip_inear_basic'));
    gs.memes = equipMeme(unlockMeme(gs.memes, 'may_grip'), 0, 'may_grip');
    const s = gs.maxStats();
    expect(s.def).toBe(8 + 2);
    expect(s.luk).toBe(3 + 5);
    expect(s.hp).toBe(120);
  });
});

describe('xp and damage', () => {
  it('levels up, refills hp/mp and emits levelup', () => {
    const gs = GameState.newGame('woni', QUESTS);
    const seen: number[] = [];
    gs.bus.on('levelup', (p) => seen.push(p.level));
    gs.takeDamage(50);
    expect(gs.player.hp).toBe(70);
    expect(gs.gainXp(xpForLevel(1))).toBe(1);
    expect(gs.player.level).toBe(2);
    expect(gs.player.hp).toBe(gs.maxStats().hp);
    expect(seen).toEqual([2]);
  });
  it('reports death at zero hp', () => {
    const gs = GameState.newGame('woni', QUESTS);
    let died = false;
    gs.bus.on('died', () => (died = true));
    expect(gs.takeDamage(119)).toBe(false);
    expect(gs.takeDamage(1)).toBe(true);
    expect(gs.player.hp).toBe(0);
    expect(died).toBe(true);
  });
  it('heal clamps to max', () => {
    const gs = GameState.newGame('woni', QUESTS);
    gs.takeDamage(10);
    gs.heal(999, 999);
    expect(gs.player.hp).toBe(120);
    expect(gs.player.mp).toBe(40);
  });
});

describe('quests through GameState', () => {
  it('forwards events, completes, and applies every reward field', () => {
    const gs = GameState.newGame('woni', QUESTS);
    const completable: string[] = [];
    gs.bus.on('questCompletable', (p) => completable.push(p.questId));
    gs.quests.start('q1');
    expect(gs.report({ type: 'enemy_killed', enemyId: 'slime' })).toEqual(['q1']);
    expect(completable).toEqual(['q1']);
    const reward = gs.completeQuest('q1');
    expect(reward.xp).toBe(20);
    expect(gs.player.xp).toBe(20);
    expect(gs.hearts).toBe(5);
    expect(gs.inventory.items.food_mulhoe).toBe(2);
    expect(gs.memes.unlocked).toEqual(['may_grip']);
    expect(gs.memes.equipped).toEqual([null, null]);
    expect(gs.fame).toBe(1);
    expect(gs.flags.has('f1')).toBe(true);
    expect(gs.quests.status('q1')).toBe('done');
  });
});

describe('startQuest', () => {
  it('startQuest emits questStarted', () => {
    const gs = GameState.newGame('woni', QUESTS);
    const started: string[] = [];
    gs.bus.on('questStarted', (p) => started.push(p.questId));
    gs.startQuest('q1');
    expect(started).toEqual(['q1']);
    expect(gs.quests.status('q1')).toBe('active');
  });
});

describe('snapshot round trip', () => {
  it('restores player, quests, flags and location', () => {
    const gs = GameState.newGame('zena', QUESTS);
    gs.quests.start('q1');
    gs.addHearts(30);
    gs.flags.add('x');
    gs.location = { mapId: 'ch1_practice', spawnId: 'from_alley' };
    gs.playTimeMs = 1234;
    const snap = gs.snapshot();
    const back = GameState.fromSnapshot(snap, QUESTS);
    expect(back.snapshot()).toEqual(snap);
    expect(back.quests.status('q1')).toBe('active');
    expect(back.flags.has('x')).toBe(true);
    expect(back.player.member).toBe('zena');
  });
});
