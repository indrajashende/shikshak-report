import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Extension } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import { API_BASE_URL } from "../services/reportApi.js";import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  HeadingLevel,
  WidthType,
  BorderStyle
} from "docx";

import {
  ArrowLeft,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Printer,
  FileText,
  FileType,
  Heading2,
  LoaderCircle
} from "lucide-react";

import html2pdf from "html2pdf.js";

// Font size support
const FontSize = Extension.create({
  name: "fontSize",

  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) =>
              element.style.fontSize || null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return {
                style: `font-size: ${attributes.fontSize}`
              };
            }
          }
        }
      }
    ];
  }
});

// Roman numbering
const toRoman = (num) => {
  const values = [
    [1000, "M"], [900, "CM"], [500, "D"],
    [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"],
    [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]
  ];

  let result = "";

  for (const [value, symbol] of values) {
    while (num >= value) {
      result += symbol;
      num -= value;
    }
  }

  return result;
};

const toMarathiDigits = (value) =>
  String(value).replace(/[0-9]/g, (digit) => "०१२३४५६७८९"[Number(digit)]);

function ToolbarButton({ active, onClick, children, title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md p-2 transition ${
        active
          ? "bg-blue-100 text-blue-900"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

// HTML inline content to Word TextRuns
function getTextRuns(node, inherited = {}) {
  const runs = [];

  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent) {
      runs.push(
        new TextRun({
          text: node.textContent,
          bold: inherited.bold || false,
          italics: inherited.italics || false,
          underline: inherited.underline ? {} : undefined,
          font: {
            name: inherited.fontFamily || "Noto Sans Devanagari"
          },
          size: inherited.fontSize || 24,
          color: inherited.color || "111827"
        })
      );
    }

    return runs;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return runs;

  const tag = node.tagName.toLowerCase();

  if (tag === "br") {
    runs.push(new TextRun({ break: 1 }));
    return runs;
  }

  const style = node.style || {};

  const nextStyle = {
    ...inherited,
    bold: inherited.bold || tag === "strong" || tag === "b",
    italics: inherited.italics || tag === "em" || tag === "i",
    underline: inherited.underline || tag === "u",
    fontFamily:
      style.fontFamily?.replace(/["']/g, "") ||
      inherited.fontFamily ||
      "Noto Sans Devanagari",
    fontSize: style.fontSize
      ? Math.round(parseFloat(style.fontSize) * 2)
      : inherited.fontSize || 24,
    color: style.color
      ? style.color.replace("#", "")
      : inherited.color || "111827"
  };

  if (style.textDecoration?.includes("underline")) {
    nextStyle.underline = true;
  }

  node.childNodes.forEach((child) => {
    runs.push(...getTextRuns(child, nextStyle));
  });

  return runs;
}

// HTML report content to Word
function convertHtmlToWordContent(html) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, "text/html");
  const root = parsed.body;

  const children = [];

  const getAlignment = (element) => {
    const alignment = element.style?.textAlign;

    if (alignment === "center") return AlignmentType.CENTER;
    if (alignment === "right") return AlignmentType.RIGHT;
    if (alignment === "left") return AlignmentType.LEFT;

    return AlignmentType.JUSTIFIED;
  };

  const createParagraph = (element, options = {}) => {
    const runs = [];

    element.childNodes.forEach((child) => {
      runs.push(...getTextRuns(child));
    });

    return new Paragraph({
      alignment: options.alignment || getAlignment(element),
      heading: options.heading,
      spacing: {
        before: options.before ?? 100,
        after: options.after ?? 160,
        line: 360
      },
      children: runs.length ? runs : [new TextRun("")]
    });
  };

  const createTable = (tableElement) => {
    const rows = Array.from(tableElement.querySelectorAll("tr"));

    const wordRows = rows.map((row) => {
      const cells = Array.from(row.children).filter(
        (cell) =>
          cell.tagName.toLowerCase() === "td" ||
          cell.tagName.toLowerCase() === "th"
      );

      return new TableRow({
        cantSplit: true,
        children: cells.map((cell) => {
          const cellRuns = [];

          cell.childNodes.forEach((child) => {
            cellRuns.push(...getTextRuns(child));
          });

          return new TableCell({
            width: {
              size: Math.floor(100 / Math.max(cells.length, 1)),
              type: WidthType.PERCENTAGE
            },
            shading:
              cell.tagName.toLowerCase() === "th"
                ? { fill: "F1F5F9" }
                : undefined,
            margins: {
              top: 100,
              bottom: 100,
              left: 100,
              right: 100
            },
            children: [
              new Paragraph({
                children: cellRuns.length
                  ? cellRuns
                  : [new TextRun("")]
              })
            ]
          });
        })
      });
    });

    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE
      },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "94A3B8" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "94A3B8" },
        left: { style: BorderStyle.SINGLE, size: 1, color: "94A3B8" },
        right: { style: BorderStyle.SINGLE, size: 1, color: "94A3B8" },
        insideHorizontal: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "94A3B8"
        },
        insideVertical: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: "94A3B8"
        }
      },
      rows: wordRows
    });
  };

  const processNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent.trim()) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: node.textContent,
                font: { name: "Noto Sans Devanagari" },
                size: 24
              })
            ]
          })
        );
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName.toLowerCase();

    if (tag === "table") {
      children.push(createTable(node));
      return;
    }

    if (tag === "hr") {
      children.push(
        new Paragraph({
          pageBreakBefore: true,
          children: [new TextRun("")]
        })
      );
      return;
    }

    if (tag === "h1") {
      children.push(
        createParagraph(node, {
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          before: 300,
          after: 300
        })
      );
      return;
    }

    if (tag === "h2") {
      children.push(
        createParagraph(node, {
          heading: HeadingLevel.HEADING_2,
          before: 240,
          after: 160
        })
      );
      return;
    }

    if (tag === "h3") {
      children.push(
        createParagraph(node, {
          heading: HeadingLevel.HEADING_3,
          before: 200,
          after: 120
        })
      );
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const items = Array.from(node.children).filter(
        (child) => child.tagName.toLowerCase() === "li"
      );

      items.forEach((item, index) => {
        const runs = [];

        item.childNodes.forEach((child) => {
          runs.push(...getTextRuns(child));
        });

        const prefix =
          tag === "ul" ? "• " : `${index + 1}. `;

        children.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { after: 100, line: 360 },
            children: [
              new TextRun({
                text: prefix,
                font: { name: "Noto Sans Devanagari" },
                size: 24
              }),
              ...(runs.length ? runs : [new TextRun("")])
            ]
          })
        );
      });

      return;
    }

    if (
      tag === "p" ||
      tag === "div" ||
      tag === "blockquote"
    ) {
      children.push(createParagraph(node));
      return;
    }

    node.childNodes.forEach(processNode);
  };

  root.childNodes.forEach(processNode);

  return children.length
    ? children
    : [new Paragraph({ children: [new TextRun("")] })];
}

function EditReport() {
  const location = useLocation();
  const navigate = useNavigate();

  const reportList = location.state?.reports || [];

  const [selectedReportIndex, setSelectedReportIndex] = useState(0);

  const activeReport = reportList[selectedReportIndex];

  const reportHtml =
    activeReport?.reportHtml || location.state?.reportHtml;

  const [fontSize, setFontSize] = useState("12pt");

  const [fontFamily, setFontFamily] = useState(
    "Noto Sans Devanagari"
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"]
      }),
      TextStyle,
      FontFamily,
      FontSize
    ],

    content: reportHtml || "",

    editorProps: {
      attributes: {
        class: "report-content focus:outline-none"
      }
    }
  });

  useEffect(() => {
    if (editor && reportHtml) {
      editor.commands.setContent(reportHtml);
    }
  }, [editor, reportHtml]);

  // Current editor content for export
  const getExportHtml = () => {
    const currentHtml = editor?.getHTML() || "";

    return `<!DOCTYPE html>
<html lang="mr">
<head>
<meta charset="UTF-8" />
<style>
  @page {
    size: A4;
    margin: 14mm;
  }

  * {
    box-sizing: border-box;
  }

  body {
    font-family: "Noto Sans Devanagari", "Mangal", sans-serif;
    color: #111827;
    font-size: 12pt;
    line-height: 1.65;
    margin: 0;
    padding: 0;
  }

  .report-content {
    width: 100%;
    overflow-wrap: break-word;
    word-wrap: break-word;
  }

  h1, h2, h3 {
    break-after: avoid;
    page-break-after: avoid;
    margin-top: 16px;
    margin-bottom: 10px;
  }

  p {
    margin: 0 0 9px;
    text-align: justify;
    orphans: 2;
    widows: 2;
    break-inside: auto;
    page-break-inside: auto;
  }

  ul, ol {
    padding-left: 26px;
    margin: 8px 0;
  }

  li {
    margin-bottom: 4px;
    break-inside: auto;
    page-break-inside: auto;
    orphans: 2;
    widows: 2;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
  }

  tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  th, td {
    border: 1px solid #94a3b8;
    padding: 7px;
  }

  th {
    background: #f1f5f9;
    font-weight: 700;
  }

  hr.report-page-break {
    border: 0;
    page-break-after: always;
    break-after: page;
  }

  img {
    max-width: 100%;
    height: auto;
  }
</style>
</head>
<body>
  <main class="report-content">${currentHtml}</main>
</body>
</html>`;
  };

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const makeFileName = (extension) => {
    const language = activeReport?.language || "report";

    return `shikshak-report-${String(language).replace(
      /[^a-zA-Z0-9_-]/g,
      "-"
    )}.${extension}`;
  };

  // Builds one clean index from the real report headings.
  // The server fills the page column after rendering and measuring the PDF.
  const preparePrintableHtml = (html) => {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, "text/html");
    const root = parsed.body;

    // A leading or repeated page-break element creates a completely blank
    // physical page in Chromium. Remove only those accidental breaks.
    while (root.firstElementChild?.tagName === "HR") {
      root.firstElementChild.remove();
    }
    let previousWasBreak = false;
    Array.from(root.querySelectorAll("hr")).forEach((breakElement) => {
      if (previousWasBreak) {
        breakElement.remove();
      } else {
        previousWasBreak = true;
      }
      if (breakElement.isConnected) {
        let next = breakElement.nextElementSibling;
        while (next && next.tagName === "HR") {
          const duplicate = next;
          next = next.nextElementSibling;
          duplicate.remove();
        }
      }
      previousWasBreak = false;
    });
    if (root.lastElementChild?.tagName === "HR") {
      root.lastElementChild.remove();
    }

    const cleanText = (value) =>
      (value || "")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/\s+/g, " ")
        .trim();

    // An element that prints nothing (empty <p>, <br>, <p>&nbsp;</p> ...).
    const isBlankNode = (node) =>
      node.tagName !== "HR" &&
      ["P", "DIV", "BR", "SPAN"].includes(node.tagName) &&
      !node.querySelector("img, table, hr") &&
      !cleanText(node.textContent);

    // Turns every <hr> page-break into a "break-before: page" on the next
    // visible element and deletes the <hr>. Two <hr> (or an <hr>, an empty
    // paragraph and another <hr>) in a row print a completely BLANK page in
    // Chromium; "break-before" on an element never does.
    const collapsePageBreaks = () => {
      Array.from(root.children)
        .filter((el) => el.tagName === "HR")
        .forEach((breakElement) => {
          if (!breakElement.isConnected) return;

          let next = breakElement.nextElementSibling;
          while (next && (next.tagName === "HR" || isBlankNode(next))) {
            const duplicate = next;
            next = next.nextElementSibling;
            duplicate.remove();
          }

          if (next) {
            next.style.breakBefore = "page";
            next.style.pageBreakBefore = "always";
          }
          breakElement.remove();
        });
    };

    // The AI sometimes splits the cover into two pages: a title-only page and
    // a second page that repeats the title. Everything before the declaration
    // (प्रतिज्ञापत्र) is ONE cover page, so keep only the break that ends it
    // and drop the repeated title.
    const mergeSplitCover = () => {
      const children = Array.from(root.children);
      const pledgeAt = children.findIndex(
        (el) =>
          /^H[1-4]$/.test(el.tagName) &&
          /^(?:प्रतिज्ञा|घोषणा|declaration)/i.test(
            cleanText(el.textContent).replace(/\s+/g, "")
          )
      );
      if (pledgeAt < 1) return;

      const cover = children.slice(0, pledgeAt);
      const coverBreaks = cover.filter((el) => el.tagName === "HR");
      if (coverBreaks.length < 2) return;

      // Keep only the last break (the one that ends the cover).
      coverBreaks.slice(0, -1).forEach((el) => el.remove());

      const seenHeadings = new Set();
      cover
        .filter((el) => el.isConnected && /^H[1-3]$/.test(el.tagName))
        .forEach((el) => {
          const key = cleanText(el.textContent).replace(/\s+/g, "");
          if (!key) return;
          if (seenHeadings.has(key)) el.remove();
          else seenHeadings.add(key);
        });
    };

    mergeSplitCover();

    const originalFirstPageBreak =
      root.querySelector("hr.report-page-break") || root.querySelector("hr");

    const chapterMatch = (value) =>
      cleanText(value).match(
        /^(?:प्रकरण|अध्याय|chapter)\s*(?:क्रमांक\s*)?([०-९0-9]+)(?![०-९0-9])/i
      );

    const isChapterHeading = (node) => Boolean(chapterMatch(node.textContent));
    const isChapterOne = (node) => {
      const match = chapterMatch(node.textContent);
      return Boolean(match && /^[१1]$/.test(match[1]));
    };

    const isIndexLabel = (node) => {
      const text = cleanText(node.textContent);
      return (
        text.length <= 40 &&
        /^(अनुक्रमणिका|विषयसूची|table of contents|index)([\s(/:\-–—].*)?$/i.test(
          text
        )
      );
    };

    const firstChapter = Array.from(
      root.querySelectorAll("h1, h2, h3")
    ).find(isChapterHeading);

    let indexHeading = Array.from(
      root.querySelectorAll("h1, h2, h3, p")
    ).find(isIndexLabel);

    if (indexHeading && firstChapter) {
      // Delete the AI placeholder index only; preserve every chapter and its
      // actual report content. This also prevents a second index being printed.
      let node = indexHeading.nextElementSibling;
      while (node && node !== firstChapter) {
        const next = node.nextElementSibling;
        node.remove();
        node = next;
      }
    } else if (!indexHeading && firstChapter) {
      indexHeading = parsed.createElement("h1");
      indexHeading.textContent = "अनुक्रमणिका";
      indexHeading.style.textAlign = "center";
      firstChapter.before(indexHeading);
    }

    if (!indexHeading || !firstChapter) {
      collapsePageBreaks();
      return { html: root.innerHTML, hasGeneratedToc: false };
    }

    // Always start the index on a fresh page. ANY <hr> already counts as a
    // page break (the AI writes a plain <hr> without the report-page-break
    // class), so never add a second one: two breaks in a row print a blank
    // page just before the index.
    let previous = indexHeading.previousElementSibling;
    while (previous && isBlankNode(previous)) {
      const blank = previous;
      previous = previous.previousElementSibling;
      blank.remove();
    }
    if (!previous || previous.tagName !== "HR") {
      const pageBreak = parsed.createElement("hr");
      pageBreak.className = "report-page-break";
      indexHeading.before(pageBreak);
    }

    indexHeading.textContent = "अनुक्रमणिका";
    indexHeading.style.textAlign = "center";
    indexHeading.style.breakAfter = "avoid";
    indexHeading.style.pageBreakAfter = "avoid";

    const tocTable = parsed.createElement("table");
    tocTable.className = "generated-report-toc";
    tocTable.innerHTML = `
      <thead>
        <tr>
          <th style="width:20%;text-align:center">प्रकरण क्रमांक</th>
          <th style="width:62%;text-align:center">तपशील</th>
          <th style="width:18%;text-align:center">पृष्ठ क्रमांक</th>
        </tr>
      </thead>
      <tbody></tbody>`;
    indexHeading.after(tocTable);

    const isOnCoverPage = (heading) =>
      Boolean(
        originalFirstPageBreak &&
          (heading.compareDocumentPosition(originalFirstPageBreak) &
            Node.DOCUMENT_POSITION_FOLLOWING)
      );

    const headings = Array.from(root.querySelectorAll("h1, h2, h3"))
      .filter((heading) => heading !== indexHeading)
      .filter((heading) => !isOnCoverPage(heading))
      .filter((heading) => {
        const label = cleanText(heading.textContent);
        return (
          label &&
          !/^(अनुक्रमणिका|विषयसूची|table of contents|index)$/i.test(label)
        );
      });

    const tbody = tocTable.querySelector("tbody");
    const seen = new Set();
    let currentChapter = "";
    let subsectionNumber = 0;
    let renumberSections = false;

    const toWesternDigits = (value) =>
      String(value).replace(/[०-९]/g, (digit) => "०१२३४५६७८९".indexOf(digit));

    // Expansion rounds of the AI come back as "प्रकरण १ (पुढील भाग) – ...",
    // "प्रकरण १ (परिशिष्ट भाग - २) – ..." etc. These are NOT new chapters:
    // they must not add another "Chapter 1" row to the index.
    const continuationMatch = (value) =>
      value.match(
        /^(?:प्रकरण|अध्याय|chapter)\s*(?:क्रमांक\s*)?([०-९0-9]+)\s*[(（]\s*(?:पुढील|पुढचा|परिशिष्ट|अतिरिक्त|continued|cont\.?|appendix)[^)）]*[)）]\s*[-–—:]?\s*(.*)$/i
      );

    headings.forEach((originalHeading) => {
      let heading = originalHeading;
      let title = cleanText(heading.textContent);

      const continuation = continuationMatch(title);
      if (
        continuation &&
        currentChapter &&
        toWesternDigits(continuation[1]) === toWesternDigits(currentChapter)
      ) {
        // Keep the content, but make it an ordinary section of the chapter.
        const sectionHeading = parsed.createElement("h2");
        sectionHeading.textContent = continuation[2] || title;
        heading.replaceWith(sectionHeading);
        heading = sectionHeading;
        title = cleanText(sectionHeading.textContent);
        renumberSections = true;
      }

      const chapter = chapterMatch(title);
      if (chapter) {
        currentChapter = chapter[1];
        subsectionNumber = 0;
        renumberSections = false;
      }

      const duplicateKey = `${currentChapter}|${title
        .toLocaleLowerCase()
        .replace(/[।.!?,:;'"“”‘’()[\]{}\-–—]/g, "")
        .replace(/\s+/g, "")}`;

      // Keep the first occurrence within a chapter; identical subsection
      // labels in different chapters remain valid separate index entries.
      if (!title || seen.has(duplicateKey)) return;
      seen.add(duplicateKey);

      let displayNumber = "";
      let displayTitle = title;

      if (chapter) {
        displayNumber = currentChapter;
        displayTitle = title
          .replace(
            /^(?:प्रकरण|अध्याय|chapter)\s*(?:क्रमांक\s*)?[०-९0-9]+(?:\s*[-–—:]?\s*)?/i,
            ""
          )
          .trim();
      } else {
        const explicitNumber = title.match(
          /^([०-९0-9]+(?:[.][०-९0-9]+)+)\s*[-–—:]?\s*/
        );

        if (explicitNumber && !renumberSections) {
          displayNumber = explicitNumber[1];
          displayTitle = title.slice(explicitNumber[0].length).trim();

          // Keep one running counter per chapter, so later un-numbered
          // sections continue after the highest number already used.
          const lastPart = Number(
            toWesternDigits(explicitNumber[1].split(".").pop())
          );
          if (Number.isFinite(lastPart)) {
            subsectionNumber = Math.max(subsectionNumber, lastPart);
          }
        } else if (currentChapter) {
          subsectionNumber += 1;
          displayNumber = `${currentChapter}.${toMarathiDigits(subsectionNumber)}`;

          if (renumberSections) {
            // The AI restarted its numbering (१.१, १.२ ...) inside the
            // continued part. Number it on from the previous section so the
            // report never has two sections with the same number.
            displayTitle = explicitNumber
              ? title.slice(explicitNumber[0].length).trim()
              : title;
            heading.textContent = `${displayNumber} ${displayTitle}`;
          }
        }
      }

      const tocIndex = tbody.children.length;
      heading.setAttribute("data-toc-index", String(tocIndex));
      if (isChapterOne(heading)) {
        heading.style.breakBefore = "page";
        heading.style.pageBreakBefore = "always";
      }

      const row = parsed.createElement("tr");
      row.dataset.tocIndex = String(tocIndex);
      row.dataset.tocTitle = title;

      const numberCell = parsed.createElement("td");
      numberCell.textContent = displayNumber;
      numberCell.style.textAlign = "center";

      const labelCell = parsed.createElement("td");
      labelCell.textContent = displayTitle || title;

      const pageCell = parsed.createElement("td");
      pageCell.textContent = "…";
      pageCell.style.textAlign = "center";

      row.append(numberCell, labelCell, pageCell);
      tbody.appendChild(row);
    });

    collapsePageBreaks();

    return { html: root.innerHTML, hasGeneratedToc: true };
  };

  // PDF download: the HTML is sent straight to the server, nothing is
  // added to the page, so no side screen appears.
  const handleDownloadPdf = async () => {
    if (!editor) return;

    try {
      const prepared = preparePrintableHtml(editor.getHTML());

      const reportLanguage = activeReport?.language || "mr";
      const baseFontSize = reportLanguage === "en" ? "10.5pt" : "11pt";

      const fullHtml = `<!DOCTYPE html>
<html lang="${reportLanguage}">
<head>
<meta charset="UTF-8" />
<style>
  @page { size: A4; margin: 19mm 20mm 22mm; }

  html, body { margin: 0; padding: 0; background: #fff; }

  * { box-sizing: border-box; }

  .pdf-export-root {
    width: 100%;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111827;
    font-family: "Noto Sans Devanagari", "Mangal", Arial, sans-serif;
    font-size: ${baseFontSize};
    line-height: 1.42;
    overflow-wrap: break-word;
  }

  .pdf-export-root h1,
  .pdf-export-root h2,
  .pdf-export-root h3 {
    break-after: avoid;
    page-break-after: avoid;
    line-height: 1.3;
    margin: 11px 0 6px;
  }

  .pdf-export-root h1 { font-size: 17pt; }
  .pdf-export-root h2 { font-size: 14pt; }
  .pdf-export-root h3 { font-size: 12pt; }

  .pdf-export-root p {
    margin: 0 0 6px;
    text-align: justify;
    orphans: 2;
    widows: 2;
  }

  .pdf-export-root ul,
  .pdf-export-root ol { padding-left: 23px; margin: 6px 0; }

  .pdf-export-root li { margin-bottom: 2px; }

  .pdf-export-root table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
  }

  .pdf-export-root thead { display: table-header-group; }
  .pdf-export-root tr { break-inside: avoid; page-break-inside: avoid; }

  .pdf-export-root th,
  .pdf-export-root td {
    border: 1px solid #64748b;
    padding: 5px 6px;
    vertical-align: top;
  }

  .pdf-export-root th { background: #f1f5f9; font-weight: 700; }

  .pdf-export-root hr {
    border: 0;
    height: 0;
    margin: 0;
    page-break-after: always;
    break-after: page;
  }

  .pdf-export-root .generated-report-toc {
    width: 100%;
    table-layout: fixed;
    font-size: ${reportLanguage === "en" ? "9.5pt" : "10pt"};
    line-height: 1.3;
    margin: 8px 0 0;
  }

  .pdf-export-root .generated-report-toc th,
  .pdf-export-root .generated-report-toc td {
    border: 1px solid #777;
    padding: 4px 5px;
    vertical-align: middle;
  }

  .pdf-export-root .generated-report-toc th {
    text-align: center;
    font-weight: 700;
  }

  .pdf-export-root .generated-report-toc tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .pdf-export-root .generated-report-toc + h1,
  .pdf-export-root .generated-report-toc + h2,
  .pdf-export-root .generated-report-toc + h3 {
    break-before: page;
    page-break-before: always;
  }

  .pdf-export-root img { max-width: 100%; height: auto; }
</style>
</head>
<body>
  <main class="pdf-export-root">${prepared.html}</main>
</body>
</html>`;

      const response = await fetch(`${API_BASE_URL}/api/reports/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: fullHtml })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "PDF generation failed");
      }

      const pdfBlob = await response.blob();

      downloadBlob(pdfBlob, makeFileName("pdf"));
    } catch (error) {
      console.error("PDF download failed:", error);

      window.alert("PDF तयार करताना अडचण आली. कृपया पुन्हा प्रयत्न करा.");
    }
  };

  // Word download
  const handleDownloadWord = async () => {
    if (!editor) return;

    try {
      const currentHtml = editor.getHTML();

      const wordContent = convertHtmlToWordContent(currentHtml);

      const wordDocument = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  width: 11906,
                  height: 16838
                },
                margin: {
                  top: 1134,
                  right: 1134,
                  bottom: 1134,
                  left: 1134
                }
              }
            },
            children: wordContent
          }
        ]
      });

      const blob = await Packer.toBlob(wordDocument);

      downloadBlob(blob, makeFileName("docx"));

    } catch (error) {
      console.error("Word download failed:", error);

      window.alert(
        "Word डाउनलोड करताना अडचण आली. कृपया पुन्हा प्रयत्न करा."
      );
    }
  };

  const applyFontSize = (value) => {
    setFontSize(value);

    editor
      ?.chain()
      .focus()
      .setMark("textStyle", {
        fontSize: value
      })
      .run();
  };

  const applyFontFamily = (value) => {
    setFontFamily(value);

    editor
      ?.chain()
      .focus()
      .setFontFamily(value)
      .run();
  };

  if (!reportHtml) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center">
        <h2 className="font-bold text-slate-800">
          रिपोर्ट उपलब्ध नाही.
        </h2>

        <button
          type="button"
          onClick={() => navigate("/new-report?mode=single")}
          className="mt-5 rounded-lg bg-blue-950 px-5 py-3 text-sm text-white"
        >
          नवीन रिपोर्ट तयार करा
        </button>
      </div>
    );
  }

  if (!editor) {
    return (
      <div className="flex items-center justify-center gap-3 p-12 text-slate-500">
        <LoaderCircle className="animate-spin" />
        Editor तयार होत आहे...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/new-report?mode=single")}
            className="mb-3 flex items-center gap-2 text-sm text-slate-500 hover:text-blue-900"
          >
            <ArrowLeft size={17} />
            मागे जा
          </button>

          <h2 className="text-2xl font-bold text-slate-900">
            रिपोर्ट तपासा व संपादित करा
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            आवश्यक बदल करा आणि रिपोर्ट अंतिम करा.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Printer size={18} />
            Print
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex items-center gap-2 rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800"
          >
            <FileType size={18} />
            Download PDF
          </button>

          <button
            type="button"
            onClick={handleDownloadWord}
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <FileText size={18} />
            Download Word
          </button>
        </div>
      </div>

      {reportList.length > 1 && (
        <section className="no-print rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">
            तयार झालेले स्वतंत्र रिपोर्ट
          </p>

          <div className="flex flex-wrap gap-2">
            {reportList.map((item, index) => (
              <button
                key={`${item.language}-${index}`}
                type="button"
                onClick={() => setSelectedReportIndex(index)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${
                  selectedReportIndex === index
                    ? "border-blue-900 bg-blue-950 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Report {index + 1} ·{" "}
                {item.languageLabel || item.language}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Formatting Toolbar */}
      <section className="no-print sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <select
          value={fontFamily}
          onChange={(e) => applyFontFamily(e.target.value)}
          className="max-w-[180px] rounded-md border border-slate-200 px-2 py-2 text-xs"
        >
          <option value="Noto Sans Devanagari">
            Noto Sans Devanagari
          </option>
          <option value="Mangal">Mangal</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
        </select>

        <select
          value={fontSize}
          onChange={(e) => applyFontSize(e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-2 text-xs"
        >
          <option value="10pt">10</option>
          <option value="11pt">11</option>
          <option value="12pt">12</option>
          <option value="14pt">14</option>
          <option value="16pt">16</option>
          <option value="18pt">18</option>
          <option value="20pt">20</option>
          <option value="24pt">24</option>
        </select>

        <div className="mx-1 h-7 w-px bg-slate-200" />

        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={18} />
        </ToolbarButton>

        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={18} />
        </ToolbarButton>

        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={18} />
        </ToolbarButton>

        <div className="mx-1 h-7 w-px bg-slate-200" />

        <ToolbarButton
          title="Align Left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={18} />
        </ToolbarButton>

        <ToolbarButton
          title="Align Center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={18} />
        </ToolbarButton>

        <ToolbarButton
          title="Align Right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={18} />
        </ToolbarButton>

        <div className="mx-1 h-7 w-px bg-slate-200" />

        <ToolbarButton
          title="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 size={18} />
        </ToolbarButton>

        <ToolbarButton
          title="Bullet List"
          active={editor.isActive("bulletList")}
          onClick={() =>
            editor.chain().focus().toggleBulletList().run()
          }
        >
          <List size={18} />
        </ToolbarButton>

        <ToolbarButton
          title="Number List"
          active={editor.isActive("orderedList")}
          onClick={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
        >
          <ListOrdered size={18} />
        </ToolbarButton>
      </section>

      {/* Report Page */}
      <section className="report-print-area overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-8 py-4 text-xs text-slate-400 no-print">
          REPORT DOCUMENT · EDITABLE
          {activeReport?.languageLabel
            ? ` · ${activeReport.languageLabel}`
            : ""}
        </div>

        <div className="report-document">
          <EditorContent editor={editor} />
        </div>
      </section>

      <div className="no-print flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>
          तुम्ही रिपोर्टमधील मजकूर थेट Edit करू शकता.
        </span>

        <span className="flex items-center gap-1">
          <Printer size={14} />
          Print Ready
        </span>
      </div>
    </div>
  );
}

export default EditReport;