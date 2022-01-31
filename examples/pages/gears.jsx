import * as THREE from 'three'
import React, { Suspense, useEffect, forwardRef, useMemo, useRef } from 'react'
import ReactDOM from 'react-dom'
// import { BodyType, PhysicsStats, ShapeType, usePhysics, useRigidBody } from 'use-ammojs'
import { Box, OrbitControls, Stage, Stats } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import dynamic from 'next/dynamic'
import Head from 'next/head';

// import { gear } from './gear'
// import { CSG2Geom as csgToGeometry } from './csg-2-geo'

// import { Demo } from '../components/Demo';

const Demo = dynamic(() => import('../components/GearsDemo').then(mod => mod.Demo), {
  ssr: false
});

/*
const Gear = dynamic(() => import('../components/Gear').then(mod => mod.Gear), {
  ssr: false
})

const Physics = dynamic(() => import('use-ammojs').then(mod => mod.Physics), {
  ssr: false
})

function Demo() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(4, 3, 4)
  }, [camera])

  return (
    <Physics>
      <Ground />
      <Gear position={[0, 10, 0]} />
      <Gear position={[0, 20, 0]} />
      {Array(10)
        .fill(null)
        .map((_, index) => {
          return <PhysicalBox key={index} position={[Math.random() / 2, 5 + index * 2, 0]} />
        })}
      <Stats />
      <PhysicsStats top={48} />
    </Physics>
  )
}

function PhysicalBox({ position } = {}) {
  const [ref] = usePhysics(() => ({
    bodyType: BodyType.DYNAMIC,
    shapeType: ShapeType.BOX,
    position
  }))

  return (
    <Box ref={ref} castShadow>
      <meshPhysicalMaterial attach="material" color="red" />
    </Box>
  )
}

function Ground() {
  const [groundRef] = usePhysics(() => ({
    bodyType: BodyType.STATIC,
    shapeType: ShapeType.BOX
  }))

  return (
    <Box ref={groundRef} args={[20, 0.1, 20]} receiveShadow>
      <meshPhysicalMaterial attach="material" color="grey" />
    </Box>
  )
}
*/

function Loading() {
  return null;
}

const Gears = () => (
<>
<Head>
  <title>Gears Demo: Use-Ammo.js</title>
</Head>
<div id="root" style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}>
  <Canvas shadows>
    <Suspense fallback={<Loading />}>
      <Stage adjustCamera={false} shadows preset="soft" />
      <OrbitControls />
      <directionalLight intensity={0.6} position={[20, 40, 50]} castShadow />
      <Demo />
    </Suspense>
  </Canvas>
</div>
</>
);

export default Gears;
