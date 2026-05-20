import { totalAssets, allocationPercentages } from "./calc";
import type { HouseholdState } from "./calc";

export type ActionDescription = {
  verbPhrase: string; // rendered in <strong> in the headline
  magnitude: string;  // rendered in normal weight after verbPhrase
  description: string;
};

function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function saveMore(state: HouseholdState): ActionDescription {
  const extraAnnual = state.annualSavings * 0.10;
  const extraMonthly = extraAnnual / 12;
  return {
    verbPhrase: "save more",
    magnitude: "(+10% to savings)",
    description: `Save an additional ${fmt(extraAnnual)} per year — roughly ${fmt(extraMonthly)} more per month — on top of your current savings.`,
  };
}

function saveSignificantlyMore(state: HouseholdState): ActionDescription {
  const extraAnnual = state.annualSavings * 0.25;
  const extraMonthly = extraAnnual / 12;
  return {
    verbPhrase: "save significantly more",
    magnitude: "(+25% to savings)",
    description: `Save an additional ${fmt(extraAnnual)} per year — roughly ${fmt(extraMonthly)} more per month — on top of your current savings.`,
  };
}

function delayRetirement(state: HouseholdState): ActionDescription {
  const from = state.retirementAge;
  const to = from + 3;
  return {
    verbPhrase: "delay retirement",
    magnitude: "(+3 years)",
    description: `Push your retirement age from ${from} to ${to}, giving your savings three more years to compound.`,
  };
}

function reduceSpending(state: HouseholdState): ActionDescription {
  const newSpending = state.retirementSpending * 0.85;
  return {
    verbPhrase: "reduce retirement spending",
    magnitude: "(−15% to spending)",
    description: `Plan to spend ${fmt(newSpending)} per year in retirement instead of ${fmt(state.retirementSpending)}.`,
  };
}

function increaseIncome(state: HouseholdState): ActionDescription {
  const newIncome = state.annualIncome * 1.10;
  const extraSavings = state.annualSavings * 0.10;
  return {
    verbPhrase: "increase income",
    magnitude: "(+10% to income)",
    description: `Boost household income to ${fmt(newIncome)} (10% above current). Adds roughly ${fmt(extraSavings)} to your annual savings at the same rate.`,
  };
}

function reduceCashDrag(state: HouseholdState): ActionDescription {
  const total = totalAssets(state);
  const currentCash = state.assets?.cash ?? 0;
  const newCash = total * 0.10;
  const excessCash = currentCash - newCash;
  const currentCashPct = Math.round(allocationPercentages(state).cash * 100);
  return {
    verbPhrase: "reduce cash drag",
    magnitude: "(cash to 10%)",
    description: `Move ${fmt(excessCash)} from cash to growth assets. Your cash holdings drop from ${currentCashPct}% to 10% of total assets.`,
  };
}

function shiftBondsToGrowth(state: HouseholdState): ActionDescription {
  const halfBonds = (state.assets?.bonds ?? 0) * 0.5;
  const currentBondPct = Math.round(allocationPercentages(state).bonds * 100);
  const newBondPct = Math.round(currentBondPct / 2);
  return {
    verbPhrase: "shift bonds to growth",
    magnitude: "(−50% bonds)",
    description: `Move ${fmt(halfBonds)} from bonds to growth assets. Your bond holdings drop from ${currentBondPct}% to ${newBondPct}%.`,
  };
}

function rebalanceToTargetGrowth(state: HouseholdState): ActionDescription {
  const userYears = state.retirementAge - state.currentAge;
  const partnerYears = state.partner
    ? state.partner.retirementAge - state.partner.currentAge
    : userYears;
  const yrs = Math.max(userYears, partnerYears);
  const targetGrowth = Math.max(40, Math.min(90, 45 + yrs));
  const total = totalAssets(state);
  const targetDollars = total * targetGrowth / 100;
  return {
    verbPhrase: "rebalance",
    magnitude: `(${targetGrowth}% growth)`,
    description: `Adjust your portfolio so growth assets reach ${fmt(targetDollars)} — appropriate for your ${yrs}-year horizon.`,
  };
}

function diversify(state: HouseholdState): ActionDescription {
  const alloc = allocationPercentages(state);
  const classes = ["stocks", "bonds", "cash", "realEstate", "alternatives"] as const;
  const names: Record<string, string> = {
    stocks: "Stocks", bonds: "Bonds", cash: "Cash",
    realEstate: "Real Estate", alternatives: "Alternatives",
  };
  let dominantKey = classes[0] as string;
  let maxPct = 0;
  for (const cls of classes) {
    const pct = alloc[cls] * 100;
    if (pct > maxPct) { maxPct = pct; dominantKey = cls; }
  }
  const dominantName = names[dominantKey] ?? dominantKey;
  const maxPctInt = Math.round(maxPct);
  return {
    verbPhrase: "diversify",
    magnitude: "(reduce concentration)",
    description: `Spread your ${dominantName} holdings across other asset classes. ${dominantName} is currently ${maxPctInt}% of your portfolio.`,
  };
}

const DESCRIPTIONS: Record<string, (s: HouseholdState) => ActionDescription> = {
  "Save more": saveMore,
  "Save significantly more": saveSignificantlyMore,
  "Delay retirement": delayRetirement,
  "Reduce retirement spending": reduceSpending,
  "Increase income": increaseIncome,
  "Reduce cash drag": reduceCashDrag,
  "Shift bonds to growth": shiftBondsToGrowth,
  "Rebalance to target growth": rebalanceToTargetGrowth,
  "Diversify": diversify,
};

export function getActionDescription(
  actionName: string,
  state: HouseholdState,
): ActionDescription {
  return DESCRIPTIONS[actionName]?.(state) ?? {
    verbPhrase: actionName.toLowerCase(),
    magnitude: "",
    description: "",
  };
}
