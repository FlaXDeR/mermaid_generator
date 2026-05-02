import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./frontend/pages/HomePage.tsx";

export default function App() {
  return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
  );
}