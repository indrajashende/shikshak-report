
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Pencil,
  RotateCcw,
  Sparkles,
  LoaderCircle,
  CircleAlert,
  ClipboardCheck
} from "lucide-react";

import { reportTypes } from "./ReportTypeSelector";

function InputPreview({
  formData,
  onEdit,
  onReset,
  onAnalyze,
  isAnalyzing,
  analysis,
  analysisError
}) {
  const reportType = reportTypes.find(
    (item) => item.value === formData.reportType
  );

  const languageNames = {
    mr: "मराठी",
    en: "English",
    hi: "हिंदी"
  };

  const templateNames = {
    diecpd_kolhapur: "DIECPD कोल्हापूर – कृती संशोधन नमुना"
  };

  const readinessLabels = {
    ready: "प्राथमिकदृष्ट्या तयार",
    needs_information: "अधिक माहिती आवश्यक",
    review_required: "पडताळणी आवश्यक"
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* Preview Status */}
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={23} className="text-green-700" />

          <div>
            <h3 className="font-semibold text-green-900">
              माहिती Preview साठी तयार आहे.
            </h3>

            <p className="mt-1 text-sm text-green-800">
              माहिती तपासा आणि AI कडून Analysis करून घ्या.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Options */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">

        <h3 className="mb-5 font-bold text-slate-800">
          निवडलेले पर्याय
        </h3>

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
              अहवालाचा प्रकार
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-800">
              {reportType?.label}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
              रिपोर्टची भाषा
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-800">
              {languageNames[formData.language]}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
              Template
            </p>

            <p className="mt-2 text-sm font-semibold text-slate-800">
              {templateNames[formData.template] || formData.template}
            </p>
          </div>

        </div>
      </section>

      {/* Original Input */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">

        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-blue-900" />
            <h3 className="font-bold text-slate-800">
              तुमची मूळ माहिती
            </h3>
          </div>

          <span className="text-xs text-slate-400">
            Input Preview
          </span>
        </div>

        <div className="max-h-[450px] overflow-y-auto p-5 md:p-7">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-8 text-slate-700">
            {formData.inputText}
          </pre>
        </div>

      </section>

      {/* AI Analysis Button */}
      <section className="rounded-xl border border-blue-100 bg-white p-5 md:p-6">

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

          <div className="flex items-start gap-3">

            <div className="rounded-xl bg-blue-50 p-3 text-blue-900">
              <Sparkles size={23} />
            </div>

            <div>
              <h3 className="font-bold text-slate-800">
                AI माहिती विश्लेषण
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                माहितीतील चुका, विसंगती आणि आवश्यक असलेली
                अतिरिक्त माहिती तपासा.
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isAnalyzing ? (
              <>
                <LoaderCircle size={18} className="animate-spin" />
                Analysis सुरू आहे...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                {analysis ? "पुन्हा तपासणी करा" : "AI कडून तपासणी करा"}
              </>
            )}
          </button>

        </div>

        {analysisError && (
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
            <CircleAlert size={18} className="mt-0.5 shrink-0 text-red-600" />

            <p className="text-sm leading-6 text-red-700">
              {analysisError}
            </p>
          </div>
        )}

      </section>

      {/* AI Results */}
      {analysis && (
        <section className="space-y-5">

          {/* Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">

            <div className="flex flex-wrap items-center justify-between gap-3">

              <div className="flex items-center gap-2">
                <ClipboardCheck className="text-blue-900" size={21} />

                <h3 className="font-bold text-slate-800">
                  AI Analysis Report
                </h3>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900">
                {readinessLabels[analysis.generationReadiness] ||
                  "पडताळणी आवश्यक"}
              </span>

            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600">
              {analysis.overview}
            </p>

          </div>

          {/* Extracted Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">

            <h3 className="mb-5 font-bold text-slate-800">
              १. उपलब्ध माहिती
            </h3>

            <div className="space-y-3">

              {analysis.extractedInformation?.length > 0 ? (
                analysis.extractedInformation.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg bg-slate-50 p-4 md:grid-cols-2"
                  >
                    <div>
                      <p className="text-xs text-slate-500">
                        {item.field}
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {item.value}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        मूळ माहितीतील आधार
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {item.evidence}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  उपलब्ध माहिती आढळली नाही.
                </p>
              )}

            </div>

          </div>

          {/* Inconsistencies */}
          <div className="rounded-xl border border-amber-200 bg-white p-5 md:p-7">

            <div className="mb-5 flex items-center gap-2">
              <AlertTriangle className="text-amber-600" size={21} />

              <h3 className="font-bold text-slate-800">
                २. विसंगती आणि चुका
              </h3>

            </div>

            {analysis.inconsistencies?.length > 0 ? (

              <div className="space-y-4">

                {analysis.inconsistencies.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-amber-100 bg-amber-50/50 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {item.title}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.details}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      आधार: {item.evidence}
                    </p>

                    <div className="mt-3 rounded-lg bg-white p-3">
                      <p className="text-xs font-semibold text-blue-900">
                        विचारलेला प्रश्न
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {item.question}
                      </p>
                    </div>
                  </div>
                ))}

              </div>

            ) : (
              <p className="text-sm text-slate-500">
                कोणतीही स्पष्ट विसंगती आढळली नाही.
              </p>
            )}

          </div>

          {/* Missing Information */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">

            <h3 className="mb-5 font-bold text-slate-800">
              ३. आवश्यक अतिरिक्त माहिती
            </h3>

            {analysis.missingInformation?.length > 0 ? (

              <div className="space-y-3">

                {analysis.missingInformation.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-lg bg-slate-50 p-4"
                  >

                    <div className="mt-1 shrink-0">
                      <CircleAlert
                        size={18}
                        className={
                          item.priority?.toLowerCase() === "required"
                            ? "text-red-500"
                            : "text-amber-500"
                        }
                      />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">

                        <p className="text-sm font-semibold text-slate-800">
                          {item.field}
                        </p>

                        <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] text-slate-600">
                          {item.priority}
                        </span>

                      </div>

                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        {item.reason}
                      </p>
                    </div>

                  </div>
                ))}

              </div>

            ) : (
              <p className="text-sm text-slate-500">
                कोणतीही अतिरिक्त माहिती आवश्यक असल्याचे आढळले नाही.
              </p>
            )}

          </div>

          {/* Questions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">

            <h3 className="mb-4 font-bold text-slate-800">
              ४. शिक्षकांकडून विचारायचे प्रश्न
            </h3>

            <ol className="space-y-3">

              {analysis.followUpQuestions?.map((question, index) => (
                <li
                  key={index}
                  className="flex gap-3 text-sm leading-6 text-slate-600"
                >
                  <span className="font-semibold text-blue-900">
                    {index + 1}.
                  </span>

                  {question}
                </li>
              ))}

            </ol>

            {analysis.followUpQuestions?.length === 0 && (
              <p className="text-sm text-slate-500">
                अतिरिक्त प्रश्न नाहीत.
              </p>
            )}

          </div>

        </section>
      )}

      {/* Bottom Actions */}
      <div className="flex flex-wrap justify-between gap-3">

        <button
          type="button"
          onClick={onReset}
          disabled={isAnalyzing}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <RotateCcw size={17} />
          नवीन माहिती भरा
        </button>

        <button
          type="button"
          onClick={onEdit}
          disabled={isAnalyzing}
          className="flex items-center gap-2 rounded-lg bg-blue-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
        >
          <Pencil size={17} />
          माहिती संपादित करा
          <ArrowLeft size={16} className="rotate-180" />
        </button>

      </div>

    </div>
  );
}

export default InputPreview;
