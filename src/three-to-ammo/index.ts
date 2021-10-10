import * as THREE from "three";
import { Quaternion, Vector3 } from "three";
import { toBtQuaternion } from "../three-ammo/worker/utils";
import { ShapeConfig, ShapeFit, ShapeType } from "../three-ammo/lib/types";

export interface FinalizedShape extends Ammo.btCollisionShape {
  type: ShapeType;
  destroy(): void;
  localTransform: Ammo.btTransform;

  // Ammo objects destroyed when shape is destroyed
  resources?: any[];

  // adress of allocated memory
  heightfieldData?: number;

  // Children in a compound shape
  shapes?: FinalizedShape[];
}

export function createCollisionShapes(
  vertices,
  matrices,
  indexes,
  matrixWorld,
  options: ShapeConfig
): FinalizedShape | null {
  switch (options.type) {
    case ShapeType.BOX:
      return createBoxShape(vertices, matrices, matrixWorld, options);
    case ShapeType.CYLINDER:
      return createCylinderShape(vertices, matrices, matrixWorld, options);
    case ShapeType.CAPSULE:
      return createCapsuleShape(vertices, matrices, matrixWorld, options);
    case ShapeType.CONE:
      return createConeShape(vertices, matrices, matrixWorld, options);
    case ShapeType.SPHERE:
      return createSphereShape(vertices, matrices, matrixWorld, options);
    case ShapeType.HULL:
      return createHullShape(vertices, matrices, matrixWorld, options);
    case ShapeType.HACD:
      return createCompoundShape(
        createHACDShapes(vertices, matrices, indexes, matrixWorld, options),
        options
      );
    case ShapeType.VHACD:
      return createCompoundShape(
        createVHACDShapes(vertices, matrices, indexes, matrixWorld, options),
        options
      );
    case ShapeType.MESH:
      return createTriMeshShape(
        vertices,
        matrices,
        indexes,
        matrixWorld,
        options
      );
    case ShapeType.HEIGHTFIELD:
      return createHeightfieldTerrainShape(options);
    default:
      console.warn(options.type + " is not currently supported");
      return null;
  }
}

export function createCompoundShape(
  shapes: FinalizedShape[],
  options: ShapeConfig
): FinalizedShape {
  const compoundShape = new Ammo.btCompoundShape(true);

  for (const shape of shapes) {
    compoundShape.addChildShape(shape.localTransform, shape);
  }

  ((compoundShape as unknown) as FinalizedShape).shapes = shapes;

  return finishCollisionShape(compoundShape, options);
}

//TODO: support gimpact (dynamic trimesh) and heightmap

export function createBoxShape(
  vertices,
  matrices,
  matrixWorld,
  options: ShapeConfig
) {
  options.type = ShapeType.BOX;
  _setOptions(options);

  if (options.fit === ShapeFit.ALL) {
    options.halfExtents = _computeHalfExtents(
      _computeBounds(vertices, matrices),
      options.minHalfExtents,
      options.maxHalfExtents
    );
  }

  const btHalfExtents = new Ammo.btVector3(
    options.halfExtents!.x,
    options.halfExtents!.y,
    options.halfExtents!.z
  );
  const collisionShape = new Ammo.btBoxShape(btHalfExtents);
  Ammo.destroy(btHalfExtents);

  return finishCollisionShape(
    collisionShape,
    options,
    _computeScale(matrixWorld, options)
  );
}

export function createCylinderShape(
  vertices,
  matrices,
  matrixWorld,
  options: ShapeConfig
) {
  options.type = ShapeType.CYLINDER;
  _setOptions(options);

  if (options.fit === ShapeFit.ALL) {
    options.halfExtents = _computeHalfExtents(
      _computeBounds(vertices, matrices),
      options.minHalfExtents,
      options.maxHalfExtents
    );
  }

  const btHalfExtents = new Ammo.btVector3(
    options.halfExtents!.x,
    options.halfExtents!.y,
    options.halfExtents!.z
  );
  const collisionShape = (() => {
    switch (options.cylinderAxis) {
      case "x":
        return new Ammo.btCylinderShapeX(btHalfExtents);
      case "z":
        return new Ammo.btCylinderShapeZ(btHalfExtents);
      case "y":
      default:
        return new Ammo.btCylinderShape(btHalfExtents);
    }
  })();
  Ammo.destroy(btHalfExtents);

  return finishCollisionShape(
    collisionShape,
    options,
    _computeScale(matrixWorld, options)
  );
}

export function createCapsuleShape(
  vertices,
  matrices,
  matrixWorld,
  options: ShapeConfig
) {
  options.type = ShapeType.CAPSULE;
  _setOptions(options);

  if (options.fit === ShapeFit.ALL) {
    options.halfExtents = _computeHalfExtents(
      _computeBounds(vertices, matrices),
      options.minHalfExtents,
      options.maxHalfExtents
    );
  }

  const { x, y, z } = options.halfExtents!;
  const collisionShape = (() => {
    switch (options.cylinderAxis) {
      case "x":
        return new Ammo.btCapsuleShapeX(Math.max(y, z), x * 2);
      case "z":
        return new Ammo.btCapsuleShapeZ(Math.max(x, y), z * 2);
      case "y":
      default:
        return new Ammo.btCapsuleShape(Math.max(x, z), y * 2);
    }
  })();

  return finishCollisionShape(
    collisionShape,
    options,
    _computeScale(matrixWorld, options)
  );
}

export function createConeShape(
  vertices,
  matrices,
  matrixWorld,
  options: ShapeConfig
) {
  options.type = ShapeType.CONE;
  _setOptions(options);

  if (options.fit === ShapeFit.ALL) {
    options.halfExtents = _computeHalfExtents(
      _computeBounds(vertices, matrices),
      options.minHalfExtents,
      options.maxHalfExtents
    );
  }

  const { x, y, z } = options.halfExtents!;
  const collisionShape = (() => {
    switch (options.cylinderAxis) {
      case "x":
        return new Ammo.btConeShapeX(Math.max(y, z), x * 2);
      case "z":
        return new Ammo.btConeShapeZ(Math.max(x, y), z * 2);
      case "y":
      default:
        return new Ammo.btConeShape(Math.max(x, z), y * 2);
    }
  })();

  return finishCollisionShape(
    collisionShape,
    options,
    _computeScale(matrixWorld, options)
  );
}

export function createSphereShape(
  vertices,
  matrices,
  matrixWorld,
  options: ShapeConfig
) {
  options.type = ShapeType.SPHERE;
  _setOptions(options);

  let radius;
  if (options.fit === ShapeFit.MANUAL && !isNaN(options.sphereRadius!)) {
    radius = options.sphereRadius;
  } else {
    radius = _computeRadius(
      vertices,
      matrices,
      _computeBounds(vertices, matrices)
    );
  }

  const collisionShape = new Ammo.btSphereShape(radius);
  return finishCollisionShape(
    collisionShape,
    options,
    _computeScale(matrixWorld, options)
  );
}

export const createHullShape = (function () {
  const vertex = new THREE.Vector3();
  const center = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  return function (vertices, matrices, matrixWorld, options: ShapeConfig) {
    options.type = ShapeType.HULL;
    _setOptions(options);

    if (options.fit === ShapeFit.MANUAL) {
      console.warn("cannot use fit: manual with type: hull");
      return null;
    }

    const bounds = _computeBounds(vertices, matrices);

    const btVertex = new Ammo.btVector3();
    const originalHull = new Ammo.btConvexHullShape();
    originalHull.setMargin(options.margin ?? 0);
    center.addVectors(bounds.max, bounds.min).multiplyScalar(0.5);

    let vertexCount = 0;
    for (let i = 0; i < vertices.length; i++) {
      vertexCount += vertices[i].length / 3;
    }

    const maxVertices = options.hullMaxVertices || 100000;
    // todo: might want to implement this in a deterministic way that doesn't do O(verts) calls to Math.random
    if (vertexCount > maxVertices) {
      console.warn(
        `too many vertices for hull shape; sampling ~${maxVertices} from ~${vertexCount} vertices`
      );
    }
    const p = Math.min(1, maxVertices / vertexCount);

    for (let i = 0; i < vertices.length; i++) {
      const components = vertices[i];
      matrix.fromArray(matrices[i]);
      for (let j = 0; j < components.length; j += 3) {
        const isLastVertex =
          i === vertices.length - 1 && j === components.length - 3;
        if (Math.random() <= p || isLastVertex) {
          // always include the last vertex
          vertex
            .set(components[j], components[j + 1], components[j + 2])
            .applyMatrix4(matrix)
            .sub(center);
          btVertex.setValue(vertex.x, vertex.y, vertex.z);
          originalHull.addPoint(btVertex, isLastVertex); // recalc AABB only on last geometry
        }
      }
    }

    let collisionShape = originalHull;
    if (originalHull.getNumVertices() >= 100) {
      //Bullet documentation says don't use convexHulls with 100 verts or more
      const shapeHull = new Ammo.btShapeHull(originalHull);
      shapeHull.buildHull(options.margin ?? 0);
      Ammo.destroy(originalHull);
      collisionShape = new Ammo.btConvexHullShape(
        // @ts-ignore
        Ammo.getPointer(shapeHull.getVertexPointer()),
        shapeHull.numVertices()
      );
      Ammo.destroy(shapeHull); // btConvexHullShape makes a copy
    }

    Ammo.destroy(btVertex);

    return finishCollisionShape(
      collisionShape,
      options,
      _computeScale(matrixWorld, options)
    );
  };
})();

export const createHACDShapes = (function () {
  const vector = new THREE.Vector3();
  const center = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  return function (
    vertices,
    matrices,
    indexes,
    matrixWorld,
    options: ShapeConfig
  ) {
    options.type = ShapeType.HACD;
    _setOptions(options);

    if (options.fit === ShapeFit.MANUAL) {
      console.warn("cannot use fit: manual with type: hacd");
      return [];
    }

    if (!Ammo.hasOwnProperty("HACD")) {
      console.warn(
        "HACD unavailable in included build of Ammo.js. Visit https://github.com/mozillareality/ammo.js for the latest version."
      );
      return [];
    }

    const bounds = _computeBounds(vertices, matrices);
    const scale = _computeScale(matrixWorld, options);

    let vertexCount = 0;
    let triCount = 0;
    center.addVectors(bounds.max, bounds.min).multiplyScalar(0.5);

    for (let i = 0; i < vertices.length; i++) {
      vertexCount += vertices[i].length / 3;
      if (indexes && indexes[i]) {
        triCount += indexes[i].length / 3;
      } else {
        triCount += vertices[i].length / 9;
      }
    }

    // @ts-ignore
    const hacd = new Ammo.HACD();
    if (options.hasOwnProperty("compacityWeight"))
      hacd.SetCompacityWeight(options.compacityWeight);
    if (options.hasOwnProperty("volumeWeight"))
      hacd.SetVolumeWeight(options.volumeWeight);
    if (options.hasOwnProperty("nClusters"))
      hacd.SetNClusters(options.nClusters);
    if (options.hasOwnProperty("nVerticesPerCH"))
      hacd.SetNVerticesPerCH(options.nVerticesPerCH);
    if (options.hasOwnProperty("concavity"))
      hacd.SetConcavity(options.concavity);

    const points = Ammo._malloc(vertexCount * 3 * 8);
    const triangles = Ammo._malloc(triCount * 3 * 4);
    hacd.SetPoints(points);
    hacd.SetTriangles(triangles);
    hacd.SetNPoints(vertexCount);
    hacd.SetNTriangles(triCount);

    let pptr = points / 8,
      tptr = triangles / 4;

    for (let i = 0; i < vertices.length; i++) {
      const components = vertices[i];
      matrix.fromArray(matrices[i]);
      for (let j = 0; j < components.length; j += 3) {
        vector
          .set(components[j + 0], components[j + 1], components[j + 2])
          .applyMatrix4(matrix)
          .sub(center);
        Ammo.HEAPF64[pptr + 0] = vector.x;
        Ammo.HEAPF64[pptr + 1] = vector.y;
        Ammo.HEAPF64[pptr + 2] = vector.z;
        pptr += 3;
      }
      if (indexes[i]) {
        const indices = indexes[i];
        for (let j = 0; j < indices.length; j++) {
          Ammo.HEAP32[tptr] = indices[j];
          tptr++;
        }
      } else {
        for (let j = 0; j < components.length / 3; j++) {
          Ammo.HEAP32[tptr] = j;
          tptr++;
        }
      }
    }

    hacd.Compute();
    Ammo._free(points);
    Ammo._free(triangles);
    const nClusters = hacd.GetNClusters();

    const shapes: FinalizedShape[] = [];
    for (let i = 0; i < nClusters; i++) {
      const hull = new Ammo.btConvexHullShape();
      hull.setMargin(options.margin ?? 0);
      const nPoints = hacd.GetNPointsCH(i);
      const nTriangles = hacd.GetNTrianglesCH(i);
      const hullPoints = Ammo._malloc(nPoints * 3 * 8);
      const hullTriangles = Ammo._malloc(nTriangles * 3 * 4);
      hacd.GetCH(i, hullPoints, hullTriangles);

      const pptr = hullPoints / 8;
      for (let pi = 0; pi < nPoints; pi++) {
        const btVertex = new Ammo.btVector3();
        const px = Ammo.HEAPF64[pptr + pi * 3 + 0];
        const py = Ammo.HEAPF64[pptr + pi * 3 + 1];
        const pz = Ammo.HEAPF64[pptr + pi * 3 + 2];
        btVertex.setValue(px, py, pz);
        hull.addPoint(btVertex, pi === nPoints - 1);
        Ammo.destroy(btVertex);
      }

      shapes.push(finishCollisionShape(hull, options, scale));
    }

    return shapes;
  };
})();

export const createVHACDShapes = (function () {
  const vector = new THREE.Vector3();
  const center = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  return function (
    vertices,
    matrices,
    indexes,
    matrixWorld,
    options: ShapeConfig
  ) {
    options.type = ShapeType.VHACD;
    _setOptions(options);

    if (options.fit === ShapeFit.MANUAL) {
      console.warn("cannot use fit: manual with type: vhacd");
      return [];
    }

    if (!Ammo.hasOwnProperty("VHACD")) {
      console.warn(
        "VHACD unavailable in included build of Ammo.js. Visit https://github.com/mozillareality/ammo.js for the latest version."
      );
      return [];
    }

    const bounds = _computeBounds(vertices, matrices);
    const scale = _computeScale(matrixWorld, options);

    let vertexCount = 0;
    let triCount = 0;
    center.addVectors(bounds.max, bounds.min).multiplyScalar(0.5);

    for (let i = 0; i < vertices.length; i++) {
      vertexCount += vertices[i].length / 3;
      if (indexes && indexes[i]) {
        triCount += indexes[i].length / 3;
      } else {
        triCount += vertices[i].length / 9;
      }
    }

    // @ts-ignore
    const vhacd = new Ammo.VHACD();
    // @ts-ignore
    const params = new Ammo.Parameters();
    //https://kmamou.blogspot.com/2014/12/v-hacd-20-parameters-description.html
    if (options.hasOwnProperty("resolution"))
      params.set_m_resolution(options.resolution);
    if (options.hasOwnProperty("depth")) params.set_m_depth(options.depth);
    if (options.hasOwnProperty("concavity"))
      params.set_m_concavity(options.concavity);
    if (options.hasOwnProperty("planeDownsampling"))
      params.set_m_planeDownsampling(options.planeDownsampling);
    if (options.hasOwnProperty("convexhullDownsampling"))
      params.set_m_convexhullDownsampling(options.convexhullDownsampling);
    if (options.hasOwnProperty("alpha")) params.set_m_alpha(options.alpha);
    if (options.hasOwnProperty("beta")) params.set_m_beta(options.beta);
    if (options.hasOwnProperty("gamma")) params.set_m_gamma(options.gamma);
    if (options.hasOwnProperty("pca")) params.set_m_pca(options.pca);
    if (options.hasOwnProperty("mode")) params.set_m_mode(options.mode);
    if (options.hasOwnProperty("maxNumVerticesPerCH"))
      params.set_m_maxNumVerticesPerCH(options.maxNumVerticesPerCH);
    if (options.hasOwnProperty("minVolumePerCH"))
      params.set_m_minVolumePerCH(options.minVolumePerCH);
    if (options.hasOwnProperty("convexhullApproximation"))
      params.set_m_convexhullApproximation(options.convexhullApproximation);
    if (options.hasOwnProperty("oclAcceleration"))
      params.set_m_oclAcceleration(options.oclAcceleration);

    const points = Ammo._malloc(vertexCount * 3 * 8 + 3);
    const triangles = Ammo._malloc(triCount * 3 * 4);

    let pptr = points / 8,
      tptr = triangles / 4;

    for (let i = 0; i < vertices.length; i++) {
      const components = vertices[i];
      matrix.fromArray(matrices[i]);
      for (let j = 0; j < components.length; j += 3) {
        vector
          .set(components[j + 0], components[j + 1], components[j + 2])
          .applyMatrix4(matrix)
          .sub(center);
        Ammo.HEAPF64[pptr + 0] = vector.x;
        Ammo.HEAPF64[pptr + 1] = vector.y;
        Ammo.HEAPF64[pptr + 2] = vector.z;
        pptr += 3;
      }
      if (indexes[i]) {
        const indices = indexes[i];
        for (let j = 0; j < indices.length; j++) {
          Ammo.HEAP32[tptr] = indices[j];
          tptr++;
        }
      } else {
        for (let j = 0; j < components.length / 3; j++) {
          Ammo.HEAP32[tptr] = j;
          tptr++;
        }
      }
    }
    vhacd.Compute(points, 3, vertexCount, triangles, 3, triCount, params);
    Ammo._free(points);
    Ammo._free(triangles);
    const nHulls = vhacd.GetNConvexHulls();

    const shapes: FinalizedShape[] = [];
    // @ts-ignore
    const ch = new Ammo.ConvexHull();
    for (let i = 0; i < nHulls; i++) {
      vhacd.GetConvexHull(i, ch);
      const nPoints = ch.get_m_nPoints();
      const hullPoints = ch.get_m_points();

      const hull = new Ammo.btConvexHullShape();
      hull.setMargin(options.margin ?? 0);

      for (let pi = 0; pi < nPoints; pi++) {
        const btVertex = new Ammo.btVector3();
        const px = ch.get_m_points(pi * 3 + 0);
        const py = ch.get_m_points(pi * 3 + 1);
        const pz = ch.get_m_points(pi * 3 + 2);
        btVertex.setValue(px, py, pz);
        hull.addPoint(btVertex, pi === nPoints - 1);
        Ammo.destroy(btVertex);
      }

      shapes.push(finishCollisionShape(hull, options, scale));
    }
    Ammo.destroy(ch);
    Ammo.destroy(vhacd);

    return shapes;
  };
})();

export const createTriMeshShape = (function () {
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  return function (
    vertices,
    matrices,
    indexes,
    matrixWorld,
    options: ShapeConfig
  ) {
    options.type = ShapeType.MESH;
    _setOptions(options);

    if (options.fit === ShapeFit.MANUAL) {
      console.warn("cannot use fit: manual with type: mesh");
      return null;
    }

    const scale = _computeScale(matrixWorld, options);

    const bta = new Ammo.btVector3();
    const btb = new Ammo.btVector3();
    const btc = new Ammo.btVector3();
    const triMesh = new Ammo.btTriangleMesh(true, false);

    for (let i = 0; i < vertices.length; i++) {
      const components = vertices[i];
      const index = indexes[i] ? indexes[i] : null;
      matrix.fromArray(matrices[i]);
      if (index) {
        for (let j = 0; j < index.length; j += 3) {
          const ai = index[j] * 3;
          const bi = index[j + 1] * 3;
          const ci = index[j + 2] * 3;
          va.set(
            components[ai],
            components[ai + 1],
            components[ai + 2]
          ).applyMatrix4(matrix);
          vb.set(
            components[bi],
            components[bi + 1],
            components[bi + 2]
          ).applyMatrix4(matrix);
          vc.set(
            components[ci],
            components[ci + 1],
            components[ci + 2]
          ).applyMatrix4(matrix);
          bta.setValue(va.x, va.y, va.z);
          btb.setValue(vb.x, vb.y, vb.z);
          btc.setValue(vc.x, vc.y, vc.z);
          triMesh.addTriangle(bta, btb, btc, false);
        }
      } else {
        for (let j = 0; j < components.length; j += 9) {
          va.set(
            components[j + 0],
            components[j + 1],
            components[j + 2]
          ).applyMatrix4(matrix);
          vb.set(
            components[j + 3],
            components[j + 4],
            components[j + 5]
          ).applyMatrix4(matrix);
          vc.set(
            components[j + 6],
            components[j + 7],
            components[j + 8]
          ).applyMatrix4(matrix);
          bta.setValue(va.x, va.y, va.z);
          btb.setValue(vb.x, vb.y, vb.z);
          btc.setValue(vc.x, vc.y, vc.z);
          triMesh.addTriangle(bta, btb, btc, false);
        }
      }
    }

    const localScale = new Ammo.btVector3(scale.x, scale.y, scale.z);
    triMesh.setScaling(localScale);
    Ammo.destroy(localScale);

    const collisionShape = new Ammo.btBvhTriangleMeshShape(triMesh, true, true);

    const triangleInfoMap = new Ammo.btTriangleInfoMap();

    if (options.computeInternalEdgeInfo ?? true) {
      collisionShape.generateInternalEdgeInfo(triangleInfoMap);
    }

    ((collisionShape as unknown) as FinalizedShape).resources = [
      triMesh,
      triangleInfoMap,
    ];

    Ammo.destroy(bta);
    Ammo.destroy(btb);
    Ammo.destroy(btc);

    const finalizedShape = finishCollisionShape(collisionShape, options);
    finalizedShape.setMargin(0);
    return finalizedShape;
  };
})();

export function createHeightfieldTerrainShape(options: ShapeConfig) {
  _setOptions(options);

  if (options.fit === ShapeFit.ALL) {
    console.warn("cannot use fit: all with type: heightfield");
    return null;
  }
  const heightfieldDistance = options.heightfieldDistance || 1;
  const heightfieldData = options.heightfieldData || [];
  const heightScale = options.heightScale || 0;
  const upAxis = options.upAxis ?? 1; // x = 0; y = 1; z = 2
  const hdt = (() => {
    switch (options.heightDataType) {
      case "short":
        // @ts-ignore
        return Ammo.PHY_SHORT;
      case "float":
        // @ts-ignore
        return Ammo.PHY_FLOAT;
      default:
        // @ts-ignore
        return Ammo.PHY_FLOAT;
    }
  })();
  const flipQuadEdges = options.hasOwnProperty("flipQuadEdges")
    ? options.flipQuadEdges
    : true;

  const heightStickLength = heightfieldData.length;
  const heightStickWidth =
    heightStickLength > 0 ? heightfieldData[0].length : 0;

  const data = Ammo._malloc(heightStickLength * heightStickWidth * 4);
  const ptr = data / 4;

  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;
  let index = 0;
  for (let l = 0; l < heightStickLength; l++) {
    for (let w = 0; w < heightStickWidth; w++) {
      const height = heightfieldData[l][w];
      Ammo.HEAPF32[ptr + index] = height;
      index++;
      minHeight = Math.min(minHeight, height);
      maxHeight = Math.max(maxHeight, height);
    }
  }

  const collisionShape = new Ammo.btHeightfieldTerrainShape(
    heightStickWidth,
    heightStickLength,
    data,
    heightScale,
    minHeight,
    maxHeight,
    upAxis,
    hdt,
    flipQuadEdges ?? false
  );

  const scale = new Ammo.btVector3(heightfieldDistance, 1, heightfieldDistance);
  collisionShape.setLocalScaling(scale);
  Ammo.destroy(scale);
  // @ts-ignore
  collisionShape.heightfieldData = data;

  return finishCollisionShape(collisionShape, options);
}

function _setOptions(options: ShapeConfig) {
  options.fit = options.fit ?? ShapeFit.ALL;
  options.minHalfExtents = options.minHalfExtents ?? 0;
  options.maxHalfExtents = options.maxHalfExtents ?? Number.POSITIVE_INFINITY;
}

function finishCollisionShape(
  collisionShape: Ammo.btCollisionShape,
  options: ShapeConfig,
  scale?: Vector3
): FinalizedShape {
  collisionShape.setMargin(options.margin ?? 0);

  const localTransform = new Ammo.btTransform();
  const rotation = new Ammo.btQuaternion(0, 0, 0, 1);
  localTransform.setIdentity();

  if (options.offset) {
    localTransform
      .getOrigin()
      .setValue(-options.offset.x, -options.offset.y, -options.offset.z);
  }

  toBtQuaternion(rotation, options.orientation ?? new Quaternion());
  const invertedRotation = rotation.inverse();
  localTransform.setRotation(invertedRotation);

  Ammo.destroy(rotation);
  Ammo.destroy(invertedRotation);

  if (scale) {
    const localScale = new Ammo.btVector3(scale.x, scale.y, scale.z);
    collisionShape.setLocalScaling(localScale);
    Ammo.destroy(localScale);
  }

  return Object.assign(collisionShape, {
    type: options.type,
    localTransform,
    destroy() {
      const finalizedShape = collisionShape as FinalizedShape;

      for (let res of finalizedShape.resources || []) {
        Ammo.destroy(res);
      }

      if (finalizedShape.heightfieldData) {
        Ammo._free(finalizedShape.heightfieldData);
      }

      if (finalizedShape.shapes) {
        for (const shape of finalizedShape.shapes) {
          shape.destroy();
        }
      }

      Ammo.destroy(collisionShape);
    },
  });
}

export const iterateGeometries = (function () {
  const inverse = new THREE.Matrix4();
  return function (root, options, cb) {
    inverse.copy(root.matrixWorld).invert();
    const scale = new THREE.Vector3();
    scale.setFromMatrixScale(root.matrixWorld);
    root.traverse((mesh) => {
      const transform = new THREE.Matrix4();
      if (
        mesh.isMesh &&
        mesh.name !== "Sky" &&
        (options.includeInvisible ||
          (mesh.el && mesh.el.object3D.visible) ||
          mesh.visible)
      ) {
        if (mesh === root) {
          transform.identity();
        } else {
          mesh.updateWorldMatrix(true);
          transform.multiplyMatrices(inverse, mesh.matrixWorld);
        }
        // todo: might want to return null xform if this is the root so that callers can avoid multiplying
        // things by the identity matrix
        cb(
          mesh.geometry.isBufferGeometry
            ? mesh.geometry.attributes.position.array
            : mesh.geometry.vertices,
          transform.elements,
          mesh.geometry.index ? mesh.geometry.index.array : null
        );
      }
    });
  };
})();

const _computeScale = (function () {
  const matrix = new THREE.Matrix4();
  return function (matrixWorld, options: Pick<ShapeConfig, "fit"> = {}) {
    const scale = new THREE.Vector3(1, 1, 1);
    if (options.fit === ShapeFit.ALL) {
      matrix.fromArray(matrixWorld);
      scale.setFromMatrixScale(matrix);
    }
    return scale;
  };
})();

const _computeRadius = (function () {
  const center = new THREE.Vector3();
  return function (vertices, matrices, bounds) {
    let maxRadiusSq = 0;
    let { x: cx, y: cy, z: cz } = bounds.getCenter(center);

    _iterateVertices(vertices, matrices, (v) => {
      const dx = cx - v.x;
      const dy = cy - v.y;
      const dz = cz - v.z;
      maxRadiusSq = Math.max(maxRadiusSq, dx * dx + dy * dy + dz * dz);
    });
    return Math.sqrt(maxRadiusSq);
  };
})();

const _computeHalfExtents = function (bounds, minHalfExtent, maxHalfExtent) {
  const halfExtents = new THREE.Vector3();
  return halfExtents
    .subVectors(bounds.max, bounds.min)
    .multiplyScalar(0.5)
    .clampScalar(minHalfExtent, maxHalfExtent);
};

const _computeLocalOffset = function (matrix, bounds, target) {
  target
    .addVectors(bounds.max, bounds.min)
    .multiplyScalar(0.5)
    .applyMatrix4(matrix);
  return target;
};

// returns the bounding box for the geometries underneath `root`.
const _computeBounds = function (vertices, matrices) {
  const bounds = new THREE.Box3();
  let minX = +Infinity;
  let minY = +Infinity;
  let minZ = +Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  bounds.min.set(0, 0, 0);
  bounds.max.set(0, 0, 0);

  _iterateVertices(vertices, matrices, (v) => {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.z < minZ) minZ = v.z;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
    if (v.z > maxZ) maxZ = v.z;
  });

  bounds.min.set(minX, minY, minZ);
  bounds.max.set(maxX, maxY, maxZ);
  return bounds;
};

const _iterateVertices = (function () {
  const vertex = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  return function (vertices, matrices, cb) {
    for (let i = 0; i < vertices.length; i++) {
      matrix.fromArray(matrices[i]);
      for (let j = 0; j < vertices[i].length; j += 3) {
        vertex
          .set(vertices[i][j], vertices[i][j + 1], vertices[i][j + 2])
          .applyMatrix4(matrix);
        cb(vertex);
      }
    }
  };
})();
