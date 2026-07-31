import React from "react";
import aitbaarMark from "../assets/aitbaar-mark.png";

export const navy = "#0A2D6E";
export const blue = "#1E88E5";
export const pageBg = "#F5F7FA";
export const success = "#059669";
export const warning = "#C9A227";
export const danger = "#DC2626";
export const indigo = "#6366F1";
export const waGreen = "#25D366";
export const waDark = "#075E54";

export function GlassCard({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`bg-white rounded-2xl ${className}`}
      style={{
        border: "1px solid rgba(15,23,42,0.06)",
        boxShadow: "0 2px 16px rgba(10,45,110,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function AitbaarLogo({ small = false }: { small?: boolean }) {
  return (
    <div className={`flex items-center gap-${small ? "2" : "3"}`}>
      <img
        src={aitbaarMark}
        alt="Aitbaar"
        className={`${small ? "w-8 h-8" : "w-9 h-9"} rounded-lg object-contain shadow-sm`}
      />
      <div className="flex flex-col leading-tight">
        <span className={`font-bold ${small ? "text-sm" : "text-base"} tracking-tight`} style={{ color: navy }}>
          Aitbaar
        </span>
        <span className="text-xs" style={{ color: "#64748B", fontFamily: "serif" }}>
          اعتبار
        </span>
      </div>
    </div>
  );
}

export type BadgeColor = "blue" | "green" | "amber" | "red" | "indigo" | "gray" | "wa";

export function Badge({ label, color }: { label: string; color: BadgeColor }) {
  const map: Record<BadgeColor, { bg: string; text: string; dot: string }> = {
    blue: { bg: "#EFF6FF", text: blue, dot: blue },
    green: { bg: "#ECFDF5", text: success, dot: success },
    amber: { bg: "#FFFBEB", text: warning, dot: warning },
    red: { bg: "#FEF2F2", text: danger, dot: danger },
    indigo: { bg: "#EEF2FF", text: indigo, dot: indigo },
    gray: { bg: "#F1F5F9", text: "#64748B", dot: "#94A3B8" },
    wa: { bg: "#F0FFF4", text: waDark, dot: waGreen },
  };
  const c = map[color];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide"
      style={{ background: c.bg, color: c.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {label}
    </span>
  );
}

export function DashboardShell({
  children,
  onNav,
  active,
}: {
  children: React.ReactNode;
  onNav: (page: string) => void;
  active: string;
}) {
  const navItems = [
    { id: "queue", label: "Application Queue" },
    { id: "whatsapp", label: "WhatsApp Bot" },
  ];
  return (
    <div className="min-h-screen" style={{ background: pageBg, fontFamily: "Inter, sans-serif" }}>
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b print:hidden"
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(15,23,42,0.06)",
        }}
      >
        <div className="flex items-center gap-6">
          <button onClick={() => onNav("queue")}>
            <AitbaarLogo />
          </button>
          <div className="w-px h-8" style={{ background: "rgba(15,23,42,0.08)" }} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold" style={{ color: navy }}>
              Loan Officer Dashboard
            </span>
            <span className="text-xs" style={{ color: warning, fontFamily: "serif" }}>
              اعتبار، جو کاروبار بڑھائے
            </span>
          </div>
          <nav className="flex items-center gap-1 ml-2">
            {navItems.map((n) => (
              <button
                key={n.id}
                onClick={() => onNav(n.id)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={
                  active === n.id
                    ? { background: "#EFF6FF", color: blue }
                    : { color: "#64748B" }
                }
              >
                {n.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: `linear-gradient(135deg, ${navy}, ${blue})` }}
          >
            O
          </div>
        </div>
      </header>
      <main className="max-w-[1280px] mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  iconBg,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  iconBg: string;
  accent?: string;
}) {
  return (
    <GlassCard className="p-5 relative overflow-hidden">
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: accent }} />
      )}
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#94A3B8" }}>
            {label}
          </p>
          <p className="text-[26px] leading-tight font-extrabold mt-1 tabular-nums" style={{ color: navy }}>
            {value}
          </p>
          <p className="text-xs mt-1 truncate" style={{ color: "#64748B" }}>
            {sub}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}

/** Parses the engine's "[SEVERITY] CODE: message" flag strings (see
 * app/engine/policy.py's _parse_severity) into a severity pill + a
 * humanized code + the plain message, instead of showing the raw
 * bracket-and-underscore string a machine would log. */
export function FlagBadge({ flag }: { flag: string }) {
  const match = /^\[(HIGH|MEDIUM|LOW)\]\s*([A-Z0-9_]+):\s*(.*)$/.exec(flag);
  const sevMap: Record<string, { bg: string; text: string; label: string }> = {
    HIGH: { bg: "#FEF2F2", text: danger, label: "High" },
    MEDIUM: { bg: "#FFFBEB", text: warning, label: "Medium" },
    LOW: { bg: "#F1F5F9", text: "#64748B", label: "Low" },
  };
  if (!match) {
    return (
      <div className="flex items-start gap-2.5">
        <span className="px-2 py-0.5 rounded text-xs font-bold shrink-0" style={{ background: "#F1F5F9", color: "#64748B" }}>
          Flag
        </span>
        <p className="text-sm" style={{ color: "#374151" }}>{flag}</p>
      </div>
    );
  }
  const [, severity, code, message] = match;
  const sev = sevMap[severity] || sevMap.LOW;
  const codeLabel = code
    .toLowerCase()
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
  return (
    <div className="flex items-start gap-2.5">
      <span className="px-2 py-0.5 rounded text-xs font-bold shrink-0" style={{ background: sev.bg, color: sev.text }}>
        {sev.label}
      </span>
      <p className="text-sm" style={{ color: "#374151" }}>
        <strong style={{ color: navy }}>{codeLabel}</strong> — {message}
      </p>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
          <h3 className="font-semibold text-base" style={{ color: navy }}>{title}</h3>
          <button onClick={onClose} className="text-lg leading-none px-1" style={{ color: "#94A3B8" }}>
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
