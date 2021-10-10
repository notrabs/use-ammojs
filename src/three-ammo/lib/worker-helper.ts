import { Matrix4, Object3D } from "three";
import { iterateGeometries } from "../../three-to-ammo";
import AmmoWorker from "web-worker:../worker/ammo.worker";
import {
  BodyConfig,
  MessageType,
  SerializedMesh,
  SharedBuffers,
  SharedSoftBodyBuffers,
  SoftBodyConfig,
  UUID,
  WorkerRequestId,
  WorldConfig,
} from "./types";
import { isSharedArrayBufferSupported } from "../../utils/utils";
import { ShapeDescriptor } from "../../physics";

export function createAmmoWorker(): Worker {
  return new AmmoWorker();
}

export function WorkerHelpers(ammoWorker: Worker) {
  const transform = new Matrix4();
  const inverse = new Matrix4();

  let lastRequestId: number = 0;
  let requests: Record<WorkerRequestId, (data: any) => void> = {};

  return {
    initWorld(worldConfig: WorldConfig, sharedBuffers: SharedBuffers) {
      if (isSharedArrayBufferSupported) {
        ammoWorker.postMessage({
          type: MessageType.INIT,
          worldConfig,
          sharedBuffers,
          isSharedArrayBufferSupported,
        });
      } else {
        console.warn(
          "use-ammojs uses fallback to slower ArrayBuffers. To use the faster SharedArrayBuffers make sure that your environment is crossOriginIsolated. (see https://web.dev/coop-coep/)"
        );

        ammoWorker.postMessage(
          {
            type: MessageType.INIT,
            worldConfig,
            sharedBuffers,
            isSharedArrayBufferSupported,
          },
          [
            sharedBuffers.rigidBodies.headerIntArray.buffer,
            sharedBuffers.debug.vertexFloatArray.buffer,
            ...sharedBuffers.softBodies.map((sb) => sb.vertexFloatArray.buffer),
          ]
        );
      }
    },

    async makeAsyncRequest<T = any>(data): Promise<T> {
      return new Promise((resolve) => {
        const requestId = lastRequestId++;

        requests[requestId] = resolve;

        ammoWorker.postMessage({
          ...data,
          requestId,
        });
      });
    },

    resolveAsyncRequest(data) {
      if (requests[data.requestId]) {
        requests[data.requestId](data);
        delete requests[data.requestId];
      }
    },

    transferSharedBuffers(sharedBuffers: SharedBuffers) {
      ammoWorker.postMessage(
        { type: MessageType.TRANSFER_BUFFERS, sharedBuffers },
        [
          sharedBuffers.rigidBodies.headerIntArray.buffer,
          sharedBuffers.debug.vertexFloatArray.buffer,
          ...sharedBuffers.softBodies.map((sb) => sb.vertexFloatArray.buffer),
        ]
      );
    },

    addRigidBody(
      uuid: UUID,
      mesh: Object3D,
      shapeDescriptor: ShapeDescriptor,
      options: BodyConfig
    ) {
      let serializedMesh: SerializedMesh | undefined = undefined;

      if (shapeDescriptor.meshToUse) {
        inverse.copy(mesh.parent!.matrix).invert();
        transform.multiplyMatrices(inverse, mesh.parent!.matrix);
        const vertices: any[] = [];
        const matrices: any[] = [];
        const indexes: any[] = [];

        mesh.updateMatrixWorld(true);
        iterateGeometries(mesh, options, (vertexArray, matrix, index) => {
          vertices.push(vertexArray);
          matrices.push(matrix);
          indexes.push(index);
        });

        serializedMesh = {
          vertices,
          matrices,
          indexes,
          matrixWorld: mesh.matrixWorld.elements,
        };
      }

      inverse.copy(mesh.parent!.matrixWorld).invert();
      transform.multiplyMatrices(inverse, mesh.matrixWorld);
      ammoWorker.postMessage({
        type: MessageType.ADD_RIGIDBODY,
        uuid,
        matrix: transform.elements,
        serializedMesh,
        shapeConfig: shapeDescriptor.shapeConfig,
        options,
      });
    },

    updateRigidBody(uuid, options) {
      ammoWorker.postMessage({
        type: MessageType.UPDATE_RIGIDBODY,
        uuid,
        options,
      });
    },

    removeRigidBody(uuid) {
      ammoWorker.postMessage({
        type: MessageType.REMOVE_RIGIDBODY,
        uuid,
      });
    },

    addSoftBody(
      uuid: UUID,
      sharedSoftBodyBuffers: SharedSoftBodyBuffers,
      softBodyConfig: SoftBodyConfig
    ) {
      if (isSharedArrayBufferSupported) {
        ammoWorker.postMessage({
          type: MessageType.ADD_SOFTBODY,
          uuid,
          sharedSoftBodyBuffers,
          softBodyConfig,
        });
      } else {
        ammoWorker.postMessage(
          {
            type: MessageType.ADD_SOFTBODY,
            uuid,
            sharedSoftBodyBuffers,
            softBodyConfig,
          },
          [sharedSoftBodyBuffers.vertexFloatArray.buffer]
        );
      }
    },

    removeSoftBody(uuid: UUID) {
      ammoWorker.postMessage({
        type: MessageType.REMOVE_SOFTBODY,
        uuid,
      });
    },

    bodySetShapesOffset(bodyUuid, offset) {
      ammoWorker.postMessage({
        type: MessageType.SET_SHAPES_OFFSET,
        bodyUuid,
        offset,
      });
    },

    addConstraint(constraintId, bodyAUuid, bodyBUuid, options) {
      ammoWorker.postMessage({
        type: MessageType.ADD_CONSTRAINT,
        constraintId,
        bodyAUuid,
        bodyBUuid,
        options,
      });
    },

    updateConstraint(constraintId, options) {
      ammoWorker.postMessage({
        type: MessageType.UPDATE_CONSTRAINT,
        constraintId,
        options,
      });
    },

    removeConstraint(constraintId) {
      ammoWorker.postMessage({
        type: MessageType.REMOVE_CONSTRAINT,
        constraintId,
      });
    },

    enableDebug(enable, debugSharedArrayBuffer) {
      ammoWorker.postMessage({
        type: MessageType.ENABLE_DEBUG,
        enable,
        debugSharedArrayBuffer,
      });
    },

    resetDynamicBody(uuid) {
      ammoWorker.postMessage({
        type: MessageType.RESET_DYNAMIC_BODY,
        uuid,
      });
    },

    activateBody(uuid) {
      ammoWorker.postMessage({
        type: MessageType.ACTIVATE_BODY,
        uuid,
      });
    },

    bodySetMotionState(uuid, position, rotation) {
      ammoWorker.postMessage({
        type: MessageType.SET_MOTION_STATE,
        uuid,
        position,
        rotation,
      });
    },

    bodySetLinearVelocity(uuid, velocity) {
      ammoWorker.postMessage({
        type: MessageType.SET_LINEAR_VELOCITY,
        uuid,
        velocity,
      });
    },

    bodyApplyImpulse(uuid, impulse, relativeOffset) {
      if (!relativeOffset) {
        ammoWorker.postMessage({
          type: MessageType.APPLY_CENTRAL_IMPULSE,
          uuid,
          impulse,
        });
      } else {
        ammoWorker.postMessage({
          type: MessageType.APPLY_IMPULSE,
          uuid,
          impulse,
          relativeOffset,
        });
      }
    },

    bodyApplyForce(uuid, force, relativeOffset) {
      if (!relativeOffset) {
        ammoWorker.postMessage({
          type: MessageType.APPLY_CENTRAL_FORCE,
          uuid,
          force,
        });
      } else {
        ammoWorker.postMessage({
          type: MessageType.APPLY_FORCE,
          uuid,
          force,
          relativeOffset,
        });
      }
    },

    setSimulationSpeed(simulationSpeed: number) {
      ammoWorker.postMessage({
        type: MessageType.SET_SIMULATION_SPEED,
        simulationSpeed,
      });
    },
  };
}
