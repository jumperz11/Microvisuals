import { MetaphorResult } from './types';

// Demo metaphors for when no API keys are available
export const demoMetaphors: MetaphorResult[] = [
  {
    step1: {
      subject: "A person",
      pressure: "Constant demands from work",
      conflict: "Cannot say no to requests",
      cost: "Personal time disappears",
      emotion: "Exhaustion"
    },
    step2_object: "Candle",
    step3_mechanic: {
      rule: "When a candle burns from both ends, it is consumed twice as fast.",
      x_maps_to: "Burning from both ends → taking on demands from all sides",
      y_maps_to: "Consumed twice as fast → accelerated burnout"
    },
    step4_quotes: [
      "A candle lit at both ends meets itself in the middle.",
      "The wick does not grow back.",
      "Twice the light, half the time."
    ],
    step4_best: {
      line1: "Twice the light,",
      line2: "half the time."
    },
    step5_visual: "A single candle burning from both top and bottom simultaneously. The flames eat toward the center. White wax dripping on black void.",
    step5_dalle_prompt: "A single white candle burning from both ends, flames at top and bottom. Flat 2D vector. Pure black background. White shapes only. No gradients. No texture. No shadows. No extra objects. No ground. Minimal. Bauhaus poster style. Centered."
  },
  {
    step1: {
      subject: "A team",
      pressure: "Urgent deadline",
      conflict: "Skipping proper planning",
      cost: "Rework and errors multiply",
      emotion: "Frustration"
    },
    step2_object: "Scissors",
    step3_mechanic: {
      rule: "When scissors cut without measuring, the fabric cannot be uncut.",
      x_maps_to: "Cutting without measuring → rushing without planning",
      y_maps_to: "Cannot be uncut → irreversible mistakes compound"
    },
    step4_quotes: [
      "The blade does not wait for the line.",
      "Measure twice, cut once. Or cut twice, measure never.",
      "Every shortcut leaves a jagged edge."
    ],
    step4_best: {
      line1: "Measure twice, cut once.",
      line2: "Or cut twice, measure never."
    },
    step5_visual: "Open scissors with a crooked, irreversible cut line trailing from the blades. White metal on black void.",
    step5_dalle_prompt: "Open scissors with a jagged cut line trailing behind. Flat 2D vector. Pure black background. White shapes only. No gradients. No texture. No shadows. No extra objects. No ground. Minimal. Bauhaus poster style. Centered."
  },
  {
    step1: {
      subject: "A founder",
      pressure: "Investor expectations",
      conflict: "Scaling before product-market fit",
      cost: "Resources drain faster than value created",
      emotion: "Anxiety"
    },
    step2_object: "Hourglass",
    step3_mechanic: {
      rule: "When an hourglass is flipped before the sand settles, counting restarts from zero.",
      x_maps_to: "Flipping before sand settles → pivoting before validation",
      y_maps_to: "Counting restarts → progress resets to zero"
    },
    step4_quotes: [
      "The sand falls whether you watch or not.",
      "Flip too soon, start again.",
      "Patience has a deadline; impatience has none."
    ],
    step4_best: {
      line1: "Flip too soon,",
      line2: "start again."
    },
    step5_visual: "An hourglass tilted mid-flip, sand suspended in chaos between the two chambers. White glass and sand on black void.",
    step5_dalle_prompt: "An hourglass tilted at 45 degrees, sand scattered between chambers mid-flip. Flat 2D vector. Pure black background. White shapes only. No gradients. No texture. No shadows. No extra objects. No ground. Minimal. Bauhaus poster style. Centered."
  },
  {
    step1: {
      subject: "A student",
      pressure: "Fear of failure",
      conflict: "Avoiding starting the work",
      cost: "Time runs out, quality suffers",
      emotion: "Paralysis"
    },
    step2_object: "Anchor",
    step3_mechanic: {
      rule: "When an anchor is dropped in shallow water, the ship still drifts.",
      x_maps_to: "Anchor in shallow water → half-measures of commitment",
      y_maps_to: "Ship still drifts → no real progress despite effort"
    },
    step4_quotes: [
      "An anchor in sand holds nothing.",
      "Depth determines grip.",
      "The chain is long enough to fool you."
    ],
    step4_best: {
      line1: "Depth determines grip.",
      line2: ""
    },
    step5_visual: "An anchor dangling just above the seafloor, chain slack, not gripping anything. White metal on black void.",
    step5_dalle_prompt: "An anchor hovering just above the ground, chain slack and loose, not gripping. Flat 2D vector. Pure black background. White shapes only. No gradients. No texture. No shadows. No extra objects. No ground. Minimal. Bauhaus poster style. Centered."
  },
  {
    step1: {
      subject: "A manager",
      pressure: "Need for control",
      conflict: "Micromanaging every decision",
      cost: "Team stops thinking independently",
      emotion: "Distrust"
    },
    step2_object: "Key",
    step3_mechanic: {
      rule: "When a key is never removed from the lock, the door cannot be opened by anyone else.",
      x_maps_to: "Key never removed → holding all control",
      y_maps_to: "Cannot be opened by others → team becomes helpless"
    },
    step4_quotes: [
      "A key that never leaves the lock is just a handle.",
      "The door remembers only one hand.",
      "Trust is the duplicate you never made."
    ],
    step4_best: {
      line1: "A key that never leaves the lock",
      line2: "is just a handle."
    },
    step5_visual: "A key permanently inserted in a lock, fused in place. White metal on black void.",
    step5_dalle_prompt: "A key stuck permanently in a lock, appearing fused together. Flat 2D vector. Pure black background. White shapes only. No gradients. No texture. No shadows. No extra objects. No ground. Minimal. Bauhaus poster style. Centered."
  }
];

export function getRandomDemoMetaphor(): MetaphorResult {
  return demoMetaphors[Math.floor(Math.random() * demoMetaphors.length)];
}
