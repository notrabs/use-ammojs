import { AmmoPhysicsContext } from "../physics-context";
import { Quaternion, Vector3 } from "three";
import { UpdateBodyOptions, UUID } from "../../three-ammo/lib/types";

export interface RigidbodyApi {
  updateBodyOptions(options: UpdateBodyOptions): void;

  getPosition(): Vector3;
  setPosition(position: Vector3);

  getRotation(): Quaternion;
  setRotation(rotation: Quaternion);

  setMotionState(position: Vector3, rotation: Quaternion): void;
  setLinearVelocity(velocity: Vector3): void;

  applyImpulse(impulse: Vector3, relativeOffset?: Vector3): void;
  applyForce(force: Vector3, relativeOffset?: Vector3): void;

  setShapesOffset(offset: Vector3);
}

export function createRigidBodyApi(
  physicsContext: AmmoPhysicsContext,
  bodyUUID: UUID
) {
  return {
    updateBodyOptions(options: UpdateBodyOptions) {
      physicsContext.updateRigidBody(bodyUUID, options);
    },

    getPosition(): Vector3 {
      return physicsContext.object3Ds[bodyUUID].position;
    },

    setPosition(position: Vector3) {
      physicsContext.bodySetMotionState(bodyUUID, position);
    },

    getRotation(): Quaternion {
      return physicsContext.object3Ds[bodyUUID].quaternion;
    },

    setRotation(rotation: Quaternion) {
      physicsContext.bodySetMotionState(bodyUUID, undefined, rotation);
    },

    setMotionState(position: Vector3, rotation: Quaternion) {
      physicsContext.bodySetMotionState(bodyUUID, position, rotation);
    },

    setLinearVelocity(velocity: Vector3) {
      physicsContext.bodySetLinearVelocity(bodyUUID, velocity);
    },

    applyImpulse(impulse: Vector3, relativeOffset?: Vector3) {
      physicsContext.bodyApplyImpulse(bodyUUID, impulse, relativeOffset);
    },

    applyForce(force: Vector3, relativeOffset?: Vector3) {
      physicsContext.bodyApplyForce(bodyUUID, force, relativeOffset);
    },

    setShapesOffset(offset: Vector3) {
      physicsContext.bodySetShapesOffset(bodyUUID, offset);
    },
  };
}
