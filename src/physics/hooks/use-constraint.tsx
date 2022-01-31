import { MutableRefObject, useEffect, useState, DependencyList } from "react";
import { useAmmoPhysicsContext } from "../physics-context";
import { MathUtils, Object3D } from "three";
import {
  CommonConstraintConfig,
  SingleBodyConstraintConfig,
  TwoBodyConstraintConfig,
  UUID,
} from "../../three-ammo/lib/types";
import { ConstraintApi, createConstraintApi } from "../api/constraint-api";

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
    SingleBodyConstraintConfig,
  deps: DependencyList = []
) {
  return useConstraint(props, deps);
}

export function useTwoBodyConstraint(
  props: CommonConstraintConfig &
    TwoBodyConstraintRefs &
    TwoBodyConstraintConfig,
  deps: DependencyList = []
) {
  return useConstraint(props, deps);
}

type UseConstraintReturn = [
  MutableRefObject<Object3D | undefined> | undefined,
  MutableRefObject<Object3D | undefined> | undefined,
  ConstraintApi,
];

export function useConstraint(props: UseConstraintProps, deps: DependencyList = []): UseConstraintReturn {
  const physicsContext = useAmmoPhysicsContext();
  const {
    addConstraint,
    updateConstraint,
    removeConstraint,
  } = physicsContext;

  const [constraintId] = useState(() => MathUtils.generateUUID());

  const allDeps = [props.bodyARef.current, props.bodyBRef?.current].concat(deps)

  useEffect(() => {
    const uuidA: UUID | undefined =
      props.bodyARef.current?.userData?.useAmmo?.rigidBody?.uuid;
    const uuidB: UUID | undefined =
      props.bodyBRef?.current?.userData?.useAmmo?.rigidBody?.uuid;

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
  }, allDeps);

  return [
    props.bodyARef,
    props.bodyBRef,
    createConstraintApi(physicsContext, constraintId, props.type),
  ];
}
