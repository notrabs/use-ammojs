import { MessageType } from "../../lib/types";
import { notImplementedEventReceiver } from "../utils";


export const softBodyEventReceivers = {

    [MessageType.ADD_SOFTBODY]: notImplementedEventReceiver,
    [MessageType.REMOVE_SOFTBODY]: notImplementedEventReceiver,
}