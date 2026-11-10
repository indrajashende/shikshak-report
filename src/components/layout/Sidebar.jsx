
import { useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";

import {
  BookOpenCheck,
  LayoutDashboard,
  FilePlus2,
  FileText,
  Files,
  GraduationCap,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

function Sidebar() {
  const location = useLocation();

  const isReportPage = location.pathname === "/new-report";

  const selectedMode =
    new URLSearchParams(location.search).get("mode") || "single";

  const [reportMenuOpen, setReportMenuOpen] = useState(isReportPage);

  const menuClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
      isActive
        ? "bg-blue-50 text-blue-900"
        : "text-slate-600 hover:bg-slate-50"
    }`;

  const subMenuClass = (mode) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
      isReportPage && selectedMode === mode
        ? "bg-blue-50 text-blue-900 font-semibold"
        : "text-slate-600 hover:bg-slate-50"
    }`;

  return (
    <aside className="flex h-auto w-full flex-col border-b border-slate-200 bg-white md:h-screen md:w-[260px] md:shrink-0 md:border-b-0">

      {/* LOGO */}
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white">
          <BookOpenCheck size={22} />
        </div>

        <div>
          <h1 className="text-base font-bold text-slate-900">
            Shikshak Studio
          </h1>
          <p className="text-[11px] text-slate-500">
            AI Report Generator
          </p>
        </div>
      </div>

      {/* MAIN MENU */}
      <div className="px-4 py-7">
        <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Main Menu
        </p>

        <nav className="space-y-1">

          {/* DASHBOARD */}
          <NavLink to="/" end className={menuClass}>
            <LayoutDashboard size={19} />
            <span>Dashboard</span>
          </NavLink>

          {/* NEW REPORT PARENT MENU */}
          <button
            type="button"
            onClick={() => setReportMenuOpen((previous) => !previous)}
            aria-expanded={reportMenuOpen}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
              isReportPage || reportMenuOpen
                ? "bg-blue-50 text-blue-900"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FilePlus2 size={19} />
            <span>नवीन अहवाल</span>

            {reportMenuOpen ? (
              <ChevronDown size={16} className="ml-auto" />
            ) : (
              <ChevronRight size={16} className="ml-auto" />
            )}
          </button>

          {/* SUB MENU */}
          {reportMenuOpen && (
            <div className="ml-4 space-y-1 border-l border-slate-200 pl-3">

              {/* SINGLE REPORT */}
              <Link
                to="/new-report?mode=single"
                className={subMenuClass("single")}
              >
                <FileText size={17} />
                <span>Single Report</span>
              </Link>

              {/* DUAL REPORT */}
              <Link
                to="/new-report?mode=multiple"
                className={subMenuClass("multiple")}
              >
                <Files size={17} />
                <span>Dual Report</span>
              </Link>

            </div>
          )}

        </nav>
      </div>

      {/* FOOTER */}
      <div className="mt-auto hidden border-t border-slate-100 p-4 md:block">
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <GraduationCap size={19} className="text-blue-900" />
            <span className="text-sm font-semibold text-slate-800">
              शिक्षक सहाय्यक
            </span>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            अहवाल निर्मिती प्रक्रिया अधिक सोपी आणि जलद करण्यासाठी.
          </p>
        </div>
      </div>

    </aside>
  );
}

export default Sidebar;
