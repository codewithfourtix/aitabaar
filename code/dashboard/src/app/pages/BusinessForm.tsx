import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { ApplicantShell, GlassCard, StepProgress, PrimaryBtn, SecondaryBtn, navy, blue } from "../shared";

const STEPS = ["Consent", "Your Business", "Documents", "Review"];

export default function BusinessForm({ onNav }: { onNav: (p: string) => void }) {
  const [years, setYears] = useState(3);
  const [bizType, setBizType] = useState("");
  const [sales, setSales] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");

  const isValid = bizType && years >= 0 && sales && amount && purpose;

  const fmtPKR = (val: string) => {
    const n = val.replace(/[^0-9]/g, "");
    return n ? Number(n).toLocaleString("en-PK") : "";
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all focus:ring-2";
  const inputStyle = { borderColor: "rgba(15,23,42,0.12)", color: navy };

  return (
    <ApplicantShell onNav={onNav}>
      <StepProgress steps={STEPS} current={1} />

      <GlassCard className="p-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: navy }}>Tell us about your business</h2>
        <p className="text-sm mb-6" style={{ color: "#64748B" }}>5 quick questions — takes about 2 minutes.</p>

        <div className="space-y-5">
          {/* Business type */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: navy }}>
              What type of business do you run?
            </label>
            <select
              value={bizType}
              onChange={(e) => setBizType(e.target.value)}
              className={inputCls}
              style={{ ...inputStyle, background: "white" }}
            >
              <option value="">Select business type…</option>
              <option>Kiryana / General store</option>
              <option>Tailoring</option>
              <option>Auto parts</option>
              <option>Electronics</option>
              <option>Other</option>
            </select>
          </div>

          {/* Years trading */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: navy }}>
              How many years have you been trading?
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setYears(Math.max(0, years - 1))}
                className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors hover:bg-gray-50"
                style={{ borderColor: "rgba(15,23,42,0.12)" }}
              >
                <Minus size={16} color={navy} />
              </button>
              <span className="text-2xl font-bold w-12 text-center" style={{ color: navy }}>{years}</span>
              <button
                onClick={() => setYears(years + 1)}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                style={{ background: blue }}
              >
                <Plus size={16} />
              </button>
              <span className="text-sm" style={{ color: "#64748B" }}>year{years !== 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Monthly sales */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: navy }}>
              Average monthly sales (PKR)
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
                style={{ color: "#94A3B8" }}
              >
                PKR
              </span>
              <input
                type="text"
                value={sales}
                onChange={(e) => setSales(fmtPKR(e.target.value))}
                placeholder="e.g. 150,000"
                className={`${inputCls} pl-14`}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Amount needed */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: navy }}>
              How much financing do you need (PKR)?
            </label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold"
                style={{ color: "#94A3B8" }}
              >
                PKR
              </span>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(fmtPKR(e.target.value))}
                placeholder="e.g. 300,000"
                className={`${inputCls} pl-14`}
                style={inputStyle}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: "#94A3B8" }}>
              Recommended range shown after AI review
            </p>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: navy }}>
              What will this loan be used for?
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              placeholder="e.g. Ramzan stock, new equipment…"
              className={inputCls}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-8">
          <SecondaryBtn onClick={() => onNav("consent")}>← Back</SecondaryBtn>
          <div className="flex-1">
            <PrimaryBtn onClick={() => onNav("documents")} disabled={!isValid}>
              Continue →
            </PrimaryBtn>
          </div>
        </div>
      </GlassCard>
    </ApplicantShell>
  );
}
