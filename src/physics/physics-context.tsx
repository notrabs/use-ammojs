import { createContext, useContext } from "react";
import { Quaternion, Vector3 } from "@react-three/fiber";
import { Object3D } from "three";
import {
  BodyConfig,
  ConstraintType,
  ShapeConfig,
  UpdateBodyOptions,
} from "../three-ammo/lib/types";

export interface ConstraintOptions {
  type: ConstraintType;

  pivot?: Vector3;
  targetPivot?: Vector3;

  axis?: Vector3;
  targetAxis?: Vector3;
}

export interface AmmoPhysicsContext {
  addBody(uuid: string, mesh: Object3D, options?: BodyConfig);
  removeBody(uuid: string);

  addShapes(
    bodyUuid: string,
    shapesUuid: string,
    mesh: Object3D,
    options?: ShapeConfig
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
