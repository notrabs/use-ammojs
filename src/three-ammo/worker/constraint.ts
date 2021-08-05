import { CONSTANTS } from "../lib/constants";
const CONSTRAINT = CONSTANTS.CONSTRAINT;
const CONSTRAINTS = [
  CONSTRAINT.LOCK,
  CONSTRAINT.FIXED,
  CONSTRAINT.SPRING,
  CONSTRAINT.SLIDER,
  CONSTRAINT.HINGE,
  CONSTRAINT.CONE_TWIST,
  CONSTRAINT.POINT_TO_POINT,
];

/**
 * @return {Ammo.btTypedConstraint}
 */
const Constraint = function (
  this: any,
  constraintConfig,
  body,
  targetBody,
  world
) {
  this.physicsConstraint;

  this.world = world;

  const type =
    constraintConfig.type && CONSTRAINTS.indexOf(constraintConfig.type)
      ? constraintConfig.type
      : CONSTRAINT.LOCK;

  const bodyTransform = body.physicsBody
    .getCenterOfMassTransform()
    .inverse()
    .op_mul(targetBody.physicsBody.getWorldTransform());
  const targetTransform = new Ammo.btTransform();
  targetTransform.setIdentity();

  switch (type) {
    case CONSTRAINT.LOCK: {
      this.physicsConstraint = new Ammo.btGeneric6DofConstraint(
        body.physicsBody,
        targetBody.physicsBody,
        bodyTransform,
        targetTransform,
        true
      );
      const zero = new Ammo.btVector3(0, 0, 0);
      //TODO: allow these to be configurable
      this.physicsConstraint.setLinearLowerLimit(zero);
      this.physicsConstraint.setLinearUpperLimit(zero);
      this.physicsConstraint.setAngularLowerLimit(zero);
      this.physicsConstraint.setAngularUpperLimit(zero);
      Ammo.destroy(zero);
      break;
    }
    //TODO: test and verify all other constraint types
    case CONSTRAINT.FIXED: {
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
    case CONSTRAINT.SPRING: {
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
    case CONSTRAINT.SLIDER: {
      //TODO: support setting linear and angular limits
      this.physicsConstraint = new Ammo.btSliderConstraint(
        body.physicsBody,
        targetBody.physicsBody,
        bodyTransform,
        targetTransform,
        true
      );
      this.physicsConstraint.setLowerLinLimit(-1);
      this.physicsConstraint.setUpperLinLimit(1);
      // this.physicsConstraint.setLowerAngLimit();
      // this.physicsConstraint.setUpperAngLimit();
      break;
    }
    case CONSTRAINT.HINGE: {
      if (!constraintConfig.pivot) {
        throw new Error("pivot must be defined for type: hinge");
      }
      if (!constraintConfig.targetPivot) {
        throw new Error("targetPivot must be defined for type: hinge");
      }
      if (!constraintConfig.axis) {
        throw new Error("axis must be defined for type: hinge");
      }
      if (!constraintConfig.targetAxis) {
        throw new Error("targetAxis must be defined for type: hinge");
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

      const axis = new Ammo.btVector3(
        constraintConfig.axis.x,
        constraintConfig.axis.y,
        constraintConfig.axis.z
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
    case CONSTRAINT.CONE_TWIST: {
      if (!constraintConfig.pivot) {
        throw new Error("pivot must be defined for type: cone-twist");
      }
      if (!constraintConfig.targetPivot) {
        throw new Error("targetPivot must be defined for type: cone-twist");
      }

      const pivotTransform = new Ammo.btTransform();
      pivotTransform.setIdentity();
      pivotTransform
        .getOrigin()
        .setValue(
          constraintConfig.targetPivot.x,
          constraintConfig.targetPivot.y,
          constraintConfig.targetPivot.z
        );
      this.physicsConstraint = new Ammo.btConeTwistConstraint(
        body.physicsBody,
        pivotTransform
      );
      Ammo.destroy(pivotTransform);
      break;
    }
    case CONSTRAINT.POINT_TO_POINT: {
      if (!constraintConfig.pivot) {
        throw new Error("pivot must be defined for type: point-to-point");
      }
      if (!constraintConfig.targetPivot) {
        throw new Error("targetPivot must be defined for type: point-to-point");
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
  }

  Ammo.destroy(targetTransform);

  this.world.physicsWorld.addConstraint(this.physicsConstraint, false);
};

Constraint.prototype.destroy = function () {
  if (!this.physicsConstraint) return;

  this.world.physicsWorld.removeConstraint(this.physicsConstraint);
  Ammo.destroy(this.physicsConstraint);
  this.physicsConstraint = null;
};

export default Constraint;
