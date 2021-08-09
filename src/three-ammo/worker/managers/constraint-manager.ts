import { Constraint } from "../wrappers/constraint";
import { ConstraintConfig, MessageType, UUID } from "../../lib/types";
import { bodies } from "./rigid-body-manager";
import { world } from "./world-manager";

const constraints: Record<UUID, Constraint> = {};

function addConstraint({ constraintId, bodyAUuid, bodyBUuid, options }) {
  if (bodies[bodyAUuid] && (bodies[bodyBUuid] || !bodyBUuid)) {
    constraints[constraintId] = new Constraint(
      options,
      bodies[bodyAUuid],
      bodies[bodyBUuid],
      world
    );
  } else {
    console.error("Could not add constraint: Rigid Bodies are not registered");
  }
}

function updateConstraint({
  constraintId,
  ...config
}: ConstraintConfig & { constraintId: UUID }) {
  if (constraints[constraintId]) {
    constraints[constraintId].applyDynamicConfig(config);
  }
}

function removeConstraint({ constraintId }) {
  if (constraints[constraintId]) {
    constraints[constraintId].destroy();
    delete constraints[constraintId];
  }
}

export const constraintEventReceivers = {
  [MessageType.ADD_CONSTRAINT]: addConstraint,
  [MessageType.UPDATE_CONSTRAINT]: updateConstraint,
  [MessageType.REMOVE_CONSTRAINT]: removeConstraint,
};
