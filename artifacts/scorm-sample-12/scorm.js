(function () {
  "use strict";

  var api = findApi(window);
  var step = 1;
  var totalSteps = 3;
  var initialized = false;

  function findApi(currentWindow) {
    var attempts = 0;
    while (currentWindow && attempts < 10) {
      if (currentWindow.API) return currentWindow.API;
      if (currentWindow.parent === currentWindow) break;
      currentWindow = currentWindow.parent;
      attempts += 1;
    }
    if (window.opener) return findApi(window.opener);
    return null;
  }

  function setMessage(message) {
    document.getElementById("runtimeMessage").textContent = message;
  }

  function call(method) {
    if (!api || typeof api[method] !== "function") return "";
    var args = Array.prototype.slice.call(arguments, 1);
    return api[method].apply(api, args);
  }

  function saveProgress() {
    if (!initialized) return;
    call("LMSSetValue", "cmi.core.lesson_location", String(step));
    call("LMSSetValue", "cmi.suspend_data", JSON.stringify({ step: step }));
    call("LMSSetValue", "cmi.core.lesson_status", "incomplete");
    var result = call("LMSCommit", "");
    setMessage("Đã lưu bước " + step + ". LMSCommit trả về: " + result);
  }

  function render() {
    document.querySelectorAll(".lesson").forEach(function (element) {
      element.classList.toggle("hidden", Number(element.dataset.step) !== step);
    });
    document.getElementById("stepLabel").textContent = "Bước " + step + "/" + totalSteps;
    document.getElementById("progressBar").style.width = ((step / totalSteps) * 100) + "%";
    document.getElementById("previousButton").disabled = step === 1;
    document.getElementById("nextButton").classList.toggle("hidden", step === totalSteps);
    document.getElementById("completeButton").classList.toggle("hidden", step !== totalSteps);
  }

  function initialize() {
    if (!api) {
      setMessage("Không tìm thấy window.API. Hãy mở package bằng VNMAC SCORM Player.");
      document.getElementById("connectionBadge").textContent = "Không có LMS API";
      render();
      return;
    }

    initialized = call("LMSInitialize", "") === "true";
    if (!initialized) {
      setMessage("LMSInitialize không thành công.");
      return;
    }

    var badge = document.getElementById("connectionBadge");
    badge.textContent = "Đã kết nối SCORM 1.2";
    badge.classList.add("connected");

    var learnerName = call("LMSGetValue", "cmi.core.student_name");
    if (learnerName) document.getElementById("learnerName").textContent = learnerName;

    var savedLocation = Number(call("LMSGetValue", "cmi.core.lesson_location"));
    if (savedLocation >= 1 && savedLocation <= totalSteps) step = savedLocation;

    call("LMSSetValue", "cmi.core.lesson_status", "incomplete");
    call("LMSCommit", "");
    setMessage(savedLocation ? "Đã khôi phục vị trí học trước đó." : "Đã khởi tạo phiên học mới.");
    render();
  }

  document.getElementById("previousButton").addEventListener("click", function () {
    if (step > 1) step -= 1;
    render();
    saveProgress();
  });

  document.getElementById("nextButton").addEventListener("click", function () {
    if (step < totalSteps) step += 1;
    render();
    saveProgress();
  });

  document.getElementById("completeButton").addEventListener("click", function () {
    if (!initialized) {
      setMessage("Không thể hoàn thành vì package chưa kết nối LMS.");
      return;
    }
    call("LMSSetValue", "cmi.core.score.min", "0");
    call("LMSSetValue", "cmi.core.score.max", "100");
    call("LMSSetValue", "cmi.core.score.raw", "100");
    call("LMSSetValue", "cmi.core.lesson_status", "passed");
    call("LMSSetValue", "cmi.core.exit", "");
    call("LMSCommit", "");
    call("LMSFinish", "");
    initialized = false;
    document.getElementById("completeButton").disabled = true;
    setMessage("Đã gửi 100 điểm, trạng thái passed và kết thúc phiên học.");
  });

  window.addEventListener("beforeunload", function () {
    if (!initialized) return;
    call("LMSSetValue", "cmi.core.exit", "suspend");
    call("LMSCommit", "");
    call("LMSFinish", "");
  });

  initialize();
})();
