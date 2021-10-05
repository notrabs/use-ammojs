import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import {
  SerializedQuaternion,
  SoftBodyAnchor,
  SoftBodyAnchorRef,
  SoftBodyRigidBodyAnchor,
  SoftBodyRigidBodyAnchorRef,
  Transform,
} from "../lib/types";

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

export function toBtVector3(btVec: Ammo.btVector3, vec: Vector3) {
  btVec.setValue(vec.x, vec.y, vec.z);
}

export function toVector3(btVec: Ammo.btVector3) {
  return new Vector3(btVec.x(), btVec.y(), btVec.z());
}

export function toBtQuaternion(
  btQuat: Ammo.btQuaternion,
  quat: Quaternion | SerializedQuaternion
) {
  btQuat.setValue(
    (quat as Quaternion).x ?? (quat as SerializedQuaternion)._x,
    (quat as Quaternion).y ?? (quat as SerializedQuaternion)._y,
    (quat as Quaternion).z ?? (quat as SerializedQuaternion)._z,
    (quat as Quaternion).w ?? (quat as SerializedQuaternion)._w
  );
}

export function fromBtQuaternion(btQuat: Ammo.btQuaternion) {
  return new Quaternion(btQuat.x(), btQuat.y(), btQuat.z(), btQuat.w());
}

export function toBtTransform(
  btTransform: Ammo.btTransform,
  transform: Transform
) {
  btTransform.setIdentity();
  btTransform
    .getOrigin()
    .setValue(transform.position.x, transform.position.y, transform.position.z);
  const tmp = new Ammo.btQuaternion(0, 0, 0, 1);
  toBtQuaternion(tmp, transform.rotation);
  btTransform.setRotation(tmp);
  Ammo.destroy(tmp);
}

export function fromBtTransform(btTransform: Ammo.btTransform): Transform {
  const matrix = new Matrix4();

  const position = toVector3(btTransform.getOrigin());
  const rotation = fromBtQuaternion(btTransform.getRotation());

  return {
    position,
    rotation,
  };
}

export function notImplementedEventReceiver(data) {
  console.error("not implemented event: ", data);
}

export function isSoftBodyRigidBodyAnchor(
  anchor: SoftBodyAnchor
): anchor is SoftBodyRigidBodyAnchor {
  return anchor.hasOwnProperty("rigidBodyUUID");
}

export function isSoftBodyRigidBodyAnchorRef(
  anchor: SoftBodyAnchorRef
): anchor is SoftBodyRigidBodyAnchorRef {
  return !!(anchor as SoftBodyRigidBodyAnchorRef).rigidBodyRef;
}

export function isVector3(v): v is Vector3 {
  return v && v.isVector3;
}

export function isEuler(v): v is Euler {
  return v && v.isEuler;
}

export function isQuaternion(q): q is Quaternion {
  return q && q.isQuaternion;
}
