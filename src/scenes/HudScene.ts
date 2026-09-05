import Phaser from 'phaser';
import { SCENE } from '../core/AssetKeys';
import { getSession } from '../core/session';
import { getMap, getMember, getSkill } from '../data/index';
import { describeObjective } from '../systems/questText';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { Bar } from '../ui/Bar';
import { SMALL_TEXT, style } from '../ui/textStyles';

const SLOT_KEYS = ['A', 'S', 'D'] as const;

export class HudScene extends Phaser.Scene {
  private hp!: Bar;
  private mp!: Bar;
  private xp!: Bar;
  private level!: Phaser.GameObjects.Text;
  private hearts!: Phaser.GameObjects.Text;
  private fame!: Phaser.GameObjects.Text;
  private mapName!: Phaser.GameObjects.Text;
  private tracker!: Phaser.GameObjects.Text;
  private slots: { box: Phaser.GameObjects.Rectangle; name: Phaser.GameObjects.Text; cd: Phaser.GameObjects.Text }[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor() {
    super(SCENE.hud);
  }

  create(): void {
    const gs = getSession(this).gs;
    const barY = GAME_HEIGHT - 64;
    this.add.rectangle(0, barY, GAME_WIDTH, 64, 0x16161e, 0.85).setOrigin(0, 0);

    this.level = this.add.text(12, barY + 8, '', style(14, '#ffffff', { fontStyle: 'bold' }));
    this.hp = new Bar(this, 12, barY + 36, 180, 14, '#f7768e');
    this.mp = new Bar(this, 12, barY + 52, 180, 10, '#7aa2f7');
    this.xp = new Bar(this, 0, GAME_HEIGHT - 3, GAME_WIDTH, 4, '#ffd166', false);
    this.hearts = this.add.text(210, barY + 8, '', style(14, '#f7768e'));
    this.fame = this.add.text(210, barY + 28, '', SMALL_TEXT);

    this.slots = SLOT_KEYS.map((k, i) => {
      const x = 340 + i * 96;
      const box = this.add.rectangle(x, barY + 32, 84, 44, 0x24283b).setStrokeStyle(1, 0x565f89);
      this.add.text(x - 38, barY + 12, k, style(11, '#ffd166', { fontStyle: 'bold' }));
      const name = this.add.text(x, barY + 30, '', style(11, '#c0caf5', { align: 'center', wordWrap: { width: 80 } })).setOrigin(0.5);
      const cd = this.add.text(x, barY + 46, '', style(10, '#a9b1d6')).setOrigin(0.5);
      return { box, name, cd };
    });

    this.add.text(GAME_WIDTH - 12, barY + 48, '←→ 이동  Space 점프  ↑ 상호작용/사다리  ↓+Space 내려가기  A 공격  S/D 스킬  F 회복', SMALL_TEXT).setOrigin(1, 0.5);
    this.mapName = this.add.text(8, 8, '', style(14, '#ffffff', { stroke: '#000000', strokeThickness: 3 }));
    this.tracker = this.add.text(GAME_WIDTH - 8, 8, '', style(12, '#c0caf5', { align: 'right', stroke: '#000000', strokeThickness: 3 })).setOrigin(1, 0);

    this.unsubscribe = gs.bus.on('changed', () => this.refresh());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribe?.());
    this.refresh();
  }

  private refresh(): void {
    const gs = getSession(this).gs;
    const max = gs.maxStats();
    const p = gs.player;
    const member = getMember(p.member);
    this.mapName.setText(getMap(gs.location.mapId).name);
    this.level.setText(`${member.name}  Lv.${p.level}  SP ${p.sp}`);
    this.hp.set(p.hp / max.hp, `체력 ${p.hp}/${max.hp}`);
    this.mp.set(p.mp / max.mp, `기력 ${p.mp}/${max.mp}`);
    const need = Number.isFinite(gs.xpNeeded()) ? gs.xpNeeded() : 1;
    this.xp.set(p.xp / need);
    this.hearts.setText(`♥ ${gs.hearts}`);
    this.fame.setText(`인지도 ${gs.fame}`);
    member.skills.slice(0, 3).forEach((sid, i) => {
      const s = getSkill(sid);
      const slot = this.slots[i]!;
      slot.name.setText(p.level >= s.level ? s.name : `${s.name}\n(Lv.${s.level})`).setAlpha(p.level >= s.level ? 1 : 0.4);
    });
    const lines = gs.quests.activeQuests().map((q) => {
      const prog = gs.quests.progress(q.id);
      const done = gs.quests.status(q.id) === 'completable';
      return [`${done ? '✔ ' : ''}${q.title}`, ...q.objectives.map((o, i) => `  ${describeObjective(o, prog[i] ?? 0)}`)].join('\n');
    });
    this.tracker.setText(lines.join('\n\n'));
  }

  update(): void {
    const gs = getSession(this).gs;
    const now = this.time.now;
    getMember(gs.player.member).skills.slice(0, 3).forEach((sid, i) => {
      const until = gs.skillRuntime.cooldownUntil[sid] ?? 0;
      const left = Math.max(0, until - now);
      this.slots[i]!.cd.setText(left > 0 ? `${(left / 1000).toFixed(1)}s` : '');
      this.slots[i]!.box.setFillStyle(left > 0 ? 0x1a1b26 : 0x24283b);
    });
  }
}
