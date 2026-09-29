import * as T from '/vendor/three/three.module.js';
import { group, material, cylinder, ball } from './primitives.js';

// A continuous sleeve bound to shoulder/elbow/wrist bones. The same mesh is used
// throughout the greeting; no swapping between resting and raised arm models.
export function createArm(parent, side, member, skin, makeHand) {
  const root = group(parent, [side * .234, .71, 0]);
  root.userData.articulated = true;
  const shoulder = new T.Bone(), elbow = new T.Bone(), wrist = new T.Bone();
  shoulder.name = `${member.id}-${side}-shoulder`;
  elbow.name = `${member.id}-${side}-elbow`;
  wrist.name = `${member.id}-${side}-wrist`;
  elbow.position.y = -.31; wrist.position.y = -.32;
  shoulder.add(elbow); elbow.add(wrist); root.add(shoulder);
  const positions = [], uv = [], indices = [], skinIndices = [], weights = [];
  const rows = 48, columns = 16;
  for (let row = 0; row <= rows; row++) {
    const t = row / rows, y = -.63 * t;
    const radius = .078 - .012 * t + .005 * Math.sin(t * Math.PI);
    // A soft blend around the elbow keeps the sleeve continuous as it bends.
    const elbowWeight = T.MathUtils.smoothstep(-y, .25, .38);
    const wristWeight = T.MathUtils.smoothstep(-y, .58, .63);
    for (let col = 0; col <= columns; col++) {
      const angle = col / columns * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      uv.push(col / columns, t);
      skinIndices.push(0, 1, 2, 0);
      weights.push(1 - elbowWeight, elbowWeight * (1 - wristWeight), elbowWeight * wristWeight, 0);
      if (row < rows && col < columns) {
        const i = row * (columns + 1) + col;
        indices.push(i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const color = member.outfit === 'varsity' ? '#e8e6df' : member.color;
  const sleeve = new T.SkinnedMesh(geometry, material(color, .94));
  sleeve.castShadow = sleeve.receiveShadow = true;
  // Animated bounds change as the arm rises; avoid stale bind-pose culling.
  sleeve.frustumCulled = false;
  root.add(sleeve); root.updateWorldMatrix(true, true);
  const skeleton = new T.Skeleton([shoulder, elbow, wrist]);
  sleeve.bind(skeleton);
  ball(shoulder, [.079,.08,.079], color, [0,-.012,0]);
  wrist.userData.articulated = true;
  cylinder(wrist, .069, .067, .075, member.color, [0, .026, 0]);
  const hand = makeHand(wrist, [0, -.055, 0], skin);
  hand.rotation.x = Math.PI / 2;
  return { root, shoulder, elbow, wrist, sleeve, skeleton, side };
}

export function poseArm(arm, pose, greeting = false) {
  arm.shoulder.rotation.set(greeting ? pose.shoulderX : -.28, 0, arm.side * (greeting ? pose.shoulderZ : .16));
  arm.elbow.rotation.set(greeting ? pose.elbowX : -1.30, 0, greeting ? pose.elbowZ : 0);
  arm.wrist.rotation.z = greeting ? pose.wristZ : 0;
}
