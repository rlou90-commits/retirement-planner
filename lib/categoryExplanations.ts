import {
  computeSufficiencyRatio,
  computeYearsToCloseGap,
  getBenchmarkMultiple,
} from "./calc";
import type { HouseholdState } from "./calc";

export function getSavingsStrengthExplanation(state: HouseholdState): string {
  const { currentAssets, annualIncome, currentAge } = state;
  const savingsMultiple = currentAssets / annualIncome;
  const benchmark = getBenchmarkMultiple(currentAge);
  const sm = savingsMultiple.toFixed(1);
  const bm = benchmark.toFixed(1);

  if (savingsMultiple < benchmark) {
    return `You've saved ${sm}× income, below the ${bm}× benchmark for age ${currentAge}.`;
  }
  return `You've saved ${sm}× income, above the ${bm}× benchmark for age ${currentAge}.`;
}

export function getCashFlowPowerExplanation(state: HouseholdState): string {
  const savingsRate = Math.round((state.annualSavings / state.annualIncome) * 100);

  if (savingsRate < 20) {
    return `You're saving ${savingsRate}% of income, below the 20% target.`;
  }
  return `You're saving ${savingsRate}% of income, above the 20% target.`;
}

export function getTimelineFeasibilityExplanation(state: HouseholdState): string {
  const yearsToRetirement = state.retirementAge - state.currentAge;
  const ratio = computeSufficiencyRatio(state);

  if (ratio >= 1.0) {
    return `Your ${yearsToRetirement}-year timeline supports reaching your target.`;
  }

  const n = computeYearsToCloseGap(state);
  const extraYearsNeeded = Math.ceil(n - yearsToRetirement);

  if (!isFinite(n) || extraYearsNeeded < 1) {
    return `Your ${yearsToRetirement}-year timeline supports reaching your target.`;
  }

  return `You'd need about ${extraYearsNeeded} more years at your current pace to close the gap.`;
}
