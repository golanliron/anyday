import type { HealthCheckResult } from "@/types/health";

interface HealthSummaryProps {
  result: HealthCheckResult;
  boardNames: string[];
  totalBoardsInAccount: number;
  /** "מבוסס על X מתוך Y רשומות" — מגיע רק כשהקריאה נקטעה בתקרה. */
  coverageNote?: string;
}

function scoreColor(score: number) {
  if (score >= 80) return "var(--color-green)";
  if (score >= 50) return "#B8860B";
  return "var(--color-red)";
}

function scoreEmoji(score: number) {
  if (score >= 80) return "\uD83D\uDC9A";
  if (score >= 50) return "\uD83D\uDFE1";
  return "\uD83D\uDD34";
}

function scoreLabel(score: number) {
  if (score >= 90) return "מצוין";
  if (score >= 80) return "טוב";
  if (score >= 60) return "בינוני";
  if (score >= 40) return "דורש שיפור";
  return "דורש טיפול דחוף";
}

function summaryText(score: number, summary: HealthCheckResult["summary"]): string {
  const total = summary.critical + summary.warning + summary.info;
  if (total === 0) return "סביבת העבודה שלכם במצב מצוין. לא נמצאו בעיות.";
  if (score >= 80) return "סביבת העבודה במצב טוב. יש כמה שיפורים קטנים שכדאי לטפל בהם.";
  if (score >= 60) return "יש מספר ממצאים שדורשים תשומת לב. כדאי לטפל קודם בקריטיים.";
  if (score >= 40) return "נמצאו בעיות שמשפיעות על ניהול העבודה. מומלץ לטפל בהן בהקדם.";
  return "נמצאו בעיות משמעותיות שדורשות טיפול דחוף. התחילו מהממצאים הקריטיים.";
}

export function HealthSummary({ result, boardNames, totalBoardsInAccount, coverageNote }: HealthSummaryProps) {
  return (
    <div className="fade-up" style={{
      background: "var(--color-surf)",
      borderRadius: 16,
      border: "1px solid var(--color-border)",
      padding: 32,
      marginBottom: 20,
    }}>
      {/* Score */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>
          {scoreEmoji(result.score)}
        </div>
        <div style={{
          fontSize: 56,
          fontWeight: 800,
          color: scoreColor(result.score),
          lineHeight: 1,
          marginBottom: 8,
        }}>
          {result.score}
        </div>
        <div style={{ fontSize: 13, color: "var(--color-muted)", marginBottom: 8 }}>
          מתוך 100
        </div>
        <div style={{
          fontSize: 20,
          fontWeight: 700,
          color: scoreColor(result.score),
          marginBottom: 12,
        }}>
          {scoreLabel(result.score)}
        </div>
        <p style={{
          fontSize: 15,
          color: "var(--color-text2)",
          lineHeight: 1.6,
          maxWidth: 500,
          margin: "0 auto",
        }}>
          {summaryText(result.score, result.summary)}
        </p>
      </div>

      {/* Stats grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: 12,
        marginTop: 20,
      }}>
        <StatBox label="בורדים נסרקו" value={result.boardsScanned} icon={"\uD83D\uDCCB"} />
        <StatBox label="פריטים" value={result.totalItems} icon={"\uD83D\uDCDD"} />
        {result.summary.critical > 0 && (
          <StatBox label="קריטיים" value={result.summary.critical} icon={"\uD83D\uDD34"} color="var(--color-red)" />
        )}
        {result.summary.warning > 0 && (
          <StatBox label="אזהרות" value={result.summary.warning} icon={"\uD83D\uDFE1"} color="#B8860B" />
        )}
        {result.summary.info > 0 && (
          <StatBox label="טיפים" value={result.summary.info} icon={"\uD83D\uDD35"} color="var(--color-blue)" />
        )}
      </div>

      {/* Boards scanned */}
      {boardNames.length > 0 && (
        <div style={{
          marginTop: 16,
          padding: "10px 14px",
          borderRadius: 10,
          background: "var(--color-surf2)",
          fontSize: 13,
          color: "var(--color-muted)",
        }}>
          <strong>בורדים שנסרקו:</strong>{" "}
          {boardNames.join(" \u00B7 ")}
          {totalBoardsInAccount > result.boardsScanned && (
            <span style={{ fontSize: 12 }}>
              {" "}(מתוך {totalBoardsInAccount} בורדים בחשבון)
            </span>
          )}
          {coverageNote && (
            <span style={{ fontSize: 12 }}>
              {" "}· {coverageNote}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, icon, color }: {
  label: string;
  value: number;
  icon: string;
  color?: string;
}) {
  return (
    <div style={{
      background: "var(--color-surf2)",
      borderRadius: 10,
      padding: "12px 14px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 14, marginBottom: 4 }}>{icon}</div>
      <div style={{
        fontSize: 24,
        fontWeight: 800,
        color: color || "var(--color-text)",
        lineHeight: 1.2,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
