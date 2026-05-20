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
  blendedReturn,
  growthAssetPercentage,
  totalAssets,
  allocationPercentages,
  type HouseholdState,
} from "./calc";

function close(actual: number, expected: number, tolerance = 1.0): void {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `Expected ~${expected}, got ${actual}`,
  );
}

// Helper to build a V1.5 state from a single asset value + 7% return
// (all in stocks) — preserves V1 regression coverage exactly.
function mkState(
  base: Omit<HouseholdState, "assets" | "returns" | "currentAssets" | "expectedReturn"> & {
    currentAssets: number;
  },
): HouseholdState {
  return {
    ...base,
    assets: { stocks: base.currentAssets, bonds: 0, cash: 0, realEstate: 0, alternatives: 0 },
    returns: { stocks: 0.07, bonds: 0.04, cash: 0.015, realEstate: 0.04, alternatives: 0 },
  };
}

// ---------------------------------------------------------------------------
// Test 1: Well-prepared household (ratio ≥ 1.20)
//
// age 35 → retire 65  (n = 30) | income $100k | savings $20k | assets $100k
// spending $70k | SS $20k | return 7% (blended = 7%, all stocks)
//
// (1.07)^30 ≈ 7.6123
// FV = 100,000 × 7.6123 + 20,000 × (7.6123 − 1) / 0.07 ≈ 2,650,450
// requiredCapital = (70,000 − 20,000) × 25 = 1,250,000
// ratio ≈ 2.12
// ---------------------------------------------------------------------------
{
  const state = mkState({
    currentAge: 35,
    retirementAge: 65,
    annualIncome: 100_000,
    annualSavings: 20_000,
    currentAssets: 100_000,
    retirementSpending: 70_000,
    socialSecurityIncome: 20_000,
  });

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
  for (const a of actions) {
    assert(a.impact >= 0, `Expected non-negative impact for "${a.name}", got ${a.impact}`);
  }
  for (let i = 0; i < actions.length - 1; i++) {
    assert(
      actions[i].impact >= actions[i + 1].impact,
      `Actions not sorted: ${actions[i].name} before ${actions[i + 1].name}`,
    );
  }

  console.log("✓ Test 1 (Well-prepared): ratio =", ratio.toFixed(3), "—", verdict.label);
}

// ---------------------------------------------------------------------------
// Test 2: Struggling household (ratio < 0.80)
//
// age 50 → retire 65  (n = 15) | income $80k | savings $8k | assets $120k
// spending $70k | SS $15k | return 7%
//
// FV ≈ 532,110 | requiredCapital = 1,375,000 | ratio ≈ 0.387
// ---------------------------------------------------------------------------
{
  const state = mkState({
    currentAge: 50,
    retirementAge: 65,
    annualIncome: 80_000,
    annualSavings: 8_000,
    currentAssets: 120_000,
    retirementSpending: 70_000,
    socialSecurityIncome: 15_000,
  });

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

  const actions = simulateActions(state);
  const topAction = actions[0];
  console.log("  Struggling household top action:", topAction.name, `(+${topAction.impact.toFixed(3)})`);
  console.log("✓ Test 2 (Structural gap):  ratio =", ratio.toFixed(3), "—", verdict.label);
}

// ---------------------------------------------------------------------------
// Test 3: Very young user, 37 years to retirement
//
// age 28 → retire 65 | income $60k | savings $6k | assets $10k
// spending $40k | SS $12k | return 7%
//
// FV ≈ 1,084,258 | requiredCapital = 700,000 | ratio ≈ 1.549
// Savings Strength: age 28 < 30 → benchmark clamped to 1× → score ≈ 16.67
// ---------------------------------------------------------------------------
{
  const state = mkState({
    currentAge: 28,
    retirementAge: 65,
    annualIncome: 60_000,
    annualSavings: 6_000,
    currentAssets: 10_000,
    retirementSpending: 40_000,
    socialSecurityIncome: 12_000,
  });

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
  close(scores.savingsStrength, 16.67, 0.1);
  close(scores.cashFlowPower, 50, 0.01);
  assert.equal(scores.timelineFeasibility, 100);

  const actions = simulateActions(state);
  assert.equal(actions.length, 5);
  assert(actions[0].impact > 0, "Top action should have positive impact");

  console.log("✓ Test 3 (Young, 37yr horizon): ratio =", ratio.toFixed(3), "—", verdict.label);
  console.log("  Savings Strength score (age 28, clamped to 1×):", scores.savingsStrength.toFixed(2));
}

// ---------------------------------------------------------------------------
// Test 4: blendedReturn — mixed allocation (60/25/10/5/0)
//
// $100k total: stocks $60k, bonds $25k, cash $10k, realEstate $5k, alt $0
// Default returns: stocks 7%, bonds 4%, cash 1.5%, realEstate 4%, alt 0%
//
// Manual:
//   blended = 0.60×0.07 + 0.25×0.04 + 0.10×0.015 + 0.05×0.04 + 0
//           = 0.042 + 0.010 + 0.0015 + 0.002 = 0.0555 = 5.55%
// ---------------------------------------------------------------------------
{
  const state: HouseholdState = {
    currentAge: 40,
    retirementAge: 65,
    annualIncome: 100_000,
    annualSavings: 20_000,
    assets: { stocks: 60_000, bonds: 25_000, cash: 10_000, realEstate: 5_000, alternatives: 0 },
    returns: { stocks: 0.07, bonds: 0.04, cash: 0.015, realEstate: 0.04, alternatives: 0 },
    retirementSpending: 80_000,
    socialSecurityIncome: 0,
  };

  assert.equal(totalAssets(state), 100_000);

  const alloc = allocationPercentages(state);
  close(alloc.stocks, 0.60, 0.0001);
  close(alloc.bonds, 0.25, 0.0001);
  close(alloc.cash, 0.10, 0.0001);
  close(alloc.realEstate, 0.05, 0.0001);

  const br = blendedReturn(state);
  close(br, 0.0555, 0.0001);

  console.log("✓ Test 4 (blendedReturn mixed 60/25/10/5/0):", (br * 100).toFixed(2) + "%");
}

// ---------------------------------------------------------------------------
// Test 5: blendedReturn — cash-heavy portfolio (~2.6%)
//
// $100k total: stocks $20k, bonds $0, cash $80k
// blended = 0.20×0.07 + 0.80×0.015 = 0.014 + 0.012 = 0.026
// ---------------------------------------------------------------------------
{
  const state: HouseholdState = {
    currentAge: 60,
    retirementAge: 70,
    annualIncome: 80_000,
    annualSavings: 5_000,
    assets: { stocks: 20_000, bonds: 0, cash: 80_000, realEstate: 0, alternatives: 0 },
    returns: { stocks: 0.07, bonds: 0.04, cash: 0.015, realEstate: 0.04, alternatives: 0 },
    retirementSpending: 60_000,
    socialSecurityIncome: 15_000,
  };

  const br = blendedReturn(state);
  close(br, 0.026, 0.001);
  assert(br < 0.035, `Expected blended return < 3.5%, got ${(br * 100).toFixed(2)}%`);

  console.log("✓ Test 5 (blendedReturn cash-heavy ~2.6%):", (br * 100).toFixed(2) + "%");
}

// ---------------------------------------------------------------------------
// Test 6: growthAssetPercentage — 20% cap on alternatives
//
// stocks 30%, bonds 10%, cash 10%, realEstate 0%, alternatives 50%
// Without cap: growth = 30 + 0 + 50 = 80
// With cap:    growth = 30 + 0 + min(50, 20) = 50
// ---------------------------------------------------------------------------
{
  const state: HouseholdState = {
    currentAge: 40,
    retirementAge: 65,
    annualIncome: 100_000,
    annualSavings: 15_000,
    assets: { stocks: 30_000, bonds: 10_000, cash: 10_000, realEstate: 0, alternatives: 50_000 },
    returns: { stocks: 0.07, bonds: 0.04, cash: 0.015, realEstate: 0.04, alternatives: 0 },
    retirementSpending: 70_000,
    socialSecurityIncome: 0,
  };

  const growth = growthAssetPercentage(state);
  close(growth, 50, 0.01);
  assert(growth < 80, `Expected growth < 80 due to alternatives cap, got ${growth}`);

  console.log("✓ Test 6 (growthAssetPercentage with 50% alternatives → capped at 50%):", growth.toFixed(1) + "%");
}

console.log("\nAll tests passed.");
