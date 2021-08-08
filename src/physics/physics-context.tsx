import { createContext, MutableRefObject, useContext } from "react";
import { BufferGeometry, Mesh, Object3D, Vector3, Quaternion } from "three";
import {
  BodyConfig,
  ConstraintType,
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
}

export interface AmmoPhysicsContext {
  addRigidBody(uuid: string, mesh: Object3D, options?: BodyConfig);
  removeRigidBody(uuid: string);

  addShapes(
    bodyUuid: string,
    shapesUuid: string,
    mesh: Object3D,
    options?: ShapeConfig
  );
  removeShapes(bodyUuid: string, shapesUuid: string);

  addSoftBody(uuid: string, mesh: Object3D, options?: SoftBodyConfig);
  removeSoftBody(uuid: string);

  addConstraint(
    constraintId: string,
    bodyUuid: string,
    targetUuid: string,
    options?: ConstraintOptions
  );
  removeConstraint(constraintId: string);

  updateRigidBody(uuid: string, options: UpdateBodyOptions);

  enableDebug(enable: boolean, debugSharedArrayBuffer: SharedArrayBuffer);

  resetDynamicBody(uuid: string);

  activateBody(uuid: string);

  bodySetMotionState(uuid: string, position?: Vector3, rotation?: Quaternion);
  bodySetLinearVelocity(uuid: string, velocity: Vector3);
  bodyApplyImpulse(uuid: string, impulse: Vector3, relativeOffset?: Vector3);
  bodyApplyForce(uuid: string, force: Vector3, relativeOffset?: Vector3);

  // Applies an (local) offset to all shapes of the rigidbody, without moving its origin
  bodySetShapesOffset(uuid: string, offset: Vector3);

  object3Ds: Record<string, Object3D>;
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
