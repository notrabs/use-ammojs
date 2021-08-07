import {
  MessageType,
  SharedSoftBodyBuffers,
  SoftBodyConfig,
  UUID,
} from "../../lib/types";
import { SoftBody } from "../wrappers/soft-body";
import { world } from "./world-manager";

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
}

function removeSoftbody({ uuid }: { uuid: UUID }) {
  if (softbodies[uuid]) {
    softbodies[uuid].destroy();

    delete softbodies[uuid];
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
