import { world } from "./world-manager";
import { MessageType } from "../../lib/types";
import { DefaultBufferSize } from "ammo-debug-drawer";

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

export const debugEventReceivers = {
  [MessageType.ENABLE_DEBUG]: enableDebug,
};
