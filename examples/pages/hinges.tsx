import React, { createContext, createRef, forwardRef, Fragment, MutableRefObject, Ref, RefObject, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { BodyType, Physics, ShapeType, SoftBodyType, useSoftBody, PhysicsStats, useRigidBody, useSingleBodyConstraint, ConstraintType, useTwoBodyConstraint, AmmoDebugConstants } from 'use-ammojs'
import { Sphere, Box, OrbitControls, Stage, Text, Stats, Cylinder, ShapeProps } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Object3D } from 'three'
import { button, folder, useControls } from 'leva'
import { AmmoDebugOptions } from '../../dist/utils/utils'
import Head from 'next/head'

const initialParentRef = createRef<Object3D>()
const context = createContext<[
  bodyRef: RefObject<Object3D>,
  props: any
]>([initialParentRef, {}])

const usePhysicsDebugControls = (): AmmoDebugOptions => useControls('Physics Debugger', physicsDebugControls) as any

const physicsDebugControls = Object.keys(AmmoDebugConstants).reduce((controls, key) => {
  controls[key] = {
    label: key.replace('Draw', ''),
    hint: key,
    value: key === 'DrawWireframe' ? true : false,
  };
  return controls
}, {} as any)

function Demo() {
    const { camera } = useThree()
    const [ refreshCount, setRefreshCount ] = useState(0)

    const { gravity } = useControls('World', {
      refresh: button(() => setRefreshCount(c => c + 1)),
      gravity: [0, -9.81, 0],
    });
    const physicsDebugOptions = usePhysicsDebugControls()

    useEffect(() => {
        camera.position.set(0, 5, 15)
    }, [camera])

    return (
        <>
            <Stage adjustCamera={false} shadows preset="soft" />
            <OrbitControls />
            <directionalLight intensity={0.6} position={[20, 40, 50]} castShadow />

            <Physics
              key={refreshCount}
              drawDebug
              drawDebugMode={physicsDebugOptions}
              gravity={gravity}
              // key={JSON.stringify(physicsDebugOptions)}
            >
                {Array(5)
                    .fill(null)
                    .map((_, index) => {
                      return <PhysicalBox key={index} position={[Math.random() / 2, 15 + index * 2, 0]} />
                    })}
                
                {Array(5)
                    .fill(null)
                    .map((_, index) => {
                        const position = [index * 2 - 10, 2, 0]
                        const pressure = index * 1 + 0.5

                        return (
                          <PhysicalBall key={index} position={position} pressure={pressure} />
                        )
                    })}
                {Array(5)
                    .fill(null)
                    .map((_, index) => {
                        return <PhysicalCylinder key={index} position={[Math.random() / 2, 15 + index * 2, 0]} />
                    })}
                
                <Vehicle />

                <Ground />
                <Stats />
                <PhysicsStats top={48} />
            </Physics>
        </>
    )
}

function PhysicalBall({ position, pressure } = {}) {
    return <PhysicalSphere position={position} />

    // const [ref] = useSoftBody(() => ({
    //   type: SoftBodyType.TRIMESH,
    //   pressure,
    //   position,
    // }), undefined, undefined, [position, pressure])

    // return (
    //   <Sphere args={[0.5, 16, 16]} position={position} ref={ref} castShadow>
    //       <meshPhysicalMaterial attach="material" color="red" />
    //   </Sphere>
    // )
}

function PhysicalSphere(props = {}) {
    // const { position } = props;
    const [ref] = useRigidBody(() => ({
        bodyType: BodyType.DYNAMIC,
        shapeType: ShapeType.SPHERE,
        // position
    }), undefined, undefined, [JSON.stringify(props)])

    return (
        <Sphere ref={ref} castShadow {...props}>
            <meshPhysicalMaterial attach="material" color="red" />
        </Sphere>
    )
}

const PhysicalCylinder: typeof Cylinder = forwardRef<any, any>((props = {}, fwdRef: any) => {
    // const { position } = props;
    const [ref, api] = useRigidBody(() => ({
        bodyType: BodyType.DYNAMIC,
        shapeType: ShapeType.CYLINDER,
        // position,
        // friction: 0.9,
        mass: 1,
    }), undefined, fwdRef as any, [JSON.stringify(props)])

    const { friction } = useControls('Wheels', {
      friction: 0.5,
    });

    useEffect(() => {
      api.updateBodyOptions({ friction });
    }, [friction]);

    return (
        <Cylinder ref={ref} castShadow args={[0.5, 0.5, 2, 16]} {...props}>
            <meshPhysicalMaterial attach="material" color="red" />
        </Cylinder>
    )
}) as any

const PhysicalBox = forwardRef<any, any>((props = {}, fwdRef) => {
// function PhysicalBox({ position }: any = {}) {
    const { position, args } = props;
    const [finalRef] = useRigidBody(() => ({
        bodyType: BodyType.DYNAMIC,
        shapeType: ShapeType.BOX,
        mass: 10,
        // position,
        // enableCCD: true,
    }), undefined, fwdRef as any, [JSON.stringify({ args, position })])

    return (
        <Box ref={finalRef} castShadow {...props}>
            <meshPhysicalMaterial attach="material" color="red" />
        </Box>
    )
})

const Vehicle = () => {
  const vehicleOptions = useControls('Vehicle', {
    body: folder({
      bodySize: {
        label: 'Size',
        value: [5, 1, 1],
      },
    }),
    wheels: folder({
      radiusTop: 1.5,
      radiusBottom: 1.5,
      height: 1,
      radialSegments: 16,
      heightSegments: 16,
      front: {
        value: 2.5,
        step: 0.1,
      },
      back: {
        value: -1.5,
        step: 0.1,
      },
      side: {
        value: 2.5,
        step: 0.1,
      },
      up: {
        value: 0,
        step: 0.1,
      },
    }),
    /*
    bodySize: [5, 1, 1],
    front: {
      value: 2.5,
      step: 0.1,
    },
    back: {
      value: -1.5,
      step: 0.1,
    },
    side: {
      value: 1.5,
      step: 0.1,
    },
    depth: {
      value: -1,
      step: 0.1,
    }
    */
  });
  const movementOptions = useControls('Movement', {
    velocity: 10,
  });
  const keyboard = useKeyControls();
  // const velocityRef = useRef({
  //   front: {
  //     left: 0,
  //     right: 0,
  //   },
  //   back: {
  //     left: 0,
  //     right: 0,
  //   },
  // });
  const frontLeftVelocity = useRef(0);
  const frontRightVelocity = useRef(0);
  const backLeftVelocity = useRef(0);
  const backRightVelocity = useRef(0);

  const { bodySize, front, back, side, up } = vehicleOptions;
  const wheels = vehicleOptions;
  const wheelArgs = [ wheels.radiusTop, wheels.radiusBottom, wheels.height, wheels.radialSegments, wheels.heightSegments ];
  const posY = 5;

  useFrame(() => {
    const { velocity } = movementOptions;
    // console.log('Keyword', keyboard.current);
    const {
      brake,
      forward,
      backward,
      left,
      right,
    } = keyboard.current;
    const shouldMove = !brake && (forward || backward || left || right);
    const isTurning = left || right;
    const shouldSpin = isTurning && !(forward || backward);
    /*
    const vs = (brake ? 0 : 1) *
      (right ? -1 : 1) *
      (forward
        ? 1
        : backward
          ? -1 : 0);
    
    const vt = isTurning ? -1 : 1;
    */
    const vs = (shouldMove ? 1 : 0) * (backward ? -1 : 1);
    // const vSpin = shouldSpin ? 1 : (isTurning ? 0.5 : 0);
    // const vLeft = left ? 1 : (right ? -vSpin : 0);
    // const vRight = right ? 1 : (left ? -vSpin : 0);
    // const vLeft = 1;
    // const vRight = 1;
    const vLeft = shouldSpin
      ? (
        left ? 1 : -1
      )
      : (
        left ? 1 : 0.5
      );
    const vRight = shouldSpin
      ? (
        right ? 1 : -1
      )
      : (
        right ? 1 : 0.5
      );

    frontLeftVelocity.current = vs * velocity * vLeft;
    frontRightVelocity.current = vs * velocity * vRight;
    backLeftVelocity.current = vs * velocity * vLeft;
    backRightVelocity.current = vs * velocity * vRight;
    // console.log('Velocity', JSON.stringify({
    //   frontLeftVelocity,
    //   frontRightVelocity,
    //   backLeftVelocity,
    //   backRightVelocity,
    // }));
  });

  return (
    <VehicleBody position={[0, posY, 0]} args={bodySize}>
      <Wheel args={wheelArgs} position={[5, posY, 0]} pivot={{ x: front, y: side, z: up }} velocity={frontLeftVelocity} />
      <Wheel args={wheelArgs} position={[5, posY, 0]} pivot={{ x: front, y: -side, z: up }} velocity={frontRightVelocity} />
      <Wheel args={wheelArgs} position={[5, posY, 0]} pivot={{ x: back, y: side, z: up }} velocity={backLeftVelocity} />
      <Wheel args={wheelArgs} position={[5, posY, 0]} pivot={{ x: back, y: -side, z: up }} velocity={backRightVelocity} />
    </VehicleBody>
  )
}

// const Vehicle = forwardRef<any, any>(({ position, children } = {}, ref) => {
const VehicleBody = (({
  position,
  args = [5, 1, 1],
  children,
}: any = {}) => {
  const bodyRef = useRef();
  const contextValue = useMemo<[any, any]>(() => (
    [bodyRef, { position }]
  ), [bodyRef, JSON.stringify({ position, args })]);

  return (
    <>
      <PhysicalBox
        ref={bodyRef}
        position={position}
        args={args}
      />
      <context.Provider value={contextValue}>
        {children}
      </context.Provider>
    </>
  )
})

const Wheel = ({
  position,
  rotation,
  // velocity = 0,
  velocity: velocityRef,
  pivot = { x: 1, y: -1.5, z: 0 },
  args = [0.5, 0.5, 1, 16],
}: any) => {
  const parentContext = useContext(context)
  const wheelRef = useRef();
  const [ parentRef ] = parentContext;
  const apiRef = useRef<any>(null);

  const [,, hingeApi] = useTwoBodyConstraint({
    bodyARef: parentRef as any,
    bodyBRef: wheelRef,
    type: ConstraintType.HINGE,
    // pivot: { x: 1, y: -1.5, z: 0 },
    pivot,
    // pivot: { x: position[0], y: position[1], z: position[2] },
    axis: { x: 0, y: 1, z: 0 },
    targetPivot: { x: 0, y: 0, z: 0 },
    targetAxis: { x: 0, y: 1, z: 0 },
    frameInA: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    },
    frameInB: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    },
  }, [
    // parentRef,
    // wheelRef,
    // pivot,
    parentContext,
    JSON.stringify({ args, pivot, position, rotation }),
    // position[0], position[1], position[2]
  ]);
  apiRef.current = hingeApi;

  // console.log('wheel', { parentRef, wheelRef, position, pivot });

  useFrame(({ clock }) => {
    // console.log('hingeApi', hingeApi);
    // const velocity = 10;
    const hingeApi = apiRef.current;
    if (!hingeApi) {
      return;
    }
    const velocity = velocityRef?.current;
    // console.log('velocity', velocity);
    if (velocity) {
      const t = clock.getElapsedTime();
      // const v = Math.sin(t) * velocity;
      const v = velocity;
      hingeApi.enableAngularMotor(true, v, 100);
    } else {
      hingeApi.enableAngularMotor(true, 0, 100);
    }
  });

  return (
    <PhysicalCylinder
      ref={wheelRef}
      position={position}
      rotation={rotation}
      args={args}
      // args={[0.5, 0.5, 1, 16]}
    />
  );
}

export function useKeyPress(target: string[], event: (pressed: boolean) => void) {
  useEffect(() => {
    const downHandler = ({ key }: KeyboardEvent) => target.indexOf(key) !== -1 && event(true)
    const upHandler = ({ key }: KeyboardEvent) => target.indexOf(key) !== -1 && event(false)
    window.addEventListener('keydown', downHandler)
    window.addEventListener('keyup', upHandler)
    return () => {
      window.removeEventListener('keydown', downHandler)
      window.removeEventListener('keyup', upHandler)
    }
  }, [])
}

export function useKeyControls() {
  const keys = useRef({
    backward: false,
    brake: false,
    forward: false,
    left: false,
    reset: false,
    right: false,
  })
  useKeyPress(['ArrowUp', 'w'], (pressed) => (keys.current.forward = pressed))
  useKeyPress(['ArrowDown', 's'], (pressed) => (keys.current.backward = pressed))
  useKeyPress(['ArrowLeft', 'a'], (pressed) => (keys.current.left = pressed))
  useKeyPress(['ArrowRight', 'd'], (pressed) => (keys.current.right = pressed))
  useKeyPress([' '], (pressed) => (keys.current.brake = pressed))
  useKeyPress(['r'], (pressed) => (keys.current.reset = pressed))
  return keys
}

function Ground() {
    const [groundRef] = useRigidBody(() => ({
        bodyType: BodyType.STATIC,
        shapeType: ShapeType.BOX
    }))

    return (
        <Box ref={groundRef} args={[100, 0.1, 100]} receiveShadow>
            <meshPhysicalMaterial attach="material" color="grey" />
        </Box>
    )
}

const Page = () => (
<>
  <Head>
    <title>Hinges Demo: Use-Ammo.js</title>
  </Head>
    <Canvas shadows>
        <Suspense fallback={null}>
            <Demo />
        </Suspense>
    </Canvas>
</>
)

export default Page;
