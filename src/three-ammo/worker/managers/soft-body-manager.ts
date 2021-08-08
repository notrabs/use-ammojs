import {
  ClientMessageType,
  MessageType,
  SharedBuffers,
  SharedSoftBodyBuffers,
  SoftBodyConfig,
  UUID,
} from "../../lib/types";
import { SoftBody } from "../wrappers/soft-body";
import { usingSharedArrayBuffer, world } from "./world-manager";

const softbodies: Record<UUID, SoftBody> = {};

function addSoftbody({
  uuid,
  sharedSoftBodyBuffers,
  softBodyConfig,
}: {
  uuid: UUID;
  sharedSoftBodyBuffers: SharedSoftBodyBuffers;
  softBodyConfig: SoftBodyConfig;
}) {
  softbodies[uuid] = new SoftBody(world, sharedSoftBodyBuffers, softBodyConfig);

  if (usingSharedArrayBuffer) {
    postMessage({
      type: ClientMessageType.SOFTBODY_READY,
      uuid,
      sharedSoftBodyBuffers,
    });
  } else {
    postMessage(
      { type: ClientMessageType.SOFTBODY_READY, uuid, sharedSoftBodyBuffers },
      [sharedSoftBodyBuffers.vertexFloatArray.buffer]
    );
  }
}

function removeSoftbody({ uuid }: { uuid: UUID }) {
  if (softbodies[uuid]) {
    softbodies[uuid].destroy();

    delete softbodies[uuid];
  }
}

export function updateSoftBodyBuffers(sharedBuffers: SharedBuffers) {
  for (const ssbb of sharedBuffers.softBodies) {
    if (softbodies[ssbb.uuid]) {
      softbodies[ssbb.uuid].buffers = ssbb;
    }
  }
}

export function copyToSoftBodyBuffers() {
  for (const softBody of Object.values(softbodies)) {
    softBody.copyStateToBuffer();
  }
}

export const softBodyEventReceivers = {
  [MessageType.ADD_SOFTBODY]: addSoftbody,
  [MessageType.REMOVE_SOFTBODY]: removeSoftbody,
};
