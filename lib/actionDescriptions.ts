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
    magnitude: "(+10%)",
    description: `Save an additional ${fmt(extraAnnual)} per year — roughly ${fmt(extraMonthly)} more per month — on top of your current savings.`,
  };
}

function saveSignificantlyMore(state: HouseholdState): ActionDescription {
  const extraAnnual = state.annualSavings * 0.25;
  const extraMonthly = extraAnnual / 12;
  return {
    verbPhrase: "save significantly more",
    magnitude: "(+25%)",
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
    magnitude: "(−15%)",
    description: `Plan to spend ${fmt(newSpending)} per year in retirement instead of ${fmt(state.retirementSpending)}.`,
  };
}

function increaseIncome(state: HouseholdState): ActionDescription {
  const newIncome = state.annualIncome * 1.10;
  const extraSavings = state.annualSavings * 0.10;
  return {
    verbPhrase: "increase income",
    magnitude: "(+10%)",
    description: `Boost household income to ${fmt(newIncome)} (10% above current). Adds roughly ${fmt(extraSavings)} to your annual savings at the same rate.`,
  };
}

const DESCRIPTIONS: Record<string, (s: HouseholdState) => ActionDescription> = {
  "Save more": saveMore,
  "Save significantly more": saveSignificantlyMore,
  "Delay retirement": delayRetirement,
  "Reduce retirement spending": reduceSpending,
  "Increase income": increaseIncome,
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
