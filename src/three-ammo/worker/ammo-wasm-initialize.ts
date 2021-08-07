// TODO: figure out why rollup doesn't like the file out of the ammo.js repo and throws a missing "default export" error

// TODO: custom ammo build adds "btSoftBody::setPose" function. should be merged upstream

import Ammo from "../lib/builds/ammo.wasm.js";
import AmmoWasm from "../lib/builds/ammo.wasm.wasm";

export function initializeAmmoWasm(wasmUrl: string | undefined) {
  return Ammo.bind(self)({
    locateFile() {
      if (wasmUrl) {
        return wasmUrl;
      } else {
        return AmmoWasm; //new URL(AmmoWasm, location.origin).href;
      }
    },
  });
}

// import Ammo from "../lib/builds/ammo.js";
//
// export function initializeAmmoWasm(wasmUrl: string | undefined) {
//   return Ammo.bind(self)();
// }
