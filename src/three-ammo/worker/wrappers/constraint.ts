import { ConstraintConfig, ConstraintType, TwoBodyConstraintConfig, } from "../../lib/types";
import { toBtVector3 } from "../utils";
import { RigidBody } from "./rigid-body";
import { World } from "./world";

export class Constraint {
  private world: any;
  private physicsConstraint: Ammo.btTypedConstraint;

  constructor(
    constraintConfig: TwoBodyConstraintConfig,
    body: RigidBody,
    targetBody: RigidBody,
    world: World
  ) {
    this.world = world;

    const bodyTransform = body.physicsBody
      .getCenterOfMassTransform()
      .inverse()
      .op_mul(targetBody.physicsBody.getWorldTransform());
    const targetTransform = new Ammo.btTransform();
    targetTransform.setIdentity();

    const tmp = new Ammo.btVector3(0, 0, 0);

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
        const dofConstraint = (this.physicsConstraint = new Ammo.btGeneric6DofConstraint(
          body.physicsBody,
          targetBody.physicsBody,
          bodyTransform,
          targetTransform,
          true
        ));

        toBtVector3(tmp, constraintConfig.linearLowerLimit);
        dofConstraint.setLinearLowerLimit(tmp);

        toBtVector3(tmp, constraintConfig.linearUpperLimit);
        dofConstraint.setLinearUpperLimit(tmp);

        toBtVector3(tmp, constraintConfig.angularLowerLimit);
        dofConstraint.setAngularLowerLimit(tmp);

        toBtVector3(tmp, constraintConfig.angularUpperLimit);
        dofConstraint.setAngularUpperLimit(tmp);

        break;
      }
      //TODO: test and verify all other constraint types
      case ConstraintType.FIXED: {
        //btFixedConstraint does not seem to debug render
        bodyTransform.setRotation(
          body.physicsBody.getWorldTransform().getRotation()
        );
        targetTransform.setRotation(
          targetBody.physicsBody.getWorldTransform().getRotation()
        );
        this.physicsConstraint = new Ammo.btFixedConstraint(
          body.physicsBody,
          targetBody.physicsBody,
          bodyTransform,
          targetTransform
        );
        break;
      }
      case ConstraintType.GENERIC_6_DOF_SPRING: {
        this.physicsConstraint = new Ammo.btGeneric6DofSpringConstraint(
          body.physicsBody,
          targetBody.physicsBody,
          bodyTransform,
          targetTransform,
          true
        );
        //TODO: enableSpring, setStiffness and setDamping
        break;
      }
      case ConstraintType.SLIDER: {
        //TODO: support setting linear and angular limits
        this.physicsConstraint = new Ammo.btSliderConstraint(
          body.physicsBody,
          targetBody.physicsBody,
          bodyTransform,
          targetTransform,
          true
        );
        (this.physicsConstraint as Ammo.btSliderConstraint).setLowerLinLimit(
          -1
        );
        (this.physicsConstraint as Ammo.btSliderConstraint).setUpperLinLimit(1);
        // this.physicsConstraint.setLowerAngLimit();
        // this.physicsConstraint.setUpperAngLimit();
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
          body.physicsBody,
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
          body.physicsBody,
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
    Ammo.destroy(tmp);

    this.world.physicsWorld.addConstraint(this.physicsConstraint, false);
  }

  destroy() {
    if (!this.physicsConstraint) return;

    this.world.physicsWorld.removeConstraint(this.physicsConstraint);
    Ammo.destroy(this.physicsConstraint);
    (this as any).physicsConstraint = undefined;
  }
}
