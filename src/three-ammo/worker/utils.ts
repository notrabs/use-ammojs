import { Quaternion, Vector3 } from "three";

export function almostEqualsVector3(epsilon: number, u: Vector3, v: Vector3) {
  return (
    Math.abs(u.x - v.x) < epsilon &&
    Math.abs(u.y - v.y) < epsilon &&
    Math.abs(u.z - v.z) < epsilon
  );
}

export function almostEqualsBtVector3(
  epsilon: number,
  u: Ammo.btVector3,
  v: Ammo.btVector3
) {
  return (
    Math.abs(u.x() - v.x()) < epsilon &&
    Math.abs(u.y() - v.y()) < epsilon &&
    Math.abs(u.z() - v.z()) < epsilon
  );
}

export function almostEqualsQuaternion(
  epsilon: number,
  u: Quaternion,
  v: Quaternion
) {
  return (
    (Math.abs(u.x - v.x) < epsilon &&
      Math.abs(u.y - v.y) < epsilon &&
      Math.abs(u.z - v.z) < epsilon &&
      Math.abs(u.w - v.w) < epsilon) ||
    (Math.abs(u.x + v.x) < epsilon &&
      Math.abs(u.y + v.y) < epsilon &&
      Math.abs(u.z + v.z) < epsilon &&
      Math.abs(u.w + v.w) < epsilon)
  );
}
