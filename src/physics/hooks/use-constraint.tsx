import { MutableRefObject, useEffect, useState } from "react";
import { useAmmoPhysicsContext } from "../physics-context";
import { MathUtils, Object3D } from "three";
import {
  CommonConstraintConfig,
  SingleBodyConstraintConfig,
  TwoBodyConstraintConfig,
  UUID,
} from "../../three-ammo/lib/types";

type SingleBodyConstraintRefs = {
  bodyARef: MutableRefObject<Object3D | undefined>;
  bodyBRef?: undefined;
};

type TwoBodyConstraintRefs = {
  bodyARef: MutableRefObject<Object3D | undefined>;
  bodyBRef: MutableRefObject<Object3D | undefined>;
};

type UseConstraintProps = CommonConstraintConfig &
  (
    | (SingleBodyConstraintRefs & SingleBodyConstraintConfig)
    | (TwoBodyConstraintRefs & TwoBodyConstraintConfig)
  );

export function useSingleBodyConstraint(
  props: CommonConstraintConfig &
    SingleBodyConstraintRefs &
    SingleBodyConstraintConfig
) {
  return useConstraint(props);
}

export function useTwoBodyConstraint(
  props: CommonConstraintConfig &
    TwoBodyConstraintRefs &
    TwoBodyConstraintConfig
) {
  return useConstraint(props);
}

export function useConstraint(props: UseConstraintProps) {
  const {
    addConstraint,
    updateConstraint,
    removeConstraint,
  } = useAmmoPhysicsContext();

  const [constraintId] = useState(() => MathUtils.generateUUID());

  useEffect(() => {
    const uuidA: UUID | undefined =
      props.bodyARef.current?.userData?.useAmmo?.rigidBody?.uuid;
    const uuidB: UUID | undefined =
      props.bodyARef.current?.userData?.useAmmo?.rigidBody?.uuid;

    if (props.bodyBRef === undefined && uuidA) {
      const { bodyARef, bodyBRef, ...constraintConfig } = props;

      addConstraint(
        constraintId,
        uuidA,
        undefined,
        constraintConfig as SingleBodyConstraintConfig
      );

      return () => {
        removeConstraint(constraintId);
      };
    } else if (uuidA && uuidB) {
      const { bodyARef, bodyBRef, ...constraintConfig } = props;

      addConstraint(
        constraintId,
        uuidA,
        uuidB,
        constraintConfig as TwoBodyConstraintConfig
      );

      return () => {
        removeConstraint(constraintId);
      };
    }

    return () => {};
  }, []);
}
