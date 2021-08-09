import { Object3D, Quaternion, Vector3 } from "three";
import { Matrix4 } from "@react-three/fiber";

export type UUID = string;

export type WorkerRequestId = number;

export type SerializedVector3 = Vector3 | { x: number; y: number; z: number };

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

  //32-bit mask, default = 0x0001
  collisionFilterGroup?: number;
  //32-bit mask, default = 0xffff
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

// https://pybullet.org/Bullet/BulletFull/classbtTypedConstraint.html
export enum ConstraintType {
  // can be used to simulate ragdoll joints (upper arm, leg etc)
  // https://pybullet.org/Bullet/BulletFull/classbtConeTwistConstraint.html
  // single body & two body
  CONE_TWIST = "coneTwist",

  // not implemented, but available in bullet
  // CONTACT = "contact",
  // GEAR = "gear",

  // https://pybullet.org/Bullet/BulletFull/classbtGeneric6DofConstraint.html#details
  // single body & two body
  GENERIC_6_DOF = "generic6DOF",

  // Generic 6 DOF constraint that allows to set spring motors to any translational and rotational DOF.
  // https://pybullet.org/Bullet/BulletFull/classbtGeneric6DofSpringConstraint.html
  // single body & two body
  GENERIC_6_DOF_SPRING = "generic6DOFSpring",

  // not implemented
  // https://pybullet.org/Bullet/BulletFull/classbtUniversalConstraint.html
  // two body
  // UNIVERSAL = "universal",

  // not implemented. Improved version of GENERIC_6_DOF_SPRING
  // GENERIC_6_DOF_SPRING2 = "generic6DOFSpring2",

  // https://pybullet.org/Bullet/BulletFull/classbtFixedConstraint.html
  // two body
  FIXED = "fixed",

  // https://pybullet.org/Bullet/BulletFull/classbtHinge2Constraint.html
  // two body
  // HINGE_2 = "hinge2",

  // hinge constraint between two rigidbodies each with a pivotpoint that descibes the axis location in local space axis defines the orientation of the hinge axis
  // https://pybullet.org/Bullet/BulletFull/classbtHingeConstraint.html
  // single body & two body
  HINGE = "hinge",

  // The getAccumulatedHingeAngle returns the accumulated hinge angle, taking rotation across the -PI/PI boundary into account.
  // not implemented
  // single body & two body
  // HINGE_ACCUMULATED_ANGLE = "hinge_accumulated_angle",

  // point to point constraint between two rigidbodies each with a pivotpoint that descibes the 'ballsocket' location in local space
  // https://pybullet.org/Bullet/BulletFull/classbtPoint2PointConstraint.html#details
  // single body & two body
  POINT_TO_POINT = "pointToPoint",

  // https://pybullet.org/Bullet/BulletFull/classbtSliderConstraint.html
  // single body & two body
  SLIDER = "slider",
}

interface ConeTwistConstraintDynamicConfig {
  angularOnly?: boolean;

  swingSpan1?: number; // setLimit with index 5
  swingSpan2?: number; // setLimit with index 4
  twistSpan?: number; // setLimit with index 3

  damping?: number;

  motorEnabled?: boolean;

  maxMotorImpulse?: number;

  motorTarget?: Quaternion;

  fixThresh?: number;
}

interface Generic6DOFDynamicConfig {
  linearLowerLimit?: Vector3;
  linearUpperLimit?: Vector3;
  angularLowerLimit?: Vector3;
  angularUpperLimit?: Vector3;
}
interface Generic6DOFSpringDynamicConfig {
  springEnabled?: [boolean, boolean, boolean, boolean, boolean, boolean];
  equilibriumPoint?: [number, number, number, number, number, number];
  stiffness?: [number, number, number, number, number, number];
  damping?: [number, number, number, number, number, number];
}

interface HingeDynamicConfig {
  angularOnly?: boolean;

  enableAngularMotor?: boolean;
  motorTargetVelocity?: number;
  maxMotorImpulse?: number;

  lowerLimit?: number;
  upperLimit?: number;

  // TODO implement events:
  // setMotorTarget(btScalar targetAngle, btScalar dt)
  // getHingeAngle()
}

interface FixedDynamicConfig {
  // nothing to configure
}

interface PointToPointDynamicConfig {
  // nothing to configure
}

interface SliderDynamicConfig {
  linearLowerLimit?: number;
  linearUpperLimit?: number;
  angularLowerLimit?: number;
  angularUpperLimit?: number;
  softnessDirLin?: number;
  restitutionDirLin?: number;
  dampingDirLin?: number;
  softnessDirAng?: number;
  restitutionDirAng?: number;
  dampingDirAng?: number;
  softnessLimLin?: number;
  restitutionLimLin?: number;
  dampingLimLin?: number;
  softnessLimAng?: number;
  restitutionLimAng?: number;
  dampingLimAng?: number;
  softnessOrthoLin?: number;
  restitutionOrthoLin?: number;
  dampingOrthoLin?: number;
  softnessOrthoAng?: number;
  restitutionOrthoAng?: number;
  dampingOrthoAng?: number;

  poweredLinearMotor?: boolean;
  targetLinMotorVelocity?: number;
  maxLinMotorForce?: number;

  poweredAngularMotor?: boolean;
  targetAngMotorVelocity?: number;
  maxAngMotorForce?: number;
}

export type TwoBodyConstraintConfig =
  | ({
      type: ConstraintType.CONE_TWIST;

      frameInA?: Matrix4;
      frameInB?: Matrix4;
    } & ConeTwistConstraintDynamicConfig)
  | ({
      type: ConstraintType.GENERIC_6_DOF;

      frameInA?: Matrix4;
      frameInB?: Matrix4;
      useLinearReferenceFrameA: boolean;
    } & Generic6DOFDynamicConfig)
  | ({
      type: ConstraintType.FIXED;

      frameInA?: Matrix4;
      frameInB?: Matrix4;
    } & FixedDynamicConfig)
  | ({
      type: ConstraintType.GENERIC_6_DOF_SPRING;

      frameIA?: Matrix4;
      frameInB?: Matrix4;
      useLinearReferenceFrameA: boolean;
    } & Generic6DOFSpringDynamicConfig)
  | ({
      type: ConstraintType.HINGE;

      pivot: Vector3;
      axis: Vector3;
      targetPivot: Vector3;
      targetAxis: Vector3;

      useReferenceFrameA: boolean;
    } & HingeDynamicConfig)
  | ({
      type: ConstraintType.POINT_TO_POINT;

      pivot: Vector3;
      targetPivot: Vector3;
    } & PointToPointDynamicConfig)
  | ({
      type: ConstraintType.SLIDER;

      frameInA?: Matrix4;
      frameInB?: Matrix4;
    } & SliderDynamicConfig);

export type SingleBodyConstraintConfig =
  | ({
      type: ConstraintType.CONE_TWIST;

      frameInA?: Matrix4;
    } & ConeTwistConstraintDynamicConfig)
  | ({
      type: ConstraintType.GENERIC_6_DOF;

      frameInB?: Matrix4;
      useLinearReferenceFrameA: boolean;
    } & Generic6DOFDynamicConfig)
  | ({
      type: ConstraintType.GENERIC_6_DOF_SPRING;

      frameInB?: Matrix4;
      useLinearReferenceFrameB: boolean;
    } & Generic6DOFSpringDynamicConfig)
  | ({
      type: ConstraintType.HINGE;

      pivot: Vector3;
      axis: Vector3;
      useReferenceFrameA: boolean;
    } & HingeDynamicConfig)
  | ({
      type: ConstraintType.POINT_TO_POINT;

      pivot: Vector3;
    } & PointToPointDynamicConfig)
  | ({
      type: ConstraintType.SLIDER;

      frameInB?: Matrix4;
      useLinearReferenceFrameA: boolean;
    } & SliderDynamicConfig);

export type ConstraintConfig =
  | SingleBodyConstraintConfig
  | TwoBodyConstraintConfig;

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

  RAYCAST_REQUEST,
}

export enum ClientMessageType {
  READY,
  RIGIDBODY_READY,
  SOFTBODY_READY,
  TRANSFER_BUFFERS,

  RAYCAST_RESPONSE,
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

export interface AsyncRequestOptions {
  requestId: WorkerRequestId;
}

// unused, needs ammo.js idl update
export enum RaycastFlag {
  filterBackfaces = 1 << 0,

  // Prevents returned face normal getting flipped when a ray hits a back-facing triangle
  keepUnflippedNormal = 1 << 1,

  ///SubSimplexConvexCastRaytest is the default, even if kF_None is set.
  useSubSimplexConvexCastRaytest = 1 << 2,

  // Uses an approximate but faster ray versus convex intersection algorithm
  useGjkConvexCastRaytest = 1 << 3,

  //don't use the heightfield raycast accelerator. See https://github.com/bulletphysics/bullet3/pull/2062
  disableHeightfieldAccelerator = 1 << 4,

  terminator = 0xffffffff,
}

export interface RaycastOptions {
  from: Vector3;
  to: Vector3;

  // If false, only the closest result is returned, default = false
  multiple?: boolean;

  //32-bit mask, default = 0x0001
  collisionFilterGroup?: number;
  //32-bit mask, default = 0xffff
  collisionFilterMask?: number;
}

export interface RaycastHitMessage {
  uuid: string;

  hitPosition: SerializedVector3;

  normal: SerializedVector3;
}

export interface RaycastHit {
  object?: Object3D;

  hitPosition: Vector3;

  normal: Vector3;
}
