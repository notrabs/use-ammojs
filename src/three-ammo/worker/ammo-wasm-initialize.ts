// TODO: figure out why rollup doesn't like the file out of the ammo.js repo and throws a missing "default export" error
import Ammo from "../lib/builds/ammo.wasm.js";
import AmmoWasm from "ammo.js/builds/ammo.wasm.wasm";

export function initializeAmmoWasm(wasmUrl: string | undefined) {
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
