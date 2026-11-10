
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Extension } from "@tiptap/core";
import { useEditor, EditorContent } from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";import FontFamily from "@tiptap/extension-font-family";

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
  Download,
  Printer,
  Heading2,
  LoaderCircle
} from "lucide-react";

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

function ToolbarButton({
  active,
  onClick,
  children,
  title
}) {
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

function EditReport() {
  const location = useLocation();
  const navigate = useNavigate();

  const reportList = location.state?.reports || [];
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);
  const activeReport = reportList[selectedReportIndex];
  const reportHtml = activeReport?.reportHtml || location.state?.reportHtml;

  const [fontSize, setFontSize] = useState("12pt");
  const [fontFamily, setFontFamily] = useState(
    "Noto Sans Devanagari"
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
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

        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-lg bg-blue-950 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-900"
        >
          <Download size={18} />
          PDF / Print
        </button>

      </div>

      {reportList.length > 1 && (
        <section className="no-print rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">तयार झालेले स्वतंत्र रिपोर्ट</p>
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
                Report {index + 1} · {item.languageLabel || item.language}
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
          onClick={() =>
            editor.chain().focus().toggleBold().run()
          }
        >
          <Bold size={18} />
        </ToolbarButton>

        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() =>
            editor.chain().focus().toggleItalic().run()
          }
        >
          <Italic size={18} />
        </ToolbarButton>

        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() =>
            editor.chain().focus().toggleUnderline().run()
          }
        >
          <UnderlineIcon size={18} />
        </ToolbarButton>

        <div className="mx-1 h-7 w-px bg-slate-200" />

        <ToolbarButton
          title="Align Left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() =>
            editor.chain().focus().setTextAlign("left").run()
          }
        >
          <AlignLeft size={18} />
        </ToolbarButton>

        <ToolbarButton
          title="Align Center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() =>
            editor.chain().focus().setTextAlign("center").run()
          }
        >
          <AlignCenter size={18} />
        </ToolbarButton>

        <ToolbarButton
          title="Align Right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() =>
            editor.chain().focus().setTextAlign("right").run()
          }
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
          REPORT DOCUMENT · EDITABLE {activeReport?.languageLabel ? `· ${activeReport.languageLabel}` : ""}
        </div>

        <div className="report-document">
          <EditorContent editor={editor} />
        </div>

      </section>

      <div className="no-print flex items-center justify-between gap-3 text-xs text-slate-400">
        <span>तुम्ही रिपोर्टमधील मजकूर थेट Edit करू शकता.</span>

        <span className="flex items-center gap-1">
          <Printer size={14} />
          Print Ready
        </span>
      </div>

    </div>
  );
}

export default EditReport;
