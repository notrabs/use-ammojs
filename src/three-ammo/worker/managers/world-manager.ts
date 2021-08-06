import { BUFFER_CONFIG } from "../../lib/constants";
import { initializeAmmoWasm } from "../ammo-wasm-initialize";
import { World } from "../wrappers/world";
import { ClientMessageType, MessageType } from "../../lib/types";
import {
  initSharedArrayBuffer,
  initTransferrables,
} from "./rigid-body-manager";

export let world;

export let freeIndexArray: Int32Array;

export let vector3Tmp1: Ammo.btVector3;
export let vector3Tmp2: Ammo.btVector3;
export let quatTmp1: Ammo.btQuaternion;

export let usingSharedArrayBuffer = false;

async function initWorld({
  wasmUrl,
  maxBodies = BUFFER_CONFIG.MAX_BODIES,
  sharedArrayBuffer,
  arrayBuffer,
  worldConfig,
}) {
  const Ammo = await initializeAmmoWasm(wasmUrl);

  vector3Tmp1 = new Ammo.btVector3(0, 0, 0);
  vector3Tmp2 = new Ammo.btVector3(0, 0, 0);
  quatTmp1 = new Ammo.btQuaternion(0, 0, 0, 0);

  freeIndexArray = new Int32Array(maxBodies);
  for (let i = 0; i < maxBodies - 1; i++) {
    freeIndexArray[i] = i + 1;
  }
  freeIndexArray[maxBodies - 1] = -1;

  if (sharedArrayBuffer) {
    usingSharedArrayBuffer = true;
    initSharedArrayBuffer(sharedArrayBuffer, maxBodies);
  } else if (arrayBuffer) {
    initTransferrables(arrayBuffer);
  } else {
    console.error("A valid ArrayBuffer or SharedArrayBuffer is required.");
  }

  world = new World(worldConfig || {});

  if (arrayBuffer) {
    postMessage({ type: ClientMessageType.READY, arrayBuffer: arrayBuffer }, [
      arrayBuffer,
    ]);
  } else {
    postMessage({ type: ClientMessageType.READY });
  }
}

export const worldEventReceivers = {
  [MessageType.INIT]: initWorld,
};
