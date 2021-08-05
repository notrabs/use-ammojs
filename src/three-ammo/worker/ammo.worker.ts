import { CONSTANTS } from "../lib/constants";
import World from "./world";
import Body from "./body";
import Constraint from "./constraint";
import { DefaultBufferSize } from "ammo-debug-drawer";
import { Matrix4 } from "three";
import { createCollisionShapes } from "three-to-ammo";

// TODO: figure out why rollup doesn't like the file out of the ammo.js repo and throws a missing "default export" error
import Ammo from "../lib/builds/ammo.wasm.js";
import AmmoWasm from "ammo.js/builds/ammo.wasm.wasm";

const MESSAGE_TYPES = CONSTANTS.MESSAGE_TYPES;
const TYPE = CONSTANTS.TYPE;
const SHAPE = CONSTANTS.SHAPE;
const CONSTRAINT = CONSTANTS.CONSTRAINT;
const BUFFER_CONFIG = CONSTANTS.BUFFER_CONFIG;
const BUFFER_STATE = CONSTANTS.BUFFER_STATE;

function initializeAmmoWasm(wasmUrl: string | undefined) {
  return Ammo({
    locateFile() {
      if (wasmUrl) {
        return wasmUrl;
      } else {
        return AmmoWasm; //new URL(AmmoWasm, location.origin).href;
      }
    },
  });
}

const uuids: any = [];
const bodies: any = {};
const shapes: any = {};
const constraints: any = {};
const matrices: any = {};
const indexes: any = {};
const ptrToIndex: any = {};

const messageQueue: any = [];

let simulationRate;

let stepDuration = 0;

let freeIndex = 0;

let freeIndexArray;

let vector3Tmp1;
let vector3Tmp2;
let quatTmp1;

let world,
  headerIntArray,
  headerFloatArray,
  objectMatricesFloatArray,
  objectMatricesIntArray,
  lastTick,
  getPointer;
let usingSharedArrayBuffer = false;

function isBufferConsumed() {
  if (usingSharedArrayBuffer) {
    return (
      // @ts-ignore
      headerIntArray && Atomics.load(headerIntArray, 0) != BUFFER_STATE.READY
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
    Atomics.store(headerIntArray, 0, BUFFER_STATE.READY);
  } else {
    postMessage(
      {
        type: MESSAGE_TYPES.TRANSFER_DATA,
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

    while (messageQueue.length > 0) {
      const message = messageQueue.shift();
      switch (message.type) {
        case MESSAGE_TYPES.ADD_BODY:
          addBody(message);
          break;
        case MESSAGE_TYPES.UPDATE_BODY:
          updateBody(message);
          break;
        case MESSAGE_TYPES.REMOVE_BODY:
          removeBody(message);
          break;
        case MESSAGE_TYPES.ADD_SHAPES:
          addShapes(message);
          break;
        case MESSAGE_TYPES.SET_SHAPES_OFFSET:
          setShapesOffset(message);
          break;
        case MESSAGE_TYPES.ADD_CONSTRAINT:
          addConstraint(message);
          break;
        case MESSAGE_TYPES.RESET_DYNAMIC_BODY:
          resetDynamicBody(message);
          break;
        case MESSAGE_TYPES.ACTIVATE_BODY:
          activateBody(message);
          break;
        case MESSAGE_TYPES.SET_MOTION_STATE:
          bodySetMotionState(message);
          break;
        case MESSAGE_TYPES.SET_LINEAR_VELOCITY:
          bodySetLinearVelocity(message);
          break;
        case MESSAGE_TYPES.APPLY_IMPULSE:
          bodyApplyImpulse(message);
          break;
        case MESSAGE_TYPES.APPLY_CENTRAL_IMPULSE:
          bodyApplyCentralImpulse(message);
          break;
        case MESSAGE_TYPES.APPLY_FORCE:
          bodyApplyForce(message);
          break;
        case MESSAGE_TYPES.APPLY_CENTRAL_FORCE:
          bodyApplyCentralForce(message);
          break;
      }
    }

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

      if (body.type === TYPE.DYNAMIC) {
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
      ] = body.physicsBody.getLinearVelocity().length();
      objectMatricesFloatArray[
        index * BUFFER_CONFIG.BODY_DATA_SIZE +
          BUFFER_CONFIG.ANGULAR_VELOCITY_OFFSET
      ] = body.physicsBody.getAngularVelocity().length();

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
const initSharedArrayBuffer = (sharedArrayBuffer, maxBodies) => {
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
};

const initTransferrables = (arrayBuffer) => {
  objectMatricesFloatArray = new Float32Array(arrayBuffer);
  objectMatricesIntArray = new Int32Array(arrayBuffer);
};

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

    postMessage({ type: MESSAGE_TYPES.BODY_READY, uuid, index: freeIndex });
    freeIndex = nextFreeIndex;
  }
}

function updateBody({ uuid, options }) {
  if (bodies[uuid]) {
    bodies[uuid].update(options);
    bodies[uuid].physicsBody.activate(true);
  }
}

function bodySetMotionState({ uuid, position, rotation }) {
  const body = bodies[uuid];
  if (body) {
    const transform = body.physicsBody.getCenterOfMassTransform();

    if (position) {
      vector3Tmp1.setValue(position.x, position.y, position.z);
      transform.setOrigin(vector3Tmp1);
    }

    if (rotation) {
      quatTmp1.setValue(rotation._x, rotation._y, rotation._z, rotation._w);
      transform.setRotation(quatTmp1);
    }

    body.physicsBody.setCenterOfMassTransform(transform);
    body.physicsBody.activate(true);
  }
}

function bodySetLinearVelocity({ uuid, velocity }) {
  const body = bodies[uuid];
  if (body) {
    body.physicsBody
      .getLinearVelocity()
      .setValue(velocity.x, velocity.y, velocity.z);
    body.physicsBody.activate(true);
  }
}

function bodyApplyImpulse({ uuid, impulse, relativeOffset }) {
  const body = bodies[uuid];
  if (body) {
    vector3Tmp1.setValue(impulse.x, impulse.y, impulse.z);
    vector3Tmp2.setValue(relativeOffset.x, relativeOffset.y, relativeOffset.z);
    body.physicsBody.applyImpulse(vector3Tmp1, vector3Tmp2);
    body.physicsBody.activate(true);
  }
}

function bodyApplyCentralImpulse({ uuid, impulse }) {
  const body = bodies[uuid];
  if (body) {
    vector3Tmp1.setValue(impulse.x, impulse.y, impulse.z);
    body.physicsBody.applyCentralImpulse(vector3Tmp1);
    body.physicsBody.activate(true);
  }
}

function bodyApplyForce({ uuid, force, relativeOffset }) {
  const body = bodies[uuid];
  if (body) {
    vector3Tmp1.setValue(force.x, force.y, force.z);
    vector3Tmp2.setValue(relativeOffset.x, relativeOffset.y, relativeOffset.z);
    body.physicsBody.applyImpulse(vector3Tmp1, vector3Tmp2);
    body.physicsBody.activate(true);
  }
}

function bodyApplyCentralForce({ uuid, force }) {
  const body = bodies[uuid];
  if (body) {
    vector3Tmp1.setValue(force.x, force.y, force.z);
    body.physicsBody.applyCentralForce(vector3Tmp1);
    body.physicsBody.activate(true);
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
    options || { type: SHAPE.BOX }
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

function addConstraint({ constraintId, bodyUuid, targetUuid, options }) {
  if (bodies[bodyUuid] && bodies[targetUuid]) {
    options = options || {};
    if (!options.hasOwnProperty("type")) {
      options.type = CONSTRAINT.LOCK;
    }
    const constraint = new Constraint(
      options,
      bodies[bodyUuid],
      bodies[targetUuid],
      world
    );
    constraints[constraintId] = constraint;
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
    body.physicsBody.getLinearVelocity().setValue(0, 0, 0);
    body.physicsBody.getAngularVelocity().setValue(0, 0, 0);
  }
}

function activateBody({ uuid }) {
  if (bodies[uuid]) {
    bodies[uuid].physicsBody.activate();
  }
}

onmessage = async (event) => {
  if (event.data.type === MESSAGE_TYPES.INIT) {
    initializeAmmoWasm(event.data.wasmUrl).then((Ammo) => {
      getPointer = Ammo.getPointer;

      vector3Tmp1 = new Ammo.btVector3(0, 0, 0);
      vector3Tmp2 = new Ammo.btVector3(0, 0, 0);
      quatTmp1 = new Ammo.btQuaternion(0, 0, 0, 0);

      const maxBodies = event.data.maxBodies
        ? event.data.maxBodies
        : BUFFER_CONFIG.MAX_BODIES;

      freeIndexArray = new Int32Array(maxBodies);
      for (let i = 0; i < maxBodies - 1; i++) {
        freeIndexArray[i] = i + 1;
      }
      freeIndexArray[maxBodies - 1] = -1;

      if (event.data.sharedArrayBuffer) {
        initSharedArrayBuffer(event.data.sharedArrayBuffer, maxBodies);
      } else if (event.data.arrayBuffer) {
        initTransferrables(event.data.arrayBuffer);
      } else {
        console.error("A valid ArrayBuffer or SharedArrayBuffer is required.");
      }

      world = new World(event.data.worldConfig || {});
      lastTick = performance.now();
      simulationRate =
        event.data.simulationRate === undefined
          ? CONSTANTS.SIMULATION_RATE
          : event.data.simulationRate;
      tickInterval = self.setInterval(tick, simulationRate);

      if (event.data.arrayBuffer) {
        postMessage(
          { type: MESSAGE_TYPES.READY, arrayBuffer: event.data.arrayBuffer },
          [event.data.arrayBuffer]
        );
      } else {
        postMessage({ type: MESSAGE_TYPES.READY });
      }
    });
  } else if (event.data.type === MESSAGE_TYPES.TRANSFER_DATA) {
    if (event.data.simulationRate !== undefined) {
      simulationRate = event.data.simulationRate;
      clearInterval(tickInterval);
      tickInterval = self.setInterval(tick, simulationRate);
    }
    objectMatricesFloatArray = event.data.objectMatricesFloatArray;
    objectMatricesIntArray = new Int32Array(objectMatricesFloatArray.buffer);
  } else if (world) {
    switch (event.data.type) {
      case MESSAGE_TYPES.ADD_BODY: {
        messageQueue.push(event.data);
        break;
      }

      case MESSAGE_TYPES.UPDATE_BODY: {
        messageQueue.push(event.data);
        break;
      }

      case MESSAGE_TYPES.REMOVE_BODY: {
        const uuid = event.data.uuid;
        if (uuids.indexOf(uuid) !== -1) {
          messageQueue.push(event.data);
        }
        break;
      }

      case MESSAGE_TYPES.ADD_SHAPES: {
        const bodyUuid = event.data.bodyUuid;
        if (bodies[bodyUuid]) {
          addShapes(event.data);
        } else {
          messageQueue.push(event.data);
        }
        break;
      }

      case MESSAGE_TYPES.SET_SHAPES_OFFSET: {
        const bodyUuid = event.data.bodyUuid;
        if (bodies[bodyUuid]) {
          setShapesOffset(event.data);
        } else {
          messageQueue.push(event.data);
        }
        break;
      }

      case MESSAGE_TYPES.REMOVE_SHAPES: {
        const bodyUuid = event.data.bodyUuid;
        const shapesUuid = event.data.shapesUuid;
        if (bodies[bodyUuid] && shapes[shapesUuid]) {
          for (let i = 0; i < shapes[shapesUuid].length; i++) {
            const shape = shapes[shapesUuid][i];
            bodies[bodyUuid].removeShape(shape);
          }
        }
        break;
      }

      case MESSAGE_TYPES.ADD_CONSTRAINT: {
        const bodyUuid = event.data.bodyUuid;
        const targetUuid = event.data.targetUuid;
        if (bodies[bodyUuid] && bodies[targetUuid]) {
          addConstraint(event.data);
        } else {
          messageQueue.push(event.data);
        }
        break;
      }

      case MESSAGE_TYPES.REMOVE_CONSTRAINT: {
        const constraintId = event.data.constraintId;
        if (constraints[constraintId]) {
          constraints[constraintId].destroy();
          delete constraints[constraintId];
        }
        break;
      }

      case MESSAGE_TYPES.ENABLE_DEBUG: {
        const enable = event.data.enable;
        if (!world.debugDrawer) {
          initDebug(event.data.debugSharedArrayBuffer, world);
        }

        if (world.debugDrawer) {
          if (enable) {
            world.debugDrawer.enable();
          } else {
            world.debugDrawer.disable();
          }
        }
        break;
      }

      case MESSAGE_TYPES.RESET_DYNAMIC_BODY:
      case MESSAGE_TYPES.ACTIVATE_BODY:
      case MESSAGE_TYPES.SET_MOTION_STATE:
      case MESSAGE_TYPES.SET_LINEAR_VELOCITY:
      case MESSAGE_TYPES.APPLY_IMPULSE:
      case MESSAGE_TYPES.APPLY_CENTRAL_IMPULSE:
      case MESSAGE_TYPES.APPLY_FORCE:
      case MESSAGE_TYPES.APPLY_CENTRAL_FORCE:
        messageQueue.push(event.data);
        break;
    }
  } else {
    console.error("Error: World Not Initialized", event.data);
  }
};
