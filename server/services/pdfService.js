import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// ---------------------------------------------------------------------------
// PAGE NUMBERING RULES
//
//   Cover page (मुखपृष्ठ) ........ counted and printed as "I"
//   Up to and incl. the index ..... I, II, III, IV, V ...   (all printed)
//   Chapter 1 onwards ............. 1, 2, 3 ...             (all printed)
//
// Pages that come before the cover (e.g. a stray title-only page) get no
// number and are not counted.
// ---------------------------------------------------------------------------

// The reference report prints the Roman numeral on the cover page.
const PRINT_NUMBER_ON_COVER = true;

// Headings that identify the cover page (compared with spaces removed).
const COVER_HEADINGS = ["मुखपृष्ठ", "coverpage", "titlepage"];

// How many times the page numbers are re-measured against the real PDF
// layout before the final PDF is made.
const MAX_VERIFY_PASSES = 3;

// Page geometry (mm). The page border is drawn inside the page; the page
// number is centred in the strip between the border and the text area, so
// BORDER_INSET_MM must stay smaller than the bottom margin.
const BORDER_INSET_MM = 12;
const MARGIN_TOP_MM = 19;
const MARGIN_BOTTOM_MM = 22;
const MARGIN_SIDE_MM = 20;

// Height of the text area of one page (mm), used to centre the title page.
// A few mm are kept free so the title page can never spill onto a 2nd page.


const PDF_OPTIONS = {
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,
  margin: {
    top: `${MARGIN_TOP_MM}mm`,
    bottom: `${MARGIN_BOTTOM_MM}mm`,
    left: `${MARGIN_SIDE_MM}mm`,
    right: `${MARGIN_SIDE_MM}mm`
  }
};

// Extract text from every PDF page.
async function extractPdfPages(pdfBuffer) {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    useSystemFonts: true
  });

  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item) => item.str)
      .join("")
      .replace(/\s+/g, "");

    pages.push({ pageNumber, text: pageText });
  }

  return pages;
}

// Convert numbers into lowercase Roman numerals (i, ii, iii, iv ...).
function toRoman(num) {
  const values = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];

  let result = "";

  for (const [value, symbol] of values) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }

  return result;
}

// Reads the invisible markers out of a rendered PDF:
//  - ZZTOC<n>ZZ    -> the page where index heading n starts
//  - ZZTOCSTARTZZ / ZZTOCENDZZ -> first and last page of the index itself
// It also finds the cover page by its heading.
function analyzeMarkers(extractedPages) {
  const markerPages = new Map();
  let indexStart = null;
  let indexEnd = null;
  let coverPage = null;

  for (const pdfPage of extractedPages) {
    for (const match of pdfPage.text.matchAll(/ZZTOC(\d+)ZZ/g)) {
      const index = Number(match[1]);

      if (!markerPages.has(index)) {
        markerPages.set(index, pdfPage.pageNumber);
      }
    }

    if (indexStart === null && pdfPage.text.includes("ZZTOCSTARTZZ")) {
      indexStart = pdfPage.pageNumber;
    }

    if (pdfPage.text.includes("ZZTOCENDZZ")) {
      indexEnd = pdfPage.pageNumber;
    }

    if (coverPage === null) {
      const visibleText = pdfPage.text
        .replace(/ZZTOC(?:START|END|\d+)ZZ/g, "")
        .toLowerCase();

      if (COVER_HEADINGS.some((heading) => visibleText.startsWith(heading))) {
        coverPage = pdfPage.pageNumber;
      }
    }
  }

  return {
    markerPages,
    coverPage,
    indexPages:
      indexStart !== null ? [indexStart, indexEnd ?? indexStart] : null
  };
}

// Turns marker positions into page labels.
function buildNumbering(analysis, tocRows) {
  const { markerPages, indexPages, coverPage } = analysis;

  // The first page of the report is the cover. Anything before it
  // (e.g. a stray title-only page) is left unnumbered.
  const frontStart = coverPage || 1;

  // Chapter 1 (प्रकरण १) is where Arabic numbering starts from 1.
  const chapterOneRows = tocRows.filter((row) =>
    /^(प्रकरण|अध्याय|chapter)\s*(?:क्रमांक\s*)?[१1](?![०-९0-9])/i.test(row.title.trim())
  );

  const chapterRow =
    chapterOneRows[0] ||
    tocRows.find((row) =>
      /^(प्रकरण|अध्याय|chapter)\s*(?:क्रमांक\s*)?[०-९0-9]/i.test(row.title.trim())
    );

  const firstChapterPage = chapterRow
    ? markerPages.get(chapterRow.index) || null
    : null;

  // If Chapter 1 was not found, the body starts right after the index.
  const bodyStart =
    firstChapterPage || (indexPages ? indexPages[1] + 1 : null);

  // The label a page has in the page count (cover included).
  const getPageLabel = (physicalPage) => {
    if (physicalPage < frontStart) return "";

    if (!bodyStart) return String(physicalPage - frontStart + 1);

    if (physicalPage < bodyStart) {
      return toRoman(physicalPage - frontStart + 1);
    }

    return String(physicalPage - bodyStart + 1);
  };

  // The label that is actually printed on the page.
  const getPrintedLabel = (physicalPage) => {
    if (!PRINT_NUMBER_ON_COVER && physicalPage === frontStart) return "";

    return getPageLabel(physicalPage);
  };

  const tocLabels = {};

  for (const row of tocRows) {
    const physicalPage = markerPages.get(row.index);

    tocLabels[row.index] =
      (physicalPage && getPageLabel(physicalPage)) || "—";
  }

  return {
    getPageLabel,
    getPrintedLabel,
    tocLabels,
    firstChapterPage,
    bodyStart,
    frontStart,
    chapterOneCount: chapterOneRows.length,
    signature: JSON.stringify([tocLabels, indexPages, bodyStart, frontStart])
  };
}

// Draws the page border and the page number on every page.
async function addBorderAndPageNumbers(pdfBuffer, numbering) {
  const pdfDocument = await PDFDocument.load(pdfBuffer);
  const font = await pdfDocument.embedFont(StandardFonts.Helvetica);

  const mm = (value) => (value * 72) / 25.4;
  const borderInset = mm(BORDER_INSET_MM);
  const numberSize = 11;

  // Centre the number vertically between the border and the text area.
  const stripCentre = mm((BORDER_INSET_MM + MARGIN_BOTTOM_MM) / 2);
  const capHeight = font.heightAtSize(numberSize, { descender: false });
  const numberBaseline = stripCentre - capHeight / 2;

  pdfDocument.getPages().forEach((pdfPage, pageIndex) => {
    const { width, height } = pdfPage.getSize();

    pdfPage.drawRectangle({
      x: borderInset,
      y: borderInset,
      width: width - borderInset * 2,
      height: height - borderInset * 2,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });

    const label = numbering.getPrintedLabel(pageIndex + 1);

    if (label) {
      const textWidth = font.widthOfTextAtSize(label, numberSize);

      pdfPage.drawText(label, {
        x: (width - textWidth) / 2,
        y: numberBaseline,
        size: numberSize,
        font,
        color: rgb(0.15, 0.15, 0.15)
      });
    }
  });

  return Buffer.from(await pdfDocument.save());
}

// ---------------------------------------------------------------------------
// Browser lookup: prefer a browser that is already installed on the machine
// (Chrome / Edge). This avoids "spawn UNKNOWN" errors on Windows that happen
// when the Chromium downloaded by Puppeteer is missing, corrupted, or blocked
// by antivirus. Set CHROME_PATH in server/.env to force a specific browser.
// ---------------------------------------------------------------------------
function findBrowserExecutable() {
  const local = process.env.LOCALAPPDATA || "";

  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    local && path.join(local, "Google", "Chrome", "Application", "chrome.exe"),
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean);

  return candidates.find((candidate) => fs.existsSync(candidate));
}

export async function generatePdf(html) {
  let browser;

  try {
    const executablePath = findBrowserExecutable();

    browser = await puppeteer.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"]
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 60000
    });

    // Wait for Marathi fonts and images.
    await page.evaluate(async () => {
      await document.fonts.ready;

      const images = Array.from(document.images);

      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();

          return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        })
      );
    });

    // Keep the report's original cover content in normal document flow.
    // Do not create a separate oversized title-only page: this was the
    // source of an unnecessary sparse/blank-looking first page.

    // Index rows created by the frontend.
    const tocRows = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll(".generated-report-toc tbody tr")
      ).map((row) => ({
        index: Number(row.dataset.tocIndex),
        title: row.dataset.tocTitle || ""
      }))
    );

    // Put an invisible marker (e.g. ZZTOC3ZZ) at the very start of every
    // heading that is listed in the index, and at the start/end of the
    // index itself. A marker is a zero-width, white, 1px inline piece of
    // text inside the heading line, so it always lands on the same page as
    // the heading text (a floating marker could be left behind on the
    // previous page when a heading is pushed to the next page). It takes no
    // space, so it does not change the layout.
    await page.evaluate(() => {
      const makeMarker = (text) => {
        const marker = document.createElement("span");
        marker.className = "toc-marker";
        marker.textContent = text;
        marker.style.cssText =
          "display:inline-block;width:0;height:0;overflow:visible;white-space:nowrap;font-size:1px;line-height:0;color:#ffffff;";
        return marker;
      };

      document
        .querySelectorAll(
          "h1[data-toc-index], h2[data-toc-index], h3[data-toc-index]"
        )
        .forEach((heading) => {
          heading.prepend(makeMarker(`ZZTOC${heading.dataset.tocIndex}ZZ`));
        });

      const table = document.querySelector(".generated-report-toc");

      if (table) {
        const rows = table.querySelectorAll("tbody tr");
        const before = table.previousElementSibling;

        const startHost = before || rows[0]?.cells[0];
        const endHost = rows[rows.length - 1]?.cells[0];

        startHost?.prepend(makeMarker("ZZTOCSTARTZZ"));
        endHost?.prepend(makeMarker("ZZTOCENDZZ"));
      }
    });

    const fillIndex = (labels) =>
      page.evaluate((labelMap) => {
        document
          .querySelectorAll(".generated-report-toc tbody tr")
          .forEach((row) => {
            const pageCell = row.cells[2];

            if (pageCell) {
              pageCell.textContent = labelMap[row.dataset.tocIndex] || "—";
            }
          });
      }, labels);

    const measure = async () =>
      analyzeMarkers(await extractPdfPages(await page.pdf(PDF_OPTIONS)));

    let numbering;

    if (tocRows.length) {
      // Pass 1: find where every heading falls.
      numbering = buildNumbering(await measure(), tocRows);

      // Verification: write the numbers into the index, render again and
      // measure again. If the numbers still match, they are correct for
      // the real layout. If not, repeat with the new numbers.
      let verified = false;

      for (let attempt = 1; attempt <= MAX_VERIFY_PASSES; attempt++) {
        await fillIndex(numbering.tocLabels);

        const checked = buildNumbering(await measure(), tocRows);

        if (checked.signature === numbering.signature) {
          verified = true;
          break;
        }

        numbering = checked;
      }

      if (!verified) {
        console.warn(
          "Index page numbers did not settle after re-checking; using the latest measurement."
        );

        await fillIndex(numbering.tocLabels);
      }

      console.log("Table of contents page numbers verified:", verified);
    } else {
      numbering = buildNumbering(
        { markerPages: new Map(), indexPages: null, coverPage: null },
        []
      );
    }

    if (tocRows.length && !numbering.firstChapterPage) {
      console.warn(
        "Chapter 1 page not detected. Arabic numbering starts right after the index."
      );
    }

    if (numbering.chapterOneCount > 1) {
      console.warn(
        `Found ${numbering.chapterOneCount} headings that look like "Chapter 1" in the index. ` +
          "Numbering starts at the first one. If the report contains a duplicated " +
          "or condensed copy of the chapters, remove it at the source."
      );
    }

    // Remove the markers, then make the final PDF.
    await page.evaluate(() => {
      document.querySelectorAll(".toc-marker").forEach((el) => el.remove());
    });

    const finalGeneratedPdf = await page.pdf(PDF_OPTIONS);

    // Add page border and page numbers to every page.
    return await addBorderAndPageNumbers(finalGeneratedPdf, numbering);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}