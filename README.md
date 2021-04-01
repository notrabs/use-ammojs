# [WIP] use-ammojs

*Fast* Physics hooks for use with [react-three-fiber](https://github.com/pmndrs/react-three-fiber).

Built on top of [three-ammo](https://github.com/infinitelee/three-ammo), which runs the wasm ammo.js library in a seperate web-worker and syncs three objects using SharedArrayBuffers.

## Why not use [use-cannon](https://github.com/pmndrs/use-cannon) instead?

use-cannon is great and a inspiration for this package, but it is missing features and lacks performance with many objects or large gltf imports. ammo.js is a direct wrapper around the powerful [Bullet Physics](http://www.bulletphysics.org/) engine.

At the time of writing however use-cannon is more mature and great for small projects.


## Documentation [WIP]

1. Wrap your scene in a Physics Provider:
```
<Physics {...physicsOptions}>
  [...] 
</Physics>
```

2. Make objects physical:

Automatically (courtesy of [three-to-ammo](https://github.com/InfiniteLee/three-to-ammo)):

```
import { Box } from "@react-three/drei";
import { usePhysicsMesh } from "use-ammojs";

function MyBox(){
    const ref = usePhysicsMesh(() => ({ mass: 1, position: [0, 2, 4] }));

    return (
      <Box ref={ref}>
        <meshBasicMaterial attach="material" color="red" />
      </Box>
    );
}
```

Defining Collision Shapes manually:
```
TODO
```

Adding collisions to an imported gltf scene:
```
TODO
```

