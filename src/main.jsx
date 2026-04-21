import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { AnimatePresence } from "framer-motion";
import BootLoader from "./components/BootLoader.jsx";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AuthProvider } from "./context/AuthContext.jsx";

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

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootComponent />
  </React.StrictMode>,
);
