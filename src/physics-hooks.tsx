import { MathUtils, Mesh, Object3D } from "three";
import React, { useEffect, useRef } from "react";
import { BodyOptions, useAmmoPhysicsContext } from "./physics-context";

export function usePhysicsMesh(
  options: () => BodyOptions & { position?: [number, number, number] },
  mesh?: Mesh
) {
  const ref = useRef<Object3D>();

  const { addBody, removeBody } = useAmmoPhysicsContext();

  useEffect(() => {
    const uuid = MathUtils.generateUUID();

    const meshToUse = mesh ? mesh : ref.current!;

    const { position, ...rest } = options();

    if (position) {
      meshToUse.position.set(position[0], position[1], position[2]);
    }

    addBody(uuid, meshToUse, rest);

    return () => {
      removeBody(uuid);
    };
  }, []);

  return ref;
}
