import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Mesh,
  Object3D,
  Vector3,
} from "three";
import React, { PropsWithChildren, useEffect, useRef, useState } from "react";
import { DefaultBufferSize } from "ammo-debug-drawer";
import {
  AmmoPhysicsContext,
  PhysicsPerformanceInfo,
  PhysicsState,
} from "./physics-context";
import {
  allocateCompatibleBuffer,
  AmmoDebugOptions,
  ammoDebugOptionsToNumber,
  isSharedArrayBufferSupported,
} from "../utils/utils";
import {
  createAmmoWorker,
  WorkerHelpers,
} from "../three-ammo/lib/worker-helper";
import {
  BodyConfig,
  BufferState,
  ClientMessageType,
  MessageType,
  RaycastHit,
  RaycastHitMessage,
  RaycastOptions,
  SharedBuffers,
  SharedSoftBodyBuffers,
  SoftBodyConfig,
  UUID,
  WorldConfig,
} from "../three-ammo/lib/types";
import { BUFFER_CONFIG } from "../three-ammo/lib/constants";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";
import { PhysicsUpdate } from "./physics-update";
import { PhysicsDebug } from "./physics-debug";

interface AmmoPhysicsProps {
  // Draw a collision debug mesh into the scene
  drawDebug?: boolean;

  // Configures the debug options (not all options are tested)
  drawDebugMode?: AmmoDebugOptions;

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

  // default = 1
  simulationSpeed?: number;
}

const DEFAULT_DEBUG_MODE = { DrawWireframe: true };

export function Physics({
  drawDebug,
  drawDebugMode = DEFAULT_DEBUG_MODE,
  gravity,
  epsilon,
  fixedTimeStep,
  maxSubSteps,
  solverIterations,
  simulationSpeed = 1,
  children,
}: PropsWithChildren<AmmoPhysicsProps>) {
  const [physicsState, setPhysicsState] = useState<PhysicsState>();

  const sharedBuffersRef = useRef<SharedBuffers>({} as any);

  // Functions that are executed while the main thread holds control over the shared data
  const threadSafeQueueRef = useRef<(() => void)[]>([]);

  const physicsPerformanceInfoRef = useRef<PhysicsPerformanceInfo>({
    lastTickTime: 0,
    lastTickMs: 0,
  });

  useEffect(() => {
    const uuids: string[] = [];
    const object3Ds: Record<string, Object3D> = {};
    const uuidToIndex: Record<string, number> = {};
    const IndexToUuid: Record<number, string> = {};
    const bodyOptions: Record<string, BodyConfig> = {};

    const softBodies: Record<UUID, Mesh> = {};

    const ammoWorker: Worker = createAmmoWorker();

    const workerHelpers = WorkerHelpers(ammoWorker);

    const rigidBodyBuffer = allocateCompatibleBuffer(
      4 * BUFFER_CONFIG.HEADER_LENGTH + //header
        4 * BUFFER_CONFIG.BODY_DATA_SIZE * BUFFER_CONFIG.MAX_BODIES + //matrices
        4 * BUFFER_CONFIG.MAX_BODIES //velocities
    );
    const headerIntArray = new Int32Array(
      rigidBodyBuffer,
      0,
      BUFFER_CONFIG.HEADER_LENGTH
    );
    const headerFloatArray = new Float32Array(
      rigidBodyBuffer,
      0,
      BUFFER_CONFIG.HEADER_LENGTH
    );
    const objectMatricesIntArray = new Int32Array(
      rigidBodyBuffer,
      BUFFER_CONFIG.HEADER_LENGTH * 4,
      BUFFER_CONFIG.BODY_DATA_SIZE * BUFFER_CONFIG.MAX_BODIES
    );
    const objectMatricesFloatArray = new Float32Array(
      rigidBodyBuffer,
      BUFFER_CONFIG.HEADER_LENGTH * 4,
      BUFFER_CONFIG.BODY_DATA_SIZE * BUFFER_CONFIG.MAX_BODIES
    );

    objectMatricesIntArray[0] = BufferState.UNINITIALIZED;

    const debugBuffer = allocateCompatibleBuffer(4 + 2 * DefaultBufferSize * 4);
    const debugIndex = new Uint32Array(debugBuffer, 0, 4);
    const debugVertices = new Float32Array(debugBuffer, 4, DefaultBufferSize);
    const debugColors = new Float32Array(
      debugBuffer,
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

    sharedBuffersRef.current = {
      rigidBodies: {
        headerIntArray,
        headerFloatArray,
        objectMatricesFloatArray,
        objectMatricesIntArray,
      },

      softBodies: [],

      debug: {
        indexIntArray: debugIndex,
        vertexFloatArray: debugVertices,
        colorFloatArray: debugColors,
      },
    };

    const worldConfig: WorldConfig = {
      debugDrawMode: ammoDebugOptionsToNumber(drawDebugMode),
      gravity: gravity && new Vector3(gravity[0], gravity[1], gravity[2]),
      epsilon,
      fixedTimeStep,
      maxSubSteps,
      solverIterations,
    };

    workerHelpers.initWorld(worldConfig, sharedBuffersRef.current);

    const workerInitPromise = new Promise<PhysicsState>((resolve) => {
      ammoWorker.onmessage = async (event) => {
        const type: ClientMessageType = event.data.type;

        switch (type) {
          case ClientMessageType.READY: {
            if (event.data.sharedBuffers) {
              sharedBuffersRef.current = event.data.sharedBuffers;
            }

            resolve({
              workerHelpers,
              sharedBuffersRef,
              debugGeometry,
              debugBuffer,
              bodyOptions,
              uuids,
              object3Ds,
              softBodies,
              uuidToIndex,
              debugIndex,
              addRigidBody,
              removeRigidBody,
              addSoftBody,
              removeSoftBody,
              rayTest,
            });
            return;
          }
          case ClientMessageType.RIGIDBODY_READY: {
            const uuid = event.data.uuid;
            uuids.push(uuid);
            uuidToIndex[uuid] = event.data.index;
            IndexToUuid[event.data.index] = uuid;
            return;
          }
          case ClientMessageType.SOFTBODY_READY: {
            threadSafeQueueRef.current.push(() => {
              sharedBuffersRef.current.softBodies.push(
                event.data.sharedSoftBodyBuffers
              );
            });
            return;
          }
          case ClientMessageType.TRANSFER_BUFFERS: {
            sharedBuffersRef.current = event.data.sharedBuffers;
            return;
          }
          case ClientMessageType.RAYCAST_RESPONSE: {
            workerHelpers.resolveAsyncRequest(event.data);
            return;
          }
        }
        throw new Error("unknown message type" + type);
      };
    });

    workerInitPromise.then(setPhysicsState);

    function addRigidBody(uuid, mesh, options: BodyConfig = {}) {
      bodyOptions[uuid] = options;
      object3Ds[uuid] = mesh;

      workerHelpers.addRigidBody(uuid, mesh, options);
    }

    function removeRigidBody(uuid: string) {
      uuids.splice(uuids.indexOf(uuid), 1);
      delete IndexToUuid[uuidToIndex[uuid]];
      delete uuidToIndex[uuid];
      delete bodyOptions[uuid];
      delete object3Ds[uuid];
      workerHelpers.removeRigidBody(uuid);
    }

    function addSoftBody(uuid: UUID, mesh: Mesh, options: SoftBodyConfig = {}) {
      if (!mesh.geometry) {
        console.error("useSoftBody received: ", mesh);
        throw new Error("useSoftBody is only supported on BufferGeometries");
      }

      // console.log("before merge ", mesh.geometry.attributes.position.count);
      mesh.geometry.deleteAttribute("normal");
      mesh.geometry.deleteAttribute("uv");
      mesh.geometry = BufferGeometryUtils.mergeVertices(mesh.geometry);
      mesh.geometry.computeVertexNormals();
      // console.log("after merge ", mesh.geometry.attributes.position.count);

      const indexLength =
        mesh.geometry.index.count * mesh.geometry.index.itemSize;
      const vertexLength =
        mesh.geometry.attributes.position.count *
        mesh.geometry.attributes.position.itemSize;
      const normalLength =
        mesh.geometry.attributes.normal.count *
        mesh.geometry.attributes.normal.itemSize;

      const buffer = allocateCompatibleBuffer(
        indexLength * 4 + vertexLength * 4 + normalLength * 4
      );

      const sharedSoftBodyBuffers: SharedSoftBodyBuffers = {
        uuid,
        indexIntArray: new (indexLength > 65535 ? Uint32Array : Uint16Array)(
          buffer,
          0,
          indexLength
        ),
        vertexFloatArray: new Float32Array(
          buffer,
          indexLength * 4,
          vertexLength
        ),
        normalFloatArray: new Float32Array(
          buffer,
          indexLength * 4 + vertexLength * 4,
          normalLength
        ),
      };

      // Bullet softbodies operate in world-space,
      // so the transform needs to be baked into the vertex data
      mesh.updateMatrixWorld(true);
      mesh.geometry.applyMatrix4(mesh.matrixWorld);

      mesh.position.set(0, 0, 0);
      mesh.quaternion.set(0, 0, 0, 1);
      mesh.scale.set(1, 1, 1);

      mesh.frustumCulled = false;

      sharedSoftBodyBuffers.indexIntArray.set(mesh.geometry.index.array);
      sharedSoftBodyBuffers.vertexFloatArray.set(
        mesh.geometry.attributes.position.array
      );
      sharedSoftBodyBuffers.normalFloatArray.set(
        mesh.geometry.attributes.normal.array
      );

      if (isSharedArrayBufferSupported) {
        mesh.geometry.setAttribute(
          "position",
          new BufferAttribute(
            sharedSoftBodyBuffers.vertexFloatArray,
            3
          ).setUsage(DynamicDrawUsage)
        );
        mesh.geometry.setAttribute(
          "normal",
          new BufferAttribute(
            sharedSoftBodyBuffers.normalFloatArray,
            3
          ).setUsage(DynamicDrawUsage)
        );
      }

      softBodies[uuid] = mesh;

      workerHelpers.addSoftBody(uuid, sharedSoftBodyBuffers, options);
    }

    function removeSoftBody(uuid: string) {
      delete softBodies[uuid];
      workerHelpers.removeSoftBody(uuid);

      sharedBuffersRef.current.softBodies = sharedBuffersRef.current.softBodies.filter(
        (ssbb) => ssbb.uuid !== uuid
      );
    }

    async function rayTest(options: RaycastOptions): Promise<RaycastHit[]> {
      const { hits } = await workerHelpers.makeAsyncRequest({
        type: MessageType.RAYCAST_REQUEST,
        ...options,
      });

      return hits.map(
        (hit: RaycastHitMessage): RaycastHit => {
          return {
            object: object3Ds[hit.uuid] || softBodies[hit.uuid],

            hitPosition: new Vector3(
              hit.hitPosition.x,
              hit.hitPosition.y,
              hit.hitPosition.z
            ),

            normal: new Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
          };
        }
      );
    }

    return () => {
      ammoWorker.terminate();
      setPhysicsState(undefined);
    };
  }, []);

  useEffect(() => {
    if (!isSharedArrayBufferSupported) {
      if (drawDebug) {
        console.warn("debug visuals require SharedArrayBuffer support");
      }
      return;
    }

    if (physicsState) {
      if (drawDebug) {
        workerHelpers.enableDebug(true, physicsState.debugBuffer);
      } else {
        workerHelpers.enableDebug(false, physicsState.debugBuffer);
      }
    }
  }, [drawDebug, physicsState]);

  useEffect(() => {
    if (physicsState?.workerHelpers) {
      workerHelpers.setSimulationSpeed(simulationSpeed);
    }
  }, [physicsState?.workerHelpers, simulationSpeed]);

  if (!physicsState) {
    return null;
  }

  const { workerHelpers, debugGeometry } = physicsState;

  return (
    <AmmoPhysicsContext.Provider
      value={{
        ...workerHelpers,

        // workerHelpers Overrides
        addRigidBody: physicsState.addRigidBody,
        removeRigidBody: physicsState.removeRigidBody,

        addSoftBody: physicsState.addSoftBody,
        removeSoftBody: physicsState.removeSoftBody,

        object3Ds: physicsState.object3Ds,

        rayTest: physicsState.rayTest,

        physicsPerformanceInfoRef,
      }}
    >
      <PhysicsUpdate
        {...{
          physicsState,
          sharedBuffersRef,
          threadSafeQueueRef,
          physicsPerformanceInfoRef,
        }}
      />
      {drawDebug && <PhysicsDebug geometry={debugGeometry} />}
      {children}
    </AmmoPhysicsContext.Provider>
  );
}
