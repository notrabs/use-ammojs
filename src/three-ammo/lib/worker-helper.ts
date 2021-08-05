import { Matrix4 } from "three";
import { CONSTANTS } from "./constants";
import { iterateGeometries } from "three-to-ammo";
import AmmoWorker from "web-worker:../worker/ammo.worker";

const MESSAGE_TYPES = CONSTANTS.MESSAGE_TYPES;

export function createAmmoWorker(): Worker {
  return new AmmoWorker();
}

export const WorkerHelpers = function (ammoWorker) {
  const transform = new Matrix4();
  const inverse = new Matrix4();

  return {
    transferData(objectMatricesFloatArray: Float32Array) {
      ammoWorker.postMessage(
        { type: MESSAGE_TYPES.TRANSFER_DATA, objectMatricesFloatArray },
        [objectMatricesFloatArray.buffer]
      );
    },

    addBody(uuid, mesh, options = {}) {
      inverse.copy(mesh.parent.matrixWorld).invert();
      transform.multiplyMatrices(inverse, mesh.matrixWorld);
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.ADD_BODY,
        uuid,
        matrix: transform.elements,
        options,
      });
    },

    updateBody(uuid, options) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.UPDATE_BODY,
        uuid,
        options,
      });
    },

    removeBody(uuid) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.REMOVE_BODY,
        uuid,
      });
    },

    addShapes(bodyUuid, shapesUuid, mesh, options = {}) {
      if (mesh) {
        inverse.copy(mesh.parent.matrix).invert();
        transform.multiplyMatrices(inverse, mesh.parent.matrix);
        const vertices: any[] = [];
        const matrices: any[] = [];
        const indexes: any[] = [];

        mesh.updateMatrixWorld(true);
        iterateGeometries(mesh, options, (vertexArray, matrix, index) => {
          vertices.push(vertexArray);
          matrices.push(matrix);
          indexes.push(index);
        });

        ammoWorker.postMessage({
          type: MESSAGE_TYPES.ADD_SHAPES,
          bodyUuid,
          shapesUuid,
          vertices,
          matrices,
          indexes,
          matrixWorld: mesh.matrixWorld.elements,
          options,
        });
      } else {
        ammoWorker.postMessage({
          type: MESSAGE_TYPES.ADD_SHAPES,
          bodyUuid,
          shapesUuid,
          options,
        });
      }
    },

    bodySetShapesOffset(bodyUuid, offset) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.SET_SHAPES_OFFSET,
        bodyUuid,
        offset,
      });
    },

    removeShapes(bodyUuid, shapesUuid) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.REMOVE_SHAPES,
        bodyUuid,
        shapesUuid,
      });
    },

    addConstraint(constraintId, bodyUuid, targetUuid, options = {}) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.ADD_CONSTRAINT,
        constraintId,
        bodyUuid,
        targetUuid,
        options,
      });
    },

    removeConstraint(constraintId) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.REMOVE_CONSTRAINT,
        constraintId,
      });
    },

    enableDebug(enable, debugSharedArrayBuffer) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.ENABLE_DEBUG,
        enable,
        debugSharedArrayBuffer,
      });
    },

    resetDynamicBody(uuid) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.RESET_DYNAMIC_BODY,
        uuid,
      });
    },

    activateBody(uuid) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.ACTIVATE_BODY,
        uuid,
      });
    },

    bodySetMotionState(uuid, position, rotation) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.SET_MOTION_STATE,
        uuid,
        position,
        rotation,
      });
    },

    bodySetLinearVelocity(uuid, velocity) {
      ammoWorker.postMessage({
        type: MESSAGE_TYPES.SET_LINEAR_VELOCITY,
        uuid,
        velocity,
      });
    },

    bodyApplyImpulse(uuid, impulse, relativeOffset) {
      if (!relativeOffset) {
        ammoWorker.postMessage({
          type: MESSAGE_TYPES.APPLY_CENTRAL_IMPULSE,
          uuid,
          impulse,
        });
      } else {
        ammoWorker.postMessage({
          type: MESSAGE_TYPES.APPLY_IMPULSE,
          uuid,
          impulse,
          relativeOffset,
        });
      }
    },

    bodyApplyForce(uuid, force, relativeOffset) {
      if (!relativeOffset) {
        ammoWorker.postMessage({
          type: MESSAGE_TYPES.APPLY_CENTRAL_FORCE,
          uuid,
          force,
        });
      } else {
        ammoWorker.postMessage({
          type: MESSAGE_TYPES.APPLY_FORCE,
          uuid,
          force,
          relativeOffset,
        });
      }
    },
  };
};
