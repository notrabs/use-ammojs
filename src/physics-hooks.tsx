import { MathUtils, Object3D } from "three";
import React, { useEffect, useRef } from "react";
import {
  BodyOptions,
  ShapeType,
  useAmmoPhysicsContext
} from "./physics-context";

export function usePhysics(
  optionsFn: () => BodyOptions & {
    shapeType: ShapeType;
    position?: [number, number, number];
  },
  object3D?: Object3D
) {
  const ref = useRef<Object3D>();

  const { addBody, addShapes, removeBody } = useAmmoPhysicsContext();

  useEffect(() => {
    const bodyUUID = MathUtils.generateUUID();
    const shapesUUID = MathUtils.generateUUID();

    const objectToUse = object3D ? object3D : ref.current!;

    const { shapeType, position, ...rest } = optionsFn();

    if (position) {
      objectToUse.position.set(position[0], position[1], position[2]);
      objectToUse.updateMatrixWorld();
    }

    addBody(bodyUUID, objectToUse, rest);

    const meshToUse = objectToUse;

    addShapes(bodyUUID, shapesUUID, meshToUse, { type: shapeType });

    return () => {
      removeBody(bodyUUID);
    };
  }, []);

  return ref;
}
