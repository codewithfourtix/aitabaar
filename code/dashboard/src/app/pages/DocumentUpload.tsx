import { useState } from "react";
import { Upload, CheckCircle2, FileText, X } from "lucide-react";
import { ApplicantShell, GlassCard, StepProgress, PrimaryBtn, SecondaryBtn, navy, blue, success, danger } from "../shared";

const STEPS = ["Consent", "Your Business", "Documents", "Review"];

type DocState = "empty" | "uploaded";

interface Doc {
  id: string;
  label: string;
  hint: string;
  state: DocState;
  filename?: string;
  size?: string;
}

export default function DocumentUpload({ onNav }: { onNav: (p: string) => void }) {
  const [docs, setDocs] = useState<Doc[]>([
    { id: "cnic", label: "CNIC (front)", hint: "JPG, PNG · max 10 MB", state: "empty" },
    {
      id: "bank",
      label: "Bank statement (last 6 months)",
      hint: "PDF or photos · max 10 MB",
      state: "uploaded",
      filename: "bank_statement.pdf",
      size: "1.4 MB",
    },
    { id: "bill", label: "Utility bill", hint: "JPG, PNG, PDF · max 10 MB", state: "empty" },
  ]);

  const uploaded = docs.filter((d) => d.state === "uploaded").length;
  const allDone = uploaded === docs.length;

  const toggle = (id: string) =>
    setDocs((prev) =>
      prev.map((d) =>
        d.id === id
          ? d.state === "empty"
            ? { ...d, state: "uploaded", filename: `${id}.${id === "bank" ? "pdf" : "jpg"}`, size: "0.9 MB" }
            : { ...d, state: "empty", filename: undefined, size: undefined }
          : d
      )
    );

  return (
    <ApplicantShell onNav={onNav}>
      <StepProgress steps={STEPS} current={2} />

      <GlassCard className="p-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold" style={{ color: navy }}>Upload your documents</h2>
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
              Take a clear photo or upload a file for each.
            </p>
          </div>
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "#EFF6FF", color: blue }}
          >
            {uploaded} of 3 uploaded
          </span>
        </div>

        {/* Mini progress */}
        <div className="w-full h-1.5 rounded-full mb-6 mt-3" style={{ background: "#E2E8F0" }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${(uploaded / 3) * 100}%`, background: blue }}
          />
        </div>

        <div className="space-y-4">
          {docs.map((doc) => (
            <div key={doc.id}>
              {doc.state === "uploaded" ? (
                <div
                  className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{ borderColor: "rgba(5,150,105,0.3)", background: "#ECFDF5" }}
                >
                  <CheckCircle2 size={20} color={success} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: navy }}>{doc.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                      {doc.filename} · {doc.size}
                    </p>
                  </div>
                  <button
                    onClick={() => toggle(doc.id)}
                    className="text-xs font-medium hover:underline flex items-center gap-1"
                    style={{ color: danger }}
                  >
                    <X size={12} /> Remove
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => toggle(doc.id)}
                  className="w-full flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed transition-all hover:border-blue-400 hover:bg-blue-50"
                  style={{ borderColor: "rgba(15,23,42,0.15)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "#EFF6FF" }}
                  >
                    <Upload size={18} color={blue} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: navy }}>{doc.label}</p>
                  <p className="text-xs" style={{ color: "#64748B" }}>
                    Drag file here or tap to upload / take photo
                  </p>
                  <p className="text-xs" style={{ color: "#94A3B8" }}>{doc.hint}</p>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-8">
          <SecondaryBtn onClick={() => onNav("business")}>← Back</SecondaryBtn>
          <div className="flex-1">
            <PrimaryBtn onClick={() => onNav("review")} disabled={!allDone}>
              Continue →
            </PrimaryBtn>
          </div>
        </div>
      </GlassCard>
    </ApplicantShell>
  );
}
