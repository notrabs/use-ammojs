declare module "web-worker:*" {
  const WorkerFactory: new () => Worker;
  export default WorkerFactory;
}

declare module "*.wasm" {
  const value: string;
  export = value;
}

declare module Ammo {
  const getPointer: (obj: any) => number;

  const castObject: <T>(obj, target) => T;
}
