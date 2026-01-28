// This service worker handles fetches to bypass CORS restrictions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "fetchScript") {
    fetch(request.url)
      .then(response => response.text())
      .then(text => sendResponse({ content: text }))
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keeps the channel open for the async response
  }
});