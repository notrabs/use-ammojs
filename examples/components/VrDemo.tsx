import React, { useState, useEffect, useMemo, useRef, Fragment, forwardRef, createRef, Suspense } from 'react'
// import { VRCanvas, Hands, DefaultXRControllers, useXR, Interactive } from '@react-three/xr'
import { useThree, useFrame, Canvas } from '@react-three/fiber'
import { Box, OrbitControls, Plane, Sphere, Sky, useMatcapTexture, Text, Stats, Environment } from '@react-three/drei'
// import niceColors from 'nice-color-palettes'
// import { Color } from 'three'
import * as THREE from 'three'
import dynamic from "next/dynamic";

// import { usePlane, useBox, useCylinder, Physics, useSphere, Debug, useCompoundBody, useConeTwistConstraint } from '@react-three/cannon'
import { BodyType, ConstraintType, Physics, PhysicsStats, ShapeType, useRigidBody, useTwoBodyConstraint } from 'use-ammojs'

// import { joints } from './joints'
// import { fakeHand } from './hand-faker'
// import './styles.css'
// import { Robot } from './HingeMotor'
// import { GearTrain } from './Gears'
// import { ChainScene } from './Chain'

const SHOULD_MOVE = true;
const FAKE_HANDS = true;
const MOVE_SPEED = 0.5;

enum COLLISION_GROUPS {
    GROUND = 2,
    BOX = 4,
    HAND = 8,
}

// const VRCanvas = dynamic<any>(
//     () => import("@react-three/xr").then((mod) => mod.VRCanvas),
//     {
//         ssr: false,
//     }
// );

const Hands = dynamic<any>(
    () => import("@react-three/xr").then((mod) => mod.Hands),
    {
        ssr: false,
    }
);
const Interactive = dynamic<any>(
    () => import("@react-three/xr").then((mod) => mod.Interactive),
    {
        ssr: false,
    }
);

// const DefaultXRControllers = dynamic<any>(
//     () =>
//         import("@react-three/xr").then((mod) => mod.DefaultXRControllers as any),
//     {
//         ssr: false,
//     }
// );

export const joints = [
    'wrist',
    'thumb-metacarpal',
    'thumb-phalanx-proximal',
    'thumb-phalanx-distal',
    'thumb-tip',
    'index-finger-metacarpal',
    'index-finger-phalanx-proximal',
    'index-finger-phalanx-intermediate',
    'index-finger-phalanx-distal',
    'index-finger-tip',
    'middle-finger-metacarpal',
    'middle-finger-phalanx-proximal',
    'middle-finger-phalanx-intermediate',
    'middle-finger-phalanx-distal',
    'middle-finger-tip',
    'ring-finger-metacarpal',
    'ring-finger-phalanx-proximal',
    'ring-finger-phalanx-intermediate',
    'ring-finger-phalanx-distal',
    'ring-finger-tip',
    'pinky-finger-metacarpal',
    'pinky-finger-phalanx-proximal',
    'pinky-finger-phalanx-intermediate',
    'pinky-finger-phalanx-distal',
    'pinky-finger-tip'
]

const useFastFrame = useFrame;
// const useFastFrame = SHOULD_MOVE ? useFrame : () => {};

// function useFastFrame(callback: Function) {
//     /*
//     const callbackRef = useRef(callback)
//     callbackRef.current = callback
//     useEffect(() => {
//       const i = setInterval(() => {
//         callbackRef.current()
//       }, 10)
//       return () => {
//         clearInterval(i)
//       }
//     }, [])
//     */
//     useFrame(callback as any)
//     // useFrame(() => {
//     // });
// }

function RespawningCube(props: any) {
    const [ refreshCount, setRefreshCount ] = useState(0)
    // Call setRefreshCount every 10 seconds
    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         setRefreshCount(c => c + 1)
    //     }, 10000)
    //     return () => clearInterval(interval)
    // }, [])
    return <Cube key={refreshCount} {...props} />
}

function Cube({ position, mass = 0.01, rotation = [0, 0, 0], args = [0.06, 0.06, 0.06] }: any) {
    const [boxRef] = useRigidBody(() => ({
        bodyType: BodyType.DYNAMIC,
        shapeType: ShapeType.BOX,
        // shapeType: ShapeType.SPHERE,
        collisionFilterGroup: COLLISION_GROUPS.BOX,
        collisionFilterMask: COLLISION_GROUPS.BOX + COLLISION_GROUPS.GROUND + COLLISION_GROUPS.HAND,
        position,
        rotation,
        mass,
        // mass: 0.01,
        friction: 100,
        // enableCCD: true,
    }))
    // const [tex] = useMatcapTexture('C7C0AC_2E181B_543B30_6B6270')

    // return (
    //     <Sphere ref={boxRef} args={[args[0], 16, 16]}>
    //         <meshBasicMaterial transparent opacity={0} attach="material" />
    //     </Sphere>
    // )

    return (
        <Box ref={boxRef} args={args as any} castShadow>
            {/* <meshMatcapMaterial attach="material" matcap={tex as any} /> */}
            <meshPhysicalMaterial attach="material" color="blue" />
        </Box>
    )
}

function PhysicalSphere(props: any = {}) {
    const { args = [0.5, 16, 16] } = props;
    const [ref] = useRigidBody(() => ({
        bodyType: BodyType.DYNAMIC,
        shapeType: ShapeType.SPHERE,
        collisionFilterGroup: COLLISION_GROUPS.BOX,
        collisionFilterMask: COLLISION_GROUPS.BOX + COLLISION_GROUPS.GROUND + COLLISION_GROUPS.HAND,
        shapeConfig: {
            sphereRadius: args[0],
            radius: args[0],
        },
        mass: 0.01,
    }), undefined, undefined, [JSON.stringify(props)])

    return (
        <Sphere ref={ref} castShadow {...props} args={args}>
            <meshPhysicalMaterial attach="material" color="red" />
        </Sphere>
    )
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/API/XRHand
 */
function getHandFromRenderer(renderer: any, handNum: number) {
    const handObj = (renderer.xr as any).getHand(handNum)
    // return handObj && Object.keys(handObj.joints).length > 0 ? handObj : fakeHand(handNum)
    if (FAKE_HANDS) {
        return fakeHand(handNum)
    }
    return handObj
}

function useHand(handNum: number) {
    const { gl } = useThree()
    // const handObj = (gl.xr as any).getHand(handNum)
    // return handObj;
    return getHandFromRenderer(gl, handNum)
}

/*
function RecordHand({ hand }: { hand: number }) {
  const handObj = useHand(hand)
  let count = 0
  const threshold = 60
  useFrame(() => {
    if (!handObj) {
      return
    }
    count++
    if (count > threshold) {
      count = 0
      fetch('https://glavin001-pmndrs-react-xr-gr4q4jwh9457-3000.githubpreview.dev/', {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({
          num: hand,
          // hand: handObj.joints
          hand: Object.keys(handObj.joints).map((jointName) => {
            const joint = handObj.joints[jointName]
            return {
              joint: joint.toJSON(),
              jointRadius: joint.jointRadius,
              position: joint.position.toArray(),
              quaternion: joint.quaternion.toArray()
            }
          })
        })
      })
        .then(console.log)
        .catch(console.error)
    }
  })
  return null
}
*/

const JointCollider = forwardRef(({ index, hand }: { index: number; hand: number }, ref) => {
    // const { gl } = useThree()
    // const handObj = (gl.xr as any).getHand(hand)
    const handObj = useHand(hand)
    const joint = handObj.joints[joints[index]] as any
    // console.log('Hand', hand, index, joints[index], joint)
    const size = Math.max(0.001, joint.jointRadius ?? 0.0001)
    // console.log('JointCollider', index, joint.jointRadius, joint.position, joint.quaternion);

    // Phantom
    const [bodyRef, api] = useRigidBody(
        () => ({
            // args: size,
            // type: 'Static',
            bodyType: BodyType.DYNAMIC,
            shapeType: ShapeType.SPHERE,
            // shapeType: ShapeType.BOX,
            collisionFilterGroup: COLLISION_GROUPS.HAND,
            collisionFilterMask: COLLISION_GROUPS.BOX,
            disableCollision: true,
            // gravity: [0,0,0],
            linearDamping: 0,
            angularDamping: 0,
            gravity: { x: 0, y: 0, z: 0 } as any,
            mass: 10000, //100000,
            position: [0, 1, 0],
            friction: 100,
            // material: {
            //   friction: 1.0
            // }
            // enableCCD: true,
            shapeConfig: {
                sphereRadius: size
            },
        }),
        // undefined,
        // ref as any,
    )
    // const boxArgs = [size, size, size * 4]
    // const [boxRef, boxApi] = useBox(() => ({
    //   position: [-1, 0, 0],
    //   // rotation,
    //   mass: 1,
    //   type: 'Static',
    //   args: boxArgs
    // }))

    // Physical
    const [physicalRef] = useRigidBody(
        () => ({
            // args: size,
            // type: 'Static',
            bodyType: BodyType.DYNAMIC,
            shapeType: ShapeType.SPHERE,
            // shapeType: ShapeType.BOX,
            collisionFilterGroup: COLLISION_GROUPS.HAND,
            collisionFilterMask: COLLISION_GROUPS.BOX,
            // disableCollision: true,
            // gravity: [0,0,0],
            linearDamping: 0,
            angularDamping: 0,
            gravity: { x: 0, y: 0, z: 0 } as any,
            mass: 100, //100000,
            position: [0, 1, 0],
            friction: 100,
            // material: {
            //   friction: 1.0
            // }
            // enableCCD: true,
            shapeConfig: {
                sphereRadius: size
            },
        }),
        // undefined,
        // ref as any,
    )

    useTwoBodyConstraint({
        bodyARef: bodyRef as any,
        bodyBRef: physicalRef as any,
        // type: ConstraintType.HINGE,

        type: ConstraintType.POINT_TO_POINT,
        pivot: { x: 0, y: 0, z: 0 } as any,
        axis: { x: 0, y: 1, z: 0 } as any,
        targetPivot: { x: 0, y: 0, z: 0 } as any,
        targetAxis: { x: 0, y: 1, z: 0 } as any,

        // type: ConstraintType.GENERIC_6_DOF_SPRING,
        // useLinearReferenceFrameA: true,

        frameInA: {
            position: { x: 0, y: 0, z: 0 } as any,
            rotation: { _x: 0, _y: 0, _z: 0, _w: 1 } as any,
        },
        frameInB: {
            position: { x: 0, y: 0, z: 0 } as any,
            rotation: { _x: 0, _y: 0, _z: 0, _w: 1 } as any,
        },
        // springEnabled: [true, true, true, true, true, true],
        // stiffness: [40, 40, 40, 40, 40, 40],
        // damping: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        // linearUpperLimit: [5, 0, 0],
        // linearLowerLimit: [-5, 0, 0],
        // angularUpperLimit: [0, 0, 0],
        // angularLowerLimit: [0, 0, 0],
    });

    useFastFrame(({ clock }) => {
        if (joint === undefined) return
        const t = clock.getElapsedTime()

        // api.position.set(joint.position.x, joint.position.y, joint.position.z)
        // console.log('move joint', index, joint.position);
        // api.setPosition(joint.position)

        // SET_POSITION
        if (SHOULD_MOVE) {
            api.setPosition({
                x: joint.position.x + Math.cos(MOVE_SPEED*t*1.5) * 0.3,
                y: joint.position.y - 0.4, //Math.sin(t) * 1,
                z: joint.position.z + Math.sin(MOVE_SPEED*t) * 0.3
            } as any)
        } else {
            api.setPosition(joint.position)
        }

        // boxApi.position.set(joint.position.x, joint.position.y, joint.position.z)
        // boxApi.rotation.copy(joint.quaternion)
    })

    return (
        <>
            {/* Phantom */}
            <Sphere
                ref={bodyRef}
                // args={[10, 16, 16]}
                args={[size, 16, 16]}
            >
                <meshStandardMaterial wireframe attach="material" />
            </Sphere>
            {/* Physical */}
            <Sphere
                ref={physicalRef}
                // args={[10, 16, 16]}
                args={[size, 16, 16]}
            >
                <meshNormalMaterial attach="material" />
            </Sphere>
            {/* <Box ref={bodyRef} args={[size, size, size]} castShadow>
                <meshNormalMaterial attach="material" />
                //<meshBasicMaterial transparent opacity={0} attach="material" />
            </Box> */}
        </>
    )
})

function HandsReady(props: any) {
    // return props.children

    const [ready, setReady] = useState(false)
    const { gl } = useThree()
    useEffect(() => {
        if (ready) return
        // const joint = (gl.xr as any).getHand(0).joints['index-finger-tip']
        const joint = getHandFromRenderer(gl, 0).joints['index-finger-tip']
        if (joint?.jointRadius !== undefined) {
            console.log('HandsReady1')
            setReady(true)
            return
        }
        const id = setInterval(() => {
            // const joint = (gl.xr as any).getHand(0).joints['index-finger-tip']
            const joint = getHandFromRenderer(gl, 0).joints['index-finger-tip']
            if (joint?.jointRadius !== undefined) {
                console.log('HandsReady')
                setReady(true);
                clearInterval(id);
            }
        }, 500)
        return () => clearInterval(id)
    }, [gl, ready])

    console.log('HandsReady', ready);
    return ready ? props.children : null
}

function getPointInBetweenByPerc(pointA, pointB, percentage) {
    var dir = pointB.clone().sub(pointA)
    var len = dir.length()
    dir = dir.normalize().multiplyScalar(len * percentage)
    return pointA.clone().add(dir)
}

// const Bone = ({ startRef, endRef }: any) => {
const Bone = ({ start, end, hand }: any) => {
    const chainSize = [0.005, 0.02, 0.01]
    const pos = [0, 10, 0]
    // const args = [chainSize[0], chainSize[0], chainSize[1], 8]
    const args = [0.01, 0.01, 0.03, 8]
    const defaultRot = [0, 1, 0]
    const defaultRotV = new THREE.Vector3().fromArray(defaultRot).normalize()

    const handObj = useHand(hand)
    const startJoint = handObj.joints[joints[start]] as any
    const endJoint = handObj.joints[joints[end]] as any
    // const size = joint.jointRadius ?? 0.0001
    // console.log('Bone', hand, start, end);

    // Phantom
    const [ref, api] = useRigidBody(() => ({
        bodyType: BodyType.DYNAMIC,
        shapeType: ShapeType.CYLINDER,
        mass: 10000,//100000,
        // linearDamping: 0.8,
        gravity: { x: 0, y: 0, z: 0 } as any,
        collisionFilterGroup: COLLISION_GROUPS.HAND,
        collisionFilterMask: COLLISION_GROUPS.BOX,
        disableCollision: true,
        // enableCCD: true,
        linearDamping: 0,
        angularDamping: 0,
        // args: chainSize,
        // args,
        // type: 'Static',
        position: [0, 1, 0],
        friction: 100,
        // position: pos,
        // rotation: defaultRot
        // allowSleep: false,
        // material: {
        //   friction: 1.0
        // }
    }))

    // Physical
    const [refPhysical, apiPhysical] = useRigidBody(() => ({
        bodyType: BodyType.DYNAMIC,
        shapeType: ShapeType.CYLINDER,
        // shapeType: ShapeType.BOX,
        mass: 100,//100000,
        // linearDamping: 0.8,
        gravity: { x: 0, y: 0, z: 0 } as any,
        collisionFilterGroup: COLLISION_GROUPS.HAND,
        collisionFilterMask: COLLISION_GROUPS.BOX,
        // disableCollision: true,
        // enableCCD: true,
        linearDamping: 0,
        angularDamping: 0,
        // args: chainSize,
        // args,
        // type: 'Static',
        position: [0, 1, 0],
        friction: 100,
        // position: pos,
        // rotation: defaultRot
        // allowSleep: false,
        // material: {
        //   friction: 1.0
        // }
    }))

    useTwoBodyConstraint({
        bodyARef: ref as any,
        bodyBRef: refPhysical as any,

        // type: ConstraintType.HINGE,

        type: ConstraintType.POINT_TO_POINT,
        pivot: { x: 0, y: 0, z: 0 },
        axis: { x: 0, y: 1, z: 0 },
        targetPivot: { x: 0, y: 0, z: 0 },
        targetAxis: { x: 0, y: 1, z: 0 },

        // type: ConstraintType.GENERIC_6_DOF_SPRING,
        // useLinearReferenceFrameA: true,

        frameInA: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { _x: 0, _y: 0, _z: 0, _w: 1 },
        },
        frameInB: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { _x: 0, _y: 0, _z: 0, _w: 1 },
        },
        // springEnabled: [true, true, true, true, true, true],
        // stiffness: [40, 40, 40, 40, 40, 40],
        // damping: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    });

    useFastFrame(({ clock }) => {
        // if (!(startRef && startRef.current && endRef && endRef.current)) {
        if (!(startJoint && endJoint)) {
            return
        }
        const t = clock.getElapsedTime()

        const startPos = new THREE.Vector3()
        // startRef.current.getWorldPosition(startPos)
        startPos.copy(startJoint.position)
        const endPos = new THREE.Vector3()
        // endRef.current.getWorldPosition(endPos)
        endPos.copy(endJoint.position)

        const midPos = getPointInBetweenByPerc(startPos, endPos, 0.5)
        // api.position.copy(midPos);
        // api.position.set(midPos.x, midPos.y, midPos.z)
        // api.setPosition(midPos)

        // SET_POSITION
        if (SHOULD_MOVE) {
            api.setPosition({
                x: midPos.x + Math.cos(MOVE_SPEED*t*1.5) * 0.3,
                y: midPos.y - 0.4, //Math.sin(t) * 1,
                z: midPos.z + Math.sin(MOVE_SPEED*t) * 0.3
            } as any)
        } else {
            api.setPosition(midPos)
        }

        // Vector beween 2 points
        const diffVector = new THREE.Vector3()
            .subVectors(startPos, endPos)
            // .subVectors(endPos, startPos)
            .normalize()

        // Rotation from start to end vector/direction
        // const alignVector = new THREE.Vector3().subVectors(defaultRotV, diffVector).normalize()

        const cylinderQuaternion = new THREE.Quaternion()
        // cylinderQuaternion.setFromUnitVectors(diffVector, alignVector)
        cylinderQuaternion.setFromUnitVectors(defaultRotV, diffVector)
        // cylinderQuaternion.setFromUnitVectors(diffVector, defaultRotV)

        const v = defaultRotV.clone()
        v.applyQuaternion(cylinderQuaternion)

        // const e = new THREE.Euler().setFromQuaternion(cylinderQuaternion)

        // cylinderQuaternion.setFromEuler(new THREE.Euler().setFromVector3(alignVector))
        // api.rotation.copy(cylinderQuaternion)
        // api.rotation.copy(alignVector)
        // api.rotation.set(alignVector.x, alignVector.y, alignVector.z)
        // api.rotation.set(diffVector.x, diffVector.y, diffVector.z)

        // api.rotation.set(v.x, v.y, v.z)
        // api.rotation.set(v.x, 0, 0) // Rotates along Y axis
        // api.rotation.set(0, 0, -v.x * 2 * Math.PI)

        // api.rotation.copy(e)
        // UPDATE_ROTATION
        api.setRotation(cylinderQuaternion) // FIXME
        apiPhysical.setRotation(cylinderQuaternion)

        // api.rotation.set(X, Y, Z)
        // api.rotation.set(Math.sin(t), 0, 0) // Lean forwrd/back
        // api.rotation.set(0, Math.sin(t), 0) // Spinning
        // api.rotation.set(0, 0, Math.sin(t)) // Lean left/right

        // api.rotation.set(defaultRotV.x, defaultRotV.y, defaultRotV.z)
        // api.quaternion.set(cylinderQuaternion.x, cylinderQuaternion.y, cylinderQuaternion.z, cylinderQuaternion.w)
    })

    /*
    useConeTwistConstraint(startRef, ref, {
      // pivotA: [0, -chainSize[1] / 2, 0],
      pivotB: [0, chainSize[1] / 2, 0],
      pivotA: [0, 0, 0],
      // pivotB: [0, 0, 0],
      axisA: [0, 1, 0],
      axisB: [0, 1, 0],
      twistAngle: 0,
      angle: Math.PI / 8
    })
    useConeTwistConstraint(ref, endRef, {
      pivotA: [0, -chainSize[1] / 2, 0],
      // pivotB: [0, chainSize[1] / 2, 0],
      // pivotA: [0, 0, 0],
      pivotB: [0, 0, 0],
      axisA: [0, 1, 0],
      axisB: [0, 1, 0],
      twistAngle: 0,
      angle: Math.PI / 8
    })
    */

    return (
        <>
            {/* Real Physical */}
            <mesh
                ref={refPhysical}
                position={pos}
                rotation={defaultRot}
            >
                <cylinderBufferGeometry args={args} />
                <meshNormalMaterial />
            </mesh>
            {/* <Box
                ref={refPhysical}
                // args={args as any}
                args={[args[0], args[2], args[1]]}
                castShadow
                position={pos}
                rotation={defaultRot}
            >
                <meshNormalMaterial />
            </Box> */}
            {/* Phantom */}
            <mesh
                ref={ref}
                position={pos}
                rotation={defaultRot}
            >
                <cylinderBufferGeometry args={args} />
                <meshStandardMaterial wireframe />
            </mesh>
        </>
    )
}

const HandColliders = ({ hand }: { hand: number }): any => {
    console.log('HandColliders', hand);
    const refs = useMemo(() => {
        const arr = [...Array(joints.length)]
        return arr.map(() => createRef())
    }, [])
    // console.log('refs', refs)

    // return refs.map((_, i) => (
    //   <Fragment key={i}>
    //     <JointCollider index={i} hand={hand} />
    //     {/* <JointCollider index={i} hand={0} /> */}
    //     {/* <JointCollider index={i} hand={1} /> */}
    //   </Fragment>
    // ))

    return (
        <group>
            <group>
            {refs.map((_, i) => (
                <JointCollider key={i} index={i} hand={hand} ref={refs[i]} />
            ))}
            </group>
            <group>
            {[
                // Thumb
                [0, 1],
                [1, 2],
                [3, 4],
                // Index finger
                [0, 5],
                [5, 6],
                [6, 7],
                [7, 8],
                [8, 9],
                // Middle Finger
                [0, 10],
                [10, 11],
                [11, 12],
                [12, 13],
                [13, 14],
                //
                [0, 15],
                [15, 16],
                [16, 17],
                [17, 18],
                [18, 19],
                //
                [0, 20],
                [20, 21],
                [21, 22],
                [22, 23],
                [23, 24]
            ].map(([from, to]) => (
                // <Bone key={`${from}-${to}`} startRef={refs[from]} endRef={refs[to]} />
                <Bone key={`${from}-${to}`} hand={hand} start={from} end={to} />
            ))}
            </group>
        </group>
    )
}

const HandsColliders = (): any => {
    return (
        <group>
            <HandColliders hand={0} />
            <HandColliders hand={1} />
            {/* <RecordHand hand={0} />
      <RecordHand hand={1} /> */}
        </group>
    )
}

function XRControllerCollider(props: any) {
    // console.log('XRControllerCollider', props)
    const { xrController } = props
    const { controller } = xrController
    const size = 0.07
    // const tipRef = useRef()
    const [tipRef, api] = useRigidBody(
        () => ({
            bodyType: BodyType.STATIC,
            // type: 'Static',
            shapeType: ShapeType.SPHERE,
            // args: size,
            // position: [-1, 0, 0]
        })
        // tipRef,
        // []
    )

    useFrame(() => {
        // console.log('pos', controller.position)
        if (controller === undefined) return
        // api.position.set(controller.position.x, controller.position.y, controller.position.z)
        api.setPosition(controller.position)
    })

    return (
        <Sphere ref={tipRef} args={[size, 16, 16]}>
            <meshBasicMaterial opacity={0} attach="material" />
        </Sphere>
    )
}

/*
function XRControllerColliders() {
    const { controllers } = useXR()
    // console.log('Controllers', controllers)
    return (
        <>
            {controllers.map((xrController, index) => (
                <XRControllerCollider key={index} xrController={xrController} />
            ))}
        </>
    )
}
*/

function Controllers() {
    return (
        <>
            <Hands />
            <HandsReady>
                <HandsColliders />
            </HandsReady>
            {/* <DefaultXRControllers /> */}
            {/* <XRControllerColliders /> */}
        </>
    )
}

function Button(props: any) {
    const [hover, setHover] = useState(false)
    const [color, setColor] = useState(0x123456)

    const onSelect = () => {
        setColor((Math.random() * 0xffffff) | 0)
    }

    return (
        <Interactive onSelect={onSelect} onHover={() => setHover(true)} onBlur={() => setHover(false)}>
            <Box
                // scale={hover ? [1.5, 1.5, 1.5] : [1, 1, 1]}
                args={[0.4, 0.1, 0.1]}
                {...props}>
                <meshPhongMaterial attach="material" color={color} />
                <Text position={[0, 0, 0.06]} fontSize={0.05} color="white" anchorX="center" anchorY="middle">
                    Hello react-xr!
                </Text>
            </Box>
        </Interactive>
    )
}

/*
type OurCompoundBodyProps = Pick<CompoundBodyProps, 'position' | 'rotation'> & {
  isTrigger?: boolean
  mass?: number
  setPosition?: (position: Triplet) => void
  setRotation?: (rotation: Triplet) => void
}

function CompoundBody({ isTrigger, mass = 12, setPosition, setRotation, ...props }: OurCompoundBodyProps) {
  const { scale = [1, 1, 1] } = props
  const boxSize: Triplet = [1 * scale[0], 1 * scale[1], 1 * scale[2]]
  const sphereRadius = 0.65 * scale[0]
  const [ref, api] = useCompoundBody(() => ({
    isTrigger,
    mass,
    ...props,
    shapes: [
      { type: 'Box', position: [0, 0, 0], rotation: [0, 0, 0], args: boxSize },
      { type: 'Sphere', position: [1 * scale[0], 0, 0], rotation: [0, 0, 0], args: [sphereRadius] }
    ]
  }))

  useEffect(() => {
    if (setPosition) {
      return api.position.subscribe(setPosition)
    }
  }, [api, setPosition])

  useEffect(() => {
    if (setRotation) {
      return api.rotation.subscribe(setRotation)
    }
  }, [api, setRotation])

  return (
    <group ref={ref}>
      <mesh castShadow>
        <boxBufferGeometry args={boxSize} />
        <meshNormalMaterial />
      </mesh>
      <mesh castShadow position={[1 * scale[0], 0, 0]}>
        <sphereBufferGeometry args={[sphereRadius, 16, 16]} />
        <meshNormalMaterial />
      </mesh>
    </group>
  )
}
*/

/*
function Floor() {
  const args = [10, 10]
  const [floorRef] = usePlane(() => ({
    args,
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    type: 'Static'
  }))

  return (
    <Plane ref={floorRef} args={args} receiveShadow>
      <meshStandardMaterial attach="material" color="#fff" />
    </Plane>
  )
}
*/

function Floor() {
    const [groundRef] = useRigidBody(() => ({
        bodyType: BodyType.STATIC,
        shapeType: ShapeType.BOX,
        collisionFilterGroup: COLLISION_GROUPS.GROUND,
        collisionFilterMask: COLLISION_GROUPS.BOX,
    }))

    return (
        <Box ref={groundRef} args={[200, 0.1, 200]} receiveShadow>
            <meshPhysicalMaterial attach="material" color="grey" />
        </Box>
    )
}
/*
function InstancedSpheres({ number = 100 }) {
  const size = 0.1
  const [ref] = useSphere((index) => ({
    args: size,
    mass: 1,
    position: [Math.random() - 0.5, index * 0.5 + 0.5, Math.random() - 0.5]
  }))
  const colors = useMemo(() => {
    const array = new Float32Array(number * 3)
    const color = new Color()
    for (let i = 0; i < number; i++)
      color
        .set(niceColors[17][Math.floor(Math.random() * 5)])
        .convertSRGBToLinear()
        .toArray(array, i * 3)
    return array
  }, [number])

  return (
    <instancedMesh ref={ref} castShadow receiveShadow args={[undefined, undefined, number]}>
      <sphereBufferGeometry args={[size, 16, 16]}>
        <instancedBufferAttribute attachObject={['attributes', 'color']} args={[colors, 3]} />
      </sphereBufferGeometry>
      <meshPhongMaterial vertexColors />
    </instancedMesh>
  )
}
*/

export function Scene({ isVr }: { isVr: boolean }) {
    console.log('Scene');
    // const robotRef = useRef<Object3D>(null)
    // const gearsRef = useRef<Object3D>(null)
    return (
        <group>
            {/* <Sky /> */}
            <Environment background preset="apartment" />
            <Floor />
            {/* <Button position={[0.5, 0.5, -0.2]} /> */}
            {/* <Robot
        ref={robotRef}
        // scale={[0.1, 0.1, 0.1]}
        // scale={[0.8, 0.8, 0.8]}
        // scale={[1, 1, 1]}
        scale={[0.5, 0.5, 0.5]}
      /> */}
            {/* <InstancedSpheres number={10} /> */}
            {/* <GearTrain
        ref={gearsRef}
        position={[1, 1.5, -1]}
        // scale={[0.1, 0.1, 0.1]}
      /> */}
            {/* <ChainScene /> */}
            {/* <CompoundBody position={[0.5, 1, 0.5]} rotation={[1.25, 0, 0]} scale={[0.1, 0.1, 0.1]} /> */}
            {/* <Robot /> */}

            {isVr && (
                <Controllers />
            )}

            {[...Array(10)].map((_, i) => {
                const size = 0.1 + (Math.random() - 0.5) * 0.05;
                return (
                <RespawningCube
                    key={i}
                    position={[0, 1.1 + 0.2 * i, -0.5]}
                    // args={[0.16, 0.16, 0.16]}
                    // args={[0.04, 0.04, 0.04]}
                    // args={[0.1, 0.1, 0.1]}
                    // args={[0.05, 0.05, 0.05]}
                    // args={[0.03, 0.03, 0.03]}
                    args={[size, size, size]}
                />
                );
            })}

           {[...Array(1)].map((_, i) => (
                <PhysicalSphere
                    key={i}
                    position={[0, 0.6 + 0.2 * i, -0.5]}
                    // args={[0.16, 0.16, 0.16]}
                    // args={[0.04, 0.04, 0.04]}
                    // args={[0.1, 0.1, 0.1]}
                    // args={[0.05, 0.05, 0.05]}
                    args={[0.03, 16, 16]}
                />
            ))}

            {/* {[...Array(15)].map((_, i) => (
        <Cube
          key={i}
          position={[0.5, 1.1 + 0.2 * i, -0.5]}
          // args={[0.04, 0.04, 0.04]}
          // args={[0.1, 0.1, 0.1]}
          args={[0.05, 0.05, 0.05]}
        />
      ))} */}
            <Cube mass={100} position={[0, 1, -1]} args={[2, 0.36, 0.16]} />
            <Cube mass={100} position={[0, 1, 1]} args={[2, 0.36, 0.16]} />
            <Cube mass={100} position={[1.1, 1, 0]} args={[2, 0.36, 0.16]} rotation={[0, Math.PI / 2, 0]} />
            <Cube mass={100} position={[-1.1, 1, 0]} args={[2, 0.36, 0.16]} rotation={[0, Math.PI / 2, 0]} />
        </group>
    )
}






































const hand0example1 = {
    "num": 1,
    "hand": [
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "EDB250D4-4199-4F35-A4AA-03F379CE99FB",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.5675250291824341,
                        0.7677115797996521,
                        0.29754704236984253,
                        0,
                        -0.7748497128486633,
                        -0.375788152217865,
                        -0.5083219408988953,
                        0,
                        -0.2784299850463867,
                        -0.5190396904945374,
                        0.8081302642822266,
                        0,
                        -0.04060852527618408,
                        0.42010563611984253,
                        -0.4300837516784668,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.02346084825694561,
            "position": [-0.04060852527618408, 0.42010563611984253, -0.4300837516784668],
            "quaternion": [0.005762505521197336, -0.3096799275644715, 0.8293737766507264, 0.46497771408734523]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "FDFDC8F7-E08D-41FC-BCC2-0255E72CFDDD",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.5027890205383301,
                        -0.2526634931564331,
                        0.8266585469245911,
                        0,
                        -0.7222412824630737,
                        0.4026542603969574,
                        0.5623494982719421,
                        0,
                        -0.47494271397590637,
                        -0.8797901272773743,
                        0.019966112449765205,
                        0,
                        -0.02924434281885624,
                        0.4672943353652954,
                        -0.4412979185581207,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.018382517620921135,
            "position": [-0.02924434281885624, 0.4672943353652954, -0.4412979185581207],
            "quaternion": [0.5196558269362207, -0.4690146743797433, 0.1692061287440554, 0.6937956058834229]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "E708AFFC-84A5-49E3-BC1C-0D016372C8D0",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.46212247014045715,
                        -0.08204271644353867,
                        0.883013129234314,
                        0,
                        -0.4473251700401306,
                        0.8381921648979187,
                        0.311984658241272,
                        0,
                        -0.7657305002212524,
                        -0.5391690135002136,
                        0.35064753890037537,
                        0,
                        -0.013802573084831238,
                        0.49589890241622925,
                        -0.4419470727443695,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.010282951407134533,
            "position": [-0.013802573084831238, 0.49589890241622925, -0.4419470727443695],
            "quaternion": [0.2613823363569907, -0.5063156282049442, 0.11217523334316187, 0.8140887395735191]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "376FCF4D-165E-4496-82D0-9BBA93D0428B",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.4279405474662781,
                        -0.23440207540988922,
                        0.8728819489479065,
                        0,
                        0.15369489789009094,
                        0.9705904722213745,
                        0.18528982996940613,
                        0,
                        -0.8906430006027222,
                        0.05486452952027321,
                        0.4513813257217407,
                        0,
                        0.01207383070141077,
                        0.5141190886497498,
                        -0.45379653573036194,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.009768804535269737,
            "position": [0.01207383070141077, 0.5141190886497498, -0.45379653573036194],
            "quaternion": [0.03862918324352108, -0.5223190048121688, -0.11494612047584646, 0.8440841384610399]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "E4A6F4C1-5421-41E0-84F5-1483CBC95E85",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.4279405474662781,
                        -0.23440207540988922,
                        0.8728819489479065,
                        0,
                        0.15369489789009094,
                        0.9705904722213745,
                        0.18528982996940613,
                        0,
                        -0.8906430006027222,
                        0.05486452952027321,
                        0.4513813257217407,
                        0,
                        0.03384638577699661,
                        0.5139238238334656,
                        -0.46529123187065125,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0,
            "position": [0.03384638577699661, 0.5139238238334656, -0.46529123187065125],
            "quaternion": [0.03862918324352108, -0.5223190048121688, -0.11494612047584646, 0.8440841384610399]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "B18B5DDF-4194-4C7A-B0DD-845DDEAE2F48",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.6116708517074585,
                        0.6510636210441589,
                        0.4494161009788513,
                        0,
                        -0.724393904209137,
                        -0.23259925842285156,
                        -0.6489614248275757,
                        0,
                        -0.3179813325405121,
                        -0.7225051522254944,
                        0.6139007806777954,
                        0,
                        -0.030900942161679268,
                        0.4571354389190674,
                        -0.4537251591682434,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.018382517620921135,
            "position": [-0.030900942161679268, 0.4571354389190674, -0.4537251591682434],
            "quaternion": [0.041915468463157524, -0.4373702114200081, 0.7839277649548742, 0.4386429652904365]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "6F126822-08F2-4B6E-837D-16EE0E984387",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.5039252042770386,
                        0.7915611863136292,
                        0.34567373991012573,
                        0,
                        -0.2995448112487793,
                        0.21521155536174774,
                        -0.9294928312301636,
                        0,
                        -0.8101434707641602,
                        -0.5719397068023682,
                        0.12865754961967468,
                        0,
                        -0.021576741710305214,
                        0.49076104164123535,
                        -0.4969346523284912,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.010295259766280651,
            "position": [-0.021576741710305214, 0.49076104164123535, -0.4969346523284912],
            "quaternion": [-0.19506777463977118, -0.6305710079717813, 0.595267005271855, 0.45824224994779383]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "E4FEDE1B-DE67-4173-A9AF-24BD77B91875",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.5074207782745361,
                        0.8088371157646179,
                        0.2971649467945099,
                        0,
                        0.6053605079650879,
                        0.580029308795929,
                        -0.5450732707977295,
                        0,
                        -0.6132397651672363,
                        -0.09668958187103271,
                        -0.78395676612854,
                        0,
                        0.009149814024567604,
                        0.5124531984329224,
                        -0.5018143057823181,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.008038101717829704,
            "position": [0.009149814024567604, 0.5124531984329224, -0.5018143057823181],
            "quaternion": [0.4172849265042266, 0.8472612668857871, -0.18936391581573955, -0.2686316123139324]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "90465D80-DB16-469B-A4C1-8C8968E69B26",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.4605911076068878,
                        0.8268768787384033,
                        0.322693407535553,
                        0,
                        0.812789797782898,
                        0.5390002727508545,
                        -0.22102418541908264,
                        0,
                        -0.35669153928756714,
                        0.16048011183738708,
                        -0.9203355312347412,
                        0,
                        0.024053778499364853,
                        0.5148031115531921,
                        -0.48276129364967346,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.007636196445673704,
            "position": [0.024053778499364853, 0.5148031115531921, -0.48276129364967346],
            "quaternion": [-0.4797771025612343, -0.8543896353723329, 0.017715595307125923, 0.19879245586589295]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "F2DB2756-1559-43FB-B40A-4CD7A2EA9F7D",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.4605911076068878,
                        0.8268768787384033,
                        0.322693407535553,
                        0,
                        0.812789797782898,
                        0.5390002727508545,
                        -0.22102418541908264,
                        0,
                        -0.35669153928756714,
                        0.16048011183738708,
                        -0.9203355312347412,
                        0,
                        0.03299993276596069,
                        0.5115222930908203,
                        -0.4625014364719391,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0,
            "position": [0.03299993276596069, 0.5115222930908203, -0.4625014364719391],
            "quaternion": [-0.4797771025612343, -0.8543896353723329, 0.017715595307125923, 0.19879245586589295]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "E8F1B35E-DDAD-44CC-B8FA-AECE9B4FC6CC",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.6588838696479797,
                        0.7122170329093933,
                        0.24211277067661285,
                        0,
                        -0.6197889447212219,
                        -0.3315843641757965,
                        -0.7112756967544556,
                        0,
                        -0.4263019263744354,
                        -0.618707001209259,
                        0.659899890422821,
                        0,
                        -0.023777348920702934,
                        0.44736525416374207,
                        -0.45736104249954224,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.018382517620921135,
            "position": [-0.023777348920702934, 0.44736525416374207, -0.45736104249954224],
            "quaternion": [-0.056569330892568354, -0.4084726325506991, 0.8139976059340064, 0.4090940195030657]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "4A0311A7-9CF2-4725-BC57-A01CFDD2FD47",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.5658268928527832,
                        0.7837560772895813,
                        0.2560596764087677,
                        0,
                        -0.5697219371795654,
                        -0.1471438854932785,
                        -0.80855792760849,
                        0,
                        -0.5960345268249512,
                        -0.6033865809440613,
                        0.529780924320221,
                        0,
                        -0.012986572459340096,
                        0.4720306992530823,
                        -0.5055723786354065,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.01117393933236599,
            "position": [-0.012986572459340096, 0.4720306992530823, -0.5055723786354065],
            "quaternion": [-0.11350790409432887, -0.4714080398517278, 0.7487909404355291, 0.4518877550818791]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "FBC170A5-9A23-4B2F-8FE9-680DC936C347",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.5736755132675171,
                        0.785759687423706,
                        0.231254443526268,
                        0,
                        0.2071344256401062,
                        0.4123287796974182,
                        -0.8871757984161377,
                        0,
                        -0.7924596071243286,
                        -0.4610501527786255,
                        -0.39930078387260437,
                        0,
                        0.012599398382008076,
                        0.4979322850704193,
                        -0.5283142924308777,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.008030958473682404,
            "position": [0.012599398382008076, 0.4979322850704193, -0.5283142924308777],
            "quaternion": [0.3214406983062576, 0.7722216072354746, -0.43647623022706555, -0.3314184171675068]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "2F1F9DD2-7590-44AF-B18B-08843E88E034",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.5223838686943054,
                        0.8457068800926208,
                        0.10906686633825302,
                        0,
                        0.7024666666984558,
                        0.49931401014328003,
                        -0.5071749687194824,
                        0,
                        -0.4833798408508301,
                        -0.18832407891750336,
                        -0.8549143671989441,
                        0,
                        0.034431327134370804,
                        0.5106340050697327,
                        -0.5173137187957764,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.007629410829395056,
            "position": [0.034431327134370804, 0.5106340050697327, -0.5173137187957764],
            "quaternion": [0.4564034463797351, 0.8480288606743633, -0.20503394879688613, -0.17465401637751476]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "879B5673-F7BA-4B3B-AD79-F6DF8FB9AF23",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.5223838686943054,
                        0.8457068800926208,
                        0.10906686633825302,
                        0,
                        0.7024666666984558,
                        0.49931401014328003,
                        -0.5071749687194824,
                        0,
                        -0.4833798408508301,
                        -0.18832407891750336,
                        -0.8549143671989441,
                        0,
                        0.04745901748538017,
                        0.5156423449516296,
                        -0.4965813457965851,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0,
            "position": [0.04745901748538017, 0.5156423449516296, -0.4965813457965851],
            "quaternion": [0.4564034463797351, 0.8480288606743633, -0.20503394879688613, -0.17465401637751476]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "A31C76AE-2CF1-491B-8561-C45679ACB171",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.6718341708183289,
                        0.7403423190116882,
                        0.02305860072374344,
                        0,
                        -0.5090861916542053,
                        -0.43891724944114685,
                        -0.7403934597969055,
                        0,
                        -0.5380238890647888,
                        -0.509160578250885,
                        0.6717777848243713,
                        0,
                        -0.018064025789499283,
                        0.43697506189346313,
                        -0.4583888351917267,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.018382517620921135,
            "position": [-0.018064025789499283, 0.43697506189346313, -0.4583888351917267],
            "quaternion": [-0.15435763117559104, -0.37454607291523556, 0.8340457947603515, 0.37450844210005285]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "42A12986-38D2-4AEB-9CF0-62637AEB4035",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.6141722798347473,
                        0.7717590928077698,
                        0.16486504673957825,
                        0,
                        -0.678888738155365,
                        -0.4101712107658386,
                        -0.6089906692504883,
                        0,
                        -0.40237119793891907,
                        -0.485950231552124,
                        0.7758543491363525,
                        0,
                        -0.0009423175361007452,
                        0.4551866054534912,
                        -0.5036376118659973,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.00992213748395443,
            "position": [-0.0009423175361007452, 0.4551866054534912, -0.5036376118659973],
            "quaternion": [-0.07096602045018548, -0.32716461330571106, 0.8366895650957202, 0.4334486260238033]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "0BCB35D0-AA23-4230-A570-35B30101FA03",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.6634489893913269,
                        0.741446852684021,
                        0.10045920312404633,
                        0,
                        -0.022028151899576187,
                        0.11485029011964798,
                        -0.9931386113166809,
                        0,
                        -0.747897207736969,
                        -0.6611097455024719,
                        -0.05986468121409416,
                        0,
                        0.014748590067029,
                        0.4741367697715759,
                        -0.5338929295539856,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.007611672393977642,
            "position": [0.014748590067029, 0.4741367697715759, -0.5338929295539856],
            "quaternion": [-0.2653136230587124, -0.6778945496131789, 0.61006842594688, 0.3128644701574486]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "6F22D088-2A0B-4C1E-BB05-A368C6355895",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.6961904764175415,
                        0.7164872884750366,
                        0.04432748258113861,
                        0,
                        0.42936527729034424,
                        0.46509793400764465,
                        -0.7741638422012329,
                        0,
                        -0.5752951502799988,
                        -0.519932746887207,
                        -0.631431519985199,
                        0,
                        0.03462275490164757,
                        0.49170470237731934,
                        -0.5323021411895752,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.007231088820844889,
            "position": [0.03462275490164757, 0.49170470237731934, -0.5323021411895752],
            "quaternion": [0.34283489826274616, 0.8355716244227323, -0.38718893898147905, -0.18538883063206751]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "2F17CB65-19C8-4EFD-A488-1DCA8A8220CC",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.6961904764175415,
                        0.7164872884750366,
                        0.04432748258113861,
                        0,
                        0.42936527729034424,
                        0.46509793400764465,
                        -0.7741638422012329,
                        0,
                        -0.5752951502799988,
                        -0.519932746887207,
                        -0.631431519985199,
                        0,
                        0.04948750138282776,
                        0.5049158334732056,
                        -0.5181982517242432,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0,
            "position": [0.04948750138282776, 0.5049158334732056, -0.5181982517242432],
            "quaternion": [0.34283489826274616, 0.8355716244227323, -0.38718893898147905, -0.18538883063206751]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "698EF6E7-C8E2-484F-8871-7B0CF2B6EF3A",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.7253586649894714,
                        0.667923092842102,
                        -0.16653358936309814,
                        0,
                        -0.4838096797466278,
                        -0.6667560935020447,
                        -0.5668901801109314,
                        0,
                        -0.4896763563156128,
                        -0.3306281566619873,
                        0.806784987449646,
                        0,
                        -0.010770200751721859,
                        0.4236747622489929,
                        -0.4596744775772095,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.018382517620921135,
            "position": [-0.010770200751721859, 0.4236747622489929, -0.4596744775772095],
            "quaternion": [-0.1834478017217858, -0.25090714572042555, 0.8942734219667448, 0.3219744633255287]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "D758415D-344F-44FD-A4A1-5D32D363B126",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.6623788475990295,
                        0.748819887638092,
                        0.022866904735565186,
                        0,
                        -0.6927666068077087,
                        -0.6006062626838684,
                        -0.3991823196411133,
                        0,
                        -0.2851816415786743,
                        -0.2802513539791107,
                        0.9165863394737244,
                        0,
                        0.011582685634493828,
                        0.43877023458480835,
                        -0.49650445580482483,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.008483353070914745,
            "position": [0.011582685634493828, 0.43877023458480835, -0.49650445580482483],
            "quaternion": [-0.07355435847302422, -0.1905165753624684, 0.891567658376206, 0.40422803143689506]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "418A1034-DB6A-497F-ABEE-BC3E96ED678A",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.7031025886535645,
                        0.6986580491065979,
                        -0.13237813115119934,
                        0,
                        0.17720675468444824,
                        -0.008135716430842876,
                        -0.9841400384902954,
                        0,
                        -0.6886542439460754,
                        -0.7154096364974976,
                        -0.11808668822050095,
                        0,
                        0.020343583077192307,
                        0.4473796784877777,
                        -0.5246623754501343,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.0067641944624483585,
            "position": [0.020343583077192307, 0.4473796784877777, -0.5246623754501343],
            "quaternion": [0.3252383215780087, 0.6732483760674203, -0.6311005292506873, -0.20656422797571578]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "E6CA58C7-98F5-4781-B54B-FDFDC1B39B9C",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.7597636580467224,
                        0.6293258666992188,
                        -0.1634271740913391,
                        0,
                        0.47395357489585876,
                        0.36396998167037964,
                        -0.801806628704071,
                        0,
                        -0.44511497020721436,
                        -0.6866403222084045,
                        -0.5748023390769958,
                        0,
                        0.034331101924180984,
                        0.4619106352329254,
                        -0.5222638845443726,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.0064259846694767475,
            "position": [0.034331101924180984, 0.4619106352329254, -0.5222638845443726],
            "quaternion": [0.3358082708280429, 0.8213610503907919, -0.4530428280114991, -0.08573812531049449]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "C1928401-EC77-496B-B430-98500DE510BC",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.7597636580467224,
                        0.6293258666992188,
                        -0.1634271740913391,
                        0,
                        0.47395357489585876,
                        0.36396998167037964,
                        -0.801806628704071,
                        0,
                        -0.44511497020721436,
                        -0.6866403222084045,
                        -0.5748023390769958,
                        0,
                        0.04447818547487259,
                        0.47756117582321167,
                        -0.5106781721115112,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0,
            "position": [0.04447818547487259, 0.47756117582321167, -0.5106781721115112],
            "quaternion": [0.3358082708280429, 0.8213610503907919, -0.4530428280114991, -0.08573812531049449]
        }
    ]
};
const hand1example1 = {
    "num": 0,
    "hand": [
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "9DAA0773-DDF6-4404-A28A-2C668C3BFBA4",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.19286872446537018,
                        -0.28956589102745056,
                        -0.9375252723693848,
                        0,
                        0.9803032875061035,
                        0.0154646635055542,
                        0.1968926191329956,
                        0,
                        -0.04251489043235779,
                        -0.9570333957672119,
                        0.28684499859809875,
                        0,
                        0.1562340259552002,
                        0.4428292512893677,
                        -0.38784313201904297,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.02346085011959076,
            "position": [0.1562340259552002, 0.4428292512893677, -0.38784313201904297],
            "quaternion": [0.4718472000381117, 0.3659750751584187, -0.5192570662426605, 0.6113874085520974]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "4A179367-DF04-42B3-B20C-6EADBA7194C3",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.7691854238510132,
                        0.6205624938011169,
                        0.15250195562839508,
                        0,
                        -0.0685780718922615,
                        -0.15710806846618652,
                        0.9851977825164795,
                        0,
                        0.6353358030319214,
                        -0.768257737159729,
                        -0.07828815281391144,
                        0,
                        0.13216614723205566,
                        0.48531895875930786,
                        -0.3778654932975769,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.018382512032985687,
            "position": [0.13216614723205566, 0.48531895875930786, -0.3778654932975769],
            "quaternion": [0.7079161586908952, 0.19493275135449015, 0.2782241526832258, 0.6192311810442017]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "C9C60F0A-403E-45E9-BD08-34FC1D6D7A9A",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.8469144701957703,
                        0.5315549969673157,
                        0.013646000064909458,
                        0,
                        -0.2643226981163025,
                        0.39859405159950256,
                        0.8782122731208801,
                        0,
                        0.4613787829875946,
                        -0.7473773956298828,
                        0.47807690501213074,
                        0,
                        0.1115095317363739,
                        0.5102972388267517,
                        -0.3753201365470886,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.010282955132424831,
            "position": [0.1115095317363739, 0.5102972388267517, -0.3753201365470886],
            "quaternion": [0.49250467920744834, 0.13564952498636546, 0.24112693214565767, 0.8251643169234629]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "19C368EB-FB67-448C-B73E-9B3B7C817209",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.7466028332710266,
                        0.6610518097877502,
                        0.074806809425354,
                        0,
                        -0.5554159879684448,
                        0.5574693083763123,
                        0.6170428991317749,
                        0,
                        0.3661947250366211,
                        -0.502234697341919,
                        0.783366322517395,
                        0,
                        0.09591811895370483,
                        0.5355534553527832,
                        -0.3914758265018463,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.009768807329237461,
            "position": [0.09591811895370483, 0.5355534553527832, -0.3914758265018463],
            "quaternion": [0.31849939162697166, 0.08291673218449602, 0.34615556601398106, 0.8785552214713847]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "01F02132-C771-4DDF-9184-9085D577C5B1",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.7466028332710266,
                        0.6610518097877502,
                        0.074806809425354,
                        0,
                        -0.5554159879684448,
                        0.5574693083763123,
                        0.6170428991317749,
                        0,
                        0.3661947250366211,
                        -0.502234697341919,
                        0.783366322517395,
                        0,
                        0.08684321492910385,
                        0.5489194393157959,
                        -0.41005557775497437,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0,
            "position": [0.08684321492910385, 0.5489194393157959, -0.41005557775497437],
            "quaternion": [0.31849939162697166, 0.08291673218449602, 0.34615556601398106, 0.8785552214713847]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "B0DBFCEC-A174-4E0D-A431-6153ACB3CB88",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.19663263857364655,
                        -0.09682383388280869,
                        -0.9756849408149719,
                        0,
                        0.9602919816970825,
                        0.21989955008029938,
                        0.17170831561088562,
                        0,
                        0.19792714715003967,
                        -0.9707058072090149,
                        0.1362185776233673,
                        0,
                        0.14568041265010834,
                        0.4865484833717346,
                        -0.3865744471549988,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.018382512032985687,
            "position": [0.14568041265010834, 0.4865484833717346, -0.3865744471549988],
            "quaternion": [0.4583979130774683, 0.47091621207867723, -0.42417168496571367, 0.6230470737922131]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "4421D579-4C47-4D57-9734-A86596720879",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.266010046005249,
                        -0.5265747904777527,
                        -0.8074391484260559,
                        0,
                        0.7425909638404846,
                        0.6460259556770325,
                        -0.17666257917881012,
                        0,
                        0.6146525144577026,
                        -0.5526028275489807,
                        0.5628789067268372,
                        0,
                        0.1486007571220398,
                        0.5414071679115295,
                        -0.39474037289619446,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.010295257903635502,
            "position": [0.1486007571220398, 0.5414071679115295, -0.39474037289619446],
            "quaternion": [0.11948369891112504, 0.45197812914488683, -0.40337422745773804, 0.7865930644825675]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "0A08FB19-2C8B-47F6-A0BB-997FCB3CC7EF",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.2367863804101944,
                        -0.5653656721115112,
                        -0.7901228666305542,
                        0,
                        -0.24113668501377106,
                        0.7536051273345947,
                        -0.6115003228187561,
                        0,
                        0.9411618709564209,
                        0.33532261848449707,
                        0.04211301729083061,
                        0,
                        0.12528865039348602,
                        0.5623658895492554,
                        -0.41608884930610657,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.00803810078650713,
            "position": [0.12528865039348602, 0.5623658895492554, -0.41608884930610657],
            "quaternion": [-0.3320649011164432, 0.6071872835869364, -0.11371192131563662, 0.7128296451800744]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "8F918457-E6A8-4ACB-9C7A-F0F21CB3B7B7",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.29052069783210754,
                        -0.5669233798980713,
                        -0.7708411812782288,
                        0,
                        -0.5271903276443481,
                        0.5774574875831604,
                        -0.623388946056366,
                        0,
                        0.7985416054725647,
                        0.5874872803688049,
                        -0.13111309707164764,
                        0,
                        0.10241498053073883,
                        0.5542163848876953,
                        -0.4171123504638672,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.007636195980012417,
            "position": [0.10241498053073883, 0.5542163848876953, -0.4171123504638672],
            "quaternion": [-0.45939533550883227, 0.5954094835684985, -0.015074342029010368, 0.6589508606882715]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "947E220F-7946-4985-BE31-F2555BF99F7D",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.29052069783210754,
                        -0.5669233798980713,
                        -0.7708411812782288,
                        0,
                        -0.5271903276443481,
                        0.5774574875831604,
                        -0.623388946056366,
                        0,
                        0.7985416054725647,
                        0.5874872803688049,
                        -0.13111309707164764,
                        0,
                        0.08410236239433289,
                        0.5415024757385254,
                        -0.4150471091270447,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0,
            "position": [0.08410236239433289, 0.5415024757385254, -0.4150471091270447],
            "quaternion": [-0.45939533550883227, 0.5954094835684985, -0.015074342029010368, 0.6589508606882715]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "483A670C-B8E7-49AD-BEC0-34BEA5FA6B41",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.07441002130508423,
                        -0.28028255701065063,
                        -0.9570292234420776,
                        0,
                        0.979229211807251,
                        0.20204558968544006,
                        0.016963548958301544,
                        0,
                        0.18860891461372375,
                        -0.9384132027626038,
                        0.2894950807094574,
                        0,
                        0.1481090933084488,
                        0.4827496409416199,
                        -0.39836814999580383,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.018382512032985687,
            "position": [0.1481090933084488, 0.4827496409416199, -0.39836814999580383],
            "quaternion": [0.3817294149244727, 0.4577500606507311, -0.503249314898915, 0.6256897496438985]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "C8AA9D9B-22FF-444B-A6AC-9483380475D4",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.18032538890838623,
                        -0.30398160219192505,
                        -0.935456395149231,
                        0,
                        0.43158337473869324,
                        0.8790599703788757,
                        -0.2024601250886917,
                        0,
                        0.883866012096405,
                        -0.36721858382225037,
                        0.2897101044654846,
                        0,
                        0.15747448801994324,
                        0.5348266959190369,
                        -0.4141615331172943,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.01117393746972084,
            "position": [0.15747448801994324, 0.5348266959190369, -0.4141615331172943],
            "quaternion": [0.05374863663019702, 0.5935116447103838, -0.23996096014927928, 0.7663378819148942]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "9797C99B-EFB7-4BB7-82CA-084D1736463C",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.17941495776176453,
                        -0.32950079441070557,
                        -0.9269522428512573,
                        0,
                        -0.9256824851036072,
                        0.2624463737010956,
                        -0.2724601626396179,
                        0,
                        0.33305099606513977,
                        0.90694659948349,
                        -0.25792622566223145,
                        0,
                        0.11953277885913849,
                        0.5505902767181396,
                        -0.42659792304039,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.008030957542359829,
            "position": [0.11953277885913849, 0.5505902767181396, -0.42659792304039],
            "quaternion": [-0.5419627938099828, 0.5789985975919523, 0.2739583702476414, 0.5440439003274339]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "E8D16502-5480-4C14-A24D-A38748AA37B7",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.3293990194797516,
                        -0.3401811122894287,
                        -0.8807805776596069,
                        0,
                        -0.8636491298675537,
                        -0.4855535626411438,
                        -0.1354583203792572,
                        0,
                        -0.3815854489803314,
                        0.8053047060966492,
                        -0.45373770594596863,
                        0,
                        0.110357366502285,
                        0.5256043076515198,
                        -0.4194921553134918,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.007629409898072481,
            "position": [0.110357366502285, 0.5256043076515198, -0.4194921553134918],
            "quaternion": [-0.7531084788722278, 0.399620263686302, 0.4190515920903497, 0.31229317486713154]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "67706B03-BBCF-4669-AF3B-29BD9258199D",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.3293990194797516,
                        -0.3401811122894287,
                        -0.8807805776596069,
                        0,
                        -0.8636491298675537,
                        -0.4855535626411438,
                        -0.1354583203792572,
                        0,
                        -0.3815854489803314,
                        0.8053047060966492,
                        -0.45373770594596863,
                        0,
                        0.119003064930439,
                        0.5048426985740662,
                        -0.40859055519104004,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0,
            "position": [0.119003064930439, 0.5048426985740662, -0.40859055519104004],
            "quaternion": [-0.7531084788722278, 0.399620263686302, 0.4190515920903497, 0.31229317486713154]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "17AFD5AB-C771-47D2-8715-019DC33A662E",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.04920521751046181,
                        -0.4514414966106415,
                        -0.8909429907798767,
                        0,
                        0.9788135290145874,
                        0.15571223199367523,
                        -0.13295763731002808,
                        0,
                        0.19875329732894897,
                        -0.8786093592643738,
                        0.4342151880264282,
                        0,
                        0.1502055674791336,
                        0.4765684902667999,
                        -0.40832072496414185,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.018382512032985687,
            "position": [0.1502055674791336, 0.4765684902667999, -0.40832072496414185],
            "quaternion": [0.30036120624217405, 0.4389482470553005, -0.5761311009005096, 0.6206291459212917]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "96D3DD78-BE21-4589-930B-BE18D9766AFC",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.0948185920715332,
                        -0.35841819643974304,
                        -0.9287335872650146,
                        0,
                        0.30725935101509094,
                        0.8979238271713257,
                        -0.31515854597091675,
                        0,
                        0.9468903541564941,
                        -0.2554791569709778,
                        0.19526717066764832,
                        0,
                        0.15697263181209564,
                        0.5225538611412048,
                        -0.43094417452812195,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.009922139346599579,
            "position": [0.15697263181209564, 0.5225538611412048, -0.43094417452812195],
            "quaternion": [-0.020172941513245835, 0.6340027423970973, -0.2250138426185261, 0.7395960692795142]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "C3C36205-6BEE-47CC-B64B-A612E25A29AF",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.09095363318920135,
                        -0.4431803226470947,
                        -0.8918064832687378,
                        0,
                        -0.8931962251663208,
                        0.35969915986061096,
                        -0.26984667778015137,
                        0,
                        0.4403727948665619,
                        0.8211017847061157,
                        -0.363131046295166,
                        0,
                        0.12004759907722473,
                        0.5325165390968323,
                        -0.4385588467121124,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.007611674256622791,
            "position": [0.12004759907722473, 0.5325165390968323, -0.4385588467121124],
            "quaternion": [-0.5230644009416857, 0.6387245968167607, 0.21576393665473204, 0.5214215622009075]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "2D58ACAA-8385-42C4-8396-682F1A6EA4E6",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.13241373002529144,
                        -0.4940167963504791,
                        -0.8593103885650635,
                        0,
                        -0.9349393844604492,
                        -0.35016068816185,
                        0.05723939836025238,
                        0,
                        -0.329173743724823,
                        0.7958238124847412,
                        -0.5082417130470276,
                        0,
                        0.1083453968167305,
                        0.5106971263885498,
                        -0.42890921235084534,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.007231090217828751,
            "position": [0.1083453968167305, 0.5106971263885498, -0.42890921235084534],
            "quaternion": [-0.7054813527496293, 0.5063761938800121, 0.42116064915372026, 0.2617306225846766]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "94F4B783-567F-4BCE-A43A-821FCF2AE4B9",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        0.13241373002529144,
                        -0.4940167963504791,
                        -0.8593103885650635,
                        0,
                        -0.9349393844604492,
                        -0.35016068816185,
                        0.05723939836025238,
                        0,
                        -0.329173743724823,
                        0.7958238124847412,
                        -0.5082417130470276,
                        0,
                        0.11488352715969086,
                        0.49064725637435913,
                        -0.41667523980140686,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0,
            "position": [0.11488352715969086, 0.49064725637435913, -0.41667523980140686],
            "quaternion": [-0.7054813527496293, 0.5063761938800121, 0.42116064915372026, 0.2617306225846766]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "258C40B5-C61B-4CEF-A828-A60EB49B1F3B",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.23104241490364075,
                        -0.5267521142959595,
                        -0.8180171251296997,
                        0,
                        0.9729438424110413,
                        -0.1251143515110016,
                        -0.19423437118530273,
                        0,
                        -0.00003233856477891095,
                        -0.8407610058784485,
                        0.5414068698883057,
                        0,
                        0.15288406610488892,
                        0.4686335027217865,
                        -0.42103341221809387,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.018382512032985687,
            "position": [0.15288406610488892, 0.4686335027217865, -0.42103341221809387],
            "quaternion": [0.296928121968987, 0.3756731543436995, -0.6887603829341179, 0.544345943669899]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "4A63C390-AADE-4CFE-B1C4-DF7788826FCD",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.09694115817546844,
                        -0.4050889015197754,
                        -0.9091235995292664,
                        0,
                        0.2435189038515091,
                        0.8760095238685608,
                        -0.41630062460899353,
                        0,
                        0.9650394916534424,
                        -0.2617454528808594,
                        0.013725481927394867,
                        0,
                        0.1528850793838501,
                        0.5070160031318665,
                        -0.44574692845344543,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.008483353070914745,
            "position": [0.1528850793838501, 0.5070160031318665, -0.44574692845344543],
            "quaternion": [-0.05771501979925442, 0.699861583833407, -0.242207236336611, 0.6694762091590316]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "EDCD1C4C-022F-4500-A52D-4BDF31EE0DC6",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.011507482267916203,
                        -0.5356767773628235,
                        -0.8443449139595032,
                        0,
                        -0.8745412230491638,
                        0.4147970974445343,
                        -0.25124022364616394,
                        0,
                        0.48481515049934387,
                        0.7355231642723083,
                        -0.4732445478439331,
                        0,
                        0.12323866784572601,
                        0.5150569081306458,
                        -0.44616860151290894,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.006764191202819347,
            "position": [0.12323866784572601, 0.5150569081306458, -0.44616860151290894],
            "quaternion": [-0.5116004431090336, 0.6891206036806957, 0.17568874180591249, 0.4821941996706818]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "B2F93CC0-1114-490E-8EA4-52E94E1F8040",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.02019304223358631,
                        -0.6072394251823425,
                        -0.7942625284194946,
                        0,
                        -0.9180902242660522,
                        -0.30328062176704407,
                        0.2552090287208557,
                        0,
                        -0.39585745334625244,
                        0.734358012676239,
                        -0.5513762831687927,
                        0,
                        0.11339140683412552,
                        0.5001174211502075,
                        -0.436556339263916,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0.006425981875509024,
            "position": [0.11339140683412552, 0.5001174211502075, -0.436556339263916],
            "quaternion": [-0.6772118769778084, 0.5630915820982352, 0.4393454092497522, 0.17688288560928636]
        },
        {
            "joint": {
                "metadata": {
                    "version": 4.5,
                    "type": "Object",
                    "generator": "Object3D.toJSON"
                },
                "object": {
                    "uuid": "68A0859D-3C96-48C3-B713-06E2C13C1541",
                    "type": "Group",
                    "visible": false,
                    "layers": 1,
                    "matrix": [
                        -0.02019304223358631,
                        -0.6072394251823425,
                        -0.7942625284194946,
                        0,
                        -0.9180902242660522,
                        -0.30328062176704407,
                        0.2552090287208557,
                        0,
                        -0.39585745334625244,
                        0.734358012676239,
                        -0.5513762831687927,
                        0,
                        0.12095804512500763,
                        0.48379939794540405,
                        -0.4239627420902252,
                        1
                    ],
                    "matrixAutoUpdate": false
                }
            },
            "jointRadius": 0,
            "position": [0.12095804512500763, 0.48379939794540405, -0.4239627420902252],
            "quaternion": [-0.6772118769778084, 0.5630915820982352, 0.4393454092497522, 0.17688288560928636]
        }
    ]
}


export function fakeHand(handNum) {
    const example = handNum === 0 ? hand0example1 : hand1example1
    return {
        joints: joints
            .map((joint, jointIndex) => {
                const jointData = example.hand[jointIndex]
                // const val = { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } }
                const val = {
                    jointRadius: jointData.jointRadius,
                    position: new THREE.Vector3().fromArray(jointData.position),
                    quaternion: new THREE.Quaternion().fromArray(jointData.quaternion)
                }
                return [joint, val]
            })
            .reduce((final, [joint, val]) => {
                final[joint] = val
                return final
            }, {})
    }
}

export function fakeHand2(handNum) {
    const scale = 2
    const initPos =
        handNum === 0
            ? {
                x: 0,
                y: 0,
                z: 0
            }
            : {
                x: 1,
                y: 0,
                z: 0
            }
    const obj = {
        joints: {
            wrist: { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'thumb-metacarpal': { jointRadius: 0.003, position: { x: 0.01, y: 1, z: 0.01 } },
            'thumb-phalanx-proximal': { jointRadius: 0.003, position: { x: 0.02, y: 1, z: 0.02 } },
            'thumb-phalanx-distal': { jointRadius: 0.003, position: { x: 0.03, y: 1, z: 0.03 } },
            'thumb-tip': { jointRadius: 0.003, position: { x: 0.035, y: 1, z: 0.035 } },
            'index-finger-metacarpal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'index-finger-phalanx-proximal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'index-finger-phalanx-intermediate': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'index-finger-phalanx-distal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'index-finger-tip': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'middle-finger-metacarpal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'middle-finger-phalanx-proximal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'middle-finger-phalanx-intermediate': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'middle-finger-phalanx-distal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'middle-finger-tip': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'ring-finger-metacarpal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'ring-finger-phalanx-proximal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'ring-finger-phalanx-intermediate': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'ring-finger-phalanx-distal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'ring-finger-tip': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'pinky-finger-metacarpal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'pinky-finger-phalanx-proximal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'pinky-finger-phalanx-intermediate': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'pinky-finger-phalanx-distal': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } },
            'pinky-finger-tip': { jointRadius: 0.003, position: { x: 0, y: 1, z: 0 } }
        }
    }
    Object.keys(obj.joints).forEach((jointName) => {
        const joint = obj.joints[jointName]
        const { position } = joint
        position.x += initPos.x
        position.y += initPos.y
        position.z += initPos.z

        position.x *= scale
        position.y *= scale
        position.z *= scale
    })
    return obj
}
