import { AmmoPhysicsContext, UpdateBodyOptions } from "./physics-context";

export type PhysicsApi = ReturnType<typeof createPhysicsApi>;

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
