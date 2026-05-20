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

export type HouseholdState = {
  currentAge: number;
  retirementAge: number;
  partner?: {
    currentAge: number;
    retirementAge: number;
  };
  annualIncome: number;
  annualSavings: number;
  assets?: AssetClasses;
  returns?: AssetReturns;
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
  assetQuality: number;
};

export type AssetQualityBreakdown = {
  score: number;
  growthAlignment: number;
  concentrationPenalty: number;
  targetGrowth: number;
  userGrowth: number;
  threshold: number;
  dominantClass: { name: string; percentage: number };
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

/** Total dollars across all asset classes. Returns 0 when no breakdown present. */
export function totalAssets(state: HouseholdState): number {
  if (!state.assets) return 0;
  return (
    state.assets.stocks +
    state.assets.bonds +
    state.assets.cash +
    state.assets.realEstate +
    state.assets.alternatives
  );
}

/** Decimal allocation per class. All zeros when total is 0 or no assets set. */
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
 * Weighted-average return. When total assets is 0 or no breakdown is present,
 * defaults to the stocks return (or 7% if no returns object provided).
 */
export function blendedReturn(state: HouseholdState): number {
  const r = state.returns ?? DEFAULT_RETURNS;
  if (!state.assets) return r.stocks;
  const total = totalAssets(state);
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

  const assetQuality = computeAssetQualityScore(state).score;

  return { savingsStrength, cashFlowPower, timelineFeasibility, assetQuality };
}

// Asset class name map for human-readable output
const CLASS_NAMES: Record<keyof AssetClasses, string> = {
  stocks: "Stocks",
  bonds: "Bonds",
  cash: "Cash",
  realEstate: "Real Estate",
  alternatives: "Alternatives",
};

export function computeAssetQualityScore(state: HouseholdState): AssetQualityBreakdown {
  const userYears = state.retirementAge - state.currentAge;
  const partnerYears = state.partner
    ? state.partner.retirementAge - state.partner.currentAge
    : userYears;
  const yearsToRetirement = Math.max(userYears, partnerYears);

  const targetGrowth = Math.max(40, Math.min(90, 45 + yearsToRetirement));
  const threshold = Math.max(70, Math.min(95, 80 + (yearsToRetirement - 15)));

  // Edge case: no assets entered yet
  if (totalAssets(state) === 0) {
    return {
      score: 0,
      growthAlignment: 0,
      concentrationPenalty: 100,
      targetGrowth,
      userGrowth: 0,
      threshold,
      dominantClass: { name: "Cash", percentage: 0 },
    };
  }

  const userGrowth = growthAssetPercentage(state);

  // Asymmetric growth alignment: over-aggressive penalised less than under-aggressive
  const gap = userGrowth - targetGrowth;
  const growthAlignment =
    gap >= 0
      ? Math.max(0, 100 - gap * 1.5)
      : Math.max(0, 100 - Math.abs(gap) * 2);

  // Find dominant class
  const alloc = allocationPercentages(state);
  let maxPct = 0;
  let dominantKey: keyof AssetClasses = "cash";
  for (const key of Object.keys(alloc) as Array<keyof AssetClasses>) {
    const pct = alloc[key] * 100;
    if (pct > maxPct) {
      maxPct = pct;
      dominantKey = key;
    }
  }

  // Concentration penalty: time-scaled threshold
  const concentrationPenalty =
    maxPct <= threshold
      ? 100
      : Math.max(0, 100 - (maxPct - threshold) * 5);

  const score = Math.round(0.7 * growthAlignment + 0.3 * concentrationPenalty);

  return {
    score,
    growthAlignment,
    concentrationPenalty,
    targetGrowth,
    userGrowth,
    threshold,
    dominantClass: { name: CLASS_NAMES[dominantKey], percentage: maxPct },
  };
}

// ---- Allocation action helpers ----------------------------------------------

/** Distribute dollars proportionally to growth assets (stocks + RE).
 *  If neither is present, all goes to stocks. */
function distributeToGrowth(
  s: HouseholdState,
  dollars: number,
): { stocks: number; realEstate: number } {
  const stocks = s.assets?.stocks ?? 0;
  const re = s.assets?.realEstate ?? 0;
  const growthBase = stocks + re;
  if (growthBase === 0) {
    return { stocks: stocks + dollars, realEstate: re };
  }
  return {
    stocks: stocks + dollars * (stocks / growthBase),
    realEstate: re + dollars * (re / growthBase),
  };
}

export function simulateActions(state: HouseholdState): ActionResult[] {
  const originalRatio = computeSufficiencyRatio(state);
  const originalQuality = computeAssetQualityScore(state).score;
  const alloc = allocationPercentages(state);
  const total = totalAssets(state);

  type ActionDef = {
    name: string;
    description: string;
    tooltip?: string;
    applicable: boolean;
    apply: (s: HouseholdState) => HouseholdState;
    // Custom impact function; default = newRatio − originalRatio
    impactFn?: (newState: HouseholdState) => number;
  };

  const actionDefs: ActionDef[] = [
    // ---- Existing 5 actions ------------------------------------------------
    {
      name: "Save more",
      description: "Increase your annual savings by 10%",
      applicable: true,
      apply: (s) => ({ ...s, annualSavings: s.annualSavings * 1.10 }),
    },
    {
      name: "Save significantly more",
      description: "Increase your annual savings by 25%",
      applicable: true,
      apply: (s) => ({ ...s, annualSavings: s.annualSavings * 1.25 }),
    },
    {
      // Only delays the primary user's retirement age, not the partner's.
      name: "Delay retirement",
      description: "Push your retirement date back by 3 years",
      applicable: true,
      apply: (s) => ({ ...s, retirementAge: s.retirementAge + 3 }),
    },
    {
      name: "Reduce retirement spending",
      description: "Lower your target retirement spending by 15%",
      applicable: true,
      apply: (s) => ({ ...s, retirementSpending: s.retirementSpending * 0.85 }),
    },
    {
      name: "Increase income",
      description: "Grow your household income by 10%",
      tooltip:
        "Assumes your savings rate stays the same — i.e., you save the same percentage of your new income",
      applicable: true,
      apply: (s) => {
        const savingsRate = s.annualSavings / s.annualIncome;
        const newIncome = s.annualIncome * 1.10;
        return { ...s, annualIncome: newIncome, annualSavings: newIncome * savingsRate };
      },
    },

    // ---- V1.5 allocation actions -------------------------------------------
    {
      // Applicable when cash > 10% of total. Moves excess to growth assets.
      name: "Reduce cash drag",
      description: "Move excess cash to growth assets",
      applicable: alloc.cash * 100 > 10,
      apply: (s) => {
        if (!s.assets) return s;
        const newCash = total * 0.10;
        const excess = s.assets.cash - newCash;
        const { stocks, realEstate } = distributeToGrowth(s, excess);
        return { ...s, assets: { ...s.assets, stocks, cash: newCash, realEstate } };
      },
    },
    {
      // Applicable when bonds > 5% of total. Moves half bonds to growth.
      name: "Shift bonds to growth",
      description: "Move half of bond holdings to growth assets",
      applicable: alloc.bonds * 100 > 5,
      apply: (s) => {
        if (!s.assets) return s;
        const halfBonds = s.assets.bonds * 0.5;
        const { stocks, realEstate } = distributeToGrowth(s, halfBonds);
        return {
          ...s,
          assets: { ...s.assets, stocks, bonds: s.assets.bonds - halfBonds, realEstate },
        };
      },
    },
    {
      // Always applicable. Rebalances to age-appropriate growth target.
      name: "Rebalance to target growth",
      description: "Adjust portfolio to match your retirement timeline",
      applicable: total > 0,
      apply: (s) => {
        if (!s.assets) return s;
        const userYears = s.retirementAge - s.currentAge;
        const partnerYears = s.partner
          ? s.partner.retirementAge - s.partner.currentAge
          : userYears;
        const yrs = Math.max(userYears, partnerYears);
        const targetGrowthPct = Math.max(40, Math.min(90, 45 + yrs)) / 100;

        const alts = s.assets.alternatives;
        const newGrowthDollars = total * targetGrowthPct;
        const nonGrowthPool = Math.max(0, total * (1 - targetGrowthPct) - alts);

        const stocksBase = s.assets.stocks;
        const reBase = s.assets.realEstate;
        const growthBase = stocksBase + reBase;
        const newStocks = growthBase > 0 ? newGrowthDollars * (stocksBase / growthBase) : newGrowthDollars;
        const newRE = growthBase > 0 ? newGrowthDollars * (reBase / growthBase) : 0;

        const bondsBase = s.assets.bonds;
        const cashBase = s.assets.cash;
        const nonGrowthBase = bondsBase + cashBase;
        const newBonds = nonGrowthBase > 0 ? nonGrowthPool * (bondsBase / nonGrowthBase) : nonGrowthPool * 0.7;
        const newCash = nonGrowthBase > 0 ? nonGrowthPool * (cashBase / nonGrowthBase) : nonGrowthPool * 0.3;

        return {
          ...s,
          assets: { stocks: newStocks, bonds: newBonds, cash: newCash, realEstate: newRE, alternatives: alts },
        };
      },
    },
    {
      // Applicable when any single class > 80% of total.
      // Impact uses Asset Quality score improvement / 100 to stay comparable to ratio impacts.
      name: "Diversify",
      description: "Spread concentrated holdings across asset classes",
      applicable: total > 0 && Math.max(...Object.values(alloc)) * 100 > 80,
      apply: (s) => {
        if (!s.assets) return s;
        const a = allocationPercentages(s);
        const classes = ["stocks", "bonds", "cash", "realEstate", "alternatives"] as const;
        let dominantKey: typeof classes[number] = "stocks";
        let maxPct = 0;
        for (const k of classes) {
          if (a[k] > maxPct) { maxPct = a[k]; dominantKey = k; }
        }
        const newDominant = total * 0.80;
        const excess = s.assets[dominantKey] - newDominant;
        const others = classes.filter((c) => c !== dominantKey && s.assets![c] > 0);
        const otherTotal = others.reduce((sum, c) => sum + s.assets![c], 0);
        const newAssets = { ...s.assets, [dominantKey]: newDominant };
        if (others.length === 0) {
          const fallback = dominantKey !== "stocks" ? "stocks" : "bonds";
          newAssets[fallback] += excess;
        } else {
          for (const cls of others) {
            const proportion = s.assets[cls] / otherTotal;
            let share = excess * proportion;
            if (cls === "alternatives") {
              share = Math.min(share, Math.max(0, total * 0.20 - newAssets.alternatives));
            }
            newAssets[cls] += share;
          }
        }
        return { ...s, assets: newAssets };
      },
      // Diversify impact: Asset Quality score improvement scaled to ratio magnitude
      impactFn: (newState) => (computeAssetQualityScore(newState).score - originalQuality) / 100,
    },
  ];

  const results: ActionResult[] = actionDefs
    .filter((d) => d.applicable)
    .map(({ name, description, tooltip, apply, impactFn }) => {
      const newState = apply(state);
      const newRatio = computeSufficiencyRatio(newState);
      const impact = impactFn ? impactFn(newState) : newRatio - originalRatio;
      return {
        name,
        description,
        ...(tooltip !== undefined ? { tooltip } : {}),
        originalRatio,
        newRatio,
        impact,
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
