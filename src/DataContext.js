import React, { createContext, useState } from "react";

export const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [invoiceFile, setInvoicesData] = useState([]);
  const [bankKPIs, setBankKPIs] = useState({});
  const [threadId, setThreadId] = useState({});  
  //const [invoicesData, setInvoicesData] = useState([]);


  return (
    <DataContext.Provider value={{ invoiceFile, setInvoicesData, bankKPIs, setBankKPIs, threadId, setThreadId }}>
      {children}
    </DataContext.Provider>
  );
};
