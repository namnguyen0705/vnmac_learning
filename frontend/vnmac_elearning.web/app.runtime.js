import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/App.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/.vite/deps/react_jsx-dev-runtime.js?v=1dc3942d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
let prevRefreshReg;
let prevRefreshSig;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("C:/Users/Admin/OneDrive/TaIÄi liAaIÅíu/New project/frontend/vnmac_elearning.web/src/App.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
import { AppProviders } from "/src/app/providers.tsx";
import { AppRouter } from "/src/app/router.tsx";
export default function App() {
  return /* @__PURE__ */ jsxDEV(AppProviders, { children: /* @__PURE__ */ jsxDEV(AppRouter, {}, void 0, false, {
    fileName: "C:/Users/Admin/OneDrive/TaIÄi liAaIÅíu/New project/frontend/vnmac_elearning.web/src/App.tsx",
    lineNumber: 26,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "C:/Users/Admin/OneDrive/TaIÄi liAaIÅíu/New project/frontend/vnmac_elearning.web/src/App.tsx",
    lineNumber: 25,
    columnNumber: 5
  }, this);
}
_c = App;
var _c;
$RefreshReg$(_c, "App");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/Admin/OneDrive/TaIÄi liAaIÅíu/New project/frontend/vnmac_elearning.web/src/App.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/Admin/OneDrive/TaIÄi liAaIÅíu/New project/frontend/vnmac_elearning.web/src/App.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBTU07Ozs7Ozs7Ozs7Ozs7Ozs7QUFOTixTQUFTQSxvQkFBb0I7QUFDN0IsU0FBU0MsaUJBQWlCO0FBRTFCLHdCQUF3QkMsTUFBTTtBQUM1QixTQUNFLHVCQUFDLGdCQUNDLGlDQUFDLGVBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUFVLEtBRFo7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUVBO0FBRUo7QUFBQ0MsS0FOdUJEO0FBQUcsSUFBQUM7QUFBQSxhQUFBQSxJQUFBIiwibmFtZXMiOlsiQXBwUHJvdmlkZXJzIiwiQXBwUm91dGVyIiwiQXBwIiwiX2MiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQXBwLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBQcm92aWRlcnMgfSBmcm9tIFwiLi9hcHAvcHJvdmlkZXJzXCI7XG5pbXBvcnQgeyBBcHBSb3V0ZXIgfSBmcm9tIFwiLi9hcHAvcm91dGVyXCI7XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIEFwcCgpIHtcbiAgcmV0dXJuIChcbiAgICA8QXBwUHJvdmlkZXJzPlxuICAgICAgPEFwcFJvdXRlciAvPlxuICAgIDwvQXBwUHJvdmlkZXJzPlxuICApO1xufVxuIl0sImZpbGUiOiJDOi9Vc2Vycy9BZG1pbi9PbmVEcml2ZS9UYcyAaSBsacOqzKN1L05ldyBwcm9qZWN0L2Zyb250ZW5kL3ZubWFjX2VsZWFybmluZy53ZWIvc3JjL0FwcC50c3gifQ==
