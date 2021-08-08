[![npm](https://img.shields.io/npm/v/use-ammojs?color=%23F69500)](https://www.npmjs.com/package/use-ammojs)
[![npm](https://img.shields.io/badge/bulletphysics%20(fork)-3.17-%23F69500)](https://github.com/notrabs/ammo.js/tree/bullet_submodule)
![npm](https://img.shields.io/npm/types/use-ammojs?label=%20)
# [WIP] use-ammojs

_Fast_ Physics hooks for use with [react-three-fiber](https://github.com/pmndrs/react-three-fiber).

Built on top of [three-ammo](https://github.com/infinitelee/three-ammo), running the wasm ammo.js library in a seperate web-worker.
Data is synced with fast SharedArrayBuffers in environments that support them.

```
yarn add use-ammojs
npm i use-ammojs
```

## Why not use [use-cannon](https://github.com/pmndrs/use-cannon) instead?

use-cannon is great and a inspiration for this package, but it is missing features like soft-bodies and lacks performance in scenes with large triangle meshes. ammo.js is a direct wrapper around the powerful [Bullet Physics](http://www.bulletphysics.org/) engine, which solves these problems.

At the time of writing however use-cannon is more mature and great for most projects.

## Roadmap

- [x] Create a Physics World as a React context and simulate it in a web-worker
- [x] Sync three objects to physics rigid-bodies
- [x] Add Rigidbody support
- [ ] Add [Softbody](https://pybullet.org/Bullet/BulletFull/classbtSoftBody.html) support
  - [x] Volumes/Cloth from Triangle Mesh
  - [ ] Ropes
  - [ ] Deformables
- [ ] Add Constraints between rigid bodies
- [ ] Improve Physics API
  - [ ] Make _all_ props reactive
  - [ ] Expose more methods trough the hook (e.g. setPosition/applyImpulse/[more...](https://pybullet.org/Bullet/BulletFull/classbtRigidBody.html))
  - [ ] Support collision callbacks
- [ ] Add [Raycast](https://pybullet.org/Bullet/BulletFull/classbtCollisionWorld.html#aaac6675c8134f6695fecb431c72b0a6a) queries
  - [x] One Time (async) raytests
  - [ ] Continuous queries trough a fixed scene component
- [x] Use ArrayBuffers as a fallback for missing cross-origin isolation
  - [x] Rigid Bodies
  - [x] Soft Bodies
  - [ ] Debug Rendering
- [ ] Add Examples to the documentation
- [ ] Simulation managment
  - [x] Configurable Simulation Speed/Pausing
  - [ ] Expose performance info

- Low priority
  - [ ] Improve the automatic shape detection (set shapeType automatically based on the three Mesh type)
  - [ ] Raycast Vehicle API

## Examples

⚠️ **Note that the codesandbox examples do not support SharedArrayBuffers [due to missing cross-origin isolation](https://web.dev/coop-coep/).**
Mainly relevant for SoftBody performance, which require additional Buffer copies in the current implementation.

- [Hello Physics World](https://codesandbox.io/s/oc1op?file=/src/index.js)
- [Soft Bodies](https://codesandbox.io/s/use-ammojs-softbody-example-k59jz)
- TODO

## Documentation

### 1. Wrap your scene in a Physics Provider

```tsx
import { Physics } from "use-ammojs";

<Physics drawDebug>[...]</Physics>;
```

### 2.a Make objects physical

Automatically parse Shape parameters from the three Mesh (courtesy of [three-to-ammo](https://github.com/InfiniteLee/three-to-ammo)):

```tsx
import { Box } from "@react-three/drei";
import { useRigidbody, ShapeType } from "use-ammojs";

function MyBox() {
  const [ref] = useRigidbody(() => ({
    mass: 1,
    position: [0, 2, 4],
    shapeType: ShapeType.BOX,
  }));

  return (
    <Box ref={ref}>
      <meshBasicMaterial attach="material" color="red" />
    </Box>
  );
}
```

or define Collision Shapes manually:

```tsx
const [playerCapsuleRef] = useRigidbody(() => ({
  bodyType: BodyType.DYNAMIC,
  shapeType: ShapeType.CAPSULE,
  angularFactor: new Vector3(0, 0, 0),
  shapeConfig: {
    fit: ShapeFit.MANUAL,
    halfExtents: new Vector3(0.3, 0.6, 0.3),
  },
}));
```

or add collisions to an imported gltf scene:

```tsx
useRigidbody(
  () => ({
    shapeType: ShapeType.MESH,
    type: BodyType.STATIC,
  }),
  gltf.scene
);
```

### 2.a Make objects squishy

```tsx
const [ref] = useSoftBody(() => ({
  type: SoftBodyType.TRIMESH,
}));

return (
  <Sphere position={[0, 2, 7]} args={[1, 16, 16]} ref={ref}>
    <meshPhysicalMaterial attach="material" color="blue" />
  </Sphere>
);
```

### 2.c Add Constraints

```tsx
TODO;
```

### 3.a Raycasts

```tsx
const { rayTest } = useAmmo();

[...]

const hits = await rayTest({
  from: new Vector3(0, 5, 7),
  to: new Vector3(0, -1, 7),
  multiple: true
})

if (hits.length) {
    console.log(hits[0].object.name, hits[0].hitPosition)
}
```

### 3.b Updating Motion State

```tsx
const [playerRef, api] = useRigidbody(() => ({
  bodyType: BodyType.DYNAMIC,
  shapeType: ShapeType.CAPSULE,
  angularFactor: new Vector3(0, 0, 0),
  shapeConfig: {
    fit: ShapeFit.MANUAL,
    halfExtents: new Vector3(0.3, 0.6, 0.3),
  },
}));

function handleRespawn() {
  api.setPosition(new Vector3(0, 0, 0));
  api.setLinearVelocity(new Vector3(0, 0, 0));
}
```

## Developing locally using use-ammojs

<details> 
<summary> Setting up react-scripts to work with yarn link using @craco/craco </summary>

1. `yarn add @craco/craco --dev`
2. Replace `react-scripts` with `craco` in your `package.json` (see [@craco/craco](https://www.npmjs.com/package/@craco/craco) documentation)
3. Add `craco.config.js` to project root:

```js
const path = require("path");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Fix that prevents a duplicate react library being imported when using a linked yarn package
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        react: path.resolve("./node_modules/react"),
        "@react-three/fiber": path.resolve("./node_modules/@react-three/fiber"),
        three: path.resolve("./node_modules/three"),
      };

      return webpackConfig;
    },
  },

  // Make sure SharedArrayBuffers are available locally
  devServer: {
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
  },
};
```

</details>

1. Run `yarn link` in use-ammojs root directory
2. Run `yarn link use-ammojs` in your project's directory
3. Run `yarn start` in use-ammojs to start the development bundler
4. Build and run your project as usual
