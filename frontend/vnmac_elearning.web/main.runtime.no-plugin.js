import __vite__cjsImport0_react_jsxRuntime from "/.vite/deps/react_jsx-runtime.js?v=a1cb9179"; const jsx = __vite__cjsImport0_react_jsxRuntime["jsx"]; const jsxs = __vite__cjsImport0_react_jsxRuntime["jsxs"];
import __vite__cjsImport1_react from "/.vite/deps/react.js?v=a1cb9179"; const React = __vite__cjsImport1_react.__esModule ? __vite__cjsImport1_react.default : __vite__cjsImport1_react;
import ReactDOM from "/node_modules/react-dom/client.js?v=a1cb9179";
import "/src/index.css";
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Khong tim thay root element.");
}
const root = ReactDOM.createRoot(rootElement);
function renderError(cause) {
  const message = cause instanceof Error ? cause.message : "Khong khoi tao duoc frontend.";
  const detail = cause instanceof Error ? cause.stack : void 0;
  root.render(
    /* @__PURE__ */ jsx(React.StrictMode, { children: /* @__PURE__ */ jsx("div", { className: "min-h-screen bg-[linear-gradient(180deg,#fff8f6_0%,#fff1ee_100%)] px-6 py-10", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl rounded-[32px] border border-rose-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold uppercase tracking-[0.16em] text-rose-500", children: "Frontend boot error" }),
      /* @__PURE__ */ jsx("h1", { className: "mt-3 text-2xl font-semibold text-slate-950", children: "App React khong khoi tao duoc" }),
      /* @__PURE__ */ jsx("p", { className: "mt-3 text-sm leading-6 text-slate-600", children: message }),
      detail ? /* @__PURE__ */ jsx("pre", { className: "mt-4 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-100", children: detail }) : null
    ] }) }) })
  );
}
void import("/src/App.tsx").then(({ default: App }) => {
  root.render(
    /* @__PURE__ */ jsx(React.StrictMode, { children: /* @__PURE__ */ jsx(App, {}) })
  );
}).catch((cause) => {
  console.error("Frontend bootstrap failed.", cause);
  renderError(cause);
});

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4udHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCBSZWFjdERPTSBmcm9tIFwicmVhY3QtZG9tL2NsaWVudFwiO1xuaW1wb3J0IFwiLi9pbmRleC5jc3NcIjtcblxuY29uc3Qgcm9vdEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInJvb3RcIik7XG5cbmlmICghcm9vdEVsZW1lbnQpIHtcbiAgdGhyb3cgbmV3IEVycm9yKFwiS2hvbmcgdGltIHRoYXkgcm9vdCBlbGVtZW50LlwiKTtcbn1cblxuY29uc3Qgcm9vdCA9IFJlYWN0RE9NLmNyZWF0ZVJvb3Qocm9vdEVsZW1lbnQpO1xuXG5mdW5jdGlvbiByZW5kZXJFcnJvcihjYXVzZTogdW5rbm93bikge1xuICBjb25zdCBtZXNzYWdlID0gY2F1c2UgaW5zdGFuY2VvZiBFcnJvciA/IGNhdXNlLm1lc3NhZ2UgOiBcIktob25nIGtob2kgdGFvIGR1b2MgZnJvbnRlbmQuXCI7XG4gIGNvbnN0IGRldGFpbCA9IGNhdXNlIGluc3RhbmNlb2YgRXJyb3IgPyBjYXVzZS5zdGFjayA6IHVuZGVmaW5lZDtcblxuICByb290LnJlbmRlcihcbiAgICA8UmVhY3QuU3RyaWN0TW9kZT5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWluLWgtc2NyZWVuIGJnLVtsaW5lYXItZ3JhZGllbnQoMTgwZGVnLCNmZmY4ZjZfMCUsI2ZmZjFlZV8xMDAlKV0gcHgtNiBweS0xMFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm14LWF1dG8gbWF4LXctM3hsIHJvdW5kZWQtWzMycHhdIGJvcmRlciBib3JkZXItcm9zZS0yMDAgYmctd2hpdGUgcC02IHNoYWRvdy1bMF8yMHB4XzYwcHhfcmdiYSgxNSwyMyw0MiwwLjA4KV1cIj5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdXBwZXJjYXNlIHRyYWNraW5nLVswLjE2ZW1dIHRleHQtcm9zZS01MDBcIj5Gcm9udGVuZCBib290IGVycm9yPC9wPlxuICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJtdC0zIHRleHQtMnhsIGZvbnQtc2VtaWJvbGQgdGV4dC1zbGF0ZS05NTBcIj5BcHAgUmVhY3Qga2hvbmcga2hvaSB0YW8gZHVvYzwvaDE+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwibXQtMyB0ZXh0LXNtIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTYwMFwiPnttZXNzYWdlfTwvcD5cbiAgICAgICAgICB7ZGV0YWlsID8gKFxuICAgICAgICAgICAgPHByZSBjbGFzc05hbWU9XCJtdC00IG92ZXJmbG93LWF1dG8gcm91bmRlZC0yeGwgYmctc2xhdGUtOTUwIHAtNCB0ZXh0LXhzIGxlYWRpbmctNiB0ZXh0LXNsYXRlLTEwMFwiPlxuICAgICAgICAgICAgICB7ZGV0YWlsfVxuICAgICAgICAgICAgPC9wcmU+XG4gICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgPC9SZWFjdC5TdHJpY3RNb2RlPixcbiAgKTtcbn1cblxudm9pZCBpbXBvcnQoXCIuL0FwcFwiKVxuICAudGhlbigoeyBkZWZhdWx0OiBBcHAgfSkgPT4ge1xuICAgIHJvb3QucmVuZGVyKFxuICAgICAgPFJlYWN0LlN0cmljdE1vZGU+XG4gICAgICAgIDxBcHAgLz5cbiAgICAgIDwvUmVhY3QuU3RyaWN0TW9kZT4sXG4gICAgKTtcbiAgfSlcbiAgLmNhdGNoKChjYXVzZSkgPT4ge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJGcm9udGVuZCBib290c3RyYXAgZmFpbGVkLlwiLCBjYXVzZSk7XG4gICAgcmVuZGVyRXJyb3IoY2F1c2UpO1xuICB9KTtcbiJdLCJtYXBwaW5ncyI6IkFBbUJRLFNBQ0UsS0FERjtBQW5CUixPQUFPLFdBQVc7QUFDbEIsT0FBTyxjQUFjO0FBQ3JCLE9BQU87QUFFUCxNQUFNLGNBQWMsU0FBUyxlQUFlLE1BQU07QUFFbEQsSUFBSSxDQUFDLGFBQWE7QUFDaEIsUUFBTSxJQUFJLE1BQU0sOEJBQThCO0FBQ2hEO0FBRUEsTUFBTSxPQUFPLFNBQVMsV0FBVyxXQUFXO0FBRTVDLFNBQVMsWUFBWSxPQUFnQjtBQUNuQyxRQUFNLFVBQVUsaUJBQWlCLFFBQVEsTUFBTSxVQUFVO0FBQ3pELFFBQU0sU0FBUyxpQkFBaUIsUUFBUSxNQUFNLFFBQVE7QUFFdEQsT0FBSztBQUFBLElBQ0gsb0JBQUMsTUFBTSxZQUFOLEVBQ0MsOEJBQUMsU0FBSSxXQUFVLGdGQUNiLCtCQUFDLFNBQUksV0FBVSxpSEFDYjtBQUFBLDBCQUFDLE9BQUUsV0FBVSxtRUFBa0UsaUNBQW1CO0FBQUEsTUFDbEcsb0JBQUMsUUFBRyxXQUFVLDhDQUE2QywyQ0FBNkI7QUFBQSxNQUN4RixvQkFBQyxPQUFFLFdBQVUseUNBQXlDLG1CQUFRO0FBQUEsTUFDN0QsU0FDQyxvQkFBQyxTQUFJLFdBQVUsb0ZBQ1osa0JBQ0gsSUFDRTtBQUFBLE9BQ04sR0FDRixHQUNGO0FBQUEsRUFDRjtBQUNGO0FBRUEsS0FBSyxPQUFPLE9BQU8sRUFDaEIsS0FBSyxDQUFDLEVBQUUsU0FBUyxJQUFJLE1BQU07QUFDMUIsT0FBSztBQUFBLElBQ0gsb0JBQUMsTUFBTSxZQUFOLEVBQ0MsOEJBQUMsT0FBSSxHQUNQO0FBQUEsRUFDRjtBQUNGLENBQUMsRUFDQSxNQUFNLENBQUMsVUFBVTtBQUNoQixVQUFRLE1BQU0sOEJBQThCLEtBQUs7QUFDakQsY0FBWSxLQUFLO0FBQ25CLENBQUM7IiwibmFtZXMiOltdfQ==
