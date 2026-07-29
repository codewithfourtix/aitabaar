import { useState } from "react";
import { MessageCircle, Globe, RefreshCw, FileText, Users, TrendingUp, Clock } from "lucide-react";
import { DashboardShell, GlassCard, Badge, BadgeColor, StatCard, navy, blue, success, warning, danger, indigo } from "../shared";

const allApps = [
  {
    id: "A001", name: "Muhammad Imran", biz: "Imran Kiryana Store",
    channel: "whatsapp", amount: "300,000", risk: "B", riskColor: "blue" as BadgeColor, status: "scored", statusColor: "indigo" as BadgeColor,
    date: "Jan 12", avatar: "MI",
  },
  {
    id: "A002", name: "Fatima Bibi", biz: "Bibi Tailoring",
    channel: "whatsapp", amount: "150,000", risk: "A", riskColor: "green" as BadgeColor, status: "approved", statusColor: "green" as BadgeColor,
    date: "Jan 11", avatar: "FB",
  },
  {
    id: "A003", name: "Ahmed Raza", biz: "Raza Auto Parts",
    channel: "web", amount: "500,000", risk: "C", riskColor: "amber" as BadgeColor, status: "needs docs", statusColor: "amber" as BadgeColor,
    date: "Jan 13", avatar: "AR",
  },
  {
    id: "A004", name: "Sana Malik", biz: "Malik General Store",
    channel: "whatsapp", amount: "250,000", risk: "—", riskColor: "gray" as BadgeColor, status: "submitted", statusColor: "blue" as BadgeColor,
    date: "Jan 14", avatar: "SM",
  },
  {
    id: "A005", name: "Bilal Hussain", biz: "Hussain Electronics",
    channel: "whatsapp", amount: "400,000", risk: "D", riskColor: "red" as BadgeColor, status: "rejected", statusColor: "red" as BadgeColor,
    date: "Jan 10", avatar: "BH",
  },
  {
    id: "A006", name: "Ayesha Khan", biz: "Khan Boutique",
    channel: "web", amount: "200,000", risk: "—", riskColor: "gray" as BadgeColor, status: "processing", statusColor: "indigo" as BadgeColor,
    date: "Jan 14", avatar: "AK",
  },
];

type FilterTab = "All" | "Submitted" | "Scored" | "Needs Docs" | "Decided";

const tabFilter: Record<FilterTab, (a: typeof allApps[0]) => boolean> = {
  "All": () => true,
  "Submitted": (a) => a.status === "submitted",
  "Scored": (a) => a.status === "scored",
  "Needs Docs": (a) => a.status === "needs docs",
  "Decided": (a) => ["approved", "rejected"].includes(a.status),
};

export default function OfficerQueue({ onNav }: { onNav: (p: string) => void }) {
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium hover:bg-gray-50"
            style={{ borderColor: "rgba(15,23,42,0.1)", color: "#64748B" }}
          >
            <RefreshCw size={14} />
            Reset Demo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Users size={20} color={blue} />} label="Total" value="6" sub="all channels" iconBg="#EFF6FF" />
        <StatCard icon={<FileText size={20} color={indigo} />} label="Needs Review" value="3" sub="scored or submitted" iconBg="#EEF2FF" />
        <StatCard icon={<TrendingUp size={20} color={success} />} label="Approved" value="1" sub="this week" iconBg="#ECFDF5" />
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
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
                      <p className="text-xs" style={{ color: "#94A3B8" }}>{app.date} Jan</p>
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
                    onClick={() => onNav("detail")}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-blue-50"
                    style={{ color: blue }}
                  >
                    Review →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: "#94A3B8" }}>
            No applications match this filter.
          </div>
        )}
      </GlassCard>
    </DashboardShell>
  );
}
