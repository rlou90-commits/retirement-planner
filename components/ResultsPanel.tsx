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
} from "@/lib/categoryExplanations";

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

function ActionCard({ action, rank }: { action: ActionResult; rank: number }) {
  const isIncome = action.name === "Increase income";
  const sign = action.impact >= 0 ? "+" : "";

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
          {rank}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{action.name}</p>
          <p className="mt-0.5 text-xs text-gray-500">{action.description}</p>
          <p className="mt-1.5 text-xs text-gray-600">
            If you {action.name.toLowerCase()}, your sufficiency ratio improves from{" "}
            <span className="font-medium">{action.originalRatio.toFixed(2)}</span>
            {" → "}
            <span className="font-medium">{action.newRatio.toFixed(2)}</span>{" "}
            <span className="font-semibold text-green-600">
              ({sign}{action.impact.toFixed(2)})
            </span>
          </p>
          {isIncome && (
            <p className="mt-1 text-xs italic text-gray-400">
              Assumes your savings rate stays the same
            </p>
          )}
        </div>
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
  const [showAll, setShowAll] = useState(false);

  if (!isValidState(state)) return <Placeholder />;

  const fv = computeFV(state);
  const required = computeRequiredCapital(state);
  const ratio = computeSufficiencyRatio(state);
  const verdict = getVerdict(ratio);
  const scores = computeCategoryScores(state);
  const actions = simulateActions(state);


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

      {/* Section 3: Category Cards */}
      <div className="space-y-3">
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
      </div>

      {/* Section 4: Actions — unchanged */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Recommended Actions
        </p>
        <div className="space-y-3">
          {actions.slice(0, showAll ? 5 : 3).map((action, i) => (
            <ActionCard key={action.name} action={action} rank={i + 1} />
          ))}
        </div>
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800"
        >
          {showAll ? "Show fewer" : "Show all 5 actions"}
        </button>
      </div>
    </div>
  );
}
