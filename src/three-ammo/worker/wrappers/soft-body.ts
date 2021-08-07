import {
  BodyActivationState,
  SharedSoftBodyBuffers,
  SoftBodyConfig,
} from "../../lib/types";
import { World } from "./world";

export class SoftBody {
  world: World;
  buffers: SharedSoftBodyBuffers;
  private physicsBody: Ammo.btSoftBody;
  numVerts: number;

  constructor(
    world: World,
    buffers: SharedSoftBodyBuffers,
    {
      type,

      mass = 1,
      margin = 0.05,

      viterations = 40,
      piterations = 40,

      friction = 0.1,
      damping = 0.01,
      pressure = 200,

      linearStiffness = 0.9,
      angularStiffness = 0.9,
      volumeStiffness = 0.9,

      collisionFilterGroup = 1,
      collisionFilterMask = 1,

      randomizeConstraints = true,
      activationState = BodyActivationState.DISABLE_DEACTIVATION,
    }: SoftBodyConfig
  ) {
    this.world = world;
    this.buffers = buffers;

    this.numVerts = buffers.vertexFloatArray.length / 3;

    // console.log("numVerts", this.numVerts);
    // console.log("numFaces", buffers.indexIntArray.length / 3);
    // console.log("indices", buffers.indexIntArray);
    // console.log("verts", buffers.vertexFloatArray);
    // console.log("normals", buffers.normalFloatArray);

    this.physicsBody = world.softBodyHelpers.CreateFromTriMesh(
      world.physicsWorld.getWorldInfo(),
      buffers.vertexFloatArray as any,
      buffers.indexIntArray as any,
      buffers.indexIntArray.length / 3,
      randomizeConstraints
    );

    const sbConfig = this.physicsBody.get_m_cfg();
    sbConfig.set_viterations(viterations);
    sbConfig.set_piterations(piterations);

    // Soft-soft and soft-rigid collisions
    sbConfig.set_collisions(0x11);

    // Friction
    sbConfig.set_kDF(friction);
    // Damping
    sbConfig.set_kDP(damping);
    // Pressure
    sbConfig.set_kPR(pressure);

    // Stiffness
    this.physicsBody.get_m_materials().at(0).set_m_kLST(linearStiffness);
    this.physicsBody.get_m_materials().at(0).set_m_kAST(angularStiffness);
    this.physicsBody.get_m_materials().at(0).set_m_kVST(volumeStiffness);

    this.physicsBody.setTotalMass(mass, false);

    Ammo.castObject<Ammo.btCollisionObject>(
      this.physicsBody,
      Ammo.btCollisionObject
    )
      .getCollisionShape()
      .setMargin(margin);

    this.world.physicsWorld.addSoftBody(
      this.physicsBody,
      collisionFilterGroup,
      collisionFilterMask
    );

    // Disable deactivation
    this.physicsBody.setActivationState(activationState);
  }

  copyStateToBuffer() {
    const nodes = this.physicsBody.get_m_nodes();

    for (let vertexIndex = 0; vertexIndex < this.numVerts; vertexIndex++) {
      const node = nodes.at(vertexIndex);

      const nodePos = node.get_m_x();
      const bufferIndex = vertexIndex * 3;

      this.buffers.vertexFloatArray[bufferIndex] = nodePos.x();
      this.buffers.vertexFloatArray[bufferIndex + 1] = nodePos.y();
      this.buffers.vertexFloatArray[bufferIndex + 2] = nodePos.z();

      const nodeNormal = node.get_m_n();

      this.buffers.normalFloatArray[bufferIndex] = nodeNormal.x();
      this.buffers.normalFloatArray[bufferIndex + 1] = nodeNormal.y();
      this.buffers.normalFloatArray[bufferIndex + 2] = nodeNormal.z();
    }
  }

  destroy() {
    this.world.physicsWorld.removeSoftBody(this.physicsBody);

    Ammo.destroy(this.physicsBody);
  }
}
