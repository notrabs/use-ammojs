import { BufferGeometry, BufferAttribute, Vector3, Matrix4 } from 'three/build/three.module.js'

export function CSG2Geom(csg) {
  const vertices = []
  const indices = []
  let idx = 0
  csg.polygons.forEach((polygon) => {
    polygon.vertices.forEach((vertex) => {
      vertex.index = idx
      vertices.push(vertex[0], vertex[1], vertex[2])
      idx++
    })
    const first = polygon.vertices[0].index
    for (let i = 2; i < polygon.vertices.length; i++) {
      const second = polygon.vertices[i - 1].index
      const third = polygon.vertices[i].index
      indices.push(first, second, third)
    }
  })

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3))
  geo.setIndex(indices)
  if (csg.transforms) {
    const transforms = new Matrix4()
    transforms.set(...csg.transforms).transpose()
    geo.applyMatrix4(transforms)
  }
  geo.computeVertexNormals()

  //console.log(geo);
  const positions = {}
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const pArray = geo.attributes.position.array
    const x = Math.round(pArray[i * 3] * 100)
    const y = Math.round(pArray[i * 3 + 1] * 100)
    const z = Math.round(pArray[i * 3 + 2] * 100)
    const position = `${x},${y},${z}`
    if (!positions[position]) {
      positions[position] = { normals: [] }
    }
    const nArray = geo.attributes.normal.array
    const nx = nArray[i * 3]
    const ny = nArray[i * 3 + 1]
    const nz = nArray[i * 3 + 2]
    const normal = new Vector3(nx, ny, nz)
    positions[position].normals.push({ index: i, normal: normal })
  }

  for (let p in positions) {
    const currentPosition = positions[p]
    const nl = currentPosition.normals.length
    const toAverage = {}
    for (let i = 0; i < nl - 1; i += 1) {
      for (let j = i + 1; j < nl; j += 1) {
        const n1 = currentPosition.normals[i].normal
        const n2 = currentPosition.normals[j].normal
        if (n1.angleTo(n2) < Math.PI * 0.5 && n1.angleTo(n2) !== 0) {
          toAverage[currentPosition.normals[i].index] = currentPosition.normals[i].normal
          toAverage[currentPosition.normals[j].index] = currentPosition.normals[j].normal
        }
      }
    }
    const averageNormal = new Vector3()
    const indexes = Object.keys(toAverage)
    indexes.forEach((index) => {
      averageNormal.add(toAverage[index])
      averageNormal.normalize()
    })
    indexes.forEach((index) => {
      geo.attributes.normal.array[index * 3] = averageNormal.x
      geo.attributes.normal.array[index * 3 + 1] = averageNormal.y
      geo.attributes.normal.array[index * 3 + 2] = averageNormal.z
    })
  }

  geo.attributes.normal.array.needsUpdate = true
  return geo
}
