import { useState, useEffect, useMemo } from "react";
import { dbGetAllReflections, dbGetAllBookmarks } from "../lib/db.js";
import { card, pageWrap, pageTitle, pageSubtitle, skeletonLine } from "../lib/styles.js";

// ── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{ ...card, marginBottom: 12 }}>
      <div style={skeletonLine(45)} />
      <div style={skeletonLine(25)} />
      <div style={{ ...skeletonLine(90), marginTop: 12 }} />
      <div style={skeletonLine(70)} />
    </div>
  );
}

// ── Name Card ─────────────────────────────────────────────────────────────────
function NameCard({ chapter, hasReflection, isBookmarked, onOpen }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...card,
        display: "flex",
        alignItems: "center",
        gap: 16,
        textAlign: "left",
        width: "100%",
        cursor: "pointer",
        border: "1px solid var(--outline-ghost)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        boxShadow: hovered ? "0 6px 28px var(--shadow)" : "0 2px 12px var(--shadow)",
        borderColor: hovered ? "var(--outline)" : "var(--outline-ghost)",
      }}
    >
      {/* Number badge */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: hasReflection
            ? "linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)"
            : "var(--surface-low)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif",
          color: hasReflection ? "var(--on-primary)" : "var(--on-surface-var)",
          flexShrink: 0,
          transition: "background 0.3s ease",
        }}
      >
        {String(chapter.number).padStart(2, "0")}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {(() => {
          const parts = chapter.title.split(" – ");
          const name     = parts[0];
          const subtitle = parts.slice(1).join(" – ");
          return (
            <>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontWeight: 600,
                  fontSize: 17,
                  color: "var(--on-surface)",
                  marginBottom: subtitle ? 1 : 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {name}
              </div>
              {subtitle && (
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--on-surface-var)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginBottom: 2,
                  }}
                >
                  {subtitle}
                </div>
              )}
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: "var(--on-surface-var)",
                  fontStyle: "italic",
                }}
              >
                {chapter.arabicName} · {chapter.translation}
              </div>
            </>
          );
        })()}
      </div>

      {/* Status badges */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
        {isBookmarked && (
          <span style={{ fontSize: 14, color: "var(--accent)" }}>◈</span>
        )}
        {hasReflection && (
          <span
            style={{
              background: "var(--primary)",
              color: "var(--on-primary)",
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              padding: "2px 8px",
              borderRadius: 40,
              letterSpacing: "0.05em",
            }}
          >
            ✓
          </span>
        )}
        <span
          style={{
            fontSize: 16,
            color: "var(--on-surface-var)",
            opacity: 0.5,
          }}
        >
          ›
        </span>
      </div>
    </button>
  );
}

// ── Filter chips ──────────────────────────────────────────────────────────────
function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 40,
        border: "1px solid",
        borderColor: active ? "var(--primary)" : "var(--outline-ghost)",
        background: active ? "var(--primary)" : "transparent",
        color: active ? "var(--on-primary)" : "var(--on-surface-var)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// ── Index Tab ─────────────────────────────────────────────────────────────────
export default function IndexTab({ chapters, onOpenChapter }) {
  const [reflectedIds, setReflectedIds] = useState(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all"); // all | reflected | unread | bookmarked

  useEffect(() => {
    Promise.all([dbGetAllReflections(), dbGetAllBookmarks()])
      .then(([refs, bmarks]) => {
        const hasContent = (r) =>
          (r.notes && r.notes.trim()) ||
          (r.duas && r.duas.trim()) ||
          (r.actionItems && r.actionItems.some((a) => a.trim()));
        setReflectedIds(new Set(refs.filter(hasContent).map((r) => r.nameId)));
        setBookmarkedIds(new Set(bmarks));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!chapters) return [];
    return chapters.filter((ch) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        ch.title.toLowerCase().includes(q) ||
        ch.arabicName.toLowerCase().includes(q) ||
        ch.translation.toLowerCase().includes(q);

      const matchesFilter =
        filter === "all" ||
        (filter === "reflected" && reflectedIds.has(ch.id)) ||
        (filter === "unread"    && !reflectedIds.has(ch.id)) ||
        (filter === "bookmarked" && bookmarkedIds.has(ch.id));

      return matchesSearch && matchesFilter;
    });
  }, [chapters, search, filter, reflectedIds, bookmarkedIds]);

  const reflectedCount = reflectedIds.size;
  const total          = chapters?.length ?? 0;

  return (
    <div style={pageWrap}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--primary)",
            marginBottom: 6,
          }}
        >
          Jinan Yousef
        </div>
        <h1 style={{ ...pageTitle, fontSize: 32, marginBottom: 8 }}>
          Reflecting On The Names of Allah
        </h1>
        <p style={pageSubtitle}>
          {loading ? "Loading progress…" : `${reflectedCount} of ${total} chapters reflected upon`}
        </p>

        {/* Progress bar */}
        {!loading && total > 0 && (
          <div
            style={{
              height: 3,
              background: "var(--outline-ghost)",
              borderRadius: 3,
              marginBottom: 20,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(reflectedCount / total) * 100}%`,
                background: "linear-gradient(90deg, var(--primary), var(--accent))",
                borderRadius: 3,
                transition: "width 0.6s ease",
              }}
            />
          </div>
        )}
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
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
          placeholder="Search by name, transliteration, meaning…"
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
            transition: "border-color 0.2s ease",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--outline-ghost)")}
        />
      </div>

      {/* Filter chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 22,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {[
          { id: "all",        label: "All" },
          { id: "reflected",  label: `Reflected (${reflectedCount})` },
          { id: "unread",     label: "Not yet reflected" },
          { id: "bookmarked", label: "Bookmarked" },
        ].map((f) => (
          <FilterChip
            key={f.id}
            label={f.label}
            active={filter === f.id}
            onClick={() => setFilter(f.id)}
          />
        ))}
      </div>

      {/* Chapter list */}
      {loading ? (
        [1, 2, 3, 4, 5].map((k) => <SkeletonCard key={k} />)
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
          <div style={{ fontSize: 36, marginBottom: 12 }}>☽</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            No chapters match your search
          </div>
          <div style={{ fontSize: 12 }}>
            Try a different keyword or filter
          </div>
        </div>
      ) : (
        filtered.map((ch) => (
          <NameCard
            key={ch.id}
            chapter={ch}
            hasReflection={reflectedIds.has(ch.id)}
            isBookmarked={bookmarkedIds.has(ch.id)}
            onOpen={() => onOpenChapter(ch)}
          />
        ))
      )}
    </div>
  );
}
