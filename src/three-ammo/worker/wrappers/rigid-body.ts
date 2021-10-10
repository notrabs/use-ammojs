import { Matrix4, Quaternion, Vector3 } from "three";
import {
  BodyActivationState,
  BodyConfig,
  BodyType,
  CollisionFlag,
  SerializedVector3,
  ShapeType,
  UpdateBodyOptions,
} from "../../lib/types";
import { World } from "./world";
import { almostEqualsBtVector3, almostEqualsQuaternion, almostEqualsVector3, } from "../utils";
import { FinalizedShape } from "../../../three-to-ammo";

enum RigidBodyFlags {
  NONE = 0,
  DISABLE_WORLD_GRAVITY = 1,
}

const pos = new Vector3();
const quat = new Quaternion();
const scale = new Vector3();
const v = new Vector3();
const q = new Quaternion();

const needsPolyhedralInitialization = [
  ShapeType.HULL,
  ShapeType.HACD,
  ShapeType.VHACD,
];

/**
 * Initializes a body component, assigning it to the physics system and binding listeners for
 * parsing the elements geometry.
 */
export class RigidBody {
  loadedEvent: string;
  mass: number;
  gravity: Ammo.btVector3;
  linearDamping: number;
  angularDamping: number;
  linearSleepingThreshold: number;
  angularSleepingThreshold: number;
  angularFactor: Vector3;
  activationState: BodyActivationState;
  type: BodyType;
  emitCollisionEvents: boolean;
  collisionFilterGroup: number;
  collisionFilterMask: number;
  scaleAutoUpdate: boolean;
  matrix: Matrix4;
  // shapes: Ammo.btCollisionShape[];
  world: World;
  disableCollision: boolean;
  physicsBody: Ammo.btRigidBody;
  localScaling?: Ammo.btVector3;
  prevScale: any;
  prevNumChildShapes?: number;
  msTransform?: Ammo.btTransform;
  rotation?: Ammo.btQuaternion;
  motionState?: Ammo.btDefaultMotionState;
  localInertia?: Ammo.btVector3;
  physicsShape: FinalizedShape;
  // compoundShape?: Ammo.btCompoundShape;
  rbInfo?: Ammo.btRigidBodyConstructionInfo;
  shapesChanged?: boolean;
  polyHedralFeaturesInitialized?: boolean;
  triMesh?: Ammo.btTriangleMesh;
  enableCCD: boolean;
  ccdMotionThreshold: number;
  ccdSweptSphereRadius: number;

  tmpVec: Ammo.btVector3;
  tmpTransform1: Ammo.btTransform;
  tmpTransform2: Ammo.btTransform;

  constructor(
    bodyConfig: BodyConfig,
    matrix: Matrix4,
    physicsShape: FinalizedShape,
    world: World
  ) {
    this.loadedEvent = bodyConfig.loadedEvent ? bodyConfig.loadedEvent : "";
    this.mass = bodyConfig.mass ?? 1;
    const worldGravity = world.physicsWorld.getGravity();
    this.gravity = new Ammo.btVector3(
      worldGravity.x(),
      worldGravity.y(),
      worldGravity.z()
    );
    if (bodyConfig.gravity) {
      this.gravity.setValue(
        bodyConfig.gravity.x,
        bodyConfig.gravity.y,
        bodyConfig.gravity.z
      );
    }
    this.linearDamping = bodyConfig.linearDamping ?? 0.01;
    this.angularDamping = bodyConfig.angularDamping ?? 0.01;
    this.linearSleepingThreshold = bodyConfig.linearSleepingThreshold ?? 1.6;
    this.angularSleepingThreshold = bodyConfig.angularSleepingThreshold ?? 2.5;
    this.angularFactor = new Vector3(1, 1, 1);
    if (bodyConfig.angularFactor) {
      this.angularFactor.copy(bodyConfig.angularFactor);
    }
    this.activationState =
      bodyConfig.activationState ?? BodyActivationState.ACTIVE_TAG;
    this.type = bodyConfig.type ? bodyConfig.type : BodyType.DYNAMIC;
    this.emitCollisionEvents = bodyConfig.emitCollisionEvents ?? false;
    this.disableCollision = bodyConfig.disableCollision ?? false;
    this.collisionFilterGroup = bodyConfig.collisionFilterGroup ?? 1; //32-bit mask
    this.collisionFilterMask = bodyConfig.collisionFilterMask ?? 1; //32-bit mask
    this.scaleAutoUpdate = bodyConfig.scaleAutoUpdate ?? true;

    this.enableCCD = bodyConfig.enableCCD ?? false;
    this.ccdMotionThreshold = bodyConfig.ccdMotionThreshold ?? 1e-7;
    this.ccdSweptSphereRadius = bodyConfig.ccdSweptSphereRadius ?? 0.5;

    this.matrix = matrix;
    this.world = world;
    // this.shapes = [];

    this.tmpVec = new Ammo.btVector3();
    this.tmpTransform1 = new Ammo.btTransform();
    this.tmpTransform2 = new Ammo.btTransform();

    this.physicsShape = physicsShape;
    if (physicsShape.type === ShapeType.MESH && this.type !== BodyType.STATIC) {
      throw new Error("non-static mesh colliders not supported");
    }

    this.physicsBody = this._initBody();

    this.shapesChanged = true;
    this.updateShapes();
  }

  /**
   * Parses an element's geometry and component metadata to create an Ammo body instance for the component.
   */
  _initBody() {
    this.localScaling = new Ammo.btVector3();

    this.matrix.decompose(pos, quat, scale);

    this.localScaling.setValue(scale.x, scale.y, scale.z);
    this.prevScale = new Vector3(1, 1, 1);
    this.prevNumChildShapes = 0;

    this.msTransform = new Ammo.btTransform();
    this.msTransform.setIdentity();
    this.rotation = new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w);

    this.msTransform.getOrigin().setValue(pos.x, pos.y, pos.z);
    this.msTransform.setRotation(this.rotation);

    this.motionState = new Ammo.btDefaultMotionState(
      this.msTransform,
      this.physicsShape.localTransform
    );

    this.localInertia = new Ammo.btVector3(0, 0, 0);

    this.physicsShape.setLocalScaling(this.localScaling);

    this.rbInfo = new Ammo.btRigidBodyConstructionInfo(
      this.mass,
      this.motionState,
      this.physicsShape,
      this.localInertia
    );

    this.physicsBody = new Ammo.btRigidBody(this.rbInfo);
    this.physicsBody.setActivationState(this.activationState);
    this.physicsBody.setSleepingThresholds(
      this.linearSleepingThreshold,
      this.angularSleepingThreshold
    );

    this.physicsBody.setDamping(this.linearDamping, this.angularDamping);

    const angularFactor = new Ammo.btVector3(
      this.angularFactor.x,
      this.angularFactor.y,
      this.angularFactor.z
    );
    this.physicsBody.setAngularFactor(angularFactor);
    Ammo.destroy(angularFactor);

    if (
      !almostEqualsBtVector3(
        0.001,
        this.gravity,
        this.world.physicsWorld.getGravity()
      )
    ) {
      this.physicsBody.setGravity(this.gravity);
      this.physicsBody.setFlags(RigidBodyFlags.DISABLE_WORLD_GRAVITY);
    }

    this.updateCollisionFlags();

    this.world.addRigidBody(
      this.physicsBody,
      this.matrix,
      this.collisionFilterGroup,
      this.collisionFilterMask
    );

    if (this.emitCollisionEvents) {
      // @ts-ignore
      this.world.addEventListener(this.physicsBody);
    }

    return this.physicsBody;
  }

  /**
   * Updates the body when shapes have changed. Should be called whenever shapes are added/removed or scale is changed.
   */
  updateShapes() {
    let updated = false;
    this.matrix.decompose(pos, quat, scale);
    if (
      this.scaleAutoUpdate &&
      this.prevScale &&
      !almostEqualsVector3(0.001, scale, this.prevScale)
    ) {
      this.prevScale.copy(scale);
      updated = true;

      this.localScaling!.setValue(
        this.prevScale.x,
        this.prevScale.y,
        this.prevScale.z
      );
      this.physicsShape.setLocalScaling(this.localScaling!);
    }

    if (this.shapesChanged) {
      this.shapesChanged = false;
      updated = true;
      if (this.type === BodyType.DYNAMIC) {
        this.updateMass();
      }

      this.world.updateRigidBody(this.physicsBody);
    }

    //call initializePolyhedralFeatures for hull shapes if debug is turned on and/or scale changes
    if (
      this.world.isDebugEnabled() &&
      (updated || !this.polyHedralFeaturesInitialized)
    ) {
      const shapes = this.physicsShape.shapes || [this.physicsShape];

      for (let i = 0; i < shapes.length; i++) {
        const collisionShape = shapes[i];
        if (needsPolyhedralInitialization.indexOf(collisionShape.type) !== -1) {
          ((collisionShape as unknown) as Ammo.btConvexHullShape).initializePolyhedralFeatures(
            0
          );
        }
      }
      this.polyHedralFeaturesInitialized = true;
    }
  }

  /**
   * Update the configuration of the body.
   */
  update(bodyConfig: UpdateBodyOptions) {
    if (
      (bodyConfig.type && bodyConfig.type !== this.type) ||
      (bodyConfig.disableCollision &&
        bodyConfig.disableCollision !== this.disableCollision)
    ) {
      if (bodyConfig.type) this.type = bodyConfig.type;
      if (bodyConfig.disableCollision)
        this.disableCollision = bodyConfig.disableCollision;
      this.updateCollisionFlags();
    }

    if (
      bodyConfig.activationState &&
      bodyConfig.activationState !== this.activationState
    ) {
      this.activationState = bodyConfig.activationState;
      this.physicsBody!.forceActivationState(this.activationState);
      if (this.activationState === BodyActivationState.ACTIVE_TAG) {
        this.physicsBody!.activate(true);
      }
    }

    if (
      (bodyConfig.collisionFilterGroup &&
        bodyConfig.collisionFilterGroup !== this.collisionFilterGroup) ||
      (bodyConfig.collisionFilterMask &&
        bodyConfig.collisionFilterMask !== this.collisionFilterMask)
    ) {
      if (bodyConfig.collisionFilterGroup)
        this.collisionFilterGroup = bodyConfig.collisionFilterGroup;
      if (bodyConfig.collisionFilterMask)
        this.collisionFilterMask = bodyConfig.collisionFilterMask;
      const broadphaseProxy = this.physicsBody!.getBroadphaseProxy();
      broadphaseProxy.set_m_collisionFilterGroup(this.collisionFilterGroup);
      broadphaseProxy.set_m_collisionFilterMask(this.collisionFilterMask);
      this.world.broadphase
        .getOverlappingPairCache()
        // @ts-ignore
        .removeOverlappingPairsContainingProxy(
          broadphaseProxy,
          this.world.dispatcher
        );
    }

    if (
      (bodyConfig.linearDamping &&
        bodyConfig.linearDamping != this.linearDamping) ||
      (bodyConfig.angularDamping &&
        bodyConfig.angularDamping != this.angularDamping)
    ) {
      if (bodyConfig.linearDamping)
        this.linearDamping = bodyConfig.linearDamping;
      if (bodyConfig.angularDamping)
        this.angularDamping = bodyConfig.angularDamping;
      this.physicsBody!.setDamping(this.linearDamping, this.angularDamping);
    }

    if (bodyConfig.gravity) {
      this.gravity.setValue(
        bodyConfig.gravity.x,
        bodyConfig.gravity.y,
        bodyConfig.gravity.z
      );
      if (
        !almostEqualsBtVector3(
          0.001,
          this.gravity,
          this.physicsBody!.getGravity()
        )
      ) {
        if (
          !almostEqualsBtVector3(
            0.001,
            this.gravity,
            this.world.physicsWorld.getGravity()
          )
        ) {
          this.physicsBody.setFlags(RigidBodyFlags.DISABLE_WORLD_GRAVITY);
        } else {
          this.physicsBody.setFlags(RigidBodyFlags.NONE);
        }
        this.physicsBody!.setGravity(this.gravity);
      }
    }

    if (
      (bodyConfig.linearSleepingThreshold &&
        bodyConfig.linearSleepingThreshold != this.linearSleepingThreshold) ||
      (bodyConfig.angularSleepingThreshold &&
        bodyConfig.angularSleepingThreshold != this.angularSleepingThreshold)
    ) {
      if (bodyConfig.linearSleepingThreshold)
        this.linearSleepingThreshold = bodyConfig.linearSleepingThreshold;
      if (bodyConfig.angularSleepingThreshold)
        this.angularSleepingThreshold = bodyConfig.angularSleepingThreshold;
      this.physicsBody.setSleepingThresholds(
        this.linearSleepingThreshold,
        this.angularSleepingThreshold
      );
    }

    if (
      bodyConfig.angularFactor &&
      !almostEqualsVector3(0.001, bodyConfig.angularFactor, this.angularFactor)
    ) {
      this.angularFactor.copy(bodyConfig.angularFactor);
      const angularFactor = new Ammo.btVector3(
        this.angularFactor.x,
        this.angularFactor.y,
        this.angularFactor.z
      );
      this.physicsBody.setAngularFactor(angularFactor);
      Ammo.destroy(angularFactor);
    }

    //TODO: support dynamic update for other properties
  }

  /**
   * Removes the component and all physics and scene side effects.
   */
  destroy() {
    if (this.triMesh) Ammo.destroy(this.triMesh);
    if (this.localScaling) Ammo.destroy(this.localScaling);

    this.physicsShape.destroy();

    this.world.removeRigidBody(this.physicsBody);
    Ammo.destroy(this.physicsBody);
    delete (this as any).physicsBody;
    Ammo.destroy(this.rbInfo);
    Ammo.destroy(this.msTransform);
    Ammo.destroy(this.motionState);
    Ammo.destroy(this.localInertia);
    Ammo.destroy(this.rotation);
    Ammo.destroy(this.gravity);
    Ammo.destroy(this.tmpVec);
    Ammo.destroy(this.tmpTransform1);
    Ammo.destroy(this.tmpTransform2);
  }

  /**
   * Updates the rigid body's position, velocity, and rotation, based on the scene.
   */
  syncToPhysics(setCenterOfMassTransform: boolean = false) {
    const body = this.physicsBody;
    if (!body) return;

    this.motionState!.getWorldTransform(this.msTransform!);

    this.matrix.decompose(pos, quat, scale);

    const position = this.msTransform!.getOrigin();
    v.set(position.x(), position.y(), position.z());

    const quaternion = this.msTransform!.getRotation();
    q.set(quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w());

    console.log(v, pos);

    if (
      !almostEqualsVector3(0.001, pos, v) ||
      !almostEqualsQuaternion(0.001, quat, q)
    ) {
      if (!this.physicsBody!.isActive()) {
        this.physicsBody!.activate(true);
      }
      this.msTransform!.getOrigin().setValue(pos.x, pos.y, pos.z);
      this.rotation!.setValue(quat.x, quat.y, quat.z, quat.w);
      this.msTransform!.setRotation(this.rotation!);
      this.motionState!.setWorldTransform(this.msTransform!);

      if (this.type === BodyType.STATIC || setCenterOfMassTransform) {
        this.physicsBody!.setCenterOfMassTransform(this.msTransform!);
      }
    }
  }

  /**
   * Updates the scene object's position and rotation, based on the physics simulation.
   */
  syncFromPhysics() {
    const graphicsTransform = this.motionState!.get_m_graphicsWorldTrans();
    const position = graphicsTransform.getOrigin();
    const quaternion = graphicsTransform.getRotation();

    if (!this.physicsBody) return;

    this.matrix.decompose(pos, quat, scale);
    pos.set(position.x(), position.y(), position.z());
    quat.set(quaternion.x(), quaternion.y(), quaternion.z(), quaternion.w());
    this.matrix.compose(pos, quat, scale);
  }

  setShapesOffset(offset: SerializedVector3) {
    this.tmpVec.setValue(-offset.x, -offset.y, -offset.z);

    this.physicsShape.localTransform.setOrigin(this.tmpVec);
  }

  updateMass() {
    const mass = this.type === BodyType.STATIC ? 0 : this.mass;
    this.physicsShape.calculateLocalInertia(mass, this.localInertia!);
    this.physicsBody.setMassProps(mass, this.localInertia!);
    this.physicsBody.updateInertiaTensor();
  }

  updateCollisionFlags() {
    let flags = this.disableCollision ? 4 : 0;
    switch (this.type) {
      case BodyType.STATIC:
        flags |= CollisionFlag.STATIC_OBJECT;
        break;
      case BodyType.KINEMATIC:
        flags |= CollisionFlag.KINEMATIC_OBJECT;
        break;
      default:
        this.physicsBody!.applyGravity();
        break;
    }

    if (this.physicsShape.type === ShapeType.MESH) {
      // Enables callback to improve internal-edge collisions
      flags |= CollisionFlag.CUSTOM_MATERIAL_CALLBACK;
    }

    this.physicsBody!.setCollisionFlags(flags);

    this.updateMass();

    if (this.enableCCD) {
      this.physicsBody!.setCcdMotionThreshold(this.ccdMotionThreshold);
      this.physicsBody!.setCcdSweptSphereRadius(this.ccdSweptSphereRadius);
    }

    this.world.updateRigidBody(this.physicsBody);
  }

  getVelocity() {
    return this.physicsBody!.getLinearVelocity();
  }
}
