
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AppLayout from "./components/layout/AppLayout";
import Home from "./pages/Home";
import NewReport from "./pages/NewReport";
import EditReport from "./pages/EditReport";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/new-report" element={<NewReport />} />
          <Route path="/edit-report" element={<EditReport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
