
import { FileStack } from "lucide-react";

const reportTypes = [
  { value: "action_research", label: "कृती संशोधन अहवाल" },
  { value: "innovation", label: "नवोपक्रम अहवाल" },
  { value: "project", label: "प्रकल्प अहवाल" },
  { value: "other", label: "इतर अहवाल" },
];

function ReportTypeSelector({ value, onChange }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <FileStack size={17} className="text-blue-900" />
        अहवालाचा प्रकार
        <span className="text-red-500">*</span>
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
      >
        {reportTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      <p className="mt-2 text-xs text-slate-400">
        तुम्ही तयार करणार असलेला अहवाल निवडा.
      </p>
    </div>
  );
}

export { reportTypes };
export default ReportTypeSelector;
