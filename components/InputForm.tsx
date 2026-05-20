"use client";

import { useState } from "react";
import type { HouseholdState, AssetClasses, AssetReturns } from "@/lib/calc";

// ---- types ----------------------------------------------------------------

type RawFields = {
  currentAge: string;
  retirementAge: string;
  annualIncome: string;
  annualSavings: string;
  retirementSpending: string;
  socialSecurityIncome: string;
};

type PartnerRaw = {
  currentAge: string;
  retirementAge: string;
};

type FieldErrors = Partial<Record<keyof RawFields, string>>;
type PartnerErrors = { currentAge?: string; retirementAge?: string };

type AssetKey = keyof AssetClasses;

// ---- asset constants -------------------------------------------------------

const OPTIONAL_ASSET_KEYS: AssetKey[] = ["bonds", "cash", "realEstate", "alternatives"];

const ASSET_LABELS: Record<AssetKey, string> = {
  stocks: "Stocks",
  bonds: "Bonds",
  cash: "Cash",
  realEstate: "Real Estate (equity only)",
  alternatives: "Alternatives",
};

const ASSET_HINTS: Partial<Record<AssetKey, string>> = {
  realEstate:
    "Home value minus outstanding mortgage. Example: $800k home − $600k mortgage = $200k equity.",
};

const DEFAULT_RETURN_PCT: Record<AssetKey, string> = {
  stocks: "7",
  bonds: "4",
  cash: "1.5",
  realEstate: "4",
  alternatives: "0",
};

// ---- helpers --------------------------------------------------------------

const DOLLAR_FIELDS = [
  "annualIncome",
  "annualSavings",
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

function parseReturnPct(s: string, fallback: number): number {
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n / 100;
}

// ---- validation -----------------------------------------------------------

function validate(raw: RawFields): FieldErrors {
  const errors: FieldErrors = {};
  const currentAge = parseFloat(raw.currentAge);
  const retirementAge = parseFloat(raw.retirementAge);

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

type ActiveAssets = Record<AssetKey, boolean>;

// ---- state builder --------------------------------------------------------

function buildHouseholdState(
  raw: RawFields,
  hasPartner: boolean,
  rawPartner: PartnerRaw,
  assetAmounts: Record<AssetKey, string>,
  assetReturns: Record<AssetKey, string>,
  activeAssets: ActiveAssets,
): HouseholdState {
  const assets: AssetClasses = {
    stocks: parseDollar(assetAmounts.stocks),
    bonds: activeAssets.bonds ? parseDollar(assetAmounts.bonds) : 0,
    cash: activeAssets.cash ? parseDollar(assetAmounts.cash) : 0,
    realEstate: activeAssets.realEstate ? parseDollar(assetAmounts.realEstate) : 0,
    alternatives: activeAssets.alternatives ? parseDollar(assetAmounts.alternatives) : 0,
  };

  const returns: AssetReturns = {
    stocks: parseReturnPct(assetReturns.stocks, 0.07),
    bonds: parseReturnPct(assetReturns.bonds, 0.04),
    cash: parseReturnPct(assetReturns.cash, 0.015),
    realEstate: parseReturnPct(assetReturns.realEstate, 0.04),
    alternatives: parseReturnPct(assetReturns.alternatives, 0),
  };

  const base: HouseholdState = {
    currentAge: parseFloat(raw.currentAge) || 0,
    retirementAge: parseFloat(raw.retirementAge) || 0,
    annualIncome: parseDollar(raw.annualIncome),
    annualSavings: parseDollar(raw.annualSavings),
    assets,
    returns,
    retirementSpending: parseDollar(raw.retirementSpending),
    socialSecurityIncome: parseDollar(raw.socialSecurityIncome),
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

// ---- sub-components -------------------------------------------------------

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

function AssetRow({
  label,
  amount,
  returnValue,
  showReturn,
  canRemove,
  amountError,
  hint,
  onAmountChange,
  onReturnChange,
  onRemove,
}: {
  label: string;
  amount: string;
  returnValue: string;
  showReturn: boolean;
  canRemove: boolean;
  amountError?: string;
  hint?: string;
  onAmountChange: (v: string) => void;
  onReturnChange: (v: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {canRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            Remove
          </button>
        )}
      </div>
      <div className="relative flex items-center">
        <span className="absolute left-3 text-gray-400 text-sm pointer-events-none select-none">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className={[
            "w-full rounded-md border py-2 pl-7 pr-3 text-sm text-gray-900",
            "placeholder:text-gray-300 transition-colors",
            "focus:outline-none focus:ring-2 focus:border-transparent",
            amountError
              ? "border-red-400 focus:ring-red-300"
              : "border-gray-300 focus:ring-blue-500",
          ].join(" ")}
        />
      </div>
      {amountError && <p className="text-xs text-red-500">{amountError}</p>}
      {!amountError && hint && <p className="text-xs text-gray-500">{hint}</p>}
      {showReturn && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 flex-1">Expected return</span>
          <div className="relative w-20">
            <input
              type="text"
              inputMode="decimal"
              value={returnValue}
              onChange={(e) => onReturnChange(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-1.5 pl-2 pr-5 text-xs text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none select-none">
              %
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- defaults -------------------------------------------------------------

const DEFAULTS: RawFields = {
  currentAge: "",
  retirementAge: "65",
  annualIncome: "",
  annualSavings: "",
  retirementSpending: "",
  socialSecurityIncome: "0",
};

const PARTNER_DEFAULTS: PartnerRaw = {
  currentAge: "",
  retirementAge: "65",
};

const INITIAL_ASSET_AMOUNTS: Record<AssetKey, string> = {
  stocks: "",
  bonds: "0",
  cash: "0",
  realEstate: "0",
  alternatives: "0",
};

// ---- main component -------------------------------------------------------

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

  // Asset state
  const [assetAmounts, setAssetAmounts] = useState<Record<AssetKey, string>>(INITIAL_ASSET_AMOUNTS);
  const [assetReturns, setAssetReturns] = useState<Record<AssetKey, string>>(DEFAULT_RETURN_PCT);
  const [activeAssets, setActiveAssets] = useState<ActiveAssets>({
    stocks: true, bonds: false, cash: false, realEstate: false, alternatives: false,
  });
  const [showDropdown, setShowDropdown] = useState(false);

  const remainingAssets = OPTIONAL_ASSET_KEYS.filter((k) => !activeAssets[k]);

  const totalAssetsValue =
    parseDollar(assetAmounts.stocks) +
    (activeAssets.bonds ? parseDollar(assetAmounts.bonds) : 0) +
    (activeAssets.cash ? parseDollar(assetAmounts.cash) : 0) +
    (activeAssets.realEstate ? parseDollar(assetAmounts.realEstate) : 0) +
    (activeAssets.alternatives ? parseDollar(assetAmounts.alternatives) : 0);

  const totalDisplay = totalAssetsValue.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  // ---- handlers -----------------------------------------------------------

  function emit(
    newRaw = raw,
    newHasPartner = hasPartner,
    newPartner = rawPartner,
    newAmounts = assetAmounts,
    newReturns = assetReturns,
    newActive = activeAssets,
  ) {
    onChange(buildHouseholdState(newRaw, newHasPartner, newPartner, newAmounts, newReturns, newActive));
  }

  function handleChange(field: keyof RawFields, value: string) {
    const display = (DOLLAR_FIELDS as ReadonlyArray<string>).includes(field)
      ? formatDollar(value)
      : value;
    const newRaw = { ...raw, [field]: display };
    setRaw(newRaw);
    setErrors(validate(newRaw));
    emit(newRaw);
  }

  function handlePartnerChange(field: keyof PartnerRaw, value: string) {
    const newRawPartner = { ...rawPartner, [field]: value };
    setRawPartner(newRawPartner);
    setPartnerErrors(validatePartner(newRawPartner));
    emit(raw, true, newRawPartner);
  }

  function addPartner() {
    setHasPartner(true);
  }

  function removePartner() {
    setHasPartner(false);
    setRawPartner(PARTNER_DEFAULTS);
    setPartnerErrors({});
    emit(raw, false, PARTNER_DEFAULTS);
  }

  function handleAssetAmount(key: AssetKey, value: string) {
    const formatted = formatDollar(value);
    const newAmounts = { ...assetAmounts, [key]: formatted };
    setAssetAmounts(newAmounts);
    emit(raw, hasPartner, rawPartner, newAmounts);
  }

  function handleAssetReturn(key: AssetKey, value: string) {
    const newReturns = { ...assetReturns, [key]: value };
    setAssetReturns(newReturns);
    emit(raw, hasPartner, rawPartner, assetAmounts, newReturns);
  }

  function addAsset(key: AssetKey) {
    const newActive = { ...activeAssets, [key]: true };
    setActiveAssets(newActive);
    setShowDropdown(false);
    emit(raw, hasPartner, rawPartner, assetAmounts, assetReturns, newActive);
  }

  function removeAsset(key: AssetKey) {
    const newActive = { ...activeAssets, [key]: false };
    const newAmounts = { ...assetAmounts, [key]: "0" };
    setActiveAssets(newActive);
    setAssetAmounts(newAmounts);
    emit(raw, hasPartner, rawPartner, newAmounts, assetReturns, newActive);
  }

  // ---- render -------------------------------------------------------------

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

          {/* Current Assets subsection */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Current Assets
            </p>
            <div className="space-y-4">
              {/* Stocks — always visible, return always shown */}
              <AssetRow
                label={ASSET_LABELS.stocks}
                amount={assetAmounts.stocks}
                returnValue={assetReturns.stocks}
                showReturn
                canRemove={false}
                onAmountChange={(v) => handleAssetAmount("stocks", v)}
                onReturnChange={(v) => handleAssetReturn("stocks", v)}
              />

              {/* Optional asset classes */}
              {OPTIONAL_ASSET_KEYS.filter((k) => activeAssets[k]).map((key) => (
                <AssetRow
                  key={key}
                  label={ASSET_LABELS[key]}
                  amount={assetAmounts[key]}
                  returnValue={assetReturns[key]}
                  hint={ASSET_HINTS[key]}
                  showReturn
                  canRemove
                  onAmountChange={(v) => handleAssetAmount(key, v)}
                  onReturnChange={(v) => handleAssetReturn(key, v)}
                  onRemove={() => removeAsset(key)}
                />
              ))}

              {/* Add asset dropdown */}
              {remainingAssets.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowDropdown((v) => !v)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                    Add asset
                  </button>
                  {showDropdown && (
                    <>
                      {/* Invisible backdrop to close on outside click */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowDropdown(false)}
                      />
                      <div className="absolute left-0 top-full z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-md">
                        {remainingAssets.map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => addAsset(key)}
                            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                          >
                            {ASSET_LABELS[key]}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Total assets */}
              <div className="flex justify-between border-t border-gray-100 pt-2 text-sm">
                <span className="text-gray-500">Total assets</span>
                <span className="font-semibold text-gray-900 tabular-nums">{totalDisplay}</span>
              </div>

            </div>
          </div>
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
        </div>
      </section>
    </div>
  );
}
