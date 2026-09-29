// Seconds on the scene clock: pausing freezes the complete pose, including a greeting.
export const GREETING_DURATION = 3.2;
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };

export function characterPose(time, index, greetingAt = null) {
  const age = greetingAt === null ? -1 : time - greetingAt;
  const active = age >= 0 && age < GREETING_DURATION;
  const lift = active ? smooth(age / .65) * smooth((GREETING_DURATION - age) / .75) : 0;
  const flutter = active ? Math.sin(Math.max(0, age - .6) * 11) * lift : 0;
  const blinkAge = (time + index * .73) % 4.9;
  const blink = blinkAge < .18 ? 1 - .92 * Math.sin(blinkAge / .18 * Math.PI) ** 2 : 1;
  return {
    active, lift, flutter, blink,
    breath: Math.sin(time * 1.5 + index) * .008,
    tilt: Math.sin(time * .7 + index) * .017,
    nod: active ? Math.sin(Math.min(age / .8, 1) * Math.PI) * .075 : 0,
    smile: (greetingAt === null ? .08 : .35) + lift * .6,
    shoulderX: -.28 + lift * .12,
    shoulderZ: .16 + lift * .87,
    elbowX: -1.30 * (1 - lift),
    elbowZ: lift * 1.5,
    wristZ: flutter * .20,
  };
}
