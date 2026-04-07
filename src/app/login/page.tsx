import { GoogleSignInButton } from "./google-button";

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed:
    "Your Google account's domain is not authorized. Please sign in with your company account.",
  auth_failed:
    "Authentication failed. Please try again or contact your administrator.",
};

export default async function LoginPage({ searchParams }: Props) {
  const { next = "/", error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth_failed) : null;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "360px",
          padding: "40px 32px",
          borderRadius: "16px",
          border: "1px solid var(--separator)",
          background: "var(--bg-secondary)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Wordmark */}
        <div className="text-center mb-8">
          <span
            style={{
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            AIP
          </span>
          <p
            className="mt-1"
            style={{ fontSize: "13px", color: "var(--text-secondary)" }}
          >
            Agreement Intelligence Platform
          </p>
        </div>

        <h1
          className="text-center mb-6"
          style={{
            fontSize: "17px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          Sign in to continue
        </h1>

        {errorMessage && (
          <div
            className="mb-5 px-4 py-3 rounded-lg text-sm"
            style={{
              background: "rgba(255,59,48,0.08)",
              border: "1px solid rgba(255,59,48,0.2)",
              color: "rgba(255,59,48,0.9)",
            }}
          >
            {errorMessage}
          </div>
        )}

        <GoogleSignInButton next={next} />

        <p
          className="mt-6 text-center"
          style={{ fontSize: "12px", color: "var(--text-tertiary)" }}
        >
          Access is restricted to authorized accounts.
          <br />
          SSO enforced via Google Workspace.
        </p>
      </div>
    </div>
  );
}
