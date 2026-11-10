
import { Languages } from "lucide-react";

const languages = [
  { value: "mr", label: "मराठी" },
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
];

function LanguageSelector({ value, onChange }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Languages size={17} className="text-blue-900" />
        रिपोर्टची भाषा
        <span className="text-red-500">*</span>
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
      >
        {languages.map((language) => (
          <option key={language.value} value={language.value}>
            {language.label}
          </option>
        ))}
      </select>

      <p className="mt-2 text-xs text-slate-400">
        संपूर्ण अहवाल निवडलेल्या भाषेमध्ये तयार केला जाईल.
      </p>
    </div>
  );
}

export default LanguageSelector;
