import React from "react";
import { Router, Routes, Route } from "react-router-dom";
import { DataProvider } from "./DataContext";
import AccountingApp from "./AccountingApp";
import Analysis from "./Analysis";

function App() {
  return (
    <DataProvider>
        <Routes>
          <Route path="/" element={<AccountingApp />} />
          <Route path="/analysis" element={<Analysis />} />
        </Routes>
    </DataProvider>
  );
}

export default App;
