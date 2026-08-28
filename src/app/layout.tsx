import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "AnyDay — ה-Monday של הארגון, סוף סוף קריא",
  description:
    "מחברים את חשבון ה-Monday, ואוטומטית נבנה דשבורד קריא עם תובנות ועם פעולות שמתעדכנות חזרה בבורד. אפס הגדרות — לכל ארגון שעובד עם Monday.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full bg-bg text-text font-dm antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
