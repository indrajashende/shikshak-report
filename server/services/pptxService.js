import PptxGenJS from "pptxgenjs";

// --------------------------------------------------------------------
// Step 2 of PPTX generation: draw the planned slides as a real,
// editable .pptx (native text boxes and shapes, speaker notes included).
// --------------------------------------------------------------------

// Devanagari font used inside PowerPoint. "Nirmala UI" ships with Windows 8+
// and Office; change it with PPTX_FONT_DEVANAGARI in server/.env if your
// school computers use another one (e.g. "Mangal" or "Noto Sans Devanagari").
const FONT_DEVANAGARI = process.env.PPTX_FONT_DEVANAGARI || "Nirmala UI";
const FONT_LATIN = "Calibri";

const LANG_TAG = { mr: "mr-IN", hi: "hi-IN", en: "en-US" };

const LABELS = {
  mr: { takeaway: "मुख्य मुद्दा", thanks: "धन्यवाद!" },
  hi: { takeaway: "मुख्य बिंदु", thanks: "धन्यवाद!" },
  en: { takeaway: "Key takeaway", thanks: "Thank you" }
};

const TEAL = {
  navy: "12394A",
  teal: "1F7A8C",
  tealSoft: "E4F1F4",
  saffron: "E8890C",
  saffronSoft: "FDF0DC",
  ink: "1B2B34",
  muted: "5B6B73",
  white: "FFFFFF",
  onDark: "D6E6EC",
  ring: "2B6478"
};

// Colour themes the teacher can choose from. navy = dark base, teal = main
// accent, saffron = second accent (names kept from the first design).
export const PPTX_THEMES = {
  teal: TEAL,
  maroon: {
    navy: "4A1424", teal: "9B2C4B", tealSoft: "F8E6EB", saffron: "D99A1E", saffronSoft: "FBF1DB",
    ink: "1B2B34", muted: "5B6B73", white: "FFFFFF", onDark: "F0D9E0", ring: "7A2E45"
  },
  green: {
    navy: "17402A", teal: "2E7D4F", tealSoft: "E3F2E9", saffron: "F29F05", saffronSoft: "FDF0D5",
    ink: "1B2B34", muted: "5B6B73", white: "FFFFFF", onDark: "D5EBDD", ring: "2F6B49"
  },
  royal: {
    navy: "1B2559", teal: "3A56C4", tealSoft: "E6EBFA", saffron: "F28C28", saffronSoft: "FDEBD6",
    ink: "1B2B34", muted: "5B6B73", white: "FFFFFF", onDark: "D6DDF5", ring: "3A4A94"
  }
};

// 16:9 widescreen, 13.333" x 7.5"
const W = 13.333;
const H = 7.5;
const MX = 0.7;
const CONTENT_W = W - MX * 2;
const BODY_TOP = 1.95;

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
const numberLabel = (n, language) =>
  language === "en"
    ? String(n)
    : String(n).replace(/\d/g, (digit) => DEVANAGARI_DIGITS[Number(digit)]);

// Pick a font size from the text length. Devanagari is wider and taller than
// Latin text, so the tiers are conservative. [maxChars, pointSize]
function sizeFor(text, tiers) {
  const length = String(text || "").length;
  for (const [maxChars, size] of tiers) {
    if (length <= maxChars) return size;
  }
  return tiers[tiers.length - 1][1];
}

export async function buildPptx({ deckTitle, deckSubtitle, slides, language = "mr", reportTypeLabel = "", theme = "teal" }) {
  const C = PPTX_THEMES[theme] || PPTX_THEMES.teal;
  const FONT = language === "en" ? FONT_LATIN : FONT_DEVANAGARI;
  const LANG = LANG_TAG[language] || LANG_TAG.mr;
  const L = LABELS[language] || LABELS.mr;

  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  pres.title = deckTitle || "Shikshak Report";
  pres.author = "Shikshak Report Studio";
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };

  // One layout per slide frame: light content slides and dark bookend slides.
  pres.defineSlideMaster({
    title: "SHIKSHAK_CONTENT",
    background: { color: C.white },
    slideNumber: { x: W - 1.2, y: H - 0.55, w: 0.6, h: 0.3, fontFace: FONT, fontSize: 11, color: C.muted, align: "right" }
  });
  pres.defineSlideMaster({
    title: "SHIKSHAK_DARK",
    background: { color: C.navy }
  });

  // Fresh option objects on every call (pptxgenjs mutates what it is given).
  const text = (slide, value, options) =>
    slide.addText(Array.isArray(value) ? value : String(value ?? ""), {
      isTextBox: true,
      fontFace: FONT,
      lang: LANG,
      margin: 0,
      valign: "top",
      color: C.ink,
      ...options
    });

  const circle = (slide, x, y, d, fill, label, labelColor, size = 18) => {
    slide.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: fill }, line: { color: fill, width: 0 } });
    text(slide, label, {
      x, y, w: d, h: d, align: "center", valign: "middle", bold: true, fontSize: size, color: labelColor
    });
  };

  const card = (slide, x, y, w, h, fill) =>
    slide.addShape(pres.ShapeType.roundRect, {
      x, y, w, h, rectRadius: 0.12, fill: { color: fill }, line: { color: fill, width: 0 }
    });

  const slideTitle = (slide, title, color = C.navy) =>
    text(slide, title, {
      x: MX, y: 0.55, w: CONTENT_W, h: 1.2, bold: true, color,
      fontSize: sizeFor(title, [[38, 36], [60, 32], [90, 28]])
    });

  const notes = (slide, data) => {
    if (data.notes) slide.addNotes(data.notes);
  };

  // ---------------------------------------------------------------- title
  const cover = pres.addSlide({ masterName: "SHIKSHAK_DARK" });
  cover.addShape(pres.ShapeType.ellipse, { x: 8.6, y: -1.4, w: 7.4, h: 7.4, fill: { color: C.navy, transparency: 100 }, line: { color: C.ring, width: 2 } });
  cover.addShape(pres.ShapeType.ellipse, { x: 9.8, y: 0.0, w: 5.0, h: 5.0, fill: { color: C.navy, transparency: 100 }, line: { color: C.ring, width: 2 } });
  cover.addShape(pres.ShapeType.ellipse, { x: 11.2, y: 5.2, w: 1.5, h: 1.5, fill: { color: C.saffron }, line: { color: C.saffron, width: 0 } });

  if (reportTypeLabel) {
    cover.addShape(pres.ShapeType.roundRect, {
      x: MX, y: 1.2, w: 3.6, h: 0.55, rectRadius: 0.27, fill: { color: C.saffron }, line: { color: C.saffron, width: 0 }
    });
    text(cover, reportTypeLabel, {
      x: MX, y: 1.2, w: 3.6, h: 0.55, align: "center", valign: "middle", bold: true, fontSize: 16, color: C.navy
    });
  }

  text(cover, deckTitle, {
    x: MX, y: 2.2, w: 9.2, h: 2.5, bold: true, color: C.white,
    fontSize: sizeFor(deckTitle, [[40, 44], [70, 38], [110, 32], [200, 28]])
  });

  if (deckSubtitle) {
    text(cover, deckSubtitle, {
      x: MX, y: 4.95, w: 8.4, h: 1.3, fontSize: sizeFor(deckSubtitle, [[60, 22], [110, 20], [200, 18]]), color: C.onDark
    });
  }
  cover.addNotes(deckSubtitle || deckTitle);

  // --------------------------------------------------------- content slides
  slides.forEach((data, index) => {
    const isConclusion = data.layout === "conclusion";
    const slide = pres.addSlide({ masterName: isConclusion ? "SHIKSHAK_DARK" : "SHIKSHAK_CONTENT" });
    slideTitle(slide, data.title, isConclusion ? C.white : C.navy);
    notes(slide, data);

    switch (data.layout) {
      case "cards": drawCards(slide, data); break;
      case "stats": drawStats(slide, data); break;
      case "timeline": drawTimeline(slide, data); break;
      case "two_column": drawTwoColumn(slide, data); break;
      case "conclusion": drawConclusion(slide, data); break;
      default: drawBullets(slide, data);
    }
  });

  // ---------------------------------------------------------- layout: bullets
  function drawBullets(slide, data) {
    const bullets = data.bullets || [];
    const hasTakeaway = Boolean(data.takeaway);
    const listW = hasTakeaway ? 7.5 : CONTENT_W;
    const bodyH = H - BODY_TOP - 0.8;
    const rowH = Math.min(1.0, bodyH / Math.max(bullets.length, 1));
    const longest = Math.max(...bullets.map((b) => b.length), 0);
    const fontSize = hasTakeaway ? sizeFor("x".repeat(longest), [[70, 18], [200, 16]]) : sizeFor("x".repeat(longest), [[90, 20], [200, 18]]);

    bullets.forEach((bullet, i) => {
      const y = BODY_TOP + i * rowH;
      card(slide, MX, y, listW, rowH - 0.14, C.tealSoft);
      circle(slide, MX + 0.2, y + (rowH - 0.14 - 0.5) / 2, 0.5, C.teal, numberLabel(i + 1, language), C.white, 16);
      text(slide, bullet, {
        x: MX + 0.95, y, w: listW - 1.2, h: rowH - 0.14, valign: "middle", fontSize
      });
    });

    if (hasTakeaway) {
      const x = MX + listW + 0.4;
      const w = W - MX - x;
      card(slide, x, BODY_TOP, w, bodyH - 0.14, C.navy);
      text(slide, L.takeaway, { x: x + 0.35, y: BODY_TOP + 0.35, w: w - 0.7, h: 0.4, bold: true, fontSize: 14, color: C.saffron });
      text(slide, data.takeaway, {
        x: x + 0.35, y: BODY_TOP + 0.9, w: w - 0.7, h: bodyH - 1.5,
        fontSize: sizeFor(data.takeaway, [[60, 22], [110, 19], [200, 16]]), color: C.white
      });
    }
  }

  // ----------------------------------------------------------- layout: cards
  function drawCards(slide, data) {
    const items = data.items || [];
    const n = items.length;
    const gap = 0.35;
    const cols = n === 4 ? 2 : n;
    const rows = n === 4 ? 2 : 1;
    const bodyH = H - BODY_TOP - 0.8;
    const cardW = (CONTENT_W - gap * (cols - 1)) / cols;
    const cardH = n === 2 ? Math.min(bodyH, 3.9) : (bodyH - gap * (rows - 1)) / rows;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = MX + col * (cardW + gap);
      const y = BODY_TOP + row * (cardH + gap);
      const accent = i % 2 === 0 ? C.teal : C.saffron;

      card(slide, x, y, cardW, cardH, i % 2 === 0 ? C.tealSoft : C.saffronSoft);
      circle(slide, x + 0.3, y + 0.3, 0.55, accent, numberLabel(i + 1, language), C.white, 18);

      const stacked = cols === 2 && rows === 2; // compact 2x2: heading beside the badge
      const headX = stacked ? x + 1.05 : x + 0.3;
      const headY = stacked ? y + 0.28 : y + 1.05;
      const headW = stacked ? cardW - 1.35 : cardW - 0.6;
      const headH = stacked ? 0.6 : 0.8;
      text(slide, item.heading, {
        x: headX, y: headY, w: headW, h: headH, bold: true, color: C.navy,
        valign: stacked ? "middle" : "top", fontSize: sizeFor(item.heading, [[24, 20], [50, 18]])
      });
      const bodyY = stacked ? y + 1.0 : y + 1.95;
      text(slide, item.text, {
        x: x + 0.3, y: bodyY, w: cardW - 0.6, h: cardH - (bodyY - y) - 0.2,
        fontSize: sizeFor(item.text, [[90, 16], [200, 15]])
      });
    });
  }

  // ----------------------------------------------------------- layout: stats
  function drawStats(slide, data) {
    const stats = data.stats || [];
    const n = stats.length;
    const gap = 0.35;
    const cardW = (CONTENT_W - gap * (n - 1)) / n;
    const cardH = 3.0;
    const y = data.takeaway ? BODY_TOP + 0.1 : BODY_TOP + 0.5;

    stats.forEach((stat, i) => {
      const x = MX + i * (cardW + gap);
      card(slide, x, y, cardW, cardH, i % 2 === 0 ? C.tealSoft : C.saffronSoft);
      text(slide, stat.value, {
        x: x + 0.2, y: y + 0.45, w: cardW - 0.4, h: 1.4, align: "center", valign: "middle", bold: true,
        color: i % 2 === 0 ? C.teal : C.saffron,
        fontSize: sizeFor(stat.value, [[4, 60], [7, 48], [10, 38]])
      });
      text(slide, stat.label, {
        x: x + 0.3, y: y + 1.95, w: cardW - 0.6, h: 0.9, align: "center", fontSize: sizeFor(stat.label, [[40, 16], [80, 15]])
      });
    });

    if (data.takeaway) {
      card(slide, MX, y + cardH + 0.35, CONTENT_W, 0.95, C.navy);
      text(slide, data.takeaway, {
        x: MX + 0.4, y: y + cardH + 0.35, w: CONTENT_W - 0.8, h: 0.95, valign: "middle",
        fontSize: sizeFor(data.takeaway, [[90, 18], [200, 16]]), color: C.white
      });
    }
  }

  // -------------------------------------------------------- layout: timeline
  function drawTimeline(slide, data) {
    const items = data.items || [];
    const n = items.length;
    const colW = CONTENT_W / n;
    const lineY = BODY_TOP + 0.55;
    const d = 0.9;

    slide.addShape(pres.ShapeType.line, {
      x: MX + colW / 2, y: lineY, w: colW * (n - 1), h: 0, line: { color: C.teal, width: 3 }
    });

    items.forEach((item, i) => {
      const cx = MX + i * colW + colW / 2;
      circle(slide, cx - d / 2, lineY - d / 2, d, i === n - 1 ? C.saffron : C.teal, numberLabel(i + 1, language), C.white, 22);

      text(slide, item.heading, {
        x: MX + i * colW + 0.1, y: lineY + 0.8, w: colW - 0.2, h: 0.65, align: "center", valign: "middle", bold: true, color: C.navy,
        fontSize: sizeFor(item.heading, [[22, 20], [50, 17]])
      });
      text(slide, item.text, {
        x: MX + i * colW + 0.1, y: lineY + 1.5, w: colW - 0.2, h: 2.6, align: "center",
        fontSize: sizeFor(item.text, [[70, 16], [130, 15], [200, 14]])
      });
    });
  }

  // ----------------------------------------------------- layout: two_column
  function drawTwoColumn(slide, data) {
    const gap = 0.4;
    const colW = (CONTENT_W - gap) / 2;
    const bodyH = H - BODY_TOP - 0.8;

    [[data.left, C.tealSoft, C.teal], [data.right, C.saffronSoft, C.saffron]].forEach(([part, soft, accent], i) => {
      const x = MX + i * (colW + gap);
      card(slide, x, BODY_TOP, colW, bodyH, soft);
      circle(slide, x + 0.3, BODY_TOP + 0.3, 0.5, accent, numberLabel(i + 1, language), C.white, 16);
      text(slide, part.heading, {
        x: x + 1.0, y: BODY_TOP + 0.25, w: colW - 1.3, h: 0.6, valign: "middle", bold: true, color: C.navy,
        fontSize: sizeFor(part.heading, [[28, 22], [50, 19]])
      });

      const longest = Math.max(...part.points.map((p) => p.length), 0);
      text(
        slide,
        part.points.map((point, k) => ({
          text: point,
          options: { bullet: true, breakLine: k < part.points.length - 1, paraSpaceAfter: 10 }
        })),
        {
          x: x + 0.35, y: BODY_TOP + 1.1, w: colW - 0.7, h: bodyH - 1.35,
          fontSize: sizeFor("x".repeat(longest), [[70, 17], [200, 15]])
        }
      );
    });
  }

  // ------------------------------------------------------ layout: conclusion
  function drawConclusion(slide, data) {
    const bullets = data.bullets || [];
    const rowH = Math.min(0.95, 3.7 / Math.max(bullets.length, 1));
    const longest = Math.max(...bullets.map((b) => b.length), 0);

    bullets.forEach((bullet, i) => {
      const y = BODY_TOP - 0.05 + i * rowH;
      circle(slide, MX, y + (rowH - 0.14 - 0.5) / 2, 0.5, C.saffron, numberLabel(i + 1, language), C.navy, 16);
      text(slide, bullet, {
        x: MX + 0.85, y, w: CONTENT_W - 0.9, h: rowH - 0.14, valign: "middle", color: C.white,
        fontSize: sizeFor("x".repeat(longest), [[90, 20], [200, 18]])
      });
    });

    if (data.takeaway) {
      text(slide, data.takeaway, {
        x: MX, y: 5.7, w: 9.5, h: 0.7, italic: true, color: C.onDark,
        fontSize: sizeFor(data.takeaway, [[90, 18], [200, 16]])
      });
    }
    text(slide, L.thanks, {
      x: MX, y: 6.4, w: 6, h: 0.7, bold: true, color: C.saffron, fontSize: 32
    });
  }

  return pres.write({ outputType: "nodebuffer" });
}
