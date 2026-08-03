import { useState, useEffect, useCallback, useRef } from "react";
import {
  dbGetReflection,
  dbSaveReflection,
  dbToggleBookmark,
  dbGetAllBookmarks,
} from "../lib/db.js";
import { pageWrap, textarea, label, primaryBtn, ghostBtn, skeletonLine } from "../lib/styles.js";

// ── Chapter body renderer ─────────────────────────────────────────────────────
function ChapterBody({ chapter }) {
  return (
    <div>
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)",
          borderRadius: 16,
          padding: "28px 24px",
          marginBottom: 24,
          color: "var(--on-primary)",
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            opacity: 0.75,
            marginBottom: 8,
          }}
        >
          Chapter {String(chapter.number).padStart(2, "0")}
        </div>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: 8,
          }}
        >
          {chapter.title}
        </h2>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            opacity: 0.85,
            fontStyle: "italic",
          }}
        >
          {chapter.arabicName} · {chapter.translation}
        </div>
      </div>

      {/* Body paragraphs */}
      <div className="reader-body">
        {chapter.body.map((para, i) => (
          <p
            key={i}
            style={{
              fontFamily: "'Merriweather', Georgia, serif",
              fontSize: "1em",
              lineHeight: 1.9,
              color: "var(--on-surface)",
              marginBottom: "1.4em",
              textAlign: "justify",
              hyphens: "auto",
            }}
          >
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}

// ── Reflection panel ──────────────────────────────────────────────────────────
function ReflectionPanel({ chapter, showToast }) {
  const [notes,       setNotes]       = useState("");
  const [duas,        setDuas]        = useState("");
  const [actionItems, setActionItems] = useState([""]);
  const [saving,      setSaving]      = useState(false);
  const [loaded,      setLoaded]      = useState(false);
  const debounceRef = useRef(null);

  // Load existing reflection
  useEffect(() => {
    setLoaded(false);
    dbGetReflection(chapter.id).then((r) => {
      if (r) {
        setNotes(r.notes ?? "");
        setDuas(r.duas ?? "");
        setActionItems(r.actionItems?.length ? r.actionItems : [""]);
      } else {
        setNotes("");
        setDuas("");
        setActionItems([""]);
      }
      setLoaded(true);
    });
  }, [chapter.id]);

  // Auto-save with 300ms debounce
  const save = useCallback(
    (n, d, ai) => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await dbSaveReflection({ nameId: chapter.id, notes: n, duas: d, actionItems: ai });
        } finally {
          setSaving(false);
        }
      }, 300);
    },
    [chapter.id]
  );

  const handleNotes = (v) => { setNotes(v); save(v, duas, actionItems); };
  const handleDuas  = (v) => { setDuas(v);  save(notes, v, actionItems); };
  const handleActionItem = (idx, v) => {
    const next = [...actionItems];
    next[idx] = v;
    setActionItems(next);
    save(notes, duas, next);
  };
  const addActionItem = () => {
    const next = [...actionItems, ""];
    setActionItems(next);
    save(notes, duas, next);
  };
  const removeActionItem = (idx) => {
    const next = actionItems.filter((_, i) => i !== idx);
    setActionItems(next.length ? next : [""]);
    save(notes, duas, next.length ? next : [""]);
  };

  if (!loaded) {
    return (
      <div style={{ padding: "24px 0" }}>
        <div style={skeletonLine(60)} />
        <div style={{ ...skeletonLine(90), marginBottom: 8 }} />
        <div style={skeletonLine(75)} />
        <div style={skeletonLine(50)} />
      </div>
    );
  }

  const fieldStyle = {
    ...textarea,
    display: "block",
    width: "100%",
    minHeight: 100,
    marginBottom: 4,
    fontSize: "inherit",
  };

  return (
    <div style={{ paddingTop: 8 }}>
      {/* Auto-save indicator */}
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          color: "var(--on-surface-var)",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: saving ? "var(--accent)" : "var(--primary)",
            display: "inline-block",
            transition: "background 0.3s ease",
          }}
        />
        {saving ? "Saving…" : "Auto-saved to your device"}
      </div>

      {/* Personal Notes */}
      <div style={{ marginBottom: 28 }}>
        <label style={label} htmlFor={`notes-${chapter.id}`}>
          ✦ Personal Notes
        </label>
        <textarea
          id={`notes-${chapter.id}`}
          value={notes}
          onChange={(e) => handleNotes(e.target.value)}
          placeholder="What does this Name of Allah mean to you? What did you learn? How did it make you feel?"
          style={fieldStyle}
          rows={5}
          onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--outline-ghost)")}
        />
      </div>

      {/* Action Items */}
      <div style={{ marginBottom: 28 }}>
        <label style={label}>✴ Action Items</label>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: "var(--on-surface-var)",
            marginBottom: 12,
          }}
        >
          How will you apply this Name in your daily life?
        </p>
        {actionItems.map((item, idx) => (
          <div
            key={idx}
            style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}
          >
            <span
              style={{
                marginTop: 12,
                fontSize: 14,
                color: "var(--primary)",
                flexShrink: 0,
              }}
            >
              ▸
            </span>
            <textarea
              value={item}
              onChange={(e) => handleActionItem(idx, e.target.value)}
              placeholder={`Action item ${idx + 1}…`}
              style={{ ...fieldStyle, minHeight: 48, marginBottom: 0, flex: 1 }}
              rows={2}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e)  => (e.target.style.borderColor = "var(--outline-ghost)")}
            />
            {actionItems.length > 1 && (
              <button
                onClick={() => removeActionItem(idx)}
                style={{
                  marginTop: 10,
                  background: "none",
                  border: "none",
                  color: "var(--on-surface-var)",
                  fontSize: 16,
                  cursor: "pointer",
                  flexShrink: 0,
                  lineHeight: 1,
                  opacity: 0.5,
                }}
                aria-label="Remove action item"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addActionItem}
          style={{
            ...ghostBtn,
            fontSize: 12,
            padding: "6px 14px",
            marginTop: 4,
          }}
        >
          + Add action item
        </button>
      </div>

      {/* Personal Du'a */}
      <div style={{ marginBottom: 28 }}>
        <label style={label} htmlFor={`duas-${chapter.id}`}>
          ☽ Personal Du'a
        </label>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: "var(--on-surface-var)",
            marginBottom: 12,
          }}
        >
          Write a personal supplication inspired by this Name.
        </p>
        <textarea
          id={`duas-${chapter.id}`}
          value={duas}
          onChange={(e) => handleDuas(e.target.value)}
          placeholder="O Allah, You are… I ask You by this Name to…"
          style={{ ...fieldStyle, minHeight: 80 }}
          rows={4}
          onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--outline-ghost)")}
        />
      </div>
    </div>
  );
}

// ── Reader Tab ────────────────────────────────────────────────────────────────
export default function ReaderTab({ chapter, onBack, showToast }) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (!chapter) return;
    dbGetAllBookmarks().then((bmarks) => {
      setIsBookmarked(bmarks.includes(chapter.id));
    });
  }, [chapter?.id]);

  const toggleBookmark = async () => {
    if (!chapter) return;
    const isNow = await dbToggleBookmark(chapter.id);
    setIsBookmarked(isNow);
    showToast(isNow ? "Bookmark added ◈" : "Bookmark removed", "info");
  };

  if (!chapter) {
    return (
      <div style={{ ...pageWrap, paddingTop: 48 }}>
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--on-surface-var)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>☽</div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 24,
              fontWeight: 600,
              color: "var(--on-surface)",
              marginBottom: 10,
            }}
          >
            No chapter selected
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.7, maxWidth: 280, margin: "0 auto" }}>
            Go to the Index tab and choose a Name to begin reading and reflecting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 24,
          position: "sticky",
          top: 0,
          background: "var(--surface)",
          padding: "10px 0",
          zIndex: 50,
          marginLeft: -2,
          marginRight: -2,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: "var(--surface-lowest)",
            border: "1px solid var(--outline-ghost)",
            borderRadius: 10,
            padding: "8px 14px",
            color: "var(--on-surface)",
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ← Index
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              color: "var(--on-surface-var)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {chapter.title}
          </div>
        </div>

        <button
          onClick={toggleBookmark}
          title={isBookmarked ? "Remove bookmark" : "Bookmark"}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this chapter"}
          style={{
            background: isBookmarked ? "var(--accent)" : "var(--surface-lowest)",
            border: "1px solid var(--outline-ghost)",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 14,
            cursor: "pointer",
            transition: "background 0.2s ease",
          }}
        >
          {isBookmarked ? "◈" : "◇"}
        </button>
      </div>

      {/* Stacked Layout: Reading content followed by Reflection Panel */}
      <div style={{ marginBottom: 40 }}>
        <ChapterBody chapter={chapter} />
      </div>

      <div
        style={{
          background: "var(--surface-lowest)",
          borderRadius: 16,
          padding: "24px",
          border: "1px solid var(--outline-ghost)",
          boxShadow: "0 4px 20px var(--shadow)",
          marginBottom: 60,
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 24,
            fontWeight: 600,
            color: "var(--on-surface)",
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: "1px solid var(--outline-ghost)",
          }}
        >
          Your Reflection
        </div>
        <ReflectionPanel chapter={chapter} showToast={showToast} />
      </div>
    </div>
  );
}
