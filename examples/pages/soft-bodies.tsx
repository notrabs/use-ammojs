import React, { Fragment, Suspense, useEffect } from 'react'
import { BodyType, Physics, ShapeType, SoftBodyType, useSoftBody, PhysicsStats, useRigidBody } from 'use-ammojs'
import { Sphere, Box, OrbitControls, Stage, Text, Stats } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import Head from 'next/head'

function Demo() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(0, 5, 15)
  }, [camera])

  return (
    <>
      <Stage adjustCamera={false} shadows preset="soft" />
      <OrbitControls />
      <directionalLight intensity={0.6} position={[20, 40, 50]} castShadow />

      <Physics>
        {Array(10)
          .fill(null)
          .map((_, index) => {
            const position = [index * 2 - 10, 2, 0]
            const pressure = index * 1 + 0.5

            return (
              <Fragment key={index}>
                <PhysicalBall key={index} position={position} pressure={pressure} />
                <Text color="black" position={position}>
                  Pressure: {pressure}
                </Text>
              </Fragment>
            )
          })}
        <Ground />
        <Stats />
        <PhysicsStats top={48} />
      </Physics>
    </>
  )
}

function PhysicalBall({ position, pressure } = {}) {
  const [ref] = useSoftBody(() => ({
    type: SoftBodyType.TRIMESH,
    pressure
  }))

  return (
    <Sphere args={[0.5, 16, 16]} position={position} ref={ref} castShadow>
      <meshPhysicalMaterial attach="material" color="red" />
    </Sphere>
  )
}

function Ground() {
  const [groundRef] = useRigidBody(() => ({
    bodyType: BodyType.STATIC,
    shapeType: ShapeType.BOX
  }))

  return (
    <Box ref={groundRef} args={[25, 0.1, 25]} receiveShadow>
      <meshPhysicalMaterial attach="material" color="grey" />
    </Box>
  )
}

const SoftBodies = () => (
<>
  <Head>
    <title>Soft Bodies Demo: Use-Ammo.js</title>
  </Head>
  <Canvas shadows>
    <Suspense fallback={null}>
      <Demo />
    </Suspense>
  </Canvas>
</>
)

export default SoftBodies;
