import { useState, useEffect } from "react";
import { MessageCircle, Users, FileText, CheckCircle2, Clock, Loader2, AlertTriangle, Info } from "lucide-react";
import { DashboardShell, GlassCard, Badge, BadgeColor, StatCard, navy, blue, success, warning, danger } from "../shared";
import { fetchApplications, fetchMisSummary } from "../../services/api";

// The traditional-process baseline this estimate is anchored to — see the
// project README's problem statement ("3 to 5 branch trips per application
// is normal"). Kept as a named constant, not a magic number, so the source
// of the estimate is visible in the code, same convention as
// backend/data/DATA_CARD.md's SOURCED/ASSUMPTION tags.
const BRANCH_VISITS_AVOIDED_LOW = 3;
const BRANCH_VISITS_AVOIDED_HIGH = 5;

const getRiskColor = (risk: string): BadgeColor => {
  switch (risk) {
    case "A": return "green";
    case "B": return "blue";
    case "C": return "amber";
    case "D": return "red";
    default: return "gray";
  }
};

const getStatusColor = (status: string): BadgeColor => {
  switch (status) {
    case "approved": return "green";
    case "rejected": return "red";
    case "scored": return "indigo";
    case "needs_docs": return "amber";
    case "processing": return "indigo";
    case "failed": return "red";
    case "submitted": return "blue";
    default: return "gray";
  }
};

export default function WhatsAppBot({ onNav }: { onNav: (p: string, params?: any) => void }) {
  const [apps, setApps] = useState<any[]>([]);
  const [misSummary, setMisSummary] = useState<any>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchApplications();
      setApps(data);
      setUsingFallback(false);
      setError(null);
    } catch (err: any) {
      // Per-application detail unavailable (e.g. a slow/flaky backend) -
      // fall back to the pre-aggregated portfolio summary (R-19 ii) so the
      // tab still shows real totals instead of just an error banner. Coarser
      // (no per-applicant list, no WhatsApp-specific tier breakdown - the
      // summary endpoint's by_risk_tier/by_segment are portfolio-wide, not
      // filtered by channel), but honestly labeled as such below.
      try {
        const summary = await fetchMisSummary();
        setMisSummary(summary);
        setUsingFallback(true);
        setError(null);
      } catch {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const waApps = apps.filter((a) => a.channel === "whatsapp");
  const total = apps.length;
  const waCount = waApps.length;
  const waShare = total > 0 ? Math.round((waCount / total) * 100) : 0;

  const uniqueUsers = new Set(waApps.map((a) => a.applicant?.phone)).size;
  const reviewed = waApps.filter((a) => ["scored", "needs_docs"].includes(a.status)).length;
  const decided = waApps.filter((a) => ["approved", "rejected"].includes(a.status)).length;

  const tierCounts = { A: 0, B: 0, C: 0, D: 0 } as Record<string, number>;
  waApps.forEach((a) => {
    const t = a.score?.risk_tier;
    if (t && tierCounts[t] !== undefined) tierCounts[t] += 1;
  });
  const scoredWaCount = Object.values(tierCounts).reduce((s, n) => s + n, 0);

  const recent = [...waApps]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  // Fallback-mode derived values (from GET /applications/mis-summary,
  // portfolio-wide rather than WhatsApp-specific - see loadData above).
  const fbTotal = misSummary?.total_applications ?? 0;
  const fbWaCount = misSummary?.by_channel?.whatsapp ?? 0;
  const fbByStatus = misSummary?.by_status ?? {};
  const fbReviewed = (fbByStatus.scored ?? 0) + (fbByStatus.needs_docs ?? 0);
  const fbDecided = (fbByStatus.approved ?? 0) + (fbByStatus.rejected ?? 0);
  const fbByTier = misSummary?.by_risk_tier ?? {};
  const fbTierTotal = Object.values(fbByTier).reduce((s: number, n: any) => s + n, 0) as number;

  return (
    <DashboardShell onNav={onNav} active="whatsapp">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
          >
            <MessageCircle size={20} color="white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: navy }}>WhatsApp Bot Usage</h1>
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
              What the WhatsApp channel is actually contributing to the pipeline
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-5" style={{ background: "#FEF2F2", borderColor: "rgba(220,38,38,0.3)" }}>
          <AlertTriangle size={16} color={danger} className="shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: danger }}>Cannot reach backend ({error}). Retrying...</p>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: blue }} />
        </div>
      ) : usingFallback ? (
        <>
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-5" style={{ background: "#FFFBEB", borderColor: "rgba(201,162,39,0.3)" }}>
            <Info size={16} color={warning} className="shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: "#92400E" }}>
              Per-application detail is unavailable right now, so this is falling back to portfolio-wide totals
              (GET /applications/mis-summary) rather than WhatsApp-specific numbers — the tier breakdown and
              recent-applications list below need the full record list to filter by channel.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<FileText size={20} color="#25D366" />}
              label="WhatsApp Applications"
              value={fbWaCount.toString()}
              sub={`of ${fbTotal} total, all channels`}
              iconBg="#F0FFF4"
              accent="#25D366"
            />
            <StatCard
              icon={<Clock size={20} color={warning} />}
              label="In review"
              value={fbReviewed.toString()}
              sub="portfolio-wide, scored or needs docs"
              iconBg="#FFFBEB"
              accent={warning}
            />
            <StatCard
              icon={<CheckCircle2 size={20} color={success} />}
              label="Solved"
              value={fbDecided.toString()}
              sub="portfolio-wide, approved or rejected"
              iconBg="#ECFDF5"
              accent={success}
            />
            <StatCard
              icon={<Users size={20} color={blue} />}
              label="Est. branch visits avoided"
              value={`${fbWaCount * BRANCH_VISITS_AVOIDED_LOW}–${fbWaCount * BRANCH_VISITS_AVOIDED_HIGH}`}
              sub="estimate, see note below"
              iconBg="#EFF6FF"
              accent={blue}
            />
          </div>
          {fbTierTotal > 0 && (
            <GlassCard className="p-5">
              <h3 className="font-semibold text-base mb-1" style={{ color: navy }}>Risk tier distribution</h3>
              <p className="text-xs mb-4" style={{ color: "#94A3B8" }}>Portfolio-wide (all channels) — not WhatsApp-specific in fallback mode.</p>
              {(["A", "B", "C", "D"] as const).map((tier) => {
                const count = fbByTier[tier] ?? 0;
                const pct = fbTierTotal > 0 ? Math.round((count / fbTierTotal) * 100) : 0;
                const color = tier === "A" ? success : tier === "B" ? blue : tier === "C" ? warning : danger;
                return (
                  <div key={tier} className="mb-3 last:mb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: "#374151" }}>Tier {tier}</span>
                      <span className="text-xs font-semibold" style={{ color: "#374151" }}>{count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 rounded-full" style={{ background: "#F1F5F9" }}>
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </GlassCard>
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={<Users size={20} color="#25D366" />}
              label="Users"
              value={uniqueUsers.toString()}
              sub={`unique applicants, WhatsApp`}
              iconBg="#F0FFF4"
              accent="#25D366"
            />
            <StatCard
              icon={<FileText size={20} color={blue} />}
              label="Inflow"
              value={waCount.toString()}
              sub={`${waShare}% of ${total} total applications`}
              iconBg="#EFF6FF"
              accent={blue}
            />
            <StatCard
              icon={<Clock size={20} color={warning} />}
              label="In review"
              value={reviewed.toString()}
              sub="scored or needs docs"
              iconBg="#FFFBEB"
              accent={warning}
            />
            <StatCard
              icon={<CheckCircle2 size={20} color={success} />}
              label="Solved"
              value={decided.toString()}
              sub="approved or rejected"
              iconBg="#ECFDF5"
              accent={success}
            />
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <GlassCard className="p-5 col-span-1">
              <h3 className="font-semibold text-base mb-1" style={{ color: navy }}>Est. branch visits avoided</h3>
              <p className="text-3xl font-bold mt-2" style={{ color: navy }}>
                {waCount * BRANCH_VISITS_AVOIDED_LOW}–{waCount * BRANCH_VISITS_AVOIDED_HIGH}
              </p>
              <p className="text-xs mt-2 flex items-start gap-1.5" style={{ color: "#94A3B8" }}>
                <Info size={12} className="shrink-0 mt-0.5" />
                Estimate: {waCount} WhatsApp application{waCount === 1 ? "" : "s"} × {BRANCH_VISITS_AVOIDED_LOW}–{BRANCH_VISITS_AVOIDED_HIGH}{" "}
                trips, the traditional-process baseline this project states in its own problem statement — not a measured figure.
              </p>
            </GlassCard>

            <GlassCard className="p-5 col-span-2">
              <h3 className="font-semibold text-base mb-4" style={{ color: navy }}>Risk tier distribution (WhatsApp applicants)</h3>
              {scoredWaCount === 0 ? (
                <p className="text-sm" style={{ color: "#94A3B8" }}>No scored WhatsApp applications yet.</p>
              ) : (
                (["A", "B", "C", "D"] as const).map((tier) => {
                  const count = tierCounts[tier];
                  const pct = scoredWaCount > 0 ? Math.round((count / scoredWaCount) * 100) : 0;
                  const color = tier === "A" ? success : tier === "B" ? blue : tier === "C" ? warning : danger;
                  return (
                    <div key={tier} className="mb-3 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium" style={{ color: "#374151" }}>Tier {tier}</span>
                        <span className="text-xs font-semibold" style={{ color: "#374151" }}>{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 rounded-full" style={{ background: "#F1F5F9" }}>
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })
              )}
            </GlassCard>
          </div>

          <GlassCard>
            <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
              <h3 className="font-semibold text-base" style={{ color: navy }}>Recent WhatsApp applications</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(15,23,42,0.02)", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                  {["Applicant", "Business", "Risk", "Status", "Date", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((app) => (
                  <tr key={app.id} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: "rgba(15,23,42,0.04)" }}>
                    <td className="px-5 py-4 font-semibold" style={{ color: navy }}>{app.applicant.name}</td>
                    <td className="px-5 py-4" style={{ color: "#374151" }}>{app.applicant.business_name}</td>
                    <td className="px-5 py-4">
                      {app.score ? <Badge label={app.score.risk_tier} color={getRiskColor(app.score.risk_tier)} /> : <span style={{ color: "#94A3B8" }}>—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <Badge label={app.status.replace("_", " ")} color={getStatusColor(app.status)} />
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: "#94A3B8" }}>
                      {new Date(app.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onNav("detail", { appId: app.id })}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-blue-50 cursor-pointer"
                        style={{ color: blue }}
                      >
                        View More →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recent.length === 0 && (
              <div className="py-16 text-center text-sm" style={{ color: "#94A3B8" }}>
                No WhatsApp applications yet.
              </div>
            )}
          </GlassCard>
        </>
      )}
    </DashboardShell>
  );
}
