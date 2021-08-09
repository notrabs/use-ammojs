import {
  ConstraintConfig,
  ConstraintType,
  TwoBodyConstraintConfig,
} from "../../lib/types";
import { toBtQuaternion, toBtVector3 } from "../utils";
import { RigidBody } from "./rigid-body";
import { World } from "./world";

export class Constraint {
  private world: any;
  private physicsConstraint: Ammo.btTypedConstraint;
  private type: ConstraintType;

  constructor(
    constraintConfig: TwoBodyConstraintConfig,
    bodyA: RigidBody,
    bodyB: RigidBody | undefined,
    world: World
  ) {
    this.world = world;
    this.type = constraintConfig.type;

    const bodyTransform = bodyA.physicsBody
      .getCenterOfMassTransform()
      .inverse()
      .op_mul(targetBody.physicsBody.getWorldTransform());
    const targetTransform = new Ammo.btTransform();
    targetTransform.setIdentity();

    switch (constraintConfig.type) {
      // case ConstraintType.CONE_TWIST: {
      //   // if (!constraintConfig.pivot) {
      //   //   throw new Error("pivot must be defined for type: cone-twist");
      //   // }
      //   // if (!constraintConfig.targetPivot) {
      //   //   throw new Error("targetPivot must be defined for type: cone-twist");
      //   // }
      //   //
      //   // const pivotTransform = new Ammo.btTransform();
      //   // pivotTransform.setIdentity();
      //   // pivotTransform
      //   //   .getOrigin()
      //   //   .setValue(
      //   //     constraintConfig.targetPivot.x,
      //   //     constraintConfig.targetPivot.y,
      //   //     constraintConfig.targetPivot.z
      //   //   );
      //   // this.physicsConstraint = new Ammo.btConeTwistConstraint(
      //   //   body.physicsBody,
      //   //   pivotTransform
      //   // );
      //   // Ammo.destroy(pivotTransform);
      //   break;
      // }
      case ConstraintType.GENERIC_6_DOF: {
        this.physicsConstraint = new Ammo.btGeneric6DofConstraint(
          bodyA.physicsBody,
          targetBody.physicsBody,
          bodyTransform,
          targetTransform,
          true
        );

        break;
      }
      //TODO: test and verify all other constraint types
      case ConstraintType.FIXED: {
        //btFixedConstraint does not seem to debug render
        bodyTransform.setRotation(
          bodyA.physicsBody.getWorldTransform().getRotation()
        );
        targetTransform.setRotation(
          targetBody.physicsBody.getWorldTransform().getRotation()
        );
        this.physicsConstraint = new Ammo.btFixedConstraint(
          bodyA.physicsBody,
          targetBody.physicsBody,
          bodyTransform,
          targetTransform
        );
        break;
      }
      case ConstraintType.GENERIC_6_DOF_SPRING: {
        this.physicsConstraint = new Ammo.btGeneric6DofSpringConstraint(
          bodyA.physicsBody,
          targetBody.physicsBody,
          bodyTransform,
          targetTransform,
          true
        );
        break;
      }
      case ConstraintType.SLIDER: {
        //TODO: support setting linear and angular limits
        this.physicsConstraint = new Ammo.btSliderConstraint(
          bodyA.physicsBody,
          targetBody.physicsBody,
          bodyTransform,
          targetTransform,
          true
        );
        break;
      }
      case ConstraintType.HINGE: {
        if (!constraintConfig.pivot) {
          throw new Error("pivot must be defined for type: hinge");
        }

        if (!constraintConfig.axis) {
          throw new Error("axis must be defined for type: hinge");
        }
        if (!constraintConfig.targetPivot) {
          throw new Error("targetPivot must be defined for type: hinge");
        }
        if (!constraintConfig.targetAxis) {
          throw new Error("targetAxis must be defined for type: hinge");
        }

        const pivot = new Ammo.btVector3(
          constraintConfig.pivot.x,
          constraintConfig.pivot.y,
          constraintConfig.pivot.z
        );

        const axis = new Ammo.btVector3(
          constraintConfig.axis.x,
          constraintConfig.axis.y,
          constraintConfig.axis.z
        );

        const targetPivot = new Ammo.btVector3(
          constraintConfig.targetPivot.x,
          constraintConfig.targetPivot.y,
          constraintConfig.targetPivot.z
        );
        const targetAxis = new Ammo.btVector3(
          constraintConfig.targetAxis.x,
          constraintConfig.targetAxis.y,
          constraintConfig.targetAxis.z
        );

        this.physicsConstraint = new Ammo.btHingeConstraint(
          bodyA.physicsBody,
          targetBody.physicsBody,
          pivot,
          targetPivot,
          axis,
          targetAxis,
          true
        );

        Ammo.destroy(pivot);
        Ammo.destroy(targetPivot);
        Ammo.destroy(axis);
        Ammo.destroy(targetAxis);
        break;
      }
      case ConstraintType.POINT_TO_POINT: {
        if (!constraintConfig.pivot) {
          throw new Error("pivot must be defined for type: point-to-point");
        }
        if (!constraintConfig.targetPivot) {
          throw new Error(
            "targetPivot must be defined for type: point-to-point"
          );
        }

        const pivot = new Ammo.btVector3(
          constraintConfig.pivot.x,
          constraintConfig.pivot.y,
          constraintConfig.pivot.z
        );
        const targetPivot = new Ammo.btVector3(
          constraintConfig.targetPivot.x,
          constraintConfig.targetPivot.y,
          constraintConfig.targetPivot.z
        );

        this.physicsConstraint = new Ammo.btPoint2PointConstraint(
          bodyA.physicsBody,
          targetBody.physicsBody,
          pivot,
          targetPivot
        );

        Ammo.destroy(pivot);
        Ammo.destroy(targetPivot);
        break;
      }
      default:
        throw new Error(
          "unknown constraint type: " +
            (constraintConfig as ConstraintConfig).type
        );
    }

    Ammo.destroy(targetTransform);
    this.applyDynamicConfig(constraintConfig);

    this.world.physicsWorld.addConstraint(this.physicsConstraint, false);
  }

  applyDynamicConfig(constraintConfig: ConstraintConfig): void {
    if (constraintConfig.type !== this.type) {
      throw new Error(
        "constraintConfig type does not match actual constraint type"
      );
    }

    const tmp = new Ammo.btVector3(0, 0, 0);
    const tmpQuat = new Ammo.btQuaternion(0, 0, 0, 1);

    switch (constraintConfig.type) {
      case ConstraintType.GENERIC_6_DOF: {
        const constraint = this
          .physicsConstraint as Ammo.btGeneric6DofConstraint;

        if (constraintConfig.linearLowerLimit !== undefined) {
          toBtVector3(tmp, constraintConfig.linearLowerLimit);
          constraint.setLinearLowerLimit(tmp);
        }

        if (constraintConfig.linearUpperLimit !== undefined) {
          toBtVector3(tmp, constraintConfig.linearUpperLimit);
          constraint.setLinearUpperLimit(tmp);
        }

        if (constraintConfig.angularLowerLimit !== undefined) {
          toBtVector3(tmp, constraintConfig.angularLowerLimit);
          constraint.setAngularLowerLimit(tmp);
        }

        if (constraintConfig.angularUpperLimit !== undefined) {
          toBtVector3(tmp, constraintConfig.angularUpperLimit);
          constraint.setAngularUpperLimit(tmp);
        }
        break;
      }
      case ConstraintType.GENERIC_6_DOF_SPRING: {
        const constraint = this
          .physicsConstraint as Ammo.btGeneric6DofSpringConstraint;

        if (constraintConfig.springEnabled !== undefined) {
          for (let i = 0; i < 6; i++) {
            constraint.enableSpring(i, constraintConfig.springEnabled[i]);
          }
        }

        if (constraintConfig.equilibriumPoint !== undefined) {
          for (let i = 0; i < 6; i++) {
            constraint.setEquilibriumPoint(
              i,
              constraintConfig.equilibriumPoint[i]
            );
          }
        }

        if (constraintConfig.stiffness !== undefined) {
          for (let i = 0; i < 6; i++) {
            constraint.setStiffness(i, constraintConfig.stiffness[i]);
          }
        }

        if (constraintConfig.damping !== undefined) {
          for (let i = 0; i < 6; i++) {
            constraint.setDamping(i, constraintConfig.damping[i]);
          }
        }

        break;
      }
      case ConstraintType.FIXED: {
        const constraint = this.physicsConstraint as Ammo.btFixedConstraint;
        // nothing to set
        break;
      }
      case ConstraintType.HINGE: {
        const constraint = this.physicsConstraint as Ammo.btHingeConstraint;

        if (constraintConfig.angularOnly !== undefined) {
          constraint.setAngularOnly(constraintConfig.angularOnly);
        }

        if (constraintConfig.enableAngularMotor !== undefined) {
          constraint.enableMotor(constraintConfig.enableAngularMotor);
        }

        if (constraintConfig.motorTargetVelocity !== undefined) {
          constraint.setMotorTargetVelocity(
            constraintConfig.motorTargetVelocity
          );
        }

        if (constraintConfig.maxMotorImpulse !== undefined) {
          constraint.setMaxMotorImpulse(constraintConfig.maxMotorImpulse);
        }

        if (constraintConfig.lowerLimit !== undefined) {
          constraint.setLimit(
            constraintConfig.lowerLimit,
            constraint.getUpperLimit()
          );
        }

        if (constraintConfig.upperLimit !== undefined) {
          constraint.setLimit(
            constraint.getLowerLimit(),
            constraintConfig.upperLimit
          );
        }

        break;
      }
      case ConstraintType.POINT_TO_POINT: {
        const constraint = this
          .physicsConstraint as Ammo.btPoint2PointConstraint;

        // nothing to configure
        break;
      }
      case ConstraintType.SLIDER: {
        const constraint = this.physicsConstraint as Ammo.btSliderConstraint;

        if (constraintConfig.linearLowerLimit !== undefined) {
          constraint.setLowerLinLimit(constraintConfig.linearLowerLimit);
        }

        if (constraintConfig.linearUpperLimit !== undefined) {
          constraint.setUpperLinLimit(constraintConfig.linearUpperLimit);
        }

        if (constraintConfig.angularLowerLimit !== undefined) {
          constraint.setLowerAngLimit(constraintConfig.angularLowerLimit);
        }

        if (constraintConfig.angularUpperLimit !== undefined) {
          constraint.setUpperAngLimit(constraintConfig.angularUpperLimit);
        }

        if (constraintConfig.softnessDirLin !== undefined) {
          constraint.setSoftnessDirLin(constraintConfig.softnessDirLin);
        }

        if (constraintConfig.restitutionDirLin !== undefined) {
          constraint.setRestitutionDirLin(constraintConfig.restitutionDirLin);
        }

        if (constraintConfig.dampingDirLin !== undefined) {
          constraint.setDampingDirLin(constraintConfig.dampingDirLin);
        }

        if (constraintConfig.softnessDirAng !== undefined) {
          constraint.setSoftnessDirAng(constraintConfig.softnessDirAng);
        }

        if (constraintConfig.restitutionDirAng !== undefined) {
          constraint.setRestitutionOrthoAng(constraintConfig.restitutionDirAng);
        }

        if (constraintConfig.dampingDirAng !== undefined) {
          constraint.setDampingDirAng(constraintConfig.dampingDirAng);
        }

        if (constraintConfig.softnessLimLin !== undefined) {
          constraint.setSoftnessLimLin(constraintConfig.softnessLimLin);
        }

        if (constraintConfig.restitutionLimLin !== undefined) {
          constraint.setRestitutionLimLin(constraintConfig.restitutionLimLin);
        }

        if (constraintConfig.dampingLimLin !== undefined) {
          constraint.setDampingLimLin(constraintConfig.dampingLimLin);
        }

        if (constraintConfig.softnessLimAng !== undefined) {
          constraint.setSoftnessLimAng(constraintConfig.softnessLimAng);
        }

        if (constraintConfig.restitutionLimAng !== undefined) {
          constraint.setRestitutionLimAng(constraintConfig.restitutionLimAng);
        }

        if (constraintConfig.dampingLimAng !== undefined) {
          constraint.setDampingLimAng(constraintConfig.dampingLimAng);
        }

        if (constraintConfig.softnessOrthoLin !== undefined) {
          constraint.setSoftnessOrthoLin(constraintConfig.softnessOrthoLin);
        }

        if (constraintConfig.restitutionOrthoLin !== undefined) {
          constraint.setRestitutionOrthoLin(
            constraintConfig.restitutionOrthoLin
          );
        }

        if (constraintConfig.dampingOrthoLin !== undefined) {
          constraint.setDampingOrthoLin(constraintConfig.dampingOrthoLin);
        }

        if (constraintConfig.softnessOrthoAng !== undefined) {
          constraint.setSoftnessOrthoAng(constraintConfig.softnessOrthoAng);
        }

        if (constraintConfig.restitutionOrthoAng !== undefined) {
          constraint.setRestitutionOrthoAng(
            constraintConfig.restitutionOrthoAng
          );
        }

        if (constraintConfig.dampingOrthoAng !== undefined) {
          constraint.setDampingOrthoAng(constraintConfig.dampingOrthoAng);
        }

        if (constraintConfig.poweredLinearMotor !== undefined) {
          constraint.setPoweredLinMotor(constraintConfig.poweredLinearMotor);
        }

        if (constraintConfig.targetLinMotorVelocity !== undefined) {
          constraint.setTargetLinMotorVelocity(
            constraintConfig.targetLinMotorVelocity
          );
        }

        if (constraintConfig.maxLinMotorForce !== undefined) {
          constraint.setMaxLinMotorForce(constraintConfig.maxLinMotorForce);
        }

        if (constraintConfig.poweredAngularMotor !== undefined) {
          constraint.setPoweredAngMotor(constraintConfig.poweredAngularMotor);
        }

        if (constraintConfig.targetAngMotorVelocity !== undefined) {
          constraint.setTargetAngMotorVelocity(
            constraintConfig.targetAngMotorVelocity
          );
        }

        if (constraintConfig.maxAngMotorForce !== undefined) {
          constraint.setMaxAngMotorForce(constraintConfig.maxAngMotorForce);
        }

        break;
      }
      case ConstraintType.CONE_TWIST: {
        const constraint = this.physicsConstraint as Ammo.btConeTwistConstraint;

        if (constraintConfig.angularOnly !== undefined) {
          constraint.setAngularOnly(constraintConfig.angularOnly);
        }

        if (constraintConfig.swingSpan1 !== undefined) {
          constraint.setLimit(5, constraintConfig.swingSpan1);
        }

        if (constraintConfig.swingSpan2 !== undefined) {
          constraint.setLimit(4, constraintConfig.swingSpan2);
        }

        if (constraintConfig.twistSpan !== undefined) {
          constraint.setLimit(3, constraintConfig.twistSpan);
        }

        if (constraintConfig.damping !== undefined) {
          constraint.setDamping(constraintConfig.damping);
        }

        if (constraintConfig.motorEnabled !== undefined) {
          constraint.enableMotor(constraintConfig.motorEnabled);
        }

        if (constraintConfig.maxMotorImpulse !== undefined) {
          constraint.setMaxMotorImpulse(constraintConfig.maxMotorImpulse);
        }

        if (constraintConfig.motorTarget !== undefined) {
          toBtQuaternion(tmpQuat, constraintConfig.motorTarget);
          constraint.setMotorTarget(tmpQuat);
        }

        if (constraintConfig.fixThresh !== undefined) {
          constraint.setFixThresh(constraintConfig.fixThresh);
        }

        break;
      }
    }

    Ammo.destroy(tmp);
    Ammo.destroy(tmpQuat);
  }

  destroy() {
    if (!this.physicsConstraint) return;

    this.world.physicsWorld.removeConstraint(this.physicsConstraint);
    Ammo.destroy(this.physicsConstraint);
    (this as any).physicsConstraint = undefined;
  }
}
