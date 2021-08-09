import {
  ConstraintConfig,
  ConstraintType,
  SingleBodyConstraintConfig,
  TwoBodyConstraintConfig,
} from "../../lib/types";
import { toBtQuaternion, toBtTransform, toBtVector3 } from "../utils";
import { RigidBody } from "./rigid-body";
import { World } from "./world";

export class Constraint {
  private world: any;
  private physicsConstraint: Ammo.btTypedConstraint;
  private type: ConstraintType;

  constructor(
    constraintConfig: ConstraintConfig,
    bodyA: RigidBody,
    bodyB: RigidBody | undefined,
    world: World
  ) {
    this.world = world;
    this.type = constraintConfig.type;

    if (bodyB) {
      this.physicsConstraint = this.initTwoBodyConstraint(
        constraintConfig as TwoBodyConstraintConfig,
        bodyA,
        bodyB
      );
    } else {
      this.physicsConstraint = this.initSingleBodyConstraint(
        constraintConfig as SingleBodyConstraintConfig,
        bodyA
      );
    }

    this.applyDynamicConfig(constraintConfig);

    this.world.physicsWorld.addConstraint(
      this.physicsConstraint,
      constraintConfig.disableCollisionsBetweenLinkedBodies ?? false
    );
  }

  private initSingleBodyConstraint(
    constraintConfig: SingleBodyConstraintConfig,
    bodyA: RigidBody
  ): Ammo.btTypedConstraint {
    let constraint: Ammo.btTypedConstraint;

    const transform = new Ammo.btTransform();

    switch (constraintConfig.type) {
      case ConstraintType.CONE_TWIST: {
        toBtTransform(transform, constraintConfig.frameInA);

        constraint = new Ammo.btConeTwistConstraint(
          bodyA.physicsBody,
          transform
        );
        break;
      }
      case ConstraintType.GENERIC_6_DOF: {
        toBtTransform(transform, constraintConfig.frameInB);

        constraint = new Ammo.btGeneric6DofConstraint(
          bodyA.physicsBody,
          transform,
          constraintConfig.useLinearReferenceFrameA
        );

        break;
      }
      case ConstraintType.GENERIC_6_DOF_SPRING: {
        toBtTransform(transform, constraintConfig.frameInB);

        constraint = new Ammo.btGeneric6DofSpringConstraint(
          bodyA.physicsBody,
          transform,
          constraintConfig.useLinearReferenceFrameB
        );
        break;
      }
      case ConstraintType.SLIDER: {
        toBtTransform(transform, constraintConfig.frameInB);

        constraint = new Ammo.btSliderConstraint(
          bodyA.physicsBody,
          transform,
          constraintConfig.useLinearReferenceFrameA
        );
        break;
      }
      case ConstraintType.HINGE: {
        toBtTransform(transform, constraintConfig.frameInA);

        constraint = new Ammo.btHingeConstraint(
          bodyA.physicsBody,
          transform,
          constraintConfig.useReferenceFrameA
        );
        break;
      }
      case ConstraintType.POINT_TO_POINT: {
        const pivot = new Ammo.btVector3();
        toBtVector3(pivot, constraintConfig.pivot);

        constraint = new Ammo.btPoint2PointConstraint(bodyA.physicsBody, pivot);

        Ammo.destroy(pivot);
        break;
      }
      default:
        throw new Error(
          "unknown constraint type: " +
            (constraintConfig as ConstraintConfig).type
        );
    }

    Ammo.destroy(transform);

    return constraint;
  }

  private initTwoBodyConstraint(
    constraintConfig: TwoBodyConstraintConfig,
    bodyA: RigidBody,
    bodyB: RigidBody
  ): Ammo.btTypedConstraint {
    let constraint: Ammo.btTypedConstraint;

    const transformA = new Ammo.btTransform();
    const transformB = new Ammo.btTransform();

    switch (constraintConfig.type) {
      case ConstraintType.CONE_TWIST: {
        toBtTransform(transformA, constraintConfig.frameInA);
        toBtTransform(transformB, constraintConfig.frameInB);

        constraint = new Ammo.btConeTwistConstraint(
          bodyA.physicsBody,
          bodyB.physicsBody,
          transformA,
          transformB
        );
        break;
      }
      case ConstraintType.GENERIC_6_DOF: {
        toBtTransform(transformA, constraintConfig.frameInA);
        toBtTransform(transformB, constraintConfig.frameInB);

        constraint = new Ammo.btGeneric6DofConstraint(
          bodyA.physicsBody,
          bodyB.physicsBody,
          transformA,
          transformB,
          constraintConfig.useLinearReferenceFrameA
        );

        break;
      }
      case ConstraintType.FIXED: {
        toBtTransform(transformA, constraintConfig.frameInA);
        toBtTransform(transformB, constraintConfig.frameInB);

        constraint = new Ammo.btFixedConstraint(
          bodyA.physicsBody,
          bodyB.physicsBody,
          transformA,
          transformB
        );
        break;
      }
      case ConstraintType.GENERIC_6_DOF_SPRING: {
        toBtTransform(transformA, constraintConfig.frameInA);
        toBtTransform(transformB, constraintConfig.frameInB);

        constraint = new Ammo.btGeneric6DofSpringConstraint(
          bodyA.physicsBody,
          bodyB.physicsBody,
          transformA,
          transformB,
          constraintConfig.useLinearReferenceFrameA
        );
        break;
      }
      case ConstraintType.SLIDER: {
        toBtTransform(transformA, constraintConfig.frameInA);
        toBtTransform(transformB, constraintConfig.frameInB);

        constraint = new Ammo.btSliderConstraint(
          bodyA.physicsBody,
          bodyB.physicsBody,
          transformA,
          transformB,
          constraintConfig.useLinearReferenceFrameA
        );
        break;
      }
      case ConstraintType.HINGE: {
        const pivot = new Ammo.btVector3();
        toBtVector3(pivot, constraintConfig.pivot);

        const axis = new Ammo.btVector3();
        toBtVector3(axis, constraintConfig.axis);

        const targetPivot = new Ammo.btVector3();
        toBtVector3(targetPivot, constraintConfig.targetPivot);

        const targetAxis = new Ammo.btVector3();
        toBtVector3(targetAxis, constraintConfig.targetAxis);

        constraint = new Ammo.btHingeConstraint(
          bodyA.physicsBody,
          bodyB.physicsBody,
          pivot,
          targetPivot,
          axis,
          targetAxis,
          constraintConfig.useReferenceFrameA
        );

        Ammo.destroy(pivot);
        Ammo.destroy(targetPivot);
        Ammo.destroy(axis);
        Ammo.destroy(targetAxis);
        break;
      }
      case ConstraintType.POINT_TO_POINT: {
        const pivot = new Ammo.btVector3();
        toBtVector3(pivot, constraintConfig.pivot);

        const targetPivot = new Ammo.btVector3();
        toBtVector3(targetPivot, constraintConfig.targetPivot);

        constraint = new Ammo.btPoint2PointConstraint(
          bodyA.physicsBody,
          bodyB.physicsBody,
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

    Ammo.destroy(transformA);
    Ammo.destroy(transformB);

    return constraint;
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
