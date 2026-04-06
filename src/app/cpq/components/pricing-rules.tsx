"use client";

import { fmtD, type RulesData } from "@/app/cpq/types";
import { Card, SectionTitle, RuleTable } from "@/app/cpq/components/ui";

export function PricingRules({ rules }: { rules: RulesData | null }) {
  if (!rules) return <p className="text-sm text-gray-400">Loading rules…</p>;

  const discColor = (pct: number) =>
    pct <= 10 ? "text-green-600" : pct <= 20 ? "text-amber-600" : pct <= 30 ? "text-red-600" : "text-purple-700";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <SectionTitle>Discount guardrails</SectionTitle>
          <RuleTable
            headers={["Tier", "Condition", "Max discount", "Approver"]}
            rows={rules.guardrails.map((g) => [
              g.tier,
              g.condition_text,
              <span key="d" className={`font-semibold ${discColor(g.max_discount_pct)}`}>
                {g.max_discount_pct >= 100 ? "Negotiated" : `${g.max_discount_pct}%`}
              </span>,
              g.approver,
            ])}
          />
        </Card>

        <Card>
          <SectionTitle>Bundle pricing rules</SectionTitle>
          <RuleTable
            headers={["Bundle", "Modules included", "Discount"]}
            rows={rules.bundles.map((b) => [
              <span key="n" className="font-medium">{b.bundle_name}</span>,
              <span key="m" className="text-xs text-gray-400">{b.bundle_rule_modules.map((m) => m.module_name).join(", ") || "—"}</span>,
              b.discount_pct > 0
                ? <span key="d" className="font-semibold text-green-600">{b.discount_pct}%</span>
                : <span key="d" className="text-gray-400">—</span>,
            ])}
          />
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <SectionTitle>PEPY floor pricing by segment</SectionTitle>
          <RuleTable
            headers={["Segment", "Employee range", "PEPY floor", "PEPY target"]}
            rows={rules.pepyFloors.map((p) => [
              p.segment,
              p.max_employees
                ? `${p.min_employees.toLocaleString()}–${p.max_employees.toLocaleString()}`
                : `${p.min_employees.toLocaleString()}+`,
              <span key="f" className="font-semibold text-red-600">${p.floor_price}</span>,
              `$${p.target_price}`,
            ])}
          />
        </Card>

        <Card>
          <SectionTitle>Implementation fee guidelines</SectionTitle>
          <RuleTable
            headers={["Scope", "Hours", "Standard fee", "Floor"]}
            rows={rules.implGuidelines.map((g) => [
              <span key="s" className="capitalize">{g.scope}</span>,
              g.hours ? `${g.hours}h` : "TBD",
              g.standard_fee ? fmtD(g.standard_fee) : g.hourly_rate ? `T&M @ $${g.hourly_rate}/hr` : "—",
              g.floor_fee
                ? <span key="f" className="font-semibold text-red-600">{fmtD(g.floor_fee)}</span>
                : <span key="f" className="text-gray-400">—</span>,
            ])}
          />
        </Card>
      </div>
    </div>
  );
}
