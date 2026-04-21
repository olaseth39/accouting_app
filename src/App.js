import React from "react";
import { Router, Routes, Route } from "react-router-dom";
import { DataProvider } from "./DataContext";
import AccountingApp from "./AccountingApp";
import AnalysisPage from "./Analysis";

function App() {
  return (
    <DataProvider>
        <Routes>
          <Route path="/" element={<AccountingApp />} />
          <Route path="/analysis" element={<AnalysisPage />} />
        </Routes>
    </DataProvider>
  );
}

export default App;
