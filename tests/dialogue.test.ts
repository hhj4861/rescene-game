import { describe, it, expect } from 'vitest';
import { DialogueRunner } from '../src/systems/dialogue';
import { DialogueScriptSchema, type DialogueScript } from '../src/data/schema';

const script: DialogueScript = {
  id: 'd_test',
  nodes: [
    { id: 'n0', speaker: 'may', face: 'sad', text: '못 하겠어요.', next: 'n1', setFlags: ['seen_n0'] },
    { id: 'n1', speaker: 'woni', text: '기회는 와야 잡는 거다.',
      choices: [
        { text: '같이 남자.', next: 'n2', setFlags: ['may_stayed'] },
        { text: '네 마음이 중요해.', next: 'n3' },
        { text: '(비밀 선택지)', next: 'n3', requiresFlags: ['secret'] },
      ] },
    { id: 'n2', speaker: 'may', face: 'happy', text: '그립감, 좋네요.', end: true },
    { id: 'n3', speaker: 'may', text: '생각해 볼게요.', end: true },
  ],
};

describe('DialogueScriptSchema', () => {
  it('accepts a well-formed script', () => {
    expect(() => DialogueScriptSchema.parse(script)).not.toThrow();
  });
  it('rejects dangling next references', () => {
    const bad = { id: 'x', nodes: [{ id: 'a', speaker: 'may', text: 'hi', next: 'zzz' }] };
    expect(() => DialogueScriptSchema.parse(bad)).toThrow(/zzz/);
  });
  it('rejects a node with no way forward', () => {
    const bad = { id: 'x', nodes: [{ id: 'a', speaker: 'may', text: 'hi' }] };
    expect(() => DialogueScriptSchema.parse(bad)).toThrow(/needs next/);
  });
});

describe('DialogueRunner', () => {
  it('starts at the first node and applies its flags', () => {
    const flags = new Set<string>();
    const r = new DialogueRunner(script, flags);
    expect(r.current().id).toBe('n0');
    expect(flags.has('seen_n0')).toBe(true);
    expect(r.isFinished()).toBe(false);
  });
  it('advances with next() until a choice is required', () => {
    const r = new DialogueRunner(script, new Set());
    expect(r.next()).toBe(true);
    expect(r.current().id).toBe('n1');
    expect(r.awaitingChoice()).toBe(true);
    expect(r.next()).toBe(false);
    expect(r.current().id).toBe('n1');
  });
  it('filters choices by requiresFlags', () => {
    const r = new DialogueRunner(script, new Set());
    r.next();
    expect(r.choices().map((c) => c.text)).toEqual(['같이 남자.', '네 마음이 중요해.']);
    const r2 = new DialogueRunner(script, new Set(['secret']));
    r2.next();
    expect(r2.choices()).toHaveLength(3);
  });
  it('choose() applies flags, jumps, and end nodes finish', () => {
    const flags = new Set<string>();
    const r = new DialogueRunner(script, flags);
    r.next();
    r.choose(0);
    expect(flags.has('may_stayed')).toBe(true);
    expect(r.current().id).toBe('n2');
    expect(r.isFinished()).toBe(false);
    expect(r.next()).toBe(false);
    expect(r.isFinished()).toBe(true);
  });
  it('choose() throws when not awaiting a choice or index is out of range', () => {
    const r = new DialogueRunner(script, new Set());
    expect(() => r.choose(0)).toThrow(/choice/);
    r.next();
    expect(() => r.choose(5)).toThrow(/choice/);
  });
});
