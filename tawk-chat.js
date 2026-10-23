/* Idempotent Tawk.to loader for the static multi-page site. */
(function () {
  "use strict";
  if (window.__gmoTawkLoaderStarted) return;
  window.__gmoTawkLoaderStarted = true;
  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();
  var script = document.createElement("script");
  script.async = true;
  script.src = "https://embed.tawk.to/6ad0796de35a9734cc152afd/default";
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");
  script.onerror = function () {
    window.__gmoTawkLoaderStarted = false;
  };
  document.body.appendChild(script);
})();
