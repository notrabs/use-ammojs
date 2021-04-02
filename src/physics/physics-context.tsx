import { createContext, useContext } from "react";
import { Quaternion, Vector3 } from "react-three-fiber";
import { Object3D } from "three";

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
  gravity?: Vector3;

  // default = 10
  solverIterations?: number;
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

export enum ShapeFit {
  //A single shape is automatically sized to bound all meshes within the entity.
  ALL = "all",

  //A single shape is sized manually. Requires halfExtents or sphereRadius.
  MANUAL = "manual"
}

export interface ShapeOptions {
  type: ShapeType;

  // default 0.01
  margin?: number;

  // default false
  includeInvisible?: boolean;

  offset?: Vector3;

  orientation?: Quaternion;

  // default "ALL"
  fit?: ShapeFit;

  // Only used with fit=MANUAL
  halfExtents?: Vector3;
  // Only used with fit=ALL
  minHalfExtents?: number;
  maxHalfExtents?: number;

  // Only used with ShapeType cylinder/capsule/cone
  cylinderAxis?: "x" | "y" | "z";

  // Only used with ShapeType sphere and manual fit
  sphereRadius?: number;

  // Only used with ShapeType hull, default 100000
  hullMaxVertices?: number;

  // Only used with ShapeType HACD
  compacityWeight?: number;
  volumeWeight?: number;
  nClusters?: number;
  nVerticesPerCH?: number;

  // Only used with ShapeType VHACD
  //https://kmamou.blogspot.com/2014/12/v-hacd-20-parameters-description.html
  resolution?: any;
  depth?: any;
  planeDownsampling?: any;
  convexhullDownsampling?: any;
  alpha?: any;
  beta?: any;
  gamma?: any;
  pca?: any;
  mode?: any;
  maxNumVerticesPerCH?: any;
  minVolumePerCH?: any;
  convexhullApproximation?: any;
  oclAcceleration?: any;

  // Only used with ShapeType HACD, VHACD
  concavity?: number;

  // Only used with ShapeType heightfield
  // default = 1
  heightfieldDistance?: number;
  heightfieldData?: any[];
  // default 0
  heightScale?: number;
  // default 1 ( x = 0; y = 1; z = 2)
  upAxis?: number;
  // default "float"
  heightDataType?: "short" | "float";
  // default true
  flipQuadEdges?: boolean;
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
  addBody(uuid: string, mesh: Object3D, options?: BodyOptions);
  removeBody(uuid: string);

  addShapes(
    bodyUuid: string,
    shapesUuid: string,
    mesh: Object3D,
    options?: ShapeOptions
  );
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
