import { MathUtils, Mesh, Object3D } from "three";
import React, { DependencyList, MutableRefObject, Ref, useEffect, useRef, useState } from "react";
import { useAmmoPhysicsContext } from "../physics-context";
import { SoftBodyAnchorRef, SoftBodyConfig } from "../../three-ammo/lib/types";
import { createSoftbodyApi, SoftbodyApi } from "../api/softbody-api";
import { isSoftBodyRigidBodyAnchorRef } from "../../three-ammo/worker/utils";
import { useForwardedRef } from "../../utils/useForwardedRef";

type UseSoftBodyOptions = Omit<SoftBodyConfig, "anchors"> & {
  anchors?: SoftBodyAnchorRef[];
};

export function useSoftBody(
  options: UseSoftBodyOptions | (() => UseSoftBodyOptions),
  mesh?: Mesh,
  fwdRef?: Ref<Mesh>,
  deps: DependencyList = []
): [MutableRefObject<Mesh | null>, SoftbodyApi] {
  const ref = useForwardedRef<Mesh>(fwdRef);

  const physicsContext = useAmmoPhysicsContext();
  const { addSoftBody, removeSoftBody } = physicsContext;

  const [bodyUUID] = useState(() => MathUtils.generateUUID());

  useEffect(() => {
    const meshToUse = mesh ? mesh : ref.current!;

    if (typeof options === "function") {
      options = options();
    }

    const { anchors, ...rest } = options;

    if (!meshToUse) {
      throw new Error("useSoftBody ref does not contain a mesh");
    }

    addSoftBody(bodyUUID, meshToUse, {
      anchors:
        anchors &&
        anchors.map((anchor) => {
          if (isSoftBodyRigidBodyAnchorRef(anchor)) {
            const { rigidBodyRef, ...anchorProps } = anchor;

            return {
              ...anchorProps,
              rigidBodyUUID:
                anchor.rigidBodyRef.current?.userData?.useAmmo?.rigidBody?.uuid,
            };
          }
          return anchor;
        }),
      ...rest,
    });

    return () => {
      removeSoftBody(bodyUUID);
    };
  }, deps);

  return [ref, createSoftbodyApi(physicsContext, bodyUUID)];
}
