import { useState, useEffect } from "react";
import { MessageCircle, Globe, RefreshCw, FileText, Users, TrendingUp, Clock, Loader2, AlertTriangle } from "lucide-react";
import { DashboardShell, GlassCard, Badge, BadgeColor, StatCard, navy, blue, success, warning, danger, indigo } from "../shared";
import { fetchApplications, demoReset } from "../../services/api";

type FilterTab = "All" | "Submitted" | "Scored" | "Needs Docs" | "Decided";

const tabFilter: Record<FilterTab, (a: any) => boolean> = {
  "All": () => true,
  "Submitted": (a) => a.status === "submitted",
  "Scored": (a) => a.status === "scored",
  "Needs Docs": (a) => a.status === "needs docs" || a.status === "needs_docs",
  "Decided": (a) => ["approved", "rejected"].includes(a.status),
};

const getStatusColor = (status: string): BadgeColor => {
  switch (status) {
    case 'approved': return 'green';
    case 'rejected': return 'red';
    case 'scored': return 'indigo';
    case 'needs_docs': return 'amber';
    case 'processing': return 'indigo';
    case 'failed': return 'red';
    case 'submitted': return 'blue';
    default: return 'gray';
  }
};

const getRiskColor = (risk: string): BadgeColor => {
    switch (risk) {
        case 'A': return 'green';
        case 'B': return 'blue';
        case 'C': return 'amber';
        case 'D': return 'red';
        default: return 'gray';
    }
}

export default function OfficerQueue({ onNav }: { onNav: (p: string, params?: any) => void }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");
  const [allApps, setAllApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await fetchApplications();
      
      const mappedApps = data.map((app: any) => {
        const dateObj = new Date(app.created_at);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const risk = app.score ? app.score.risk_tier : "—";
        const nameParts = app.applicant.name.split(' ');
        const avatar = nameParts.length > 1 ? nameParts[0][0] + nameParts[1][0] : nameParts[0][0];

        return {
          id: app.id,
          name: app.applicant.name,
          biz: app.applicant.business_name,
          channel: app.channel,
          amount: app.requested_amount_pkr.toLocaleString(),
          risk: risk,
          riskColor: getRiskColor(risk),
          status: app.status.replace('_', ' '),
          statusColor: getStatusColor(app.status),
          date: dateStr,
          avatar: avatar.toUpperCase()
        };
      });
      setAllApps(mappedApps);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResetDemo = async () => {
    setResetting(true);
    try {
      await demoReset();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  const filtered = allApps.filter(tabFilter[activeTab]);

  return (
    <DashboardShell onNav={onNav} active="queue">
      {/* Page heading */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: navy }}>Application Queue</h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>Review and decision pending applications</p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "#EFF6FF", color: blue }}
          >
            Total Applications: {allApps.length}
          </span>
          <button
            onClick={handleResetDemo}
            disabled={resetting}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
            style={{ borderColor: "rgba(15,23,42,0.1)", color: "#64748B" }}
          >
            {resetting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Reset Demo
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-5" style={{ background: "#FEF2F2", borderColor: "rgba(220,38,38,0.3)" }}>
          <AlertTriangle size={16} color={danger} className="shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: danger }}>
            Cannot reach backend ({error}). Retrying...
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Users size={20} color={blue} />} label="Total" value={allApps.length.toString()} sub="all channels" iconBg="#EFF6FF" />
        <StatCard icon={<FileText size={20} color={indigo} />} label="Needs Review" value={allApps.filter(a => ['scored', 'submitted', 'needs docs'].includes(a.status)).length.toString()} sub="scored or submitted" iconBg="#EEF2FF" />
        <StatCard icon={<TrendingUp size={20} color={success} />} label="Approved" value={allApps.filter(a => a.status === 'approved').length.toString()} sub="this week" iconBg="#ECFDF5" />
        <StatCard icon={<Clock size={20} color={warning} />} label="Avg. Decision" value="18 h" sub="from submission" iconBg="#FFFBEB" />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-xl w-fit" style={{ background: "rgba(15,23,42,0.05)" }}>
        {(["All", "Submitted", "Scored", "Needs Docs", "Decided"] as FilterTab[]).map((t) => {
          const count = allApps.filter(tabFilter[t]).length;
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
              style={
                activeTab === t
                  ? { background: "white", color: navy, boxShadow: "0 1px 4px rgba(10,45,110,0.1)" }
                  : { color: "#64748B" }
              }
            >
              {t}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: activeTab === t ? "#EFF6FF" : "rgba(15,23,42,0.06)",
                  color: activeTab === t ? blue : "#94A3B8",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <GlassCard>
        {loading ? (
            <div className="py-16 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: blue }} />
            </div>
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "rgba(15,23,42,0.02)", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
              {["Applicant", "Business", "Channel", "Amount (PKR)", "Risk", "Status", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((app) => (
              <tr
                key={app.id}
                className="border-b hover:bg-gray-50 transition-colors"
                style={{ borderColor: "rgba(15,23,42,0.04)" }}
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: `linear-gradient(135deg, ${navy}, ${blue})` }}
                    >
                      {app.avatar}
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: navy }}>{app.name}</p>
                      <p className="text-xs" style={{ color: "#94A3B8" }}>{app.date}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4" style={{ color: "#374151" }}>{app.biz}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#374151" }}>
                    {app.channel === "whatsapp" ? (
                      <MessageCircle size={14} color="#25D366" />
                    ) : (
                      <Globe size={14} color={blue} />
                    )}
                    {app.channel === "whatsapp" ? "WhatsApp" : "Web"}
                  </div>
                </td>
                <td className="px-5 py-4 font-semibold" style={{ color: navy }}>
                  {app.amount}
                </td>
                <td className="px-5 py-4">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{
                      background:
                        app.risk === "A" ? "#ECFDF5" :
                        app.risk === "B" ? "#EFF6FF" :
                        app.risk === "C" ? "#FFFBEB" :
                        app.risk === "D" ? "#FEF2F2" : "#F1F5F9",
                      color:
                        app.risk === "A" ? success :
                        app.risk === "B" ? blue :
                        app.risk === "C" ? warning :
                        app.risk === "D" ? danger : "#94A3B8",
                    }}
                  >
                    {app.risk}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <Badge label={app.status} color={app.statusColor} />
                </td>
                <td className="px-5 py-4 text-right">
                  <button
                    onClick={() => onNav("detail", { appId: app.id })}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-blue-50 cursor-pointer"
                    style={{ color: blue }}
                  >
                    Review →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: "#94A3B8" }}>
            No applications match this filter.
          </div>
        )}
      </GlassCard>
    </DashboardShell>
  );
}
