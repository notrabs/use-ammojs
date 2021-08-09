import { useEffect, useRef, useState } from "react";
import Stats from "stats.js";
import { useAmmoPhysicsContext } from "../physics-context";
import { useFrame } from "@react-three/fiber";

export function PhysicsStats() {
  const { physicsPerformanceInfoRef } = useAmmoPhysicsContext();

  const lastTickTimeRef = useRef(0);

  const [physicsPanel] = useState(() => {
    return new Stats.Panel("Physics (ms)", "#f8f", "#212");
  });

  const [stats] = useState(() => {
    const stats = new Stats();

    stats.addPanel(physicsPanel);
    stats.showPanel(3);

    stats.dom.style.pointerEvents = "none";

    return stats;
  });

  useEffect(() => {
    document.body.appendChild(stats.dom);

    return () => {
      document.body.removeChild(stats.dom);
    };
  }, []);

  useFrame(() => {
    if (
      lastTickTimeRef.current !== physicsPerformanceInfoRef.current.lastTickTime
    ) {
      lastTickTimeRef.current = physicsPerformanceInfoRef.current.lastTickTime;

      if (physicsPerformanceInfoRef.current.lastTickMs > 0) {
        physicsPanel.update(physicsPerformanceInfoRef.current.lastTickMs, 16);
      }
    }
  });

  return null;
}
