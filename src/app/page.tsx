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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Counter animation
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const target = parseInt(el.dataset.count || "0");
          let current = 0;
          const step = Math.ceil(target / 40);
          const timer = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = current.toString();
          }, 30);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll("[data-count]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function scrollToDemo() {
    window.location.href = "mailto:hello@anyday.co.il?subject=הזמנת דמו של 15 דקות";
  }

  if (board) {
    return <BoardDashboard board={board} items={items} onBack={() => { setBoard(null); setItems([]); }} apiToken={apiToken} boardId={boardId} />;
  }

  return (
    <div dir="rtl" className="root">

      {/* ─── NAV ─── */}
      <nav className={`nav ${scrolled ? "nav--solid" : ""}`}>
        <a href="/" className="nav__logo">
          <span className="nav__mark">A</span>
          <span className="nav__name">AnyDay</span>
        </a>
        <div className="nav__links">
          {[["#features","יתרונות"],["#how","תהליך"],["#pricing","מחירים"]].map(([h,l]) => (
            <a key={h} href={h} className="nav__link">{l}</a>
          ))}
          <a href="/workspace" className="nav__enter">כניסה →</a>
        </div>
        <button className="nav__burger" onClick={() => setMobileMenu(!mobileMenu)} aria-label="תפריט">
          <span className={mobileMenu ? "x" : ""} />
          <span className={mobileMenu ? "x" : ""} />
        </button>
      </nav>

      {mobileMenu && (
        <div className="mob">
          {[["#features","יתרונות"],["#how","תהליך"],["#pricing","מחירים"]].map(([h,l],i) => (
            <a key={h} href={h} onClick={() => setMobileMenu(false)} className="mob__link" style={{animationDelay:`${i*.08}s`}}>{l}</a>
          ))}
          <a href="/workspace" className="mob__cta">כניסה למערכת</a>
        </div>
      )}

      {/* ─── HERO ─── */}
      <section className="hero">
        <div className="hero__bg">
          <div className="hero__orb hero__orb--1" />
          <div className="hero__orb hero__orb--2" />
          <div className="hero__grain" />
        </div>

        <div className="hero__inner">
          <div className="hero__text">
            <p className="hero__over reveal-up">The Monday.com AI Layer</p>
            <h1 className="hero__h1">
              <span className="reveal-up" style={{animationDelay:".1s"}}>דוח לדירקטוריון?</span>
              <span className="hero__accent reveal-up" style={{animationDelay:".2s"}}>עוד דקה ויש לך.</span>
            </h1>
            <p className="hero__sub reveal-up" style={{animationDelay:".35s"}}>
              AnyDay מחבר בורדים, גיליונות ואקסלים — ומחזיר דוחות, תובנות והתראות חכמות. בעברית. בלי טכנולוג.
            </p>
            <div className="hero__btns reveal-up" style={{animationDelay:".5s"}}>
              <button onClick={scrollToDemo} className="btn btn--lime">הזמינו דמו</button>
              <a href="/workspace" className="btn btn--outline">התחילו בחינם</a>
            </div>
          </div>

          {/* Floating Dashboard */}
          <div className="hero__visual reveal-up" style={{animationDelay:".4s"}}>
            <div className="dash">
              <div className="dash__bar">
                <div className="dash__dots"><i/><i/><i/></div>
                <span className="dash__url">app.anyday.co.il</span>
              </div>
              <div className="dash__body">
                <div className="dash__chat">
                  <div className="chat-q">כמה לקוחות חתמו ברבעון?</div>
                  <div className="chat-a">
                    <span className="chat-a__tag">AnyDay</span>
                    ברבעון הנוכחי נחתמו <strong>47 לקוחות חדשים</strong> — עלייה של 23% לעומת הרבעון הקודם.
                    <div className="chat-a__bar">
                      <div className="chat-a__fill" />
                    </div>
                  </div>
                </div>
                <div className="dash__cards">
                  <div className="dash__card">
                    <span className="dash__card-label">ביצוע</span>
                    <span className="dash__card-val dash__card-val--green">89%</span>
                  </div>
                  <div className="dash__card">
                    <span className="dash__card-label">פרויקטים</span>
                    <span className="dash__card-val">12</span>
                  </div>
                  <div className="dash__card dash__card--alert">
                    <span className="dash__card-label">התראה</span>
                    <span className="dash__card-val dash__card-val--red">לקוח לא הגיב 14 יום</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagonal cut */}
        <div className="hero__cut" />
      </section>

      {/* ─── STATS RIBBON ─── */}
      <section className="stats">
        {[
          { num: 47, suffix: "+", label: "לקוחות ברבעון" },
          { num: 89, suffix: "%", label: "אחוז ביצוע" },
          { num: 2, suffix: " דק'", label: "זמן הטמעה" },
          { num: 14, suffix: "+", label: "בורדים מחוברים" },
        ].map((s, i) => (
          <div key={i} className="stat" data-reveal>
            <div className="stat__num">
              <span data-count={s.num}>0</span>{s.suffix}
            </div>
            <div className="stat__label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="features">
        <div className="features__header" data-reveal>
          <span className="tag">יכולות</span>
          <h2 className="big-title">לא עוד<br/>דשבורד.</h2>
        </div>

        {[
          {
            title: "שואלים בעברית.\nמקבלים תשובה.",
            desc: "\"כמה לקוחות חתמו ברבעון?\" תשובה מיידית, עם הנתונים, עם המקור. כמו אנליסט שזמין 24/7.",
            visual: "chat",
          },
          {
            title: "דוחות ודשבורד\nבלחיצה.",
            desc: "דוח PDF לדירקטוריון, דשבורד אימפקט עם גרפים, סיכום רבעוני — מוכן לישיבה תוך דקה.",
            visual: "report",
          },
          {
            title: "מתריעה לפני\nשמאוחר.",
            desc: "לקוחה שלא הגיבה 14 יום. פרויקט שזז 3 פעמים. AnyDay מזהה ושולח לפני שהבעיה מתפוצצת.",
            visual: "alert",
          },
          {
            title: "בונה מערכות\nשלמות.",
            desc: "\"תבני לי CRM\" — נבנה. \"תעלי אקסל\" — מועלה ומתמפה לבורד חדש. שיחה אחת.",
            visual: "build",
          },
        ].map((f, i) => (
          <div key={i} className={`feat ${i % 2 === 1 ? "feat--flip" : ""}`} data-reveal>
            <div className="feat__text">
              <span className="feat__num">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="feat__title">{f.title}</h3>
              <p className="feat__desc">{f.desc}</p>
            </div>
            <div className="feat__visual">
              <div className={`feat__box feat__box--${f.visual}`}>
                {f.visual === "chat" && (
                  <>
                    <div className="fv-bubble fv-bubble--q">כמה פרויקטים נסגרו?</div>
                    <div className="fv-bubble fv-bubble--a">12 פרויקטים נסגרו ברבעון. 3 בהמתנה.</div>
                  </>
                )}
                {f.visual === "report" && (
                  <div className="fv-report">
                    <div className="fv-report__title">דוח רבעוני Q1</div>
                    <div className="fv-bars">
                      <div className="fv-bar" style={{height: "60%"}} /><div className="fv-bar" style={{height: "80%"}} />
                      <div className="fv-bar" style={{height: "45%"}} /><div className="fv-bar fv-bar--accent" style={{height: "90%"}} />
                    </div>
                  </div>
                )}
                {f.visual === "alert" && (
                  <div className="fv-alerts">
                    <div className="fv-alert fv-alert--red"><span className="fv-dot fv-dot--red" />לקוח לא הגיב 14 יום</div>
                    <div className="fv-alert fv-alert--amber"><span className="fv-dot fv-dot--amber" />פרויקט בעיכוב</div>
                    <div className="fv-alert fv-alert--green"><span className="fv-dot fv-dot--green" />משימה הושלמה</div>
                  </div>
                )}
                {f.visual === "build" && (
                  <div className="fv-build">
                    <div className="fv-build__block fv-build__block--1" />
                    <div className="fv-build__block fv-build__block--2" />
                    <div className="fv-build__block fv-build__block--3" />
                    <div className="fv-build__label">CRM חדש</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ─── HOW ─── */}
      <section id="how" className="how">
        <div className="how__header" data-reveal>
          <span className="tag tag--dark">תהליך</span>
          <h2 className="big-title big-title--light">שלושה צעדים.<br/>שתי דקות.<br/>בלי IT.</h2>
        </div>

        <div className="timeline">
          <div className="timeline__line" />
          {[
            { num: "01", title: "חברו את המקור", desc: "Monday, Google Sheets או Excel. OAuth בלחיצה אחת.", color: "var(--lime)" },
            { num: "02", title: "AnyDay קורא", desc: "מבין מבנה, מזהה עמודות, מחבר בורדים.", color: "var(--orange)" },
            { num: "03", title: "שאלו. קבלו. תפעלו.", desc: "בעברית. כמו אנליסט — רק מהיר יותר.", color: "var(--cyan)" },
          ].map((s, i) => (
            <div key={i} className="tl-step" data-reveal>
              <div className="tl-step__dot" style={{background: s.color}} />
              <div className="tl-step__num" style={{color: s.color}}>{s.num}</div>
              <h3 className="tl-step__title">{s.title}</h3>
              <p className="tl-step__desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section id="pricing" className="pricing">
        <div className="pricing__header" data-reveal>
          <span className="tag">מחירים</span>
          <h2 className="big-title">תוכנית לכל שלב.</h2>
        </div>

        <div className="plans">
          {[
            { name: "בודקים", price: "250", items: ["צ'אט AI בעברית","100 שאלות/חודש","חיבור בורד אחד"], cta: "7 ימים חינם", badge: "FREE TRIAL" },
            { name: "לידרים", price: "450", items: ["דוחות PDF","התראות חכמות","500 שאלות/חודש"], cta: "הזמינו דמו" },
            { name: "דירקטורים", price: "750", items: ["אוטומציות","דשבורד אימפקט","2,000 שאלות/חודש","בורדים ללא הגבלה"], cta: "הזמינו דמו", pop: true },
            { name: "ארגון", price: "1,200", items: ["White Label","SSO + API","תמיכה ייעודית"], cta: "דברו איתנו" },
          ].map((p, i) => (
            <div key={i} className={`plan ${p.pop ? "plan--pop" : ""}`} data-reveal>
              {(p.pop || p.badge) && <div className="plan__badge">{p.pop ? "פופולרי" : p.badge}</div>}
              <h3 className="plan__name">{p.name}</h3>
              <div className="plan__price">
                <span className="plan__amount">{p.price}</span>
                <span className="plan__period">₪/חו׳</span>
              </div>
              <ul className="plan__list">
                {p.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
              <button onClick={scrollToDemo} className={`btn ${p.pop ? "btn--lime" : "btn--outline btn--outline-dark"}`}>{p.cta}</button>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TRUST ─── */}
      <section className="trust" data-reveal>
        <div className="trust__inner">
          {[
            ["🔐","הצפנה AES-256"],["🇮🇱","שרתים בארץ"],["🚫","בלי אימון מודלים"],["🗑️","מחיקה בלחיצה"],
          ].map(([icon,label],i) => (
            <div key={i} className="trust__item">
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <div className="faq-section__header" data-reveal>
          <span className="tag">שאלות</span>
          <h2 className="big-title">שאלתם? ענינו.</h2>
        </div>
        <div className="faq-list">
          {[
            { q: "למה לא Monday AI או ChatGPT?", a: "Monday AI מוגבל לבורד אחד. ChatGPT לא מחובר לנתונים. AnyDay מחבר הכל, מבין עברית, ומבצע פעולות אמיתיות." },
            { q: "האם זה מחליף את הצוות?", a: "לא. זה משחרר את הצוות מאיסוף נתונים — לעבודה אסטרטגית." },
            { q: "כמה זמן לוקחת ההטמעה?", a: "שתי דקות לחיבור. שעה לראיית ערך. שבוע לשינוי שיגרת עבודה." },
            { q: "מה אם אני לא מרוצה?", a: "7 ימי ניסיון חינם. ביטול בלחיצה. ללא חוזים." },
          ].map((faq, i) => (
            <div key={i} className={`faq ${openFaq === i ? "faq--open" : ""}`} data-reveal
              onClick={() => setOpenFaq(openFaq === i ? null : i)}>
              <div className="faq__q">
                <span>{faq.q}</span>
                <span className="faq__icon">{openFaq === i ? "−" : "+"}</span>
              </div>
              <div className="faq__a"><p>{faq.a}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="final">
        <div className="final__bg" />
        <div className="final__content" data-reveal>
          <h2 className="final__title">
            הישיבה הבאה<br/>בעוד שבוע.
          </h2>
          <p className="final__accent">הדוח מוכן בעוד דקה.</p>
          <p className="final__sub">ללא כרטיס אשראי · ללא חוזה · ביטול בלחיצה</p>
          <button onClick={scrollToDemo} className="btn btn--lime btn--xl">הזמינו דמו →</button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="foot">
        <a href="/" className="nav__logo"><span className="nav__mark nav__mark--sm">A</span><span className="nav__name">AnyDay</span></a>
        <p>&copy; {new Date().getFullYear()} AnyDay</p>
      </footer>
    </div>
  );
}
