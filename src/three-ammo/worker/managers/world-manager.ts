import { BUFFER_CONFIG } from "../../lib/constants";
import { initializeAmmoWasm } from "../ammo-wasm-initialize";
import { World } from "../wrappers/world";
import {
  BufferState,
  ClientMessageType,
  MessageType,
  SharedBuffers,
} from "../../lib/types";
import { updateSoftBodyBuffers } from "./soft-body-manager";

export let world: World;

export let freeIndexArray: Int32Array;

export let vector3Tmp1: Ammo.btVector3;
export let vector3Tmp2: Ammo.btVector3;
export let quatTmp1: Ammo.btQuaternion;

export let usingSharedArrayBuffer = false;

export let sharedBuffers: SharedBuffers;

async function initWorld({
  wasmUrl,
  sharedBuffers: transferredBuffers,
  worldConfig,
  isSharedArrayBufferSupported,
}) {
  const Ammo = await initializeAmmoWasm(wasmUrl);

  vector3Tmp1 = new Ammo.btVector3(0, 0, 0);
  vector3Tmp2 = new Ammo.btVector3(0, 0, 0);
  quatTmp1 = new Ammo.btQuaternion(0, 0, 0, 0);

  freeIndexArray = new Int32Array(BUFFER_CONFIG.MAX_BODIES);
  for (let i = 0; i < BUFFER_CONFIG.MAX_BODIES - 1; i++) {
    freeIndexArray[i] = i + 1;
  }
  freeIndexArray[BUFFER_CONFIG.MAX_BODIES - 1] = -1;

  usingSharedArrayBuffer = isSharedArrayBufferSupported;

  sharedBuffers = transferredBuffers;

  world = new World(worldConfig || {});

  if (usingSharedArrayBuffer) {
    postMessage({ type: ClientMessageType.READY });
  } else {
    postMessage({ type: ClientMessageType.READY, sharedBuffers }, [
      sharedBuffers.rigidBodies.headerIntArray.buffer,
      sharedBuffers.debug.vertexFloatArray.buffer,
      ...sharedBuffers.softBodies.map((sb) => sb.vertexFloatArray.buffer),
    ]);
  }
}

function transferBuffers({ sharedBuffers: receivedSharedBuffers }) {
  sharedBuffers = receivedSharedBuffers;

  updateSoftBodyBuffers(sharedBuffers);
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

export function releaseBuffer() {
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

function setGravity({ gravity }) {
  world.setGravity(gravity);
}

export const worldEventReceivers = {
  [MessageType.INIT]: initWorld,
  [MessageType.TRANSFER_BUFFERS]: transferBuffers,
  [MessageType.SET_GRAVITY]: setGravity,
};
