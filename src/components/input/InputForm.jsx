
import {
  ClipboardList,
  FileText,
  Sparkles,
  RotateCcw,
} from "lucide-react";

import LanguageSelector from "./LanguageSelector";
import ReportTypeSelector from "./ReportTypeSelector";

const templates = [
  {
    value: "diecpd_kolhapur",
    label: "DIECPD कोल्हापूर – कृती संशोधन नमुना",
  },
];

function InputForm({
  formData,
  onChange,
  onSubmit,
}) {
  const handleChange = (field, value) => {
    onChange({
      ...formData,
      [field]: value,
    });
  };

  const wordCount = formData.inputText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <form onSubmit={onSubmit} className="space-y-6">

      {/* Selection Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">

        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-900">
            <ClipboardList size={22} />
          </div>

          <div>
            <h3 className="font-bold text-slate-800">
              अहवालाची प्राथमिक माहिती
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              अहवालाचा प्रकार, नमुना आणि भाषा निवडा.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">

          <ReportTypeSelector
            value={formData.reportType}
            onChange={(value) =>
              handleChange("reportType", value)
            }
          />

          <LanguageSelector
            value={formData.language}
            onChange={(value) =>
              handleChange("language", value)
            }
          />

          <div className="md:col-span-2">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FileText size={17} className="text-blue-900" />
              रिपोर्टचा नमुना (Template)
              <span className="text-red-500">*</span>
            </label>

            <select
              value={formData.template}
              onChange={(e) =>
                handleChange("template", e.target.value)
              }
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
            >
              {templates.map((template) => (
                <option
                  key={template.value}
                  value={template.value}
                >
                  {template.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-slate-400">
              निवडलेल्या नमुन्यानुसार अहवालाची रचना तयार केली जाईल.
            </p>
          </div>

        </div>
      </section>

      {/* Main Input Section */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 md:p-7">

        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">

            <div className="rounded-lg bg-blue-50 p-3 text-blue-900">
              <FileText size={22} />
            </div>

            <div>
              <h3 className="font-bold text-slate-800">
                कामाची संपूर्ण माहिती
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                तुम्हाला मिळालेली माहिती येथे Paste करा.
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            माहिती / Input
            <span className="ml-1 text-red-500">*</span>
          </label>

          <textarea
            value={formData.inputText}
            onChange={(e) =>
              handleChange("inputText", e.target.value)
            }
            required
            rows={13}
            placeholder={`उदाहरणार्थ:

शिक्षकाचे पूर्ण नाव:
शैक्षणिक पात्रता:
शाळेचे नाव:
तालुका:
जिल्हा:

प्रशिक्षणाचा प्रकार:
प्रशिक्षण कालावधी:
प्रशिक्षण केंद्र:

संशोधनाचा विषय:
इयत्ता:
अध्यापन विषय:

विद्यार्थ्यांची संख्या:
राबवलेले उपक्रम:
पूर्वचाचणी व उत्तरचाचणी:
इतर आवश्यक माहिती:

येथे मिळालेला संपूर्ण Input Paste करा...`}
            className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              {wordCount} शब्द | {formData.inputText.length} अक्षरे
            </p>

            <button
              type="button"
              onClick={() =>
                handleChange("inputText", "")
              }
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600"
            >
              <RotateCcw size={14} />
              मजकूर काढून टाका
            </button>
          </div>
        </div>

      </section>

      {/* Information Note */}
      <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
        <Sparkles size={19} className="mt-0.5 shrink-0 text-blue-800" />

        <div>
          <p className="text-sm font-semibold text-blue-950">
            महत्त्वाची सूचना
          </p>

          <p className="mt-1 text-xs leading-6 text-blue-900/70">
            दिलेल्या माहितीच्या आधारेच अहवाल तयार करण्याची प्रक्रिया
            विकसित केली जाईल. उपलब्ध नसलेली माहिती स्वतःहून तयार
            केली जाणार नाही.
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!formData.inputText.trim()}
          className="flex items-center gap-3 rounded-lg bg-blue-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          माहिती Preview करा
          <Sparkles size={17} />
        </button>
      </div>

    </form>
  );
}

export default InputForm;
