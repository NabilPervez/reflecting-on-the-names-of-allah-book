import { useState, useEffect, useCallback, useRef } from "react";
import {
  dbGetReflection,
  dbSaveReflection,
  dbToggleBookmark,
  dbGetAllBookmarks,
  dbGetBookmark,
  dbUpdateBookmarkPage,
} from "../lib/db.js";
import { pageWrap, textarea, label, primaryBtn, ghostBtn, skeletonLine } from "../lib/styles.js";

import HTMLFlipBook from 'react-pageflip';

// ── Chapter body renderer ─────────────────────────────────────────────────────
function ChapterBody({ chapter, isDesktop, initialPage, onPageChange }) {
  const pages = chapter.pages || [];
  const flipBookRef = useRef(null);

  // Pinch-to-zoom state
  const wrapperRef   = useRef(null);
  const zoomRef      = useRef(1);
  const originRef    = useRef({ x: 0, y: 0 });
  const lastDistRef  = useRef(null);

  useEffect(() => {
    if (flipBookRef.current && initialPage > 0) {
      try {
        flipBookRef.current.pageFlip().turnToPage(initialPage);
      } catch (e) {
        console.error("Error turning to page", e);
      }
    }
  }, [initialPage, pages.length]);

  // Pinch-to-zoom touch handlers
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const getDistance = (t) =>
      Math.hypot(t[1].clientX - t[0].clientX, t[1].clientY - t[0].clientY);

    const getMidpoint = (t) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
    });

    const applyZoom = () => {
      el.style.transformOrigin = `${originRef.current.x}px ${originRef.current.y}px`;
      el.style.transform = `scale(${zoomRef.current})`;
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        lastDistRef.current = getDistance(e.touches);
        const mid = getMidpoint(e.touches);
        const rect = el.getBoundingClientRect();
        originRef.current = { x: mid.x - rect.left, y: mid.y - rect.top };
      }
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getDistance(e.touches);
        if (lastDistRef.current) {
          const delta = dist / lastDistRef.current;
          zoomRef.current = Math.min(4, Math.max(1, zoomRef.current * delta));
          applyZoom();
        }
        lastDistRef.current = dist;
      }
    };

    const onTouchEnd = (e) => {
      if (e.touches.length < 2) lastDistRef.current = null;
      // Snap back to 1 if close
      if (zoomRef.current < 1.05) {
        zoomRef.current = 1;
        el.style.transform = "scale(1)";
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, []);

  if (pages.length === 0) {
    return <div style={{ padding: 20, textAlign: 'center' }}>No pages available for this chapter.</div>;
  }

  return (
    <div>
      {/* Body FlipBook */}
      <div
        className="reader-body"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}
      >
        {/* Zoom wrapper */}
        <div
          ref={wrapperRef}
          style={{
            transformOrigin: '50% 50%',
            transition: 'transform 0.05s linear',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <HTMLFlipBook
            ref={flipBookRef}
            width={350}
            height={500}
            size="stretch"
            minWidth={280}
            maxWidth={isDesktop ? 1000 : 450}
            minHeight={400}
            maxHeight={isDesktop ? 1428 : 650}
            maxShadowOpacity={0.5}
            showCover={false}
            mobileScrollSupport={false}
            style={{ margin: '0 auto' }}
            onFlip={(e) => onPageChange(e.data)}
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

        {/* Page Turn Controls */}
        <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
          <button
            onClick={() => flipBookRef.current?.pageFlip().flipPrev()}
            style={{
              padding: "10px 20px",
              background: "var(--primary)",
              color: "var(--on-primary)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
            }}
          >
            ← Previous
          </button>
          <button
            onClick={() => flipBookRef.current?.pageFlip().flipNext()}
            style={{
              padding: "10px 20px",
              background: "var(--primary)",
              color: "var(--on-primary)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
            }}
          >
            Next →
          </button>
        </div>
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
export default function ReaderTab({ chapter, onBack, showToast, initialView = "read" }) {
  const [activeView, setActiveView] = useState(initialView); // "read" | "reflect"
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [initialPage, setInitialPage] = useState(0);
  const isDesktop = window.innerWidth >= 768;

  useEffect(() => {
    if (!chapter) return;
    setCurrentPageIndex(0);
    setInitialPage(0);
    dbGetBookmark(chapter.id).then((bmark) => {
      if (bmark) {
        setIsBookmarked(true);
        if (bmark.page !== undefined) {
          setInitialPage(bmark.page);
          setCurrentPageIndex(bmark.page);
        }
      } else {
        setIsBookmarked(false);
      }
    });
  }, [chapter?.id]);

  // Auto-update bookmark page whenever the user flips while bookmarked
  const handlePageChange = useCallback((pageIndex) => {
    setCurrentPageIndex(pageIndex);
    if (chapter && isBookmarked) {
      dbUpdateBookmarkPage(chapter.id, pageIndex);
    }
  }, [chapter, isBookmarked]);

  const toggleBookmark = async () => {
    if (!chapter) return;
    const isNow = await dbToggleBookmark(chapter.id, currentPageIndex);
    setIsBookmarked(isNow);
    showToast(isNow ? "Bookmark saved on this page ◈" : "Bookmark removed", "info");
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
          position: "relative",
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

        {!isDesktop && (
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-lowest)', borderRadius: 10, padding: 4, border: '1px solid var(--outline-ghost)' }}>
            {["read", "reflect"].map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                title={v === "read" ? "Read" : "Reflect"}
                style={{
                  padding: "6px",
                  borderRadius: 8,
                  border: "none",
                  background: activeView === v ? "var(--primary)" : "transparent",
                  color: activeView === v ? "var(--on-primary)" : "var(--on-surface-var)",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {v === "read" ? "✦" : "✴"}
              </button>
            ))}
          </div>
        )}

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
            <ChapterBody 
              chapter={chapter} 
              isDesktop={isDesktop} 
              initialPage={initialPage} 
              onPageChange={handlePageChange} 
            />
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
          {activeView === "read" ? (
            <ChapterBody 
              chapter={chapter} 
              isDesktop={isDesktop} 
              initialPage={initialPage} 
              onPageChange={handlePageChange} 
            />
          ) : (
            <ReflectionPanel chapter={chapter} showToast={showToast} />
          )}
        </>
      )}
    </div>
  );
}
