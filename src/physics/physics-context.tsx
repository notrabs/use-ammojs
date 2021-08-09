import { createContext, MutableRefObject, useContext } from "react";
import { BufferGeometry, Mesh, Object3D, Quaternion, Vector3 } from "three";
import {
  BodyConfig,
  ConstraintType,
  RaycastOptions,
  ShapeConfig,
  SharedBuffers,
  SoftBodyConfig,
  UpdateBodyOptions,
  UUID,
} from "../three-ammo/lib/types";
import { WorkerHelpers } from "../three-ammo/lib/worker-helper";

export interface ConstraintOptions {
  type: ConstraintType;

  pivot?: Vector3;
  targetPivot?: Vector3;

  axis?: Vector3;
  targetAxis?: Vector3;
}

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
  addRigidBody(uuid: UUID, mesh: Object3D, options?: BodyConfig);
  removeRigidBody(uuid: UUID);
  addSoftBody(uuid: UUID, mesh: Object3D, options?: SoftBodyConfig);
  removeSoftBody(uuid: UUID);
  rayTest(options: RaycastOptions);
}

export interface PhysicsPerformanceInfo {
  lastTickMs: number;
  lastTickTime: number;
}

export interface AmmoPhysicsContext {
  addRigidBody(uuid: UUID, mesh: Object3D, options?: BodyConfig);
  removeRigidBody(uuid: UUID);

  addShapes(
    bodyUuid: UUID,
    shapesUuid: UUID,
    mesh: Object3D,
    options?: ShapeConfig
  );
  removeShapes(bodyUuid: UUID, shapesUuid: UUID);

  addSoftBody(uuid: UUID, mesh: Object3D, options?: SoftBodyConfig);
  removeSoftBody(uuid: string);

  addConstraint(
    constraintId: string,
    bodyUuid: string,
    targetUuid: string,
    options?: ConstraintOptions
  );
  removeConstraint(constraintId: string);

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

  rayTest(options: RaycastOptions);

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
