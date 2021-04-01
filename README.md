# [WIP] use-ammojs

*Fast* Physics hooks for use with [react-three-fiber](https://github.com/pmndrs/react-three-fiber).

Built on top of [three-ammo](https://github.com/infinitelee/three-ammo), which runs the wasm ammo.js library in a seperate web-worker and syncs three objects using SharedArrayBuffers.

## Why not use [use-cannon](https://github.com/pmndrs/use-cannon) instead?

use-cannon is great and a inspiration for this package, but it is missing features and lacks performance with many objects or large gltf imports. ammo.js is a direct wrapper around the powerful [Bullet Physics](http://www.bulletphysics.org/) engine.

At the time of writing however use-cannon is more mature and great for small projects.


## Documentation [WIP]

### 0. Make sure your environment supports wasm

<details> 
<summary> Add support to react-scripts (create-react-app) using @craco/craco </summary>

1. `yarn add @craco/craco --dev`
2. Replace `react-scripts` with `craco` in your `package.json` (see [@craco/craco](https://www.npmjs.com/package/@craco/craco) documentation)
3. Add `craco.config.js` to project root:
```js
const { addBeforeLoader, loaderByName } = require("@craco/craco");

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      const wasmExtensionRegExp = /\.wasm$/;
      webpackConfig.resolve.extensions.push(".wasm");

      webpackConfig.module.rules.forEach((rule) => {
        (rule.oneOf || []).forEach((oneOf) => {
          if (oneOf.loader && oneOf.loader.indexOf("file-loader") >= 0) {
            oneOf.exclude.push(wasmExtensionRegExp);
          }
        });
      });

      const wasmLoader = {
        test: /\.wasm$/,
        type: "javascript/auto",
        loaders: ["file-loader"],
      };

      addBeforeLoader(webpackConfig, loaderByName("file-loader"), wasmLoader);

      return webpackConfig;
    },
  },
};
```

For local development with `yarn link` also add: 

```js
const path = require("path");

[...]

// Fix that prevents a duplicate react library being used when using a linked yarn package
webpackConfig.resolve.alias = {
  ...webpackConfig.resolve.alias,
  react: path.resolve("./node_modules/react"),
  "react-three-fiber": path.resolve("./node_modules/react-three-fiber"),
  three: path.resolve("./node_modules/three"),
};

[...]
```


</details>

### 1. Wrap your scene in a Physics Provider
```tsx
import { Physics } from "use-ammojs";

<Physics drawDebug>
  [...] 
</Physics>
```

### 2. Make objects physical

Automatically parse Shape parameters from the three Mesh (courtesy of [three-to-ammo](https://github.com/InfiniteLee/three-to-ammo)):

```tsx
import { Box } from "@react-three/drei";
import { usePhysics, ShapeType } from "use-ammojs";

function MyBox(){
    const ref = usePhysics(() => ({ mass: 1, position: [0, 2, 4], shapeType: ShapeType.BOX }));

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

### 3.a Add Constraints

```
TODO
```


### 3.b Add Raycasts

```
TODO
```


### 4 Update positions