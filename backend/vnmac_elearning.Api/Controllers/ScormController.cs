using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Mvc;
using vnmac_elearning.Api.Contracts;
using vnmac_elearning.Api.Services;

namespace vnmac_elearning.Api.Controllers;

[ApiController]
[Route("api/scorm")]
public sealed class ScormController(LearningService learningService) : ControllerBase
{
    [HttpGet("player/{sessionId}")]
    public ContentResult GetPlayer(string sessionId)
    {
        var launch = learningService.GetScormLaunchContext(sessionId);
        return Content(BuildPlayerHtml(launch), "text/html; charset=utf-8");
    }

    [HttpPost("runtime/{sessionId}/initialize")]
    public ActionResult<ScormInitializeResponse> Initialize(string sessionId)
    {
        return Ok(learningService.InitializeScormSession(sessionId));
    }

    [HttpGet("runtime/{sessionId}/value")]
    public ActionResult<ScormValueResponse> GetValue(string sessionId, [FromQuery] string element)
    {
        return Ok(learningService.GetScormValue(sessionId, element));
    }

    [HttpPut("runtime/{sessionId}/value")]
    public ActionResult<ScormValueResponse> SetValue(string sessionId, [FromBody] ScormSetValueRequest request)
    {
        return Ok(learningService.SetScormValue(sessionId, request));
    }

    [HttpPost("runtime/{sessionId}/commit")]
    public ActionResult<ScormCommitResponse> Commit(string sessionId)
    {
        return Ok(learningService.CommitScormSession(sessionId));
    }

    [HttpPost("runtime/{sessionId}/terminate")]
    public ActionResult<ScormCommitResponse> Terminate(string sessionId)
    {
        return Ok(learningService.TerminateScormSession(sessionId));
    }

    private static string BuildPlayerHtml(ScormLaunchResponse launch)
    {
        var sessionId = JavaScriptEncoder.Default.Encode(launch.SessionId);
        var runtimeBase = $"/api/scorm/runtime/{sessionId}";
        var contentUrl = JavaScriptEncoder.Default.Encode(launch.LaunchContentUrl);
        var apiAdapter = launch.Version == Domain.ScormVersion.Scorm12 ? "API" : "API_1484_11";
        var title = JavaScriptEncoder.Default.Encode(launch.PackageTitle);
        var scoTitle = JavaScriptEncoder.Default.Encode(launch.ScoTitle);

        return $$"""
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{title}} - LMS Player</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #13343b;
      --muted: #5d7479;
      --line: #d4e0df;
      --paper: #f7fbfa;
      --accent: #0d8a83;
      --accent-weak: #e2f6f3;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Segoe UI, Arial, sans-serif; color: var(--ink); background: var(--paper); }
    .shell { min-height: 100vh; display: grid; grid-template-rows: auto 1fr; }
    .bar {
      display: flex; justify-content: space-between; gap: 16px; align-items: center;
      padding: 14px 18px; background: white; border-bottom: 1px solid var(--line);
    }
    .title { display: grid; gap: 4px; }
    .title strong { font-size: 15px; }
    .title span { font-size: 12px; color: var(--muted); }
    .badge {
      border: 1px solid var(--line); background: var(--accent-weak); color: var(--accent);
      border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 600;
    }
    iframe {
      width: 100%; height: calc(100vh - 66px);
      border: 0; background: white;
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="bar">
      <div class="title">
        <strong>{{title}}</strong>
        <span>{{scoTitle}}</span>
      </div>
      <div class="badge">{{launch.Version}}</div>
    </div>
    <iframe id="scormFrame" src="{{contentUrl}}" title="{{title}}"></iframe>
  </div>
  <script>
    (function () {
      const runtimeBase = '{{runtimeBase}}';
      let lastError = '0';
      let lastDiagnostic = '';

      function syncRequest(method, url, body) {
        const xhr = new XMLHttpRequest();
        xhr.open(method, url, false);
        if (body !== undefined) {
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.send(JSON.stringify(body));
        } else {
          xhr.send();
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          lastError = '0';
          lastDiagnostic = '';
          return xhr.responseText ? JSON.parse(xhr.responseText) : {};
        }

        lastError = '101';
        lastDiagnostic = xhr.responseText || ('HTTP ' + xhr.status);
        return null;
      }

      function getValue(element) {
        const payload = syncRequest('GET', runtimeBase + '/value?element=' + encodeURIComponent(element));
        return payload ? String(payload.value || '') : '';
      }

      function setValue(element, value) {
        return syncRequest('PUT', runtimeBase + '/value', { element: element, value: String(value ?? '') }) ? 'true' : 'false';
      }

      function initialize() {
        return syncRequest('POST', runtimeBase + '/initialize') ? 'true' : 'false';
      }

      function commit() {
        return syncRequest('POST', runtimeBase + '/commit') ? 'true' : 'false';
      }

      function terminate() {
        return syncRequest('POST', runtimeBase + '/terminate') ? 'true' : 'false';
      }

      function getErrorString(code) {
        return code === '0' ? 'No error' : 'Runtime request failed';
      }

      function getDiagnostic(code) {
        return code === '0' ? '' : lastDiagnostic;
      }

      const scorm12Api = {
        LMSInitialize: function () { return initialize(); },
        LMSFinish: function () { return terminate(); },
        LMSGetValue: function (element) { return getValue(element); },
        LMSSetValue: function (element, value) { return setValue(element, value); },
        LMSCommit: function () { return commit(); },
        LMSGetLastError: function () { return lastError; },
        LMSGetErrorString: function (code) { return getErrorString(String(code)); },
        LMSGetDiagnostic: function (code) { return getDiagnostic(String(code)); }
      };

      const scorm2004Api = {
        Initialize: function () { return initialize(); },
        Terminate: function () { return terminate(); },
        GetValue: function (element) { return getValue(element); },
        SetValue: function (element, value) { return setValue(element, value); },
        Commit: function () { return commit(); },
        GetLastError: function () { return lastError; },
        GetErrorString: function (code) { return getErrorString(String(code)); },
        GetDiagnostic: function (code) { return getDiagnostic(String(code)); }
      };

      window.API = scorm12Api;
      window.API_1484_11 = scorm2004Api;
      window['{{apiAdapter}}'] = '{{apiAdapter}}' === 'API' ? scorm12Api : scorm2004Api;
    })();
  </script>
</body>
</html>
""";
    }
}
