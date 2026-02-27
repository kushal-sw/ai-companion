// Expression + gesture controller (Enhanced Phase 6)
// → Maps emotion string → VRM 1.0 expression preset names + weights
// → Maps emotion string → bone rotation targets (head gestures)
// → Keyframe animation system for body gestures (wave, nod, clap, etc.)
// → Provides lerp utility for smooth blending
// → Micro-expression system for organic idle face movement
// → "listening" + "relaxed" states for richer expressiveness

// ── Expression Map ──
// Maps each emotion to VRM expression preset weights (BOOSTED intensities)
export const EXPRESSION_MAP = {
  neutral: {
    happy: 0,
    sad: 0,
    angry: 0,
    surprised: 0,
    relaxed: 0.35,
  },
  relaxed: {
    happy: 0.15,
    sad: 0,
    angry: 0,
    surprised: 0,
    relaxed: 0.5,
  },
  happy: {
    happy: 1.0,
    sad: 0,
    angry: 0,
    surprised: 0.1,
    relaxed: 0.4,
  },
  shy: {
    happy: 0.5,
    sad: 0,
    angry: 0,
    surprised: 0.35,
    relaxed: 0.5,
    lookDown: 0.4,
  },
  thinking: {
    happy: 0,
    sad: 0,
    angry: 0,
    surprised: 0.25,
    relaxed: 0.5,
    lookUp: 0.6,
    lookLeft: 0.4,
  },
  sad: {
    happy: 0,
    sad: 1.0,
    angry: 0,
    surprised: 0,
    relaxed: 0,
    lookDown: 0.3,
  },
  excited: {
    happy: 1.0,
    sad: 0,
    angry: 0,
    surprised: 0.6,
    relaxed: 0,
  },
  listening: {
    happy: 0.2,
    sad: 0,
    angry: 0,
    surprised: 0.2,
    relaxed: 0.4,
  },
};

// ── Emotion → Head Pose Map (static resting pose per emotion) ──
export const GESTURE_MAP = {
  neutral: { x: 0, y: 0, z: 0 },
  relaxed: { x: -0.02, y: 0.02, z: 0.02 },
  happy: { x: -0.06, y: 0, z: 0.04 },
  shy: { x: 0.18, y: -0.1, z: 0.06 },
  thinking: { x: -0.06, y: 0.08, z: -0.12 },
  sad: { x: 0.22, y: 0, z: 0 },
  excited: { x: -0.1, y: 0, z: 0.05 },
  listening: { x: -0.03, y: 0.04, z: 0.03 },
};

// ── Micro-expression presets ──
// Small random offsets applied periodically to keep the face alive
const MICRO_EXPRESSIONS = [
  { happy: 0.08, relaxed: 0.05 },                    // tiny smile
  { surprised: 0.1 },                                 // slight brow raise
  { relaxed: 0.12 },                                  // soft relaxation
  { happy: 0.05, surprised: 0.06 },                   // gentle interest
  { lookLeft: 0.08, lookUp: 0.05 },                   // glance aside
  { lookRight: 0.08 },                                // glance other way
  { happy: 0.12 },                                    // small grin
  { sad: 0.04, relaxed: 0.08 },                       // pensive
  { surprised: 0.07, happy: 0.04 },                   // mild surprise
  {},                                                  // neutral reset
];

/**
 * Get a random micro-expression offset.
 * Returns a blend shape delta map with small values (±0.04-0.12).
 */
export function getRandomMicroExpression() {
  const idx = Math.floor(Math.random() * MICRO_EXPRESSIONS.length);
  return { ...MICRO_EXPRESSIONS[idx] };
}

/**
 * Compute a pulsing intensity multiplier for organic expression oscillation.
 * Returns a value between (1 - amplitude) and (1 + amplitude).
 * @param {number} elapsedSec - total elapsed seconds
 * @param {number} amplitude - oscillation amplitude (default 0.1 = ±10%)
 */
export function expressionPulse(elapsedSec, amplitude = 0.1) {
  const wave = Math.sin(elapsedSec * 1.2) * 0.6 + Math.sin(elapsedSec * 0.7) * 0.4;
  return 1 + wave * amplitude;
}

/**
 * Compute subtle head micro-movement offsets for idle state.
 * @param {number} elapsedSec - total elapsed seconds
 * @returns {{ x: number, y: number, z: number }} small additive rotation
 */
export function headMicroMovement(elapsedSec) {
  return {
    x: Math.sin(elapsedSec * 0.4 + 0.5) * 0.015,
    y: Math.sin(elapsedSec * 0.3) * 0.012,
    z: Math.sin(elapsedSec * 0.25 + 1.0) * 0.01,
  };
}

// ── All expression preset names we touch ──
export const ALL_EXPRESSION_NAMES = [
  'happy', 'sad', 'angry', 'surprised', 'relaxed',
  'lookUp', 'lookDown', 'lookLeft', 'lookRight',
  'aa', 'oh',
];

// ── Keyframe Gesture Animations ──
// Each gesture is a sequence of { t (0-1), bones: { boneName: {x,y,z} } }
// Bone values are ADDITIVE offsets applied on top of the rest pose
// Duration is in ms
export const GESTURE_ANIMATIONS = {
  idle: null,

  wave: {
    duration: 1800,
    keyframes: [
      { t: 0.0,  bones: { rightUpperArm: { x: 0, y: 0, z: 0 }, rightLowerArm: { x: 0, y: 0, z: 0 }, head: { x: 0, y: 0, z: 0 } } },
      { t: 0.15, bones: { rightUpperArm: { x: -0.8, y: 0.3, z: 0.4 }, rightLowerArm: { x: 0, y: -0.8, z: 0 }, head: { x: -0.05, y: 0.1, z: 0.05 } } },
      { t: 0.35, bones: { rightUpperArm: { x: -0.8, y: 0.5, z: 0.4 }, rightLowerArm: { x: 0, y: -1.0, z: 0.3 }, head: { x: -0.05, y: 0.1, z: 0.05 } } },
      { t: 0.55, bones: { rightUpperArm: { x: -0.8, y: 0.2, z: 0.4 }, rightLowerArm: { x: 0, y: -0.6, z: -0.3 }, head: { x: -0.05, y: 0.1, z: 0.05 } } },
      { t: 0.75, bones: { rightUpperArm: { x: -0.8, y: 0.5, z: 0.4 }, rightLowerArm: { x: 0, y: -1.0, z: 0.3 }, head: { x: -0.05, y: 0.1, z: 0.05 } } },
      { t: 1.0,  bones: { rightUpperArm: { x: 0, y: 0, z: 0 }, rightLowerArm: { x: 0, y: 0, z: 0 }, head: { x: 0, y: 0, z: 0 } } },
    ],
  },

  nod: {
    duration: 1000,
    keyframes: [
      { t: 0.0,  bones: { head: { x: 0, y: 0, z: 0 } } },
      { t: 0.2,  bones: { head: { x: 0.15, y: 0, z: 0 } } },
      { t: 0.4,  bones: { head: { x: -0.03, y: 0, z: 0 } } },
      { t: 0.6,  bones: { head: { x: 0.12, y: 0, z: 0 } } },
      { t: 0.8,  bones: { head: { x: -0.02, y: 0, z: 0 } } },
      { t: 1.0,  bones: { head: { x: 0, y: 0, z: 0 } } },
    ],
  },

  head_tilt: {
    duration: 1400,
    keyframes: [
      { t: 0.0,  bones: { head: { x: 0, y: 0, z: 0 } } },
      { t: 0.25, bones: { head: { x: -0.05, y: 0.06, z: -0.15 } } },
      { t: 0.65, bones: { head: { x: -0.05, y: 0.06, z: -0.15 } } },
      { t: 1.0,  bones: { head: { x: 0, y: 0, z: 0 } } },
    ],
  },

  look_down: {
    duration: 1600,
    keyframes: [
      { t: 0.0,  bones: { head: { x: 0, y: 0, z: 0 }, spine: { x: 0, y: 0, z: 0 } } },
      { t: 0.25, bones: { head: { x: 0.2, y: -0.05, z: 0 }, spine: { x: 0.05, y: 0, z: 0 } } },
      { t: 0.7,  bones: { head: { x: 0.2, y: -0.05, z: 0 }, spine: { x: 0.05, y: 0, z: 0 } } },
      { t: 1.0,  bones: { head: { x: 0, y: 0, z: 0 }, spine: { x: 0, y: 0, z: 0 } } },
    ],
  },

  clap: {
    duration: 1400,
    keyframes: [
      { t: 0.0,  bones: { leftUpperArm: { x: -0.3, y: 0, z: -0.3 }, rightUpperArm: { x: -0.3, y: 0, z: 0.3 }, leftLowerArm: { x: 0, y: 0.5, z: 0 }, rightLowerArm: { x: 0, y: -0.5, z: 0 } } },
      { t: 0.15, bones: { leftUpperArm: { x: -0.5, y: 0.2, z: -0.5 }, rightUpperArm: { x: -0.5, y: -0.2, z: 0.5 }, leftLowerArm: { x: 0, y: 0.9, z: 0.3 }, rightLowerArm: { x: 0, y: -0.9, z: -0.3 } } },
      { t: 0.3,  bones: { leftUpperArm: { x: -0.3, y: 0, z: -0.3 }, rightUpperArm: { x: -0.3, y: 0, z: 0.3 }, leftLowerArm: { x: 0, y: 0.5, z: 0 }, rightLowerArm: { x: 0, y: -0.5, z: 0 } } },
      { t: 0.45, bones: { leftUpperArm: { x: -0.5, y: 0.2, z: -0.5 }, rightUpperArm: { x: -0.5, y: -0.2, z: 0.5 }, leftLowerArm: { x: 0, y: 0.9, z: 0.3 }, rightLowerArm: { x: 0, y: -0.9, z: -0.3 } } },
      { t: 0.6,  bones: { leftUpperArm: { x: -0.3, y: 0, z: -0.3 }, rightUpperArm: { x: -0.3, y: 0, z: 0.3 }, leftLowerArm: { x: 0, y: 0.5, z: 0 }, rightLowerArm: { x: 0, y: -0.5, z: 0 } } },
      { t: 0.75, bones: { leftUpperArm: { x: -0.5, y: 0.2, z: -0.5 }, rightUpperArm: { x: -0.5, y: -0.2, z: 0.5 }, leftLowerArm: { x: 0, y: 0.9, z: 0.3 }, rightLowerArm: { x: 0, y: -0.9, z: -0.3 } } },
      { t: 1.0,  bones: { leftUpperArm: { x: 0, y: 0, z: 0 }, rightUpperArm: { x: 0, y: 0, z: 0 }, leftLowerArm: { x: 0, y: 0, z: 0 }, rightLowerArm: { x: 0, y: 0, z: 0 } } },
    ],
  },

  bounce: {
    duration: 1200,
    keyframes: [
      { t: 0.0,  bones: { hips: { x: 0, y: 0, z: 0 }, head: { x: 0, y: 0, z: 0 } } },
      { t: 0.15, bones: { hips: { x: 0, y: 0.06, z: 0 }, head: { x: -0.05, y: 0, z: 0.03 } } },
      { t: 0.3,  bones: { hips: { x: 0, y: -0.02, z: 0 }, head: { x: 0, y: 0, z: 0 } } },
      { t: 0.45, bones: { hips: { x: 0, y: 0.06, z: 0 }, head: { x: -0.05, y: 0, z: -0.03 } } },
      { t: 0.6,  bones: { hips: { x: 0, y: -0.02, z: 0 }, head: { x: 0, y: 0, z: 0 } } },
      { t: 0.75, bones: { hips: { x: 0, y: 0.04, z: 0 }, head: { x: -0.03, y: 0, z: 0.02 } } },
      { t: 1.0,  bones: { hips: { x: 0, y: 0, z: 0 }, head: { x: 0, y: 0, z: 0 } } },
    ],
  },

  arms_crossed: {
    duration: 2000,
    keyframes: [
      { t: 0.0,  bones: { leftUpperArm: { x: 0, y: 0, z: 0 }, rightUpperArm: { x: 0, y: 0, z: 0 }, leftLowerArm: { x: 0, y: 0, z: 0 }, rightLowerArm: { x: 0, y: 0, z: 0 }, head: { x: 0, y: 0, z: 0 } } },
      { t: 0.2,  bones: { leftUpperArm: { x: -0.2, y: 0.3, z: -0.5 }, rightUpperArm: { x: -0.2, y: -0.3, z: 0.5 }, leftLowerArm: { x: 0, y: 1.0, z: 0.4 }, rightLowerArm: { x: 0, y: -1.0, z: -0.4 }, head: { x: 0.08, y: 0, z: 0 } } },
      { t: 0.75, bones: { leftUpperArm: { x: -0.2, y: 0.3, z: -0.5 }, rightUpperArm: { x: -0.2, y: -0.3, z: 0.5 }, leftLowerArm: { x: 0, y: 1.0, z: 0.4 }, rightLowerArm: { x: 0, y: -1.0, z: -0.4 }, head: { x: 0.08, y: 0, z: 0 } } },
      { t: 1.0,  bones: { leftUpperArm: { x: 0, y: 0, z: 0 }, rightUpperArm: { x: 0, y: 0, z: 0 }, leftLowerArm: { x: 0, y: 0, z: 0 }, rightLowerArm: { x: 0, y: 0, z: 0 }, head: { x: 0, y: 0, z: 0 } } },
    ],
  },
};

/**
 * Linear interpolation
 */
export function lerp(current, target, alpha) {
  return current + (target - current) * alpha;
}

/**
 * Interpolate between two keyframes at a given time t
 */
function lerpKeyframes(kf1, kf2, t) {
  const result = {};
  const frac = (t - kf1.t) / (kf2.t - kf1.t);

  // Merge all bone names from both keyframes
  const allBones = new Set([
    ...Object.keys(kf1.bones || {}),
    ...Object.keys(kf2.bones || {}),
  ]);

  for (const bone of allBones) {
    const a = kf1.bones?.[bone] || { x: 0, y: 0, z: 0 };
    const b = kf2.bones?.[bone] || { x: 0, y: 0, z: 0 };
    result[bone] = {
      x: a.x + (b.x - a.x) * frac,
      y: a.y + (b.y - a.y) * frac,
      z: a.z + (b.z - a.z) * frac,
    };
  }

  return result;
}

/**
 * Sample a gesture animation at a given time (ms since start)
 * Returns a map of boneName → {x, y, z} additive rotation offsets
 * Returns null if animation is complete or gesture is idle
 */
export function sampleGestureAnimation(gestureName, elapsedMs) {
  const anim = GESTURE_ANIMATIONS[gestureName];
  if (!anim || !anim.keyframes) return null;

  const t = Math.min(elapsedMs / anim.duration, 1.0);
  if (t >= 1.0) return null; // animation complete

  const kfs = anim.keyframes;

  // Find the two keyframes we're between
  let i = 0;
  while (i < kfs.length - 1 && kfs[i + 1].t <= t) i++;

  if (i >= kfs.length - 1) return kfs[kfs.length - 1].bones || {};

  return lerpKeyframes(kfs[i], kfs[i + 1], t);
}

/**
 * Get the full expression + gesture targets for an emotion string
 */
export function getExpressionTargets(emotion) {
  const key = EXPRESSION_MAP[emotion] ? emotion : 'neutral';
  return {
    blendShapes: { ...EXPRESSION_MAP[key] },
    boneRotation: { ...GESTURE_MAP[key] },
  };
}
