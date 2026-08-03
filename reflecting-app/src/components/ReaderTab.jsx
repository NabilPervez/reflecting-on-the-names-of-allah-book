import { useState, useEffect, useCallback, useRef } from "react";
import {
  dbGetReflection,
  dbSaveReflection,
  dbToggleBookmark,
  dbGetAllBookmarks,
} from "../lib/db.js";
import { pageWrap, textarea, label, primaryBtn, ghostBtn, skeletonLine } from "../lib/styles.js";

import HTMLFlipBook from 'react-pageflip';

// ── Chapter body renderer ─────────────────────────────────────────────────────
function ChapterBody({ chapter }) {
  // Filter out any pages that might be undefined or zero if they exist
  const pages = chapter.pages || [];
  
  if (pages.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center' }}>No pages available for this chapter.</div>;
  }

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

      {/* Body FlipBook */}
      <div className="reader-body" style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
        <HTMLFlipBook
          width={350}
          height={500}
          size="stretch"
          minWidth={280}
          maxWidth={450}
          minHeight={400}
          maxHeight={650}
          maxShadowOpacity={0.5}
          showCover={false}
          mobileScrollSupport={true}
          style={{ margin: '0 auto' }}
        >
          {pages.map((p) => (
            <div key={p} className="demoPage" style={{ backgroundColor: '#fff', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
              <img
                src={`/pages/page_${p}.jpg`}
                alt={`Page ${p}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </HTMLFlipBook>
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
  const [activeView, setActiveView] = useState("read"); // "read" | "reflect"
  const [isBookmarked, setIsBookmarked] = useState(false);
  const isDesktop = window.innerWidth >= 768;

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

      {isDesktop ? (
        <>
          {/* Stacked Layout: Reading content followed by Reflection Panel (Desktop) */}
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
        </>
      ) : (
        <>
          {/* Mobile tab toggle */}
          <div
            style={{
              display: "flex",
              background: "var(--surface-lowest)",
              borderRadius: 12,
              padding: 4,
              marginBottom: 22,
              border: "1px solid var(--outline-ghost)",
            }}
          >
            {["read", "reflect"].map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                style={{
                  flex: 1,
                  padding: "9px 0",
                  borderRadius: 9,
                  border: "none",
                  background: activeView === v ? "var(--primary)" : "transparent",
                  color: activeView === v ? "var(--on-primary)" : "var(--on-surface-var)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  textTransform: "capitalize",
                }}
              >
                {v === "read" ? "✦ Read" : "✴ Reflect"}
              </button>
            ))}
          </div>

          {activeView === "read" ? (
            <ChapterBody chapter={chapter} />
          ) : (
            <ReflectionPanel chapter={chapter} showToast={showToast} />
          )}
        </>
      )}
    </div>
  );
}
