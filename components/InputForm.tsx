"use client";

import { useState } from "react";
import type { HouseholdState } from "@/lib/calc";

// ---- types ----------------------------------------------------------------

type RawFields = {
  currentAge: string;
  retirementAge: string;
  annualIncome: string;
  annualSavings: string;
  currentAssets: string;
  retirementSpending: string;
  socialSecurityIncome: string;
  expectedReturn: string; // percentage string, e.g. "7" → stored as 0.07
};

type FieldErrors = Partial<Record<keyof RawFields, string>>;

// ---- helpers --------------------------------------------------------------

const DOLLAR_FIELDS = [
  "annualIncome",
  "annualSavings",
  "currentAssets",
  "retirementSpending",
  "socialSecurityIncome",
] as const satisfies ReadonlyArray<keyof RawFields>;

function formatDollar(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("en-US");
}

function parseDollar(s: string): number {
  const n = parseFloat(s.replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

// ---- validation -----------------------------------------------------------

function validate(raw: RawFields): FieldErrors {
  const errors: FieldErrors = {};
  const currentAge = parseFloat(raw.currentAge);
  const retirementAge = parseFloat(raw.retirementAge);
  const returnPct = parseFloat(raw.expectedReturn);

  if (raw.currentAge !== "") {
    if (isNaN(currentAge) || currentAge <= 0 || !Number.isInteger(currentAge)) {
      errors.currentAge = "Enter a whole number greater than 0";
    } else if (currentAge > 100) {
      errors.currentAge = "Age must be ≤ 100";
    }
  }

  if (raw.retirementAge !== "") {
    if (isNaN(retirementAge) || retirementAge <= 0 || !Number.isInteger(retirementAge)) {
      errors.retirementAge = "Enter a whole number greater than 0";
    } else if (retirementAge > 100) {
      errors.retirementAge = "Age must be ≤ 100";
    } else if (!isNaN(currentAge) && retirementAge <= currentAge) {
      errors.retirementAge = "Must be greater than current age";
    }
  }

  for (const field of DOLLAR_FIELDS) {
    const val = parseDollar(raw[field]);
    if (val > 100_000_000) {
      errors[field] = "Must be ≤ $100,000,000";
    }
  }

  if (raw.expectedReturn !== "") {
    if (isNaN(returnPct) || returnPct < 0) {
      errors.expectedReturn = "Must be a non-negative number";
    } else if (returnPct > 100) {
      errors.expectedReturn = "Must be ≤ 100";
    }
  }

  return errors;
}

// ---- derive HouseholdState ------------------------------------------------

function deriveState(raw: RawFields): HouseholdState {
  return {
    currentAge: parseFloat(raw.currentAge) || 0,
    retirementAge: parseFloat(raw.retirementAge) || 0,
    annualIncome: parseDollar(raw.annualIncome),
    annualSavings: parseDollar(raw.annualSavings),
    currentAssets: parseDollar(raw.currentAssets),
    retirementSpending: parseDollar(raw.retirementSpending),
    socialSecurityIncome: parseDollar(raw.socialSecurityIncome),
    expectedReturn: (parseFloat(raw.expectedReturn) || 0) / 100,
  };
}

// ---- Field sub-component --------------------------------------------------

type FieldProps = {
  label: string;
  value: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  onChange: (v: string) => void;
};

function Field({
  label,
  value,
  error,
  hint,
  placeholder,
  prefix,
  suffix,
  inputMode = "numeric",
  onChange,
}: FieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-gray-400 text-sm pointer-events-none select-none">
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={[
            "w-full rounded-md border py-2 text-sm text-gray-900",
            "placeholder:text-gray-300 transition-colors",
            "focus:outline-none focus:ring-2 focus:border-transparent",
            prefix ? "pl-7" : "pl-3",
            suffix ? "pr-8" : "pr-3",
            error
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-300 focus:ring-blue-500",
          ].join(" ")}
        />
        {suffix && (
          <span className="absolute right-3 text-gray-400 text-sm pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

// ---- defaults & main component --------------------------------------------

const DEFAULTS: RawFields = {
  currentAge: "",
  retirementAge: "65",
  annualIncome: "",
  annualSavings: "",
  currentAssets: "",
  retirementSpending: "",
  socialSecurityIncome: "0",
  expectedReturn: "7",
};

export default function InputForm({
  onChange,
}: {
  onChange: (state: HouseholdState) => void;
}) {
  const [raw, setRaw] = useState<RawFields>(DEFAULTS);
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleChange(field: keyof RawFields, value: string) {
    const display = (DOLLAR_FIELDS as ReadonlyArray<string>).includes(field)
      ? formatDollar(value)
      : value;
    const newRaw = { ...raw, [field]: display };
    setRaw(newRaw);
    const newErrors = validate(newRaw);
    setErrors(newErrors);
    onChange(deriveState(newRaw));
  }

  return (
    <div className="space-y-6">
      {/* Group 1: You & Timeline */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          You &amp; Timeline
        </h2>
        <div className="space-y-4">
          <Field
            label="Current age"
            value={raw.currentAge}
            error={errors.currentAge}
            placeholder="e.g. 40"
            onChange={(v) => handleChange("currentAge", v)}
          />
          <Field
            label="Target retirement age"
            value={raw.retirementAge}
            error={errors.retirementAge}
            onChange={(v) => handleChange("retirementAge", v)}
          />
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Group 2: Income & Savings */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Income &amp; Savings
        </h2>
        <div className="space-y-4">
          <Field
            label="Annual household income"
            value={raw.annualIncome}
            error={errors.annualIncome}
            placeholder="e.g. 120,000"
            prefix="$"
            onChange={(v) => handleChange("annualIncome", v)}
          />
          <Field
            label="Annual savings"
            value={raw.annualSavings}
            error={errors.annualSavings}
            placeholder="e.g. 24,000"
            prefix="$"
            onChange={(v) => handleChange("annualSavings", v)}
          />
          <Field
            label="Current total invested assets"
            value={raw.currentAssets}
            error={errors.currentAssets}
            placeholder="e.g. 200,000"
            prefix="$"
            onChange={(v) => handleChange("currentAssets", v)}
          />
        </div>
      </section>

      <hr className="border-gray-100" />

      {/* Group 3: Retirement Target */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Retirement Target
        </h2>
        <div className="space-y-4">
          <Field
            label="Target annual retirement spending"
            value={raw.retirementSpending}
            error={errors.retirementSpending}
            placeholder="e.g. 80,000"
            prefix="$"
            onChange={(v) => handleChange("retirementSpending", v)}
          />
          <Field
            label="Social Security estimate (annual)"
            value={raw.socialSecurityIncome}
            error={errors.socialSecurityIncome}
            hint="Optional — enter 0 if unknown"
            prefix="$"
            onChange={(v) => handleChange("socialSecurityIncome", v)}
          />
          <Field
            label="Expected annual return"
            value={raw.expectedReturn}
            error={errors.expectedReturn}
            hint="Defaults to 7% (long-run market average)"
            suffix="%"
            inputMode="decimal"
            onChange={(v) => handleChange("expectedReturn", v)}
          />
        </div>
      </section>
    </div>
  );
}
