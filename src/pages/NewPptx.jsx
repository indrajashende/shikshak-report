import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileText, Languages, LoaderCircle, Palette, Presentation, Sparkles, WandSparkles
} from "lucide-react";
import { generatePptx } from "../services/reportApi";
import { reportTypes } from "../components/input/ReportTypeSelector";

const languageOptions = [
  { value: "mr", label: "मराठी" },
  { value: "hi", label: "हिंदी" },
  { value: "en", label: "English" }
];

const themeOptions = [
  { value: "teal", label: "निळसर-केशरी", colors: ["12394A", "1F7A8C", "E8890C"] },
  { value: "maroon", label: "मरून-सोनेरी", colors: ["4A1424", "9B2C4B", "D99A1E"] },
  { value: "green", label: "हिरवा", colors: ["17402A", "2E7D4F", "F29F05"] },
  { value: "royal", label: "रॉयल निळा", colors: ["1B2559", "3A56C4", "F28C28"] }
];

const promptIdeas = [
  "शिक्षणाधिकाऱ्यांसमोर ५ मिनिटांत सादर करता येईल असे सादरीकरण",
  "पालक सभेसाठी सोप्या भाषेत स्लाइड्स",
  "केलेल्या उपक्रमांवर आणि निष्कर्षांवर जास्त भर द्या"
];

const MIN_SOURCE_CHARS = 200;

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function NewPptx() {
  const navigate = useNavigate();
  const { state } = useLocation();

  // Opened from the report editor ("PPTX" button) -> report text is pre-filled.
  const [sourceText, setSourceText] = useState(state?.sourceText || "");
  const [language, setLanguage] = useState(state?.language || "mr");
  const [reportType, setReportType] = useState(state?.reportType || "action_research");
  const [prompt, setPrompt] = useState("");
  const [theme, setTheme] = useState("teal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const fromReport = Boolean(state?.sourceText);
  const tooShort = sourceText.trim().length < MIN_SOURCE_CHARS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tooShort) {
      setError("कृपया रिपोर्टचा मजकूर Paste करा (किमान काही परिच्छेद).");
      return;
    }

    setLoading(true);
    setError("");
    setDone(false);

    try {
      const blob = await generatePptx({ sourceText, prompt, language, reportType, theme });
      downloadBlob(blob, `shikshak-slides-${language}.pptx`);
      setDone(true);
    } catch (err) {
      setError(err.message || "PPTX तयार करता आले नाही.");
    } finally {
      setLoading(false);
    }
  };

  const selectClass =
    "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100";

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-6 sm:space-y-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button type="button" onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-900">
              <ArrowLeft size={16} /> मागे जा
            </button>
            <h2 className="text-2xl font-bold text-slate-900">PPTX सादरीकरण तयार करा</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              अहवालाचा मजकूर आणि तुमचा Prompt द्या. AI त्यावरून ८ ते १० स्लाइड्सचे PowerPoint तयार करेल.
            </p>
          </div>
          <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">८–१० स्लाइड्स</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-6">
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText size={18} className="text-blue-900" /> अहवालाचा प्रकार
              </label>
              <select value={reportType} onChange={(e) => setReportType(e.target.value)} disabled={loading} className={selectClass}>
                {reportTypes.filter((t) => t.value !== "other").map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Languages size={18} className="text-blue-900" /> स्लाइड्सची भाषा
              </label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={loading} className={selectClass}>
                {languageOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-900"><WandSparkles size={21} /></div>
              <div>
                <h3 className="font-bold text-slate-800">तुमचा Prompt</h3>
                <p className="mt-1 text-sm text-slate-500">सादरीकरण कोणासाठी आहे आणि कशावर भर द्यायचा ते सांगा (ऐच्छिक).</p>
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={3000}
              disabled={loading}
              placeholder="उदा. शिक्षणाधिकाऱ्यांसमोर ५ मिनिटांत सादर करता येईल असे सादरीकरण..."
              className="w-full min-w-0 resize-y rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm leading-7 text-slate-700 outline-none focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {promptIdeas.map((idea) => (
                <button key={idea} type="button" disabled={loading} onClick={() => setPrompt(idea)}
                  className="rounded-full border border-blue-100 bg-blue-50/60 px-3 py-1.5 text-xs text-blue-900 hover:bg-blue-100 disabled:opacity-50">
                  {idea}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-900"><Palette size={21} /></div>
              <div>
                <h3 className="font-bold text-slate-800">डिझाइन निवडा</h3>
                <p className="mt-1 text-sm text-slate-500">स्लाइड्सचे रंग निवडा.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {themeOptions.map((item) => (
                <button key={item.value} type="button" disabled={loading} onClick={() => setTheme(item.value)}
                  aria-pressed={theme === item.value}
                  className={`rounded-xl border p-3 text-left transition disabled:opacity-50 ${
                    theme === item.value ? "border-blue-700 bg-blue-50 ring-2 ring-blue-100" : "border-slate-200 hover:bg-slate-50"
                  }`}>
                  <div className="mb-2 flex gap-1.5">
                    {item.colors.map((color) => (
                      <span key={color} className="h-6 w-6 rounded-full border border-white shadow" style={{ backgroundColor: `#${color}` }} />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-3 text-blue-900"><FileText size={21} /></div>
              <div>
                <h3 className="font-bold text-slate-800">अहवालाचा मजकूर</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {fromReport
                    ? "संपादित केलेल्या रिपोर्टचा मजकूर येथे आपोआप आला आहे. हवे तर बदल करू शकता."
                    : "तयार झालेल्या अहवालाचा मजकूर येथे Paste करा. स्लाइड्स याच मजकुरावर आधारित असतील."}
                </p>
              </div>
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => { setSourceText(e.target.value); setError(""); }}
              rows={fromReport ? 8 : 14}
              required
              disabled={loading}
              placeholder="येथे अहवालाचा संपूर्ण मजकूर Paste करा..."
              className="w-full min-w-0 resize-y rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm leading-8 text-slate-700 outline-none focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
            <div className="mt-3 flex justify-between text-xs text-slate-400">
              <span>{sourceText.length} अक्षरे</span>
              <button type="button" onClick={() => setSourceText("")} className="font-medium hover:text-red-600" disabled={loading}>Clear</button>
            </div>
          </section>

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {done && !error && (
            <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              PPTX तयार झाले आणि डाउनलोड झाले. PowerPoint मध्ये उघडून हवे ते बदल करू शकता.
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={loading || tooShort}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-950 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
              <Sparkles size={19} /> PPTX तयार करा
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-md" role="status" aria-live="polite">
          <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
              <LoaderCircle size={30} className="animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">स्लाइड्स तयार होत आहेत...</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              AI अहवाल वाचून ८–१० स्लाइड्स तयार करत आहे. यास साधारण ३० ते ९० सेकंद लागू शकतात. कृपया ही विंडो बंद करू नका.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Presentation size={15} /> फक्त अहवालातील माहिती वापरली जाते
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default NewPptx;
