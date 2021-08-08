import {
  AsyncRequestOptions,
  ClientMessageType,
  MessageType,
  RaycastHit, RaycastHitMessage,
  RaycastOptions,
} from "../../lib/types";
import { world } from "./world-manager";
import { ptrToRigidBody } from "./rigid-body-manager";
import { ptrToSoftBody } from "./soft-body-manager";

function raycastRequest({
  requestId,
  from,
  to,
  multiple = false,
  collisionFilterGroup = 0x0001,
  collisionFilterMask = 0xffff,
}: RaycastOptions & AsyncRequestOptions) {
  let collisionCallback: Ammo.RayResultCallback;

  const start = new Ammo.btVector3(from.x, from.y, from.z);
  const end = new Ammo.btVector3(to.x, to.y, to.z);

  if (multiple) {
    collisionCallback = new Ammo.AllHitsRayResultCallback(start, end);
  } else {
    collisionCallback = new Ammo.ClosestRayResultCallback(start, end);
  }

  collisionCallback.set_m_collisionFilterGroup(collisionFilterGroup);
  collisionCallback.set_m_collisionFilterMask(collisionFilterMask);

  world.physicsWorld.rayTest(start, end, collisionCallback);

  const hits: RaycastHitMessage[] = [];

  function addHit(
    object: Ammo.btCollisionObject,
    point: Ammo.btVector3,
    normal: Ammo.btVector3
  ) {
    const ptr = Ammo.getPointer(object);

    hits.push({
      uuid: ptrToRigidBody[ptr] || ptrToSoftBody[ptr],

      hitPosition: {
        x: point.x(),
        y: point.y(),
        z: point.z(),
      },

      normal: {
        x: normal.x(),
        y: normal.y(),
        z: normal.z(),
      },
    });
  }

  if (multiple) {
    const allHitsCallback = collisionCallback as Ammo.AllHitsRayResultCallback;

    const collisionObjects = allHitsCallback.get_m_collisionObjects();
    const hitPoints = allHitsCallback.get_m_hitPointWorld();
    const hitNormals = allHitsCallback.get_m_hitNormalWorld();

    const hitCount = collisionObjects.size();

    for (let i = 0; i < hitCount; i++) {
      addHit(collisionObjects.at(i), hitPoints.at(i), hitNormals.at(i));
    }
  } else {
    if (collisionCallback.hasHit()) {
      const closestHitCallback = collisionCallback as Ammo.ClosestRayResultCallback;

      addHit(
        closestHitCallback.get_m_collisionObject(),
        closestHitCallback.get_m_hitPointWorld(),
        closestHitCallback.get_m_hitNormalWorld()
      );
    }
  }

  postMessage({
    type: ClientMessageType.RAYCAST_RESPONSE,
    requestId,
    hits,
  });

  Ammo.destroy(start);
  Ammo.destroy(end);
  Ammo.destroy(collisionCallback);
}

export const raycastEventReceivers = {
  [MessageType.RAYCAST_REQUEST]: raycastRequest,
};
