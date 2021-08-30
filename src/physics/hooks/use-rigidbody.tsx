import { MathUtils, Object3D } from "three";
import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import { useAmmoPhysicsContext } from "../physics-context";
import {
  BodyConfig,
  BodyType,
  ShapeConfig,
  ShapeType,
} from "../../three-ammo/lib/types";
import { createRigidBodyApi, RigidbodyApi } from "../api/rigidbody-api";

type UseRigidBodyOptions = Omit<BodyConfig, "type"> & {
  shapeType: ShapeType;
  bodyType?: BodyType;

  // Overrides the physics shape. If not defined the referenced object3Ds mesh will be used. Origins must match.
  mesh?: Object3D;

  // use for manual overrides with the physics shape.
  shapeConfig?: Omit<ShapeConfig, "type">;

  position?: [number, number, number];
};

export function useRigidBody(
  options: UseRigidBodyOptions | (() => UseRigidBodyOptions),
  object3D?: Object3D
): [MutableRefObject<Object3D | undefined>, RigidbodyApi] {
  const ref = useRef<Object3D>();

  const physicsContext = useAmmoPhysicsContext();
  const { addRigidBody, addShapes, removeRigidBody } = physicsContext;

  const [bodyUUID] = useState(() => MathUtils.generateUUID());
  const [shapesUUID] = useState(() => MathUtils.generateUUID());

  useEffect(() => {
    const objectToUse = object3D ? object3D : ref.current!;

    if (typeof options === "function") {
      options = options();
    }
    const {
      bodyType,
      shapeType,
      shapeConfig,
      position,
      mesh,
      ...rest
    } = options;

    if (position) {
      objectToUse.position.set(position[0], position[1], position[2]);
      objectToUse.updateMatrixWorld();
    }

    if (!objectToUse) {
      throw new Error("useRigidBody ref does not contain a object");
    }

    addRigidBody(bodyUUID, objectToUse, { type: bodyType, ...rest });

    const meshToUse = mesh ? mesh : objectToUse;

    addShapes(bodyUUID, shapesUUID, meshToUse, {
      type: shapeType,
      ...shapeConfig,
    });

    return () => {
      removeRigidBody(bodyUUID);
    };
  }, []);

  return [ref, createRigidBodyApi(physicsContext, bodyUUID, shapesUUID)];
}

/**
 * @deprecated use useRigidBody instead
 */
export const usePhysics = useRigidBody;
