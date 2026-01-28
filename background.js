const browserAPI = typeof browser !== "undefined" ? browser : chrome;

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Fetch external script contents
  if (request.action === "fetchScript") {
    fetch(request.url)
      .then(res => res.text())
      .then(text => sendResponse({ content: text }))
      .catch(err => sendResponse({ error: err.message }));
    return true; 
  }

  // Identify server and backend tech via HTTP headers
  if (request.action === "getServerInfo") {
    fetch(request.url, { method: 'HEAD' })
      .then(res => {
        sendResponse({ 
          server: res.headers.get("server") || "Obfuscated",
          poweredBy: res.headers.get("x-powered-by") || "Unknown" 
        });
      })
      .catch(() => sendResponse({ server: "CORS Blocked", poweredBy: "Unknown" }));
    return true;
  }
});