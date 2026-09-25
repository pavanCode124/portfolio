import * as THREE from 'three';

const _d = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

/**
 * Analytic two-bone IK (law of cosines).
 *
 * Given a shoulder S, a desired wrist W and bone lengths, returns the elbow
 * position and the reachable wrist. The elbow bends toward `pole`, which is
 * what keeps a robot's elbow pointing down and out instead of flipping.
 */
export function solveTwoBone(
  S: THREE.Vector3,
  W: THREE.Vector3,
  l1: number,
  l2: number,
  pole: THREE.Vector3,
  outElbow: THREE.Vector3,
  outWrist: THREE.Vector3,
) {
  _d.subVectors(W, S);
  const len = Math.max(_d.length(), 1e-4);
  const dist = THREE.MathUtils.clamp(len, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  _d.divideScalar(len);

  const cosA = THREE.MathUtils.clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1);
  const a = Math.acos(cosA);

  _perp.copy(pole).addScaledVector(_d, -pole.dot(_d));
  if (_perp.lengthSq() < 1e-8) _perp.set(0, -1, 0);
  _perp.normalize();

  outElbow.copy(S).addScaledVector(_d, Math.cos(a) * l1).addScaledVector(_perp, Math.sin(a) * l1);
  outWrist.copy(S).addScaledVector(_d, dist);
  return dist / (l1 + l2);
}

/**
 * World-space orientation for a bone whose geometry hangs along local -Y.
 * `forward` fixes the twist around the bone so hands don't spin.
 */
export function boneQuaternion(dir: THREE.Vector3, forward: THREE.Vector3, out: THREE.Quaternion) {
  _y.copy(dir).normalize().negate();
  _z.copy(forward).addScaledVector(_y, -forward.dot(_y));
  if (_z.lengthSq() < 1e-8) _z.set(0, 0, 1).addScaledVector(_y, -_y.z);
  _z.normalize();
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}

/**
 * World orientation for a bone hanging along local -Y whose local +X is pinned
 * to `axis`. Give the upper arm and forearm the same axis and the elbow can
 * only rotate about that one axle, the way a real hinge servo does.
 */
export function hingeQuaternion(dir: THREE.Vector3, axis: THREE.Vector3, out: THREE.Quaternion) {
  _y.copy(dir).normalize().negate();
  _x.copy(axis).addScaledVector(_y, -axis.dot(_y));
  if (_x.lengthSq() < 1e-8) _x.set(1, 0, 0);
  _x.normalize();
  _z.crossVectors(_x, _y).normalize();
  _m.makeBasis(_x, _y, _z);
  return out.setFromRotationMatrix(_m);
}

const _pq = new THREE.Quaternion();

/** Converts a desired world rotation into the local rotation under `parent`. */
export function worldToLocalQuat(parent: THREE.Object3D, world: THREE.Quaternion, out: THREE.Quaternion) {
  parent.getWorldQuaternion(_pq);
  return out.copy(_pq.invert()).multiply(world);
}

const _ray = new THREE.Vector3();

/** Screen pixel → world point on the plane z = planeZ. */
export function screenToWorld(
  px: number,
  py: number,
  w: number,
  h: number,
  camera: THREE.Camera,
  planeZ: number,
  out: THREE.Vector3,
) {
  _ray.set((px / w) * 2 - 1, -(py / h) * 2 + 1, 0.5).unproject(camera);
  _ray.sub(camera.position).normalize();
  const t = (planeZ - camera.position.z) / _ray.z;
  return out.copy(camera.position).addScaledVector(_ray, t);
}
