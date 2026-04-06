// ============================================================
// Agreement Intelligence Platform — TypeScript Interfaces
// ============================================================
// Generated from: aip_html_4-5.html prototype
// Roles: admin | analyst | sales | viewer
// ============================================================

// ─────────────────────────────────────────────────────────────
// Literal union types (used instead of enums for better
// compatibility with JSON serialization and Supabase clients)
// ─────────────────────────────────────────────────────────────

export type UserRole = "admin" | "analyst" | "sales" | "viewer";

export type AccountStatus = "Active" | "At Risk" | "Churned";

export type OpportunityStage =
  | "Closed Won"
  | "Negotiation"
  | "Proposal"
  | "Discovery";

export type TicketStatus = "Open" | "In Progress" | "Closed";
export type TicketPriority = "High" | "Medium" | "Low";

export type VendorStatus = "healthy" | "warning" | "idle";
export type AuthMethod = "oauth2" | "oauth1" | "service_account" | "api_key";

export type TransformType =
  | "direct"
  | "formula"
  | "lookup"
  | "regex"
  | "custom_js";

export type MappingStatus = "active" | "warning";

export type ErrorSeverity = "high" | "medium" | "low";
export type ErrorStatus = "open" | "retrying" | "resolved";

export type WorkflowStatus = "active" | "warning" | "idle";
export type WorkflowStepType =
  | "trigger"
  | "fetch"
  | "transform"
  | "filter"
  | "upsert"
  | "notify"
  | "error";

export type CredentialType = "url" | "token" | "secret" | "api_key" | "id" | "json";
export type CredentialStatus = "ok" | "warning";
export type SecretStore =
  | "Netlify Env Vars"
  | "AWS Secrets Manager"
  | "Supabase Vault";

export type PricingModel = "pepy" | "platform" | "hybrid" | "usage";
export type ImplScope = "standard" | "enhanced" | "enterprise" | "custom";
export type ImplBilling = "upfront" | "spread";

export type BillingFrequency =
  | "Annual prepaid"
  | "Semi-annual"
  | "Quarterly"
  | "Monthly";

export type PaymentTerms =
  | "Net 30"
  | "Net 45"
  | "Net 60"
  | "Due on receipt";

export type RenewalType =
  | "Auto-renew (60-day notice)"
  | "Manual renewal"
  | "Evergreen";

export type QuoteStatus = "approved" | "pending" | "rejected";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApproverLevel =
  | "AE self-approve"
  | "Sales Manager"
  | "VP Sales + Finance"
  | "C-Suite";

export type Segment = "SMB" | "Mid-market" | "Enterprise" | "Strategic";

export type ModuleName =
  | "Core HR"
  | "Payroll"
  | "Benefits"
  | "Analytics"
  | "Compliance"
  | "Scheduling";

export type HrisPlatform =
  | "Workday"
  | "ADP"
  | "BambooHR"
  | "Ceridian"
  | "SAP"
  | "Other";

export type Region = "West" | "East" | "Midwest" | "South";

export type Industry =
  | "Manufacturing"
  | "Healthcare"
  | "Financial Services"
  | "Retail"
  | "SaaS"
  | "Logistics"
  | "Energy";

export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type EndpointAuth = "bearer" | "hmac" | "api_key";

// ─────────────────────────────────────────────────────────────
// Shared base types
// ─────────────────────────────────────────────────────────────

export interface Timestamps {
  created_at: string; // ISO 8601
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Auth / Users
// ─────────────────────────────────────────────────────────────

/** Maps to auth.users from Supabase and the user_profiles table. */
export interface UserProfile extends Timestamps {
  id: string; // UUID — references auth.users(id)
  email: string;
  full_name: string | null;
  role: UserRole;
}

// ─────────────────────────────────────────────────────────────
// CRM — Accounts
// ─────────────────────────────────────────────────────────────

/** Core customer/account record. */
export interface Account extends Timestamps {
  id: string;             // e.g. "C001"
  customer_name: string;
  industry: Industry;
  employees: number;
  contract_term_months: number;
  pepy: number;           // price per employee per year ($/ee/yr)
  platform_fee: number;   // annual platform fee ($)
  impl_fee: number;       // implementation fee ($)
  region: Region;
  arr: number;            // annual recurring revenue ($)
  hris_platform: HrisPlatform | null;
  account_owner: string | null;
  status: AccountStatus;
}

/** Computed profitability figures derived from an Account + its detail. */
export interface AccountProfitability {
  account_id: string;
  proserv_cost: number;   // total_ps_hours * hourly_rate
  rd_cost: number;        // total_rd_hours * hourly_rate
  rd_hours: number;
  total_revenue: number;  // arr + impl_fee
  net_profit: number;
  gross_margin_pct: number;
}

/** Module lookup — name and base list price. */
export interface Module {
  name: ModuleName;
  price_pepy: number;     // list price ($/ee/yr)
}

/** Junction: which modules are active on an account. */
export interface AccountModule {
  account_id: string;
  module_name: ModuleName;
}

// ─────────────────────────────────────────────────────────────
// CRM — Opportunities
// ─────────────────────────────────────────────────────────────

export interface Opportunity extends Timestamps {
  id: string;             // e.g. "OPP-1041"
  account_id: string;
  name: string;
  stage: OpportunityStage;
  value: number;          // ($)
  close_date: string | null; // ISO date "YYYY-MM-DD"
  age_days: number;
}

// ─────────────────────────────────────────────────────────────
// CRM — Professional Services
// ─────────────────────────────────────────────────────────────

/** Aggregated PS hours and time-to-value for one account. */
export interface ProServEngagement extends Timestamps {
  id: string;             // UUID
  account_id: string;
  total_hours: number;
  billed_hours: number;
  remaining_hours: number; // computed: total_hours - billed_hours (may be negative = over budget)
  impl_hours: number;
  support_hours: number;
  time_to_value_days: number;
}

/** Individual consultant/resource assigned to a PS engagement. */
export interface ProServResource {
  id: string;             // UUID
  engagement_id: string;
  name: string;
  role: string;           // e.g. "Impl Lead", "Solutions Architect"
  hours: number;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// CRM — R&D Tickets
// ─────────────────────────────────────────────────────────────

export interface RdTicket extends Timestamps {
  id: string;             // e.g. "RD-4421"
  account_id: string;
  title: string;
  hours: number;
  status: TicketStatus;
  priority: TicketPriority;
}

// ─────────────────────────────────────────────────────────────
// IPaaS — Vendors
// ─────────────────────────────────────────────────────────────

export interface Vendor extends Timestamps {
  id: string;             // e.g. "sf", "ns"
  name: string;
  type: string;           // e.g. "CRM", "ERP", "Messaging"
  status: VendorStatus;
  last_sync_at: string | null;  // ISO 8601
  record_count: number;
  error_count: number;
  auth_method: AuthMethod;
  icon: string | null;    // short label used in the UI avatar
}

// ─────────────────────────────────────────────────────────────
// IPaaS — Field Mappings
// ─────────────────────────────────────────────────────────────

export interface FieldMapping extends Timestamps {
  id: number;
  vendor_id: string;
  source_field: string;   // e.g. "Account.Name"
  target_field: string;   // e.g. "customer_name"
  transform_type: TransformType;
  transform_config: Record<string, unknown> | null; // JSON: formula/lookup table/regex/JS
  status: MappingStatus;
  last_run_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// IPaaS — Integration Errors
// ─────────────────────────────────────────────────────────────

export interface IntegrationError extends Timestamps {
  id: string;             // e.g. "E001"
  vendor_id: string;
  occurred_at: string;
  error_type: string;     // e.g. "Parse Failure", "Rate Limit"
  message: string;
  severity: ErrorSeverity;
  status: ErrorStatus;
  retry_count: number;
  resolved_at: string | null;
}

// ─────────────────────────────────────────────────────────────
// IPaaS — Workflows
// ─────────────────────────────────────────────────────────────

export interface Workflow extends Timestamps {
  id: string;             // e.g. "WF01"
  name: string;
  schedule: string;       // human-readable, e.g. "Every 15 min"
  status: WorkflowStatus;
  last_run_at: string | null;
  run_count: number;
}

/** An individual step within a workflow, ordered by step_order. */
export interface WorkflowStep extends Timestamps {
  id: number;
  workflow_id: string;
  step_type: WorkflowStepType;
  label: string;          // e.g. "Fetch Salesforce opps"
  note: string | null;    // e.g. "SOQL Bulk API v2"
  step_order: number;     // 0-based ordering
}

// ─────────────────────────────────────────────────────────────
// IPaaS — API Endpoints
// ─────────────────────────────────────────────────────────────

export interface ApiEndpoint extends Timestamps {
  id: string;             // UUID
  method: ApiMethod;
  path: string;           // e.g. "/api/integrations/salesforce/sync"
  auth: EndpointAuth;
  description: string | null;
  last_called_at: string | null;
  call_count: number;
}

// ─────────────────────────────────────────────────────────────
// IPaaS — Credentials
// ─────────────────────────────────────────────────────────────

/**
 * Credential metadata only. Actual secret values are never stored here;
 * they live in the chosen secret_store and are injected at runtime.
 */
export interface Credential extends Timestamps {
  id: number;
  vendor_id: string;
  key_name: string;       // env-var name, e.g. "SF_ACCESS_TOKEN"
  store: SecretStore;
  credential_type: CredentialType;
  masked_value: string | null;   // display-only obfuscated version
  rotated_at: string | null;
  status: CredentialStatus;
}

// ─────────────────────────────────────────────────────────────
// Scenario Modeler
// ─────────────────────────────────────────────────────────────

export interface Scenario extends Timestamps {
  id: string;             // UUID
  name: string;           // e.g. "Scenario A"
  model: PricingModel;
  arr: number;
  tcv: number;
  employees: number;
  term_months: number;
  impl_fee: number;
  base_account_id: string | null; // if loaded from an existing contract
  created_by: string | null;      // UUID → auth.users
}

/** Derived breakdown of revenue components for a scenario. */
export interface ScenarioBreakdown {
  scenario_id: string;
  label: string;          // e.g. "Subscription (PEPY)"
  amount: number;
}

/** Junction: modules selected for a scenario. */
export interface ScenarioModule {
  scenario_id: string;
  module_name: ModuleName;
}

// ─────────────────────────────────────────────────────────────
// CPQ — Quotes
// ─────────────────────────────────────────────────────────────

export interface Quote extends Timestamps {
  id: string;             // UUID
  customer_name: string;
  account_owner: string | null;
  industry: Industry | null;
  hris_platform: HrisPlatform | null;
  employees: number;
  term_months: number;
  impl_scope: ImplScope;
  impl_fee: number;
  impl_billing: ImplBilling;
  managed_services_monthly: number;
  billing_frequency: BillingFrequency;
  payment_terms: PaymentTerms;
  renewal_type: RenewalType;
  price_escalator_pct: number;
  special_terms: string | null;
  arr: number;
  tcv: number;
  max_discount_pct: number;
  effective_pepy: number;
  status: QuoteStatus;
  quote_date: string;     // ISO date
  created_by: string | null; // UUID → auth.users
}

export interface QuoteLineItem {
  id: number;
  quote_id: string;
  module_name: ModuleName;
  list_price: number;     // ($/ee/yr)
  quantity: number;
  discount_pct: number;
  net_price: number;      // computed: list_price * (1 - discount_pct / 100)
  created_at: string;
}

export interface QuoteApproval extends Timestamps {
  id: string;             // UUID
  quote_id: string;
  required_approver: ApproverLevel;
  status: ApprovalStatus;
  approved_by: string | null;  // UUID → auth.users
  approved_at: string | null;
  notes: string | null;
}

// ─────────────────────────────────────────────────────────────
// CPQ — Pricing Rules (mostly static configuration)
// ─────────────────────────────────────────────────────────────

/** Discount guardrail tiers: controls max discount and who must approve. */
export interface DiscountGuardrail extends Timestamps {
  id: string;             // UUID
  tier: string;           // e.g. "Standard", "Mid-market"
  condition_text: string; // e.g. "ARR < $50k"
  max_discount_pct: number;
  approver: ApproverLevel;
}

/** Module bundle with an automatic bundle discount. */
export interface BundleRule extends Timestamps {
  id: string;             // UUID
  bundle_name: string;    // e.g. "Enterprise"
  discount_pct: number;
}

/** Junction: modules that belong to a bundle. */
export interface BundleRuleModule {
  bundle_id: string;
  module_name: ModuleName;
}

/** PEPY floor and target prices segmented by employee headcount. */
export interface PepyFloor extends Timestamps {
  id: string;             // UUID
  segment: Segment;
  min_employees: number;
  max_employees: number | null; // null = no upper bound (top tier)
  floor_price: number;
  target_price: number;
}

/** Implementation fee guidelines by engagement scope. */
export interface ImplFeeGuideline extends Timestamps {
  id: string;             // UUID
  scope: ImplScope;
  hours: number | null;         // null for "custom / TBD"
  standard_fee: number | null;
  floor_fee: number | null;
  hourly_rate: number | null;   // for custom T&M engagements
}

// ─────────────────────────────────────────────────────────────
// Composite / API response shapes
// ─────────────────────────────────────────────────────────────

/** Full account detail as returned by the detail drill-through endpoint. */
export interface AccountDetail {
  account: Account;
  modules: ModuleName[];
  opportunities: Opportunity[];
  proserv: ProServEngagement & { resources: ProServResource[] };
  rd_tickets: RdTicket[];
  profitability: AccountProfitability;
}

/** Full quote with its line items and any pending approval. */
export interface QuoteDetail {
  quote: Quote;
  line_items: QuoteLineItem[];
  approval: QuoteApproval | null;
}

/** Scenario with its selected modules. */
export interface ScenarioDetail {
  scenario: Scenario;
  modules: ModuleName[];
}
