import { World } from "./wrappers/world";
import { Body } from "./wrappers/body";
import { Constraint } from "./wrappers/constraint";
import { DefaultBufferSize } from "ammo-debug-drawer";
import { Matrix4 } from "three";
import { createCollisionShapes } from "three-to-ammo";
import {
  BodyType,
  BufferState,
  MessageType,
  ShapeType,
  UUID,
} from "../lib/types";
import { BUFFER_CONFIG, SIMULATION_RATE } from "../lib/constants";
import { initializeAmmoWasm } from "./ammo-wasm-initialize";

const uuids: UUID[] = [];
const bodies: Record<UUID, Body> = {};
const shapes: Record<UUID, any> = {};
const constraints: Record<UUID, Constraint> = {};
const matrices: Record<UUID, Matrix4> = {};
const indexes: Record<UUID, number> = {};
const ptrToIndex: Record<number, number> = {};

let stepDuration = 0;

let freeIndex = 0;

let freeIndexArray;

let vector3Tmp1;
let vector3Tmp2;
let quatTmp1;

let world;
let headerIntArray;
let headerFloatArray;
let objectMatricesFloatArray;
let objectMatricesIntArray;
let lastTick;
let getPointer;
let usingSharedArrayBuffer = false;

function isBufferConsumed() {
  if (usingSharedArrayBuffer) {
    return (
      // @ts-ignore
      headerIntArray && Atomics.load(headerIntArray, 0) != BufferState.READY
    );
  } else {
    return (
      objectMatricesFloatArray &&
      objectMatricesFloatArray.buffer.byteLength !== 0
    );
  }
}

function releaseBuffer() {
  if (usingSharedArrayBuffer) {
    headerFloatArray[1] = stepDuration;
    Atomics.store(headerIntArray, 0, BufferState.READY);
  } else {
    postMessage(
      {
        type: MessageType.TRANSFER_DATA,
        objectMatricesFloatArray,
        stepDuration,
      },
      [objectMatricesFloatArray.buffer]
    );
  }
}

let tickInterval;
function tick() {
  if (isBufferConsumed()) {
    const now = performance.now();
    const dt = now - lastTick;
    world.step(dt / 1000);
    stepDuration = performance.now() - now;
    lastTick = now;

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

      matrix.fromArray(
        objectMatricesFloatArray,
        index * BUFFER_CONFIG.BODY_DATA_SIZE + BUFFER_CONFIG.MATRIX_OFFSET
      );
      body.updateShapes();

      if (body.type === BodyType.DYNAMIC) {
        body.syncFromPhysics();
      } else {
        body.syncToPhysics(false);
      }

      objectMatricesFloatArray.set(
        matrix.elements,
        index * BUFFER_CONFIG.BODY_DATA_SIZE + BUFFER_CONFIG.MATRIX_OFFSET
      );

      objectMatricesFloatArray[
        index * BUFFER_CONFIG.BODY_DATA_SIZE +
          BUFFER_CONFIG.LINEAR_VELOCITY_OFFSET
      ] = body.physicsBody!.getLinearVelocity().length();
      objectMatricesFloatArray[
        index * BUFFER_CONFIG.BODY_DATA_SIZE +
          BUFFER_CONFIG.ANGULAR_VELOCITY_OFFSET
      ] = body.physicsBody!.getAngularVelocity().length();

      const ptr = getPointer(body.physicsBody);
      const collisions = world.collisions.get(ptr);
      for (
        let j = 0;
        j < BUFFER_CONFIG.BODY_DATA_SIZE - BUFFER_CONFIG.COLLISIONS_OFFSET;
        j++
      ) {
        if (!collisions || j >= collisions.length) {
          objectMatricesIntArray[
            index * BUFFER_CONFIG.BODY_DATA_SIZE +
              BUFFER_CONFIG.COLLISIONS_OFFSET +
              j
          ] = -1;
        } else {
          const collidingPtr = collisions[j];
          if (ptrToIndex[collidingPtr]) {
            objectMatricesIntArray[
              index * BUFFER_CONFIG.BODY_DATA_SIZE +
                BUFFER_CONFIG.COLLISIONS_OFFSET +
                j
            ] = ptrToIndex[collidingPtr];
          }
        }
      }
    }

    releaseBuffer();
  }
}
function initSharedArrayBuffer(sharedArrayBuffer, maxBodies) {
  /** BUFFER HEADER
   * When using SAB, the first 4 bytes (1 int) are reserved for signaling BUFFER_STATE
   * This is used to determine which thread is currently allowed to modify the SAB.
   * The second 4 bytes (1 float) is used for storing stepDuration for stats.
   */
  usingSharedArrayBuffer = true;
  headerIntArray = new Int32Array(
    sharedArrayBuffer,
    0,
    BUFFER_CONFIG.HEADER_LENGTH
  );
  headerFloatArray = new Float32Array(
    sharedArrayBuffer,
    0,
    BUFFER_CONFIG.HEADER_LENGTH
  );
  objectMatricesFloatArray = new Float32Array(
    sharedArrayBuffer,
    BUFFER_CONFIG.HEADER_LENGTH * 4,
    BUFFER_CONFIG.BODY_DATA_SIZE * maxBodies
  );
  objectMatricesIntArray = new Int32Array(
    sharedArrayBuffer,
    BUFFER_CONFIG.HEADER_LENGTH * 4,
    BUFFER_CONFIG.BODY_DATA_SIZE * maxBodies
  );
}

function initTransferrables(arrayBuffer) {
  objectMatricesFloatArray = new Float32Array(arrayBuffer);
  objectMatricesIntArray = new Int32Array(arrayBuffer);
}

function initDebug(debugSharedArrayBuffer, world) {
  const debugIndexArray = new Uint32Array(debugSharedArrayBuffer, 0, 1);
  const debugVerticesArray = new Float32Array(
    debugSharedArrayBuffer,
    4,
    DefaultBufferSize
  );
  const debugColorsArray = new Float32Array(
    debugSharedArrayBuffer,
    4 + DefaultBufferSize,
    DefaultBufferSize
  );
  world.getDebugDrawer(debugIndexArray, debugVerticesArray, debugColorsArray);
}

function addBody({ uuid, matrix, options }) {
  if (freeIndex !== -1) {
    const nextFreeIndex = freeIndexArray[freeIndex];
    freeIndexArray[freeIndex] = -1;

    indexes[uuid] = freeIndex;
    uuids.push(uuid);
    const transform = new Matrix4();
    transform.fromArray(matrix);
    matrices[uuid] = transform;

    objectMatricesFloatArray.set(
      transform.elements,
      freeIndex * BUFFER_CONFIG.BODY_DATA_SIZE
    );
    bodies[uuid] = new Body(options || {}, transform, world);
    const ptr = getPointer(bodies[uuid].physicsBody);
    ptrToIndex[ptr] = freeIndex;

    postMessage({ type: MessageType.RIGIDBODY_READY, uuid, index: freeIndex });
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
  delete ptrToIndex[getPointer(bodies[uuid].physicsBody)];
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

function setShapesOffset({ bodyUuid, offset }) {
  if (!bodies[bodyUuid]) return;

  bodies[bodyUuid].setShapesOffset(offset);
}

function addConstraint({ constraintId, bodyUuid, targetUuid, options = {} }) {
  if (bodies[bodyUuid] && bodies[targetUuid]) {
    constraints[constraintId] = new Constraint(
      options,
      bodies[bodyUuid],
      bodies[targetUuid],
      world
    );
  }
}

function resetDynamicBody({ uuid }) {
  if (bodies[uuid]) {
    const body = bodies[uuid];
    const index = indexes[uuid];
    matrices[uuid].fromArray(
      objectMatricesFloatArray,
      index * BUFFER_CONFIG.BODY_DATA_SIZE
    );
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

async function initWorld({
  wasmUrl,
  maxBodies = BUFFER_CONFIG.MAX_BODIES,
  sharedArrayBuffer,
  arrayBuffer,
  worldConfig,
  simulationRate = SIMULATION_RATE,
}) {
  const Ammo = await initializeAmmoWasm(wasmUrl);

  getPointer = Ammo.getPointer;

  vector3Tmp1 = new Ammo.btVector3(0, 0, 0);
  vector3Tmp2 = new Ammo.btVector3(0, 0, 0);
  quatTmp1 = new Ammo.btQuaternion(0, 0, 0, 0);

  freeIndexArray = new Int32Array(maxBodies);
  for (let i = 0; i < maxBodies - 1; i++) {
    freeIndexArray[i] = i + 1;
  }
  freeIndexArray[maxBodies - 1] = -1;

  if (sharedArrayBuffer) {
    initSharedArrayBuffer(sharedArrayBuffer, maxBodies);
  } else if (arrayBuffer) {
    initTransferrables(arrayBuffer);
  } else {
    console.error("A valid ArrayBuffer or SharedArrayBuffer is required.");
  }

  world = new World(worldConfig || {});
  lastTick = performance.now();
  tickInterval = self.setInterval(tick, simulationRate);

  if (arrayBuffer) {
    postMessage({ type: MessageType.READY, arrayBuffer: arrayBuffer }, [
      arrayBuffer,
    ]);
  } else {
    postMessage({ type: MessageType.READY });
  }
}

function transferData({ objectMatricesFloatArray: omfa, simulationRate }) {
  if (simulationRate !== undefined) {
    clearInterval(tickInterval);
    tickInterval = self.setInterval(tick, simulationRate);
  }
  objectMatricesFloatArray = omfa;
  objectMatricesIntArray = new Int32Array(objectMatricesFloatArray.buffer);
}

function removeShapes({ bodyUuid, shapesUuid }) {
  if (bodies[bodyUuid] && shapes[shapesUuid]) {
    for (let i = 0; i < shapes[shapesUuid].length; i++) {
      const shape = shapes[shapesUuid][i];
      bodies[bodyUuid].removeShape(shape);
    }
  }
}

function removeConstraint({ constraintId }) {
  if (constraints[constraintId]) {
    constraints[constraintId].destroy();
    delete constraints[constraintId];
  }
}

function enableDebug({ enable, debugSharedArrayBuffer }) {
  if (!world.debugDrawer) {
    initDebug(debugSharedArrayBuffer, world);
  }

  if (world.debugDrawer) {
    if (enable) {
      world.debugDrawer.enable();
    } else {
      world.debugDrawer.disable();
    }
  }
}

function clientSideEvent(data) {
  console.error("received event is only available client-side", data);
}

const clientSideEventReceivers = {
  [MessageType.READY]: clientSideEvent,
  [MessageType.RIGIDBODY_READY]: clientSideEvent,
};

function notImplementedEventReceiver() {}

const eventReceivers: Record<MessageType, (eventData: any) => void> = {
  [MessageType.INIT]: initWorld,
  [MessageType.TRANSFER_DATA]: transferData,
  [MessageType.ADD_RIGIDBODY]: addBody,
  [MessageType.UPDATE_RIGIDBODY]: updateBody,
  [MessageType.REMOVE_RIGIDBODY]: removeBody,
  [MessageType.ADD_SHAPES]: addShapes,
  [MessageType.SET_SHAPES_OFFSET]: setShapesOffset,
  [MessageType.ADD_CONSTRAINT]: addConstraint,
  [MessageType.RESET_DYNAMIC_BODY]: resetDynamicBody,
  [MessageType.ACTIVATE_BODY]: activateBody,
  [MessageType.SET_MOTION_STATE]: bodySetMotionState,
  [MessageType.SET_LINEAR_VELOCITY]: bodySetLinearVelocity,
  [MessageType.SET_ANGULAR_VELOCITY]: notImplementedEventReceiver,
  [MessageType.APPLY_IMPULSE]: bodyApplyImpulse,
  [MessageType.APPLY_CENTRAL_IMPULSE]: bodyApplyCentralImpulse,
  [MessageType.APPLY_FORCE]: bodyApplyForce,
  [MessageType.APPLY_CENTRAL_FORCE]: bodyApplyCentralForce,
  [MessageType.REMOVE_SHAPES]: removeShapes,
  [MessageType.REMOVE_CONSTRAINT]: removeConstraint,
  [MessageType.ENABLE_DEBUG]: enableDebug,

  [MessageType.APPLY_TORQUE_IMPULSE]: notImplementedEventReceiver,
  [MessageType.CLEAR_FORCES]: notImplementedEventReceiver,
  [MessageType.SET_RESTITUTION]: notImplementedEventReceiver,
  [MessageType.SET_ROLLING_FRICTION]: notImplementedEventReceiver,
  [MessageType.SET_FRICTION]: notImplementedEventReceiver,
  [MessageType.SET_SPINNING_FRICTION]: notImplementedEventReceiver,
  [MessageType.ADD_SOFTBODY]: notImplementedEventReceiver,
  [MessageType.REMOVE_SOFTBODY]: notImplementedEventReceiver,

  ...clientSideEventReceivers,
};

onmessage = async (event) => {
  if (!eventReceivers[event.data?.type]) {
    console.error("unknown event type: ", event.data);
    return;
  }

  if (world) {
    if (event.data.type === MessageType.INIT) {
      console.error("Error: World is already initialized", event.data);
    } else {
      eventReceivers[event.data.type](event.data);
    }
  } else {
    if (event.data.type === MessageType.INIT) {
      eventReceivers[event.data.type](event.data);
    } else {
      console.error("Error: World Not Initialized", event.data);
    }
  }
};
