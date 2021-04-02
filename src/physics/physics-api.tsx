import { AmmoPhysicsContext, UpdateBodyOptions } from "./physics-context";
import { Vector3 } from "react-three-fiber";

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

    setLinearVelocity(velocity: Vector3) {
      physicsContext.bodySetLinearVelocity(bodyUUID, velocity);
    }
  };
}
