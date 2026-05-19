// All monetary values in dollars. All rates/returns as decimals (0.07 = 7%).

export type HouseholdState = {
  currentAge: number;
  retirementAge: number;
  annualIncome: number;
  annualSavings: number;
  currentAssets: number;
  retirementSpending: number;
  expectedReturn: number;       // decimal, e.g. 0.07 for 7%
  socialSecurityIncome: number; // dollars/year; 0 if none
};

export type VerdictColor = "green" | "light-green" | "amber" | "red";

export type Verdict = {
  label: string;
  color: VerdictColor;
};

export type CategoryScores = {
  savingsStrength: number;
  cashFlowPower: number;
  timelineFeasibility: number;
};

export type ActionResult = {
  name: string;
  description: string;
  tooltip?: string;
  originalRatio: number;
  newRatio: number;
  impact: number;
};

// Age → income multiple benchmarks from PRD §8.1
const SAVINGS_BENCHMARKS: [number, number][] = [
  [30, 1],
  [35, 2],
  [40, 3],
  [45, 4],
  [50, 6],
  [55, 7],
  [60, 8],
];

function getBenchmarkMultiple(age: number): number {
  if (age <= 30) return 1;
  if (age >= 60) return 8;
  for (let i = 0; i < SAVINGS_BENCHMARKS.length - 1; i++) {
    const [age1, mult1] = SAVINGS_BENCHMARKS[i];
    const [age2, mult2] = SAVINGS_BENCHMARKS[i + 1];
    if (age >= age1 && age <= age2) {
      const t = (age - age1) / (age2 - age1);
      return mult1 + t * (mult2 - mult1);
    }
  }
  return 8;
}

export function computeFV(state: HouseholdState): number {
  const { currentAge, retirementAge, annualSavings, currentAssets, expectedReturn: r } = state;
  const n = retirementAge - currentAge;
  if (r === 0) return currentAssets + annualSavings * n;
  const growth = Math.pow(1 + r, n);
  return currentAssets * growth + annualSavings * (growth - 1) / r;
}

export function computeRequiredCapital(state: HouseholdState): number {
  return (state.retirementSpending - state.socialSecurityIncome) * 25;
}

export function computeSufficiencyRatio(state: HouseholdState): number {
  return computeFV(state) / computeRequiredCapital(state);
}

export function getVerdict(ratio: number): Verdict {
  if (ratio >= 1.20) return { label: "Well-prepared", color: "green" };
  if (ratio >= 1.00) return { label: "On track", color: "light-green" };
  if (ratio >= 0.80) return { label: "Needs attention", color: "amber" };
  return { label: "Structural gap", color: "red" };
}

export function computeCategoryScores(state: HouseholdState): CategoryScores {
  const {
    currentAge,
    retirementAge,
    annualIncome,
    annualSavings,
    currentAssets,
    expectedReturn: r,
  } = state;
  const n = retirementAge - currentAge;

  // Savings Strength: assets vs age-appropriate income multiple
  const benchmarkMultiple = getBenchmarkMultiple(currentAge);
  const savingsStrength = Math.min(
    100,
    ((currentAssets / annualIncome) / benchmarkMultiple) * 100,
  );

  // Cash Flow Power: savings rate vs 20% target
  const savingsRate = annualSavings / annualIncome;
  const cashFlowPower = Math.min(100, (savingsRate / 0.20) * 100);

  // Timeline Feasibility: how hard it would be to close the gap
  const ratio = computeSufficiencyRatio(state);
  let timelineFeasibility: number;
  if (ratio >= 1.0) {
    timelineFeasibility = 100;
  } else {
    const fv = computeFV(state);
    const required = computeRequiredCapital(state);
    const shortfall = required - fv;
    const annuityFactor = r === 0 ? n : (Math.pow(1 + r, n) - 1) / r;
    const extraSavingsNeeded = shortfall / annuityFactor;
    const asPercentOfIncome = extraSavingsNeeded / annualIncome;
    timelineFeasibility = Math.max(0, 100 - asPercentOfIncome * 500);
  }

  return { savingsStrength, cashFlowPower, timelineFeasibility };
}

export function simulateActions(state: HouseholdState): ActionResult[] {
  const originalRatio = computeSufficiencyRatio(state);

  type ActionDef = {
    name: string;
    description: string;
    tooltip?: string;
    apply: (s: HouseholdState) => HouseholdState;
  };

  const actionDefs: ActionDef[] = [
    {
      name: "Save more",
      description: "Increase your annual savings by 10%",
      apply: (s) => ({ ...s, annualSavings: s.annualSavings * 1.10 }),
    },
    {
      name: "Save significantly more",
      description: "Increase your annual savings by 25%",
      apply: (s) => ({ ...s, annualSavings: s.annualSavings * 1.25 }),
    },
    {
      name: "Delay retirement",
      description: "Push your retirement date back by 3 years",
      apply: (s) => ({ ...s, retirementAge: s.retirementAge + 3 }),
    },
    {
      name: "Reduce retirement spending",
      description: "Lower your target retirement spending by 15%",
      apply: (s) => ({ ...s, retirementSpending: s.retirementSpending * 0.85 }),
    },
    {
      name: "Increase income",
      description: "Grow your household income by 10%",
      tooltip:
        "Assumes your savings rate stays the same — i.e., you save the same percentage of your new income",
      apply: (s) => {
        const savingsRate = s.annualSavings / s.annualIncome;
        const newIncome = s.annualIncome * 1.10;
        return { ...s, annualIncome: newIncome, annualSavings: newIncome * savingsRate };
      },
    },
  ];

  const results: ActionResult[] = actionDefs.map(({ name, description, tooltip, apply }) => {
    const newState = apply(state);
    const newRatio = computeSufficiencyRatio(newState);
    return {
      name,
      description,
      ...(tooltip !== undefined ? { tooltip } : {}),
      originalRatio,
      newRatio,
      impact: newRatio - originalRatio,
    };
  });

  return results.sort((a, b) => b.impact - a.impact);
}
