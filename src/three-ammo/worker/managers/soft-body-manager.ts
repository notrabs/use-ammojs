import { MessageType, UUID } from "../../lib/types";
import { notImplementedEventReceiver } from "../utils";

const softbodies: Record<UUID, Ammo.btSoftBody> = {};

const buffers = [];

export const softBodyEventReceivers = {
  [MessageType.ADD_SOFTBODY]: notImplementedEventReceiver,
  [MessageType.REMOVE_SOFTBODY]: notImplementedEventReceiver,
};
