# Retirement Readiness — V1 PRD

## 1. Product Summary
A deterministic retirement readiness tool that takes a household's basic 
financial inputs and produces:
1. A sufficiency ratio (projected savings ÷ required capital) with a 
   plain-English verdict
2. Three category scores explaining *why* the household is on or off track
3. The top 3 highest-impact actions (drawn from a library of 5) to 
   improve their outcome

V1 prioritizes shipping a usable, honest decision tool. Depth (full 
scoring engine, PDF ingestion, weighted multi-category scoring, scenario 
library) is sequenced into V1.5 and V2.

## 2. Core Problem
Users don't understand whether their current financial trajectory leads 
to retirement readiness, which categories of their financial life are 
strong or weak, and which actions actually move the needle.

## 3. Target User (V1)
Dual-income households or individuals, ages 30–50, with basic clarity on 
income, savings, and total assets. Comfortable typing numbers into a 
form. Wants directional guidance, not a financial plan.

**V1 simplification:** the tool treats the household as one entity. 
Couples enter joint numbers and a single household retirement age. 
Proper multi-person modeling (separate ages, separate SS, age 
alignment recommendations) is V2.

## 4. Goals (V1)
- Sufficiency ratio as the primary readiness metric
- Three category scores that explain the verdict
- A library of five simulated actions, top three shown ranked by impact
- Live scenario exploration: change any input, results recompute instantly

## 5. Non-Goals (V1)
Deferred to V1.5, V2, or later:
- PDF ingestion (V2+)
- Multi-category weighted scoring with the 28/28/18/14/12 schema (V2)
- Trajectory Stability Sensitivity Index (defer until concretely defined)
- Asset Quality category and asset-allocation inputs (V1.5)
- Financial Stability category and debt/emergency fund inputs (V2)
- Full action library (V1.5+)
- Stress test dataset (V2)
- Monte Carlo simulation (V2+)
- Saving / comparing multiple scenarios (V2)
- User accounts, sharing, persistence (V2)

## 6. Inputs (V1)
| Field | Type | Required | Default |
|---|---|---|---|
| Current age | number | yes | — |
| Target retirement age | number | yes | 65 |
| Annual household income | dollars | yes | — |
| Annual savings | dollars | yes | — |
| Current total invested assets | dollars | yes | — |
| Target annual retirement spending | dollars | yes | — |
| Expected annual return | percent | yes | 7 |
| Social Security estimate (annual) | dollars | no | 0 |

## 7. Calculations

**Future Value at retirement (FV):**

```
n = retirementAge - currentAge
r = expectedReturn / 100
FV = currentAssets × (1+r)^n + annualSavings × ((1+r)^n − 1) / r
```

**Required Capital:**

```
requiredCapital = (retirementSpending − socialSecurityIncome) × 25
```

**Sufficiency Ratio:**

```
sufficiencyRatio = FV / requiredCapital
```

**Verdict bands:**
- ≥ 1.20 → "Well-prepared" (green)
- 1.00–1.20 → "On track" (light green)
- 0.80–1.00 → "Needs attention" (amber)
- < 0.80 → "Structural gap" (red)

## 8. Categories (V1)
Each category is scored 0–100 with the same band labels as the overall 
verdict. Categories are descriptive only in V1 — they do not aggregate 
into a single weighted score. That comes in V2.

### 8.1 Savings Strength
- Measures: current assets relative to age-appropriate benchmark
- Benchmark (industry-standard age multiples of income): age 30 → 1×, 
  age 35 → 2×, age 40 → 3×, age 45 → 4×, age 50 → 6×, age 55 → 7×, 
  age 60 → 8×
- Interpolate benchmark linearly between listed ages
- Score formula: `min(100, (currentAssets / income) / benchmarkMultiple × 100)`

### 8.2 Cash Flow Power
- Measures: savings rate (annual savings ÷ annual income)
- Score formula: `min(100, (savingsRate / 0.20) × 100)`
- Interpretation: 20%+ savings rate → 100, 10% → 50, 0% → 0

### 8.3 Timeline Feasibility
- Measures: how hard it would be to close the gap given remaining time
- If sufficiencyRatio ≥ 1.0 → score = 100
- Else, compute the extra annual savings that would be needed to reach 
  sufficiencyRatio = 1.0, accounting for compounding, then express as 
  a percentage of income:

```
shortfall = requiredCapital − FV
extraSavingsNeeded = shortfall / (((1+r)^n − 1) / r)
asPercentOfIncome = extraSavingsNeeded / income
score = max(0, 100 − asPercentOfIncome × 500)
```

- Interpretation: extra 0% of income needed → 100, 10% → 50, 20% → 0
- This captures both shortfall size and years available (via compounding)

## 9. Recommendations (V1)

### 9.1 Action library (5 actions)

| # | Action | Delta applied | Note |
|---|---|---|---|
| 1 | Save more | +10% to annual savings | — |
| 2 | Save significantly more | +25% to annual savings | — |
| 3 | Delay retirement | +3 years to retirement age | — |
| 4 | Reduce retirement spending | −15% to target spending | — |
| 5 | Increase income | +10% to income, savings rate held constant | Show tooltip: "Assumes your savings rate stays the same — i.e., you save the same percentage of your new income" |

### 9.2 Simulation method (for each action)

```
1. Clone current state
2. Apply the action's delta
3. Recompute FV and sufficiencyRatio
4. impact = newSufficiencyRatio − originalSufficiencyRatio
```

### 9.3 Display
- Sort all 5 actions by impact, descending
- Show top 3 by default
- "Show all 5 actions" toggle reveals the remaining 2
- Each action displays: "If you [action], your sufficiency ratio improves 
  from X.XX to Y.YY (+Z.ZZ)"

### 9.4 Category-to-action mapping (design rationale, not shown in UI)

| Category | Actions that improve it |
|---|---|
| Savings Strength | 1, 2, 5 |
| Cash Flow Power | 1, 2, 5 |
| Timeline Feasibility | 3, 4 |

## 10. UI (V1)
Single page, two-column desktop layout (stacks on mobile):
- **Left column:** the 8 input fields, organized into 3 logical groups 
  (You & Timeline / Income & Savings / Retirement Target)
- **Right column:**
  - Sufficiency ratio: large number with verdict label and color
  - Projected savings vs. required capital: two numbers side by side
  - Three category score cards
  - Top 3 actions, each showing before/after sufficiency ratios
  - "Show all 5 actions" toggle

Inputs update results live — no submit button.

## 11. Design Principles

1. **Every category requires corresponding actions.** A diagnostic in the 
   UI must map to at least one action that can improve it. Categories 
   without actions create anxiety without agency.

2. **Categories, inputs, and actions ship together.** Future releases 
   never add a category without its supporting inputs and at least two 
   actions that move it. This is why Asset Quality and Financial 
   Stability are deferred — they require new inputs *and* new actions, 
   and shipping any one piece alone violates principle #1.

3. **Deterministic and explainable.** Same inputs always produce same 
   outputs. Every score traces to a formula. No randomness, no hidden 
   weights, no unexplained adjustments.

4. **Behavioral over computational.** When forced to choose between 
   analytical depth and behavioral clarity, choose clarity. This is a 
   decision engine, not a calculator.

## 12. Definition of Done (V1)
- All 8 inputs accept numbers and update results on every change
- Verdict label changes color/style by sufficiency band
- All 3 categories display scores with appropriate band labels
- All 5 actions are simulated; top 3 shown ranked, others available 
  behind toggle
- Income action shows the "savings rate held constant" assumption
- Math verified against at least 2 manually computed test cases
- Deployed to Vercel with a public URL
