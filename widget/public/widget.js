/*
 * FAQ Chat embed script. A business adds this to its site:
 *   <script src="https://YOUR-WIDGET-HOST/widget.js" data-business="riverside-dental" data-color="#0f766e"></script>
 * It adds a chat button that opens the chat page in an iframe. The page can also call
 * FAQChat.open("question") to open the chat with a question typed in, or FAQChat.ask("question")
 * to open it and ask straight away.
 * data-color is only the starting button color: the chat reports the business's current
 * color from the database once it loads, so changing it in the admin page needs no re-paste.
 * Plain JavaScript on purpose: no build step or framework needed on the business's site.
 */
(function () {
  var script = document.currentScript;
  var businessId = script && script.getAttribute("data-business");
  if (!businessId) {
    console.error("FAQ Chat: add data-business=\"<id>\" to the widget script tag.");
    return;
  }
  var COLOR = /^#[0-9a-fA-F]{6}$/;
  var startColor = script.getAttribute("data-color");
  var widgetOrigin = new URL(script.src).origin; // the chat page lives next to this script
  var open = false;

  var button = document.createElement("button");
  button.setAttribute("aria-label", "Open chat");
  button.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  setStyle(button, {
    position: "fixed", right: "20px", bottom: "20px", width: "56px", height: "56px",
    borderRadius: "50%", border: "none", cursor: "pointer",
    background: COLOR.test(startColor || "") ? startColor : "#0f766e",
    boxShadow: "0 4px 14px rgba(0,0,0,0.25)", zIndex: "2147483000",
    display: "flex", alignItems: "center", justifyContent: "center", padding: "0",
  });
  button.addEventListener("click", function () { toggle(!open); });

  // Loaded hidden right away: it reports the current color, and opening is instant
  var iframe = document.createElement("iframe");
  iframe.src = widgetOrigin + "/?business=" + encodeURIComponent(businessId);
  iframe.title = "Chat with us";
  setStyle(iframe, {
    position: "fixed", right: "20px", bottom: "88px", width: "370px", height: "560px",
    maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 110px)",
    border: "none", borderRadius: "14px", background: "#fff",
    boxShadow: "0 8px 30px rgba(0,0,0,0.25)", zIndex: "2147483000", display: "none",
  });

  document.body.appendChild(iframe);
  document.body.appendChild(button);

  function toggle(show, question, send) {
    open = show;
    iframe.style.display = show ? "block" : "none";
    if (show) iframe.contentWindow.postMessage({ type: "faq-chat:open", question: question || "", send: !!send }, widgetOrigin);
    button.setAttribute("aria-label", show ? "Close chat" : "Open chat");
  }

  // For the host page's own buttons: FAQChat.open("Do you take Cigna?") opens the chat with
  // that question typed in; FAQChat.ask("Do you take Cigna?") opens it and asks right away
  window.FAQChat = {
    open: function (question) { toggle(true, typeof question === "string" ? question : ""); },
    ask: function (question) { toggle(true, typeof question === "string" ? question : "", true); },
    close: function () { toggle(false); },
  };

  // Messages from the chat page (only trusted from our own origin)
  window.addEventListener("message", function (e) {
    if (e.origin !== widgetOrigin || !e.data) return;
    if (e.data.type === "faq-chat:close") toggle(false);
    if (e.data.type === "faq-chat:ready" && COLOR.test(e.data.color || "")) button.style.background = e.data.color;
  });

  function setStyle(el, styles) {
    for (var k in styles) el.style[k] = styles[k];
  }
})();
