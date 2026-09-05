import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PLAYER_SPEED, PLAYER_JUMP_VELOCITY } from '../config';

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private mapId = '';
  private spawnId = 'start';

  constructor() {
    super('World');
  }

  init(data: { mapId: string; spawnId: string }): void {
    this.mapId = data.mapId;
    this.spawnId = data.spawnId ?? 'start';
  }

  create(): void {
    this.add.text(8, 8, `map: ${this.mapId}`, { fontSize: '12px', color: '#fff' });
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x800080, 1).fillRect(0, 0, GAME_WIDTH, 40).generateTexture('ground', GAME_WIDTH, 40);
    g.clear().fillStyle(0xffc0cb, 1).fillRect(0, 0, 40, 60).generateTexture('playerTexture', 40, 60);
    g.destroy();

    const platforms = this.physics.add.staticGroup();
    platforms.create(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'ground');

    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT - 120, 'playerTexture');
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, platforms);
    this.cursors = this.input.keyboard!.createCursorKeys();
  }

  update(): void {
    if (this.cursors.left.isDown) this.player.setVelocityX(-PLAYER_SPEED);
    else if (this.cursors.right.isDown) this.player.setVelocityX(PLAYER_SPEED);
    else this.player.setVelocityX(0);

    const onGround = this.player.body!.touching.down || this.player.body!.blocked.down;
    if ((this.cursors.up.isDown || this.cursors.space.isDown) && onGround) {
      this.player.setVelocityY(PLAYER_JUMP_VELOCITY);
    }
  }
}
