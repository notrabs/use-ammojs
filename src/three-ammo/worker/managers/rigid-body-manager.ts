import {
  BodyType,
  BufferState,
  ClientMessageType,
  MessageType,
  ShapeType,
  UUID,
} from "../../lib/types";
import { RigidBody } from "../wrappers/rigid-body";
import { BUFFER_CONFIG } from "../../lib/constants";
import { notImplementedEventReceiver } from "../utils";
import { Matrix4 } from "three";
import {
  freeIndexArray,
  quatTmp1,
  sharedBuffers,
  usingSharedArrayBuffer,
  vector3Tmp1,
  vector3Tmp2,
  world,
} from "./world-manager";
import { createCollisionShapes } from "three-to-ammo";

export const bodies: Record<UUID, RigidBody> = {};
export const shapes: Record<UUID, any> = {};
export const matrices: Record<UUID, Matrix4> = {};
export const indexes: Record<UUID, number> = {};
export const ptrToIndex: Record<number, number> = {};

let freeIndex = 0;

export const uuids: UUID[] = [];

function addBody({ uuid, matrix, options }) {
  if (freeIndex !== -1) {
    const nextFreeIndex = freeIndexArray[freeIndex];
    freeIndexArray[freeIndex] = -1;

    indexes[uuid] = freeIndex;
    uuids.push(uuid);
    const transform = new Matrix4();
    transform.fromArray(matrix);
    matrices[uuid] = transform;

    // sharedBuffers.rigidBodies.objectMatricesFloatArray.set(
    //   transform.elements,
    //   freeIndex * BUFFER_CONFIG.BODY_DATA_SIZE
    // );
    bodies[uuid] = new RigidBody(options || {}, transform, world);
    const ptr = Ammo.getPointer(bodies[uuid].physicsBody);
    ptrToIndex[ptr] = freeIndex;

    postMessage({
      type: ClientMessageType.RIGIDBODY_READY,
      uuid,
      index: freeIndex,
    });
    freeIndex = nextFreeIndex;
  }
}

function updateBody({ uuid, options }) {
  if (bodies[uuid]) {
    bodies[uuid].update(options);
    bodies[uuid].physicsBody!.activate(true);
  }
}

function bodySetMotionState({ uuid, position, rotation }) {
  const body = bodies[uuid];
  if (body) {
    const transform = body.physicsBody!.getCenterOfMassTransform();

    if (position) {
      vector3Tmp1.setValue(position.x, position.y, position.z);
      transform.setOrigin(vector3Tmp1);
    }

    if (rotation) {
      quatTmp1.setValue(rotation._x, rotation._y, rotation._z, rotation._w);
      transform.setRotation(quatTmp1);
    }

    body.physicsBody!.setCenterOfMassTransform(transform);
    body.physicsBody!.activate(true);
  }
}

function bodySetLinearVelocity({ uuid, velocity }) {
  const body = bodies[uuid];
  if (body) {
    body
      .physicsBody!.getLinearVelocity()
      .setValue(velocity.x, velocity.y, velocity.z);
    body.physicsBody!.activate(true);
  }
}

function bodyApplyImpulse({ uuid, impulse, relativeOffset }) {
  const body = bodies[uuid];
  if (body) {
    vector3Tmp1.setValue(impulse.x, impulse.y, impulse.z);
    vector3Tmp2.setValue(relativeOffset.x, relativeOffset.y, relativeOffset.z);
    body.physicsBody!.applyImpulse(vector3Tmp1, vector3Tmp2);
    body.physicsBody!.activate(true);
  }
}

function bodyApplyCentralImpulse({ uuid, impulse }) {
  const body = bodies[uuid];
  if (body) {
    vector3Tmp1.setValue(impulse.x, impulse.y, impulse.z);
    body.physicsBody!.applyCentralImpulse(vector3Tmp1);
    body.physicsBody!.activate(true);
  }
}

function bodyApplyForce({ uuid, force, relativeOffset }) {
  const body = bodies[uuid];
  if (body) {
    vector3Tmp1.setValue(force.x, force.y, force.z);
    vector3Tmp2.setValue(relativeOffset.x, relativeOffset.y, relativeOffset.z);
    body.physicsBody!.applyImpulse(vector3Tmp1, vector3Tmp2);
    body.physicsBody!.activate(true);
  }
}

function bodyApplyCentralForce({ uuid, force }) {
  const body = bodies[uuid];
  if (body) {
    vector3Tmp1.setValue(force.x, force.y, force.z);
    body.physicsBody!.applyCentralForce(vector3Tmp1);
    body.physicsBody!.activate(true);
  }
}

function removeBody({ uuid }) {
  delete ptrToIndex[Ammo.getPointer(bodies[uuid].physicsBody)];
  bodies[uuid].destroy();
  delete bodies[uuid];
  delete matrices[uuid];
  delete shapes[uuid];
  const index = indexes[uuid];
  freeIndexArray[index] = freeIndex;
  freeIndex = index;
  delete indexes[uuid];
  uuids.splice(uuids.indexOf(uuid), 1);
}

const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function addShapes({
  bodyUuid,
  shapesUuid,
  vertices,
  matrices,
  indexes,
  matrixWorld,
  options,
}) {
  if (!bodies[bodyUuid]) return;

  if (!matrixWorld) {
    matrixWorld = IDENTITY_MATRIX;
  }

  const physicsShapes = createCollisionShapes(
    vertices,
    matrices,
    indexes,
    matrixWorld,
    options || { type: ShapeType.BOX }
  );
  for (let i = 0; i < physicsShapes.length; i++) {
    const shape = physicsShapes[i];
    bodies[bodyUuid].addShape(shape);
  }
  shapes[shapesUuid] = physicsShapes;
}

function removeShapes({ bodyUuid, shapesUuid }) {
  if (bodies[bodyUuid] && shapes[shapesUuid]) {
    for (let i = 0; i < shapes[shapesUuid].length; i++) {
      const shape = shapes[shapesUuid][i];
      bodies[bodyUuid].removeShape(shape);
    }
  }
}

function setShapesOffset({ bodyUuid, offset }) {
  if (!bodies[bodyUuid]) return;

  bodies[bodyUuid].setShapesOffset(offset);
}

function resetDynamicBody({ uuid }) {
  if (bodies[uuid]) {
    const body = bodies[uuid];
    const index = indexes[uuid];
    // matrices[uuid].fromArray(
    //   sharedBuffers.rigidBodies.objectMatricesFloatArray,
    //   index * BUFFER_CONFIG.BODY_DATA_SIZE
    // );
    body.syncToPhysics(true);
    body.physicsBody!.getLinearVelocity().setValue(0, 0, 0);
    body.physicsBody!.getAngularVelocity().setValue(0, 0, 0);
  }
}

function activateBody({ uuid }) {
  if (bodies[uuid]) {
    bodies[uuid].physicsBody!.activate();
  }
}

// export function initSharedArrayBuffer(sharedArrayBuffer, maxBodies) {
//   /** BUFFER HEADER
//    * When using SAB, the first 4 bytes (1 int) are reserved for signaling BUFFER_STATE
//    * This is used to determine which thread is currently allowed to modify the SAB.
//    * The second 4 bytes (1 float) is used for storing stepDuration for stats.
//    */
//   headerIntArray = new Int32Array(
//     sharedArrayBuffer,
//     0,
//     BUFFER_CONFIG.HEADER_LENGTH
//   );
//   headerFloatArray = new Float32Array(
//     sharedArrayBuffer,
//     0,
//     BUFFER_CONFIG.HEADER_LENGTH
//   );
//   objectMatricesFloatArray = new Float32Array(
//     sharedArrayBuffer,
//     BUFFER_CONFIG.HEADER_LENGTH * 4,
//     BUFFER_CONFIG.BODY_DATA_SIZE * BUFFER_CONFIG.MAX_BODIES
//   );
//   objectMatricesIntArray = new Int32Array(
//     sharedArrayBuffer,
//     BUFFER_CONFIG.HEADER_LENGTH * 4,
//     BUFFER_CONFIG.BODY_DATA_SIZE * BUFFER_CONFIG.MAX_BODIES
//   );
// }
//
// export function initTransferrables(arrayBuffer) {
//   objectMatricesFloatArray = new Float32Array(arrayBuffer);
//   objectMatricesIntArray = new Int32Array(arrayBuffer);
// }

export function copyToRigidBodyBuffer() {
  /** Buffer Schema
   * Every physics body has 26 * 4 bytes (64bit float/int) assigned in the buffer
   * 0-15:  Matrix4 elements (floats)
   * 16:    Linear Velocity (float)
   * 17:    Angular Velocity (float)
   * 18-25: first 8 Collisions (ints)
   */

  for (let i = 0; i < uuids.length; i++) {
    const uuid = uuids[i];
    const body = bodies[uuid];
    const index = indexes[uuid];
    const matrix = matrices[uuid];

    body.updateShapes();

    if (body.type === BodyType.DYNAMIC) {
      body.syncFromPhysics();

      sharedBuffers.rigidBodies.objectMatricesFloatArray.set(
        matrix.elements,
        index * BUFFER_CONFIG.BODY_DATA_SIZE + BUFFER_CONFIG.MATRIX_OFFSET
      );

      sharedBuffers.rigidBodies.objectMatricesFloatArray[
        index * BUFFER_CONFIG.BODY_DATA_SIZE +
          BUFFER_CONFIG.LINEAR_VELOCITY_OFFSET
      ] = body.physicsBody!.getLinearVelocity().length();

      sharedBuffers.rigidBodies.objectMatricesFloatArray[
        index * BUFFER_CONFIG.BODY_DATA_SIZE +
          BUFFER_CONFIG.ANGULAR_VELOCITY_OFFSET
      ] = body.physicsBody!.getAngularVelocity().length();
    } else {
      // matrix.fromArray(
      //   sharedBuffers.rigidBodies.objectMatricesFloatArray,
      //   index * BUFFER_CONFIG.BODY_DATA_SIZE + BUFFER_CONFIG.MATRIX_OFFSET
      // );

      // body.syncToPhysics(false);
    }

    const ptr = Ammo.getPointer(body.physicsBody);
    const collisions = world.collisions.get(ptr);
    for (
      let j = 0;
      j < BUFFER_CONFIG.BODY_DATA_SIZE - BUFFER_CONFIG.COLLISIONS_OFFSET;
      j++
    ) {
      if (!collisions || j >= collisions.length) {
        sharedBuffers.rigidBodies.objectMatricesIntArray[
          index * BUFFER_CONFIG.BODY_DATA_SIZE +
            BUFFER_CONFIG.COLLISIONS_OFFSET +
            j
        ] = -1;
      } else {
        const collidingPtr = collisions[j];
        if (ptrToIndex[collidingPtr]) {
          sharedBuffers.rigidBodies.objectMatricesIntArray[
            index * BUFFER_CONFIG.BODY_DATA_SIZE +
              BUFFER_CONFIG.COLLISIONS_OFFSET +
              j
          ] = ptrToIndex[collidingPtr];
        }
      }
    }
  }
}

export function isBufferConsumed() {
  if (usingSharedArrayBuffer) {
    return (
      sharedBuffers.rigidBodies.headerIntArray &&
      Atomics.load(sharedBuffers.rigidBodies.headerIntArray, 0) !=
        BufferState.READY
    );
  } else {
    return (
      sharedBuffers.rigidBodies.objectMatricesFloatArray &&
      sharedBuffers.rigidBodies.objectMatricesFloatArray.buffer.byteLength !== 0
    );
  }
}

export function releaseBuffer(stepDuration: number) {
  sharedBuffers.rigidBodies.headerFloatArray[1] = stepDuration;

  if (usingSharedArrayBuffer) {
    Atomics.store(
      sharedBuffers.rigidBodies.headerIntArray,
      0,
      BufferState.READY
    );
  } else {
    postMessage(
      {
        type: ClientMessageType.TRANSFER_BUFFERS,
        sharedBuffers,
      },
      [
        sharedBuffers.rigidBodies.headerIntArray.buffer,
        sharedBuffers.debug.vertexFloatArray.buffer,
        ...sharedBuffers.softBodies.map((sb) => sb.vertexFloatArray.buffer),
      ]
    );
  }
}

export const rigidBodyEventReceivers = {
  [MessageType.ADD_RIGIDBODY]: addBody,
  [MessageType.UPDATE_RIGIDBODY]: updateBody,
  [MessageType.REMOVE_RIGIDBODY]: removeBody,
  [MessageType.ADD_SHAPES]: addShapes,
  [MessageType.REMOVE_SHAPES]: removeShapes,
  [MessageType.SET_SHAPES_OFFSET]: setShapesOffset,
  [MessageType.RESET_DYNAMIC_BODY]: resetDynamicBody,
  [MessageType.ACTIVATE_BODY]: activateBody,
  [MessageType.SET_MOTION_STATE]: bodySetMotionState,
  [MessageType.SET_LINEAR_VELOCITY]: bodySetLinearVelocity,
  [MessageType.SET_ANGULAR_VELOCITY]: notImplementedEventReceiver,
  [MessageType.APPLY_IMPULSE]: bodyApplyImpulse,
  [MessageType.APPLY_CENTRAL_IMPULSE]: bodyApplyCentralImpulse,
  [MessageType.APPLY_FORCE]: bodyApplyForce,
  [MessageType.APPLY_CENTRAL_FORCE]: bodyApplyCentralForce,

  // TODO implement
  [MessageType.APPLY_TORQUE_IMPULSE]: notImplementedEventReceiver,
  [MessageType.CLEAR_FORCES]: notImplementedEventReceiver,
  [MessageType.SET_RESTITUTION]: notImplementedEventReceiver,
  [MessageType.SET_ROLLING_FRICTION]: notImplementedEventReceiver,
  [MessageType.SET_FRICTION]: notImplementedEventReceiver,
  [MessageType.SET_SPINNING_FRICTION]: notImplementedEventReceiver,
};
