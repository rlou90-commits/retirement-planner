// All monetary values in dollars. All rates/returns as decimals (0.07 = 7%).

// ---- V1.5 asset types -------------------------------------------------------

export type AssetClasses = {
  stocks: number;
  bonds: number;
  cash: number;
  realEstate: number;
  alternatives: number;
};

export type AssetReturns = {
  stocks: number;      // default 0.07
  bonds: number;       // default 0.04
  cash: number;        // default 0.015
  realEstate: number;  // default 0.04
  alternatives: number;// default 0.00
};

const DEFAULT_RETURNS: AssetReturns = {
  stocks: 0.07,
  bonds: 0.04,
  cash: 0.015,
  realEstate: 0.04,
  alternatives: 0.00,
};

// ---- HouseholdState ---------------------------------------------------------
// V1.5 adds assets/returns; V1 legacy fields kept for backward compat until
// Session 2 updates the UI layer.

export type HouseholdState = {
  currentAge: number;
  retirementAge: number;
  partner?: {
    currentAge: number;
    retirementAge: number;
  };
  annualIncome: number;
  annualSavings: number;

  // V1.5 asset breakdown (preferred)
  assets?: AssetClasses;
  returns?: AssetReturns;

  // V1 legacy fallbacks (used by InputForm until Session 2 UI migration)
  currentAssets?: number;
  expectedReturn?: number;

  retirementSpending: number;
  socialSecurityIncome: number;
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

// ---- V1.5 asset helpers -----------------------------------------------------

/** Total dollars across all asset classes. Falls back to legacy currentAssets. */
export function totalAssets(state: HouseholdState): number {
  if (state.assets) {
    return (
      state.assets.stocks +
      state.assets.bonds +
      state.assets.cash +
      state.assets.realEstate +
      state.assets.alternatives
    );
  }
  return state.currentAssets ?? 0;
}

/** Decimal allocation per class. All zeros when total is 0. */
export function allocationPercentages(state: HouseholdState): AssetClasses {
  const total = totalAssets(state);
  if (total === 0 || !state.assets) {
    return { stocks: 0, bonds: 0, cash: 0, realEstate: 0, alternatives: 0 };
  }
  return {
    stocks: state.assets.stocks / total,
    bonds: state.assets.bonds / total,
    cash: state.assets.cash / total,
    realEstate: state.assets.realEstate / total,
    alternatives: state.assets.alternatives / total,
  };
}

/**
 * Weighted-average return. Falls back to legacy expectedReturn when no asset
 * breakdown is present. When total assets is 0, defaults to stocks return.
 */
export function blendedReturn(state: HouseholdState): number {
  if (!state.assets) return state.expectedReturn ?? DEFAULT_RETURNS.stocks;
  const total = totalAssets(state);
  const r = state.returns ?? DEFAULT_RETURNS;
  if (total === 0) return r.stocks;
  const alloc = allocationPercentages(state);
  return (
    alloc.stocks * r.stocks +
    alloc.bonds * r.bonds +
    alloc.cash * r.cash +
    alloc.realEstate * r.realEstate +
    alloc.alternatives * r.alternatives
  );
}

/**
 * Percentage of portfolio in growth assets, with alternatives capped at 20%.
 * growth = stocks% + realEstate% + min(alternatives%, 20%)
 * Returns 0-100 (not a decimal).
 */
export function growthAssetPercentage(state: HouseholdState): number {
  const alloc = allocationPercentages(state);
  return (alloc.stocks + alloc.realEstate + Math.min(alloc.alternatives, 0.20)) * 100;
}

// ---- Age → income multiple benchmarks from PRD §8.1 -------------------------

const SAVINGS_BENCHMARKS: [number, number][] = [
  [30, 1],
  [35, 2],
  [40, 3],
  [45, 4],
  [50, 6],
  [55, 7],
  [60, 8],
];

export function getBenchmarkMultiple(age: number): number {
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

// ---- Two-person household helpers -------------------------------------------

function olderCurrentAge(state: HouseholdState): number {
  return state.partner
    ? Math.max(state.currentAge, state.partner.currentAge)
    : state.currentAge;
}

function laterRetirementAge(state: HouseholdState): number {
  return state.partner
    ? Math.max(state.retirementAge, state.partner.retirementAge)
    : state.retirementAge;
}

// ---- Core calculations -------------------------------------------------------

export function computeFV(state: HouseholdState): number {
  // n = time until the later-retiring person retires; the household saves at
  // the current rate for this entire period.
  const userYears = state.retirementAge - state.currentAge;
  const partnerYears = state.partner
    ? state.partner.retirementAge - state.partner.currentAge
    : userYears;
  const n = Math.max(userYears, partnerYears);
  const assets = totalAssets(state);
  const r = blendedReturn(state);
  if (r === 0) return assets + state.annualSavings * n;
  const growth = Math.pow(1 + r, n);
  return assets * growth + state.annualSavings * (growth - 1) / r;
}

export function computeRequiredCapital(state: HouseholdState): number {
  // Dynamic years in retirement: household plans to age 90.
  // Single-person retiring at 65 → max(1, 90-65) = 25, matching V1 behaviour.
  const yearsInRetirement = Math.max(1, 90 - laterRetirementAge(state));
  return (state.retirementSpending - state.socialSecurityIncome) * yearsInRetirement;
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
  const { annualIncome, annualSavings } = state;

  // Same accumulation period as computeFV.
  const userYears = state.retirementAge - state.currentAge;
  const partnerYears = state.partner
    ? state.partner.retirementAge - state.partner.currentAge
    : userYears;
  const n = Math.max(userYears, partnerYears);
  const r = blendedReturn(state);
  const assets = totalAssets(state);
  const older = olderCurrentAge(state);

  // Savings Strength: benchmark against the older partner's age.
  const benchmarkMultiple = getBenchmarkMultiple(older);
  const savingsStrength = Math.min(
    100,
    ((assets / annualIncome) / benchmarkMultiple) * 100,
  );

  // Cash Flow Power: savings rate vs 20% target.
  const savingsRate = annualSavings / annualIncome;
  const cashFlowPower = Math.min(100, (savingsRate / 0.20) * 100);

  // Timeline Feasibility: how hard it would be to close the gap given time.
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
      // Only delays the primary user's retirement age, not the partner's.
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

// Returns the total years (from today) needed at the current savings pace to
// reach requiredCapital, solving FV(n) = requiredCapital for n.
export function computeYearsToCloseGap(state: HouseholdState): number {
  const required = computeRequiredCapital(state);
  const assets = totalAssets(state);
  const r = blendedReturn(state);
  const { annualSavings } = state;

  if (r === 0) {
    if (annualSavings <= 0) return Infinity;
    return (required - assets) / annualSavings;
  }

  // FV(n) = (assets + pmt/r)*(1+r)^n - pmt/r = required
  // => n = log((required + pmt/r) / (assets + pmt/r)) / log(1+r)
  const pmt_r = annualSavings / r;
  const numerator = required + pmt_r;
  const denominator = assets + pmt_r;

  if (denominator <= 0 || numerator <= 0) return Infinity;

  return Math.log(numerator / denominator) / Math.log(1 + r);
}
