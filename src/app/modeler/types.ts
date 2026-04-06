export const ALL_MODULES = ["Core HR", "Payroll", "Benefits", "Analytics", "Compliance", "Scheduling"] as const;
export type PricingModel = "pepy" | "platform" | "hybrid" | "usage";

export const COLORS = { arr: "#7F77DD", tcv: "#AFA9EC", pepy: "#7F77DD", platform: "#1D9E75", hybrid: "#BA7517" };

export interface AccountRow {
  id: string;
  customer_name: string;
  employees: number;
  pepy: number;
  platform_fee: number;
  impl_fee: number;
  arr: number;
  contract_term_months: number;
  account_modules: { module_name: string }[];
}

export interface SavedScenario {
  localId: number;
  dbId?: string;
  name: string;
  model: PricingModel;
  modelLabel: string;
  arr: number;
  tcv: number;
  employees: number;
  term: number;
  implFee: number;
  modules: string[];
}

export function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
export function fmtD(n: number) { return `$${Math.round(n).toLocaleString()}`; }
export function fmtTick(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

export function calcScenario({
  model, employees, term, pepyRate, platformFee, usageRate, implFee, implBilling, modules,
}: {
  model: PricingModel; employees: number; term: number; pepyRate: number;
  platformFee: number; usageRate: number; implFee: number;
  implBilling: "upfront" | "spread"; modules: string[];
}) {
  const mm = 1 + Math.max(0, modules.length - 1) * 0.15;
  const pepyArr = employees * pepyRate * mm;
  const platArr = platformFee * mm;
  const usageArr = employees * usageRate * 12 * 100;

  const allModels = {
    pepy:     { label: "PEPY",          arr: pepyArr,                           tcv: pepyArr * (term / 12) + implFee },
    platform: { label: "Platform",      arr: platArr,                           tcv: platArr * (term / 12) + implFee },
    hybrid:   { label: "PEPY+Platform", arr: pepyArr * 0.6 + platArr * 0.4,    tcv: (pepyArr * 0.6 + platArr * 0.4) * (term / 12) + implFee },
    usage:    { label: "Usage-based",   arr: usageArr,                          tcv: usageArr * (term / 12) + implFee },
  };

  const current = allModels[model];

  const bd: Record<string, number> = (() => {
    if (model === "pepy")     return { "Subscription (PEPY)": pepyArr };
    if (model === "platform") return { "Platform fee": platArr };
    if (model === "hybrid")   return { "PEPY component": pepyArr * 0.6, "Platform component": platArr * 0.4 };
    return { "Usage revenue": usageArr };
  })();

  if (implBilling === "spread") bd["Impl (spread)"] = (implFee / term) * 12;

  const upfront = implBilling === "upfront" ? implFee : 0;

  const sensitivity = [-40, -20, 0, 20, 40].map((p) => {
    const e = Math.round(employees * (1 + p / 100));
    return {
      label: p === 0 ? "Base" : (p > 0 ? "+" : "") + p + "%",
      PEPY: Math.round(e * pepyRate * mm),
      Platform: Math.round(platArr),
      Hybrid: Math.round((e * pepyRate * 0.6 + platArr * 0.4) * mm),
    };
  });

  return { ...current, bd, upfront, mm, allModels, sensitivity };
}
