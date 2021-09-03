// TODO: figure out why rollup doesn't like the file out of the ammo.js repo and throws a missing "default export" error
// current workaround is to append "export default Ammo;" to the end of the file
import Ammo from "../lib/ammo.js/builds/ammo.wasm.js";
import AmmoWasm from "../lib/ammo.js/builds/ammo.wasm.wasm";

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

// non-wasm Ammo build for testing

// import Ammo from "../lib/ammo.js/builds/ammo.js";
//
// export function initializeAmmoWasm(wasmUrl: string | undefined) {
//   return Ammo.bind(self)();
// }
