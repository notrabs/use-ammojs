import { useFrame } from "@react-three/fiber";
import { isSharedArrayBufferSupported } from "../utils/utils";
import { BodyType, BufferState, SharedBuffers } from "../three-ammo/lib/types";
import { BUFFER_CONFIG } from "../three-ammo/lib/constants";
import { PhysicsPerformanceInfo, PhysicsState } from "./physics-context";
import { BufferAttribute, Matrix4, Vector3 } from "three";
import { MutableRefObject } from "react";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";

interface PhysicsUpdateProps {
  physicsState: PhysicsState;
  sharedBuffersRef: MutableRefObject<SharedBuffers>;
  threadSafeQueueRef: MutableRefObject<(() => void)[]>;
  physicsPerformanceInfoRef: MutableRefObject<PhysicsPerformanceInfo>;
}

// temporary storage
const transform = new Matrix4();
const inverse = new Matrix4();
const matrix = new Matrix4();
const scale = new Vector3();

export function PhysicsUpdate({
  physicsState,
  sharedBuffersRef,
  threadSafeQueueRef,
  physicsPerformanceInfoRef,
}: PhysicsUpdateProps) {
  useFrame(() => {
    if (!physicsState) {
      return;
    }

    const {
      workerHelpers,
      debugGeometry,
      bodyOptions,
      uuids,
      object3Ds,
      uuidToIndex,
      debugIndex,
      softBodies,
    } = physicsState;

    const sharedBuffers = sharedBuffersRef.current;

    if (
      // Check if the worker is finished with the buffer
      (!isSharedArrayBufferSupported &&
        sharedBuffers.rigidBodies.objectMatricesFloatArray.byteLength !== 0) ||
      (isSharedArrayBufferSupported &&
        Atomics.load(sharedBuffers.rigidBodies.headerIntArray, 0) ===
          BufferState.READY)
    ) {
      const lastLastTickMs = physicsPerformanceInfoRef.current.lastTickMs;

      physicsPerformanceInfoRef.current.lastTickMs =
        sharedBuffers.rigidBodies.headerFloatArray[1];
      physicsPerformanceInfoRef.current.lastTickTime =
        sharedBuffers.rigidBodies.headerFloatArray[2];

      while (threadSafeQueueRef.current.length) {
        const fn = threadSafeQueueRef.current.shift();
        fn!();
      }

      // Skip copy if the physics worker didnt update
      if (lastLastTickMs !== physicsPerformanceInfoRef.current.lastTickMs) {
        for (let i = 0; i < uuids.length; i++) {
          const uuid = uuids[i];
          const type = bodyOptions[uuid].type
            ? bodyOptions[uuid].type
            : BodyType.DYNAMIC;
          const object3D = object3Ds[uuid];
          if (type === BodyType.DYNAMIC) {
            matrix.fromArray(
              sharedBuffers.rigidBodies.objectMatricesFloatArray,
              uuidToIndex[uuid] * BUFFER_CONFIG.BODY_DATA_SIZE
            );

            inverse.copy(object3D.parent!.matrixWorld).invert();
            transform.multiplyMatrices(inverse, matrix);
            transform.decompose(object3D.position, object3D.quaternion, scale);
          } else {
            // sharedBuffers.rigidBodies.objectMatricesFloatArray.set(
            //   object3D.matrixWorld.elements,
            //   uuidToIndex[uuid] * BUFFER_CONFIG.BODY_DATA_SIZE
            // );
          }

          // print velocities
          // console.log(
          //   uuid,
          //   objectMatricesFloatArray[indexes[uuid] * BUFFER_CONFIG.BODY_DATA_SIZE + 16],
          //   objectMatricesFloatArray[indexes[uuid] * BUFFER_CONFIG.BODY_DATA_SIZE + 17]
          // );

          // print coliisions
          // const collisions = [];
          // for (let j = 18; j < 26; j++) {
          //   const collidingIndex = objectMatricesIntArray[uuidToIndex[uuid] * BUFFER_CONFIG.BODY_DATA_SIZE + j];
          //   if (collidingIndex !== -1) {
          //     collisions.push(IndexToUuid[collidingIndex]);
          //   }
          // }
          // console.log(uuid, collisions);
        }

        for (const softBodyBuffers of sharedBuffersRef.current.softBodies) {
          const softBodyMesh = softBodies[softBodyBuffers.uuid];

          if (softBodyMesh) {
            if ((softBodyMesh.geometry as LineGeometry).isLineGeometry) {
              (softBodyMesh.geometry as LineGeometry).setPositions(
                softBodyBuffers.vertexFloatArray
              );
              softBodyMesh.geometry.attributes.instanceStart.needsUpdate = true;
              softBodyMesh.geometry.attributes.instanceEnd.needsUpdate = true;
            } else {
              if (!isSharedArrayBufferSupported) {
                (softBodyMesh.geometry.attributes
                  .position as BufferAttribute).copyArray(
                  softBodyBuffers.vertexFloatArray
                );
                (softBodyMesh.geometry.attributes
                  .normal as BufferAttribute).copyArray(
                  softBodyBuffers.normalFloatArray
                );
              }

              softBodyMesh.geometry.attributes.position.needsUpdate = true;
              if (softBodyMesh.geometry.attributes.normal) {
                softBodyMesh.geometry.attributes.normal.needsUpdate = true;
              }
            }
          }
        }
      }

      if (isSharedArrayBufferSupported) {
        Atomics.store(
          sharedBuffers.rigidBodies.headerIntArray,
          0,
          BufferState.CONSUMED
        );
      } else {
        workerHelpers.transferSharedBuffers(sharedBuffersRef.current);
      }
    }

    if (isSharedArrayBufferSupported) {
      /* DEBUG RENDERING */
      const index = Atomics.load(debugIndex, 0);
      if (!!index) {
        debugGeometry.attributes.position.needsUpdate = true;
        debugGeometry.attributes.color.needsUpdate = true;
        debugGeometry.setDrawRange(0, index);
      }
      Atomics.store(debugIndex, 0, 0);
    }
  });

  return null;
}
