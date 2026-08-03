import { useState } from "react";
import { dbGetAllReflections, dbClearAll } from "../lib/db.js";
import {
  pageWrap,
  pageTitle,
  pageSubtitle,
  settingsSection,
  settingsTitle,
  settingsDesc,
  ghostBtn,
} from "../lib/styles.js";

// ── Toggle button group ───────────────────────────────────────────────────────
function OptionGroup({ label: groupLabel, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--on-surface-var)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {groupLabel}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: "8px 18px",
              borderRadius: 40,
              border: "1px solid",
              borderColor: value === o.value ? "var(--primary)" : "var(--outline-ghost)",
              background: value === o.value ? "var(--primary)" : "transparent",
              color: value === o.value ? "var(--on-primary)" : "var(--on-surface-var)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────
export default function SettingsTab({
  theme,
  setTheme,
  fontSize,
  setFontSize,
  fontFamily,
  setFontFamily,
  showToast,
}) {
  const [confirmClear, setConfirmClear] = useState(false);

  // Export all reflections as JSON
  const handleExportJSON = async () => {
    try {
      const data = await dbGetAllReflections();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `names-of-allah-reflections-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Exported successfully ✓");
    } catch {
      showToast("Export failed", "error");
    }
  };

  // Export as Markdown
  const handleExportMD = async () => {
    try {
      const data = await dbGetAllReflections();
      const lines = ["# My Names of Allah Reflections\n"];
      data.forEach((r) => {
        lines.push(`## ${r.nameId}\n_Updated: ${new Date(r.updatedAt).toLocaleDateString()}_\n`);
        if (r.notes?.trim()) lines.push(`### Notes\n${r.notes.trim()}\n`);
        if (r.actionItems?.some((a) => a?.trim())) {
          lines.push(`### Action Items`);
          r.actionItems.filter((a) => a?.trim()).forEach((a) => lines.push(`- ${a}`));
          lines.push("");
        }
        if (r.duas?.trim()) lines.push(`### Du'a\n${r.duas.trim()}\n`);
        lines.push("---\n");
      });
      const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `names-of-allah-reflections-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Exported as Markdown ✓");
    } catch {
      showToast("Export failed", "error");
    }
  };

  const handleClearData = async () => {
    await dbClearAll();
    setConfirmClear(false);
    showToast("All reflections cleared", "info");
  };

  return (
    <div style={pageWrap}>
      <h1 style={pageTitle}>Settings</h1>
      <p style={pageSubtitle}>Customize your reading experience</p>

      {/* Appearance */}
      <div style={settingsSection}>
        <div style={settingsTitle}>Appearance</div>

        <OptionGroup
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "system", label: "System" },
            { value: "light",  label: "Light" },
            { value: "dark",   label: "Dark" },
            { value: "sepia",  label: "Sepia" },
          ]}
        />

        <OptionGroup
          label="Text Size"
          value={fontSize}
          onChange={setFontSize}
          options={[
            { value: "sm", label: "Small" },
            { value: "md", label: "Medium" },
            { value: "lg", label: "Large" },
            { value: "xl", label: "X-Large" },
          ]}
        />

        <OptionGroup
          label="Reading Font"
          value={fontFamily}
          onChange={setFontFamily}
          options={[
            { value: "serif",     label: "Serif (Merriweather)" },
            { value: "sans-serif", label: "Sans-serif (DM Sans)" },
          ]}
        />
      </div>

      {/* Data */}
      <div style={settingsSection}>
        <div style={settingsTitle}>Your Data</div>
        <div style={settingsDesc}>
          All your reflections are stored privately on your device — nothing is sent to any server. 
          You can export them at any time.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            id="export-json-btn"
            onClick={handleExportJSON}
            style={{ ...ghostBtn, fontSize: 12, padding: "7px 16px" }}
          >
            Export JSON
          </button>
          <button
            id="export-md-btn"
            onClick={handleExportMD}
            style={{ ...ghostBtn, fontSize: 12, padding: "7px 16px" }}
          >
            Export Markdown
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div style={{ ...settingsSection, borderColor: "rgba(185,28,28,0.15)" }}>
        <div style={{ ...settingsTitle, color: "#b91c1c" }}>Clear All Data</div>
        <div style={settingsDesc}>
          Permanently deletes all your reflections from this device. This cannot be undone.
        </div>
        {!confirmClear ? (
          <button
            onClick={() => setConfirmClear(true)}
            style={{ ...ghostBtn, fontSize: 12, padding: "7px 16px", borderColor: "#b91c1c", color: "#b91c1c" }}
          >
            Clear all reflections
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleClearData}
              style={{
                ...ghostBtn,
                fontSize: 12,
                padding: "7px 16px",
                background: "#b91c1c",
                color: "#fff",
                border: "none",
              }}
            >
              Yes, delete everything
            </button>
            <button
              onClick={() => setConfirmClear(false)}
              style={{ ...ghostBtn, fontSize: 12, padding: "7px 16px" }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* About */}
      <div style={settingsSection}>
        <div style={settingsTitle}>About</div>
        <div style={settingsDesc}>
          Based on <em>Reflecting on the Names of Allah</em> by Jinan Yousef, 
          published at VirtualMosque.com. This PWA is a personal reading and reflection tool.
          All content copyright Jinan Yousef / VirtualMosque.com.
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "var(--on-surface-var)",
            letterSpacing: "0.04em",
          }}
        >
          Local-first · Offline-ready · Privacy-first
        </div>
      </div>
    </div>
  );
}
