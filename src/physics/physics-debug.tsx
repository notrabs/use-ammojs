import React from "react";
import { BufferGeometry } from "three";

interface PhysicsDebugProps {
  geometry: BufferGeometry;
}

export function PhysicsDebug({ geometry }: PhysicsDebugProps) {
  return (
    <lineSegments geometry={geometry} frustumCulled={false} renderOrder={999}>
      <lineBasicMaterial
        attach="material"
        vertexColors={true}
        depthTest={true}
      />
    </lineSegments>
  );
}
