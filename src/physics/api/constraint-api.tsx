import { AmmoPhysicsContext } from "../physics-context";
import { ConstraintType, UUID } from "../../three-ammo/lib/types";

export interface ConstraintApi {
    // setLinearVelocity(velocity: Vector3): void;
    //
    // applyImpulse(impulse: Vector3, relativeOffset?: Vector3): void;
    // applyForce(force: Vector3, relativeOffset?: Vector3): void;
    enableAngularMotor(enableMotor: boolean, targetVelocity: number, maxMotorImpulse: number): void;
}

export function createConstraintApi(
    physicsContext: AmmoPhysicsContext,
    constraintUUID: UUID,
    type: ConstraintType,
): ConstraintApi {
    return {
        // setLinearVelocity(velocity: Vector3) {
        //   physicsContext.bodySetLinearVelocity(bodyUUID, velocity);
        // },
        //
        // applyImpulse(impulse: Vector3, relativeOffset?: Vector3) {
        //   physicsContext.bodyApplyImpulse(bodyUUID, impulse, relativeOffset);
        // },
        //
        // applyForce(force: Vector3, relativeOffset?: Vector3) {
        //   physicsContext.bodyApplyForce(bodyUUID, force, relativeOffset);
        // },
        enableAngularMotor(enableMotor: boolean, targetVelocity: number, maxMotorImpulse: number) {
            physicsContext.updateConstraint(constraintUUID, {
                type,
                enableAngularMotor: enableMotor,
                motorTargetVelocity: targetVelocity,
                maxMotorImpulse: maxMotorImpulse,
            });
        }
    };
}
