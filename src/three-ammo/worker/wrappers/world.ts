import { WorldConfig } from "../../lib/types";
import { DEFAULT_TIMESTEP, EPS, GRAVITY } from "../../lib/constants";
import { AmmoDebugConstants, AmmoDebugDrawer } from "ammo-debug-drawer";

export class World {
  collisionConfiguration: Ammo.btDefaultCollisionConfiguration;
  dispatcher: Ammo.btCollisionDispatcher;
  broadphase: Ammo.btDbvtBroadphase;
  solver: Ammo.btSequentialImpulseConstraintSolver;
  physicsWorld: Ammo.btSoftRigidDynamicsWorld;
  debugDrawer: AmmoDebugDrawer | null = null;

  object3Ds = new Map();
  collisions = new Map();
  collisionKeys: any[] = [];
  epsilon: number;
  debugDrawMode: number;
  maxSubSteps: number;
  fixedTimeStep: number;

  softBodySolver: Ammo.btDefaultSoftBodySolver;
  softBodyHelpers: Ammo.btSoftBodyHelpers;

  constructor(worldConfig: WorldConfig) {
    this.epsilon = worldConfig.epsilon || EPS;
    this.debugDrawMode =
      worldConfig.debugDrawMode || AmmoDebugConstants.NoDebug;
    this.maxSubSteps = worldConfig.maxSubSteps || 4;
    this.fixedTimeStep = worldConfig.fixedTimeStep || DEFAULT_TIMESTEP;
    this.collisionConfiguration = new Ammo.btSoftBodyRigidBodyCollisionConfiguration();
    this.dispatcher = new Ammo.btCollisionDispatcher(
      this.collisionConfiguration
    );
    this.broadphase = new Ammo.btDbvtBroadphase();
    this.solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.softBodySolver = new Ammo.btDefaultSoftBodySolver();
    this.physicsWorld = new Ammo.btSoftRigidDynamicsWorld(
      this.dispatcher,
      this.broadphase,
      this.solver,
      this.collisionConfiguration,
      this.softBodySolver
    );
    // this.physicsWorld.setForceUpdateAllAabbs(false);

    const gravity = new Ammo.btVector3(0, GRAVITY, 0);
    if (worldConfig.gravity) {
      gravity.setValue(
        worldConfig.gravity.x,
        worldConfig.gravity.y,
        worldConfig.gravity.z
      );
    }
    this.physicsWorld.setGravity(gravity);
    Ammo.destroy(gravity);

    this.physicsWorld
      .getSolverInfo()
      .set_m_numIterations(worldConfig.solverIterations || 10);

    this.softBodyHelpers = new Ammo.btSoftBodyHelpers();
  }

  isDebugEnabled() {
    return this.debugDrawMode !== AmmoDebugConstants.NoDebug;
  }

  addRigidBody(body: Ammo.btRigidBody, matrix, group, mask) {
    this.physicsWorld.addRigidBody(body, group, mask);
    this.object3Ds.set(Ammo.getPointer(body), matrix);
  }

  removeRigidBody(body) {
    this.physicsWorld.removeRigidBody(body);
    const bodyptr = Ammo.getPointer(body);
    this.object3Ds.delete(bodyptr);
    this.collisions.delete(bodyptr);
    const idx = this.collisionKeys.indexOf(bodyptr);
    if (idx !== -1) {
      this.collisionKeys.splice(idx, 1);
    }
  }

  updateRigidBody(body) {
    if (this.object3Ds.has(Ammo.getPointer(body))) {
      this.physicsWorld.updateSingleAabb(body);
    }
  }

  step(deltaTime): number {
    const numSubsteps = this.physicsWorld.stepSimulation(
      deltaTime,
      this.maxSubSteps,
      this.fixedTimeStep
    );

    for (let k = 0; k < this.collisionKeys.length; k++) {
      this.collisions.get(this.collisionKeys[k]).length = 0;
    }

    const numManifolds = this.dispatcher.getNumManifolds();
    for (let i = 0; i < numManifolds; i++) {
      const persistentManifold = this.dispatcher.getManifoldByIndexInternal(i);
      const numContacts = persistentManifold.getNumContacts();
      const body0ptr = Ammo.getPointer(persistentManifold.getBody0());
      const body1ptr = Ammo.getPointer(persistentManifold.getBody1());

      for (let j = 0; j < numContacts; j++) {
        const manifoldPoint = persistentManifold.getContactPoint(j);
        const distance = manifoldPoint.getDistance();
        if (distance <= this.epsilon) {
          if (!this.collisions.has(body0ptr)) {
            this.collisions.set(body0ptr, []);
            this.collisionKeys.push(body0ptr);
          }
          if (this.collisions.get(body0ptr).indexOf(body1ptr) === -1) {
            this.collisions.get(body0ptr).push(body1ptr);
          }
          if (!this.collisions.has(body1ptr)) {
            this.collisions.set(body1ptr, []);
            this.collisionKeys.push(body1ptr);
          }
          if (this.collisions.get(body1ptr).indexOf(body0ptr) === -1) {
            this.collisions.get(body1ptr).push(body0ptr);
          }
          break;
        }
      }
    }

    if (this.debugDrawer) {
      this.debugDrawer.update();
    }

    return numSubsteps;
  }

  destroy() {
    Ammo.destroy(this.collisionConfiguration);
    Ammo.destroy(this.dispatcher);
    Ammo.destroy(this.broadphase);
    Ammo.destroy(this.solver);
    Ammo.destroy(this.softBodySolver);
    Ammo.destroy(this.physicsWorld);
    Ammo.destroy(this.debugDrawer);
    Ammo.destroy(this.softBodyHelpers);
  }

  getDebugDrawer(
    debugIndexArray,
    debugMatricesArray,
    debugColorsArray,
    options
  ) {
    if (!this.debugDrawer) {
      options = options || {};
      options.debugDrawMode = options.debugDrawMode || this.debugDrawMode;
      this.debugDrawer = new AmmoDebugDrawer(
        debugIndexArray,
        debugMatricesArray,
        debugColorsArray,
        this.physicsWorld,
        options
      );
    }

    return this.debugDrawer;
  }
}
