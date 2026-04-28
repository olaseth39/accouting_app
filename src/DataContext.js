import React, { createContext, useState } from "react";

export const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [invoiceFile, setInvoicesData] = useState([]);
  const [bankKPIs, setBankKPIs] = useState({});
  //const [threadId, setThreadId] = useState({});  
  //const [threadId, setThreadIdState] = useState(null);
  const [threadId, setThreadIdState] = useState(() => {
    return localStorage.getItem("threadId") || null;
  });
  const [companyName, setCompanyNameState] = useState(() => {
    return localStorage.getItem("companyName") || null;
  });
  //const [invoicesData, setInvoicesData] = useState([]);

  const setThreadId = (id, company) => {
    setThreadIdState(id);
    setCompanyNameState(company);
    if (id) {
      console.log("Setting threadId in context and localStorage:", id);
      localStorage.setItem("threadId", id); // persist to localStorage
      localStorage.setItem("companyName", company);
      // if (company) {
      //   localStorage.setItem("companyName", company);
      // }
    }else{
      localStorage.removeItem("threadId"); // remove from localStorage
      localStorage.removeItem("companyName"); // remove from localStorage
    }
  };


  return (
    <DataContext.Provider value={{ invoiceFile, setCompanyNameState, companyName, setInvoicesData, bankKPIs, setBankKPIs, threadId, setThreadId }}>
      {children}
    </DataContext.Provider>
  );
};
