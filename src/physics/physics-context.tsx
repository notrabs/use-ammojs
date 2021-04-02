import { createContext, useContext } from "react";
import { Vector3 } from "react-three-fiber";

export { AmmoDebugConstants } from "ammo-debug-drawer";

export interface WorldOptions {
  // default = 10e-6
  epsilon?: number;

  // 32-bit mask, see AmmoDebugConstants
  // default = AmmoDebugConstants.NoDebug
  debugDrawMode?: number;

  // default = 4
  maxSubSteps?: number;

  // default = 1/60
  fixedTimeStep?: number;

  // default = (0, -9.8, 0)
  gravity: Vector3;

  // default = 10
  solverIterations: number;
}

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

  // default = 1
  mass?: number;

  // default = world.gravity
  gravity?: Vector3;

  // default = 0.1
  linearDamping?: number;
  // default = 0.1
  angularDamping?: number;

  // default = 1.6
  linearSleepingThreshold?: number;
  // default = 2.5
  angularSleepingThreshold?: number;

  // default = (1,1,1)
  angularFactor?: Vector3;

  // default = active
  activationState?: BodyActivationState;
  // default = dynamic
  type?: BodyType;

  // default = false
  emitCollisionEvents?: boolean;
  // default = false
  disableCollision?: boolean;

  //32-bit mask, default = 1
  collisionFilterGroup?: number;
  //32-bit mask, default = 1
  collisionFilterMask?: number;

  // default = true
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

export type UpdateBodyOptions = Pick<
  BodyOptions,
  | "type"
  | "disableCollision"
  | "activationState"
  | "collisionFilterGroup"
  | "collisionFilterMask"
  | "linearDamping"
  | "angularDamping"
  | "gravity"
  | "linearSleepingThreshold"
  | "angularSleepingThreshold"
  | "angularFactor"
>;

export enum ConstraintType {
  LOCK = "lock",
  FIXED = "fixed",
  SPRING = "spring",
  SLIDER = "slider",
  HINGE = "hinge",
  CONE_TWIST = "coneTwist",
  POINT_TO_POINT = "pointToPoint"
}

export interface ConstraintOptions {
  type: ConstraintType;

  pivot?: Vector3;
  targetPivot?: Vector3;

  axis?: Vector3;
  targetAxis?: Vector3;
}

export interface AmmoPhysicsContext {
  addBody(uuid: string, mesh, options?: BodyOptions);
  removeBody(uuid: string);

  addShapes(bodyUuid: string, shapesUuid: string, mesh, options?: ShapeOptions);
  removeShapes(bodyUuid: string, shapesUuid: string);

  addConstraint(
    constraintId: string,
    bodyUuid: string,
    targetUuid: string,
    options?: ConstraintOptions
  );
  removeConstraint(constraintId: string);

  updateBody(uuid: string, options: UpdateBodyOptions);

  enableDebug(enable: boolean, debugSharedArrayBuffer: SharedArrayBuffer);

  resetDynamicBody(uuid: string);

  activateBody(uuid: string);
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
