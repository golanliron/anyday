"use client";

import { useState, useEffect } from "react";
import { BoardDashboard } from "@/components/board/BoardDashboard";
import { loadBoard, listBoards } from "@/lib/api-client";
import type { MondayBoard, MondayItem } from "@/types";

const T = {
  he: {
    nav: { features: "יתרונות", how: "איך זה עובד", pricing: "מחירים", cta: "הזמינו דמו" },
    hero: {
      badge: "AnyDay",
      title1: "דוח לדירקטוריון?",
      title2: "עוד דקה ויש לך אחד.",
      sub: "Monday · Google Sheets · Excel · בעברית מלאה",
      desc: "AnyDay מחבר את הבורדים, הגיליונות והאקסלים שלכם והופך אותם לדוחות מנהלים, תובנות אסטרטגיות והתראות חכמות.",
      cta: "הזמינו דמו של 15 דקות",
      cta2: "התחילו 7 ימים חינם",
    },
    features: {
      title: "יש לכם כבר את כל המידע. עכשיו תקבלו גם את התשובות.",
      sub: "AnyDay לא מחליף את Monday. הוא יושב מעליו וגורם לו סוף סוף לדבר.",
      items: [
        { icon: "💬", title: "שואלים בעברית. מקבלים תשובה.", desc: "\"כמה לקוחות חתמו ברבעון?\" תשובה מיידית, עם הנתונים, עם המקור." },
        { icon: "📊", title: "דוחות ודשבורד בלחיצה.", desc: "דוח PDF לדירקטוריון, דשבורד אימפקט עם גרפים — מוכן לישיבה. בלי לקרוא לאף אחד." },
        { icon: "🚨", title: "מערכת שמתריעה לפני שמאוחר.", desc: "לקוחה שלא הגיבה 14 יום. פרויקט שזז שלוש פעמים. AnyDay מזהה ושולח." },
        { icon: "🏗️", title: "בונה מערכות שלמות.", desc: "\"תבני לי CRM\" — נבנה. \"תעלי את האקסל\" — מועלה ומתמפה. שיחה אחת, מערכת שלמה." },
      ],
    },
    steps: {
      title: "שלושה צעדים. שתי דקות. בלי IT.",
      items: [
        { num: "01", title: "חברו את המקור", desc: "Monday, Google Sheets או Excel. OAuth של לחיצה אחת." },
        { num: "02", title: "תנו ל-AnyDay לקרוא", desc: "המערכת מבינה את המבנה, מזהה עמודות, מחברת בין בורדים." },
        { num: "03", title: "שאלו. קבלו. תפעלו.", desc: "בעברית, בכתב. כמו לדבר עם אנליסט — רק מהיר יותר." },
      ],
    },
    pricing: {
      title: "תוכנית לכל שלב בארגון.",
      sub: "חיבור מלא לכל הבורדים והגיליונות, בכל החבילות.",
      plans: [
        { name: "בודקים", price: "250", desc: "צ'אט + 100 שאלות בחודש", cta: "התחילו 7 ימים חינם", free: true },
        { name: "לידרים", price: "450", desc: "דוחות + התראות + 500 שאלות", cta: "הזמינו דמו של 15 דקות" },
        { name: "דירקטורים", price: "750", desc: "אוטומציות + אימפקט + 2,000 שאלות", cta: "הזמינו דמו של 15 דקות", popular: true },
        { name: "ארגון", price: "1,200", desc: "White Label + SSO + API + 10,000 שאלות", cta: "דברו איתנו" },
      ],
    },
    problem: {
      title: "כל שבוע, אותו טקס.",
      paragraphs: [
        "הוועד מבקש עדכון. אתם שולחים מייל לאנליסטית, היא מסננת בורדים, מורידה ל-Excel, בונה גרפים — ומחזירה אחרי יומיים PDF שעוד צריך הגהה.",
        "מנהלת תפעול שואלת כמה פרויקטים תקועים. אתם לא יודעים. נכנסים יחד למאנדיי, מסננים, מחפשים, ובסוף — מנחשים.",
        "יש לכם 14 בורדים, 6 גיליונות וארבעה אקסלים. הנתונים נמצאים. התשובות לא.",
      ],
    },
    security: {
      title: "הנתונים שלכם נשארים שלכם.",
      items: [
        { emoji: "🔐", label: "הצפנה מקצה לקצה", desc: "תקן AES-256" },
        { emoji: "🇮🇱", label: "שרתים בארץ", desc: "לא יוצא מישראל" },
        { emoji: "🚫", label: "בלי אימון מודלים", desc: "הנתונים שלכם לא מאמנים אף מודל" },
        { emoji: "🗑️", label: "מחיקה בלחיצה", desc: "בכל רגע, ללא שאלות" },
      ],
    },
    faq: {
      title: "שאלות שכל מנהלת שואלת",
      items: [
        { q: "למה לא פשוט להשתמש ב-Monday AI או ChatGPT?", a: "Monday AI מוגבל לבורד אחד ולא מבין עברית עסקית. ChatGPT לא מחובר לנתונים שלכם. AnyDay מחבר הכל, מבין עברית, ומבצע פעולות אמיתיות." },
        { q: "האם זה מחליף את הצוות שלי?", a: "לא. זה מחליף את הזמן שהצוות מבזבז על איסוף נתונים והכנת דוחות, ומשחרר אותם לעבודה אסטרטגית." },
        { q: "מה אם אני לא מרוצה?", a: "חבילת \"בודקים\" — 7 ימי ניסיון חינם, ללא כרטיס. בכל החבילות — ביטול בלחיצה." },
        { q: "כמה זמן לוקחת ההטמעה?", a: "שתי דקות לחיבור. שעה לראיית ערך ראשון. שבוע לשינוי שיגרת העבודה." },
      ],
    },
    contact: {
      title: "הישיבה הבאה בעוד שבוע.",
      sub: "מה תעדיפו — לילה ארוך עם Excel, או דוח שמוכן בעוד דקה?",
      cta: "הזמינו דמו של 15 דקות",
      note: "ללא כרטיס אשראי בניסיון. ללא חוזה. ביטול בלחיצה.",
    },
  },
};

export default function Home() {
  const [board, setBoard] = useState<MondayBoard | null>(null);
  const [items, setItems] = useState<MondayItem[]>([]);
  const [apiToken, setApiToken] = useState("");
  const [boardId, setBoardId] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const t = T.he;

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const oauthToken = params.get("monday_token");
      if (oauthToken) {
        setApiToken(oauthToken);
        localStorage.setItem("anyday-token", oauthToken);
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {}
  }, []);

  function scrollToDemo() {
    window.location.href = "mailto:hello@anyday.co.il?subject=הזמנת דמו של 15 דקות";
  }

  if (board) {
    return <BoardDashboard board={board} items={items} onBack={() => { setBoard(null); setItems([]); }} apiToken={apiToken} boardId={boardId} />;
  }

  return (
    <div dir="rtl" style={{ fontFamily: "'Rubik', sans-serif", color: "#0A0E27" }}>
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-burger { display: flex !important; }
          .hero-title { font-size: 32px !important; }
          .features-grid { grid-template-columns: 1fr 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr 1fr !important; }
          .section-pad { padding: 48px 16px !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 26px !important; }
        }
        .btn-future {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-future::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 200%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transition: left 0.5s;
        }
        .btn-future:hover::before { left: 100%; }
        .btn-future:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,53,255,0.4), 0 0 60px rgba(255,239,0,0.15); }
        .card-future {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        .card-future::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(0,53,255,0.2), rgba(255,239,0,0.1));
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .card-future:hover::after { opacity: 1; }
        .card-future:hover { transform: translateY(-4px); box-shadow: 0 20px 50px rgba(0,53,255,0.12); }
        .glow-dot { animation: glow 3s ease-in-out infinite; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, right: 0, left: 0, zIndex: 50,
        background: "rgba(7,11,26,0.85)", backdropFilter: "blur(20px) saturate(1.8)",
        borderBottom: "1px solid rgba(0,53,255,0.15)",
        padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "#FFEF00",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#0A0E27", fontWeight: 900,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>A</div>
          <span style={{
            fontSize: 20, fontWeight: 800, color: "#FFFFFF",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "-0.5px",
          }}>AnyDay</span>
        </div>
        <div className="desktop-nav" style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <a href="#features" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#FFEF00"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
          >{t.nav.features}</a>
          <a href="#how" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#FFEF00"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
          >{t.nav.how}</a>
          <a href="#pricing" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.color = "#FFEF00"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.7)"}
          >{t.nav.pricing}</a>
          <a href="/workspace" className="btn-future" style={{
            background: "#FFEF00", color: "#0A0E27", border: "none", borderRadius: 8,
            padding: "8px 20px", fontSize: 13, fontWeight: 700, textDecoration: "none",
            fontFamily: "'Space Grotesk', sans-serif",
          }}>{"כניסה למערכת"}</a>
        </div>
        <button className="mobile-burger" onClick={() => setMobileMenu(!mobileMenu)} style={{
          display: "none", background: "none", border: "none", cursor: "pointer",
          flexDirection: "column", gap: 5, padding: 4,
        }}>
          <div style={{ width: 24, height: 2, borderRadius: 2, background: "#FFEF00", transition: "all 0.3s", transform: mobileMenu ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <div style={{ width: 24, height: 2, borderRadius: 2, background: "#FFEF00", transition: "all 0.3s", opacity: mobileMenu ? 0 : 1 }} />
          <div style={{ width: 24, height: 2, borderRadius: 2, background: "#FFEF00", transition: "all 0.3s", transform: mobileMenu ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenu && (
        <div style={{
          position: "fixed", top: 64, right: 0, left: 0, bottom: 0, zIndex: 49,
          background: "rgba(7,11,26,0.97)", backdropFilter: "blur(20px)",
          display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 40, gap: 24,
        }}>
          <a href="#features" onClick={() => setMobileMenu(false)} style={{ color: "#fff", fontSize: 18, fontWeight: 600, textDecoration: "none" }}>{t.nav.features}</a>
          <a href="#how" onClick={() => setMobileMenu(false)} style={{ color: "#fff", fontSize: 18, fontWeight: 600, textDecoration: "none" }}>{t.nav.how}</a>
          <a href="#pricing" onClick={() => setMobileMenu(false)} style={{ color: "#fff", fontSize: 18, fontWeight: 600, textDecoration: "none" }}>{t.nav.pricing}</a>
          <a href="/workspace" style={{
            background: "#FFEF00", color: "#0A0E27", borderRadius: 10,
            padding: "12px 32px", fontSize: 16, fontWeight: 700, textDecoration: "none",
          }}>{"כניסה למערכת"}</a>
        </div>
      )}

      {/* ── Hero — Dark futuristic ── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "120px 24px 80px",
        background: "linear-gradient(180deg, #070B1A 0%, #0E1330 60%, #0A1845 100%)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Glow orbs */}
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,53,255,0.15) 0%, transparent 70%)", top: -100, left: -100 }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,239,0,0.08) 0%, transparent 70%)", bottom: -50, right: -80 }} />
        <div style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,53,255,0.2) 0%, transparent 70%)", top: "40%", right: "20%" }} />
        {/* Grid lines */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(0,53,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,53,255,0.04) 1px, transparent 1px)", backgroundSize: "60px 60px", opacity: 0.6 }} />

        <div className="fade-up" style={{ position: "relative", zIndex: 1, maxWidth: 700 }}>
          <div style={{
            display: "inline-block", background: "rgba(255,239,0,0.12)",
            border: "1px solid rgba(255,239,0,0.3)",
            borderRadius: 6, padding: "6px 16px", marginBottom: 28,
            fontSize: 12, fontWeight: 700, color: "#FFEF00",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "2px", textTransform: "uppercase",
          }}>
            {t.hero.badge}
          </div>
          <h1 className="hero-title" style={{
            fontSize: "clamp(36px, 5vw, 58px)", fontWeight: 900, lineHeight: 1.15,
            marginBottom: 24, color: "#FFFFFF",
          }}>
            {t.hero.title1}
            <br />
            <span style={{ color: "#FFEF00" }}>{t.hero.title2}</span>
          </h1>
          <p style={{
            fontSize: 18, color: "rgba(255,255,255,0.6)", lineHeight: 1.7,
            maxWidth: 500, margin: "0 auto 12px",
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500,
          }}>
            {t.hero.sub}
          </p>
          <p style={{
            fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.8,
            maxWidth: 480, margin: "0 auto 40px",
          }}>
            {t.hero.desc}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={scrollToDemo} className="btn-future" style={{
              background: "#FFEF00", color: "#0A0E27", border: "none", borderRadius: 10,
              padding: "16px 36px", fontSize: 16, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: "0 8px 30px rgba(255,239,0,0.25), 0 0 60px rgba(255,239,0,0.1)",
            }}>{t.hero.cta}</button>
            <a href="/workspace" className="btn-future" style={{
              background: "rgba(0,53,255,0.3)", color: "#FFFFFF",
              border: "1px solid rgba(0,53,255,0.5)", borderRadius: 10,
              padding: "16px 36px", fontSize: 16, fontWeight: 700, cursor: "pointer",
              textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif",
              backdropFilter: "blur(10px)",
            }}>{t.hero.cta2}</a>
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/workspace" style={{
              color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, textDecoration: "none",
              borderBottom: "1px dashed rgba(255,239,0,0.3)", paddingBottom: 2,
              transition: "color 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.color = "#FFEF00"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
            >{"🏗️ בנו מערכת Monday חדשה"}</a>
            <a href="/health-check" style={{
              color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: 500, textDecoration: "none",
              borderBottom: "1px dashed rgba(255,239,0,0.3)", paddingBottom: 2,
              transition: "color 0.2s",
            }}
              onMouseEnter={e => e.currentTarget.style.color = "#FFEF00"}
              onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
            >{"🩺 בדקו את ה-Monday שלכם"}</a>
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="section-pad" style={{ padding: "80px 24px", background: "#F0F4FF", textAlign: "center" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 32, color: "#0A0E27" }}>
            {t.problem.title}
          </h2>
          {t.problem.paragraphs.map((p, i) => (
            <p key={i} style={{ fontSize: 16, color: "#5B6B8A", lineHeight: 1.8, marginBottom: 20, textAlign: "right" }}>{p}</p>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="section-pad" style={{ padding: "80px 24px", background: "#FFFFFF", textAlign: "center" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: "#0A0E27" }}>{t.features.title}</h2>
          <p style={{ color: "#5B6B8A", fontSize: 16, marginBottom: 50, lineHeight: 1.7 }}>{t.features.sub}</p>
          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {t.features.items.map((f, i) => (
              <div key={i} className="card-future" style={{
                background: "#F0F4FF", borderRadius: 16, padding: "28px 20px",
                border: "1px solid rgba(0,53,255,0.08)", cursor: "default",
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: "linear-gradient(135deg, rgba(0,53,255,0.08), rgba(255,239,0,0.06))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", fontSize: 24,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8, color: "#0A0E27" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "#5B6B8A", lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="section-pad" style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, #070B1A, #0E1330)",
        textAlign: "center",
      }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 50, color: "#FFFFFF" }}>{t.steps.title}</h2>
          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {t.steps.items.map((s, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: "36px 24px",
                border: "1px solid rgba(0,53,255,0.15)",
                backdropFilter: "blur(10px)",
                position: "relative",
              }}>
                <div style={{
                  fontSize: 48, fontWeight: 900, color: "rgba(255,239,0,0.15)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  position: "absolute", top: 16, left: 20,
                }}>{s.num}</div>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "rgba(255,239,0,0.1)", border: "1px solid rgba(255,239,0,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 18px",
                  fontSize: 20, color: "#FFEF00", fontWeight: 900,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>{s.num}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: "#FFFFFF" }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="section-pad" style={{ padding: "80px 24px", background: "#F0F4FF", textAlign: "center" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, color: "#0A0E27" }}>{t.pricing.title}</h2>
          <p style={{ color: "#5B6B8A", fontSize: 16, marginBottom: 50, lineHeight: 1.7 }}>{t.pricing.sub}</p>
          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "stretch" }}>
            {t.pricing.plans.map((plan, i) => (
              <div key={i} style={{
                background: plan.popular ? "linear-gradient(135deg, #0035FF, #0055FF)" : "#FFFFFF",
                borderRadius: 20, padding: plan.popular ? 3 : 0,
                position: "relative",
              }}>
                {plan.popular && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    background: "#FFEF00", color: "#0A0E27", fontSize: 11, fontWeight: 800,
                    padding: "4px 14px", borderRadius: 20,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>{"הכי פופולרי"}</div>
                )}
                {plan.free && (
                  <div style={{
                    position: "absolute", top: -12, right: 16,
                    background: "#00D68F", color: "#FFF", fontSize: 10, fontWeight: 800,
                    padding: "3px 10px", borderRadius: 20,
                  }}>{"7 ימים חינם"}</div>
                )}
                <div style={{
                  background: "#FFFFFF", borderRadius: plan.popular ? 18 : 20,
                  padding: "32px 20px", height: "100%",
                  border: plan.popular ? "none" : "1px solid rgba(0,53,255,0.08)",
                  display: "flex", flexDirection: "column", alignItems: "center",
                }}>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0A0E27", marginBottom: 8 }}>{plan.name}</h3>
                  <p style={{ fontSize: 13, color: "#5B6B8A", marginBottom: 20, lineHeight: 1.6, minHeight: 40 }}>{plan.desc}</p>
                  <div style={{ marginBottom: 8 }}>
                    <span style={{
                      fontSize: 40, fontWeight: 900, color: "#0035FF",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>{plan.price}</span>
                    <span style={{ fontSize: 16, color: "#5B6B8A", fontWeight: 600 }}>{" ₪/חודש"}</span>
                  </div>
                  <button onClick={scrollToDemo} className="btn-future" style={{
                    width: "100%", marginTop: "auto",
                    background: plan.popular ? "#0035FF" : "rgba(0,53,255,0.06)",
                    color: plan.popular ? "#FFFFFF" : "#0035FF",
                    border: plan.popular ? "none" : "1px solid rgba(0,53,255,0.15)",
                    borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>{plan.cta}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section className="section-pad" style={{ padding: "60px 24px", background: "#FFFFFF", textAlign: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 40, color: "#0A0E27" }}>{t.security.title}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {t.security.items.map((item, i) => (
              <div key={i} className="card-future" style={{
                background: "#F0F4FF", borderRadius: 16, padding: "24px 16px",
                border: "1px solid rgba(0,53,255,0.06)",
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{item.emoji}</div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#0A0E27", marginBottom: 6 }}>{item.label}</h4>
                <p style={{ fontSize: 12, color: "#5B6B8A", margin: 0, lineHeight: 1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-pad" style={{ padding: "60px 24px", background: "#F0F4FF", textAlign: "right" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32, color: "#0A0E27", textAlign: "center" }}>{t.faq.title}</h2>
          {t.faq.items.map((faq, i) => (
            <div key={i} className="card-future" style={{
              background: "#FFFFFF", borderRadius: 14, padding: "20px 24px", marginBottom: 12,
              border: "1px solid rgba(0,53,255,0.06)",
            }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: "#0A0E27", marginBottom: 8 }}>{faq.q}</h4>
              <p style={{ fontSize: 13, color: "#5B6B8A", margin: 0, lineHeight: 1.7 }}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{
        padding: "80px 24px",
        background: "linear-gradient(180deg, #070B1A, #0E1330)",
        textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,53,255,0.15), transparent 70%)", top: -100, left: "30%" }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,239,0,0.06), transparent 70%)", bottom: -80, right: "20%" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#FFFFFF", marginBottom: 12, lineHeight: 1.4 }}>{t.contact.title}</h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 32, lineHeight: 1.7 }}>{t.contact.sub}</p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={scrollToDemo} className="btn-future" style={{
              background: "#FFEF00", color: "#0A0E27", border: "none", borderRadius: 10,
              padding: "16px 40px", fontSize: 16, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: "0 8px 30px rgba(255,239,0,0.25)",
            }}>{t.contact.cta}</button>
            <a href="/workspace" className="btn-future" style={{
              background: "rgba(0,53,255,0.3)", color: "#FFFFFF",
              border: "1px solid rgba(0,53,255,0.5)", borderRadius: 10,
              padding: "16px 40px", fontSize: 16, fontWeight: 700,
              textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif",
            }}>{"התחילו בחינם"}</a>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginTop: 16 }}>{t.contact.note}</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: "#050815", padding: "28px 24px", textAlign: "center",
        borderTop: "1px solid rgba(0,53,255,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 5, background: "#FFEF00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#0A0E27", fontFamily: "'Space Grotesk', sans-serif" }}>A</div>
          <span style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.7)", fontFamily: "'Space Grotesk', sans-serif" }}>AnyDay</span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>
          &copy; {new Date().getFullYear()} AnyDay. כל הזכויות שמורות.
        </p>
      </footer>
    </div>
  );
}
