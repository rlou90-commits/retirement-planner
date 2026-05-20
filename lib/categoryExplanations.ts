import {
  computeSufficiencyRatio,
  computeYearsToCloseGap,
  getBenchmarkMultiple,
  totalAssets,
  computeAssetQualityScore,
} from "./calc";
import type { HouseholdState } from "./calc";

export function getSavingsStrengthExplanation(state: HouseholdState): string {
  const { annualIncome, currentAge } = state;
  const savingsMultiple = totalAssets(state) / annualIncome;
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

export function getAssetQualityExplanation(state: HouseholdState): {
  tooltip: string;
  sentence: string;
} {
  const tooltip =
    "Growth assets are stocks and real estate (alternatives count up to 20%). The rest is non-growth — bonds and cash.";

  const {
    growthAlignment,
    concentrationPenalty,
    targetGrowth,
    userGrowth,
    dominantClass,
  } = computeAssetQualityScore(state);

  const userYears = state.retirementAge - state.currentAge;
  const partnerYears = state.partner
    ? state.partner.retirementAge - state.partner.currentAge
    : userYears;
  const yearsToRetirement = Math.max(userYears, partnerYears);

  const tg = Math.round(targetGrowth);
  const ug = Math.round(userGrowth);
  const maxPct = Math.round(dominantClass.percentage);

  let sentence: string;

  if (concentrationPenalty < 60 && growthAlignment >= 70) {
    // Concentration is the dominant issue
    sentence = `${dominantClass.name} represents ${maxPct}% of your portfolio. Diversification across asset classes can reduce risk.`;
  } else if (userGrowth < targetGrowth) {
    sentence = `Your portfolio is ${ug}% in growth assets, below the ${tg}% target for your ${yearsToRetirement}-year horizon.`;
  } else if (userGrowth > targetGrowth + 10) {
    sentence = `Your portfolio is ${ug}% in growth assets, above the ${tg}% target. Consider some bonds for stability as retirement approaches.`;
  } else {
    sentence = `Your portfolio mix is well-aligned with your ${yearsToRetirement}-year horizon.`;
  }

  return { tooltip, sentence };
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
