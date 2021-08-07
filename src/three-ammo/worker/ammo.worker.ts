import { MessageType } from "../lib/types";
import {
  copyToRigidBodyBuffer,
  isBufferConsumed,
  releaseBuffer,
  rigidBodyEventReceivers,
} from "./managers/rigid-body-manager";
import { world, worldEventReceivers } from "./managers/world-manager";
import { debugEventReceivers } from "./managers/debug-manager";
import { constraintEventReceivers } from "./managers/constraint-manager";
import { SIMULATION_RATE } from "../lib/constants";
import { copyToSoftBodyBuffers, softBodyEventReceivers } from "./managers/soft-body-manager";

let lastTick;
let tickInterval;

function tick() {
  if (isBufferConsumed()) {
    const now = performance.now();
    const dt = now - lastTick;
    world.step(dt / 1000);
    const stepDuration = performance.now() - now;
    lastTick = now;

    copyToRigidBodyBuffer();
    copyToSoftBodyBuffers();

    releaseBuffer(stepDuration);
  }
}

const eventReceivers: Record<MessageType, (eventData: any) => void> = {
  ...worldEventReceivers,
  ...debugEventReceivers,
  ...rigidBodyEventReceivers,
  ...softBodyEventReceivers,
  ...constraintEventReceivers,
};

onmessage = async (event) => {
  if (!eventReceivers[event.data?.type]) {
    console.error("unknown event type: ", event.data);
    return;
  }

  if (world) {
    if (event.data.type === MessageType.INIT) {
      console.error("Error: World is already initialized", event.data);
    } else {
      eventReceivers[event.data.type](event.data);
    }
  } else {
    if (event.data.type === MessageType.INIT) {
      await eventReceivers[MessageType.INIT](event.data);

      lastTick = performance.now();
      tickInterval = self.setInterval(
        tick,
        event.data.simulationRate ?? SIMULATION_RATE
      );
    } else {
      console.error("Error: World Not Initialized", event.data);
    }
  }
};
