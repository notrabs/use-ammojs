// import * as THREE from 'three'
import React, { Suspense, useEffect, forwardRef, useMemo, useRef } from 'react'
// import ReactDOM from 'react-dom'
import { BodyType, Physics, PhysicsStats, ShapeType, SoftBodyType, usePhysics, useRigidBody, useSingleBodyConstraint, useSoftBody } from 'use-ammojs'
// import { Box, OrbitControls, Stage, Stats } from '@react-three/drei'
// import { Canvas, useThree } from '@react-three/fiber'

import { gear } from './gear'
import { CSG2Geom as csgToGeometry } from './csg-2-geo'

export const Gear = React.forwardRef((props, ref) => {
  const options = {
    numTeeth: 10,
    circularPitch: 0.5,
    pressureAngle: 20,
    clearance: 0,
    thickness: 0.25,
    centerholeradius: 0.125,
    ...props,
  }

  const csgGeometry = useMemo(() => csgToGeometry(gear(options)), [JSON.stringify(options)])

  const [groupRef] = useRigidBody(() => ({
    bodyType: BodyType.DYNAMIC,
    mass: 1,
    shapeType: ShapeType.VHACD,
    enableCCD: true,
    shapeConfig: {
      type: ShapeType.VHACD,
      pca: 1,
      // resolution: 1000000, // 1000000
      depth: 5, // 20
      // nClusters: 1,
      // nVerticesPerCH: 10,
      concavity: 0.01, //0.005, //0.01,
      // volumeWeight: 0.1,
      // compacityWeight: 0.1,
      // maxNumVerticesPerCH: 10,
    },
    ...props
  }), null, ref);

  return (
    <mesh geometry={csgGeometry} ref={groupRef}>
      <meshNormalMaterial attach="material" color="red" />
    </mesh>
  )
})

/*
function createGear(center, radius, thickness, lm) {

  lm = lm || null;

  let toothInterval = 0.4;
  let toothLength = toothInterval / 1.5;
  let numTeeth = Math.round( ( Math.PI * 2 ) * radius / toothInterval) + 1;
  if (numTeeth % 2 == 0) numTeeth--;
  if (numTeeth < 2) numTeeth = 2;

  let toothVertices = createGearTooth(toothLength / 2, thickness * 0.5, toothInterval / 3, radius - toothLength / 4 );

  let r = 360 / numTeeth;
  let shapes = [];

  shapes.push( { type:'cylinder', size: [ radius - toothLength / 2, (thickness * 0.48)*2] })

  let i = numTeeth;
  while(i--){
      shapes.push( { type:'convex', v:toothVertices, rot:[0, r * i, 0 ], margin:0, restitution:0 });
  }

  let g = phy.add({ type:'compound', shapes:shapes, pos:center, density:1, restitution:0, rot:[-90,0,0] });//, canSleep:false
  let f = phy.add({ type:'cylinder', size:[ toothInterval / 4, (thickness * 0.52)*2 ], pos:center, density:0, rot:[-90,0,0] });

  phy.add({ type:'joint', b1:g.name, b2:f.name, worldAnchor:center, worldAxis:[0,0,1], motor:lm });

}

function createGearTooth( hw, hh, hd, x ) {

  var scale = 0.3;
  return [
      x-hw, -hh, -hd,
      x-hw, -hh, hd,
      x-hw, hh, -hd,
      x-hw, hh, hd,
      x+hw, -hh, -hd * scale,
      x+hw, -hh, hd * scale,
      x+hw, hh, -hd * scale,
      x+hw, hh, hd * scale
  ];
  
}
*/