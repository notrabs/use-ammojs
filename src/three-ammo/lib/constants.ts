import { Vector3 } from "three";

export const GRAVITY = -9.81;
export const EPS = 10e-6;

export const DEFAULT_TIMESTEP = 1 / 60;

export const BUFFER_CONFIG = {
  // Header length in number of int32/float32
  HEADER_LENGTH: 3,
  MAX_BODIES: 10000,
  MATRIX_OFFSET: 0,
  LINEAR_VELOCITY_OFFSET: 16,
  ANGULAR_VELOCITY_OFFSET: 17,
  COLLISIONS_OFFSET: 18,
  BODY_DATA_SIZE: 26,
};

export const ZERO = new Vector3(0, 0, 0);

export const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
