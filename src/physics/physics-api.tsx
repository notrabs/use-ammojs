import { AmmoPhysicsContext } from "./physics-context";
import { Vector3, Quaternion } from "three";
import { UpdateBodyOptions } from "three-ammo";

export type PhysicsApi = ReturnType<typeof createPhysicsApi>;

export function createPhysicsApi(
  physicsContext: AmmoPhysicsContext,
  bodyUUID: string,
  shapesUUID: string
) {
  return {
    updateBodyOptions(options: UpdateBodyOptions) {
      physicsContext.updateBody(bodyUUID, options);
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
  };
}
