import { useAmmoPhysicsContext } from "../physics-context";
import { useMemo } from "react";

export function useAmmo() {
  const { rayTest } = useAmmoPhysicsContext();

  return useMemo(() => ({ rayTest }), [rayTest]);
}
