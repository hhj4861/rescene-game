export interface MoveInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jumpPressed: boolean;
}

export interface MoveState {
  onGround: boolean;
  onLadder: boolean;
  climbing: boolean;
  jumpsLeft: number;
  facing: 1 | -1;
}

export interface MoveConfig {
  speed: number;
  jumpVelocity: number;
  climbSpeed: number;
  maxJumps: number;
}

export interface MoveResult {
  vx: number;
  vy: number | null;
  climbing: boolean;
  jumpsLeft: number;
  facing: 1 | -1;
  dropThrough: boolean;
  gravity: boolean;
}

export const DEFAULT_MOVE_CONFIG: MoveConfig = { speed: 200, jumpVelocity: -550, climbSpeed: 140, maxJumps: 1 };

export function stepMovement(input: MoveInput, state: MoveState, cfg: MoveConfig): MoveResult {
  let jumpsLeft = state.onGround ? cfg.maxJumps : state.jumpsLeft;
  let facing = state.facing;
  if (input.left) facing = -1;
  else if (input.right) facing = 1;

  const wantsClimb = state.onLadder && (input.up || input.down);
  const climbing = state.onLadder && (state.climbing || wantsClimb);

  if (climbing) {
    if (input.jumpPressed) {
      return { vx: 0, vy: cfg.jumpVelocity, climbing: false, jumpsLeft: Math.max(0, cfg.maxJumps - 1), facing, dropThrough: false, gravity: true };
    }
    const vy = input.up ? -cfg.climbSpeed : input.down ? cfg.climbSpeed : 0;
    return { vx: 0, vy, climbing: true, jumpsLeft: cfg.maxJumps, facing, dropThrough: false, gravity: false };
  }

  const vx = input.left ? -cfg.speed : input.right ? cfg.speed : 0;
  let vy: number | null = null;
  let dropThrough = false;

  if (input.jumpPressed) {
    if (input.down && state.onGround) {
      dropThrough = true;
    } else if (jumpsLeft > 0) {
      vy = cfg.jumpVelocity;
      jumpsLeft -= 1;
    }
  }

  return { vx, vy, climbing: false, jumpsLeft, facing, dropThrough, gravity: true };
}
