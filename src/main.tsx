import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import "./i18n"; // Import i18n configuration
import { Suspense } from "react";
import { Toaster } from "sonner";

createRoot(document.getElementById("root")!).render(
    <Suspense fallback={<div>Chargement...</div>}>
        <App />
        <Toaster theme="dark" richColors closeButton />
    </Suspense>
);