import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Khong tim thay root element.");
}

const root = createRoot(rootElement);

function renderError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : "Khong khoi tao duoc frontend.";
  const detail = cause instanceof Error ? cause.stack : undefined;

  root.render(
    <React.StrictMode>
      <div className="min-h-screen bg-[linear-gradient(180deg,#fff8f6_0%,#fff1ee_100%)] px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-rose-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-500">Frontend boot error</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">App React khong khoi tao duoc</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
          {detail ? (
            <pre className="mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {detail}
            </pre>
          ) : null}
        </div>
      </div>
    </React.StrictMode>,
  );
}

void import("./App")
  .then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  })
  .catch((cause) => {
    console.error("Frontend bootstrap failed.", cause);
    renderError(cause);
  });
