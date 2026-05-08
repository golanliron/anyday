"use client";

import { useState, useEffect } from "react";
import { BoardDashboard } from "@/components/board/BoardDashboard";
import { loadBoard } from "@/lib/api-client";
import type { MondayBoard, MondayItem } from "@/types";

export default function Home() {
  const [board, setBoard] = useState<MondayBoard | null>(null);
  const [items, setItems] = useState<MondayItem[]>([]);
  const [apiToken, setApiToken] = useState("");
  const [boardId, setBoardId] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
    <div dir="rtl" style={{ fontFamily: "'Rubik', sans-serif", background: "#FFFFFF", color: "#0035FF" }}>
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-burger { display: flex !important; }
          .hero-title { font-size: 36px !important; }
          .hero-sub { font-size: 18px !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .pricing-grid { grid-template-columns: 1fr 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .hero-btns { flex-direction: column !important; align-items: stretch !important; }
        }
        @media (max-width: 480px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 28px !important; }
        }
        .btn-glow {
          position: relative; overflow: hidden;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-glow::after {
          content: ''; position: absolute; inset: -2px;
          border-radius: inherit; padding: 2px;
          background: linear-gradient(135deg, #FFEF00, #0035FF, #FFEF00);
          background-size: 300% 300%;
          animation: shimmer 3s linear infinite;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude; -webkit-mask-composite: xor;
          pointer-events: none; opacity: 0; transition: opacity 0.3s;
        }
        .btn-glow:hover::after { opacity: 1; }
        .btn-glow:hover { transform: translateY(-3px) scale(1.02); }
        .card-pop {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-pop:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 20px 60px rgba(0,53,255,0.15);
        }
        .marquee-track {
          display: flex; gap: 40px; animation: marquee 20s linear infinite; width: max-content;
        }
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes blob1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-20px) scale(1.1); } 66% { transform: translate(-20px,20px) scale(0.9); } }
        @keyframes blob2 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(-40px,15px) scale(0.9); } 66% { transform: translate(25px,-25px) scale(1.1); } }
        .blob1 { animation: blob1 8s ease-in-out infinite; }
        .blob2 { animation: blob2 10s ease-in-out infinite; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, right: 0, left: 0, zIndex: 50,
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "2px solid #0035FF",
        padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "#0035FF",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, color: "#FFEF00", fontWeight: 900,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>A</div>
          <span style={{
            fontSize: 22, fontWeight: 900, color: "#0035FF",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "-1px",
          }}>AnyDay</span>
        </div>
        <div className="desktop-nav" style={{ display: "flex", gap: 32, alignItems: "center" }}>
          {[["#features","יתרונות"],["#how","איך זה עובד"],["#pricing","מחירים"]].map(([href, label]) => (
            <a key={href} href={href} style={{ color: "#0035FF", fontSize: 14, fontWeight: 600, textDecoration: "none", position: "relative", padding: "4px 0" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#0035FF"; (e.currentTarget.querySelector('span') as HTMLElement).style.width = "100%"; }}
              onMouseLeave={e => { (e.currentTarget.querySelector('span') as HTMLElement).style.width = "0"; }}
            >{label}<span style={{ position: "absolute", bottom: 0, right: 0, height: 2, width: 0, background: "#FFEF00", transition: "width 0.3s" }} /></a>
          ))}
          <a href="/workspace" style={{
            background: "#0035FF", color: "#FFEF00", border: "none", borderRadius: 50,
            padding: "10px 24px", fontSize: 14, fontWeight: 700, textDecoration: "none",
            fontFamily: "'Space Grotesk', sans-serif",
            transition: "all 0.2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#FFEF00"; e.currentTarget.style.color = "#0035FF"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#0035FF"; e.currentTarget.style.color = "#FFEF00"; }}
          >{"כניסה למערכת →"}</a>
        </div>
        <button className="mobile-burger" onClick={() => setMobileMenu(!mobileMenu)} style={{
          display: "none", background: "none", border: "none", cursor: "pointer",
          flexDirection: "column", gap: 5, padding: 4,
        }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: 26, height: 3, borderRadius: 2, background: "#0035FF", transition: "all 0.3s",
              transform: mobileMenu ? (i===0?"rotate(45deg) translate(5px,6px)":i===2?"rotate(-45deg) translate(5px,-6px)":"none") : "none",
              opacity: mobileMenu && i===1 ? 0 : 1 }} />
          ))}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenu && (
        <div style={{
          position: "fixed", top: 64, right: 0, left: 0, bottom: 0, zIndex: 49,
          background: "#0035FF", display: "flex", flexDirection: "column", alignItems: "center",
          paddingTop: 60, gap: 32,
        }}>
          {["יתרונות","איך זה עובד","מחירים"].map((l,i) => (
            <a key={i} href={["#features","#how","#pricing"][i]} onClick={() => setMobileMenu(false)}
              style={{ color: "#FFFFFF", fontSize: 24, fontWeight: 700, textDecoration: "none" }}>{l}</a>
          ))}
          <a href="/workspace" style={{
            background: "#FFEF00", color: "#0035FF", borderRadius: 50,
            padding: "14px 40px", fontSize: 18, fontWeight: 800, textDecoration: "none",
          }}>{"כניסה למערכת"}</a>
        </div>
      )}

      {/* ── Hero ── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
        padding: "120px 24px 80px",
        background: "#0035FF",
        position: "relative", overflow: "hidden",
      }}>
        {/* Animated blobs */}
        <div className="blob1" style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "rgba(255,239,0,0.12)", top: -100, right: -100, filter: "blur(80px)" }} />
        <div className="blob2" style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(255,255,255,0.06)", bottom: -80, left: -80, filter: "blur(60px)" }} />
        <div className="blob1" style={{ position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "rgba(255,239,0,0.08)", top: "60%", left: "15%", filter: "blur(40px)" }} />

        <div className="fade-up" style={{ position: "relative", zIndex: 1, maxWidth: 720 }}>
          <div style={{
            display: "inline-block", background: "#FFEF00",
            borderRadius: 50, padding: "8px 24px", marginBottom: 32,
            fontSize: 13, fontWeight: 800, color: "#0035FF",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "1px",
          }}>
            {"THE MONDAY.COM OPERATING SYSTEM"}
          </div>
          <h1 className="hero-title" style={{
            fontSize: "clamp(40px, 6vw, 72px)", fontWeight: 900, lineHeight: 1.05,
            marginBottom: 24, color: "#FFFFFF",
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: "-2px",
          }}>
            {"דוח לדירקטוריון?"}
            <br />
            <span style={{ color: "#FFEF00" }}>{"עוד דקה ויש לך."}</span>
          </h1>
          <p className="hero-sub" style={{
            fontSize: 20, color: "rgba(255,255,255,0.7)", lineHeight: 1.7,
            maxWidth: 500, margin: "0 auto 40px", fontWeight: 500,
          }}>
            {"AnyDay מחבר את הבורדים, הגיליונות והאקסלים שלכם והופך אותם לדוחות, תובנות והתראות חכמות. בעברית. בלי טכנולוג."}
          </p>
          <div className="hero-btns" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={scrollToDemo} className="btn-glow" style={{
              background: "#FFEF00", color: "#0035FF", border: "none", borderRadius: 50,
              padding: "18px 44px", fontSize: 18, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: "0 0 40px rgba(255,239,0,0.4)",
            }}>{"הזמינו דמו →"}</button>
            <a href="/workspace" className="btn-glow" style={{
              background: "transparent", color: "#FFFFFF",
              border: "2px solid rgba(255,255,255,0.4)", borderRadius: 50,
              padding: "16px 44px", fontSize: 18, fontWeight: 700, cursor: "pointer",
              textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif",
            }}>{"התחילו בחינם"}</a>
          </div>
        </div>

        {/* Scrolling logos / integrations */}
        <div style={{ position: "relative", zIndex: 1, marginTop: 60, overflow: "hidden", width: "100%", maxWidth: 600 }}>
          <div className="marquee-track">
            {["Monday.com","Google Sheets","Excel","CSV","API","Monday.com","Google Sheets","Excel","CSV","API"].map((t,i) => (
              <span key={i} style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap", fontFamily: "'Space Grotesk', sans-serif" }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem — Yellow band ── */}
      <section style={{ padding: "60px 24px", background: "#FFEF00", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 20, color: "#0035FF", fontFamily: "'Space Grotesk', sans-serif" }}>
            {"כל שבוע, אותו טקס."}
          </h2>
          <p style={{ fontSize: 16, color: "#0035FF", lineHeight: 1.8, opacity: 0.7 }}>
            {"הוועד מבקש עדכון. אתם שולחים מייל, היא מסננת בורדים, בונה גרפים — ומחזירה אחרי יומיים. יש לכם 14 בורדים, 6 גיליונות וארבעה אקסלים. הנתונים נמצאים. התשובות לא."}
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "100px 24px", background: "#FFFFFF", textAlign: "center" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12, color: "#0035FF", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-1px" }}>
            {"עכשיו תקבלו גם את התשובות."}
          </h2>
          <p style={{ color: "#0035FF", fontSize: 16, marginBottom: 60, opacity: 0.5 }}>
            {"AnyDay לא מחליף את Monday. הוא יושב מעליו וגורם לו סוף סוף לדבר."}
          </p>
          <div className="features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }}>
            {[
              { icon: "💬", title: "שואלים בעברית. מקבלים תשובה.", desc: "\"כמה לקוחות חתמו ברבעון?\" תשובה מיידית, עם הנתונים, עם המקור." },
              { icon: "📊", title: "דוחות ודשבורד בלחיצה.", desc: "דוח PDF לדירקטוריון, דשבורד אימפקט עם גרפים — מוכן לישיבה." },
              { icon: "🚨", title: "מתריעה לפני שמאוחר.", desc: "לקוחה שלא הגיבה 14 יום. פרויקט שזז 3 פעמים. AnyDay מזהה ושולח." },
              { icon: "🏗️", title: "בונה מערכות שלמות.", desc: "\"תבני לי CRM\" — נבנה. \"תעלי אקסל\" — מועלה ומתמפה. שיחה אחת." },
            ].map((f, i) => (
              <div key={i} className="card-pop" style={{
                background: "#FFFFFF", borderRadius: 20, padding: "36px 28px",
                border: "2px solid #0035FF", textAlign: "right",
                cursor: "default",
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: "#0035FF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20, fontSize: 28,
                }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: "#0035FF", fontFamily: "'Space Grotesk', sans-serif" }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "#0035FF", lineHeight: 1.7, margin: 0, opacity: 0.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" style={{ padding: "100px 24px", background: "#0035FF", textAlign: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 60, color: "#FFFFFF", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-1px" }}>
            {"שלושה צעדים. שתי דקות. בלי IT."}
          </h2>
          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { num: "01", title: "חברו את המקור", desc: "Monday, Google Sheets או Excel. OAuth של לחיצה אחת." },
              { num: "02", title: "AnyDay קורא", desc: "המערכת מבינה מבנה, מזהה עמודות, מחברת בורדים." },
              { num: "03", title: "שאלו. קבלו. תפעלו.", desc: "בעברית. כמו אנליסט — רק מהיר יותר וזמין 24/7." },
            ].map((s, i) => (
              <div key={i} className="card-pop" style={{
                background: "#FFFFFF", borderRadius: 24, padding: "40px 24px",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  fontSize: 80, fontWeight: 900, color: "rgba(0,53,255,0.06)",
                  fontFamily: "'Space Grotesk', sans-serif",
                  position: "absolute", top: -10, left: 10, lineHeight: 1,
                }}>{s.num}</div>
                <div style={{
                  width: 52, height: 52, borderRadius: 50,
                  background: "#FFEF00", display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 20px",
                  fontSize: 22, color: "#0035FF", fontWeight: 900,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>{s.num}</div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 10, color: "#0035FF", fontFamily: "'Space Grotesk', sans-serif" }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: "#0035FF", margin: 0, lineHeight: 1.6, opacity: 0.5 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: "100px 24px", background: "#FFFFFF", textAlign: "center" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12, color: "#0035FF", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-1px" }}>
            {"תוכנית לכל שלב."}
          </h2>
          <p style={{ color: "#0035FF", fontSize: 16, marginBottom: 50, opacity: 0.5 }}>
            {"חיבור מלא לכל הבורדים והגיליונות, בכל החבילות."}
          </p>
          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, alignItems: "stretch" }}>
            {[
              { name: "בודקים", price: "250", desc: "צ'אט + 100 שאלות", cta: "7 ימים חינם", free: true },
              { name: "לידרים", price: "450", desc: "דוחות + התראות + 500 שאלות", cta: "הזמינו דמו" },
              { name: "דירקטורים", price: "750", desc: "אוטומציות + אימפקט + 2,000", cta: "הזמינו דמו", popular: true },
              { name: "ארגון", price: "1,200", desc: "White Label + SSO + API", cta: "דברו איתנו" },
            ].map((plan, i) => (
              <div key={i} className="card-pop" style={{
                background: plan.popular ? "#0035FF" : "#FFFFFF",
                borderRadius: 24, padding: "36px 20px",
                border: plan.popular ? "none" : "2px solid #0035FF",
                display: "flex", flexDirection: "column", alignItems: "center",
                position: "relative",
              }}>
                {plan.popular && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    background: "#FFEF00", color: "#0035FF", fontSize: 12, fontWeight: 800,
                    padding: "5px 18px", borderRadius: 50,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>{"הכי פופולרי"}</div>
                )}
                {plan.free && (
                  <div style={{
                    position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                    background: "#FFEF00", color: "#0035FF", fontSize: 12, fontWeight: 800,
                    padding: "5px 18px", borderRadius: 50,
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>{"חינם 7 ימים"}</div>
                )}
                <h3 style={{ fontSize: 22, fontWeight: 900, color: plan.popular ? "#FFEF00" : "#0035FF", marginBottom: 8, fontFamily: "'Space Grotesk', sans-serif" }}>{plan.name}</h3>
                <p style={{ fontSize: 13, color: plan.popular ? "rgba(255,255,255,0.6)" : "rgba(0,53,255,0.5)", marginBottom: 24, lineHeight: 1.6, minHeight: 40 }}>{plan.desc}</p>
                <div style={{ marginBottom: 24 }}>
                  <span style={{
                    fontSize: 48, fontWeight: 900, color: plan.popular ? "#FFFFFF" : "#0035FF",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}>{plan.price}</span>
                  <span style={{ fontSize: 16, color: plan.popular ? "rgba(255,255,255,0.5)" : "rgba(0,53,255,0.4)", fontWeight: 600 }}>{" ₪/חו'"}</span>
                </div>
                <button onClick={scrollToDemo} style={{
                  width: "100%", marginTop: "auto",
                  background: plan.popular ? "#FFEF00" : "#0035FF",
                  color: plan.popular ? "#0035FF" : "#FFFFFF",
                  border: "none", borderRadius: 50, padding: "14px", fontSize: 15, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; }}
                >{plan.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security — tight strip ── */}
      <section style={{ padding: "40px 24px", background: "#FFEF00", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 48, flexWrap: "wrap" }}>
          {[
            { emoji: "🔐", label: "הצפנה AES-256" },
            { emoji: "🇮🇱", label: "שרתים בארץ" },
            { emoji: "🚫", label: "בלי אימון מודלים" },
            { emoji: "🗑️", label: "מחיקה בלחיצה" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 24 }}>{item.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0035FF", fontFamily: "'Space Grotesk', sans-serif" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: "80px 24px", background: "#FFFFFF" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 40, color: "#0035FF", textAlign: "center", fontFamily: "'Space Grotesk', sans-serif" }}>
            {"שאלות נפוצות"}
          </h2>
          {[
            { q: "למה לא Monday AI או ChatGPT?", a: "Monday AI מוגבל לבורד אחד. ChatGPT לא מחובר לנתונים. AnyDay מחבר הכל, מבין עברית, ומבצע פעולות אמיתיות." },
            { q: "האם זה מחליף את הצוות?", a: "לא. זה משחרר את הצוות מאיסוף נתונים והכנת דוחות — לעבודה אסטרטגית." },
            { q: "כמה זמן לוקחת ההטמעה?", a: "שתי דקות לחיבור. שעה לראיית ערך. שבוע לשינוי שיגרת עבודה." },
            { q: "מה אם אני לא מרוצה?", a: "7 ימי ניסיון חינם. ביטול בלחיצה. ללא חוזים." },
          ].map((faq, i) => (
            <div key={i}
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                borderBottom: "2px solid #0035FF", padding: "20px 0",
                cursor: "pointer",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#0035FF", margin: 0 }}>{faq.q}</h4>
                <span style={{
                  fontSize: 24, fontWeight: 300, color: "#0035FF",
                  transition: "transform 0.3s",
                  transform: openFaq === i ? "rotate(45deg)" : "none",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>+</span>
              </div>
              {openFaq === i && (
                <p style={{ fontSize: 14, color: "#0035FF", opacity: 0.6, margin: "12px 0 0", lineHeight: 1.7, animation: "fadeUp 0.3s ease" }}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{
        padding: "100px 24px", background: "#0035FF", textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div className="blob2" style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,239,0,0.1)", top: -50, right: -50, filter: "blur(60px)" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: "#FFFFFF", marginBottom: 16, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-1px", lineHeight: 1.2 }}>
            {"הישיבה הבאה בעוד שבוע."}
            <br />
            <span style={{ color: "#FFEF00" }}>{"הדוח מוכן בעוד דקה."}</span>
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 40, lineHeight: 1.7 }}>
            {"ללא כרטיס אשראי. ללא חוזה. ביטול בלחיצה."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={scrollToDemo} className="btn-glow" style={{
              background: "#FFEF00", color: "#0035FF", border: "none", borderRadius: 50,
              padding: "18px 48px", fontSize: 18, fontWeight: 800, cursor: "pointer",
              fontFamily: "'Space Grotesk', sans-serif",
              boxShadow: "0 0 40px rgba(255,239,0,0.4)",
            }}>{"הזמינו דמו →"}</button>
            <a href="/workspace" style={{
              background: "transparent", color: "#FFFFFF",
              border: "2px solid rgba(255,255,255,0.3)", borderRadius: 50,
              padding: "16px 48px", fontSize: 18, fontWeight: 700,
              textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#FFEF00"; e.currentTarget.style.color = "#FFEF00"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)"; e.currentTarget.style.color = "#FFFFFF"; }}
            >{"התחילו בחינם"}</a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        background: "#FFFFFF", padding: "24px", textAlign: "center",
        borderTop: "2px solid #0035FF",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "#0035FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#FFEF00", fontFamily: "'Space Grotesk', sans-serif" }}>A</div>
          <span style={{ fontSize: 15, fontWeight: 800, color: "#0035FF", fontFamily: "'Space Grotesk', sans-serif" }}>AnyDay</span>
        </div>
        <p style={{ color: "rgba(0,53,255,0.3)", fontSize: 12, margin: 0 }}>
          &copy; {new Date().getFullYear()} AnyDay. כל הזכויות שמורות.
        </p>
      </footer>
    </div>
  );
}
