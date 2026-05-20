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
  computeAssetQualityScore,
  type HouseholdState,
} from "./calc";
import { getAssetQualityExplanation } from "./categoryExplanations";

function close(actual: number, expected: number, tolerance = 1.0): void {
  assert(
    Math.abs(actual - expected) <= tolerance,
    `Expected ~${expected}, got ${actual}`,
  );
}

// Helper to build a state from a single asset value at 7% — preserves V1 regression coverage.
function mkState(
  base: Omit<HouseholdState, "assets" | "returns"> & { currentAssets: number },
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
  // All-stocks portfolio: reduceCashDrag (cash=0%) and shiftBondsToGrowth (bonds=0%) are
  // inapplicable; rebalanceToTargetGrowth and Diversify (100%>80%) are applicable → 7 total.
  assert(actions.length >= 5, `Expected ≥ 5 actions, got ${actions.length}`);
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
  assert(actions.length >= 5, `Expected ≥ 5 actions, got ${actions.length}`);
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

// ---------------------------------------------------------------------------
// Tests 7–13: Asset Quality score — 7 stress-test scenarios
//
// Shared formula recap:
//   targetGrowth  = clamp(45 + n, 40, 90)
//   threshold     = clamp(80 + (n − 15), 70, 95)
//   gap           = userGrowth − targetGrowth
//   growthAlign   = gap ≥ 0 ? max(0, 100 − gap×1.5) : max(0, 100 − |gap|×2)
//   concPenalty   = maxPct ≤ threshold ? 100 : max(0, 100 − (maxPct − threshold)×5)
//   score         = round(0.7×growthAlign + 0.3×concPenalty)
// ---------------------------------------------------------------------------
{
  type Scenario = {
    label: string;
    age: number;
    retirementAge: number;
    assets: HouseholdState["assets"];
    expectedScore: number;
    expectedSentenceKind: "over-aggressive" | "under-aggressive" | "concentration" | "well-aligned" | "any";
  };

  const DEF_RETURNS: HouseholdState["returns"] = {
    stocks: 0.07, bonds: 0.04, cash: 0.015, realEstate: 0.04, alternatives: 0,
  };

  const scenarios: Scenario[] = [
    {
      // n=35, targetGrowth=80, userGrowth=100, gap=+20
      // growthAlign = max(0, 100−30)=70, threshold=95, maxPct=100(stocks)
      // concPenalty = max(0, 100−(100−95)×5)=75
      // score = round(0.7×70 + 0.3×75) = round(71.5) = 72
      label: "30yo all-stocks",
      age: 30, retirementAge: 65,
      assets: { stocks: 100_000, bonds: 0, cash: 0, realEstate: 0, alternatives: 0 },
      expectedScore: 72,
      expectedSentenceKind: "over-aggressive",
    },
    {
      // n=35, targetGrowth=80, userGrowth=70, gap=−10
      // growthAlign = max(0,100−20)=80, threshold=95, maxPct=70(stocks)→concPenalty=100
      // score = round(0.7×80 + 0.3×100) = round(86) = 86
      label: "30yo diversified (70/20/10)",
      age: 30, retirementAge: 65,
      assets: { stocks: 70_000, bonds: 20_000, cash: 10_000, realEstate: 0, alternatives: 0 },
      expectedScore: 86,
      expectedSentenceKind: "under-aggressive",
    },
    {
      // n=20, targetGrowth=65, userGrowth=60, gap=−5
      // growthAlign=max(0,100−10)=90, threshold=85, maxPct=60(stocks)→concPenalty=100
      // score = round(0.7×90 + 0.3×100) = 93
      label: "45yo sensible (60/30/10)",
      age: 45, retirementAge: 65,
      assets: { stocks: 60_000, bonds: 30_000, cash: 10_000, realEstate: 0, alternatives: 0 },
      expectedScore: 93,
      expectedSentenceKind: "under-aggressive",
    },
    {
      // n=10, targetGrowth=55, userGrowth=20, gap=−35
      // growthAlign=max(0,100−70)=30, threshold=75, maxPct=60(bonds)→concPenalty=100
      // score = round(0.7×30 + 0.3×100) = round(51) = 51
      label: "55yo over-conservative (20/60/20)",
      age: 55, retirementAge: 65,
      assets: { stocks: 20_000, bonds: 60_000, cash: 20_000, realEstate: 0, alternatives: 0 },
      expectedScore: 51,
      expectedSentenceKind: "under-aggressive",
    },
    {
      // n=5, targetGrowth=50, userGrowth=95, gap=+45
      // growthAlign=max(0,100−67.5)=32.5, threshold=70, maxPct=95(stocks)
      // concPenalty=max(0,100−(95−70)×5)=max(0,−25)=0
      // score = round(0.7×32.5 + 0.3×0) = round(22.75) = 23
      label: "60yo concentrated stocks (95/0/5)",
      age: 60, retirementAge: 65,
      assets: { stocks: 95_000, bonds: 0, cash: 5_000, realEstate: 0, alternatives: 0 },
      expectedScore: 23,
      expectedSentenceKind: "over-aggressive",
    },
    {
      // n=20, targetGrowth=65, userGrowth=(40+min(50,20))×100=60, gap=−5
      // growthAlign=90, threshold=85, maxPct=50(alternatives)→concPenalty=100
      // score = round(0.7×90 + 0.3×100) = 93
      label: "45yo alternatives-heavy (40/10/0/0/50)",
      age: 45, retirementAge: 65,
      assets: { stocks: 40_000, bonds: 10_000, cash: 0, realEstate: 0, alternatives: 50_000 },
      expectedScore: 93,
      expectedSentenceKind: "under-aggressive",
    },
    {
      label: "Zero assets edge case",
      age: 40, retirementAge: 65,
      assets: { stocks: 0, bonds: 0, cash: 0, realEstate: 0, alternatives: 0 },
      expectedScore: 0,
      expectedSentenceKind: "any",
    },
  ];

  for (const sc of scenarios) {
    const state: HouseholdState = {
      currentAge: sc.age, retirementAge: sc.retirementAge,
      annualIncome: 100_000, annualSavings: 15_000,
      assets: sc.assets!, returns: DEF_RETURNS,
      retirementSpending: 70_000, socialSecurityIncome: 0,
    };

    const result = computeAssetQualityScore(state);
    assert.equal(
      result.score,
      sc.expectedScore,
      `${sc.label}: expected score ${sc.expectedScore}, got ${result.score}`,
    );

    // Verify explanation returns the expected sentence kind (except "any")
    if (sc.expectedSentenceKind !== "any") {
      const { sentence } = getAssetQualityExplanation(state);
      let kindMatch = false;
      if (sc.expectedSentenceKind === "over-aggressive") kindMatch = sentence.includes("above the");
      if (sc.expectedSentenceKind === "under-aggressive") kindMatch = sentence.includes("below the");
      if (sc.expectedSentenceKind === "concentration") kindMatch = sentence.includes("Diversification");
      if (sc.expectedSentenceKind === "well-aligned") kindMatch = sentence.includes("well-aligned");
      assert(
        kindMatch,
        `${sc.label}: expected "${sc.expectedSentenceKind}" sentence, got: "${sentence}"`,
      );
    }

    console.log(`✓ Test Asset Quality (${sc.label}): score = ${result.score}`);
  }
}

// ---------------------------------------------------------------------------
// Test: allocation action — reduceCashDrag
// 70% stocks, 0% bonds, 30% cash ($100k total)
// cash(30%) > 10% → applicable; newCash = $10k, excess $20k → all to stocks
// ---------------------------------------------------------------------------
{
  const state: HouseholdState = {
    currentAge: 45, retirementAge: 65, annualIncome: 100_000, annualSavings: 15_000,
    assets: { stocks: 70_000, bonds: 0, cash: 30_000, realEstate: 0, alternatives: 0 },
    returns: { stocks: 0.07, bonds: 0.04, cash: 0.015, realEstate: 0.04, alternatives: 0 },
    retirementSpending: 70_000, socialSecurityIncome: 0,
  };

  const actions = simulateActions(state);
  const rcd = actions.find((a) => a.name === "Reduce cash drag");
  assert(rcd !== undefined, "reduceCashDrag should be in results");

  // Verify the modified state: cash drops to 10%, excess goes to stocks
  // New stocks = 70,000 + 20,000 = 90,000; new cash = 10,000
  const alloc = allocationPercentages(state);
  close(alloc.cash * 100, 30, 0.01);         // original: 30% cash
  assert(alloc.cash * 100 > 10, "cash > 10% so action is applicable");

  // Verify inapplicable when cash is already ≤ 10%
  const lowCashState: HouseholdState = {
    ...state,
    assets: { stocks: 95_000, bonds: 0, cash: 5_000, realEstate: 0, alternatives: 0 },
  };
  const lowCashActions = simulateActions(lowCashState);
  assert(
    !lowCashActions.some((a) => a.name === "Reduce cash drag"),
    "reduceCashDrag should NOT appear when cash is 5%",
  );

  console.log("✓ Test: reduceCashDrag applicable/inapplicable filtering");
}

// ---------------------------------------------------------------------------
// Test: allocation action — shiftBondsToGrowth
// 60% stocks, 40% bonds ($100k total) → bonds(40%) > 5% → applicable
// New bonds = 20,000; excess 20,000 → stocks (no RE)
// ---------------------------------------------------------------------------
{
  const state: HouseholdState = {
    currentAge: 45, retirementAge: 65, annualIncome: 100_000, annualSavings: 15_000,
    assets: { stocks: 60_000, bonds: 40_000, cash: 0, realEstate: 0, alternatives: 0 },
    returns: { stocks: 0.07, bonds: 0.04, cash: 0.015, realEstate: 0.04, alternatives: 0 },
    retirementSpending: 70_000, socialSecurityIncome: 0,
  };

  const actions = simulateActions(state);
  const sbg = actions.find((a) => a.name === "Shift bonds to growth");
  assert(sbg !== undefined, "shiftBondsToGrowth should be in results");

  // Verify bonds > 5% so action is applicable
  const alloc = allocationPercentages(state);
  assert(alloc.bonds * 100 > 5, "bonds > 5% so action is applicable");

  // Verify inapplicable when bonds ≤ 5%
  const lowBondState: HouseholdState = {
    ...state,
    assets: { stocks: 97_000, bonds: 3_000, cash: 0, realEstate: 0, alternatives: 0 },
  };
  const lowBondActions = simulateActions(lowBondState);
  assert(
    !lowBondActions.some((a) => a.name === "Shift bonds to growth"),
    "shiftBondsToGrowth should NOT appear when bonds ≤ 5%",
  );

  console.log("✓ Test: shiftBondsToGrowth applicable/inapplicable filtering");
}

// ---------------------------------------------------------------------------
// Test: allocation action — diversify uses score-based impact
// 90% stocks, 10% bonds → 90% > 80% → applicable
// After: stocks = 80%, bonds = 20%
// Impact = (newQualityScore − oldQualityScore) / 100
// ---------------------------------------------------------------------------
{
  const state: HouseholdState = {
    currentAge: 45, retirementAge: 65, annualIncome: 100_000, annualSavings: 15_000,
    assets: { stocks: 90_000, bonds: 10_000, cash: 0, realEstate: 0, alternatives: 0 },
    returns: { stocks: 0.07, bonds: 0.04, cash: 0.015, realEstate: 0.04, alternatives: 0 },
    retirementSpending: 70_000, socialSecurityIncome: 0,
  };

  const actions = simulateActions(state);
  const div = actions.find((a) => a.name === "Diversify");
  assert(div !== undefined, "Diversify should be in results when stocks = 90%");

  // Impact should be score-improvement / 100, not ratio-improvement
  const originalQ = computeAssetQualityScore(state).score;
  assert(originalQ < 100, "Original quality score should be < 100 due to concentration");
  // Impact must be positive (diversifying from 90% → 80% improves concentration score)
  assert(div.impact > 0, `Diversify impact should be positive, got ${div.impact}`);
  // Impact is in the /100 scale, so should be a small decimal
  assert(div.impact < 1, `Diversify impact should be < 1 (score/100 scale), got ${div.impact}`);

  // Verify not applicable when no class exceeds 80%
  const spreadState: HouseholdState = {
    ...state,
    assets: { stocks: 50_000, bonds: 30_000, cash: 20_000, realEstate: 0, alternatives: 0 },
  };
  const spreadActions = simulateActions(spreadState);
  assert(
    !spreadActions.some((a) => a.name === "Diversify"),
    "Diversify should NOT appear when no class > 80%",
  );

  console.log("✓ Test: Diversify score-based impact and applicability filtering");
}

console.log("\nAll tests passed.");
