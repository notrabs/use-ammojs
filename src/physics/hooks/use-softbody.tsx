import { MathUtils, Object3D , Mesh} from "three";
import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import { useAmmoPhysicsContext } from "../physics-context";
import { SoftBodyConfig } from "../../three-ammo/lib/types";
import { createSoftbodyApi, SoftbodyApi } from "../api/softbody-api";

type UseSoftBodyOptions = SoftBodyConfig & {};

export function useSoftBody(
  options: UseSoftBodyOptions | (() => UseSoftBodyOptions),
  mesh?: Mesh
): [MutableRefObject<Mesh | undefined>, SoftbodyApi] {
  const ref = useRef<Mesh>();

  const physicsContext = useAmmoPhysicsContext();
  const { addSoftBody, removeSoftBody } = physicsContext;

  const [bodyUUID] = useState(() => MathUtils.generateUUID());

  useEffect(() => {
    const meshToUse = mesh ? mesh : ref.current!;

    if (typeof options === "function") {
      options = options();
    }

    const { ...rest } = options;

    addSoftBody(bodyUUID, meshToUse, {
      ...rest,
    });

    return () => {
      removeSoftBody(bodyUUID);
    };
  }, []);

  return [ref, createSoftbodyApi(physicsContext, bodyUUID)];
}
