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

type ColorStyles = { bg: string; text: string; border: string };

const HERO_COLOR: Record<VerdictColor, ColorStyles> = {
  "green":       { bg: "bg-green-50",   text: "text-green-700",   border: "border-green-200" },
  "light-green": { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  "amber":       { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  "red":         { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
};

const BADGE_COLOR: Record<VerdictColor, string> = {
  "green":       "bg-green-100 text-green-700",
  "light-green": "bg-emerald-100 text-emerald-700",
  "amber":       "bg-amber-100 text-amber-700",
  "red":         "bg-red-100 text-red-700",
};

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

  const heroStyle = HERO_COLOR[verdict.color];

  const categories: { name: string; score: number; note: string }[] = [
    { name: "Savings Strength",     score: scores.savingsStrength,     note: "Assets vs. age-appropriate benchmark" },
    { name: "Cash Flow Power",      score: scores.cashFlowPower,       note: "Annual savings rate" },
    { name: "Timeline Feasibility", score: scores.timelineFeasibility, note: "Closability of gap over remaining years" },
  ];

  return (
    <div className="space-y-4">
      {/* Section 1: Verdict, ratio, snapshot copy */}
      <div className={`rounded-xl border p-6 ${heroStyle.bg} ${heroStyle.border}`}>
        <p className={`text-2xl font-bold ${heroStyle.text}`}>{verdict.label}</p>
        <p className="mt-1 text-sm text-gray-500">
          Sufficiency ratio: {ratio.toFixed(2)}
        </p>
        <p className="mt-3 text-sm text-gray-600">{getSnapshotCopy(ratio)}</p>
      </div>

      {/* Section 2: Three-column numeric snapshot */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Projected at Retirement
            </p>
            <p className="text-lg font-semibold tabular-nums text-gray-900">
              {formatDollars(fv)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Required Capital
            </p>
            <p className="text-lg font-semibold tabular-nums text-gray-900">
              {formatDollars(required)}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
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

      {/* Section 3: Category Scores — unchanged */}
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Category Scores
        </p>
        <div className="space-y-2">
          {categories.map(({ name, score, note }) => (
            <div
              key={name}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{name}</p>
                <p className="text-xs text-gray-400">{note}</p>
              </div>
              <span
                className={`ml-3 flex-shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${BADGE_COLOR[scoreBand(score)]}`}
              >
                {Math.round(score)}
              </span>
            </div>
          ))}
        </div>
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
