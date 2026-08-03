// Bottom navigation bar
export default function BottomNav({ tab, setTab }) {
  const tabs = [
    { id: "index",    label: "Index",    icon: "☰" },
    { id: "reader",   label: "Read",     icon: "✦" },
    { id: "journal",  label: "Journal",  icon: "✴" },
    { id: "settings", label: "Settings", icon: "⚙" },
  ];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--nav-bg, rgba(248,245,240,0.88))",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        height: 72,
        zIndex: 200,
        borderTop: "1px solid var(--outline-ghost)",
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`nav-${t.id}`}
          aria-label={t.label}
          onClick={() => setTab(t.id)}
          style={{
            flex: 1,
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            padding: "10px 0",
          }}
        >
          <span
            style={{
              fontSize: 18,
              color: tab === t.id ? "var(--primary)" : "var(--on-surface-var)",
              transition: "color 0.25s ease, transform 0.25s ease",
              transform: tab === t.id ? "scale(1.2)" : "scale(1)",
              display: "block",
              lineHeight: 1,
            }}
          >
            {t.icon}
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: tab === t.id ? "var(--primary)" : "var(--on-surface-var)",
              transition: "color 0.25s ease",
            }}
          >
            {t.label}
          </span>
        </button>
      ))}
    </nav>
  );
}
