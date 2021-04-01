import { createContext, useContext } from "react";
import { Vector3 } from "react-three-fiber";

export enum BodyActivationState {
  ACTIVE_TAG = "active",
  ISLAND_SLEEPING = "islandSleeping",
  WANTS_DEACTIVATION = "wantsDeactivation",
  DISABLE_DEACTIVATION = "disableDeactivation",
  DISABLE_SIMULATION = "disableSimulation"
}

export enum BodyType {
  STATIC = "static",
  DYNAMIC = "dynamic",
  KINEMATIC = "kinematic"
}

export interface BodyOptions {
  loadedEvent?: string;

  mass?: number;
  gravity?: Vector3;

  linearDamping?: number;
  angularDamping?: number;

  linearSleepingThreshold?: number;
  angularSleepingThreshold?: number;

  angularFactor?: Vector3;

  activationState?: BodyActivationState;
  type?: BodyType;

  emitCollisionEvents?: boolean;
  disableCollision?: boolean;

  collisionFilterGroup?: number; //32-bit mask
  collisionFilterMask?: number; //32-bit mask

  scaleAutoUpdate?: boolean;
}

export enum ShapeType {
  BOX = "box",
  CYLINDER = "cylinder",
  SPHERE = "sphere",
  CAPSULE = "capsule",
  CONE = "cone",
  HULL = "hull",
  HACD = "hacd",
  VHACD = "vhacd",
  MESH = "mesh",
  HEIGHTFIELD = "heightfield"
}

export interface ShapeOptions {
  type: ShapeType;
  includeInvisible?: boolean;
}

export interface AmmoPhysicsContext {
  addBody(uuid, mesh, options?: BodyOptions);
  removeBody(uuid);

  addShapes(bodyUuid, shapesUuid, mesh, options?: ShapeOptions);
  removeShapes(bodyUuid, shapesUuid);

  addConstraint(constraintId, bodyUuid, targetUuid, options?);
  removeConstraint(constraintId);

  updateBody(uuid, options);

  enableDebug(enable, debugSharedArrayBuffer);

  resetDynamicBody(uuid);

  activateBody(uuid);
}

export const AmmoPhysicsContext = createContext<AmmoPhysicsContext | null>(
  null
);

export function useAmmoPhysicsContext(): AmmoPhysicsContext {
  const context = useContext(AmmoPhysicsContext);

  if (!context) {
    throw new Error(
      "Ammo Physics hook must be used within a <Physics /> Context"
    );
  }

  return context;
}
