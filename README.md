# [WIP] use-ammojs

*Fast* Physics hooks for use with [react-three-fiber](https://github.com/pmndrs/react-three-fiber).

Built on top of [three-ammo](https://github.com/infinitelee/three-ammo), which runs the wasm ammo.js library in a seperate web-worker and syncs three objects using SharedArrayBuffers.

## Why not use [use-cannon](https://github.com/pmndrs/use-cannon) instead?

use-cannon is great and a inspiration for this package, but it is missing features and lacks performance with many objects or large gltf imports. ammo.js is a direct wrapper around the powerful [Bullet Physics](http://www.bulletphysics.org/) engine.

At the time of writing however use-cannon is more mature and great for small projects.

## Roadmap

- [x] Create a Physics World as a React context and simulate it in a web-worker
- [x] Sync three objects to physics rigid-bodies
- [ ] Expose useful functions from the bullet api trough the hook (e.g. setPosition/applyImpulse/[more...](https://pybullet.org/Bullet/BulletFull/classbtRigidBody.html))
- [ ] Add [Raycast](https://pybullet.org/Bullet/BulletFull/classbtCollisionWorld.html#aaac6675c8134f6695fecb431c72b0a6a) queries
- [ ] Add Constraints between rigid bodies
- [ ] Improve the automatic shape detection (set shapeType automatically based on the three Mesh type)
- [ ] Add Softbody support (ropes, cloth, squishy balls, [see docs](https://pybullet.org/Bullet/BulletFull/classbtSoftBody.html))
- [ ] Add Examples to the documentation
- [ ] Implement convenience features (pausing simulation / access to physics performance info)
- [ ] Support collision callbacks
- [ ] Use ArrayBuffers as a fallback for missing cross-origin isolation

## Examples

⚠️ **Note that the codesandbox examples do not support SharedArrayBuffers [due to missing cross-origin isolation](https://web.dev/coop-coep/).**

* [Hello Physics World](https://codesandbox.io/s/oc1op?file=/src/index.js) 
* TODO

## Documentation

### 1. Wrap your scene in a Physics Provider
```tsx
import { Physics } from "use-ammojs";

<Physics drawDebug>
  [...] 
</Physics>
```

### 2.a Make objects physical

Automatically parse Shape parameters from the three Mesh (courtesy of [three-to-ammo](https://github.com/InfiniteLee/three-to-ammo)):

```tsx
import { Box } from "@react-three/drei";
import { usePhysics, ShapeType } from "use-ammojs";

function MyBox(){
    const [ref] = usePhysics(() => ({ mass: 1, position: [0, 2, 4], shapeType: ShapeType.BOX }));

    return (
      <Box ref={ref}>
        <meshBasicMaterial attach="material" color="red" />
      </Box>
    );
}
```

or define Collision Shapes manually:
```
TODO
```

or add collisions to an imported gltf scene:
```
TODO
```

### 2.a Make objects squishy

```
TODO
```


### 3.a Add Constraints

```
TODO
```


### 3.b Add Raycasts

```
TODO
```


### 4 Update positions


```
TODO
```


## Local Development of use-ammojs


<details> 
<summary> Setting up react-scripts to work with yarn link using @craco/craco </summary>

1. `yarn add @craco/craco --dev`
2. Replace `react-scripts` with `craco` in your `package.json` (see [@craco/craco](https://www.npmjs.com/package/@craco/craco) documentation)
3. Add `craco.config.js` to project root:

```js
const path = require("path");

[...]

// Fix that prevents a duplicate react library being imported when using a linked yarn package
webpackConfig.resolve.alias = {
  ...webpackConfig.resolve.alias,
  react: path.resolve("./node_modules/react"),
  "@react-three/fiber": path.resolve("./node_modules/@react-three/fiber"),
  three: path.resolve("./node_modules/three"),
};

[...]
```

</details>

1. Run `yarn link` in use-cannonjs root directory
2. Run `yarn link use-cannonjs` in your project's directory
3. Run `yarn start` in use-cannonjs to start the development bunlder
4. Run your project
