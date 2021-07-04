import { AmmoDebugConstants } from "ammo-debug-drawer";

export function removeUndefinedKeys<T>(obj: T): T {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
}

// see AmmoDebugConstants from ammo-debug-drawer package
export interface AmmoDebugOptions {
  DrawWireframe?: boolean;
  DrawAabb?: boolean;
  DrawFeaturesText?: boolean;
  DrawContactPoints?: boolean;
  NoDeactivation?: boolean;
  NoHelpText?: boolean;
  DrawText?: boolean;
  ProfileTimings?: boolean;
  EnableSatComparison?: boolean;
  DisableBulletLCP?: boolean;
  EnableCCD?: boolean;
  DrawConstraints?: boolean;
  DrawConstraintLimits?: boolean;
  FastWireframe?: boolean;
  DrawNormals?: boolean;
  MAX_DEBUG_DRAW_MODE?: boolean;
}

// Converts the AmmoDebugOptions into a bitmasked integer that is used by bullet
export function ammoDebugOptionsToNumber(
  debugOptions: AmmoDebugOptions
): number {
  let options = AmmoDebugConstants.NoDebug;

  if (debugOptions.DrawWireframe) {
    options |= AmmoDebugConstants.DrawWireframe;
  }

  if (debugOptions.DrawAabb) {
    options |= AmmoDebugConstants.DrawAabb;
  }

  if (debugOptions.DrawFeaturesText) {
    options |= AmmoDebugConstants.DrawFeaturesText;
  }

  if (debugOptions.NoHelpText) {
    options |= AmmoDebugConstants.NoHelpText;
  }

  if (debugOptions.DrawText) {
    options |= AmmoDebugConstants.DrawText;
  }

  if (debugOptions.ProfileTimings) {
    options |= AmmoDebugConstants.ProfileTimings;
  }

  if (debugOptions.EnableSatComparison) {
    options |= AmmoDebugConstants.EnableSatComparison;
  }

  if (debugOptions.DisableBulletLCP) {
    options |= AmmoDebugConstants.DisableBulletLCP;
  }

  if (debugOptions.EnableCCD) {
    options |= AmmoDebugConstants.EnableCCD;
  }

  if (debugOptions.DrawConstraints) {
    options |= AmmoDebugConstants.DrawConstraints;
  }

  if (debugOptions.DrawConstraintLimits) {
    options |= AmmoDebugConstants.DrawConstraintLimits;
  }

  if (debugOptions.FastWireframe) {
    options |= AmmoDebugConstants.FastWireframe;
  }

  if (debugOptions.DrawNormals) {
    options |= AmmoDebugConstants.DrawNormals;
  }

  if (debugOptions.MAX_DEBUG_DRAW_MODE) {
    options |= AmmoDebugConstants.MAX_DEBUG_DRAW_MODE;
  }

  return options;
}
