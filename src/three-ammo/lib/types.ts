import { Quaternion, Vector3 } from "three";

export interface WorldConfig {
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

export interface BodyConfig{
  loadedEvent?: string;

  // default = 1
  mass?: number;

  // default = world.gravity
  gravity?: Vector3;

  enableCCD?: boolean;
  // e.g. 1e-7
  ccdMotionThreshold? :number;
  // e.g. 0.5
  ccdSweptSphereRadius?: number;

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

export type UpdateBodyOptions = Pick<
  BodyConfig,
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

export interface ShapeConfig {
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

export enum ConstraintType {
  LOCK = "lock",
  FIXED = "fixed",
  SPRING = "spring",
  SLIDER = "slider",
  HINGE = "hinge",
  CONE_TWIST = "coneTwist",
  POINT_TO_POINT = "pointToPoint"
}