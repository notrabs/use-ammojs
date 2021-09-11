import { useEffect, useRef, useState } from "react";
import Stats from "stats.js";
import { useAmmoPhysicsContext } from "../physics-context";
import { useFrame } from "@react-three/fiber";

interface PhysicsStatsProps {
  top?: number | string;
  left?: number | string;
  bottom?: number | string;
  right?: number | string;
}

export function PhysicsStats({
  top = 0,
  left = 0,
  right = "auto",
  bottom = "auto",
}: PhysicsStatsProps) {
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

  useEffect(() => {
    stats.dom.style.top = typeof top === "number" ? top + "px" : top;
    stats.dom.style.left = typeof left === "number" ? left + "px" : left;
    stats.dom.style.right = typeof right === "number" ? right + "px" : right;
    stats.dom.style.bottom =
      typeof bottom === "number" ? bottom + "px" : bottom;
  }, [top, left, right, bottom]);

  useFrame(() => {
    if (
      lastTickTimeRef.current !==
      physicsPerformanceInfoRef.current.substepCounter
    ) {
      lastTickTimeRef.current =
        physicsPerformanceInfoRef.current.substepCounter;

      if (physicsPerformanceInfoRef.current.lastTickMs > 0) {
        physicsPanel.update(physicsPerformanceInfoRef.current.lastTickMs, 16);
      }
    }
  });

  return null;
}
