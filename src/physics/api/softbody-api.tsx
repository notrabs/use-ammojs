import { AmmoPhysicsContext } from "../physics-context";
import { UUID } from "../../three-ammo/lib/types";

export interface SoftbodyApi {
  // setLinearVelocity(velocity: Vector3): void;
  //
  // applyImpulse(impulse: Vector3, relativeOffset?: Vector3): void;
  // applyForce(force: Vector3, relativeOffset?: Vector3): void;
}

export function createSoftbodyApi(
  physicsContext: AmmoPhysicsContext,
  bodyUUID: UUID
) {
  return {
    // setLinearVelocity(velocity: Vector3) {
    //   physicsContext.bodySetLinearVelocity(bodyUUID, velocity);
    // },
    //
    // applyImpulse(impulse: Vector3, relativeOffset?: Vector3) {
    //   physicsContext.bodyApplyImpulse(bodyUUID, impulse, relativeOffset);
    // },
    //
    // applyForce(force: Vector3, relativeOffset?: Vector3) {
    //   physicsContext.bodyApplyForce(bodyUUID, force, relativeOffset);
    // },
  };
}
