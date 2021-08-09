export const GRAVITY = -9.81;
export const MAX_INTERVAL = 4 / 60;
export const ITERATIONS = 10;
export const SIMULATION_RATE = 8.333; // 8.333ms / 120hz
export const EPS = 10e-6;

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
