import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Languages, FileText, Sparkles, LoaderCircle, CheckCircle2,
  ShieldCheck, Plus, Trash2, ArrowLeft
} from "lucide-react";
import { generateReport } from "../services/reportApi";
import { reportTypes } from "../components/input/ReportTypeSelector";

const languageOptions = [
  { value: "mr", label: "मराठी" },
  { value: "hi", label: "हिंदी" },
  { value: "en", label: "English" }
];

const stageLabels = {
  starting: "माहिती तपासली जात आहे",
  analysis: "तुमच्या माहितीचे विश्लेषण सुरू आहे",
  planning_complete: "अहवालाची रूपरेषा तयार झाली आहे",
  writing: "अहवालाचे प्रकरण तयार होत आहे",
  completed: "अहवाल पूर्ण झाला आहे"
};

const makeReport = (language = "mr", reportType = "innovation") => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  language,
  reportType,
  inputText: ""
});

function NewReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "multiple" ? "multiple" : "single";
  const [language, setLanguage] = useState("mr");
  const [reportType, setReportType] = useState("innovation");
  const [inputText, setInputText] = useState("");
  const [reports, setReports] = useState([
    makeReport("mr"),
    makeReport("hi")
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({
    percent: 0, stage: "starting",
    detail: "Generation सुरू होण्याची वाट पाहत आहे..."
  });

  const updateReport = (id, field, value) => {
    setReports((current) => current.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    const jobs = mode === "single"
      ? [{ language, reportType, inputText }]
      : reports.map(({ language: reportLanguage, reportType: reportKind, inputText: reportInput }) => ({
          language: reportLanguage,
          reportType: reportKind,
          inputText: reportInput
        }));

    const emptyIndex = jobs.findIndex((job) => !job.inputText.trim());
    if (emptyIndex !== -1) {
      setError(mode === "single"
        ? "कृपया माहिती Paste करा."
        : `रिपोर्ट ${emptyIndex + 1} साठी कृपया माहिती Paste करा.`);
      return;
    }

    setLoading(true);
    setError("");
    setProgress({ percent: 2, stage: "starting", detail: "माहिती तपासून अहवालाची तयारी सुरू आहे..." });

    try {
      const result = await generateReport(
        mode === "single"
          ? jobs[0]
          : { reports: jobs },
        (nextProgress) => setProgress((current) => ({
          ...current,
          ...nextProgress,
          percent: Math.max(current.percent, Math.min(100, Number(nextProgress.percent) || 0))
        }))
      );

      const reportResults = mode === "single"
        ? [{
            ...result,
            language,
            reportType,
            languageLabel: languageOptions.find((item) => item.value === language)?.label
          }]
        : result.reports;

      navigate("/edit-report", {
        state: {
          reports: reportResults.map((item, index) => ({
            ...item,
            language: item.language || jobs[index].language,
            languageLabel: item.languageLabel || languageOptions.find((lang) => lang.value === (item.language || jobs[index].language))?.label
          }))
        }
      });
    } catch (err) {
      setError(err.message || "रिपोर्ट तयार करता आला नाही.");
    } finally {
      setLoading(false);
    }
  };

  const percent = Math.round(progress.percent || 0);
  const isMultiple = mode === "multiple";

  return (
    <>
      <div className="mx-auto w-full max-w-5xl space-y-6 sm:space-y-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <button type="button" onClick={() => navigate("/")} className="mb-3 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-900">
              <ArrowLeft size={16} /> Dashboard
            </button>
            <h2 className="text-2xl font-bold text-slate-900">
              {isMultiple ? "Dual / Multiple Reports तयार करा" : "नवीन अहवाल तयार करा"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isMultiple
                ? "प्रत्येक रिपोर्टसाठी स्वतंत्र भाषा आणि माहिती निवडा. सर्व रिपोर्ट एकाच वेळी तयार होतील."
                : "माहिती Paste करा आणि AI च्या मदतीने सविस्तर अहवाल तयार करा."}
            </p>
          </div>
          <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">
            {isMultiple ? `${reports.length} Reports` : "Single Report"}
          </span>
        </div>

        <form onSubmit={handleGenerate} className="space-y-5 sm:space-y-6">
          {!isMultiple ? (
            <>
              <section className="grid gap-5 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-6">
                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FileText size={18} className="text-blue-900" /> अहवालाचा प्रकार
                  </label>
                  <select value={reportType} onChange={(e) => setReportType(e.target.value)} disabled={loading}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100">
                    {reportTypes.filter((t) => t.value !== "other").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Languages size={18} className="text-blue-900" /> रिपोर्टची भाषा
                  </label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={loading}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100">
                    {languageOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-3 text-blue-900"><FileText size={21} /></div>
                  <div><h3 className="font-bold text-slate-800">आवश्यक माहिती</h3><p className="mt-1 text-sm text-slate-500">तुम्हाला मिळालेला संपूर्ण मजकूर येथे Paste करा.</p></div>
                </div>
                <textarea value={inputText} onChange={(e) => { setInputText(e.target.value); setError(""); }}
                  placeholder="येथे तुमची संपूर्ण माहिती Paste करा..." rows={14} required disabled={loading}
                  className="w-full min-w-0 resize-y rounded-lg border border-slate-200 bg-slate-50/50 p-4 sm:p-5 text-sm leading-8 text-slate-700 outline-none focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100" />
                <div className="mt-3 flex justify-between text-xs text-slate-400">
                  <span>{inputText.length} अक्षरे</span>
                  <button type="button" onClick={() => setInputText("")} className="font-medium hover:text-red-600" disabled={loading}>Clear</button>
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <div>
                  <p className="text-sm font-semibold text-blue-950">प्रत्येक रिपोर्टसाठी स्वतंत्र सेटिंग</p>
                  <p className="mt-1 text-xs leading-5 text-blue-900/70">एकाच भाषेतील अनेक रिपोर्ट किंवा वेगवेगळ्या भाषांतील रिपोर्ट तयार करू शकता.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={loading}
                    onClick={() => setReports((current) => current.map((item, index) => index === 0 ? item : { ...item, inputText: current[0].inputText }))}
                    className="rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-xs font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50">
                    पहिल्या Input सर्वांना कॉपी करा
                  </button>
                  <button type="button" disabled={loading || reports.length >= 4}
                    onClick={() => setReports((current) => [...current, makeReport("en")])}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50">
                    <Plus size={17} /> Add Report
                  </button>
                </div>
              </div>

              <div className="grid min-w-0 gap-4">
                {reports.map((report, index) => (
                  <section key={report.id} className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-900">{index + 1}</div>
                        <div><h3 className="font-bold text-slate-800">Report {index + 1}</h3><p className="text-xs text-slate-500">भाषा आणि Input निवडा</p></div>
                      </div>
                      {reports.length > 2 && (
                        <button type="button" onClick={() => setReports((current) => current.filter((item) => item.id !== report.id))}
                          disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                          <Trash2 size={15} /> Remove
                        </button>
                      )}
                    </div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <FileText size={17} className="text-blue-900" /> अहवालाचा प्रकार
                    </label>
                    <select value={report.reportType} onChange={(e) => updateReport(report.id, "reportType", e.target.value)} disabled={loading}
                      className="mb-5 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 sm:max-w-sm">
                      {reportTypes.filter((t) => t.value !== "other").map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Languages size={17} className="text-blue-900" /> रिपोर्टची भाषा
                    </label>
                    <select value={report.language} onChange={(e) => updateReport(report.id, "language", e.target.value)} disabled={loading}
                      className="mb-5 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 sm:max-w-sm">
                      {languageOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">आवश्यक माहिती / Input <span className="text-red-500">*</span></label>
                    <textarea value={report.inputText} onChange={(e) => { updateReport(report.id, "inputText", e.target.value); setError(""); }}
                      placeholder={`Report ${index + 1} साठी संपूर्ण माहिती येथे Paste करा...`} rows={12} required disabled={loading}
                      className="w-full min-w-0 resize-y rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm leading-8 text-slate-700 outline-none focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100" />
                    <div className="mt-2 text-right text-xs text-slate-400">{report.inputText.length} अक्षरे</div>
                  </section>
                ))}
              </div>
            </>
          )}

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end">
            <button type="submit" disabled={loading || (isMultiple ? reports.some((item) => !item.inputText.trim()) : !inputText.trim())}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-950 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
              <Sparkles size={19} /> {isMultiple ? `${reports.length} Reports Generate करा` : "रिपोर्ट तयार करा"}
            </button>
          </div>
        </form>
      </div>

      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-md" role="status" aria-live="polite" aria-label="रिपोर्ट तयार होत आहे">
          <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-5 shadow-2xl sm:p-7">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-800">
              {percent >= 100 ? <CheckCircle2 size={30} /> : <LoaderCircle size={30} className="animate-spin" />}
            </div>
            <h3 className="text-center text-xl font-bold text-slate-900">{percent >= 100 ? "रिपोर्ट पूर्ण झाले!" : "तुमचे रिपोर्ट तयार होत आहेत..."}</h3>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">कृपया ही विंडो बंद करू नका. रिपोर्टचे सर्व विभाग तयार केले जात आहेत.</p>
            <div className="mt-7 flex items-end justify-between"><span className="text-sm font-semibold text-slate-700">Generation Progress</span><span className="text-3xl font-bold tabular-nums text-blue-800">{percent}%</span></div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-sky-400 transition-all duration-700 ease-out" style={{ width: `${percent}%` }} /></div>
            <p className="mt-4 text-center text-sm font-semibold text-slate-800">{stageLabels[progress.stage] || "रिपोर्ट तयार होत आहे"}</p>
            <p className="mt-1 min-h-10 text-center text-xs leading-5 text-slate-500">{progress.detail || "AI कडून प्रतिसाद मिळत आहे..."}</p>
            <div className="mt-5 flex items-center justify-center gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400"><ShieldCheck size={15} /> तुमची दिलेली मूळ माहिती जशीच्या तशी वापरली जात आहे.</div>
          </div>
        </div>
      )}
    </>
  );
}

export default NewReport;
