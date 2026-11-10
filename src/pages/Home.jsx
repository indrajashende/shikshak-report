
import { useNavigate } from "react-router-dom";
import {
  FileText,
  FileCheck2,
  FileClock,
  ArrowRight,
  ClipboardList,
  Sparkles,
  Download,
} from "lucide-react";

const statistics = [
  {
    title: "एकूण अहवाल",
    value: "०",
    icon: FileText,
  },
  {
    title: "पूर्ण झालेले अहवाल",
    value: "०",
    icon: FileCheck2,
  },
  {
    title: "मसुदे",
    value: "०",
    icon: FileClock,
  },
];

function Home() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-7xl space-y-8">

      {/* Page Heading */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Dashboard
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          तुमच्या अहवाल निर्मिती प्रक्रियेचे एकाच ठिकाणी व्यवस्थापन करा.
        </p>
      </div>

      {/* Welcome Section */}
      <section className="relative overflow-hidden rounded-2xl bg-blue-950 p-7 text-white md:p-10">
        <div className="relative z-10 max-w-2xl">

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-blue-100">
            <Sparkles size={14} />
            AI Powered Report Assistant
          </div>

          <h3 className="text-2xl font-bold leading-relaxed md:text-3xl">
            तुमचा अहवाल तयार करणे आता अधिक सोपे.
          </h3>

          <p className="mt-3 max-w-xl text-sm leading-7 text-blue-100">
            आवश्यक माहिती द्या, रिपोर्टची भाषा निवडा आणि AI च्या
            मदतीने व्यवस्थित अहवाल तयार करा.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate("/new-report?mode=single")}
              className="inline-flex items-center justify-center gap-3 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-blue-950 transition hover:bg-blue-50"
            >
              Single Report
              <ArrowRight size={17} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/new-report?mode=multiple")}
              className="inline-flex items-center justify-center gap-3 rounded-lg border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Dual / Multiple Reports
              <ArrowRight size={17} />
            </button>
          </div>

        </div>

        <div className="pointer-events-none absolute -right-10 -top-20 hidden h-72 w-72 rounded-full border-[45px] border-white/5 md:block" />
        <div className="pointer-events-none absolute -bottom-28 right-32 hidden h-60 w-60 rounded-full border-[35px] border-white/5 md:block" />
      </section>

      {/* Statistics */}
    

      {/* Workflow */}
      <section>
        <h3 className="mb-4 text-base font-bold text-slate-800">
          अहवाल तयार करण्याची प्रक्रिया
        </h3>

        <div className="grid gap-4 md:grid-cols-3">

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-900">
              <ClipboardList size={22} />
            </div>
            <h4 className="font-semibold text-slate-800">
              १. माहिती द्या
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              तुम्ही केलेल्या कामाची माहिती साध्या मजकुरात द्या.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-900">
              <Sparkles size={22} />
            </div>
            <h4 className="font-semibold text-slate-800">
              २. AI रिपोर्ट तयार करेल
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              AI माहितीचे विश्लेषण करून योग्य स्वरूपात रिपोर्ट तयार करेल.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-900">
              <Download size={22} />
            </div>
            <h4 className="font-semibold text-slate-800">
              ३. Edit आणि Download
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              रिपोर्टमध्ये बदल करा आणि Word किंवा PDF मध्ये डाउनलोड करा.
            </p>
          </div>

        </div>
      </section>

    

    </div>
  );
}

export default Home;
