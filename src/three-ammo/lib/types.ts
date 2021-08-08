import { Quaternion, Vector3 } from "three";

export type UUID = string;

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
  ACTIVE_TAG = 1,
  ISLAND_SLEEPING = 2,
  WANTS_DEACTIVATION = 3,
  DISABLE_DEACTIVATION = 4,
  DISABLE_SIMULATION = 5,
}

export enum BodyType {
  STATIC = "static",
  DYNAMIC = "dynamic",
  KINEMATIC = "kinematic",
}

export interface BodyConfig {
  loadedEvent?: string;

  // default = 1
  mass?: number;

  // default = world.gravity
  gravity?: Vector3;

  enableCCD?: boolean;
  // e.g. 1e-7
  ccdMotionThreshold?: number;
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

export enum SoftBodyFCollisionFlag {
  // Rigid versus soft mask.
  RVSmask = 0x000f,

  // SDF based rigid vs soft.
  SDF_RS = 0x0001,

  // Cluster vs convex rigid vs soft.
  CL_RS = 0x0002,

  // Rigid versus soft mask.
  SVSmask = 0x0030,

  // Vertex vs face soft vs soft handling.
  VF_SS = 0x0010,

  // Cluster vs cluster soft vs soft handling.
  CL_SS = 0x0020,

  // Cluster soft body self collision.
  CL_SELF = 0x0040,

  Default = SDF_RS,
}

// see https://pybullet.org/Bullet/phpBB3/viewtopic.php?t=7070
export interface SoftBodyConfig {
  type?: SoftBodyType;

  mass?: number;
  margin?: number;

  clusters?: number;

  viterations?: number;
  piterations?: number;

  friction?: number;
  damping?: number;
  pressure?: number;

  linearStiffness?: number;
  angularStiffness?: number;
  volumeStiffness?: number;

  randomizeConstraints?: boolean;
  activationState?: BodyActivationState;

  //32-bit mask, default = 1
  collisionFilterGroup?: number;
  //32-bit mask, default = 1
  collisionFilterMask?: number;

  // see SoftBodyFCollisionFlag  (btSoftBody::fCollision)
  collisionFlag?: number;
}

export enum SoftBodyType {
  TRIMESH = "trimesh",
  ROPE = "rope",
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
  HEIGHTFIELD = "heightfield",
}

export enum ShapeFit {
  //A single shape is automatically sized to bound all meshes within the entity.
  ALL = "all",

  //A single shape is sized manually. Requires halfExtents or sphereRadius.
  MANUAL = "manual",
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
  POINT_TO_POINT = "pointToPoint",
}

export enum BufferState {
  UNINITIALIZED = 0,
  READY = 1,
  CONSUMED = 2,
}

export enum MessageType {
  INIT,
  TRANSFER_BUFFERS,
  SET_SIMULATION_SPEED,

  ADD_RIGIDBODY,
  UPDATE_RIGIDBODY,
  REMOVE_RIGIDBODY,
  ADD_SHAPES,
  REMOVE_SHAPES,
  ADD_SOFTBODY,
  REMOVE_SOFTBODY,
  ADD_CONSTRAINT,
  REMOVE_CONSTRAINT,
  ENABLE_DEBUG,
  RESET_DYNAMIC_BODY,
  ACTIVATE_BODY,
  SET_SHAPES_OFFSET,

  // Body messages
  SET_MOTION_STATE,
  // GET_LINEAR_VELOCITY,
  SET_LINEAR_VELOCITY,
  // GET_ANGULAR_VELOCITY,
  SET_ANGULAR_VELOCITY,
  APPLY_FORCE,
  APPLY_CENTRAL_FORCE,
  APPLY_IMPULSE,
  APPLY_CENTRAL_IMPULSE,
  APPLY_TORQUE_IMPULSE,
  CLEAR_FORCES,

  // GET_RESTITUTION,
  SET_RESTITUTION,
  // GET_FRICTION,
  SET_FRICTION,
  // GET_SPINNING_FRICTION,
  SET_SPINNING_FRICTION,
  // GET_ROLLING_FRICTION,
  SET_ROLLING_FRICTION,
}

export enum ClientMessageType {
  READY,
  RIGIDBODY_READY,
  SOFTBODY_READY,
  TRANSFER_BUFFERS,
}

export enum CollisionFlag {
  STATIC_OBJECT = 1,
  KINEMATIC_OBJECT = 2,
  NO_CONTACT_RESPONSE = 4,
  CUSTOM_MATERIAL_CALLBACK = 8, //this allows per-triangle material (friction/restitution)
  CHARACTER_OBJECT = 16,
  DISABLE_VISUALIZE_OBJECT = 32, //disable debug drawing
  DISABLE_SPU_COLLISION_PROCESSING = 64, //disable parallel/SPU processing
}

export interface SharedSoftBodyBuffers {
  uuid: UUID;
  indexIntArray: Uint32Array | Uint16Array;
  vertexFloatArray: Float32Array;
  normalFloatArray: Float32Array;
}

export interface SharedBuffers {
  rigidBodies: {
    headerIntArray: Int32Array;
    headerFloatArray: Float32Array;
    objectMatricesFloatArray: Float32Array;
    objectMatricesIntArray: Int32Array;
  };

  softBodies: SharedSoftBodyBuffers[];

  debug: {
    indexIntArray: Uint32Array;
    vertexFloatArray: Float32Array;
    colorFloatArray: Float32Array;
  };
}
