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
            <p className="hero__over reveal-up">ניהול Monday לעמותות וארגונים חברתיים</p>
            <h1 className="hero__h1">
              <span className="reveal-up" style={{animationDelay:".1s"}}>הארגון שלכם גדל.</span>
              <span className="hero__accent reveal-up" style={{animationDelay:".2s"}}>ה-Monday צריך לגדול איתו.</span>
            </h1>
            <p className="hero__sub reveal-up" style={{animationDelay:".35s"}}>
              בניית מערכת ניהול חדשה, סידור בורדים קיימים, אוטומציות ודוחות לדירקטוריון — הכל במקום אחד, בלי מטמיע ובלי לחכות.
            </p>
            <div className="hero__btns reveal-up" style={{animationDelay:".5s"}}>
              <a href="/workspace" className="btn btn--lime">בנו מערכת Monday לארגון →</a>
              <a href="/workspace" className="btn btn--outline">בדקו את ה-Monday שלכם</a>
            </div>
            <p className="hero__audience reveal-up" style={{animationDelay:".6s"}}>למנכ״לים, מנהלי תוכניות, רכזי פרויקטים וצוותי עמותות שעובדים עם Monday</p>
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
                  <div className="chat-q">תבנה לי מערכת ניהול מוטבים</div>
                  <div className="chat-a">
                    <span className="chat-a__tag">AnyDay</span>
                    בניתי בורד עם <strong>5 עמודות, 3 קבוצות ו-2 אוטומציות</strong>. מוכן — רוצים להוסיף מעקב התערבויות?
                    <div className="chat-a__bar">
                      <div className="chat-a__fill" />
                    </div>
                  </div>
                </div>
                <div className="dash__cards">
                  <div className="dash__card">
                    <span className="dash__card-label">מוטבים</span>
                    <span className="dash__card-val dash__card-val--green">148 פעילים</span>
                  </div>
                  <div className="dash__card">
                    <span className="dash__card-label">תוכניות</span>
                    <span className="dash__card-val">6</span>
                  </div>
                  <div className="dash__card dash__card--alert">
                    <span className="dash__card-label">דוח</span>
                    <span className="dash__card-val dash__card-val--red">רבעוני מוכן</span>
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
          { num: 0, suffix: "", label: "מטמיעים נדרשים" },
          { num: 2, suffix: " דק׳", label: "לבנות מערכת לארגון" },
          { num: 24, suffix: "/7", label: "זמין לצוות שלכם" },
          { num: 100, suffix: "%", label: "עברית טבעית" },
        ].map((s, i) => (
          <div key={i} className="stat" data-reveal>
            <div className="stat__num">
              <span data-count={s.num}>0</span>{s.suffix}
            </div>
            <div className="stat__label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ─── WHAT CAN YOU DO ─── */}
      <section className="capabilities">
        <div className="capabilities__header" data-reveal>
          <span className="tag">מה אפשר לעשות</span>
          <h2 className="big-title">ארבעה דברים.<br/>מקום אחד.</h2>
        </div>
        <div className="capabilities__grid">
          {[
            { icon: "🏗️", title: "בנו מערכת לארגון", desc: "ניהול מוטבים, מעקב תוכניות, מאגר מתנדבים — תארו מה צריך, AnyDay בונה. בלי מטמיע." },
            { icon: "🔧", title: "סדרו מערכת קיימת", desc: "חיברו את Monday שלכם. AnyDay סורקת בורדים, מזהה כפילויות ומציעה סדר מיידי." },
            { icon: "⚡", title: "אוטומציות בקליק", desc: "״כשמשתתף סיים תוכנית — עדכנו סטטוס ושלחו דוח.״ כלל בעברית, בלי נוסחאות." },
            { icon: "📊", title: "דוחות לדירקטוריון", desc: "דוח אימפקט, סיכום רבעוני, נתוני תוצאות — מוכן לישיבה תוך שניות, לא שעות." },
          ].map((cap, i) => (
            <div key={i} className="cap-card" data-reveal style={{animationDelay: `${i * .1}s`}}>
              <span className="cap-card__icon">{cap.icon}</span>
              <h3 className="cap-card__title">{cap.title}</h3>
              <p className="cap-card__desc">{cap.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="features">
        <div className="features__header" data-reveal>
          <span className="tag">איך זה נראה בפועל</span>
          <h2 className="big-title">לא סתם<br/>עוד כלי.</h2>
        </div>

        {[
          {
            title: "\"תבנו לנו מערכת\nניהול מוטבים.\"",
            desc: "תארו מה הארגון צריך — AnyDay בונה בורדים, עמודות, קבוצות ואוטומציות. מערכת מוכנה בדקות, לא בשבועות.",
            visual: "build",
          },
          {
            title: "30 בורדים בבלגן?\nסדר תוך דקה.",
            desc: "AnyDay סורקת את כל המבנה, מזהה עמודות כפולות, תוכניות לא מעודכנות ובעיות מבניות — ומציעה תיקון מיידי.",
            visual: "alert",
          },
          {
            title: "אוטומציות\nבשפה שלכם.",
            desc: "\"כשמשתתף סיים — עדכנו סטטוס ושלחו דוח למנהל.\" הגדרתם כלל בעברית, AnyDay מפעילה אותו.",
            visual: "chat",
          },
          {
            title: "דוח לדירקטוריון?\nשניות.",
            desc: "סיכום רבעוני, נתוני אימפקט, גרפי תוצאות — מוכן לפני הישיבה. מה שלקח חצי יום עבודה קורה בלחיצה.",
            visual: "report",
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
                    <div className="fv-bubble fv-bubble--q">כשסטטוס משתנה ל״סיים״ — עדכנו דוח</div>
                    <div className="fv-bubble fv-bubble--a">אוטומציה פעילה. 14 משתתפים עודכנו החודש.</div>
                  </>
                )}
                {f.visual === "report" && (
                  <div className="fv-report">
                    <div className="fv-report__title">דוח אימפקט Q1</div>
                    <div className="fv-bars">
                      <div className="fv-bar" style={{height: "60%"}} /><div className="fv-bar" style={{height: "80%"}} />
                      <div className="fv-bar" style={{height: "45%"}} /><div className="fv-bar fv-bar--accent" style={{height: "90%"}} />
                    </div>
                  </div>
                )}
                {f.visual === "alert" && (
                  <div className="fv-alerts">
                    <div className="fv-alert fv-alert--red"><span className="fv-dot fv-dot--red" />3 עמודות כפולות בבורד מוטבים</div>
                    <div className="fv-alert fv-alert--amber"><span className="fv-dot fv-dot--amber" />קבוצה ריקה: ״ארכיון 2024״</div>
                    <div className="fv-alert fv-alert--green"><span className="fv-dot fv-dot--green" />מבנה תוכנית תוקן</div>
                  </div>
                )}
                {f.visual === "build" && (
                  <div className="fv-build">
                    <div className="fv-build__block fv-build__block--1" />
                    <div className="fv-build__block fv-build__block--2" />
                    <div className="fv-build__block fv-build__block--3" />
                    <div className="fv-build__label">מערכת ניהול</div>
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
          <span className="tag tag--dark">איך זה עובד</span>
          <h2 className="big-title big-title--light">שתי דקות.<br/>אפס מטמיעים.<br/>Monday שעובד.</h2>
        </div>

        <div className="timeline">
          <div className="timeline__line" />
          {[
            { num: "01", title: "חברו את Monday של הארגון", desc: "הכניסו API Token — וזהו. בלי התקנות, בלי הגדרות, בלי IT.", color: "var(--lime)" },
            { num: "02", title: "בנו מערכת או סדרו קיימת", desc: "ניהול מוטבים, מעקב תוכניות, דוחות — תארו מה צריך או תנו ל-AnyDay לסרוק ולשפר.", color: "var(--orange)" },
            { num: "03", title: "הפעילו ותנהלו", desc: "אוטומציות, דוחות לדירקטוריון, עדכונים — הכל בעברית, הכל במקום אחד.", color: "var(--cyan)" },
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
          <h2 className="big-title">בחרו את הגודל שלכם.</h2>
        </div>

        <div className="plans">
          {[
            { name: "סטארטר", price: "250", items: ["בניית בורדים בעברית","100 פעולות בחודש","בורד אחד"], cta: "להתחיל בחינם →", badge: "לנסות" },
            { name: "צוות", price: "450", items: ["דוחות PDF לדירקטוריון","התראות חכמות","500 פעולות בחודש"], cta: "להתחיל →" },
            { name: "ארגון", price: "750", items: ["אוטומציות מלאות","דשבורד אימפקט","2,000 פעולות בחודש","בורדים ללא הגבלה"], cta: "להתחיל →", pop: true },
            { name: "רשת / קבוצה", price: "1,200", items: ["מספר עמותות","SSO + API","תמיכה ייעודית","SLA מותאם"], cta: "בואו נדבר →" },
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
            "הצפנה AES-256","שרתים בישראל","לא מאמנים על הנתונים שלכם","מחיקה מלאה בלחיצה",
          ].map((label,i) => (
            <div key={i} className="trust__item">
              <span className="trust__check">✓</span><span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="faq-section">
        <div className="faq-section__header" data-reveal>
          <span className="tag">שאלות</span>
          <h2 className="big-title">שאלות שכולם שואלים.</h2>
        </div>
        <div className="faq-list">
          {[
            { q: "זה מתאים לעמותות קטנות?", a: "בדיוק בשביל זה. עמותה עם 3 אנשי צוות ו-5 בורדים — או רשת עם 50 בורדים. AnyDay מתאימה את עצמה לגודל הארגון." },
            { q: "מה צריך מהצד שלנו?", a: "API Token של Monday (מקבלים בשתי דקות) — וזהו. בלי התקנות, בלי הגדרות, בלי לשנות כלום בבורדים. AnyDay מתחברת ולומדת את המבנה לבד." },
            { q: "אפשר לבנות מערכת ניהול מוטבים?", a: "כן. תארו מה אתם צריכים — AnyDay בונה בורד עם עמודות, קבוצות, אוטומציות ומעקב. מערכת מוכנה בדקות." },
            { q: "יש לנו 30 בורדים בבלגן. זה עוזר?", a: "בדיוק בשביל זה. AnyDay סורקת את כל המבנה, מזהה כפילויות, עמודות ריקות ובעיות — ומציעה סדר מיידי." },
            { q: "ואם לא מתאים?", a: "7 ימי ניסיון חינם. ביטול בלחיצה אחת. בלי חוזה, בלי שיחת שימור, בלי התחייבות." },
            { q: "הנתונים של המוטבים בטוחים?", a: "הצפנה מלאה, אנחנו לא שומרים נתונים ולא מאמנים מודלים עליהם. כל שאילתה רצה בזמן אמת ונמחקת. ואפשר לנתק בלחיצה." },
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
            הארגון שלכם<br/>יכול לנהל<br/>הרבה יותר טוב.
          </h2>
          <p className="final__accent">בנו מערכת ניהול חדשה או שפרו את הקיימת — בדקות, לא בשבועות.</p>
          <p className="final__sub">ללא כרטיס אשראי · ללא מטמיע · ביטול בלחיצה</p>
          <a href="/workspace" className="btn btn--lime btn--xl">בנו מערכת Monday לארגון →</a>
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
