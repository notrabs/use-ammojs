import { MathUtils, Mesh, Object3D } from "three";
import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import { useAmmoPhysicsContext } from "../physics-context";
import { SoftBodyConfig } from "../../three-ammo/lib/types";
import { createSoftbodyApi, SoftbodyApi } from "../api/softbody-api";

type UseSoftBodyOptions = SoftBodyConfig & {
  mesh: Mesh;
};

export function useSoftBody(
  options: UseSoftBodyOptions | (() => UseSoftBodyOptions),
  object3D?: Object3D
): [MutableRefObject<Object3D | undefined>, SoftbodyApi] {
  const ref = useRef<Object3D>();

  const physicsContext = useAmmoPhysicsContext();
  const { addSoftBody, removeSoftBody } = physicsContext;

  const [bodyUUID] = useState(() => MathUtils.generateUUID());

  useEffect(() => {
    const objectToUse = object3D ? object3D : ref.current!;

    if (typeof options === "function") {
      options = options();
    }

    const { mesh, ...rest } = options;

    const meshToUse = mesh ? mesh : objectToUse;

    addSoftBody(bodyUUID, objectToUse, {
      ...rest,
    });

    return () => {
      removeSoftBody(bodyUUID);
    };
  }, []);

  return [ref, createSoftbodyApi(physicsContext, bodyUUID)];
}
