import { BrowserRouter, Route, Routes } from "react-router-dom";

import PageHome from "./pages/PageHome";
import PageNotFound from "./pages/PageNotFound";

import ScrollToTop from "./components/ScrollToTop";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<PageHome />} />

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
