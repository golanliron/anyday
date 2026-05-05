"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Spinner } from "@/components/ui/Spinner";
import { BoardDashboard } from "@/components/board/BoardDashboard";
import { loadBoard, listBoards } from "@/lib/api-client";
import type { MondayBoard, MondayItem } from "@/types";

function IconChat() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4c0 1.1-.9 2-2 2h-4a2 2 0 0 1-2-2 4 4 0 0 1 4-4z" />
      <path d="M9 8v2a3 3 0 0 0 6 0V8" />
      <path d="M8 14s-2 1-2 3 2 3 2 3" /><path d="M16 14s2 1 2 3-2 3-2 3" />
      <path d="M12 18v4" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function IconHash() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

const T = {
  he: {
    nav: { features: "יתרונות", how: "איך זה עובד", pricing: "מחירים", cta: "הזמינו דמו" },
    hero: {
      badge: "AnyDay",
      title1: "דוח לדירקטוריון? עוד דקה ויש לך אחד.",
      title2: "",
      titleBrand: "",
      title3: "",
      sub: "Monday · Google Sheets · Excel · בעברית מלאה",
      desc: "חברו את מקורות הנתונים שלכם ותתחילו לקבל תשובות, דוחות להנהלה, מתריעה לפני שמאוחר. ואוטומציות - הכל בעברית, הכל אוטומטי.",
      cta: "הזמינו דמו של 15 דקות",
    },
    features: {
      title: "יש לכם כבר את כל המידע. עכשיו תקבלו גם את התשובות.",
      sub: "AnyDay לא מחליף את Monday או את ה-Sheets שלכם. הוא יושב מעליהם וגורם להם סוף סוף לדבר.",
      items: [
        { title: "שואלים בעברית. מקבלים תשובה.", desc: "כמה לקוחות חתמו ברבעון? אילו פרויקטים פיגרו ביעד? תשובה מיידית, עם הנתונים, עם המקור." },
        { title: "דוח לדירקטוריון בלחיצה.", desc: "PDF מעוצב, עם גרפים נכונים, תובנות אסטרטגיות והלוגו שלכם. מוכן לישיבה. בלי לקרוא לאף אחד." },
        { title: "התראות חכמות", desc: "לקוחה שלא הגיבה 14 יום. פרויקט שזז שלוש פעמים. AnyDay מזהה ושולח — בלי שתשאלו." },
        { title: "אוטומציות שמבצעות", desc: "לא מסבירה מה לעשות - עושה. שינוי סטטוס, העברה לקבוצה, ארכיון - ישירות מהצ'אט" },
      ],
    },
    steps: {
      title: "שלושה צעדים. שתי דקות. בלי IT.",
      sub: "",
      items: [
        { title: "חברו את המקור", desc: "Monday, Google Sheets או Excel. OAuth של לחיצה אחת. בלי טכנולוג בארגון." },
        { title: "תנו ל-AnyDay לקרוא", desc: "המערכת מבינה את המבנה, מזהה את העמודות, מחברת בין הבורדים. שתי דקות." },
        { title: "שאלו. קבלו. תפעלו.", desc: "סיכומים, דוחות, אוטומציות ועריכה — הכל מוכן" },
      ],
    },
    pricing: {
      title: "תוכנית לכל שלב בארגון.",
      sub: "חיבור מלא לכל הבורדים והגיליונות, בכל החבילות. ההבדל הוא ביכולות.",
      plans: [
        { name: "Pro", desc: "כל הבורדים, דוחות, אוטומציות, עריכה", boards: "ללא הגבלה" },
        { name: "לידרים", desc: "לסמנכ״לית שמובילה תחום", boards: "דוחות + התראות + 500 שאלות" },
        { name: "דירקטורים", desc: "למנכ״לית שמדווחת לדירקטוריון", boards: "אוטמציות + 2,000 שאלות" },
        { name: "ארגון", desc: "לארגונים עם 50+ עובדים", boards: "White Label + SSO + API" },
      ],
      popular: "הכי פופולרי",
      month: "₪/חודש",
      boardLabel: (b: string) => b === "ללא הגבלה" ? "כל הבורדים" : b,
      cta: "התחילו עכשיו",
      addon: { badge: "PREMIUM ADD-ON", title: "המערכת שלכם. המותג שלכם.", desc: "לוגו, צבעים, עיצוב מלא. הלקוחות שלכם יחשבו שבניתם את זה לבד. מערכת AI ממותגת שנראית מיליון דולר.", cta: "הוסיפו מיתוג" },
    },
    form: {
      title: "התחילו 7 ימים חינם",
      sub: "חברו את המקורות שלכם ותתחילו לקבל תשובות",
      tokenLabel: "API Token",
      tokenHelp: "איך מוצאים את ה-API Token?",
      tokenSteps: [
        "לחצו על התמונה שלכם בפינה השמאלית התחתונה במאנדיי",
        "בחרו \"Developers\" מהתפריט",
        "לחצו על \"My Access Tokens\" בצד שמאל",
        "לחצו \"Copy\" והדביקו כאן",
      ],
      tokenPath: "Monday → Profile → Developers → My Access Tokens",
      boardLabel: "מספר בורד",
      boardHelp: "איך מוצאים את מספר הבורד?",
      boardSteps: [
        "פתחו את הבורד שלכם במאנדיי",
        "הסתכלו על ה-URL בשורת הכתובת של הדפדפן",
        "המספר שמופיע אחרי /boards/ הוא מספר הבורד",
      ],
      boardUrlHint: "נמצא ב-URL: monday.com/boards/",
      boardCopy: "העתיקו את המספר הזה",
      loadBtn: "התחילו — הצגת דשבורד",
      loading: "טוען את הבורד...",
    },
    comingSoon: {
      title: "בקרוב",
      items: [
        "תרגום דוחות לאנגלית",
      ],
    },
    contact: {
      title: "רוצים מערכת ואוטומציות רק בשבילכם?",
      sub: "ללא כרטיס אשראי בניסיון. ללא חוזה. ביטול בלחיצה.",
      cta: "הזמינו דמו של 15 דקות",
    },
    footer: "כל הזכויות שמורות.",
  },
  en: {
    nav: { features: "Features", how: "How it works", pricing: "Pricing", cta: "Get Started" },
    hero: {
      badge: "AnyDay",
      title1: "AI that gets answers",
      title2: "from your ",
      titleBrand: "Monday",
      title3: ".",
      sub: "Not reports. Answers.",
      desc: "Start working smarter with your Monday.com. Stunning reports, clear data, patterns you never saw. Sharp, precise, knows what you need from day one.",
      cta: "Get Started",
    },
    features: {
      title: "Your Toolkit",
      sub: "Everything you need to turn Monday into an answer engine",
      items: [
        { title: "Smart Board Chat", desc: "Ask your Monday any question in plain language and get instant answers with real data" },
        { title: "Visual Dashboard", desc: "Charts and insights built automatically from your data, ready to send to management" },
        { title: "Custom Automations", desc: "The system suggests smart automations that save you hours of manual work every week" },
        { title: "Impact Reports", desc: "Generate professional reports for donors and management directly from data, without writing a word" },
      ],
    },
    steps: {
      title: "How it works?",
      sub: "Three steps and you're in",
      items: [
        { title: "Click Connect", desc: "One-click Monday.com login" },
        { title: "Pick a Board", desc: "All your boards appear automatically" },
        { title: "Start Working", desc: "Reports, automations, editing — all ready" },
      ],
    },
    pricing: {
      title: "Plans & Pricing",
      sub: "Choose the plan that fits you",
      plans: [
        { name: "Starter", desc: "Start with one board, see what it can do", boards: "1" },
        { name: "Duo", desc: "Two boards, what could go wrong", boards: "2" },
        { name: "Pro", desc: "Three boards, now we're serious", boards: "3" },
        { name: "Unlimited", desc: "All your boards, no limits", boards: "Unlimited" },
      ],
      popular: "Most Popular",
      month: "$/mo",
      boardLabel: (b: string) => b === "Unlimited" ? "Unlimited boards" : `${b} board${Number(b) === 1 ? "" : "s"}`,
      cta: "Get Started",
      addon: { badge: "PREMIUM ADD-ON", title: "Your system. Your brand.", desc: "Logo, colors, full design. Your clients will think you built it yourself. A branded AI system that looks like a million dollars.", cta: "Add Branding" },
    },
    form: {
      title: "Get Started Now",
      sub: "Enter your details and your dashboard is ready in seconds",
      tokenLabel: "API Token",
      tokenHelp: "How to find your API Token?",
      tokenSteps: [
        "Click your profile picture at the bottom-left of Monday",
        "Select \"Developers\" from the menu",
        "Click \"My Access Tokens\" on the left",
        "Click \"Copy\" and paste here",
      ],
      tokenPath: "Monday → Profile → Developers → My Access Tokens",
      boardLabel: "Board ID",
      boardHelp: "How to find your Board ID?",
      boardSteps: [
        "Open your board in Monday",
        "Look at the URL in the browser address bar",
        "The number after /boards/ is your Board ID",
      ],
      boardUrlHint: "Found in URL: monday.com/boards/",
      boardCopy: "Copy this number",
      loadBtn: "Get Started — Show Dashboard",
      loading: "Loading board...",
    },
    comingSoon: {
      title: "Coming Soon",
      items: [
        "Report translation to English",
      ],
    },
    contact: {
      title: "Want more from your AnyDay?",
      sub: "Complaints, compliments, suggestions?",
      cta: "Contact Us",
    },
    footer: "All rights reserved.",
  },
};

type Lang = "he" | "en";

const ICONS = [IconChat, IconChart, IconBrain, IconDoc];
const STEP_ICONS = [IconKey, IconHash, IconZap];
const STEP_EMOJIS = [["👤", "⚙️", "🔑", "📋"], ["📋", "🔗", "🔢"]];

export default function Home() {
  const [apiToken, setApiToken] = useState("");
  const [boardId, setBoardId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [board, setBoard] = useState<MondayBoard | null>(null);
  const [items, setItems] = useState<MondayItem[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);
  const [showBoardHelp, setShowBoardHelp] = useState(false);
  const [dataSource, setDataSource] = useState<"monday" | "sheets" | "excel">("monday");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [lang, setLang] = useState<Lang>("he");
  const [boardsList, setBoardsList] = useState<{ id: string; name: string; items_count: number; description: string }[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [tokenConnected, setTokenConnected] = useState(false);
  const t = T[lang];
  const formRef = useRef<HTMLDivElement>(null);

  // Load saved token from localStorage OR from OAuth redirect
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const oauthToken = params.get("monday_token");
      if (oauthToken) {
        setApiToken(oauthToken);
        setTokenConnected(true);
        localStorage.setItem("anyday-token", oauthToken);
        listBoards(oauthToken).then(boards => setBoardsList(boards)).catch(() => {});
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
      const saved = localStorage.getItem("anyday-token");
      if (saved) {
        setApiToken(saved);
        setTokenConnected(true);
        listBoards(saved).then(boards => setBoardsList(boards)).catch(() => {});
      }
    } catch {}
  }, []);

  async function handleConnectToken() {
    const token = apiToken.trim();
    if (!token) return;
    setLoadingBoards(true);
    setError(null);
    try {
      const boards = await listBoards(token);
      setBoardsList(boards);
      setTokenConnected(true);
      try { localStorage.setItem("anyday-token", token); } catch {}
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Token לא תקין");
      setTokenConnected(false);
    } finally {
      setLoadingBoards(false);
    }
  }

  async function handleSelectBoard(id: string) {
    setBoardId(id);
    await handleLoadWithId(id);
  }

  async function handleLoadWithId(id: string) {
    const token = apiToken.trim();
    if (!id || !token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadBoard(id, token);
      setBoard(data.board);
      setItems(data.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "error");
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    setTokenConnected(false);
    setBoardsList([]);
    setApiToken("");
    setBoardId("");
    try { localStorage.removeItem("anyday-token"); } catch {}
  }

  async function handleLoad() {
    const id = boardId.trim();
    const token = apiToken.trim();
    if (!id || !token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await loadBoard(id, token);
      setBoard(data.board);
      setItems(data.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בטעינת הבורד");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadSheets() {
    const url = sheetsUrl.trim();
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetsUrl: url }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBoard(data.board);
      setItems(data.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "שגיאה בטעינת הגיליון");
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setBoard(null);
    setItems([]);
    setError(null);
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  if (board) {
    return <BoardDashboard board={board} items={items} onBack={handleBack} apiToken={apiToken} boardId={boardId} />;
  }

  return (
    <div dir={lang === "he" ? "rtl" : "ltr"} style={{ fontFamily: "'Rubik', sans-serif", color: "#2D2252" }}>
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-burger { display: flex !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .hero-title { font-size: 28px !important; }
          .hero-sub { font-size: 15px !important; }
          .section-pad { padding: 40px 16px !important; }
          section { padding-left: 16px !important; padding-right: 16px !important; }
          section h2 { font-size: 24px !important; }
          .pricing-grid { grid-template-columns: 1fr 1fr !important; }
          .brand-addon { flex-direction: column !important; text-align: center !important; padding: 24px 16px !important; }
          .brand-addon > div { text-align: center !important; min-width: unset !important; }
          .form-tabs { flex-direction: column !important; }
          .form-tabs button { font-size: 14px !important; }
          .form-card { padding: 24px 16px !important; }
        }
        @media (max-width: 480px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          section { padding-top: 40px !important; padding-bottom: 40px !important; }
        }
      `}</style>
      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, right: 0, left: 0, zIndex: 50,
        background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(108,92,231,0.1)",
        padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#FFF", fontWeight: 800,
          }}>A</div>
          <span style={{
            fontSize: 20, fontWeight: 800,
            background: "linear-gradient(90deg, #6C5CE7, #A29BFE)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>AnyDay</span>
        </div>
        <div className="desktop-nav" style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <a href="#features" style={{ color: "#6C5CE7", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>{t.nav.features}</a>
          <a href="#how" style={{ color: "#6C5CE7", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>{t.nav.how}</a>
          <a href="#pricing" style={{ color: "#6C5CE7", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>{t.nav.pricing}</a>
          {/* Language toggle */}
          <button onClick={() => setLang(lang === "he" ? "en" : "he")} style={{
            background: "rgba(108,92,231,0.06)", border: "1.5px solid rgba(108,92,231,0.15)",
            borderRadius: 8, padding: "6px 12px", cursor: "pointer",
            color: "#6C5CE7", fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 5, transition: "all 0.2s",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            {lang === "he" ? "EN" : "עב"}
          </button>
          <button onClick={scrollToForm} style={{
            background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
            color: "#FFF", border: "none", borderRadius: 10,
            padding: "9px 22px", fontSize: 14, fontWeight: 700,
            cursor: "pointer", transition: "all 0.3s ease",
          }}>{t.nav.cta}</button>
        </div>
        {/* Hamburger */}
        <button className="mobile-burger" onClick={() => setMobileMenu(!mobileMenu)} style={{
          display: "none", background: "none", border: "none", cursor: "pointer",
          flexDirection: "column", gap: 5, padding: 4,
        }}>
          <div style={{ width: 24, height: 2.5, borderRadius: 2, background: "#6C5CE7", transition: "all 0.3s", transform: mobileMenu ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <div style={{ width: 24, height: 2.5, borderRadius: 2, background: "#6C5CE7", transition: "all 0.3s", opacity: mobileMenu ? 0 : 1 }} />
          <div style={{ width: 24, height: 2.5, borderRadius: 2, background: "#6C5CE7", transition: "all 0.3s", transform: mobileMenu ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>
      </nav>
      {/* Mobile menu overlay */}
      {mobileMenu && (
        <div style={{
          position: "fixed", top: 64, right: 0, left: 0, bottom: 0, zIndex: 49,
          background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)",
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 40, gap: 24,
        }}>
          <a href="#features" onClick={() => setMobileMenu(false)} style={{ color: "#6C5CE7", fontSize: 18, fontWeight: 600, textDecoration: "none" }}>{t.nav.features}</a>
          <a href="#how" onClick={() => setMobileMenu(false)} style={{ color: "#6C5CE7", fontSize: 18, fontWeight: 600, textDecoration: "none" }}>{t.nav.how}</a>
          <a href="#pricing" onClick={() => setMobileMenu(false)} style={{ color: "#6C5CE7", fontSize: 18, fontWeight: 600, textDecoration: "none" }}>{t.nav.pricing}</a>
          <button onClick={() => { setLang(lang === "he" ? "en" : "he"); setMobileMenu(false); }} style={{
            background: "rgba(108,92,231,0.06)", border: "1.5px solid rgba(108,92,231,0.15)",
            borderRadius: 10, padding: "10px 30px", cursor: "pointer",
            color: "#6C5CE7", fontSize: 16, fontWeight: 700,
          }}>{lang === "he" ? "English" : "עברית"}</button>
          <button onClick={() => { setMobileMenu(false); scrollToForm(); }} style={{
            background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
            color: "#FFF", border: "none", borderRadius: 12,
            padding: "12px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer",
          }}>{t.nav.cta}</button>
        </div>
      )}

      {/* ── Hero ── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "120px 24px 80px",
        background: "#FFFFFF",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(108,92,231,0.06) 0%, transparent 70%)",
          top: -150, left: -150,
        }} />
        <div style={{
          position: "absolute", width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(162,155,254,0.08) 0%, transparent 70%)",
          bottom: -100, right: -120,
        }} />

        <div className="fade-up" style={{ position: "relative", zIndex: 1, maxWidth: 700 }}>
          <div style={{
            display: "inline-block", background: "rgba(108,92,231,0.08)",
            borderRadius: 30, padding: "6px 20px", marginBottom: 24,
            fontSize: 13, fontWeight: 700, color: "#6C5CE7",
          }}>
            {t.hero.badge}
          </div>
          <h1 style={{
            fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 900, lineHeight: 1.2,
            marginBottom: 24, color: "#2D2252",
          }}>
            {t.hero.title1}
            <br />
            {t.hero.title2}<span style={{
              background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>{t.hero.titleBrand}</span>{t.hero.title3}
          </h1>
          <p style={{
            fontSize: 22, color: "#6C5CE7", lineHeight: 1.6,
            maxWidth: 520, margin: "0 auto 12px", fontWeight: 700,
          }}>
            {t.hero.sub}
          </p>
          <p style={{
            fontSize: 16, color: "#7C6FD0", lineHeight: 1.8,
            maxWidth: 480, margin: "0 auto 36px",
          }}>
            {t.hero.desc}
          </p>
          <button onClick={scrollToForm} style={{
            background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
            color: "#FFF", border: "none", borderRadius: 14,
            padding: "16px 40px", fontSize: 17, fontWeight: 700,
            cursor: "pointer", transition: "all 0.3s ease",
            boxShadow: "0 8px 30px rgba(108,92,231,0.3)",
          }}>
            {t.hero.cta}
          </button>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{
        padding: "80px 24px", background: "#F9F7FF", textAlign: "center",
      }}>
        <div className="fade-up" style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: "#2D2252" }}>
            {t.features.title}
          </h2>
          <p style={{ color: "#7C6FD0", fontSize: 16, marginBottom: 50, lineHeight: 1.7 }}>
            {t.features.sub}
          </p>
          <div className="features-grid" style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}>
            {t.features.items.map((f, i) => {
              const Icon = ICONS[i];
              return (
              <div key={i} className={`fade-up-${i + 2}`} style={{
                background: "#FFFFFF", borderRadius: 18, padding: "28px 20px",
                border: "1px solid rgba(108,92,231,0.1)",
                transition: "all 0.3s ease",
                cursor: "default",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-6px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 40px rgba(108,92,231,0.12)";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(108,92,231,0.25)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(108,92,231,0.1)";
              }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(108,92,231,0.08), rgba(162,155,254,0.12))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px",
                }}><Icon /></div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#2D2252" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#7C6FD0", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{
        padding: "80px 24px",
        background: "#FFFFFF",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: "#2D2252" }}>
            {t.steps.title}
          </h2>
          <p style={{ color: "#7C6FD0", fontSize: 16, marginBottom: 50 }}>
            {t.steps.sub}
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 28,
          }}>
            {t.steps.items.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
              <div key={i} style={{
                background: "#F9F7FF", borderRadius: 20, padding: "36px 24px",
                border: "1px solid rgba(108,92,231,0.1)",
                position: "relative",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(108,92,231,0.1), rgba(162,155,254,0.15))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 18px",
                }}><Icon /></div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: "#2D2252" }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "#7C6FD0", margin: 0 }}>{s.desc}</p>
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{
        padding: "80px 24px", background: "#F9F7FF", textAlign: "center",
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: "#2D2252" }}>
            {t.pricing.title}
          </h2>
          <p style={{ color: "#7C6FD0", fontSize: 16, marginBottom: 50 }}>
            {t.pricing.sub}
          </p>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 20, alignItems: "stretch",
          }} className="pricing-grid">
            {t.pricing.plans.map((plan, idx) => ({ ...plan, price: ["250", "450", "750", "1,200"][idx], popular: idx === 2 })).map((plan, i) => (
              <div key={i} style={{
                background: plan.popular ? "linear-gradient(135deg, #6C5CE7, #A29BFE)" : "#FFFFFF",
                borderRadius: 22, padding: plan.popular ? "4px" : "0",
                position: "relative",
              }}>
                {plan.popular && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "#FDCB6E", color: "#2D2252", fontSize: 11, fontWeight: 800,
                    padding: "4px 14px", borderRadius: 20,
                  }}>
                    {t.pricing.popular}
                  </div>
                )}
                {idx === 0 && (
                  <div style={{
                    position: "absolute", top: -12, right: 16,
                    background: "#00B894", color: "#FFF", fontSize: 10, fontWeight: 800,
                    padding: "3px 10px", borderRadius: 20,
                  }}>
                    7 ימים חינם
                  </div>
                )}
                <div style={{
                  background: "#FFFFFF", borderRadius: plan.popular ? 19 : 22,
                  padding: "32px 24px", height: "100%",
                  border: plan.popular ? "none" : "1px solid rgba(108,92,231,0.1)",
                  display: "flex", flexDirection: "column", alignItems: "center",
                }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#2D2252", marginBottom: 8 }}>{plan.name}</h3>
                  <p style={{ fontSize: 13, color: "#7C6FD0", marginBottom: 20, lineHeight: 1.6, minHeight: 40 }}>{plan.desc}</p>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{
                      fontSize: 40, fontWeight: 900,
                      background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>{plan.price || "צרו קשר"}</span>
                    {plan.price && <span style={{ fontSize: 16, color: "#7C6FD0", fontWeight: 600 }}> {t.pricing.month}</span>}
                  </div>
                  <div style={{
                    background: "rgba(108,92,231,0.06)", borderRadius: 10, padding: "8px 16px",
                    fontSize: 13, color: "#6C5CE7", fontWeight: 600, marginBottom: 20,
                  }}>
                    {t.pricing.boardLabel(plan.boards)}
                  </div>
                  <button onClick={scrollToForm} style={{
                    width: "100%",
                    background: plan.popular
                      ? "linear-gradient(135deg, #6C5CE7, #A29BFE)"
                      : "rgba(108,92,231,0.08)",
                    color: plan.popular ? "#FFF" : "#6C5CE7",
                    border: "none", borderRadius: 12,
                    padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    transition: "all 0.3s",
                    boxShadow: plan.popular ? "0 6px 20px rgba(108,92,231,0.25)" : "none",
                  }}>
                    {t.pricing.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>

      {/* ── Get Started Form ── */}
      <section ref={formRef} id="start" style={{
        padding: "80px 24px", background: "#FFFFFF", textAlign: "center",
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: "#2D2252" }}>
            {t.form.title}
          </h2>
          <p style={{ color: "#7C6FD0", fontSize: 16, marginBottom: 36 }}>
            {t.form.sub}
          </p>

          <div style={{
            background: "#FFFFFF", borderRadius: 22, padding: "36px 32px",
            border: "1px solid rgba(108,92,231,0.1)",
            boxShadow: "0 8px 40px rgba(108,92,231,0.08)",
            textAlign: "right",
          }} className="form-card">
            {/* Data Source Tabs */}
            <div className="form-tabs" style={{ display: "flex", gap: 6, marginBottom: 24, background: "rgba(108,92,231,0.04)", borderRadius: 14, padding: 4 }}>
              {([
                { id: "monday" as const, label: "Monday.com", icon: "M" },
                { id: "sheets" as const, label: "Google Sheets", icon: "S" },
                { id: "excel" as const, label: "Excel", icon: "X" },
              ]).map(src => (
                <button key={src.id} onClick={() => setDataSource(src.id)} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: dataSource === src.id ? "#6C5CE7" : "transparent",
                  color: dataSource === src.id ? "#FFF" : "#7C6FD0",
                  fontSize: 13, fontWeight: 700, transition: "all 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: dataSource === src.id ? "rgba(255,255,255,0.2)" : "rgba(108,92,231,0.08)",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 800,
                  }}>{src.icon}</span>
                  {src.label}
                </button>
              ))}
            </div>

            {/* Monday Form — Smart Board Picker */}
            {dataSource === "monday" && <>
              {!tokenConnected ? (
                /* Step 1: Connect via OAuth */
                <>
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 14, margin: "0 auto 12px",
                      background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 24, color: "#FFF", fontWeight: 800,
                    }}>M</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2D2252", marginBottom: 4 }}>
                      {lang === "he" ? "חברו את Monday.com שלכם" : "Connect your Monday.com"}
                    </h3>
                    <p style={{ fontSize: 13, color: "#7C6FD0", lineHeight: 1.6 }}>
                      {lang === "he" ? "לחצו על הכפתור והרשו גישה - בלי להעתיק טוקנים" : "Click the button and authorize - no tokens to copy"}
                    </p>
                  </div>

                  {error && (
                    <div style={{
                      background: "rgba(225,112,85,0.08)", border: "1px solid rgba(225,112,85,0.2)",
                      borderRadius: 10, padding: "10px 14px", marginBottom: 14,
                      color: "#E17055", fontSize: 13, textAlign: "center",
                    }}>
                      {error}
                    </div>
                  )}

                  <a
                    href="/api/monday-oauth/authorize"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      width: "100%",
                      background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                      color: "#FFF", border: "none", borderRadius: 12,
                      padding: "15px", fontSize: 16, fontWeight: 700,
                      cursor: "pointer", textDecoration: "none",
                      boxShadow: "0 6px 20px rgba(108,92,231,0.25)",
                    }}
                  >
                    {lang === "he" ? "התחברות ל-Monday.com" : "Connect to Monday.com"}
                  </a>
                </>
              ) : (
                /* Step 2: Connected — show board list */
                <>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    marginBottom: 20, padding: "12px 16px",
                    background: "rgba(0,210,91,0.06)", borderRadius: 12,
                    border: "1px solid rgba(0,210,91,0.15)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%", background: "#00D25B",
                        boxShadow: "0 0 8px rgba(0,210,91,0.4)",
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#2D2252" }}>
                        {lang === "he" ? "מחובר ל-Monday.com" : "Connected to Monday.com"}
                      </span>
                    </div>
                    <button onClick={handleDisconnect} style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, color: "#E17055", fontWeight: 600,
                    }}>
                      {lang === "he" ? "התנתק" : "Disconnect"}
                    </button>
                  </div>

                  {boardsList.length > 0 ? (
                    <>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#2D2252", marginBottom: 12 }}>
                        {lang === "he" ? "בחרו בורד:" : "Choose a board:"}
                      </p>
                      <div style={{ maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                        {boardsList.map(b => (
                          <button key={b.id} onClick={() => handleSelectBoard(b.id)} disabled={loading} style={{
                            width: "100%", textAlign: "right", padding: "14px 16px",
                            background: loading ? "rgba(108,92,231,0.04)" : "#F9F7FF",
                            border: "1.5px solid rgba(108,92,231,0.12)",
                            borderRadius: 12, cursor: loading ? "wait" : "pointer",
                            transition: "all 0.2s",
                            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                          }}
                          onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = "#6C5CE7"; e.currentTarget.style.background = "rgba(108,92,231,0.06)"; } }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(108,92,231,0.12)"; e.currentTarget.style.background = "#F9F7FF"; }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#2D2252", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {b.name}
                              </div>
                              {b.description && (
                                <div style={{ fontSize: 11, color: "#7C6FD0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {b.description}
                                </div>
                              )}
                            </div>
                            <div style={{
                              background: "rgba(108,92,231,0.08)", borderRadius: 8,
                              padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#6C5CE7",
                              flexShrink: 0,
                            }}>
                              {b.items_count} {lang === "he" ? "פריטים" : "items"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "#7C6FD0", fontSize: 14 }}>
                      {lang === "he" ? "לא נמצאו בורדים" : "No boards found"}
                    </div>
                  )}

                  {loading && (
                    <div style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      marginTop: 16, color: "#6C5CE7", fontSize: 14, fontWeight: 600,
                    }}>
                      <Spinner size={16} color="#6C5CE7" /> {lang === "he" ? "טוען את הבורד..." : "Loading board..."}
                    </div>
                  )}

                  {error && (
                    <div style={{
                      background: "rgba(225,112,85,0.08)", border: "1px solid rgba(225,112,85,0.2)",
                      borderRadius: 10, padding: "10px 14px", marginTop: 14,
                      color: "#E17055", fontSize: 13, textAlign: "center",
                    }}>
                      {error}
                    </div>
                  )}
                </>
              )}
            </>}

            {/* Google Sheets Form */}
            {dataSource === "sheets" && <>
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px",
                  background: "linear-gradient(135deg, #34A853, #0F9D58)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, color: "#FFF", fontWeight: 800,
                }}>S</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2D2252", marginBottom: 8 }}>
                  {lang === "he" ? "חברו את Google Sheets שלכם" : "Connect your Google Sheets"}
                </h3>
                <p style={{ fontSize: 13, color: "#7C6FD0", marginBottom: 20, lineHeight: 1.6 }}>
                  {lang === "he" ? "הדביקו את הלינק של הגיליון שלכם ו-AnyDay ינתח אותו" : "Paste your sheet link and AnyDay will analyze it"}
                </p>
              </div>

              <label style={{ fontWeight: 700, fontSize: 14, color: "#2D2252", marginBottom: 6, display: "block" }}>
                {lang === "he" ? "לינק לגיליון" : "Sheet URL"}
              </label>
              <p style={{ color: "#A29BFE", fontSize: 12, margin: "0 0 10px" }}>
                {lang === "he" ? "docs.google.com/spreadsheets/d/..." : "docs.google.com/spreadsheets/d/..."}
              </p>
              <input
                type="url"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                style={{
                  width: "100%", background: "#F9F7FF",
                  border: "1.5px solid rgba(108,92,231,0.15)",
                  color: "#2D2252", borderRadius: 12,
                  padding: "13px 16px", fontSize: 14,
                  outline: "none", direction: "ltr",
                  transition: "border-color 0.2s",
                  marginBottom: 12,
                }}
                onFocus={e => e.target.style.borderColor = "#34A853"}
                onBlur={e => e.target.style.borderColor = "rgba(108,92,231,0.15)"}
              />

              <div style={{
                background: "rgba(52,168,83,0.06)", borderRadius: 12, padding: "14px 16px",
                border: "1px solid rgba(52,168,83,0.15)", marginBottom: 16,
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#2D2252", margin: "0 0 8px" }}>
                  {lang === "he" ? "איך זה עובד?" : "How it works?"}
                </p>
                {(lang === "he" ? [
                  "פתחו את הגיליון ב-Google Sheets",
                  "לחצו Share ותוודאו שזה \"Anyone with link can view\"",
                  "העתיקו את הלינק והדביקו כאן",
                ] : [
                  "Open your spreadsheet in Google Sheets",
                  "Click Share and set to \"Anyone with link can view\"",
                  "Copy the link and paste here",
                ]).map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, fontSize: 12, color: "#2D2252" }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, background: "#34A853",
                      color: "#FFF", fontSize: 11, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>{i + 1}</div>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleLoadSheets}
                disabled={!sheetsUrl.trim() || loading}
                style={{
                  width: "100%", marginTop: 8,
                  background: (!sheetsUrl.trim() || loading)
                    ? "rgba(52,168,83,0.3)"
                    : "linear-gradient(135deg, #34A853, #0F9D58)",
                  color: "#FFF", border: "none", borderRadius: 12,
                  padding: "15px", fontSize: 16, fontWeight: 700,
                  cursor: (!sheetsUrl.trim() || loading) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: (!sheetsUrl.trim() || loading) ? "none" : "0 6px 20px rgba(52,168,83,0.25)",
                  transition: "all 0.3s",
                }}
              >
                {loading ? (
                  <><Spinner size={16} color="#FFF" /> {lang === "he" ? "טוען גיליון..." : "Loading sheet..."}</>
                ) : (
                  lang === "he" ? "התחילו - ניתוח הגיליון" : "Start - Analyze Sheet"
                )}
              </button>
            </>}

            {/* Excel Form */}
            {dataSource === "excel" && <>
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, margin: "0 auto 16px",
                  background: "linear-gradient(135deg, #217346, #185C37)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, color: "#FFF", fontWeight: 800,
                }}>X</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#2D2252", marginBottom: 8 }}>
                  {lang === "he" ? "העלו קובץ Excel" : "Upload Excel File"}
                </h3>
                <p style={{ fontSize: 13, color: "#7C6FD0", marginBottom: 20, lineHeight: 1.6 }}>
                  {lang === "he" ? "גררו קובץ .xlsx או .csv ו-AnyDay ינתח אותו" : "Drag an .xlsx or .csv file and AnyDay will analyze it"}
                </p>
              </div>

              <div style={{
                border: "2px dashed rgba(33,115,70,0.3)",
                borderRadius: 16, padding: "40px 20px",
                textAlign: "center", marginBottom: 16,
                background: "rgba(33,115,70,0.03)",
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#217346" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#217346", marginBottom: 4 }}>
                  {lang === "he" ? "גררו קובץ לכאן" : "Drag file here"}
                </p>
                <p style={{ fontSize: 12, color: "#7C6FD0" }}>
                  .xlsx, .xls, .csv
                </p>
              </div>

              <button
                disabled={true}
                style={{
                  width: "100%",
                  background: "linear-gradient(135deg, #217346, #185C37)",
                  color: "#FFF", border: "none", borderRadius: 12,
                  padding: "15px", fontSize: 16, fontWeight: 700,
                  cursor: "not-allowed", opacity: 0.5,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {lang === "he" ? "בקרוב - ניתוח Excel" : "Coming Soon - Excel Analysis"}
              </button>
            </>}
          </div>
        </div>
      </section>

      {/* Security */}
      <section style={{
        padding: "60px 24px", background: "#FFFFFF", textAlign: "center",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 40, color: "#2D2252" }}>
            {lang === "he" ? "הנתונים שלכם נשארים שלכם." : "Your data stays yours."}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20 }}>
            {[
              { icon: String.fromCodePoint(0x1F510), title: lang === "he" ? "הצפנה מקצה לקצה" : "End-to-end encryption", desc: "AES-256" },
              { icon: String.fromCodePoint(0x1F1EE, 0x1F1F1), title: lang === "he" ? "שרתים בארץ" : "Local servers", desc: lang === "he" ? "לא יוצא מישראל" : "Never leaves Israel" },
              { icon: String.fromCodePoint(0x1F6AB), title: lang === "he" ? "בלי אימון מודלים" : "No model training", desc: lang === "he" ? "הנתונים לא מאמנים אף מודל" : "Never trains any model" },
              { icon: String.fromCodePoint(0x1F5D1), title: lang === "he" ? "מחיקה בלחיצה" : "Delete anytime", desc: lang === "he" ? "בכל רגע, ללא שאלות" : "No questions asked" },
            ].map((item, i) => (
              <div key={i} style={{ background: "#F9F7FF", borderRadius: 16, padding: "24px 16px", border: "1px solid rgba(108,92,231,0.1)" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#2D2252", marginBottom: 6 }}>{item.title}</h4>
                <p style={{ fontSize: 12, color: "#7C6FD0", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "60px 24px", background: "#F9F7FF", textAlign: "right" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, color: "#2D2252", textAlign: "center" }}>
            {lang === "he" ? "שאלות שכל מנהלת שואלת" : "Frequently Asked Questions"}
          </h2>
          {(lang === "he" ? [
            { q: "למה לא פשוט Monday AI או ChatGPT?", a: "Monday AI מוגבל לבורד אחד ולא מבין עברית עסקית. ChatGPT לא מחובר לנתונים. AnyDay מחבר את כל המקורות ומבצע פעולות אמיתיות." },
            { q: "האם זה מחליף את הצוות שלי?", a: "לא. זה מחליף את הזמן שהצוות מבזבז על איסוף נתונים והכנת דוחות." },
            { q: "מה אם אני לא מרוצה?", a: "7 ימי ניסיון חינם, ללא כרטיס. ביטול בלחיצה, ללא קנסות." },
            { q: "האם זה באמת עובד בעברית?", a: "כן. AnyDay נבנה בעברית מהיום הראשון. מבין סלנג, ראשי תיבות, ואת ההבדל בין סגור לבוצע." },
            { q: "כמה זמן לוקחת ההטמעה?", a: "שתי דקות לחיבור. שעה לערך ראשון. שבוע לשינוי שיגרה." },
          ] : [
            { q: "Why not just use Monday AI or ChatGPT?", a: "Monday AI is limited to one board. ChatGPT is not connected. AnyDay connects all sources and executes real actions." },
            { q: "Does it replace my team?", a: "No. It frees your team from data collection and report preparation." },
            { q: "What if I am not satisfied?", a: "7-day free trial, no credit card. Cancel anytime." },
            { q: "Does it really work in Hebrew?", a: "Yes. Built in Hebrew from day one." },
            { q: "How long does setup take?", a: "Two minutes to connect. One hour to see first value." },
          ]).map((faq, i) => (
            <div key={i} style={{ background: "#FFFFFF", borderRadius: 14, padding: "20px 24px", marginBottom: 12, border: "1px solid rgba(108,92,231,0.1)" }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "#2D2252", marginBottom: 8 }}>{faq.q}</h4>
              <p style={{ fontSize: 13, color: "#7C6FD0", margin: 0, lineHeight: 1.7 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact / CTA ── */}
      <section style={{
        padding: "60px 24px", background: "#F9F7FF", textAlign: "center",
      }}>
        <div className="fade-up" style={{ maxWidth: 500, margin: "0 auto" }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#2D2252", marginBottom: 8 }}>
            {t.contact.title}
          </p>
          <p style={{ fontSize: 16, color: "#7C6FD0", marginBottom: 28 }}>
            {t.contact.sub}
          </p>
          <a href="mailto:hello@dayday.app" style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
            color: "#FFF", border: "none", borderRadius: 14,
            padding: "14px 36px", fontSize: 16, fontWeight: 700,
            cursor: "pointer", textDecoration: "none",
            boxShadow: "0 6px 20px rgba(108,92,231,0.25)",
            transition: "all 0.3s ease",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {t.contact.cta}
          </a>
        </div>
      </section>

      <footer style={{
        background: "#2D2252", padding: "32px 24px", textAlign: "center",
      }}>
        <span style={{
          fontSize: 16, fontWeight: 800,
          background: "linear-gradient(90deg, #A29BFE, #FFFFFF)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>AnyDay</span>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 10 }}>
          &copy; {new Date().getFullYear()} AnyDay. {t.footer}
        </p>
      </footer>
    </div>
  );
}
