# Retirement Readiness System — Roadmap (Future State)

## 1. PRODUCT REQUIREMENTS DOCUMENT (PRD)

### 1.1 Product Summary

A deterministic retirement readiness system that evaluates household financial health and produces:

- a retirement readiness score (0–100%)
- a ranked list of highest-impact financial actions
- scenario-based projections

The system prioritizes clarity, behavioral guidance, and actionable financial improvements over raw calculation complexity.

### 1.2 Core Problem

Users do not understand:

- how close they are to retirement readiness
- what actions actually change their trajectory
- which financial levers matter most

### 1.3 Target Users

**Primary:**

- Dual-income households (30s–40s)
- High complexity financial lives
- Multiple asset classes
- Unclear retirement trajectory

**Secondary:**

- High earners with uneven savings behavior
- Late starters needing catch-up strategy
- Real estate-heavy households

### 1.4 Product Goals
- Provide a single retirement readiness score
- Translate financial state into top 3–5 actionable steps
- Model household-level retirement outcomes
- Enable scenario exploration

### 1.5 Non-Goals
- Tax optimization advice
- Monte Carlo simulation (Future State)
- Investment advisory recommendations
- Brokerage integrations

---

## 2. SYSTEM ARCHITECTURE

### 2.1 System Layers
1. Input Layer (manual + PDF ingestion)
2. Financial State Normalization
3. Projection Engine
4. Scoring Engine
5. Recommendation Engine

### 2.2 Data Flow

```
Input → Normalize → Derived State → Projection → Score → Recommendations → UI
```

---

## 3. INPUT SPECIFICATION

### 3.1 Required Inputs

**Household**
- Type: individual or couple
- Age(s)
- Income

**Annual income per person**

**Assets**
- Retirement accounts
- Brokerage accounts
- Cash savings
- Real estate (value + mortgage)
- Equity compensation

**Debt**
- Non-mortgage debt

**Goals**
- Retirement age(s)
- Annual retirement spending target

**Assumptions**
- Expected portfolio return (%)

### 3.2 Optional Inputs
- Short-term expenses (1–3 years)
- Income growth assumptions (excluded from Future State scoring)
- Inheritance (excluded)
- Legacy goals (excluded)

---

## 4. SOCIAL SECURITY MODULE

### 4.1 Inputs
SSA statement upload OR user estimate OR system estimate

### 4.2 Role
- Baseline retirement income
- Reduces required capital

### 4.3 Formula

```
Required Capital = (Retirement Spending - Social Security Income) × 25
```

### 4.4 Constraint

Social Security is NOT a behavioral lever.

---

## 5. PROJECTION ENGINE

**Core Formula**

```
FV = PV(1+r)^n + PMT((1+r)^n - 1)/r
```

**Required Capital**

```
Required Capital = Retirement Spending × 25
```

**Outputs**
- Projected assets at retirement
- Retirement gap
- Sufficiency ratio
- Trajectory curve

---

## 6. SCORING ENGINE

### 6.1 Score Scale

0–100 readiness score

### 6.2 Interpretation
- 90–100: optimal
- 80–89: strong
- 70–79: on track
- 60–69: needs attention
- <60: structural gap

### 6.3 Category Weights
- Savings Strength: 28%
- Cash Flow Power: 28%
- Timeline Feasibility: 18%
- Asset Quality: 14%
- Financial Stability: 12%

### 6.4 Hidden Layer

**Trajectory Stability Sensitivity Index:**
- Internal-only modifier
- Adjusts score sensitivity
- Prevents fragile overconfidence

---

## 7. UX FLOW

**Entry**
- Landing page → Start Assessment

**Input Choice**
- Upload PDF (primary)
- Manual input (secondary)

**PDF Flow**
1. Upload
2. Extract
3. Confirm detected values
4. Fill missing inputs

**Manual Flow**
1. Household setup
2. Income
3. Assets
4. Debt
5. Goals

**Results Dashboard**
- Section 1: Score — readiness %, label
- Section 2: Snapshot — projected assets, required capital, retirement age, gap/surplus
- Section 3: Top Actions (max 5)
- Section 4: Scenario Explorer
- Section 5: Household Breakdown

---

## 8. RECOMMENDATION ENGINE

### 8.1 Core Function

Deterministic simulation system that evaluates financial actions and ranks them by impact.

### 8.2 Ranking Formula

```
R = (Impact / Effort) × Stability Adjustment
```

### 8.3 Output

Top 3–5 actions only

### 8.4 Constraints
- Deterministic outputs
- Explainable outputs
- No randomness
- Bounded action set

---

## 9. ACTION LIBRARY

**CATEGORY A — CONTRIBUTION LEVERS**
- Increase savings rate
- Increase retirement contributions
- Maximize employer match

**CATEGORY B — INCOME LEVERS**
- Increase household income
- Add side income

**CATEGORY C — TIMELINE LEVERS**
- Delay retirement
- Align retirement ages

**CATEGORY D — SPENDING LEVERS**
- Reduce retirement spending target

**CATEGORY E — ASSET STRUCTURE**
- Increase equity exposure
- Reduce cash drag
- Diversify assets

**CATEGORY F — DEBT & STABILITY**
- Pay down high-interest debt
- Reduce debt-to-income ratio
- Increase emergency fund buffer

---

## 10. ACTION SIMULATION MODEL

For each action:

```
1. Clone state
2. Apply delta
3. Recompute projection
4. Compute score delta

Impact = S1 - S0
```

---

## 11. SYSTEM GUARANTEES
- Deterministic outputs
- Explainable scoring
- Bounded action space
- No randomness
- Full traceability

---

## 12. STRESS TEST DATASET

**Case Types**
1. High income / low savings illusion
2. Low income / disciplined saver
3. Real estate heavy / illiquid wealth
4. Late starter / timeline constrained
5. Early FI high saver
6. Couple misaligned retirement ages
7. High net worth / low liquidity
8. Low asset / high Social Security reliance
9. High savings / high debt conflict
10. Incomplete PDF data

**Validation Rules**
- Savings behavior > income
- Timeline > portfolio optimization
- Liquidity > net worth
- Social Security properly weighted
- No generic advice outputs
- Top 5 actions always ranked by impact/effort

---

## 13. GOLDEN OUTPUT REQUIREMENTS

System is valid only if:

- No score inflation bias
- No generic recommendation fallback
- No asset overvaluation bias
- Timeline dominance is respected when relevant
- Recommendation set is always ≤ 5 actions

---

## 14. KEY PRODUCT TRUTH

The product is not a calculator.

It is:

> A deterministic financial decision engine that identifies the highest-leverage actions a household can take to improve retirement outcomes.
