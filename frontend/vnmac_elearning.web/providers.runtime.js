import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/app/providers.tsx");import __vite__cjsImport0_react_jsxDevRuntime from "/.vite/deps/react_jsx-dev-runtime.js?v=1dc3942d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
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
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("C:/Users/Admin/OneDrive/TaIÄi liAaIÅíu/New project/frontend/vnmac_elearning.web/src/app/providers.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}
var _s = $RefreshSig$();
import { QueryClient, QueryClientProvider } from "/.vite/deps/@tanstack_react-query.js?v=1dc3942d";
import __vite__cjsImport4_react from "/.vite/deps/react.js?v=1dc3942d"; const useState = __vite__cjsImport4_react["useState"];
import { AuthBootstrap } from "/src/app/auth.tsx";
export function AppProviders({ children }) {
  _s();
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          refetchOnWindowFocus: false,
          staleTime: 3e4
        }
      }
    })
  );
  return /* @__PURE__ */ jsxDEV(QueryClientProvider, { client: queryClient, children: [
    /* @__PURE__ */ jsxDEV(AuthBootstrap, {}, void 0, false, {
      fileName: "C:/Users/Admin/OneDrive/TaIÄi liAaIÅíu/New project/frontend/vnmac_elearning.web/src/app/providers.tsx",
      lineNumber: 39,
      columnNumber: 7
    }, this),
    children
  ] }, void 0, true, {
    fileName: "C:/Users/Admin/OneDrive/TaIÄi liAaIÅíu/New project/frontend/vnmac_elearning.web/src/app/providers.tsx",
    lineNumber: 38,
    columnNumber: 5
  }, this);
}
_s(AppProviders, "fuiLVXrre+xzFWmm8SUgw3cB91U=");
_c = AppProviders;
var _c;
$RefreshReg$(_c, "AppProviders");
if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}
if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("C:/Users/Admin/OneDrive/TaIÄi liAaIÅíu/New project/frontend/vnmac_elearning.web/src/app/providers.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("C:/Users/Admin/OneDrive/TaIÄi liAaIÅíu/New project/frontend/vnmac_elearning.web/src/app/providers.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBbUJNOzs7Ozs7Ozs7Ozs7Ozs7OztBQW5CTixTQUFTQSxhQUFhQywyQkFBMkI7QUFDakQsU0FBU0MsZ0JBQWdDO0FBQ3pDLFNBQVNDLHFCQUFxQjtBQUV2QixnQkFBU0MsYUFBYSxFQUFFQyxTQUFrQyxHQUFHO0FBQUFDLEtBQUE7QUFDbEUsUUFBTSxDQUFDQyxXQUFXLElBQUlMO0FBQUFBLElBQ3BCLE1BQ0UsSUFBSUYsWUFBWTtBQUFBLE1BQ2RRLGdCQUFnQjtBQUFBLFFBQ2RDLFNBQVM7QUFBQSxVQUNQQyxzQkFBc0I7QUFBQSxVQUN0QkMsV0FBVztBQUFBLFFBQ2I7QUFBQSxNQUNGO0FBQUEsSUFDRixDQUFDO0FBQUEsRUFDTDtBQUVBLFNBQ0UsdUJBQUMsdUJBQW9CLFFBQVFKLGFBQzNCO0FBQUEsMkJBQUMsbUJBQUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFjO0FBQUEsSUFDYkY7QUFBQUEsT0FGSDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBR0E7QUFFSjtBQUFDQyxHQW5CZUYsY0FBWTtBQUFBLEtBQVpBO0FBQVksSUFBQVE7QUFBQSxhQUFBQSxJQUFBIiwibmFtZXMiOlsiUXVlcnlDbGllbnQiLCJRdWVyeUNsaWVudFByb3ZpZGVyIiwidXNlU3RhdGUiLCJBdXRoQm9vdHN0cmFwIiwiQXBwUHJvdmlkZXJzIiwiY2hpbGRyZW4iLCJfcyIsInF1ZXJ5Q2xpZW50IiwiZGVmYXVsdE9wdGlvbnMiLCJxdWVyaWVzIiwicmVmZXRjaE9uV2luZG93Rm9jdXMiLCJzdGFsZVRpbWUiLCJfYyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJwcm92aWRlcnMudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFF1ZXJ5Q2xpZW50LCBRdWVyeUNsaWVudFByb3ZpZGVyIH0gZnJvbSBcIkB0YW5zdGFjay9yZWFjdC1xdWVyeVwiO1xuaW1wb3J0IHsgdXNlU3RhdGUsIHR5cGUgUmVhY3ROb2RlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBBdXRoQm9vdHN0cmFwIH0gZnJvbSBcIi4vYXV0aFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gQXBwUHJvdmlkZXJzKHsgY2hpbGRyZW4gfTogeyBjaGlsZHJlbjogUmVhY3ROb2RlIH0pIHtcbiAgY29uc3QgW3F1ZXJ5Q2xpZW50XSA9IHVzZVN0YXRlKFxuICAgICgpID0+XG4gICAgICBuZXcgUXVlcnlDbGllbnQoe1xuICAgICAgICBkZWZhdWx0T3B0aW9uczoge1xuICAgICAgICAgIHF1ZXJpZXM6IHtcbiAgICAgICAgICAgIHJlZmV0Y2hPbldpbmRvd0ZvY3VzOiBmYWxzZSxcbiAgICAgICAgICAgIHN0YWxlVGltZTogMzBfMDAwLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9KSxcbiAgKTtcblxuICByZXR1cm4gKFxuICAgIDxRdWVyeUNsaWVudFByb3ZpZGVyIGNsaWVudD17cXVlcnlDbGllbnR9PlxuICAgICAgPEF1dGhCb290c3RyYXAgLz5cbiAgICAgIHtjaGlsZHJlbn1cbiAgICA8L1F1ZXJ5Q2xpZW50UHJvdmlkZXI+XG4gICk7XG59XG4iXSwiZmlsZSI6IkM6L1VzZXJzL0FkbWluL09uZURyaXZlL1RhzIBpIGxpw6rMo3UvTmV3IHByb2plY3QvZnJvbnRlbmQvdm5tYWNfZWxlYXJuaW5nLndlYi9zcmMvYXBwL3Byb3ZpZGVycy50c3gifQ==
