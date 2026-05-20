"use client";

import { useState } from "react";
import {
  computeFV,
  computeRequiredCapital,
  computeSufficiencyRatio,
  getVerdict,
  computeCategoryScores,
  simulateActions,
} from "@/lib/calc";
import type { HouseholdState, VerdictColor, ActionResult } from "@/lib/calc";
import {
  getSavingsStrengthExplanation,
  getCashFlowPowerExplanation,
  getTimelineFeasibilityExplanation,
  getAssetQualityExplanation,
} from "@/lib/categoryExplanations";
import { getActionDescription } from "@/lib/actionDescriptions";

// ---- guards & helpers ------------------------------------------------------

function isValidState(s: HouseholdState): boolean {
  return (
    s.currentAge > 0 &&
    s.retirementAge > s.currentAge &&
    s.annualIncome > 0 &&
    s.retirementSpending > 0 &&
    s.retirementSpending > s.socialSecurityIncome
  );
}

function formatDollars(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function scoreBand(score: number): VerdictColor {
  if (score >= 80) return "green";
  if (score >= 60) return "light-green";
  if (score >= 40) return "amber";
  return "red";
}

function getSnapshotCopy(ratio: number): string {
  if (ratio < 0.80) {
    return "This is a meaningful gap, but it's also where the levers below have the most leverage. Households in this zone usually move significantly with one or two changes.";
  }
  if (ratio < 1.00) {
    return "You're close to where you need to be. A modest adjustment to one or two inputs above is typically enough to close this kind of gap.";
  }
  if (ratio < 1.20) {
    return "You're positioned well for your goal. The actions below show where you could build cushion if you want more margin.";
  }
  return "You're in a strong position. Your trajectory comfortably exceeds what your retirement target requires — the actions below are about optimization, not necessity.";
}

// ---- color maps ------------------------------------------------------------

const LEFT_ACCENT: Record<VerdictColor, string> = {
  "green":       "bg-green-500",
  "light-green": "bg-emerald-500",
  "amber":       "bg-amber-500",
  "red":         "bg-red-500",
};

const BADGE_COLOR: Record<VerdictColor, string> = {
  "green":       "bg-green-100 text-green-700",
  "light-green": "bg-emerald-100 text-emerald-700",
  "amber":       "bg-amber-100 text-amber-700",
  "red":         "bg-red-100 text-red-700",
};

const BAR_COLOR: Record<VerdictColor, string> = {
  "green":       "bg-green-500",
  "light-green": "bg-emerald-500",
  "amber":       "bg-amber-400",
  "red":         "bg-red-400",
};

// ---- CategoryCard ----------------------------------------------------------

function CategoryCard({
  name,
  score,
  tooltip,
  explanation,
}: {
  name: string;
  score: number;
  tooltip: string;
  explanation: string;
}) {
  const band = scoreBand(score);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        {/* Info icon with hover tooltip */}
        <div className="group relative">
          <span className="flex h-4 w-4 cursor-default items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-400 hover:border-gray-400 hover:text-gray-500">
            i
          </span>
          <div className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 hidden w-56 rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:block">
            {tooltip}
          </div>
        </div>
      </div>

      {/* Large score */}
      <p className="mt-2 text-4xl font-bold tabular-nums text-gray-900">
        {Math.round(score)}
      </p>

      {/* Progress bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${BAR_COLOR[band]}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>

      {/* Explanatory sentence */}
      <p className="mt-3 text-xs text-gray-500">{explanation}</p>
    </div>
  );
}

// ---- ActionCard ------------------------------------------------------------

// position="right" anchors the tooltip to the left edge of the icon (opens leftward),
// preventing horizontal overflow on right-side elements.
function InfoTooltip({
  text,
  wide = false,
  position = "right",
}: {
  text: string;
  wide?: boolean;
  position?: "left" | "right";
}) {
  const anchor = position === "right" ? "right-0" : "left-0";
  return (
    <div className="group relative flex-shrink-0">
      <span className="flex h-4 w-4 cursor-default items-center justify-center rounded-full border border-gray-300 text-[10px] text-gray-400 hover:border-gray-400 hover:text-gray-500">
        i
      </span>
      <div
        className={`pointer-events-none absolute bottom-full ${anchor} z-10 mb-2 hidden rounded-lg bg-gray-900 px-3 py-2 text-xs leading-relaxed text-white shadow-lg group-hover:block ${
          wide ? "w-72" : "w-64"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function ActionCard({
  action,
  state,
}: {
  action: ActionResult;
  state: HouseholdState;
}) {
  const { verbPhrase, magnitude, description } = getActionDescription(action.name, state);
  const isIncome = action.name === "Increase income";
  const isDiversify = action.name === "Diversify";
  const roundedImpact = Math.round(action.impact * 100) / 100;
  const sign = roundedImpact >= 0 ? "+" : "−"; // Unicode minus U+2212
  const impactDisplay = `${sign}${Math.abs(roundedImpact).toFixed(2)}`;
  const impactColor = roundedImpact >= 0 ? "text-emerald-600" : "text-red-500";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      {/* Top row: headline (left) + impact (right) */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className="text-sm text-gray-700">
            If you{" "}
            <strong className="font-semibold text-gray-900">{verbPhrase}</strong>{" "}
            <span className="text-gray-500">{magnitude}</span>
          </span>
          {isIncome && (
            <InfoTooltip
              text="Assumes your savings rate stays constant — i.e., you save the same percentage of your new, higher income."
              position="right"
            />
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          <p className={`text-2xl font-semibold tabular-nums ${impactColor}`}>
            {impactDisplay}
          </p>
          {isDiversify && (
            <InfoTooltip
              text="This impact reflects an Asset Quality score improvement, not a sufficiency ratio change."
              wide
              position="right"
            />
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}

// ---- AssumptionCallout -----------------------------------------------------

function AssumptionCallout({
  personTimelinePhrase,
  yearsToRetirement,
  laterAge,
  onDismiss,
}: {
  personTimelinePhrase: string;
  yearsToRetirement: number;
  laterAge: number;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900">
            Your retirement readiness is calculated based on {personTimelinePhrase} retirement timeline ({yearsToRetirement} years from now).
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Savings and spending are assumed constant until age {laterAge}. If household
            circumstances change, adjust &ldquo;Annual Savings&rdquo; above to reflect the new rate.
          </p>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 rounded p-0.5 text-amber-500 hover:bg-amber-100 hover:text-amber-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---- Placeholder -----------------------------------------------------------

function Placeholder() {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-8 py-16">
      <p className="text-center text-sm text-gray-400">
        Fill in your inputs to see your results.
      </p>
    </div>
  );
}

// ---- main component --------------------------------------------------------

export default function ResultsPanel({ state }: { state: HouseholdState }) {
  const [calloutDismissed, setCalloutDismissed] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);

  if (!isValidState(state)) return <Placeholder />;

  const fv = computeFV(state);
  const required = computeRequiredCapital(state);
  const ratio = computeSufficiencyRatio(state);
  const verdict = getVerdict(ratio);
  const scores = computeCategoryScores(state);
  const actions = simulateActions(state);

  // Callout shows whenever a partner is present.
  const showCallout = !calloutDismissed && !!state.partner;
  const laterRetAge = state.partner
    ? Math.max(state.retirementAge, state.partner.retirementAge)
    : state.retirementAge;

  // The longer remaining timeline governs n — whichever person retires later.
  const userYears = state.retirementAge - state.currentAge;
  const partnerYears = state.partner
    ? state.partner.retirementAge - state.partner.currentAge
    : userYears;
  const userHasLongerTimeline = userYears >= partnerYears;
  const personTimelinePhrase = userHasLongerTimeline ? "your" : "your partner's";
  const yearsToRetirement = userHasLongerTimeline ? userYears : partnerYears;

  return (
    <div className="space-y-4">
      {/* Sections 1 + 2: merged card with colored left accent */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex">
          {/* Colored left accent bar */}
          <div className={`w-1 flex-shrink-0 ${LEFT_ACCENT[verdict.color]}`} />

          <div className="flex-1">
            {/* Top zone: verdict + ratio + copy */}
            <div className="px-5 pb-4 pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Sufficiency Ratio
              </p>
              <div className="flex items-center justify-between gap-3">
                <p className="text-4xl font-bold tabular-nums text-gray-900">
                  {ratio.toFixed(2)}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${BADGE_COLOR[verdict.color]}`}
                >
                  {verdict.label}
                </span>
              </div>
              <p className="mt-3 text-sm text-gray-600">{getSnapshotCopy(ratio)}</p>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100" />

            {/* Bottom zone: three-column numeric snapshot */}
            <div className="grid grid-cols-3 gap-4 px-5 py-4">
              <div>
                <p className="mb-1 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Projected
                </p>
                <p className="text-lg font-semibold tabular-nums text-gray-900">
                  {formatDollars(fv)}
                </p>
              </div>
              <div>
                <p className="mb-1 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Required
                </p>
                <p className="text-lg font-semibold tabular-nums text-gray-900">
                  {formatDollars(required)}
                </p>
              </div>
              <div>
                <p className="mb-1 whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {fv >= required ? "Surplus" : "Gap"}
                </p>
                <p
                  className={`text-lg font-semibold tabular-nums ${
                    fv >= required ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatDollars(Math.abs(fv - required))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assumption callout — shown whenever a partner is present */}
      {showCallout && (
        <AssumptionCallout
          personTimelinePhrase={personTimelinePhrase}
          yearsToRetirement={yearsToRetirement}
          laterAge={laterRetAge}
          onDismiss={() => setCalloutDismissed(true)}
        />
      )}

      {/* Section 3: Category Cards — 2×2 grid on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CategoryCard
          name="Savings Strength"
          score={scores.savingsStrength}
          tooltip="How your current savings compare to typical benchmarks for your age."
          explanation={getSavingsStrengthExplanation(state)}
        />
        <CategoryCard
          name="Cash Flow Power"
          score={scores.cashFlowPower}
          tooltip="What percentage of your income you're saving each year."
          explanation={getCashFlowPowerExplanation(state)}
        />
        <CategoryCard
          name="Timeline Feasibility"
          score={scores.timelineFeasibility}
          tooltip="Whether your retirement timeline gives your savings enough room to close the gap."
          explanation={getTimelineFeasibilityExplanation(state)}
        />
        <CategoryCard
          name="Asset Quality"
          score={scores.assetQuality}
          tooltip={getAssetQualityExplanation(state).tooltip}
          explanation={getAssetQualityExplanation(state).sentence}
        />
      </div>

      {/* Section 4: Action Cards */}
      <div className="space-y-3">
        {actions.slice(0, showAllActions ? actions.length : 3).map((action) => (
          <ActionCard key={action.name} action={action} state={state} />
        ))}
      </div>
      {actions.length > 3 && (
        <button
          onClick={() => setShowAllActions((v) => !v)}
          className="text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800"
        >
          {showAllActions ? "Show top 3" : `Show all ${actions.length} actions`}
        </button>
      )}
    </div>
  );
}
