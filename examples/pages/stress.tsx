import React, { Suspense, useEffect } from 'react'
import Head from 'next/head'
import { Box, OrbitControls, Stage, Stats, Text } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { BodyType, Physics, PhysicsStats, ShapeType, useRigidBody, UseRigidBodyOptions } from 'use-ammojs'

const CUBE_ARRAY_SIZE = 5
const CUBE_ARRAY_HEIGHT = 100
const CUBE_ARRAY_SIZE_SQ = CUBE_ARRAY_SIZE * CUBE_ARRAY_SIZE

function StressDemo() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.y = 5
  }, [camera])

  return (
    <>
      <Stage adjustCamera={false} shadows preset="soft" />
      <OrbitControls />
      <directionalLight intensity={0.6} position={[20, 40, 50]} castShadow />
      <group position={[0, 5, 5]} scale={[0.1, 0.1, 0.1]}>
        <Text color="black" fontSize={12}>
          {CUBE_ARRAY_SIZE_SQ * CUBE_ARRAY_HEIGHT} Boxes
        </Text>
      </group>
      <Physics>
        {Array(CUBE_ARRAY_SIZE_SQ * CUBE_ARRAY_HEIGHT)
          .fill(null)
          .map((_, index) => {
            const x = ((index % CUBE_ARRAY_SIZE) - CUBE_ARRAY_SIZE / 2) * 2
            const y = Math.floor(index / CUBE_ARRAY_SIZE_SQ) * 2 + 2
            const z = (Math.floor((index % CUBE_ARRAY_SIZE_SQ) / CUBE_ARRAY_SIZE) - CUBE_ARRAY_SIZE / 2) * 2

            return <PhysicalBox key={index} position={[x, y, z]} />
          })}
        <Ground />
        <Stats />
        <PhysicsStats top={48} />
      </Physics>
    </>
  )
}

function PhysicalBox(props: Pick<UseRigidBodyOptions, 'position' | 'rotation'> = {}) {
  const [ref] = useRigidBody(() => ({
    bodyType: BodyType.DYNAMIC,
    shapeType: ShapeType.BOX,
    ...props,
  }))

  return (
    <Box ref={ref} castShadow>
      <meshPhysicalMaterial attach="material" color="red" />
    </Box>
  )
}

function Ground() {
  const [groundRef] = useRigidBody(() => ({
    bodyType: BodyType.STATIC,
    shapeType: ShapeType.BOX
  }))

  return (
    <Box ref={groundRef} args={[20, 0.1, 20]} receiveShadow>
      <meshPhysicalMaterial attach="material" color="grey" />
    </Box>
  )
}

const StressPage = () => (<>
  <Head>
    <title>Stress Demo: Use-Ammo.js</title>
  </Head>
  <div
    id="root"
    style={{ width: "100%", height: "100%", margin: 0, padding: 0 }}
  >
    <Canvas shadows camera={{ position: [0, 20, 15] }}>
      <Suspense fallback={null}>
        <Stage adjustCamera={false} shadows preset="soft" />
        <OrbitControls />
        <directionalLight intensity={0.6} position={[20, 40, 50]} castShadow />
        <StressDemo />
      </Suspense>
    </Canvas>
  </div>
</>);

export default StressPage;
