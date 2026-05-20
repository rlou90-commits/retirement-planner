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

type PartnerRaw = {
  currentAge: string;
  retirementAge: string;
};

type FieldErrors = Partial<Record<keyof RawFields, string>>;
type PartnerErrors = { currentAge?: string; retirementAge?: string };

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

function validatePartner(p: PartnerRaw): PartnerErrors {
  const errors: PartnerErrors = {};
  const age = parseFloat(p.currentAge);
  const retAge = parseFloat(p.retirementAge);

  if (p.currentAge !== "") {
    if (isNaN(age) || age <= 0 || !Number.isInteger(age)) {
      errors.currentAge = "Enter a whole number greater than 0";
    } else if (age > 100) {
      errors.currentAge = "Age must be ≤ 100";
    }
  }

  if (p.retirementAge !== "") {
    if (isNaN(retAge) || retAge <= 0 || !Number.isInteger(retAge)) {
      errors.retirementAge = "Enter a whole number greater than 0";
    } else if (retAge > 100) {
      errors.retirementAge = "Age must be ≤ 100";
    } else if (!isNaN(age) && retAge <= age) {
      errors.retirementAge = "Must be greater than partner's current age";
    }
  }

  return errors;
}

// ---- derive HouseholdState ------------------------------------------------

function buildState(
  raw: RawFields,
  hasPartner: boolean,
  rawPartner: PartnerRaw,
): HouseholdState {
  const base: HouseholdState = {
    currentAge: parseFloat(raw.currentAge) || 0,
    retirementAge: parseFloat(raw.retirementAge) || 0,
    annualIncome: parseDollar(raw.annualIncome),
    annualSavings: parseDollar(raw.annualSavings),
    currentAssets: parseDollar(raw.currentAssets),
    retirementSpending: parseDollar(raw.retirementSpending),
    socialSecurityIncome: parseDollar(raw.socialSecurityIncome),
    expectedReturn: (parseFloat(raw.expectedReturn) || 0) / 100,
  };

  if (hasPartner) {
    const partnerCurrentAge = parseFloat(rawPartner.currentAge);
    const partnerRetirementAge = parseFloat(rawPartner.retirementAge);
    if (
      partnerCurrentAge > 0 &&
      Number.isInteger(partnerCurrentAge) &&
      partnerRetirementAge > partnerCurrentAge &&
      Number.isInteger(partnerRetirementAge)
    ) {
      return { ...base, partner: { currentAge: partnerCurrentAge, retirementAge: partnerRetirementAge } };
    }
  }

  return base;
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

const PARTNER_DEFAULTS: PartnerRaw = {
  currentAge: "",
  retirementAge: "65",
};

export default function InputForm({
  onChange,
}: {
  onChange: (state: HouseholdState) => void;
}) {
  const [raw, setRaw] = useState<RawFields>(DEFAULTS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [hasPartner, setHasPartner] = useState(false);
  const [rawPartner, setRawPartner] = useState<PartnerRaw>(PARTNER_DEFAULTS);
  const [partnerErrors, setPartnerErrors] = useState<PartnerErrors>({});

  function handleChange(field: keyof RawFields, value: string) {
    const display = (DOLLAR_FIELDS as ReadonlyArray<string>).includes(field)
      ? formatDollar(value)
      : value;
    const newRaw = { ...raw, [field]: display };
    setRaw(newRaw);
    setErrors(validate(newRaw));
    onChange(buildState(newRaw, hasPartner, rawPartner));
  }

  function handlePartnerChange(field: keyof PartnerRaw, value: string) {
    const newRawPartner = { ...rawPartner, [field]: value };
    setRawPartner(newRawPartner);
    setPartnerErrors(validatePartner(newRawPartner));
    onChange(buildState(raw, true, newRawPartner));
  }

  function addPartner() {
    setHasPartner(true);
  }

  function removePartner() {
    setHasPartner(false);
    setRawPartner(PARTNER_DEFAULTS);
    setPartnerErrors({});
    onChange(buildState(raw, false, PARTNER_DEFAULTS));
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
            label="Your current age"
            value={raw.currentAge}
            error={errors.currentAge}
            placeholder="e.g. 40"
            onChange={(v) => handleChange("currentAge", v)}
          />
          <Field
            label="Your retire at"
            value={raw.retirementAge}
            error={errors.retirementAge}
            onChange={(v) => handleChange("retirementAge", v)}
          />

          {/* Partner section */}
          {!hasPartner ? (
            <button
              type="button"
              onClick={addPartner}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Add partner
            </button>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Partner
                </p>
                <button
                  type="button"
                  onClick={removePartner}
                  className="text-xs text-gray-400 hover:text-red-500"
                >
                  Remove
                </button>
              </div>
              <Field
                label="Partner's current age"
                value={rawPartner.currentAge}
                error={partnerErrors.currentAge}
                placeholder="e.g. 38"
                onChange={(v) => handlePartnerChange("currentAge", v)}
              />
              <Field
                label="Partner's retire at"
                value={rawPartner.retirementAge}
                error={partnerErrors.retirementAge}
                onChange={(v) => handlePartnerChange("retirementAge", v)}
              />
            </div>
          )}
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
