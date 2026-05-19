// Run with: npx tsx lib/calc.test.ts
// No test framework needed — throws on any assertion failure.

import assert from "node:assert/strict";
import {
  computeFV,
  computeRequiredCapital,
  computeSufficiencyRatio,
  getVerdict,
  computeCategoryScores,
  simulateActions,
  type HouseholdState,
} from "./calc";

function close(actual: number, expected: number, tolerance = 1.0): void {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `Expected ~${expected}, got ${actual}`,
  );
}

// ---------------------------------------------------------------------------
// Test 1: Well-prepared household (ratio ≥ 1.20)
//
// Inputs:
//   age 35 → retire 65  (n = 30)
//   income $100,000 | savings $20,000/yr (20% rate) | assets $100,000
//   spending $70,000/yr | SS $20,000/yr | return 7% (r = 0.07)
//
// Manual:
//   (1.07)^30 ≈ 7.6123
//   FV = 100,000 × 7.6123 + 20,000 × (7.6123 − 1) / 0.07
//      = 761,230 + 20,000 × 94.461
//      = 761,230 + 1,889,220
//      ≈ 2,650,450
//   requiredCapital = (70,000 − 20,000) × 25 = 1,250,000
//   ratio ≈ 2,650,450 / 1,250,000 ≈ 2.12  → "Well-prepared"
//
// Savings Strength:
//   benchmark at age 35 = 2× income
//   score = min(100, (100,000 / 100,000) / 2 × 100) = 50
//
// Cash Flow Power:
//   savingsRate = 20,000 / 100,000 = 0.20
//   score = min(100, (0.20 / 0.20) × 100) = 100
//
// Timeline Feasibility: ratio ≥ 1.0 → score = 100
// ---------------------------------------------------------------------------
{
  const state: HouseholdState = {
    currentAge: 35,
    retirementAge: 65,
    annualIncome: 100_000,
    annualSavings: 20_000,
    currentAssets: 100_000,
    retirementSpending: 70_000,
    socialSecurityIncome: 20_000,
    expectedReturn: 0.07,
  };

  const fv = computeFV(state);
  close(fv, 2_650_450, 500);

  const required = computeRequiredCapital(state);
  assert.equal(required, 1_250_000);

  const ratio = computeSufficiencyRatio(state);
  close(ratio, 2.12, 0.01);
  assert(ratio >= 1.20, `Expected ratio ≥ 1.20, got ${ratio}`);

  const verdict = getVerdict(ratio);
  assert.equal(verdict.label, "Well-prepared");
  assert.equal(verdict.color, "green");

  const scores = computeCategoryScores(state);
  close(scores.savingsStrength, 50, 0.01);
  close(scores.cashFlowPower, 100, 0.01);
  assert.equal(scores.timelineFeasibility, 100);

  const actions = simulateActions(state);
  assert.equal(actions.length, 5);
  // All impacts should be positive (any improvement helps even a well-prepared household)
  for (const a of actions) {
    assert(a.impact >= 0, `Expected non-negative impact for "${a.name}", got ${a.impact}`);
  }
  // Actions must be sorted by impact descending
  for (let i = 0; i < actions.length - 1; i++) {
    assert(
      actions[i].impact >= actions[i + 1].impact,
      `Actions not sorted: ${actions[i].name} (${actions[i].impact}) before ${actions[i + 1].name} (${actions[i + 1].impact})`,
    );
  }

  console.log("✓ Test 1 (Well-prepared): ratio =", ratio.toFixed(3), "—", verdict.label);
}

// ---------------------------------------------------------------------------
// Test 2: Struggling household (ratio < 0.80)
//
// Inputs:
//   age 50 → retire 65  (n = 15)
//   income $80,000 | savings $8,000/yr (10% rate) | assets $120,000
//   spending $70,000/yr | SS $15,000/yr | return 7% (r = 0.07)
//
// Manual:
//   (1.07)^15 ≈ 2.7590
//   FV = 120,000 × 2.7590 + 8,000 × (2.7590 − 1) / 0.07
//      = 331,080 + 8,000 × 25.129
//      = 331,080 + 201,030
//      ≈ 532,110
//   requiredCapital = (70,000 − 15,000) × 25 = 1,375,000
//   ratio ≈ 532,110 / 1,375,000 ≈ 0.387  → "Structural gap"
//
// Savings Strength:
//   benchmark at age 50 = 6× income
//   score = min(100, (120,000 / 80,000) / 6 × 100) = min(100, 25) = 25
//
// Cash Flow Power:
//   savingsRate = 8,000 / 80,000 = 0.10
//   score = min(100, (0.10 / 0.20) × 100) = 50
//
// Timeline Feasibility (ratio < 1.0):
//   shortfall = 1,375,000 − 532,110 = 842,890
//   annuityFactor = (2.7590 − 1) / 0.07 = 25.129
//   extraSavingsNeeded = 842,890 / 25.129 ≈ 33,544
//   asPercentOfIncome = 33,544 / 80,000 ≈ 0.419
//   score = max(0, 100 − 0.419 × 500) = max(0, −110) = 0
// ---------------------------------------------------------------------------
{
  const state: HouseholdState = {
    currentAge: 50,
    retirementAge: 65,
    annualIncome: 80_000,
    annualSavings: 8_000,
    currentAssets: 120_000,
    retirementSpending: 70_000,
    socialSecurityIncome: 15_000,
    expectedReturn: 0.07,
  };

  const fv = computeFV(state);
  close(fv, 532_110, 500);

  const required = computeRequiredCapital(state);
  assert.equal(required, 1_375_000);

  const ratio = computeSufficiencyRatio(state);
  close(ratio, 0.387, 0.005);
  assert(ratio < 0.80, `Expected ratio < 0.80, got ${ratio}`);

  const verdict = getVerdict(ratio);
  assert.equal(verdict.label, "Structural gap");
  assert.equal(verdict.color, "red");

  const scores = computeCategoryScores(state);
  close(scores.savingsStrength, 25, 0.1);
  close(scores.cashFlowPower, 50, 0.01);
  assert.equal(scores.timelineFeasibility, 0);

  // "Delay retirement" should rank highly — it extends compounding AND cuts required capital
  const actions = simulateActions(state);
  const topAction = actions[0];
  console.log(
    "  Struggling household top action:",
    topAction.name,
    `(+${topAction.impact.toFixed(3)})`,
  );

  console.log("✓ Test 2 (Structural gap):  ratio =", ratio.toFixed(3), "—", verdict.label);
}

// ---------------------------------------------------------------------------
// Test 3: Very young user, 37 years to retirement
//
// Demonstrates: compounding over long horizon overcomes a modest savings rate.
// Also tests: age < 30 clamps to 1× benchmark in Savings Strength.
//
// Inputs:
//   age 28 → retire 65  (n = 37)
//   income $60,000 | savings $6,000/yr (10% rate) | assets $10,000
//   spending $40,000/yr | SS $12,000/yr | return 7% (r = 0.07)
//
// Manual:
//   (1.07)^37 ≈ 12.2236
//   FV = 10,000 × 12.2236 + 6,000 × (12.2236 − 1) / 0.07
//      = 122,236 + 6,000 × 160.337
//      = 122,236 + 962,022
//      ≈ 1,084,258
//   requiredCapital = (40,000 − 12,000) × 25 = 700,000
//   ratio ≈ 1,084,258 / 700,000 ≈ 1.549  → "Well-prepared"
//
// Savings Strength:
//   age 28 < 30 → benchmark clamped to 1× income
//   score = min(100, (10,000 / 60,000) / 1 × 100) ≈ 16.67
//
// Cash Flow Power:
//   savingsRate = 6,000 / 60,000 = 0.10
//   score = min(100, (0.10 / 0.20) × 100) = 50
//
// Timeline Feasibility: ratio ≥ 1.0 → score = 100
// ---------------------------------------------------------------------------
{
  const state: HouseholdState = {
    currentAge: 28,
    retirementAge: 65,
    annualIncome: 60_000,
    annualSavings: 6_000,
    currentAssets: 10_000,
    retirementSpending: 40_000,
    socialSecurityIncome: 12_000,
    expectedReturn: 0.07,
  };

  const fv = computeFV(state);
  close(fv, 1_084_258, 500);

  const required = computeRequiredCapital(state);
  assert.equal(required, 700_000);

  const ratio = computeSufficiencyRatio(state);
  close(ratio, 1.549, 0.01);
  assert(ratio >= 1.20, `Expected ratio ≥ 1.20, got ${ratio}`);

  const verdict = getVerdict(ratio);
  assert.equal(verdict.label, "Well-prepared");

  const scores = computeCategoryScores(state);
  // age 28 → benchmark clamped to 1× → score = 10,000/60,000 × 100 ≈ 16.67
  close(scores.savingsStrength, 16.67, 0.1);
  close(scores.cashFlowPower, 50, 0.01);
  assert.equal(scores.timelineFeasibility, 100);

  // With 37 years of runway, contribution levers should dominate
  const actions = simulateActions(state);
  assert.equal(actions.length, 5);
  assert(actions[0].impact > 0, "Top action should have positive impact");

  console.log("✓ Test 3 (Young, 37yr horizon): ratio =", ratio.toFixed(3), "—", verdict.label);
  console.log("  Savings Strength score (age 28, clamped to 1×):", scores.savingsStrength.toFixed(2));
}

console.log("\nAll tests passed.");
