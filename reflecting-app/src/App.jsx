import { useState, useEffect, Component } from "react";
import IndexTab    from "./components/IndexTab.jsx";
import ReaderTab   from "./components/ReaderTab.jsx";
import JournalTab  from "./components/JournalTab.jsx";
import SettingsTab from "./components/SettingsTab.jsx";
import BottomNav   from "./components/BottomNav.jsx";
import Toast       from "./components/Toast.jsx";

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "60px 24px",
            maxWidth: 480,
            margin: "0 auto",
            textAlign: "center",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <h2
            style={{
              color: "var(--on-surface)",
              marginBottom: 10,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            Something went wrong
          </h2>
          <p
            style={{
              color: "var(--on-surface-var)",
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 24,
            }}
          >
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "10px 24px",
              borderRadius: 8,
              border: "none",
              background: "var(--primary)",
              color: "var(--on-primary)",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,        setTab]        = useState("index");
  const [chapters,   setChapters]   = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);
  const [readerInitialView, setReaderInitialView] = useState("read");
  const [toast,      setToast]      = useState(null);
  const [firstVisit, setFirstVisit] = useState(false);
  const [isDesktop,  setIsDesktop]  = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Persistent settings
  const [theme,      setTheme]      = useState(() => localStorage.getItem("noa_theme")      || "system");
  const [fontSize,   setFontSize]   = useState(() => localStorage.getItem("noa_fontsize")   || "md");
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem("noa_fontfamily") || "serif");

  // PWA install
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall,    setShowInstall]    = useState(false);

  // ── Load chapter data ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/names.json")
      .then((r) => r.json())
      .then(setChapters)
      .catch((err) => console.error("Failed to load names.json:", err));
  }, []);

  // ── First visit ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const seen = localStorage.getItem("noa_seen");
    if (!seen) {
      setFirstVisit(true);
      localStorage.setItem("noa_seen", "1");
    }
  }, []);

  useEffect(() => {
    if (firstVisit) setTimeout(() => setFirstVisit(false), 4000);
  }, [firstVisit]);

  // ── Apply theme & settings ──────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("noa_theme",      theme);
    localStorage.setItem("noa_fontsize",   fontSize);
    localStorage.setItem("noa_fontfamily", fontFamily);

    const root = document.documentElement;

    // Theme
    root.removeAttribute("data-theme");
    if (theme === "dark")  root.setAttribute("data-theme", "dark");
    if (theme === "light") root.setAttribute("data-theme", "light");
    if (theme === "sepia") root.setAttribute("data-theme", "sepia");
    // System: let prefers-color-scheme handle it
    if (theme === "system") {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (dark) root.setAttribute("data-theme", "dark");
    }

    // Font size
    root.setAttribute("data-font-size", fontSize);

    // Font family
    root.setAttribute("data-font-family", fontFamily);
  }, [theme, fontSize, fontFamily]);

  // ── PWA install prompt ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      if (localStorage.getItem("noa_install_dismissed") !== "1") {
        setDeferredPrompt(e);
        setShowInstall(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const dismissInstall = () => {
    localStorage.setItem("noa_install_dismissed", "1");
    setShowInstall(false);
  };

  // ── Navigation helpers ──────────────────────────────────────────────────────
  const handleOpenChapter = (ch, initialView = "read") => {
    setActiveChapter(ch);
    setReaderInitialView(initialView);
    setTab("reader");
  };

  const goToChapterById = (nameId) => {
    if (!chapters) return;
    const ch = chapters.find((c) => c.id === nameId);
    if (ch) handleOpenChapter(ch, "reflect");
  };

  const showToast = (msg, type = "success") =>
    setToast({ msg, type, key: Date.now() });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <div
        style={{
          minHeight: "100dvh",
          background: "var(--surface)",
          maxWidth: 900,
          margin: "0 auto",
          position: "relative",
          paddingLeft: isDesktop ? 80 : 0,
          paddingBottom: isDesktop ? 0 : (tab === "reader" ? 0 : 72),
        }}
      >
        <div
          key={tab}
          style={{ animation: "pageFade 0.25s ease" }}
        >
          <ErrorBoundary key={`eb-${tab}`}>
            {tab === "index" && (
              <IndexTab
                chapters={chapters}
                onOpenChapter={handleOpenChapter}
              />
            )}
            {tab === "reader" && (
              <ReaderTab
                chapter={activeChapter}
                initialView={readerInitialView}
                onBack={() => setTab("index")}
                showToast={showToast}
              />
            )}
            {tab === "journal" && (
              <JournalTab
                chapters={chapters}
                onGoToChapter={goToChapterById}
                showToast={showToast}
              />
            )}
            {tab === "settings" && (
              <SettingsTab
                theme={theme}
                setTheme={setTheme}
                fontSize={fontSize}
                setFontSize={setFontSize}
                fontFamily={fontFamily}
                setFontFamily={setFontFamily}
                showToast={showToast}
              />
            )}
          </ErrorBoundary>
        </div>

        {!(tab === "reader" && !isDesktop) && <BottomNav tab={tab} setTab={setTab} />}
      </div>

      {/* PWA Install Prompt */}
      {showInstall && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface-lowest)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--outline-ghost)",
            padding: "12px 16px",
            borderRadius: 14,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            zIndex: 9999,
            boxShadow: "0 8px 32px var(--shadow)",
            animation: "fadeIn 0.4s ease",
            display: "flex",
            alignItems: "center",
            gap: 14,
            maxWidth: "calc(100vw - 32px)",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 600,
                color: "var(--on-surface)",
                marginBottom: 2,
              }}
            >
              Install Names of Allah
            </div>
            <div style={{ color: "var(--on-surface-var)", fontSize: 11 }}>
              Add to Home Screen for offline access
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={dismissInstall}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--on-surface-var)",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 500,
                padding: "4px 8px",
              }}
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              style={{
                background: "var(--primary)",
                border: "none",
                color: "var(--on-primary)",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 600,
                padding: "7px 14px",
                borderRadius: 8,
              }}
            >
              Install
            </button>
          </div>
        </div>
      )}

      {/* Welcome toast */}
      {firstVisit && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-dim) 100%)",
            color: "var(--on-primary)",
            padding: "12px 28px",
            borderRadius: 40,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 500,
            zIndex: 9999,
            boxShadow: "0 8px 32px var(--shadow)",
            animation: "fadeIn 0.5s ease",
            whiteSpace: "nowrap",
          }}
        >
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ · All notes saved privately on your device
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.msg}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}
