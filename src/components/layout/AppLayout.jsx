
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      
      <Sidebar />

      <div className="min-w-0 flex-1">
        <Header />

        <main className="min-w-0 px-3 py-4 sm:p-5 md:p-8">
          <Outlet />
        </main>
      </div>

    </div>
  );
}

export default AppLayout;
