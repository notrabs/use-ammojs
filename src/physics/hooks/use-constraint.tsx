import { MutableRefObject, useEffect, useState } from "react";
import { useAmmoPhysicsContext } from "../physics-context";
import { MathUtils, Object3D } from "three";
import {
  CommonConstraintConfig,
  SingleBodyConstraintConfig,
  TwoBodyConstraintConfig,
  UUID,
} from "../../three-ammo/lib/types";

type UseConstraintProps = CommonConstraintConfig &
  (
    | ({
        bodyARef: MutableRefObject<Object3D>;
        bodyBRef: undefined;
      } & SingleBodyConstraintConfig)
    | ({
        bodyARef: MutableRefObject<Object3D>;
        bodyBRef: MutableRefObject<Object3D>;
      } & TwoBodyConstraintConfig)
  );

export function useConstraint(props: UseConstraintProps) {
  const {
    addConstraint,
    updateConstraint,
    removeConstraint,
  } = useAmmoPhysicsContext();

  const [constraintId] = useState(() => MathUtils.generateUUID());

  const uuidA: UUID | undefined =
    props.bodyARef.current?.userData?.useAmmo?.rigidBody?.uuid;
  const uuidB: UUID | undefined =
    props.bodyARef.current?.userData?.useAmmo?.uuid;

  useEffect(() => {
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
  }, [uuidA, uuidB]);
}
