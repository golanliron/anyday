"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Spinner } from "@/components/ui/Spinner";
import { BoardDashboard } from "@/components/board/BoardDashboard";
import { loadBoard, listBoards } from "@/lib/api-client";
import type { MondayBoard, MondayItem } from "@/types";

const T = {
  he: {
    nav: { features: "\u05D9\u05EA\u05E8\u05D5\u05E0\u05D5\u05EA", how: "\u05D0\u05D9\u05DA \u05D6\u05D4 \u05E2\u05D5\u05D1\u05D3", pricing: "\u05DE\u05D7\u05D9\u05E8", cta: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u2190" },
    hero: {
      badge: "MADE FOR MONDAY \u00B7 BUILT FOR ANY DAY",
      title1: "\u05D3\u05D5\u05D7 \u05DC\u05D3\u05D9\u05E8\u05E7\u05D8\u05D5\u05E8\u05D9\u05D5\u05DF",
      titleAccent: "\u05D3\u05E7\u05D4",
      titleFade: "\u05DC\u05D0 \u05D9\u05D5\u05DE\u05D9\u05D9\u05DD.",
      sub: "\u05DE\u05D7\u05D1\u05E8\u05D9\u05DD \u05D0\u05EA \u05D4\u05D1\u05D5\u05E8\u05D3\u05D9\u05DD \u05D5\u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05E0\u05D5\u05EA \u05E9\u05DC\u05DA \u05D5\u05D4\u05D5\u05E4\u05DB\u05D9\u05DD \u05D0\u05D5\u05EA\u05DD \u05DC\u05D3\u05D5\u05D7\u05D5\u05EA \u05DE\u05E0\u05D4\u05DC\u05D9\u05DD, \u05EA\u05D5\u05D1\u05E0\u05D5\u05EA \u05D0\u05E1\u05D8\u05E8\u05D8\u05D2\u05D9\u05D5\u05EA \u05D5\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA. \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA.",
      cta1: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 7 \u05D9\u05DE\u05D9\u05DD \u05D7\u05D9\u05E0\u05DD \u2190",
      cta2: "\u05E6\u05E4\u05D5 \u05D1\u05D3\u05DE\u05D5 \u05E9\u05DC \u05D3\u05E7\u05D4",
      trust: "// \u05DC\u05DC\u05D0 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D0\u05E9\u05E8\u05D0\u05D9 \u00B7 \u05D1\u05D9\u05D8\u05D5\u05DC \u05D1\u05DC\u05D7\u05D9\u05E6\u05D4",
      demoQ: "\u05EA\u05DB\u05D9\u05E0\u05D9 \u05D3\u05D5\u05D7 Q4 \u05DC\u05D5\u05E2\u05D3.",
      demoA: "PDF \u05E2\u05DD 4 \u05D2\u05E8\u05E4\u05D9\u05DD. \u05DE\u05D5\u05DB\u05DF \u05D1\u05E2\u05D5\u05D3",
      demoTime: "47 \u05E9\u05E0\u05D9\u05D5\u05EA",
    },
    features: {
      title: "\u05D0\u05E8\u05D1\u05E2\u05D4 \u05DB\u05DC\u05D9\u05DD. \u05DB\u05DE\u05D5",
      titleAccent: "\u05D0\u05E0\u05DC\u05D9\u05E1\u05D8\u05D9\u05EA",
      titleEnd: "\u05D1\u05DE\u05E9\u05E8\u05D4 \u05DE\u05DC\u05D0\u05D4.",
      items: [
        { title: "\u05E9\u05D5\u05D0\u05DC\u05D9\u05DD \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA. \u05DE\u05E7\u05D1\u05DC\u05D9\u05DD \u05EA\u05E9\u05D5\u05D1\u05D4.", desc: "\u201C\u05DB\u05DE\u05D4 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05D7\u05EA\u05DE\u05D5 \u05D1\u05E8\u05D1\u05E2\u05D5\u05DF?\u201D \u201C\u05D0\u05D9\u05DC\u05D5 \u05E4\u05E8\u05D5\u05D9\u05E7\u05D8\u05D9\u05DD \u05E4\u05D9\u05D2\u05E8\u05D5?\u201D \u2014 \u05EA\u05E9\u05D5\u05D1\u05D4 \u05DE\u05D9\u05D9\u05D3\u05D9\u05EA, \u05E2\u05DD \u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD, \u05E2\u05DD \u05D4\u05DE\u05E7\u05D5\u05E8." },
        { title: "\u05D3\u05D5\u05D7 \u05DC\u05D3\u05D9\u05E8\u05E7\u05D8\u05D5\u05E8\u05D9\u05D5\u05DF \u05D1\u05DC\u05D7\u05D9\u05E6\u05D4.", desc: "PDF \u05DE\u05E2\u05D5\u05E6\u05D1, \u05D2\u05E8\u05E4\u05D9\u05DD \u05E0\u05DB\u05D5\u05E0\u05D9\u05DD, \u05EA\u05D5\u05D1\u05E0\u05D5\u05EA \u05D0\u05E1\u05D8\u05E8\u05D8\u05D2\u05D9\u05D5\u05EA, \u05D4\u05DC\u05D5\u05D2\u05D5 \u05E9\u05DC\u05DB\u05DD. \u05DE\u05D5\u05DB\u05DF \u05DC\u05D9\u05E9\u05D9\u05D1\u05D4." },
        { title: "\u05DE\u05EA\u05E8\u05D9\u05E2 \u05DC\u05E4\u05E0\u05D9 \u05E9\u05DE\u05D0\u05D5\u05D7\u05E8.", desc: "\u05DC\u05E7\u05D5\u05D7\u05D4 \u05E9\u05DC\u05D0 \u05D4\u05D2\u05D9\u05D1\u05D4 14 \u05D9\u05D5\u05DD. \u05D4\u05DB\u05E0\u05E1\u05D4 \u05E9\u05D9\u05E8\u05D3\u05D4 \u05D1-23%. AnyDay \u05E9\u05D5\u05DC\u05D7 \u2014 \u05D1\u05DC\u05D9 \u05E9\u05EA\u05E9\u05D0\u05DC\u05D5." },
        { title: "\u05D0\u05D5\u05D8\u05D5\u05DE\u05E6\u05D9\u05D5\u05EA \u05E9\u05DE\u05D1\u05E6\u05E2\u05D5\u05EA. \u05DC\u05D0 \u05DE\u05E6\u05D9\u05E2\u05D5\u05EA.", desc: "\u201C\u05D4\u05E2\u05D1\u05D9\u05E8\u05D9 \u05D0\u05EA \u05DB\u05DC \u05D4\u05DE\u05E9\u05D9\u05DE\u05D5\u05EA \u05D4\u05E1\u05D2\u05D5\u05E8\u05D5\u05EA \u05DC\u05D0\u05E8\u05DB\u05D9\u05D5\u05DF\u201D \u2014 \u05D1\u05D5\u05E6\u05E2. \u05E9\u05D9\u05D7\u05D4 \u05D0\u05D7\u05EA. \u05D1\u05D9\u05E6\u05D5\u05E2 \u05DE\u05DC\u05D0." },
      ],
    },
    steps: {
      title: "\u05E9\u05DC\u05D5\u05E9\u05D4 \u05E6\u05E2\u05D3\u05D9\u05DD.",
      titleFade: "\u05E9\u05EA\u05D9 \u05D3\u05E7\u05D5\u05EA.",
      items: [
        { title: "\u05D7\u05D1\u05E8\u05D5 \u05D0\u05EA \u05D4\u05DE\u05E7\u05D5\u05E8", desc: "Monday \u00B7 Sheets \u00B7 Excel. OAuth \u05E9\u05DC \u05DC\u05D7\u05D9\u05E6\u05D4. \u05D1\u05DC\u05D9 \u05D8\u05D5\u05E7\u05E0\u05D9\u05DD." },
        { title: "\u05EA\u05E0\u05D5 \u05DC-AnyDay \u05DC\u05E7\u05E8\u05D5\u05D0", desc: "\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05DE\u05D1\u05D9\u05E0\u05D4 \u05D0\u05EA \u05D4\u05DE\u05D1\u05E0\u05D4, \u05DE\u05D6\u05D4\u05D4 \u05E2\u05DE\u05D5\u05D3\u05D5\u05EA, \u05DE\u05D7\u05D1\u05E8\u05EA \u05D1\u05D9\u05DF \u05D1\u05D5\u05E8\u05D3\u05D9\u05DD. \u05E9\u05EA\u05D9 \u05D3\u05E7\u05D5\u05EA." },
        { title: "\u05E9\u05D0\u05DC\u05D5. \u05E7\u05D1\u05DC\u05D5. \u05EA\u05E4\u05E2\u05DC\u05D5.", desc: "\u05D1\u05E2\u05D1\u05E8\u05D9\u05EA, \u05D1\u05DB\u05EA\u05D1, \u05D1\u05E7\u05D5\u05DC. \u05DB\u05DE\u05D5 \u05D0\u05E0\u05DC\u05D9\u05E1\u05D8\u05D9\u05EA \u2014 \u05DE\u05D4\u05D9\u05E8\u05D4 \u05D9\u05D5\u05EA\u05E8 \u05D5\u05D6\u05DE\u05D9\u05E0\u05D4 24/7." },
      ],
    },
    pricing: {
      title: "\u05EA\u05D5\u05DB\u05E0\u05D9\u05EA \u05DC\u05DB\u05DC",
      titleAccent: "\u05E9\u05DC\u05D1",
      titleEnd: "\u05D1\u05D0\u05E8\u05D2\u05D5\u05DF.",
      sub: "\u05D7\u05D9\u05D1\u05D5\u05E8 \u05DE\u05DC\u05D0 \u05DC\u05DB\u05DC \u05D4\u05D1\u05D5\u05E8\u05D3\u05D9\u05DD \u05D5\u05D4\u05D2\u05D9\u05DC\u05D9\u05D5\u05E0\u05D5\u05EA, \u05D1\u05DB\u05DC \u05D4\u05D7\u05D1\u05D9\u05DC\u05D5\u05EA. \u05D4\u05D4\u05D1\u05D3\u05DC \u05D4\u05D5\u05D0 \u05D1\u05D9\u05DB\u05D5\u05DC\u05D5\u05EA.",
      plans: [
        { name: "\u05D1\u05D5\u05D3\u05E7\u05D9\u05DD", price: "250", desc: "\u05D7\u05D9\u05D1\u05D5\u05E8 \u05DE\u05DC\u05D0 \u05DC-Monday/Sheets\n\u05E6\u05F3\u05D0\u05D8 \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA\n100 \u05E9\u05D0\u05DC\u05D5\u05EA \u05D1\u05D7\u05D5\u05D3\u05E9", cta: "7 \u05D9\u05DE\u05D9\u05DD \u05D7\u05D9\u05E0\u05DD \u2190", popular: false },
        { name: "\u05DC\u05D9\u05D3\u05E8\u05D9\u05DD", price: "450", desc: "\u05D4\u05DB\u05DC \u05DE\u201C\u05D1\u05D5\u05D3\u05E7\u05D9\u05DD\u201D\n\u05D3\u05D5\u05D7\u05D5\u05EA PDF \u05DE\u05E2\u05D5\u05E6\u05D1\u05D9\u05DD\n\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05D7\u05DB\u05DE\u05D5\u05EA\n500 \u05E9\u05D0\u05DC\u05D5\u05EA \u05D1\u05D7\u05D5\u05D3\u05E9", cta: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u2190", popular: false },
        { name: "\u05D3\u05D9\u05E8\u05E7\u05D8\u05D5\u05E8\u05D9\u05DD", price: "750", desc: "\u05D4\u05DB\u05DC \u05DE\u201C\u05DC\u05D9\u05D3\u05E8\u05D9\u05DD\u201D\n\u05D0\u05D5\u05D8\u05D5\u05DE\u05E6\u05D9\u05D5\u05EA \u05DE\u05DC\u05D0\u05D5\u05EA\n\u05D3\u05D5\u05D7\u05D5\u05EA \u05DE\u05D5\u05EA\u05D0\u05DE\u05D9\u05DD \u05DC\u05D5\u05E2\u05D3\n2,000 \u05E9\u05D0\u05DC\u05D5\u05EA \u05D1\u05D7\u05D5\u05D3\u05E9", cta: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u2190", popular: true },
        { name: "\u05D0\u05E8\u05D2\u05D5\u05DF", price: "1,200", desc: "\u05D4\u05DB\u05DC \u05DE\u201C\u05D3\u05D9\u05E8\u05E7\u05D8\u05D5\u05E8\u05D9\u05DD\u201D\nWhite Label \u00B7 SSO \u00B7 API\n\u05DE\u05E0\u05D4\u05DC \u05DC\u05E7\u05D5\u05D7 \u05D0\u05D9\u05E9\u05D9\n10,000 \u05E9\u05D0\u05DC\u05D5\u05EA \u05D1\u05D7\u05D5\u05D3\u05E9", cta: "\u05D3\u05D1\u05E8\u05D5 \u05D0\u05D9\u05EA\u05E0\u05D5 \u2190", popular: false },
      ],
      popularBadge: "\u2605 \u05D4\u05DB\u05D9 \u05E4\u05D5\u05E4\u05D5\u05DC\u05E8\u05D9",
    },
    faq: {
      title: "\u05E9\u05D0\u05DC\u05D5\u05EA \u05E9\u05DB\u05DC \u05DE\u05E0\u05D4\u05DC\u05EA \u05E9\u05D5\u05D0\u05DC\u05EA",
      items: [
        { q: "\u05DC\u05DE\u05D4 \u05DC\u05D0 \u05E4\u05E9\u05D5\u05D8 Monday AI \u05D0\u05D5 ChatGPT?", a: "Monday AI \u05DE\u05D5\u05D2\u05D1\u05DC \u05DC\u05D1\u05D5\u05E8\u05D3 \u05D0\u05D7\u05D3 \u05D5\u05DC\u05D0 \u05DE\u05D1\u05D9\u05DF \u05E2\u05D1\u05E8\u05D9\u05EA \u05E2\u05E1\u05E7\u05D9\u05EA. ChatGPT \u05DC\u05D0 \u05DE\u05D7\u05D5\u05D1\u05E8 \u05DC\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD. AnyDay \u05DE\u05D7\u05D1\u05E8 \u05D0\u05EA \u05DB\u05DC \u05D4\u05DE\u05E7\u05D5\u05E8\u05D5\u05EA \u05D5\u05DE\u05D1\u05E6\u05E2 \u05E4\u05E2\u05D5\u05DC\u05D5\u05EA \u05D0\u05DE\u05D9\u05EA\u05D9\u05D5\u05EA." },
        { q: "\u05D4\u05D0\u05DD \u05D6\u05D4 \u05DE\u05D7\u05DC\u05D9\u05E3 \u05D0\u05EA \u05D4\u05E6\u05D5\u05D5\u05EA \u05E9\u05DC\u05D9?", a: "\u05DC\u05D0. \u05D6\u05D4 \u05DE\u05D7\u05DC\u05D9\u05E3 \u05D0\u05EA \u05D4\u05D6\u05DE\u05DF \u05E9\u05D4\u05E6\u05D5\u05D5\u05EA \u05DE\u05D1\u05D6\u05D1\u05D6 \u05E2\u05DC \u05D0\u05D9\u05E1\u05D5\u05E3 \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D5\u05D4\u05DB\u05E0\u05EA \u05D3\u05D5\u05D7\u05D5\u05EA." },
        { q: "\u05DE\u05D4 \u05D0\u05DD \u05D0\u05E0\u05D9 \u05DC\u05D0 \u05DE\u05E8\u05D5\u05E6\u05D4?", a: "7 \u05D9\u05DE\u05D9 \u05E0\u05D9\u05E1\u05D9\u05D5\u05DF \u05D7\u05D9\u05E0\u05DD, \u05DC\u05DC\u05D0 \u05DB\u05E8\u05D8\u05D9\u05E1. \u05D1\u05D9\u05D8\u05D5\u05DC \u05D1\u05DC\u05D7\u05D9\u05E6\u05D4, \u05DC\u05DC\u05D0 \u05E7\u05E0\u05E1\u05D5\u05EA." },
        { q: "\u05D4\u05D0\u05DD \u05D6\u05D4 \u05D1\u05D0\u05DE\u05EA \u05E2\u05D5\u05D1\u05D3 \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA?", a: "\u05DB\u05DF. AnyDay \u05E0\u05D1\u05E0\u05D4 \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA \u05DE\u05D4\u05D9\u05D5\u05DD \u05D4\u05E8\u05D0\u05E9\u05D5\u05DF. \u05DE\u05D1\u05D9\u05DF \u05E1\u05DC\u05E0\u05D2, \u05E8\u05D0\u05E9\u05D9 \u05EA\u05D9\u05D1\u05D5\u05EA, \u05D5\u05D0\u05EA \u05D4\u05D4\u05D1\u05D3\u05DC \u05D1\u05D9\u05DF \u05E1\u05D2\u05D5\u05E8 \u05DC\u05D1\u05D5\u05E6\u05E2." },
        { q: "\u05DB\u05DE\u05D4 \u05D6\u05DE\u05DF \u05DC\u05D5\u05E7\u05D7\u05EA \u05D4\u05D4\u05D8\u05DE\u05E2\u05D4?", a: "\u05E9\u05EA\u05D9 \u05D3\u05E7\u05D5\u05EA \u05DC\u05D7\u05D9\u05D1\u05D5\u05E8. \u05E9\u05E2\u05D4 \u05DC\u05E8\u05D0\u05D9\u05D9\u05EA \u05E2\u05E8\u05DA \u05E8\u05D0\u05E9\u05D5\u05DF. \u05E9\u05D1\u05D5\u05E2 \u05DC\u05E9\u05D9\u05E0\u05D5\u05D9 \u05E9\u05D9\u05D2\u05E8\u05D4." },
      ],
    },
    cta: {
      label: "// \u05D4\u05E6\u05E2\u05D3 \u05D4\u05D1\u05D0",
      title1: "\u05D4\u05D9\u05E9\u05D9\u05D1\u05D4 \u05D4\u05D1\u05D0\u05D4",
      titleFade: "\u05D1\u05E2\u05D5\u05D3 \u05E9\u05D1\u05D5\u05E2.",
      titleAccent: "\u05D0\u05D9\u05DA",
      titleEnd: "\u05EA\u05E2\u05D3\u05D9\u05E4\u05D5 \u05DC\u05D1\u05DC\u05D5\u05EA \u05D0\u05D5\u05EA\u05D5?",
      cta1: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 7 \u05D9\u05DE\u05D9\u05DD \u05D7\u05D9\u05E0\u05DD \u2190",
      cta2: "\u05D3\u05D1\u05E8\u05D5 \u05D0\u05D9\u05EA\u05E0\u05D5 \u05E2\u05DC \u05D4\u05D8\u05DE\u05E2\u05D4",
      trust: "// \u05DC\u05DC\u05D0 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D0\u05E9\u05E8\u05D0\u05D9 \u00B7 \u05D1\u05D9\u05D8\u05D5\u05DC \u05D1\u05DC\u05D7\u05D9\u05E6\u05D4",
    },
    footer: "\u00A9 2026 ANYDAY \u00B7 MADE IN ISRAEL",
    form: {
      title: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 7 \u05D9\u05DE\u05D9\u05DD \u05D7\u05D9\u05E0\u05DD",
      sub: "\u05D7\u05D1\u05E8\u05D5 \u05D0\u05EA \u05D4\u05DE\u05E7\u05D5\u05E8\u05D5\u05EA \u05E9\u05DC\u05DB\u05DD \u05D5\u05EA\u05EA\u05D7\u05D9\u05DC\u05D5 \u05DC\u05E7\u05D1\u05DC \u05EA\u05E9\u05D5\u05D1\u05D5\u05EA",
      tokenLabel: "API Token",
      tokenHelp: "\u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05D0\u05EA \u05D4-API Token?",
      tokenSteps: [
        "\u05DC\u05D7\u05E6\u05D5 \u05E2\u05DC \u05D4\u05EA\u05DE\u05D5\u05E0\u05D4 \u05E9\u05DC\u05DB\u05DD \u05D1\u05E4\u05D9\u05E0\u05D4 \u05D4\u05E9\u05DE\u05D0\u05DC\u05D9\u05EA \u05D4\u05EA\u05D7\u05EA\u05D5\u05E0\u05D4 \u05D1\u05DE\u05D0\u05E0\u05D3\u05D9\u05D9",
        "\u05D1\u05D7\u05E8\u05D5 \"Developers\" \u05DE\u05D4\u05EA\u05E4\u05E8\u05D9\u05D8",
        "\u05DC\u05D7\u05E6\u05D5 \u05E2\u05DC \"My Access Tokens\" \u05D1\u05E6\u05D3 \u05E9\u05DE\u05D0\u05DC",
        "\u05DC\u05D7\u05E6\u05D5 \"Copy\" \u05D5\u05D4\u05D3\u05D1\u05D9\u05E7\u05D5 \u05DB\u05D0\u05DF",
      ],
      tokenPath: "Monday \u2192 Profile \u2192 Developers \u2192 My Access Tokens",
      boardLabel: "\u05DE\u05E1\u05E4\u05E8 \u05D1\u05D5\u05E8\u05D3",
      boardHelp: "\u05D0\u05D9\u05DA \u05DE\u05D5\u05E6\u05D0\u05D9\u05DD \u05D0\u05EA \u05DE\u05E1\u05E4\u05E8 \u05D4\u05D1\u05D5\u05E8\u05D3?",
      boardSteps: [
        "\u05E4\u05EA\u05D7\u05D5 \u05D0\u05EA \u05D4\u05D1\u05D5\u05E8\u05D3 \u05E9\u05DC\u05DB\u05DD \u05D1\u05DE\u05D0\u05E0\u05D3\u05D9\u05D9",
        "\u05D4\u05E1\u05EA\u05DB\u05DC\u05D5 \u05E2\u05DC \u05D4-URL \u05D1\u05E9\u05D5\u05E8\u05EA \u05D4\u05DB\u05EA\u05D5\u05D1\u05EA \u05E9\u05DC \u05D4\u05D3\u05E4\u05D3\u05E4\u05DF",
        "\u05D4\u05DE\u05E1\u05E4\u05E8 \u05E9\u05DE\u05D5\u05E4\u05D9\u05E2 \u05D0\u05D7\u05E8\u05D9 /boards/ \u05D4\u05D5\u05D0 \u05DE\u05E1\u05E4\u05E8 \u05D4\u05D1\u05D5\u05E8\u05D3",
      ],
      boardUrlHint: "\u05E0\u05DE\u05E6\u05D0 \u05D1-URL: monday.com/boards/",
      boardCopy: "\u05D4\u05E2\u05EA\u05D9\u05E7\u05D5 \u05D0\u05EA \u05D4\u05DE\u05E1\u05E4\u05E8 \u05D4\u05D6\u05D4",
      loadBtn: "\u05D4\u05EA\u05D7\u05D9\u05DC\u05D5 \u2014 \u05D4\u05E6\u05D2\u05EA \u05D3\u05E9\u05D1\u05D5\u05E8\u05D3",
      loading: "\u05D8\u05D5\u05E2\u05DF \u05D0\u05EA \u05D4\u05D1\u05D5\u05E8\u05D3...",
    },
  },
  en: {
    nav: { features: "Features", how: "How it works", pricing: "Pricing", cta: "Get Started \u2190" },
    hero: {
      badge: "MADE FOR MONDAY \u00B7 BUILT FOR ANY DAY",
      title1: "Board report in a",
      titleAccent: "minute",
      titleFade: "Not two days.",
      sub: "Connect your boards and sheets and turn them into executive reports, strategic insights and alerts. In Hebrew.",
      cta1: "Start 7 days free \u2190",
      cta2: "Watch 1-min demo",
      trust: "// No credit card \u00B7 Cancel anytime",
      demoQ: "Prepare Q4 report for the board.",
      demoA: "PDF with 4 charts. Ready in",
      demoTime: "47 seconds",
    },
    features: {
      title: "Four tools. Like an",
      titleAccent: "analyst",
      titleEnd: "on payroll.",
      items: [
        { title: "Ask in plain language. Get answers.", desc: "\"How many clients signed this quarter?\" \"Which projects are behind?\" \u2014 instant answer, with data and source." },
        { title: "Board report in one click.", desc: "Designed PDF with charts, strategic insights, your logo. Ready for the meeting." },
        { title: "Alerts before it's too late.", desc: "Client unresponsive 14 days. Revenue dropped 23%. AnyDay alerts \u2014 without asking." },
        { title: "Automations that execute.", desc: "\"Archive all closed tasks\" \u2014 done. One conversation. Full execution." },
      ],
    },
    steps: {
      title: "Three steps.",
      titleFade: "Two minutes.",
      items: [
        { title: "Connect the source", desc: "Monday \u00B7 Sheets \u00B7 Excel. One-click OAuth. No tokens." },
        { title: "Let AnyDay read", desc: "The system reads structure, identifies columns, connects boards. Two minutes." },
        { title: "Ask. Get. Act.", desc: "In text or voice. Like an analyst \u2014 faster and available 24/7." },
      ],
    },
    pricing: {
      title: "A plan for every",
      titleAccent: "stage",
      titleEnd: ".",
      sub: "Full connection to all boards and sheets, in all plans. The difference is in capabilities.",
      plans: [
        { name: "Explore", price: "250", desc: "Full Monday/Sheets connection\nHebrew chat\n100 queries/month", cta: "7 days free \u2190", popular: false },
        { name: "Leaders", price: "450", desc: "Everything in Explore\nPDF reports\nSmart alerts\n500 queries/month", cta: "Start \u2190", popular: false },
        { name: "Directors", price: "750", desc: "Everything in Leaders\nFull automations\nBoard-ready reports\n2,000 queries/month", cta: "Start \u2190", popular: true },
        { name: "Enterprise", price: "1,200", desc: "Everything in Directors\nWhite Label \u00B7 SSO \u00B7 API\nDedicated manager\n10,000 queries/month", cta: "Talk to us \u2190", popular: false },
      ],
      popularBadge: "\u2605 Most Popular",
    },
    faq: {
      title: "Questions every manager asks",
      items: [
        { q: "Why not just Monday AI or ChatGPT?", a: "Monday AI is limited to one board. ChatGPT isn't connected to your data. AnyDay connects all sources and executes real actions." },
        { q: "Does it replace my team?", a: "No. It replaces the time your team wastes on data collection and report preparation." },
        { q: "What if I'm not satisfied?", a: "7-day free trial, no credit card. Cancel anytime, no penalties." },
        { q: "Does it really work in Hebrew?", a: "Yes. Built in Hebrew from day one. Understands slang, abbreviations, and context." },
        { q: "How long does setup take?", a: "Two minutes to connect. One hour to see value. One week to change workflow." },
      ],
    },
    cta: {
      label: "// Next step",
      title1: "Next meeting",
      titleFade: "in a week.",
      titleAccent: "How",
      titleEnd: "will you spend it?",
      cta1: "Start 7 days free \u2190",
      cta2: "Talk to us about setup",
      trust: "// No credit card \u00B7 Cancel anytime",
    },
    footer: "\u00A9 2026 ANYDAY \u00B7 MADE IN ISRAEL",
    form: {
      title: "Start 7 days free",
      sub: "Connect your sources and start getting answers",
      tokenLabel: "API Token",
      tokenHelp: "How to find your API Token?",
      tokenSteps: [
        "Click your profile picture at the bottom-left of Monday",
        "Select \"Developers\" from the menu",
        "Click \"My Access Tokens\" on the left",
        "Click \"Copy\" and paste here",
      ],
      tokenPath: "Monday \u2192 Profile \u2192 Developers \u2192 My Access Tokens",
      boardLabel: "Board ID",
      boardHelp: "How to find your Board ID?",
      boardSteps: [
        "Open your board in Monday",
        "Look at the URL in the browser address bar",
        "The number after /boards/ is your Board ID",
      ],
      boardUrlHint: "Found in URL: monday.com/boards/",
      boardCopy: "Copy this number",
      loadBtn: "Get Started \u2014 Show Dashboard",
      loading: "Loading board...",
    },
  },
};

type Lang = "he" | "en";

/* ─── Color tokens ─── */
const C = {
  bg: "#0A0A0A",
  accent: "#C5FF00",
  white: "#FFFFFF",
  white55: "rgba(255,255,255,0.55)",
  white35: "rgba(255,255,255,0.35)",
  white12: "rgba(255,255,255,0.12)",
  white08: "rgba(255,255,255,0.08)",
  white65: "rgba(255,255,255,0.65)",
  white75: "rgba(255,255,255,0.75)",
  fadedWhite: "rgba(255,255,255,0.28)",
  accentFade: "rgba(197,255,0,0.4)",
};

const serif = "'Frank Ruhl Libre', 'David', 'Times New Roman', serif";
const mono = "'Courier New', monospace";

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
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const t = T[lang];
  const formRef = useRef<HTMLDivElement>(null);

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
      setError(e instanceof Error ? e.message : "Token invalid");
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
      setError(e instanceof Error ? e.message : "error");
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
      setError(e instanceof Error ? e.message : "error");
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

  const dir = lang === "he" ? "rtl" : "ltr";

  return (
    <div dir={dir} style={{ fontFamily: "'Inter', 'Heebo', sans-serif", background: C.bg, color: C.white, minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;500;700&family=Inter:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${C.bg}; }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-burger { display: flex !important; }
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
          .hero-title { font-size: 36px !important; }
          .section-title { font-size: 28px !important; }
          .step-num { font-size: 40px !important; }
          .demo-card { display: none !important; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, right: 0, left: 0, zIndex: 50,
        background: "rgba(10,10,10,0.92)", backdropFilter: "blur(12px)",
        borderBottom: `0.5px solid ${C.white08}`,
        padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ fontFamily: serif, fontSize: 21, fontWeight: 500, letterSpacing: "-0.02em", color: C.white }}>
          any<span style={{ color: C.accent }}>.</span>day
        </div>
        <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a href="#features" style={{ fontSize: 11, color: C.white55, fontFamily: mono, letterSpacing: "0.12em", textDecoration: "none" }}>{t.nav.features}</a>
          <a href="#how" style={{ fontSize: 11, color: C.white55, fontFamily: mono, letterSpacing: "0.12em", textDecoration: "none" }}>{t.nav.how}</a>
          <a href="#pricing" style={{ fontSize: 11, color: C.white55, fontFamily: mono, letterSpacing: "0.12em", textDecoration: "none" }}>{t.nav.pricing}</a>
          <button onClick={() => setLang(lang === "he" ? "en" : "he")} style={{
            background: "none", border: `0.5px solid ${C.white12}`, borderRadius: 100,
            padding: "5px 12px", cursor: "pointer", color: C.white55, fontFamily: mono, fontSize: 10, letterSpacing: "0.1em",
          }}>{lang === "he" ? "EN" : "\u05E2\u05D1"}</button>
          <button onClick={scrollToForm} style={{
            background: C.accent, color: C.bg, padding: "7px 16px", borderRadius: 100,
            fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer",
          }}>{t.nav.cta}</button>
        </div>
        <button className="mobile-burger" onClick={() => setMobileMenu(!mobileMenu)} style={{
          display: "none", background: "none", border: "none", cursor: "pointer",
          flexDirection: "column", gap: 5, padding: 4,
        }}>
          <div style={{ width: 22, height: 2, borderRadius: 1, background: C.white, transition: "all 0.3s", transform: mobileMenu ? "rotate(45deg) translate(5px, 5px)" : "none" }} />
          <div style={{ width: 22, height: 2, borderRadius: 1, background: C.white, transition: "all 0.3s", opacity: mobileMenu ? 0 : 1 }} />
          <div style={{ width: 22, height: 2, borderRadius: 1, background: C.white, transition: "all 0.3s", transform: mobileMenu ? "rotate(-45deg) translate(5px, -5px)" : "none" }} />
        </button>
      </nav>

      {mobileMenu && (
        <div style={{
          position: "fixed", top: 60, right: 0, left: 0, bottom: 0, zIndex: 49,
          background: "rgba(10,10,10,0.97)", backdropFilter: "blur(12px)",
          display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 50, gap: 28,
        }}>
          <a href="#features" onClick={() => setMobileMenu(false)} style={{ color: C.white55, fontSize: 16, fontFamily: mono, textDecoration: "none" }}>{t.nav.features}</a>
          <a href="#how" onClick={() => setMobileMenu(false)} style={{ color: C.white55, fontSize: 16, fontFamily: mono, textDecoration: "none" }}>{t.nav.how}</a>
          <a href="#pricing" onClick={() => setMobileMenu(false)} style={{ color: C.white55, fontSize: 16, fontFamily: mono, textDecoration: "none" }}>{t.nav.pricing}</a>
          <button onClick={() => { setLang(lang === "he" ? "en" : "he"); setMobileMenu(false); }} style={{
            background: "none", border: `0.5px solid ${C.white12}`, borderRadius: 100,
            padding: "8px 24px", cursor: "pointer", color: C.white55, fontFamily: mono, fontSize: 13,
          }}>{lang === "he" ? "English" : "\u05E2\u05D1\u05E8\u05D9\u05EA"}</button>
          <button onClick={() => { setMobileMenu(false); scrollToForm(); }} style={{
            background: C.accent, color: C.bg, border: "none", borderRadius: 100,
            padding: "12px 36px", fontSize: 14, fontWeight: 500, cursor: "pointer",
          }}>{t.nav.cta}</button>
        </div>
      )}

      {/* ── Hero ── */}
      <section style={{ padding: "8rem 2rem 3rem", position: "relative" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8, fontFamily: mono,
          fontSize: 10, color: C.accent, letterSpacing: "0.18em", marginBottom: "1.5rem",
          border: `0.5px solid ${C.accentFade}`, padding: "6px 14px", borderRadius: 100,
        }}>
          <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: C.accent }} />
          {t.hero.badge}
        </div>
        <h1 className="hero-title" style={{
          fontFamily: serif, fontSize: 56, lineHeight: 0.92, fontWeight: 500,
          color: C.white, margin: "0 0 1.25rem", letterSpacing: "-0.035em",
        }}>
          {t.hero.title1}<br />
          {lang === "he" ? "\u05D1\u05E2\u05D5\u05D3 " : ""}
          <span style={{ color: C.accent, fontStyle: "italic" }}>{t.hero.titleAccent}</span>
          .<br />
          <span style={{ color: C.fadedWhite }}>{t.hero.titleFade}</span>
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.65, color: C.white55, margin: "0 0 1.75rem", maxWidth: 420 }}>
          {t.hero.sub}
        </p>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={scrollToForm} style={{
            background: C.accent, color: C.bg, padding: "14px 26px", borderRadius: 100,
            fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
          }}>{t.hero.cta1}</button>
          <span style={{ color: C.white, padding: "14px 6px", fontSize: 13, borderBottom: `0.5px solid rgba(255,255,255,0.5)`, cursor: "pointer" }}>
            {t.hero.cta2}
          </span>
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.white35, letterSpacing: "0.08em", marginTop: "0.9rem" }}>
          {t.hero.trust}
        </div>
        {/* Demo card */}
        <div className="demo-card" style={{
          marginTop: "2rem", transform: "rotate(-1.5deg)", background: C.white,
          padding: "14px 16px", borderRadius: 10, maxWidth: 340, display: "inline-block",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingBottom: 9, borderBottom: `0.5px solid rgba(0,0,0,0.08)` }}>
            <div style={{ fontFamily: mono, fontSize: 9, color: "#888", letterSpacing: "0.1em" }}>14:23</div>
            <div style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: C.accent }} />
            <div style={{ fontFamily: mono, fontSize: 9, color: "#555", letterSpacing: "0.1em" }}>LIVE</div>
          </div>
          <div style={{ fontSize: 13, color: C.bg, lineHeight: 1.5, marginBottom: 8, fontWeight: 500 }}>{t.hero.demoQ}</div>
          <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
            {t.hero.demoA} <span style={{ color: C.bg, fontWeight: 500, background: C.accent, padding: "1px 6px", borderRadius: 3 }}>{t.hero.demoTime}</span>.
          </div>
        </div>
      </section>

      <div style={{ borderTop: `0.5px solid ${C.white08}` }} />

      {/* ── Features ── */}
      <section id="features" style={{ padding: "3rem 2rem" }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: "0.18em", marginBottom: "1rem" }}>// {t.nav.features}</div>
        <h2 className="section-title" style={{
          fontFamily: serif, fontSize: 36, lineHeight: 1, fontWeight: 500,
          color: C.white, margin: "0 0 2.5rem", letterSpacing: "-0.025em", maxWidth: 500,
        }}>
          {t.features.title} <span style={{ fontStyle: "italic", color: C.accent }}>{t.features.titleAccent}</span> {t.features.titleEnd}
        </h2>
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {t.features.items.map((f, i) => (
            <div key={i} style={{ border: `0.5px solid ${C.white12}`, borderRadius: 10, padding: 22 }}>
              <div style={{ fontFamily: mono, fontSize: 11, color: C.accent, letterSpacing: "0.15em", marginBottom: 14 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontFamily: serif, fontSize: 19, color: C.white, lineHeight: 1.2, marginBottom: 8, fontWeight: 500 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: `0.5px solid ${C.white08}` }} />

      {/* ── Steps ── */}
      <section id="how" style={{ padding: "3rem 2rem" }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: "0.18em", marginBottom: "1rem" }}>// {t.nav.how}</div>
        <h2 className="section-title" style={{
          fontFamily: serif, fontSize: 36, lineHeight: 1, fontWeight: 500,
          color: C.white, margin: "0 0 2.5rem", letterSpacing: "-0.025em",
        }}>
          {t.steps.title} <span style={{ color: C.fadedWhite }}>{t.steps.titleFade}</span>
        </h2>
        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {t.steps.items.map((s, i) => (
            <div key={i} style={{ padding: "4px 0" }}>
              <div className="step-num" style={{ fontFamily: serif, fontSize: 60, color: C.accent, lineHeight: 1, marginBottom: 14, fontWeight: 500 }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{ fontFamily: serif, fontSize: 17, color: C.white, marginBottom: 6, fontWeight: 500 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.55 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: `0.5px solid ${C.white08}` }} />

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: "3rem 2rem" }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: "0.18em", marginBottom: "1rem" }}>// {t.nav.pricing}</div>
        <h2 className="section-title" style={{
          fontFamily: serif, fontSize: 36, lineHeight: 1, fontWeight: 500,
          color: C.white, margin: "0 0 0.75rem", letterSpacing: "-0.025em",
        }}>
          {t.pricing.title} <span style={{ fontStyle: "italic", color: C.accent }}>{t.pricing.titleAccent}</span> {t.pricing.titleEnd}
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: "0 0 2.25rem" }}>{t.pricing.sub}</p>
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {t.pricing.plans.map((plan, i) => (
            <div key={i} style={{
              border: plan.popular ? `2px solid ${C.accent}` : `0.5px solid ${C.white12}`,
              borderRadius: 10, padding: 22, position: "relative",
            }}>
              {plan.popular && (
                <div style={{
                  position: "absolute", top: -10, [dir === "rtl" ? "right" : "left"]: 22,
                  background: C.accent, color: C.bg, fontFamily: mono, fontSize: 9,
                  letterSpacing: "0.15em", padding: "4px 10px", borderRadius: 100, fontWeight: 500,
                }}>{t.pricing.popularBadge}</div>
              )}
              <div style={{ fontFamily: mono, fontSize: 10, color: plan.popular ? C.accent : C.white55, letterSpacing: "0.18em", marginBottom: 14 }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 14 }}>
                <span style={{ fontFamily: serif, fontSize: 38, color: C.white, fontWeight: 500, lineHeight: 1 }}>
                  {lang === "he" ? "\u20AA" : "$"}{plan.price}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>/{lang === "he" ? "\u05D7\u05D5\u05D3\u05E9" : "mo"}</span>
              </div>
              <div style={{ fontSize: 12, color: plan.popular ? C.white75 : C.white65, lineHeight: 1.7, marginBottom: 16, whiteSpace: "pre-line" }}>
                {plan.desc.split("\n").map((line, j) => <span key={j}>{"\u2022 " + line}<br /></span>)}
              </div>
              {plan.popular ? (
                <button onClick={scrollToForm} style={{
                  display: "inline-block", background: C.accent, color: C.bg, fontSize: 12,
                  fontWeight: 500, padding: "8px 16px", borderRadius: 100, border: "none", cursor: "pointer",
                }}>{plan.cta}</button>
              ) : (
                <button onClick={scrollToForm} style={{
                  display: "inline-block", color: C.white, fontSize: 12, background: "none",
                  border: "none", borderBottom: `0.5px solid rgba(255,255,255,0.4)`, paddingBottom: 1, cursor: "pointer",
                }}>{plan.cta}</button>
              )}
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: `0.5px solid ${C.white08}` }} />

      {/* ── FAQ ── */}
      <section style={{ padding: "3rem 2rem" }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: "0.18em", marginBottom: "1rem" }}>// FAQ</div>
        <h2 className="section-title" style={{
          fontFamily: serif, fontSize: 30, lineHeight: 1.1, fontWeight: 500,
          color: C.white, margin: "0 0 2rem", letterSpacing: "-0.02em",
        }}>{t.faq.title}</h2>
        <div style={{ maxWidth: 600 }}>
          {t.faq.items.map((faq, i) => (
            <div key={i} style={{
              borderBottom: `0.5px solid ${C.white08}`, padding: "16px 0", cursor: "pointer",
            }} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: serif, fontSize: 15, color: C.white, fontWeight: 500 }}>{faq.q}</span>
                <span style={{ color: C.accent, fontSize: 18, fontFamily: mono, flexShrink: 0, marginInlineStart: 12 }}>
                  {faqOpen === i ? "\u2212" : "+"}
                </span>
              </div>
              {faqOpen === i && (
                <p style={{ fontSize: 13, color: C.white55, lineHeight: 1.7, marginTop: 10 }}>{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: `0.5px solid ${C.white08}` }} />

      {/* ── Get Started Form ── */}
      <section ref={formRef} id="start" style={{ padding: "3rem 2rem" }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: "0.18em", marginBottom: "1rem" }}>// {lang === "he" ? "\u05D4\u05EA\u05D7\u05D1\u05E8\u05D5" : "Connect"}</div>
        <h2 className="section-title" style={{
          fontFamily: serif, fontSize: 30, fontWeight: 500, color: C.white,
          margin: "0 0 0.5rem", letterSpacing: "-0.02em",
        }}>{t.form.title}</h2>
        <p style={{ fontSize: 13, color: C.white55, marginBottom: "1.5rem" }}>{t.form.sub}</p>

        <div style={{
          maxWidth: 440, border: `0.5px solid ${C.white12}`, borderRadius: 10,
          padding: 24, textAlign: dir === "rtl" ? "right" : "left",
        }}>
          {/* Data Source Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {([
              { id: "monday" as const, label: "Monday.com" },
              { id: "sheets" as const, label: "Sheets" },
              { id: "excel" as const, label: "Excel" },
            ]).map(src => (
              <button key={src.id} onClick={() => setDataSource(src.id)} style={{
                padding: "6px 14px", borderRadius: 100, fontSize: 11, fontFamily: mono,
                letterSpacing: "0.08em", cursor: "pointer", border: "none",
                background: dataSource === src.id ? C.accent : "transparent",
                color: dataSource === src.id ? C.bg : C.white55,
              }}>{src.label}</button>
            ))}
          </div>

          {dataSource === "monday" ? (
            <>
              {/* Token input */}
              <label style={{ fontFamily: mono, fontSize: 10, color: C.white55, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                {t.form.tokenLabel}
              </label>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="password"
                  value={apiToken}
                  onChange={e => setApiToken(e.target.value)}
                  placeholder="eyJhbG..."
                  style={{
                    flex: 1, background: "rgba(255,255,255,0.05)", border: `0.5px solid ${C.white12}`,
                    borderRadius: 8, padding: "10px 12px", color: C.white, fontSize: 13, outline: "none",
                    fontFamily: mono,
                  }}
                />
                <button onClick={handleConnectToken} disabled={loadingBoards} style={{
                  background: C.accent, color: C.bg, border: "none", borderRadius: 8,
                  padding: "10px 16px", fontSize: 11, fontWeight: 500, cursor: "pointer",
                  fontFamily: mono, opacity: loadingBoards ? 0.5 : 1,
                }}>{loadingBoards ? "..." : "\u2192"}</button>
              </div>
              <button onClick={() => setShowTokenHelp(!showTokenHelp)} style={{
                background: "none", border: "none", color: C.accent, fontSize: 11,
                fontFamily: mono, cursor: "pointer", marginBottom: showTokenHelp ? 8 : 16,
              }}>{t.form.tokenHelp}</button>
              {showTokenHelp && (
                <div style={{ background: "rgba(197,255,0,0.05)", border: `0.5px solid ${C.accentFade}`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ fontFamily: mono, fontSize: 10, color: C.white55, lineHeight: 1.8 }}>
                    {t.form.tokenSteps.map((step, i) => <div key={i}>{i + 1}. {step}</div>)}
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 10, color: C.accent, marginTop: 8 }}>{t.form.tokenPath}</div>
                </div>
              )}

              {tokenConnected && boardsList.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontFamily: mono, fontSize: 10, color: C.white55, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                    {lang === "he" ? "\u05D1\u05D7\u05E8\u05D5 \u05D1\u05D5\u05E8\u05D3" : "Select board"}
                  </label>
                  <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                    {boardsList.map(b => (
                      <button key={b.id} onClick={() => handleSelectBoard(b.id)} style={{
                        background: boardId === b.id ? "rgba(197,255,0,0.1)" : "rgba(255,255,255,0.03)",
                        border: `0.5px solid ${boardId === b.id ? C.accentFade : C.white08}`,
                        borderRadius: 8, padding: "10px 12px", cursor: "pointer",
                        textAlign: dir === "rtl" ? "right" : "left", color: C.white, fontSize: 13,
                      }}>
                        <span style={{ fontWeight: 500 }}>{b.name}</span>
                        <span style={{ fontFamily: mono, fontSize: 10, color: C.white35, marginInlineStart: 8 }}>({b.items_count})</span>
                      </button>
                    ))}
                  </div>
                  <button onClick={handleDisconnect} style={{
                    background: "none", border: "none", color: "rgba(255,100,100,0.6)",
                    fontFamily: mono, fontSize: 10, cursor: "pointer", marginTop: 8,
                  }}>{lang === "he" ? "\u05E0\u05EA\u05E7 \u05D8\u05D5\u05E7\u05DF" : "Disconnect"}</button>
                </div>
              )}

              {!tokenConnected && (
                <div>
                  <label style={{ fontFamily: mono, fontSize: 10, color: C.white55, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                    {t.form.boardLabel}
                  </label>
                  <input
                    value={boardId}
                    onChange={e => setBoardId(e.target.value)}
                    placeholder="1234567890"
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.05)", border: `0.5px solid ${C.white12}`,
                      borderRadius: 8, padding: "10px 12px", color: C.white, fontSize: 13, outline: "none",
                      fontFamily: mono, marginBottom: 16,
                    }}
                  />
                </div>
              )}
            </>
          ) : dataSource === "sheets" ? (
            <div>
              <label style={{ fontFamily: mono, fontSize: 10, color: C.white55, letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>
                Google Sheets URL
              </label>
              <input
                value={sheetsUrl}
                onChange={e => setSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                style={{
                  width: "100%", background: "rgba(255,255,255,0.05)", border: `0.5px solid ${C.white12}`,
                  borderRadius: 8, padding: "10px 12px", color: C.white, fontSize: 13, outline: "none",
                  fontFamily: mono, marginBottom: 16,
                }}
              />
            </div>
          ) : (
            <div style={{ fontSize: 13, color: C.white55, marginBottom: 16 }}>
              {lang === "he" ? "Excel \u05D1\u05E7\u05E8\u05D5\u05D1" : "Excel coming soon"}
            </div>
          )}

          {error && <div style={{ color: "#FF6B6B", fontSize: 12, fontFamily: mono, marginBottom: 12 }}>{error}</div>}

          <button
            onClick={dataSource === "sheets" ? handleLoadSheets : handleLoad}
            disabled={loading}
            style={{
              width: "100%", background: C.accent, color: C.bg, border: "none",
              borderRadius: 100, padding: "12px", fontSize: 13, fontWeight: 500,
              cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Spinner /> {t.form.loading}
              </span>
            ) : t.form.loadBtn}
          </button>
        </div>
      </section>

      <div style={{ borderTop: `0.5px solid ${C.white08}` }} />

      {/* ── CTA ── */}
      <section style={{ padding: "3.5rem 2rem 3rem" }}>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.accent, letterSpacing: "0.18em", marginBottom: "1.25rem" }}>{t.cta.label}</div>
        <h2 className="section-title" style={{
          fontFamily: serif, fontSize: 44, lineHeight: 1, fontWeight: 500,
          color: C.white, margin: "0 0 1.5rem", letterSpacing: "-0.025em",
        }}>
          {t.cta.title1} <span style={{ color: C.fadedWhite }}>{t.cta.titleFade}</span><br />
          <span style={{ fontStyle: "italic", color: C.accent }}>{t.cta.titleAccent}</span> {t.cta.titleEnd}
        </h2>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: "2rem" }}>
          <button onClick={scrollToForm} style={{
            background: C.accent, color: C.bg, padding: "14px 26px", borderRadius: 100,
            fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer",
          }}>{t.cta.cta1}</button>
          <span style={{ color: C.white, padding: "14px 6px", fontSize: 13, borderBottom: `0.5px solid rgba(255,255,255,0.5)`, cursor: "pointer" }}>
            {t.cta.cta2}
          </span>
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.white35, letterSpacing: "0.08em", marginTop: "0.9rem" }}>
          {t.cta.trust}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        padding: "22px 28px", borderTop: `0.5px solid ${C.white08}`,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ fontFamily: serif, fontSize: 16, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>
          any<span style={{ color: C.accent }}>.</span>day
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: C.white35, letterSpacing: "0.1em" }}>{t.footer}</div>
      </footer>
    </div>
  );
}
