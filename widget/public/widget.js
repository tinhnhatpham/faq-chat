/*
 * FAQ Chat embed script. A business adds this to its site:
 *   <script src="https://YOUR-WIDGET-HOST/widget.js" data-business="riverside-dental" data-color="#0f766e"></script>
 * It adds a chat button; clicking it opens the chat page in an iframe.
 * Plain JavaScript on purpose: no build step or framework needed on the business's site.
 */
(function () {
  var script = document.currentScript;
  var businessId = script && script.getAttribute("data-business");
  if (!businessId) {
    console.error("FAQ Chat: add data-business=\"<id>\" to the widget script tag.");
    return;
  }
  var color = script.getAttribute("data-color") || "#0f766e";
  var widgetOrigin = new URL(script.src).origin; // the chat page lives next to this script
  var iframe = null;
  var open = false;

  var button = document.createElement("button");
  button.setAttribute("aria-label", "Open chat");
  button.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  setStyle(button, {
    position: "fixed", right: "20px", bottom: "20px", width: "56px", height: "56px",
    borderRadius: "50%", border: "none", background: color, cursor: "pointer",
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)", zIndex: "2147483000",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "0",
  });
  button.addEventListener("click", function () { toggle(!open); });
  document.body.appendChild(button);

  function toggle(show) {
    open = show;
    if (show && !iframe) {
      // Created on first open, so the chat page doesn't load until someone wants it
      iframe = document.createElement("iframe");
      iframe.src = widgetOrigin + "/?business=" + encodeURIComponent(businessId);
      iframe.title = "Chat with us";
      setStyle(iframe, {
        position: "fixed", right: "20px", bottom: "88px", width: "370px", height: "560px",
        maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 110px)",
        border: "none", borderRadius: "14px", background: "#fff",
        boxShadow: "0 8px 30px rgba(0,0,0,0.25)", zIndex: "2147483000",
      });
      document.body.appendChild(iframe);
    }
    if (iframe) iframe.style.display = show ? "block" : "none";
    button.setAttribute("aria-label", show ? "Close chat" : "Open chat");
  }

  // The × button inside the chat asks us to close
  window.addEventListener("message", function (e) {
    if (e.origin === widgetOrigin && e.data && e.data.type === "faq-chat:close") toggle(false);
  });

  function setStyle(el, styles) {
    for (var k in styles) el.style[k] = styles[k];
  }
})();
