import { MathUtils, Object3D } from "three";
import React, { useEffect, useRef, useState } from "react";
import {
  BodyOptions,
  BodyType,
  ShapeType,
  useAmmoPhysicsContext
} from "./physics-context";
import { createPhysicsApi } from "./physics-api";

type UsePhysicsOptions = Omit<BodyOptions, "type"> & {
  shapeType: ShapeType;
  bodyType?: BodyType;
  position?: [number, number, number];
};

export function usePhysics(
  options: UsePhysicsOptions | (() => UsePhysicsOptions),
  object3D?: Object3D
) {
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
    const { bodyType, shapeType, position, ...rest } = options;

    if (position) {
      objectToUse.position.set(position[0], position[1], position[2]);
      objectToUse.updateMatrixWorld();
    }

    addBody(bodyUUID, objectToUse, { type: bodyType, ...rest });

    const meshToUse = objectToUse;

    addShapes(bodyUUID, shapesUUID, meshToUse, { type: shapeType });

    return () => {
      removeBody(bodyUUID);
    };
  }, []);

  return [ref, createPhysicsApi(physicsContext, bodyUUID, shapesUUID)];
}
