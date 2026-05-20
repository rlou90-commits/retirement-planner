# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at http://localhost:3000 (hot reload)
npm run build    # production build
npm run lint     # ESLint via next lint
```

No test runner is configured yet.

## Architecture

This is a **Next.js 14 App Router** project (TypeScript, Tailwind CSS). The product being built is a deterministic retirement readiness calculator — full spec in [docs/PRD.md](docs/PRD.md), future roadmap in [docs/ROADMAP.md](docs/ROADMAP.md).

**Current state:** `app/page.tsx` is the default create-next-app placeholder. All product code is yet to be written.

**Planned structure (per PRD):** a single page with a two-column layout — input form on the left, live-computed results on the right. No server actions, no database, no API routes — all calculation logic runs client-side on every input change.

### Key conventions

- Path alias `@/*` maps to the project root (e.g. `@/lib/calc` → `./lib/calc.ts`)
- TypeScript strict mode is enabled
- Tailwind is configured for `app/**`, `components/**`, and `pages/**`; CSS custom properties `--background` and `--foreground` are defined in `globals.css` and exposed as Tailwind color tokens
- Fonts: Geist Sans and Geist Mono are loaded as local fonts in `app/layout.tsx` and exposed as CSS variables `--font-geist-sans` / `--font-geist-mono`

### Calculation logic (from PRD)

All math is deterministic and pure — no randomness, no hidden weights. Core formulas:

```
FV = currentAssets × (1+r)^n + annualSavings × ((1+r)^n − 1) / r
requiredCapital = (retirementSpending − socialSecurityIncome) × 25
sufficiencyRatio = FV / requiredCapital
```

Category scores (0–100): Savings Strength, Cash Flow Power, Timeline Feasibility. Actions are simulated by cloning state, applying a delta, and diffing the resulting sufficiency ratio. Keep this logic in a plain TypeScript module (e.g. `lib/calc.ts`) with no React dependencies so it can be tested and reasoned about independently.

## Current focus

Building V1 as specified in `docs/PRD.md`. **Do not implement features
from `docs/ROADMAP.md` unless explicitly asked.** If a request appears
to overlap with V1.5 or V2 scope (Asset Quality, Financial Stability,
PDF ingestion, weighted scoring, debt tracking, etc.), stop and flag
it before proceeding.

## Decision log

- **Monetary amounts:** stored as dollars (not cents) throughout.
  Rounded only at display.
- **Percentages:** stored as decimals internally (e.g., `0.07` for 7%).
  Converted to percent form only at the UI boundary.
- **Recommendation engine:** deterministic by design. Same inputs
  always produce the same five action impacts. No randomness, no
  time-based variation.
- **V1 categories:** descriptive only (each scored 0–100). Do **not**
  aggregate into a weighted overall score — that's V2 work and would
  violate the PRD's stated scope.
- **Calculation logic location:** all math lives in `lib/calc.ts` as
  pure functions with no React dependencies, so it can be unit-tested
  independently.
- **Feedback submission:** uses a Next.js API route that proxies to a
  Google Apps Script webhook stored in `FEEDBACK_WEBHOOK_URL` env
  variable. The Apps Script appends rows to a Google Sheet. URL is not
  in the public bundle — only accessible server-side.
- **V1.1 — Two-person households:** V1.1 adds optional partner inputs
  (age, retirement age). V1.1 two-person household math:

  - Accumulation period (n): max(userRetirementAge − userCurrentAge,
    partnerRetirementAge − partnerCurrentAge) = time until the
    later-retiring person retires. The household saves at the current
    rate for this entire period.

  - Distribution period: max(1, 90 − laterRetirementAge) = years from
    the last person's retirement until household plan ends at age 90.

  - Savings Strength benchmark: uses olderCurrentAge (max of both
    partners' current ages) for a conservative comparison.

  - Callout: always shows when a partner is present, explaining whose
    retirement timeline governs the calculation (the one with the longer
    remaining accumulation period) and reminding users of the
    constant-savings assumption.

  - Income drop when first partner retires is not modeled — users adjust
    "Annual Savings" if circumstances change.

## V1.5 notes (Sessions 1 + 2 complete)

- **Asset model:** `HouseholdState` now carries `assets: AssetClasses` and `returns: AssetReturns`
  instead of `currentAssets` / `expectedReturn`. Legacy fields kept optional for backward compat
  with V1 InputForm until Session 2 migrates the UI.

- **Blended return:** `blendedReturn(state)` = weighted average of per-class returns, weighted by
  allocation percentages. Falls back to `expectedReturn` when `assets` is absent.

- **Growth asset percentage:** stocks% + realEstate% + min(alternatives%, 20%). The 20% cap on
  alternatives prevents exotic allocations from inflating the growth score.

- **Asset Quality score:** `computeAssetQualityScore` returns a 0–100 score:
  - `growthAlignment` (weight 0.7): how close userGrowth is to `targetGrowth = clamp(45 + n, 40, 90)`.
    Asymmetric: over-aggressive penalised at 1.5× per point gap, under-aggressive at 2×.
  - `concentrationPenalty` (weight 0.3): penalises any single class above
    `threshold = clamp(80 + (n − 15), 70, 95)` at 5 points per percentage point over.

- **Allocation actions (V1.5 additions to simulateActions):**
  - `reduceCashDrag`: applicable when cash > 10%. Moves excess to stocks/RE proportionally.
  - `shiftBondsToGrowth`: applicable when bonds > 5%. Moves half bonds to stocks/RE.
  - `rebalanceToTargetGrowth`: always applicable. Sets stocks+RE to targetGrowth%, distributes
    remainder to bonds/cash proportionally. Alternatives unchanged.
  - `Diversify`: applicable when any single class > 80%. Reduces to 80%, distributes excess to
    other non-zero classes (alternatives capped at 20%).

- **Diversify impact calculation:** uses `(newAssetQualityScore − oldAssetQualityScore) / 100`
  instead of ratio delta, keeping it comparable in magnitude to ratio improvements (~0.01–0.30).
  All other actions use `newRatio − originalRatio`.

- **V1.5 UI:**
  - Asset Quality is the fourth category card, shown in a 2×2 grid on desktop.
  - Current Assets section is stocks-default with a dropdown to add bonds/cash/real estate/alternatives.
    Each added asset shows an inline expected return field; stocks return is hidden behind "Advanced" toggle.
  - "Show all actions" toggle in ResultsPanel exposes the full ranked list (5–9 actions depending on
    which allocation actions apply). Diversify action carries a tooltip explaining its impact reflects
    Asset Quality score, not sufficiency ratio.
  - Legacy `currentAssets` and `expectedReturn` fields removed from `HouseholdState`; all state flows
    through the new `assets`/`returns` object structure.

## Methodology lessons

**Multi-actor math:** When a calculation involves multiple people (or any multiple actors), name each
quantity's real-world meaning before composing the formula. Abstractions like "older age" and "later
retirement" can be combined in mathematically valid but semantically meaningless ways. Always trace:
what does this variable represent in the world?

Example: V1.1 originally used `n = laterRetirementAge − olderCurrentAge` for the household accumulation
period. Both terms looked reasonable, but they often belonged to different people, producing a number
with no real-world meaning. The correct formula is `n = max(userYears, partnerYears)` — the time until
the later-retiring person actually retires.

**Score-vs-ratio impact translation:** When introducing actions whose primary effect is on a category
score rather than the headline metric, translate the score improvement to a comparable magnitude
rather than excluding the action from rankings. V1.5's Diversify action uses `(newScore − oldScore) / 100`,
which lands score improvements in the same range as ratio improvements. The visual treatment is identical;
a tooltip flags the conceptual difference for users who want detail.

**Testing simplifications:** Test edge cases that intentionally break your simplifying assumptions,
not just average cases. A formula that gives "close-enough" answers for typical inputs can be
catastrophically wrong at the extremes.

Example: V1.1's flawed `n` formula gave nearly-correct answers when both partners were similar ages
(e.g., 45/48), but produced badly wrong results when partners had a significant age gap (e.g., 36/62).
Testing typical scenarios alone would have hidden the bug; testing the edge case exposed it immediately.

## Scope guardrails

- If a task would require new inputs not listed in `docs/PRD.md`
  Section 6, stop and flag it before proceeding.
- The V1 design principle "every category requires corresponding
  actions" is non-negotiable. Do not add a category without at least
  two actions in the library that can improve it.
- If asked to "improve the UI," prefer clarity over visual complexity.
  This is a decision tool, not a marketing page.
