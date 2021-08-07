import {
  BufferAttribute,
  BufferGeometry,
  DynamicDrawUsage,
  Matrix4,
  Mesh,
  Object3D,
  Vector3,
} from "three";
import React, {
  MutableRefObject,
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFrame } from "@react-three/fiber";
import { DefaultBufferSize } from "ammo-debug-drawer";
import { AmmoPhysicsContext } from "./physics-context";
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
  BodyType,
  BufferState,
  ClientMessageType,
  SharedBuffers,
  SharedSoftBodyBuffers,
  SoftBodyConfig,
  UUID,
  WorldConfig,
} from "../three-ammo/lib/types";
import { BUFFER_CONFIG } from "../three-ammo/lib/constants";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";

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

interface PhysicsState {
  workerHelpers: ReturnType<typeof WorkerHelpers>;
  debugGeometry: BufferGeometry;
  debugBuffer: SharedArrayBuffer | ArrayBuffer;
  bodyOptions: Record<UUID, BodyConfig>;
  uuids: UUID[];
  object3Ds: Record<UUID, Object3D>;
  softBodies: Record<UUID, Mesh>;
  sharedBuffersRef: MutableRefObject<SharedBuffers>;
  uuidToIndex: Record<UUID, number>;
  debugIndex: Uint32Array;
  addRigidBody(uuid: UUID, mesh: Object3D, options?: BodyConfig);
  removeRigidBody(uuid: UUID);
  addSoftBody(uuid: UUID, mesh: Object3D, options?: SoftBodyConfig);
  removeSoftBody(uuid: UUID);
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
        if (event.data.type === ClientMessageType.READY) {
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
          });
        } else if (event.data.type === ClientMessageType.RIGIDBODY_READY) {
          const uuid = event.data.uuid;
          uuids.push(uuid);
          uuidToIndex[uuid] = event.data.index;
          IndexToUuid[event.data.index] = uuid;
        } else if (event.data.type === ClientMessageType.SOFTBODY_READY) {
          sharedBuffersRef.current.softBodies.push(
            event.data.sharedSoftBodyBuffers
          );
        } else if (event.data.type === ClientMessageType.TRANSFER_BUFFERS) {
          sharedBuffersRef.current = event.data.sharedBuffers;
        }
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
          softBodyMesh.geometry.attributes.position.needsUpdate = true;
          softBodyMesh.geometry.attributes.normal.needsUpdate = true;
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
