import { MathUtils, Object3D, Mesh } from "three";
import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import {
  BodyConfig,
  BodyType,
  ShapeConfig,
  ShapeType,
  useAmmoPhysicsContext
} from "./physics-context";
import { createPhysicsApi, PhysicsApi } from "./physics-api";

type UsePhysicsOptions = Omit<BodyConfig, "type"> & {
  shapeType: ShapeType;
  bodyType?: BodyType;

  // Overrides the physics shape. If not defined the referenced object3Ds mesh will be used. Origins must match.
  mesh?: Object3D;

  // use for manual overrides with the physics shape.
  shapeConfig?: Omit<ShapeConfig, "type">;

  position?: [number, number, number];
};

export function usePhysics(
  options: UsePhysicsOptions | (() => UsePhysicsOptions),
  object3D?: Object3D
): [MutableRefObject<Object3D>, PhysicsApi] {
  const ref = useRef<Object3D>();

  const physicsContext = useAmmoPhysicsContext();
  const { addBody, addShapes, removeBody } = physicsContext;

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

    addBody(bodyUUID, objectToUse, { type: bodyType, ...rest });

    const meshToUse = mesh ? mesh : objectToUse;

    addShapes(bodyUUID, shapesUUID, meshToUse, {
      type: shapeType,
      ...shapeConfig
    });

    return () => {
      removeBody(bodyUUID);
    };
  }, []);

  return [ref, createPhysicsApi(physicsContext, bodyUUID, shapesUUID)];
}
