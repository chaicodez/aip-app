"use client";

interface Variable {
  category: string;
  variable_name: string;
  variable_value: string | null;
  numeric_value: number | null;
}

interface Contract {
  id: string;
  customer_name: string | null;
  file_name: string;
  acv: number | null;
  contract_variables: Variable[];
}

interface Finding {
  title: string;
  description: string;
  affected: string[];
  action: string;
}

function getLabel(c: Contract) {
  return c.customer_name ?? c.file_name;
}

function findVar(c: Contract, keyword: string): Variable | undefined {
  return c.contract_variables.find((v) =>
    v.variable_name.toLowerCase().includes(keyword.toLowerCase())
  );
}

function computeFindings(contracts: Contract[]): Finding[] {
  const findings: Finding[] = [];

  // ACV range
  const acvs = contracts.map((c) => c.acv).filter((n): n is number => n !== null);
  if (acvs.length >= 2) {
    const min = Math.min(...acvs);
    const max = Math.max(...acvs);
    const avg = acvs.reduce((a, b) => a + b, 0) / acvs.length;
    const spread = avg > 0 ? (max - min) / avg : 0;
    if (spread > 0.3) {
      findings.push({
        title: "ACV Range Variance",
        description: `Min $${(min / 1000).toFixed(0)}K / Max $${(max / 1000).toFixed(0)}K / Avg $${(avg / 1000).toFixed(0)}K — ${(spread * 100).toFixed(0)}% spread`,
        affected: contracts.filter((c) => c.acv === min || c.acv === max).map(getLabel),
        action: "Review pricing consistency across accounts with similar profiles.",
      });
    }
  }

  // High discount
  const highDiscount = contracts.filter((c) => {
    const v = findVar(c, "discount");
    return v?.numeric_value != null && v.numeric_value > 20;
  });
  if (highDiscount.length > 0) {
    findings.push({
      title: "High Discount Depth",
      description: `${highDiscount.length} contract(s) with discount > 20%`,
      affected: highDiscount.map(getLabel),
      action: "Ensure discount approval was obtained and is documented.",
    });
  }

  // Missing price escalation
  const missingEscalation = contracts.filter((c) => {
    const v = findVar(c, "escalation");
    return !v || !v.variable_value;
  });
  if (missingEscalation.length > 0) {
    findings.push({
      title: "Missing Price Escalation",
      description: `${missingEscalation.length} contract(s) lack an annual price escalation clause`,
      affected: missingEscalation.map(getLabel),
      action: "Add escalation clause in renewal negotiations.",
    });
  }

  // Long payment terms
  const longPayment = contracts.filter((c) => {
    const v = findVar(c, "payment terms");
    return v?.numeric_value != null && v.numeric_value > 30;
  });
  if (longPayment.length > 0) {
    findings.push({
      title: "Long Payment Terms",
      description: `${longPayment.length} contract(s) with payment terms > 30 days`,
      affected: longPayment.map(getLabel),
      action: "Negotiate shorter terms to improve cash flow.",
    });
  }

  // Missing SLA
  const missingSla = contracts.filter((c) => {
    const v = findVar(c, "sla") ?? findVar(c, "uptime");
    return !v || !v.variable_value;
  });
  if (missingSla.length > 0) {
    findings.push({
      title: "Missing SLA Clause",
      description: `${missingSla.length} contract(s) have no SLA/uptime commitment`,
      affected: missingSla.map(getLabel),
      action: "Include SLA terms in next renewal or amendment.",
    });
  }

  // PEPY/overage variance
  const overages = contracts
    .map((c) => ({ label: getLabel(c), v: findVar(c, "overage") }))
    .filter((x) => x.v?.numeric_value != null);
  if (overages.length >= 2) {
    const vals = overages.map((x) => x.v!.numeric_value!);
    const spread = Math.max(...vals) - Math.min(...vals);
    if (spread > 10) {
      findings.push({
        title: "PEPY/Overage Variance",
        description: `$${spread.toFixed(2)}/emp spread in overage rates`,
        affected: overages.map((x) => x.label),
        action: "Standardize overage pricing across similar customer segments.",
      });
    }
  }

  return findings;
}

interface LeakagePanelProps {
  contracts: Contract[];
  selectedIds: Set<string>;
}

export default function LeakagePanel({ contracts, selectedIds }: LeakagePanelProps) {
  const selected = contracts.filter((c) => selectedIds.has(c.id));
  if (selected.length < 2) return null;

  const findings = computeFindings(selected);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
        ⚠️ Leakage Analysis
      </h3>
      {findings.length === 0 ? (
        <p className="text-sm text-gray-400">No leakage risks detected in selected contracts.</p>
      ) : (
        <div className="space-y-3">
          {findings.map((f, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{f.title}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">{f.description}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {f.affected.map((name) => (
                  <span key={name} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                    {name}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">{f.action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
