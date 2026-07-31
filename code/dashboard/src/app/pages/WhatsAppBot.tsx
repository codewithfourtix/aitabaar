import { useState } from "react";
import {
  MessageCircle, Bot, CheckCircle2, Clock, Users, TrendingUp, Settings,
  Activity, FileText, Zap, Phone, MoreVertical, ArrowLeft, Send, Image,
  Paperclip, RefreshCw, AlertTriangle, Globe, Search,
} from "lucide-react";
import { DashboardShell, GlassCard, Badge, StatCard, navy, blue, success, warning, danger, indigo, waGreen, waDark } from "../shared";

const waBg = "#ECE5DD";

type Bubble =
  | { from: "user"; text?: string; image?: string; time: string }
  | { from: "bot"; text: string; time: string };

const conversation: Bubble[] = [
  { from: "user", text: "Assalam-o-Alaikum, loan apply karna hai", time: "10:02" },
  { from: "bot", text: "Wa Alaikum Assalam! 👋 Aitbaar mein khush aamdeed.\n\nApni zubaan chunein / Choose your language:\n\n1️⃣ اردو\n2️⃣ English", time: "10:02" },
  { from: "user", text: "2", time: "10:03" },
  { from: "bot", text: "Great! Welcome to *Aitbaar* — your trusted SME loan partner.\n\nBefore we begin, you'll need:\n📄 CNIC (front photo)\n🏦 Bank statement (last 6 months)\n💡 Recent utility bill\n\nReply *YES* to give consent for AI-assisted document review.", time: "10:03" },
  { from: "user", text: "YES", time: "10:05" },
  { from: "bot", text: "✅ Consent recorded. Your reference: *AITB-2847*\n\nPlease send a clear photo of your *CNIC (front side)*. All 4 corners must be visible.", time: "10:05" },
  { from: "user", image: "cnic", time: "10:07" },
  { from: "bot", text: "✅ *CNIC verified*\nName: Muhammad Imran\nCNIC: 42101-XXXXXXX-1\n\nNow please send your *bank statement* (last 6 months) as a PDF or photos.", time: "10:07" },
  { from: "user", image: "bank", time: "10:11" },
  { from: "bot", text: "⚠️ Your statement covers *3 months*. We need at least 6 months.\n\nOptions:\n1️⃣ Upload additional months\n2️⃣ Proceed with partial statement (may affect limit)\n\nReply 1 or 2.", time: "10:11" },
];

function WaBubble({ bubble }: { bubble: Bubble }) {
  const isBot = bubble.from === "bot";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} mb-1.5`}>
      <div
        className="max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm"
        style={{
          background: isBot ? "#ffffff" : "#DCF8C6",
          color: "#111827",
          borderRadius: isBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
        }}
      >
        {bubble.image ? (
          <div className="w-40 h-24 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-medium" style={{ background: "#E5E7EB", color: "#6B7280" }}>
            <Image size={20} />
            {bubble.image === "cnic" ? "cnic_front.jpg" : "bank_statement.pdf"}
          </div>
        ) : (
          <p
            className="whitespace-pre-line leading-relaxed"
            dangerouslySetInnerHTML={{ __html: bubble.text!.replace(/\*(.*?)\*/g, "<strong>$1</strong>") }}
          />
        )}
        <div className="flex items-center justify-end gap-1 mt-0.5">
          <span className="text-[10px]" style={{ color: "#94A3B8" }}>{bubble.time}</span>
          {!isBot && (
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
              <path d="M1 5l3 3 5-7" stroke={waGreen} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 5l3 3 5-7" stroke={waGreen} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function WhatsAppMockup() {
  return (
    <div
      className="w-full max-w-[300px] mx-auto rounded-[36px] overflow-hidden"
      style={{ background: "#1a1a1a", padding: "8px", boxShadow: "0 30px 80px rgba(10,45,110,0.25)" }}
    >
      <div className="rounded-[28px] overflow-hidden" style={{ background: waBg }}>
        <div className="flex items-center justify-between px-5 py-2 text-white text-xs font-medium" style={{ background: waDark }}>
          <span>10:11</span><span>●●●</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: waDark }}>
          <ArrowLeft size={18} color="white" />
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ background: `linear-gradient(135deg, ${navy}, ${blue})` }}>A</div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Aitbaar Bot</p>
            <p className="text-green-300 text-xs">online</p>
          </div>
          <Phone size={16} color="white" />
          <MoreVertical size={16} color="white" />
        </div>
        <div className="h-[380px] overflow-y-auto px-2 py-3" style={{ background: waBg }}>
          <div className="text-center text-xs rounded-lg px-3 py-1 mx-auto mb-3 w-fit font-medium" style={{ background: "rgba(0,0,0,0.12)", color: "#555" }}>Today</div>
          {conversation.map((b, i) => <WaBubble key={i} bubble={b} />)}
          <div className="flex justify-start mb-1.5">
            <div className="rounded-2xl px-4 py-2.5 bg-white" style={{ borderRadius: "4px 16px 16px 16px" }}>
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: "#94A3B8", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-2" style={{ background: "#F0F0F0" }}>
          <div className="flex-1 flex items-center gap-2 bg-white rounded-full px-3 py-1.5">
            <span className="text-sm text-gray-400 flex-1">Type a message…</span>
            <Paperclip size={14} color="#94A3B8" />
          </div>
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: waGreen }}>
            <Send size={14} color="white" />
          </div>
        </div>
      </div>
    </div>
  );
}

const flowNodes = [
  { label: "User sends any message", type: "trigger" },
  { label: "Language selection (EN / اردو)", type: "bot" },
  { label: "Consent & document checklist", type: "bot" },
  { label: "Collect CNIC photo", type: "bot" },
  { label: "AI: OCR + validation", type: "ai" },
  { label: "Collect bank statement", type: "bot" },
  { label: "AI: Statement analysis", type: "ai" },
  { label: "Collect utility bill", type: "bot" },
  { label: "AI: Credit scoring", type: "ai" },
  { label: "Notify officer dashboard", type: "action" },
];

const sessions = [
  { name: "Muhammad Imran", phone: "+92 300 ●●●●247", step: "Bank statement", status: "active", time: "2m ago" },
  { name: "Sana Malik", phone: "+92 321 ●●●●083", step: "CNIC upload", status: "active", time: "5m ago" },
  { name: "Ayesha Khan", phone: "+92 333 ●●●●512", step: "Consent", status: "idle", time: "12m ago" },
  { name: "Tariq Mehmood", phone: "+92 345 ●●●●778", step: "Completed ✓", status: "done", time: "18m ago" },
  { name: "Rubina Parveen", phone: "+92 311 ●●●●904", step: "Utility bill", status: "active", time: "22m ago" },
];

const configItems = [
  { label: "WhatsApp Number", value: "+92 21 111-AITBAAR" },
  { label: "Business Account", value: "UBL × Aitbaar (verified)" },
  { label: "Message language", value: "Auto-detect (EN / اردو)" },
  { label: "Timeout (idle session)", value: "30 minutes" },
  { label: "Max retries per doc", value: "3 attempts" },
  { label: "AI model", value: "GPT-4o Vision + OCR" },
];

type Tab = "overview" | "flow" | "sessions" | "config";

export default function WhatsAppBot({ onNav }: { onNav: (p: string) => void }) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <DashboardShell onNav={onNav} active="whatsapp">
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes pulsedot { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Page heading */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${waGreen}, #128C7E)` }}>
            <MessageCircle size={20} color="white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: navy }}>WhatsApp Bot Integration</h1>
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>Conversational loan origination via WhatsApp Business API</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: "#F0FFF4", color: waDark }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: waGreen, animation: "pulsedot 2s infinite" }} />
            Bot Live
          </span>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${waGreen}, #128C7E)` }}
          >
            <Zap size={14} /> Test Bot
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Users size={20} color={waGreen} />} label="Active Sessions" value="14" sub="3 waiting for doc" iconBg="#F0FFF4" />
        <StatCard icon={<FileText size={20} color={blue} />} label="Apps via WhatsApp" value="64%" sub="89 of 139 total" iconBg="#EFF6FF" />
        <StatCard icon={<TrendingUp size={20} color={success} />} label="Completion Rate" value="78%" sub="+5% vs last week" iconBg="#ECFDF5" />
        <StatCard icon={<Clock size={20} color={indigo} />} label="Avg. Response Time" value="1.4 s" sub="Bot reply latency" iconBg="#EEF2FF" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "rgba(15,23,42,0.05)" }}>
        {([
          { id: "overview", label: "Overview", icon: <Activity size={14} /> },
          { id: "flow", label: "Conversation Flow", icon: <Bot size={14} /> },
          { id: "sessions", label: "Active Sessions", icon: <Users size={14} /> },
          { id: "config", label: "Configuration", icon: <Settings size={14} /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.id ? { background: "white", color: navy, boxShadow: "0 1px 4px rgba(10,45,110,0.1)" } : { color: "#64748B" }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-6">
          <GlassCard className="p-6 flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-5">
              <div>
                <h3 className="font-semibold text-base" style={{ color: navy }}>Live Conversation Preview</h3>
                <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>Session AITB-2847 — Muhammad Imran</p>
              </div>
              <Badge label="Active" color="wa" />
            </div>
            <WhatsAppMockup />
          </GlassCard>

          <div className="flex flex-col gap-4">
            <GlassCard className="p-5">
              <h3 className="font-semibold text-base mb-4" style={{ color: navy }}>Applications by Channel</h3>
              {[
                { label: "WhatsApp Bot", pct: 64, count: 89, icon: <MessageCircle size={14} color={waGreen} />, color: waGreen },
                { label: "Web Portal", pct: 28, count: 39, icon: <Globe size={14} color={blue} />, color: blue },
                { label: "Branch / Manual", pct: 8, count: 11, icon: <Users size={14} color="#94A3B8" />, color: "#94A3B8" },
              ].map((row) => (
                <div key={row.label} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#374151" }}>{row.icon}{row.label}</div>
                    <span className="text-xs font-semibold" style={{ color: "#374151" }}>{row.count} ({row.pct}%)</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ background: "#F1F5F9" }}>
                    <div className="h-2 rounded-full" style={{ width: `${row.pct}%`, background: row.color }} />
                  </div>
                </div>
              ))}
            </GlassCard>

            <GlassCard className="p-5">
              <h3 className="font-semibold text-base mb-3" style={{ color: navy }}>Recent Alerts</h3>
              {[
                { msg: "Sana Malik hasn't responded in 15 minutes", type: "warn" },
                { msg: "New session started: Tariq Mehmood", type: "info" },
                { msg: "CNIC OCR failed — manual review needed (Hussain)", type: "err" },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2.5 rounded-xl mb-2 last:mb-0"
                  style={{ background: a.type === "warn" ? "#FFFBEB" : a.type === "err" ? "#FEF2F2" : "#EFF6FF", color: a.type === "warn" ? warning : a.type === "err" ? danger : blue }}>
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />{a.msg}
                </div>
              ))}
            </GlassCard>
          </div>
        </div>
      )}

      {/* Flow */}
      {tab === "flow" && (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2">
            <GlassCard className="p-6">
              <h3 className="font-semibold text-base mb-6" style={{ color: navy }}>Bot Decision Tree</h3>
              {flowNodes.map((node, i) => {
                const cm: Record<string, { bg: string; text: string; border: string }> = {
                  trigger: { bg: "#F0FFF4", text: waDark, border: waGreen },
                  bot: { bg: "#EFF6FF", text: navy, border: blue },
                  ai: { bg: "#EEF2FF", text: indigo, border: indigo },
                  action: { bg: "#ECFDF5", text: success, border: success },
                };
                const c = cm[node.type];
                const tl: Record<string, string> = { trigger: "Trigger", bot: "Bot message", ai: "AI processing", action: "System action" };
                return (
                  <div key={i} className="flex items-start gap-3 mb-1">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm shrink-0" style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}` }}>{i + 1}</div>
                      {i < flowNodes.length - 1 && <div className="w-px flex-1 my-1" style={{ background: "#E2E8F0", minHeight: 24 }} />}
                    </div>
                    <div className="flex-1 rounded-xl p-3 mb-2 flex items-center justify-between" style={{ background: c.bg, borderLeft: `3px solid ${c.border}` }}>
                      <p className="text-sm font-medium" style={{ color: c.text }}>{node.label}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-3" style={{ background: `${c.border}20`, color: c.text }}>{tl[node.type]}</span>
                    </div>
                  </div>
                );
              })}
            </GlassCard>
          </div>
          <div className="flex flex-col gap-4">
            <GlassCard className="p-5">
              <h4 className="font-semibold text-sm mb-3" style={{ color: navy }}>Node Types</h4>
              {[{ type: "Trigger", color: waGreen, desc: "User-initiated" }, { type: "Bot message", color: blue, desc: "WhatsApp reply" }, { type: "AI processing", color: indigo, desc: "Model inference" }, { type: "System action", color: success, desc: "Dashboard update" }].map((n) => (
                <div key={n.type} className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: n.color }} />
                  <div><p className="text-xs font-semibold" style={{ color: navy }}>{n.type}</p><p className="text-xs" style={{ color: "#64748B" }}>{n.desc}</p></div>
                </div>
              ))}
            </GlassCard>
            <GlassCard className="p-5">
              <h4 className="font-semibold text-sm mb-3" style={{ color: navy }}>Fallback Paths</h4>
              {[
                { t: "Invalid document", a: "Ask to re-upload (max 3×)" },
                { t: "OCR confidence < 70%", a: "Flag for manual review" },
                { t: "Session idle 30 min", a: "Send reminder, then close" },
                { t: "User types STOP", a: "Unsubscribe & log" },
              ].map((f) => (
                <div key={f.t} className="mb-3">
                  <p className="text-xs font-semibold" style={{ color: danger }}>If: {f.t}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>→ {f.a}</p>
                </div>
              ))}
            </GlassCard>
          </div>
        </div>
      )}

      {/* Sessions */}
      {tab === "sessions" && (
        <GlassCard>
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(15,23,42,0.06)" }}>
            <h3 className="font-semibold text-base" style={{ color: navy }}>Active WhatsApp Sessions</h3>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm" style={{ borderColor: "rgba(15,23,42,0.08)", color: "#64748B" }}>
              <Search size={14} /><input type="text" placeholder="Search…" className="outline-none bg-transparent w-36 text-sm" />
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(15,23,42,0.02)", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                {["Applicant", "Phone", "Current Step", "Status", "Last Activity", ""].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, i) => (
                <tr key={i} className="border-b hover:bg-gray-50" style={{ borderColor: "rgba(15,23,42,0.04)" }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${navy}, ${blue})` }}>{s.name.charAt(0)}</div>
                      <span className="font-medium" style={{ color: navy }}>{s.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4" style={{ color: "#64748B" }}>{s.phone}</td>
                  <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-lg text-xs font-medium" style={{ background: "#F1F5F9", color: navy }}>{s.step}</span></td>
                  <td className="px-6 py-4"><Badge label={s.status === "active" ? "Active" : s.status === "idle" ? "Idle" : "Done"} color={s.status === "active" ? "wa" : s.status === "idle" ? "amber" : "green"} /></td>
                  <td className="px-6 py-4 text-xs" style={{ color: "#94A3B8" }}>{s.time}</td>
                  <td className="px-6 py-4"><button className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-50" style={{ color: blue }}>View →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}

      {/* Config */}
      {tab === "config" && (
        <div className="grid grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h3 className="font-semibold text-base mb-4" style={{ color: navy }}>Bot Settings</h3>
            {configItems.map((c) => (
              <div key={c.label} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: "rgba(15,23,42,0.05)" }}>
                <span className="text-sm" style={{ color: "#64748B" }}>{c.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: navy }}>{c.value}</span>
                  <button style={{ color: blue }}><Settings size={13} /></button>
                </div>
              </div>
            ))}
            <button className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: `linear-gradient(135deg, ${navy}, ${blue})` }}>Save Changes</button>
          </GlassCard>
          <div className="flex flex-col gap-4">
            <GlassCard className="p-5">
              <h4 className="font-semibold text-sm mb-3" style={{ color: navy }}>Integration Health</h4>
              {[
                { label: "WhatsApp Business API", ok: true },
                { label: "Meta Cloud Webhook", ok: true },
                { label: "AI / OCR Service", ok: true },
                { label: "Aitbaar Core API", ok: true },
                { label: "SMS Fallback", ok: false },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: "rgba(15,23,42,0.05)" }}>
                  <span className="text-sm" style={{ color: "#374151" }}>{s.label}</span>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={14} color={s.ok ? success : "#94A3B8"} />
                    <span className="text-xs font-medium" style={{ color: s.ok ? success : "#94A3B8" }}>{s.ok ? "Connected" : "Standby"}</span>
                  </div>
                </div>
              ))}
            </GlassCard>
            <div className="rounded-2xl p-4 border" style={{ background: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.15)" }}>
              <p className="text-xs leading-relaxed" style={{ color: indigo }}>
                <strong>Consent & Compliance:</strong> All WhatsApp communications are subject to explicit user consent recorded at session start. AI processing is limited to this application only.
              </p>
              <p className="text-xs mt-1.5" style={{ color: "#94A3B8" }}>Pilot in partnership with UBL. Regulated under SBP Digital Lending Framework.</p>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
