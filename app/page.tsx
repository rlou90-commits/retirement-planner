"use client";

import InputForm from "@/components/InputForm";
import type { HouseholdState } from "@/lib/calc";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Retirement Readiness
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Fill in your numbers to see your retirement outlook.
        </p>
        <InputForm
          onChange={(state: HouseholdState) => {
            console.log("HouseholdState:", state);
          }}
        />
      </div>
    </main>
  );
}
