import * as THREE from 'three'
import React, { Suspense, useEffect, forwardRef, useMemo, useRef } from 'react'
import ReactDOM from 'react-dom'
import { Physics, BodyType, PhysicsStats, ShapeType, SoftBodyType, useRigidBody, useSoftBody, ConstraintType, useSingleBodyConstraint } from 'use-ammojs'
import { Box, Sphere, OrbitControls, Stage, Stats } from '@react-three/drei'
import { Canvas, useThree, useFrame } from '@react-three/fiber'

import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({error, resetErrorBoundary}) {
  console.log('error', error);
  return null;
  // return (
  //   <div role="alert">
  //     <p>Something went wrong:</p>
  //     <pre>{error.message}</pre>
  //     <button onClick={resetErrorBoundary}>Try again</button>
  //   </div>
  // )
}

import { Gear } from './Gear';

export function Demo() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(4, 3, 4)
  }, [camera])

  const gearSep = 1.7;
  const gearStartX = 2;

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
    >
      <Physics drawDebug>
        <Ground />
        {/* <Gear position={[0, 10, 0]} />
        <Gear position={[0, 20, 0]} rotation={[Math.PI / 2, 0, 0]} /> */}
        {/* <PhysicalBall position={[0, 10, 0]} pressure={20} /> */}

        {/* <HingedGear
          position={[gearStartX - 2.5, 2, 0]}
          velocity={0}
          numTeeth={20}
        /> */}
        <HingedGear
          position={[gearStartX - 1.2, 2, 0]}
          velocity={0}
          circularPitch={0.4}
          numTeeth={5}
          centerholeradius={0.05}
        />
        <HingedGear position={[gearStartX, 2, 0]} velocity={3} />
        <HingedGear position={[gearStartX + gearSep, 2, 0]} velocity={0} />
        <HingedGear position={[gearStartX + 2 * gearSep, 2, 0]} velocity={0} />

        <HingedBox position={[0, 1, 2]} />

        {/* {Array(10)
          .fill(null)
          .map((_, index) => {
            return <PhysicalBox key={index} position={[Math.random() / 2, 15 + index * 2, 0]} />
          })}
        {Array(10)
          .fill(null)
          .map((_, index) => {
            return <PhysicalSphere key={index} position={[Math.random() / 2, 15 + index * 2, 1]} args={[0.1, 16, 16]} />
          })} */}
        <Stats />
        <PhysicsStats top={48} />
      </Physics>
    </ErrorBoundary>
  )
}

function PhysicalBox({ position } = {}) {
  const [ref] = useRigidBody(() => ({
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

function HingedGear({
  position,
  rotation,
  velocity = 0,
  ...restProps
}) {
  const gearRef = useRef();

  const [,, hingeApi] = useSingleBodyConstraint({
    bodyARef: gearRef,
    type: ConstraintType.HINGE,
    position,
    pivot: { x: 0, y: 0, z: 0 },
    axis: { x: 0, y: 1, z: 0 },
    targetPivot: { x: 0, y: 0, z: 0 },
    targetAxis: { x: 0, y: 1, z: 0 },
    frameInA: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    },
  }, [position[0], position[1], position[2]]);

  useFrame(({ clock }) => {
    // console.log('hingeApi', hingeApi);
    if (velocity) {
      const t = clock.getElapsedTime();
      const v = Math.sin(t) * velocity;
      hingeApi.enableAngularMotor(true, v, 10);
    } else {
      hingeApi.enableAngularMotor(false, 0, 0);
    }
  });

  return (
    <Gear ref={gearRef} position={position} rotation={rotation} {...restProps} />
  );
}

function HingedBox({ position } = {}) {
  const [ref] = useRigidBody(() => ({
    bodyType: BodyType.DYNAMIC,
    shapeType: ShapeType.BOX,
    position
  }))

  const [,, hingeApi] = useSingleBodyConstraint({
    bodyARef: ref,
    type: ConstraintType.HINGE,
    position,
    pivot: { x: 0, y: 0, z: 0 },
    axis: { x: 0, y: 1, z: 0 },
    targetPivot: { x: 0, y: 0, z: 0 },
    targetAxis: { x: 0, y: 1, z: 0 },
    frameInA: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    },
  });
  
  useFrame(({ clock }) => {
    // console.log('hingeApi', hingeApi);
    const t = clock.getElapsedTime();
    const v = Math.sin(t) * 10;
    hingeApi.enableAngularMotor(true, v, 1);
  });

  return (
    <Box ref={ref} castShadow>
      <meshPhysicalMaterial attach="material" color="red" />
    </Box>
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

function PhysicalSphere(props = {}) {
  const { position } = props;
  const [ref] = useRigidBody(() => ({
    bodyType: BodyType.DYNAMIC,
    shapeType: ShapeType.SPHERE,
    position
  }))

  return (
    <Sphere ref={ref} castShadow {...props}>
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
    <Box ref={groundRef} args={[20, 0.1, 20]} receiveShadow>
      <meshPhysicalMaterial attach="material" color="grey" />
    </Box>
  )
}