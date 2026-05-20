"use client";

import { useState } from "react";
import InputForm from "@/components/InputForm";
import ResultsPanel from "@/components/ResultsPanel";
import type { HouseholdState } from "@/lib/calc";

const INITIAL_STATE: HouseholdState = {
  currentAge: 0,
  retirementAge: 65,
  annualIncome: 0,
  annualSavings: 0,
  assets: { stocks: 0, bonds: 0, cash: 0, realEstate: 0, alternatives: 0 },
  returns: { stocks: 0.07, bonds: 0.04, cash: 0.015, realEstate: 0.04, alternatives: 0 },
  retirementSpending: 0,
  socialSecurityIncome: 0,
};

export default function Home() {
  const [state, setState] = useState<HouseholdState>(INITIAL_STATE);

  return (
    <main className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">
          Retirement Readiness
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Fill in your numbers to see your retirement outlook.
        </p>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <InputForm onChange={setState} />
          </div>

          <div className="lg:sticky lg:top-8">
            <ResultsPanel state={state} />
          </div>
        </div>
      </div>
    </main>
  );
}
