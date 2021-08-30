import { Quaternion, Vector3 } from "three";
import {
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

export function toBtQuaternion(btQuat: Ammo.btQuaternion, vec: Quaternion) {
  btQuat.setValue(vec.x, vec.y, vec.z, vec.w);
}

export function toBtTransform(
  btTransform: Ammo.btTransform,
  transform: Transform
) {
  btTransform.setIdentity();
  btTransform
    .getOrigin()
    .setValue(transform.position.x, transform.position.y, transform.position.z);
  const tmp = new Ammo.btQuaternion(
    transform.rotation.x,
    transform.rotation.y,
    transform.rotation.z,
    transform.rotation.w
  );
  btTransform.setRotation(tmp);
  Ammo.destroy(tmp);
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
