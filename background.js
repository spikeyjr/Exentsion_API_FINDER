const browserAPI = typeof browser !== "undefined" ? browser : chrome;

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 1. Fetch external scripts (Safely)
  if (request.action === "fetchScript") {
    fetch(request.url)
      .then(res => res.text())
      .then(text => sendResponse({ content: text }))
      .catch(err => sendResponse({ content: "" })); // Return empty if failed
    return true; 
  }

  // 2. Get Server Headers
  if (request.action === "getServerInfo") {
    fetch(request.url, { method: 'HEAD' })
      .then(res => {
        sendResponse({ 
          server: res.headers.get("server") || "Obfuscated",
          poweredBy: res.headers.get("x-powered-by") || "Unknown" 
        });
      })
      .catch(() => sendResponse({ server: "Unknown", poweredBy: "Unknown" }));
    return true;
  }

  // 3. Get Cookies
  if (request.action === "getCookies") {
    browserAPI.cookies.getAll({ url: request.url }, (cookies) => {
      sendResponse({ cookies: cookies || [] });
    });
    return true;
  }
});