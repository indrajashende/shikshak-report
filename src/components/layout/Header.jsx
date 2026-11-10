
import { Bell, UserRound } from "lucide-react";

function Header() {
  return (
    <header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 md:px-8">
      
      <div>
        <p className="text-sm font-semibold text-slate-800">
          शिक्षक अहवाल निर्मिती प्रणाली
        </p>
        <p className="mt-1 text-xs text-slate-500">
          AI Powered Report Management
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell size={19} />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-900">
          <UserRound size={19} />
        </div>
      </div>

    </header>
  );
}

export default Header;
