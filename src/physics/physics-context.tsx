import { createContext, MutableRefObject, useContext } from "react";
import { BufferGeometry, Mesh, Object3D, Quaternion, Vector3 } from "three";
import {
  BodyConfig,
  CommonConstraintConfig,
  DynamicConstraintConfig,
  RaycastHit,
  RaycastOptions,
  ShapeConfig,
  SharedBuffers,
  SingleBodyConstraintConfig,
  SoftBodyConfig,
  TwoBodyConstraintConfig,
  UpdateBodyOptions,
  UUID,
} from "../three-ammo/lib/types";
import { WorkerHelpers } from "../three-ammo/lib/worker-helper";

export interface PhysicsState {
  workerHelpers: ReturnType<typeof WorkerHelpers>;
  debugGeometry: BufferGeometry;
  debugBuffer: SharedArrayBuffer | ArrayBuffer;
  bodyOptions: Record<UUID, BodyConfig>;
  uuids: UUID[];
  object3Ds: Record<UUID, Object3D>;
  softBodies: Record<UUID, Mesh>;
  sharedBuffersRef: MutableRefObject<SharedBuffers>;
  uuidToIndex: Record<UUID, number>;
  debugIndex: Uint32Array;
  addRigidBody(
    uuid: UUID,
    mesh: Object3D,
    shape: ShapeDescriptor,
    options?: BodyConfig
  );
  removeRigidBody(uuid: UUID);
  addSoftBody(uuid: UUID, mesh: Object3D, options?: SoftBodyConfig);
  removeSoftBody(uuid: UUID);
  rayTest(options: RaycastOptions): Promise<RaycastHit[]>;
}

export interface PhysicsPerformanceInfo {
  lastTickMs: number;
  substepCounter: number;
}

export interface ShapeDescriptor {
  meshToUse: Object3D;
  shapeConfig?: ShapeConfig;
}

export interface AmmoPhysicsContext {
  addRigidBody(
    uuid: UUID,
    mesh: Object3D,
    shape: ShapeDescriptor,
    options?: BodyConfig
  );
  removeRigidBody(uuid: UUID);

  addSoftBody(uuid: UUID, mesh: Object3D, options?: SoftBodyConfig);
  removeSoftBody(uuid: string);

  addConstraint(
    constraintId: UUID,
    bodyUuid: UUID,
    targetUuid: undefined,
    options: SingleBodyConstraintConfig & CommonConstraintConfig
  );
  addConstraint(
    constraintId: UUID,
    bodyUuid: UUID,
    targetUuid: UUID,
    options: TwoBodyConstraintConfig & CommonConstraintConfig
  );
  updateConstraint(constraintId: UUID, options?: DynamicConstraintConfig);
  removeConstraint(constraintId: UUID);

  updateRigidBody(uuid: UUID, options: UpdateBodyOptions);

  enableDebug(enable: boolean, debugSharedArrayBuffer: SharedArrayBuffer);

  resetDynamicBody(uuid: UUID);

  activateBody(uuid: UUID);

  bodySetMotionState(uuid: UUID, position?: Vector3, rotation?: Quaternion);
  bodySetLinearVelocity(uuid: UUID, velocity: Vector3);
  bodyApplyImpulse(uuid: UUID, impulse: Vector3, relativeOffset?: Vector3);
  bodyApplyForce(uuid: UUID, force: Vector3, relativeOffset?: Vector3);

  // Applies an (local) offset to all shapes of the rigidbody, without moving its origin
  bodySetShapesOffset(uuid: string, offset: Vector3);

  object3Ds: Record<string, Object3D>;

  rayTest(options: RaycastOptions): Promise<RaycastHit[]>;

  physicsPerformanceInfoRef: MutableRefObject<PhysicsPerformanceInfo>;
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
