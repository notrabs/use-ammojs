import {
  BodyActivationState,
  SharedSoftBodyBuffers,
  SoftBodyConfig,
  SoftBodyFCollisionFlag,
  SoftBodyType,
} from "../../lib/types";
import { World } from "./world";
import { isSoftBodyRigidBodyAnchor, toBtVector3, toVector3 } from "../utils";
import { bodies } from "../managers/rigid-body-manager";
import { ZERO } from "../../lib/constants";

export class SoftBody {
  world: World;
  buffers: SharedSoftBodyBuffers;
  physicsBody: Ammo.btSoftBody;
  numVerts: number;
  type: SoftBodyType;
  mass: number;

  constructor(
    world: World,
    buffers: SharedSoftBodyBuffers,
    {
      type = SoftBodyType.TRIMESH,

      mass = 1,
      margin = 0.05,

      clusters = 30,

      viterations = 40,
      piterations = 40,

      friction = 0.1,
      damping = 0.01,
      pressure = 10,

      linearStiffness = 0.9,
      angularStiffness = 0.9,
      volumeStiffness = 0.9,

      collisionFilterGroup = 0x0001,
      collisionFilterMask = 0xffff,

      // Soft-soft and soft-rigid collisions
      collisionFlag = SoftBodyFCollisionFlag.SDF_RS |
        SoftBodyFCollisionFlag.VF_SS,

      randomizeConstraints = true,
      activationState = BodyActivationState.DISABLE_DEACTIVATION,

      anchors,
    }: SoftBodyConfig
  ) {
    this.world = world;
    this.buffers = buffers;
    this.type = type;

    this.numVerts = buffers.vertexFloatArray.length / 3;

    // console.log("numVerts", this.numVerts);
    // console.log("numFaces", buffers.indexIntArray.length / 3);
    // console.log("indices", buffers.indexIntArray);
    // console.log("verts", buffers.vertexFloatArray);
    // console.log("normals", buffers.normalFloatArray);

    switch (type) {
      case SoftBodyType.TRIMESH:
        this.physicsBody = world.softBodyHelpers.CreateFromTriMesh(
          world.physicsWorld.getWorldInfo(),
          buffers.vertexFloatArray as any,
          buffers.indexIntArray as any,
          buffers.indexIntArray.length / 3,
          randomizeConstraints
        );
        break;
      case SoftBodyType.ROPE:
        const vertBtVector = new Ammo.btVector3(
          buffers.vertexFloatArray[0],
          buffers.vertexFloatArray[1],
          buffers.vertexFloatArray[2]
        );

        this.physicsBody = new Ammo.btSoftBody(
          world.physicsWorld.getWorldInfo(),
          1,
          vertBtVector,
          [mass / this.numVerts]
        );

        for (let i = 1; i < this.numVerts; i++) {
          vertBtVector.setValue(
            buffers.vertexFloatArray[i * 3],
            buffers.vertexFloatArray[i * 3 + 1],
            buffers.vertexFloatArray[i * 3 + 2]
          );

          this.physicsBody.appendNode(vertBtVector, mass / this.numVerts);

          this.physicsBody.appendLink(i - 1, i, 0 as any, false);
        }

        Ammo.destroy(vertBtVector);

        break;
      default:
        throw new Error("unknown soft body type " + type);
    }

    const sbConfig = this.physicsBody.get_m_cfg();
    sbConfig.set_viterations(viterations);
    sbConfig.set_piterations(piterations);

    sbConfig.set_collisions(collisionFlag);

    // Friction
    sbConfig.set_kDF(friction);
    // Damping
    sbConfig.set_kDP(damping);
    // Pressure
    if (type !== SoftBodyType.ROPE) {
      sbConfig.set_kPR(pressure);
    }

    // Stiffness
    this.physicsBody.get_m_materials().at(0).set_m_kLST(linearStiffness);
    this.physicsBody.get_m_materials().at(0).set_m_kAST(angularStiffness);
    this.physicsBody.get_m_materials().at(0).set_m_kVST(volumeStiffness);

    this.physicsBody.setTotalMass(mass, false);
    this.mass = mass;

    // this.physicsBody.setPose(true, true);

    Ammo.castObject<Ammo.btCollisionObject>(
      this.physicsBody,
      Ammo.btCollisionObject
    )
      .getCollisionShape()
      .setMargin(margin);

    if (clusters > 0) {
      this.physicsBody.generateClusters(clusters);
    }

    this.world.physicsWorld.addSoftBody(
      this.physicsBody,
      collisionFilterGroup,
      collisionFilterMask
    );

    this.updateConfig({ activationState, anchors });
  }

  updateConfig(config: SoftBodyConfig) {
    if (config.activationState !== undefined) {
      this.physicsBody.setActivationState(config.activationState);
    }

    if (config.anchors) {
      const existingAnchors = this.physicsBody.get_m_anchors();
      for (let i = 0; i < existingAnchors.size(); i++) {
        Ammo.destroy(existingAnchors.at(i));
      }
      existingAnchors.clear();

      this.physicsBody.setTotalMass(this.mass, false);

      const tmpVec3 = new Ammo.btVector3();

      for (const anchor of config.anchors) {
        if (isSoftBodyRigidBodyAnchor(anchor)) {
          if (bodies[anchor.rigidBodyUUID]) {
            this.physicsBody.appendAnchor(
              anchor.nodeIndex,
              bodies[anchor.rigidBodyUUID].physicsBody,
              anchor.disableCollisionBetweenLinkedBodies ?? false,
              anchor.influence ?? 1
            );

            const existingAnchors = this.physicsBody.get_m_anchors();
            toBtVector3(tmpVec3, anchor.localOffset ?? ZERO);

            const an = existingAnchors.at(existingAnchors.size() - 1);
            an.set_m_local(tmpVec3);

            // Pop and push to update because at() returns a copy
            existingAnchors.pop_back();
            existingAnchors.push_back(an);
          } else {
            console.warn("rigid body needed for anchor not found: ", anchor);
          }
        } else {
          this.physicsBody.setMass(anchor.nodeIndex, 0);
        }
      }

      Ammo.destroy(tmpVec3);
    }
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

      if (this.type === SoftBodyType.TRIMESH) {
        const nodeNormal = node.get_m_n();

        this.buffers.normalFloatArray[bufferIndex] = nodeNormal.x();
        this.buffers.normalFloatArray[bufferIndex + 1] = nodeNormal.y();
        this.buffers.normalFloatArray[bufferIndex + 2] = nodeNormal.z();
      }
    }
  }

  destroy() {
    this.world.physicsWorld.removeSoftBody(this.physicsBody);

    Ammo.destroy(this.physicsBody);
  }
}
