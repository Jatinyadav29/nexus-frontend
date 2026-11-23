import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AnimatePresence } from "framer-motion";
import BootLoader from "./components/BootLoader";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

const RootComponent = () => {
  const [isBooting, setIsBooting] = useState(() => {
    const hasBooted = sessionStorage.getItem("nexus_booted");
    return !hasBooted;
  });

  const handleBootComplete = () => {
    setIsBooting(false);
    sessionStorage.setItem("nexus_booted", "true");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AnimatePresence mode="wait">
        {isBooting && <BootLoader onComplete={handleBootComplete} />}
      </AnimatePresence>

      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  );
};

// index.html always has #root; fail loudly if it is ever missing.
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element in index.html");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);
