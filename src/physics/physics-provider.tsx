import { CONSTANTS, createAmmoWorker, WorkerHelpers } from "three-ammo";
import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Matrix4,
  Object3D,
  Vector3
} from "three";
import React, { PropsWithChildren, useEffect, useState } from "react";
import { useFrame } from "react-three-fiber";
import { AmmoDebugConstants, DefaultBufferSize } from "ammo-debug-drawer";
import { AmmoPhysicsContext, BodyOptions, WorldOptions } from "physics/physics-context";

interface AmmoPhysicsProps {
  // Draw a collision debug mesh into the scene
  drawDebug?: boolean;

  // default = [0, -9.8, 0]
  gravity?: [number, number, number];

  // default = 10e-6
  epsilon?: number;

  // default = 1/60
  fixedTimeStep?: number;

  // default = 4
  maxSubSteps?: number;

  // default = 10
  solverIterations?: number;
}

interface PhysicsState {
  workerHelpers;
  debugGeometry;
  debugSharedArrayBuffer;
  bodyOptions;
  uuids;
  headerIntArray;
  object3Ds;
  objectMatricesFloatArray;
  uuidToIndex;
  debugIndex;
  addBody;
  removeBody;
}

export function Physics({
  drawDebug,
  gravity,
  epsilon,
  fixedTimeStep,
  maxSubSteps,
  solverIterations,
  children
}: PropsWithChildren<AmmoPhysicsProps>) {
  const [physicsState, setPhysicsState] = useState<PhysicsState>();

  useEffect(() => {
    const uuids: string[] = [];
    const object3Ds: Record<string, Object3D> = {};
    const uuidToIndex: Record<string, number> = {};
    const IndexToUuid: Record<number, string> = {};
    const bodyOptions: Record<string, BodyOptions> = {};

    const ammoWorker: Worker = createAmmoWorker();

    const workerHelpers = WorkerHelpers(ammoWorker);

    const sharedArrayBuffer = new SharedArrayBuffer(
      4 * CONSTANTS.BUFFER_CONFIG.HEADER_LENGTH + //header
      4 *
        CONSTANTS.BUFFER_CONFIG.BODY_DATA_SIZE *
        CONSTANTS.BUFFER_CONFIG.MAX_BODIES + //matrices
        4 * CONSTANTS.BUFFER_CONFIG.MAX_BODIES //velocities
    );
    const headerIntArray = new Int32Array(
      sharedArrayBuffer,
      0,
      CONSTANTS.BUFFER_CONFIG.HEADER_LENGTH
    );
    const objectMatricesIntArray = new Int32Array(
      sharedArrayBuffer,
      CONSTANTS.BUFFER_CONFIG.HEADER_LENGTH * 4,
      CONSTANTS.BUFFER_CONFIG.BODY_DATA_SIZE *
        CONSTANTS.BUFFER_CONFIG.MAX_BODIES
    );
    const objectMatricesFloatArray = new Float32Array(
      sharedArrayBuffer,
      CONSTANTS.BUFFER_CONFIG.HEADER_LENGTH * 4,
      CONSTANTS.BUFFER_CONFIG.BODY_DATA_SIZE *
        CONSTANTS.BUFFER_CONFIG.MAX_BODIES
    );

    objectMatricesIntArray[0] = CONSTANTS.BUFFER_STATE.UNINITIALIZED;

    const debugSharedArrayBuffer = new SharedArrayBuffer(
      4 + 2 * DefaultBufferSize * 4
    );
    const debugIndex = new Uint32Array(debugSharedArrayBuffer, 0, 4);
    const debugVertices = new Float32Array(
      debugSharedArrayBuffer,
      4,
      DefaultBufferSize
    );
    const debugColors = new Float32Array(
      debugSharedArrayBuffer,
      4 + DefaultBufferSize,
      DefaultBufferSize
    );
    const debugGeometry = new BufferGeometry();
    debugGeometry.setAttribute(
      "position",
      new BufferAttribute(debugVertices, 3).setUsage(DynamicDrawUsage)
    );
    debugGeometry.setAttribute(
      "color",
      new BufferAttribute(debugColors, 3).setUsage(DynamicDrawUsage)
    );

    ammoWorker.postMessage({
      type: CONSTANTS.MESSAGE_TYPES.INIT,
      worldConfig: {
        debugDrawMode: AmmoDebugConstants.DrawWireframe,
        gravity: gravity && new Vector3(gravity[0], gravity[1], gravity[2]),
        epsilon,
        fixedTimeStep,
        maxSubSteps,
        solverIterations
      } as WorldOptions,
      sharedArrayBuffer
    });

    const workerInitPromise = new Promise<PhysicsState>(resolve => {
      ammoWorker.onmessage = async event => {
        if (event.data.type === CONSTANTS.MESSAGE_TYPES.READY) {
          resolve({
            workerHelpers,
            debugGeometry,
            debugSharedArrayBuffer,
            bodyOptions,
            uuids,
            headerIntArray,
            object3Ds,
            objectMatricesFloatArray,
            uuidToIndex,
            debugIndex,
            addBody,
            removeBody
          });
        } else if (event.data.type === CONSTANTS.MESSAGE_TYPES.BODY_READY) {
          const uuid = event.data.uuid;
          uuids.push(uuid);
          uuidToIndex[uuid] = event.data.index;
          IndexToUuid[event.data.index] = uuid;
        }
      };
    });

    workerInitPromise.then(setPhysicsState);

    function addBody(uuid, mesh, options: BodyOptions = {}) {
      bodyOptions[uuid] = options;
      object3Ds[uuid] = mesh;
      workerHelpers.addBody(uuid, mesh, options);
    }

    function removeBody(uuid) {
      uuids.splice(uuids.indexOf(uuid), 1);
      delete IndexToUuid[uuidToIndex[uuid]];
      delete uuidToIndex[uuid];
      delete bodyOptions[uuid];
      delete object3Ds[uuid];
      workerHelpers.removeBody(uuid);
    }

    return () => {
      ammoWorker.terminate();
      setPhysicsState(undefined);
    };
  }, []);

  useFrame(() => {
    const transform = new Matrix4();
    const inverse = new Matrix4();
    const matrix = new Matrix4();
    const scale = new Vector3();

    if (!physicsState) {
      return;
    }

    const {
      workerHelpers,
      debugGeometry,
      bodyOptions,
      uuids,
      headerIntArray,
      object3Ds,
      objectMatricesFloatArray,
      uuidToIndex,
      debugIndex,
      addBody,
      removeBody
    } = physicsState;

    if (Atomics.load(headerIntArray, 0) === CONSTANTS.BUFFER_STATE.READY) {
      for (let i = 0; i < uuids.length; i++) {
        const uuid = uuids[i];
        const type = bodyOptions[uuid].type
          ? bodyOptions[uuid].type
          : CONSTANTS.TYPE.DYNAMIC;
        const object3D = object3Ds[uuid];
        if (type === CONSTANTS.TYPE.DYNAMIC) {
          matrix.fromArray(
            objectMatricesFloatArray,
            uuidToIndex[uuid] * CONSTANTS.BUFFER_CONFIG.BODY_DATA_SIZE
          );
          inverse.copy(object3D.parent!.matrixWorld).invert();
          transform.multiplyMatrices(inverse, matrix);
          transform.decompose(object3D.position, object3D.quaternion, scale);
        } else {
          objectMatricesFloatArray.set(
            object3D.matrixWorld.elements,
            uuidToIndex[uuid] * CONSTANTS.BUFFER_CONFIG.BODY_DATA_SIZE
          );
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
      Atomics.store(headerIntArray, 0, CONSTANTS.BUFFER_STATE.CONSUMED);
    }

    /* DEBUG RENDERING */
    const index = Atomics.load(debugIndex, 0);
    if (!!index) {
      debugGeometry.attributes.position.needsUpdate = true;
      debugGeometry.attributes.color.needsUpdate = true;
    }
    debugGeometry.setDrawRange(0, index);
    Atomics.store(debugIndex, 0, 0);
  });

  useEffect(() => {
    if (physicsState) {
      if (drawDebug) {
        workerHelpers.enableDebug(true, physicsState.debugSharedArrayBuffer);
      } else {
        workerHelpers.enableDebug(false, physicsState.debugSharedArrayBuffer);
      }
    }
  }, [drawDebug, physicsState]);

  if (!physicsState) {
    return null;
  }

  const { workerHelpers, debugGeometry, addBody, removeBody } = physicsState;

  return (
    <AmmoPhysicsContext.Provider
      value={{
        addBody,
        removeBody,
        addShapes: workerHelpers.addShapes,
        removeShapes: workerHelpers.removeShapes,
        addConstraint: workerHelpers.addConstraint,
        removeConstraint: workerHelpers.removeConstraint,
        updateBody: workerHelpers.updateBody,
        enableDebug: workerHelpers.enableDebug,
        resetDynamicBody: workerHelpers.resetDynamicBody,
        activateBody: workerHelpers.activateBody
      }}
    >
      {drawDebug && (
        <lineSegments
          geometry={debugGeometry}
          frustumCulled={false}
          renderOrder={999}
        >
          <lineBasicMaterial
            attach="material"
            vertexColors={true}
            depthTest={true}
          />
        </lineSegments>
      )}
      {children}
    </AmmoPhysicsContext.Provider>
  );
}
