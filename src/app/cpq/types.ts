export const ALL_MODULES = ["Core HR", "Payroll", "Benefits", "Analytics", "Compliance", "Scheduling"] as const;
export const INDUSTRIES = ["Manufacturing", "Healthcare", "Financial Services", "Retail", "SaaS", "Logistics", "Energy"];
export const HRIS_LIST  = ["Workday", "ADP", "BambooHR", "Ceridian", "SAP", "Other"];

export const SEGMENT_FLOORS: { label: string; min: number; max: number; floor: number }[] = [
  { label: "SMB",        min: 1,    max: 250,  floor: 55 },
  { label: "Mid-market", min: 251,  max: 1000, floor: 45 },
  { label: "Enterprise", min: 1001, max: 5000, floor: 35 },
  { label: "Strategic",  min: 5001, max: Infinity, floor: 28 },
];

export function getSegment(emp: number) {
  return SEGMENT_FLOORS.find((s) => emp >= s.min && emp <= s.max) ?? SEGMENT_FLOORS[3];
}

export function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}
export function fmtD(n: number) { return `$${Math.round(n).toLocaleString()}`; }

export interface ModulePrice { name: string; price_pepy: number }
export interface AccountRow  { id: string; customer_name: string; employees: number; arr: number }

export interface LineItem {
  _id: number;
  module_name: string;
  list_price: number;
  quantity: number;
  discount_pct: number;
}

export interface RulesData {
  guardrails: { id: string; tier: string; condition_text: string; max_discount_pct: number; approver: string }[];
  bundles:    { id: string; bundle_name: string; discount_pct: number; bundle_rule_modules: { module_name: string }[] }[];
  pepyFloors: { id: string; segment: string; min_employees: number; max_employees: number | null; floor_price: number; target_price: number }[];
  implGuidelines: { id: string; scope: string; hours: number | null; standard_fee: number | null; floor_fee: number | null; hourly_rate: number | null }[];
}

export interface SavedQuote {
  id: string;
  customer_name: string;
  employees: number;
  term_months: number;
  arr: number;
  tcv: number;
  impl_fee: number;
  max_discount_pct: number;
  effective_pepy: number;
  status: "approved" | "pending" | "rejected";
  quote_date: string;
  quote_line_items: { module_name: string; list_price: number; quantity: number; discount_pct: number }[];
  quote_approvals: { required_approver: string; status: string }[];
}
