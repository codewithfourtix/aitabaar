import React from "react";
import { Check, ChevronRight } from "lucide-react";

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
      <div
        className={`${small ? "w-8 h-8" : "w-9 h-9"} rounded-full flex items-center justify-center text-white font-bold text-sm shadow`}
        style={{ background: `linear-gradient(135deg, ${navy}, ${blue})` }}
      >
        A
      </div>
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

export function StepProgress({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="flex items-center w-full mb-8">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: done ? success : active ? blue : "white",
                  color: done || active ? "white" : "#94A3B8",
                  border: done || active ? "none" : "2px solid #E2E8F0",
                }}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap"
                style={{ color: active ? navy : done ? success : "#94A3B8" }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-4 rounded-full"
                style={{ background: done ? success : "#E2E8F0" }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function PrimaryBtn({
  children,
  onClick,
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-3.5 rounded-xl text-white font-semibold text-base transition-all ${className}`}
      style={{
        background: disabled ? "#CBD5E1" : `linear-gradient(135deg, ${blue}, ${navy})`,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : `0 4px 16px rgba(30,136,229,0.3)`,
      }}
    >
      {children}
    </button>
  );
}

export function SecondaryBtn({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3 px-5 rounded-xl font-semibold text-sm transition-all border ${className}`}
      style={{ color: navy, borderColor: "rgba(10,45,110,0.2)", background: "transparent" }}
    >
      {children}
    </button>
  );
}

export function LangToggle() {
  const [lang, setLang] = React.useState<"EN" | "UR">("EN");
  return (
    <button
      onClick={() => setLang(lang === "EN" ? "UR" : "EN")}
      className="flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm font-medium transition-all"
      style={{ borderColor: "rgba(10,45,110,0.15)", color: navy, background: "white" }}
    >
      <span style={{ opacity: lang === "EN" ? 1 : 0.5 }}>EN</span>
      <span style={{ color: "#CBD5E1" }}>/</span>
      <span style={{ opacity: lang === "UR" ? 1 : 0.5, fontFamily: "serif" }}>اردو</span>
    </button>
  );
}

export function ApplicantShell({
  children,
  onNav,
}: {
  children: React.ReactNode;
  onNav: (page: string) => void;
}) {
  return (
    <div className="min-h-screen" style={{ background: pageBg, fontFamily: "Inter, sans-serif" }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 border-b"
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          borderColor: "rgba(15,23,42,0.06)",
        }}
      >
        <button onClick={() => onNav("landing")}>
          <AitbaarLogo />
        </button>
        <LangToggle />
      </header>
      <div className="px-4 py-6 max-w-xl mx-auto">{children}</div>
    </div>
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
    { id: "configure", label: "Configuration" },
  ];
  return (
    <div className="min-h-screen" style={{ background: pageBg, fontFamily: "Inter, sans-serif" }}>
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b"
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(15,23,42,0.06)",
        }}
      >
        <div className="flex items-center gap-8">
          <AitbaarLogo />
          <nav className="flex items-center gap-1">
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
          <button
            onClick={() => onNav("landing")}
            className="text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors hover:bg-gray-50"
            style={{ borderColor: "rgba(15,23,42,0.1)", color: "#64748B" }}
          >
            Applicant Portal ↗
          </button>
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  iconBg: string;
}) {
  return (
    <GlassCard className="p-5 flex items-start gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#64748B" }}>
          {label}
        </p>
        <p className="text-2xl font-bold mt-0.5" style={{ color: navy }}>
          {value}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>
          {sub}
        </p>
      </div>
    </GlassCard>
  );
}
