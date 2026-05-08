"use client";

import { useState, useEffect, useRef } from "react";
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
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveal observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".scroll-reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function scrollToDemo() {
    window.location.href = "mailto:hello@anyday.co.il?subject=הזמנת דמו של 15 דקות";
  }

  if (board) {
    return <BoardDashboard board={board} items={items} onBack={() => { setBoard(null); setItems([]); }} apiToken={apiToken} boardId={boardId} />;
  }

  return (
    <div dir="rtl" className="page-root">

      {/* ── Navbar ── */}
      <nav className={`nav-bar ${scrolled ? "nav-scrolled" : ""}`}>
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <div className="logo-mark">A</div>
            <span className="logo-text">AnyDay</span>
          </a>
          <div className="nav-links desktop-nav">
            {[["#features","יתרונות"],["#how","איך זה עובד"],["#pricing","מחירים"]].map(([href, label]) => (
              <a key={href} href={href} className="nav-link">{label}</a>
            ))}
            <a href="/workspace" className="nav-cta">כניסה למערכת</a>
          </div>
          <button className="mobile-burger" onClick={() => setMobileMenu(!mobileMenu)} aria-label="תפריט">
            <span className={`burger-line ${mobileMenu ? "open" : ""}`} />
            <span className={`burger-line ${mobileMenu ? "open" : ""}`} />
            <span className={`burger-line ${mobileMenu ? "open" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      {mobileMenu && (
        <div className="mobile-overlay">
          {[["#features","יתרונות"],["#how","איך זה עובד"],["#pricing","מחירים"]].map(([href, label], i) => (
            <a key={href} href={href} onClick={() => setMobileMenu(false)}
              className="mobile-link" style={{ animationDelay: `${i * 0.08}s` }}>{label}</a>
          ))}
          <a href="/workspace" className="mobile-cta" style={{ animationDelay: "0.24s" }}>כניסה למערכת</a>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-mesh" />
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-glow hero-glow-3" />

        <div className="hero-content reveal">
          <div className="hero-badge">
            <span className="badge-dot" />
            AI-Powered Monday.com OS
          </div>
          <h1 className="hero-title">
            <span className="title-line reveal-text">דוח לדירקטוריון?</span>
            <span className="title-line title-accent reveal-text" style={{ animationDelay: "0.15s" }}>עוד דקה ויש לך.</span>
          </h1>
          <p className="hero-desc reveal-text" style={{ animationDelay: "0.3s" }}>
            AnyDay מחבר את הבורדים, הגיליונות והאקסלים שלכם — והופך אותם לדוחות, תובנות והתראות חכמות. בעברית. בלי טכנולוג.
          </p>
          <div className="hero-actions reveal-text" style={{ animationDelay: "0.45s" }}>
            <button onClick={scrollToDemo} className="btn-primary">
              <span>הזמינו דמו</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <a href="/workspace" className="btn-ghost">התחילו בחינם</a>
          </div>
        </div>

        {/* Dashboard mockup */}
        <div className="hero-mockup reveal-text" style={{ animationDelay: "0.6s" }}>
          <div className="mockup-window">
            <div className="mockup-dots">
              <span /><span /><span />
            </div>
            <div className="mockup-content">
              <div className="mock-row">
                <div className="mock-card mock-card-wide">
                  <div className="mock-label">לקוחות חדשים ברבעון</div>
                  <div className="mock-number">+47</div>
                  <div className="mock-bar">
                    <div className="mock-bar-fill" style={{ width: "78%" }} />
                  </div>
                </div>
                <div className="mock-card">
                  <div className="mock-label">פרויקטים פעילים</div>
                  <div className="mock-number">12</div>
                </div>
              </div>
              <div className="mock-row">
                <div className="mock-card">
                  <div className="mock-label">אחוז ביצוע</div>
                  <div className="mock-number mock-green">89%</div>
                </div>
                <div className="mock-card mock-card-wide">
                  <div className="mock-label">התראות השבוע</div>
                  <div className="mock-alerts">
                    <div className="mock-alert mock-alert-red">לקוח לא הגיב 14 יום</div>
                    <div className="mock-alert mock-alert-amber">פרויקט בעיכוב</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="marquee-wrap">
          <div className="marquee-fade marquee-fade-r" />
          <div className="marquee-fade marquee-fade-l" />
          <div className="marquee-track">
            {["Monday.com","Google Sheets","Excel","CSV","REST API","Webhooks","Monday.com","Google Sheets","Excel","CSV","REST API","Webhooks"].map((t,i) => (
              <span key={i} className="marquee-item">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem ── */}
      <section className="section-problem scroll-reveal">
        <div className="container-sm">
          <div className="problem-card">
            <div className="problem-icon">⚡</div>
            <h2 className="section-title">כל שבוע, אותו טקס.</h2>
            <p className="problem-text">
              הוועד מבקש עדכון. אתם שולחים מייל, היא מסננת בורדים, בונה גרפים — ומחזירה אחרי יומיים.
              <br /><strong>יש לכם 14 בורדים, 6 גיליונות וארבעה אקסלים. הנתונים נמצאים. התשובות לא.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ── Features — Bento Grid ── */}
      <section id="features" className="section-features">
        <div className="container">
          <div className="section-header scroll-reveal">
            <span className="section-tag">יכולות</span>
            <h2 className="section-title">עכשיו תקבלו גם את התשובות.</h2>
            <p className="section-sub">AnyDay לא מחליף את Monday. הוא יושב מעליו וגורם לו סוף סוף לדבר.</p>
          </div>

          <div className="bento-grid">
            {[
              { icon: "💬", title: "שואלים בעברית.\nמקבלים תשובה.", desc: "\"כמה לקוחות חתמו ברבעון?\" — תשובה מיידית, עם הנתונים, עם המקור.", size: "large" },
              { icon: "📊", title: "דוחות ודשבורד\nבלחיצה.", desc: "דוח PDF לדירקטוריון, דשבורד אימפקט עם גרפים — מוכן לישיבה.", size: "normal" },
              { icon: "🚨", title: "מתריעה לפני\nשמאוחר.", desc: "לקוחה שלא הגיבה 14 יום. פרויקט שזז 3 פעמים. AnyDay מזהה ושולח.", size: "normal" },
              { icon: "🏗️", title: "בונה מערכות\nשלמות.", desc: "\"תבני לי CRM\" — נבנה. \"תעלי אקסל\" — מועלה ומתמפה. שיחה אחת.", size: "large" },
            ].map((f, i) => (
              <div key={i} className={`bento-card bento-${f.size} scroll-reveal`} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="bento-icon">{f.icon}</div>
                <h3 className="bento-title">{f.title}</h3>
                <p className="bento-desc">{f.desc}</p>
                <div className="bento-glow" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="section-how">
        <div className="container">
          <div className="section-header scroll-reveal">
            <span className="section-tag">תהליך</span>
            <h2 className="section-title">שלושה צעדים. שתי דקות. בלי IT.</h2>
          </div>

          <div className="steps">
            {[
              { num: "01", title: "חברו את המקור", desc: "Monday, Google Sheets או Excel. OAuth של לחיצה אחת.", color: "var(--purple)" },
              { num: "02", title: "AnyDay קורא", desc: "המערכת מבינה מבנה, מזהה עמודות, מחברת בורדים.", color: "var(--cyan)" },
              { num: "03", title: "שאלו. קבלו. תפעלו.", desc: "בעברית. כמו אנליסט — רק מהיר יותר וזמין 24/7.", color: "var(--amber)" },
            ].map((s, i) => (
              <div key={i} className="step-card scroll-reveal" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="step-num" style={{ color: s.color }}>{s.num}</div>
                <div className="step-line" style={{ background: s.color }} />
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="section-pricing">
        <div className="container">
          <div className="section-header scroll-reveal">
            <span className="section-tag">מחירים</span>
            <h2 className="section-title">תוכנית לכל שלב.</h2>
            <p className="section-sub">חיבור מלא לכל הבורדים והגיליונות, בכל החבילות.</p>
          </div>

          <div className="pricing-grid">
            {[
              { name: "בודקים", price: "250", desc: "צ'אט + 100 שאלות", cta: "7 ימים חינם", badge: "חינם 7 ימים" },
              { name: "לידרים", price: "450", desc: "דוחות + התראות + 500 שאלות", cta: "הזמינו דמו" },
              { name: "דירקטורים", price: "750", desc: "אוטומציות + אימפקט + 2,000 שאלות", cta: "הזמינו דמו", popular: true },
              { name: "ארגון", price: "1,200", desc: "White Label + SSO + API", cta: "דברו איתנו" },
            ].map((plan, i) => (
              <div key={i} className={`price-card scroll-reveal ${plan.popular ? "price-popular" : ""}`} style={{ animationDelay: `${i * 0.1}s` }}>
                {(plan.popular || plan.badge) && (
                  <div className="price-badge">{plan.popular ? "הכי פופולרי" : plan.badge}</div>
                )}
                <h3 className="price-name">{plan.name}</h3>
                <p className="price-desc">{plan.desc}</p>
                <div className="price-amount">
                  <span className="price-num">{plan.price}</span>
                  <span className="price-period">₪/חודש</span>
                </div>
                <button onClick={scrollToDemo} className={`price-cta ${plan.popular ? "price-cta-pop" : ""}`}>{plan.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security strip ── */}
      <section className="section-security scroll-reveal">
        <div className="security-inner">
          {[
            { icon: "🔐", label: "הצפנה AES-256" },
            { icon: "🇮🇱", label: "שרתים בארץ" },
            { icon: "🚫", label: "בלי אימון מודלים" },
            { icon: "🗑️", label: "מחיקה בלחיצה" },
          ].map((item, i) => (
            <div key={i} className="security-item">
              <span className="security-icon">{item.icon}</span>
              <span className="security-label">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-faq">
        <div className="container-sm">
          <div className="section-header scroll-reveal">
            <span className="section-tag">שאלות נפוצות</span>
            <h2 className="section-title">יש שאלות? יש תשובות.</h2>
          </div>

          <div className="faq-list">
            {[
              { q: "למה לא Monday AI או ChatGPT?", a: "Monday AI מוגבל לבורד אחד. ChatGPT לא מחובר לנתונים. AnyDay מחבר הכל, מבין עברית, ומבצע פעולות אמיתיות." },
              { q: "האם זה מחליף את הצוות?", a: "לא. זה משחרר את הצוות מאיסוף נתונים והכנת דוחות — לעבודה אסטרטגית." },
              { q: "כמה זמן לוקחת ההטמעה?", a: "שתי דקות לחיבור. שעה לראיית ערך. שבוע לשינוי שיגרת עבודה." },
              { q: "מה אם אני לא מרוצה?", a: "7 ימי ניסיון חינם. ביטול בלחיצה. ללא חוזים." },
            ].map((faq, i) => (
              <div key={i} className={`faq-item scroll-reveal ${openFaq === i ? "faq-open" : ""}`}
                style={{ animationDelay: `${i * 0.08}s` }}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <div className="faq-q">
                  <h4>{faq.q}</h4>
                  <span className="faq-toggle">{openFaq === i ? "−" : "+"}</span>
                </div>
                <div className="faq-a">
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="section-cta">
        <div className="cta-glow" />
        <div className="container-sm scroll-reveal">
          <h2 className="cta-title">
            הישיבה הבאה בעוד שבוע.
            <br />
            <span className="cta-accent">הדוח מוכן בעוד דקה.</span>
          </h2>
          <p className="cta-sub">ללא כרטיס אשראי. ללא חוזה. ביטול בלחיצה.</p>
          <div className="cta-actions">
            <button onClick={scrollToDemo} className="btn-primary btn-lg">
              <span>הזמינו דמו</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <a href="/workspace" className="btn-ghost">התחילו בחינם</a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <a href="/" className="nav-logo">
          <div className="logo-mark logo-mark-sm">A</div>
          <span className="logo-text logo-text-sm">AnyDay</span>
        </a>
        <p className="footer-copy">&copy; {new Date().getFullYear()} AnyDay. כל הזכויות שמורות.</p>
      </footer>
    </div>
  );
}
