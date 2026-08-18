import { useState, useEffect, useMemo } from "react";
import { dbGetAllReflections, dbDeleteReflection } from "../lib/db.js";
import { pageWrap, pageTitle, pageSubtitle, card, chipBtn, skeletonLine } from "../lib/styles.js";

function ReflectionCard({ reflection, chapter, onDelete, onGoToReflection }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasNotes   = reflection.notes?.trim();
  const hasDuas    = reflection.duas?.trim();
  const hasActions = reflection.actionItems?.some((a) => a?.trim());

  const date = new Date(reflection.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div style={card}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
          gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 17,
              fontWeight: 600,
              color: "var(--on-surface)",
              marginBottom: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {chapter?.title ?? reflection.nameId}
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              color: "var(--on-surface-var)",
            }}
          >
            {chapter?.arabicName} · Updated {date}
          </div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 4, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {hasNotes   && <span style={{ fontSize: 10, background: "var(--surface-low)", borderRadius: 40, padding: "2px 8px", color: "var(--on-surface-var)", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>Notes</span>}
          {hasDuas    && <span style={{ fontSize: 10, background: "var(--surface-low)", borderRadius: 40, padding: "2px 8px", color: "var(--on-surface-var)", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>Du'a</span>}
          {hasActions && <span style={{ fontSize: 10, background: "var(--surface-low)", borderRadius: 40, padding: "2px 8px", color: "var(--on-surface-var)", fontFamily: "'DM Sans',sans-serif", fontWeight: 600 }}>Actions</span>}
        </div>
      </div>

      {/* Preview snippet */}
      {hasNotes && (
        <p
          style={{
            fontFamily: "'Merriweather', Georgia, serif",
            fontSize: 13,
            lineHeight: 1.7,
            color: "var(--on-surface-var)",
            marginBottom: 14,
          }}
        >
          "{reflection.notes.trim()}"
        </p>
      )}

      {/* Action items – show all */}
      {hasActions && (
        <div style={{ marginBottom: 14 }}>
          {reflection.actionItems
            .filter((a) => a?.trim())
            .map((a, idx) => (
              <div
                key={idx}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "var(--on-surface-var)",
                  display: "flex",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "var(--primary)", flexShrink: 0 }}>▸</span>
                <span>{a}</span>
              </div>
            ))}
        </div>
      )}

      {/* Du'a */}
      {hasDuas && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--primary)",
              marginBottom: 4,
            }}
          >
            ☽ Du'a
          </div>
          <p
            style={{
              fontFamily: "'Merriweather', Georgia, serif",
              fontSize: 12,
              lineHeight: 1.7,
              color: "var(--on-surface-var)",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            {reflection.duas.trim()}
          </p>
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => onGoToReflection(reflection.nameId)}
          style={{ ...chipBtn, background: "var(--primary)", color: "var(--on-primary)", fontWeight: 600 }}
        >
          Open & Edit →
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ ...chipBtn, color: "#b91c1c" }}
          >
            Delete
          </button>
        ) : (
          <>
            <button
              onClick={() => onDelete(reflection.nameId)}
              style={{ ...chipBtn, background: "#b91c1c", color: "#fff", fontWeight: 600 }}
            >
              Confirm delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={chipBtn}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Journal Tab ───────────────────────────────────────────────────────────────
export default function JournalTab({ chapters, onGoToChapter, showToast }) {
  const [reflections, setReflections] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filterHasActions, setFilterHasActions] = useState(false);

  const load = () => {
    dbGetAllReflections().then((data) => {
      const hasContent = (r) =>
        (r.notes && r.notes.trim()) ||
        (r.duas && r.duas.trim()) ||
        (r.actionItems && r.actionItems.some((a) => a?.trim()));
      setReflections(data.filter(hasContent));
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const chapterMap = useMemo(() => {
    const m = {};
    if (chapters) chapters.forEach((c) => (m[c.id] = c));
    return m;
  }, [chapters]);

  const filtered = useMemo(() => {
    return reflections.filter((r) => {
      const ch = chapterMap[r.nameId];
      const q  = search.toLowerCase();
      const matchesSearch =
        !q ||
        (ch?.title.toLowerCase().includes(q)) ||
        (r.notes?.toLowerCase().includes(q)) ||
        (r.duas?.toLowerCase().includes(q));
      const matchesAction =
        !filterHasActions ||
        r.actionItems?.some((a) => a?.trim());
      return matchesSearch && matchesAction;
    });
  }, [reflections, search, filterHasActions, chapterMap]);

  const handleDelete = async (nameId) => {
    await dbDeleteReflection(nameId);
    showToast("Reflection deleted", "info");
    load();
  };

  return (
    <div style={pageWrap}>
      <h1 style={pageTitle}>My Reflections</h1>
      <p style={pageSubtitle}>
        {loading
          ? "Loading…"
          : `${reflections.length} reflection${reflections.length !== 1 ? "s" : ""} recorded`}
      </p>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--on-surface-var)",
            fontSize: 15,
            pointerEvents: "none",
          }}
        >
          ⌕
        </span>
        <input
          type="search"
          placeholder="Search your reflections…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            background: "var(--surface-lowest)",
            border: "1px solid var(--outline-ghost)",
            borderRadius: 12,
            padding: "12px 14px 12px 40px",
            color: "var(--on-surface)",
            fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            outline: "none",
          }}
        />
      </div>

      {/* Filter */}
      <div style={{ marginBottom: 22 }}>
        <button
          onClick={() => setFilterHasActions((v) => !v)}
          style={{
            padding: "6px 14px",
            borderRadius: 40,
            border: "1px solid",
            borderColor: filterHasActions ? "var(--primary)" : "var(--outline-ghost)",
            background: filterHasActions ? "var(--primary)" : "transparent",
            color: filterHasActions ? "var(--on-primary)" : "var(--on-surface-var)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
        >
          Has action items
        </button>
      </div>

      {/* Content */}
      {loading ? (
        [1, 2, 3].map((k) => (
          <div key={k} style={{ ...card, marginBottom: 12 }}>
            <div style={skeletonLine(50)} />
            <div style={skeletonLine(25)} />
            <div style={{ ...skeletonLine(90), marginTop: 12 }} />
            <div style={skeletonLine(70)} />
          </div>
        ))
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--on-surface-var)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 14 }}>
            {reflections.length === 0 ? "✦" : "⌕"}
          </div>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 15, color: "var(--on-surface)" }}>
            {reflections.length === 0
              ? "No reflections yet"
              : "No matching reflections"}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 260, margin: "0 auto" }}>
            {reflections.length === 0
              ? "Open a chapter from the Index and start writing. Your thoughts will appear here."
              : "Try a different search term."}
          </div>
        </div>
      ) : (
        filtered.map((r) => (
          <ReflectionCard
            key={r.nameId}
            reflection={r}
            chapter={chapterMap[r.nameId]}
            onDelete={handleDelete}
            onGoToReflection={onGoToChapter}
          />
        ))
      )}
    </div>
  );
}
