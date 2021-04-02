import { AmmoPhysicsContext, UpdateBodyOptions } from "physics/physics-context";

export function createPhysicsApi(
  physicsContext: AmmoPhysicsContext,
  bodyUUID: string,
  shapesUUID: string
) {
  return {
    updateBodyOptions(options: UpdateBodyOptions) {
      physicsContext.updateBody(bodyUUID, options);
    }
  };
}
