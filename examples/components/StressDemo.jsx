import React, { Suspense, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { BodyType, Physics, PhysicsStats, ShapeType, usePhysics } from 'use-ammojs'
import { Box, OrbitControls, Stage, Stats } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'

const CUBE_ARRAY_SIZE = 5
const CUBE_ARRAY_HEIGHT = 100
const CUBE_ARRAY_SIZE_SQ = CUBE_ARRAY_SIZE * CUBE_ARRAY_SIZE

export function StressDemo() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.y = 5
  }, [camera])

  return (
    <>
      <Stage adjustCamera={false} shadows preset="soft" />
      <OrbitControls />
      <directionalLight intensity={0.6} position={[20, 40, 50]} castShadow />

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
