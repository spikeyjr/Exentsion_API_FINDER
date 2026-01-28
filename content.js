const browserAPI = typeof browser !== "undefined" ? browser : chrome;

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanPage") {
    
    // 1. Start with the HTML currently on the screen
    let combined = document.documentElement.outerHTML;
    const scripts = Array.from(document.getElementsByTagName('script'));
    
    // 2. Prepare to fetch external scripts safely
    const fetchPromises = scripts
      .filter(s => s.src)
      .map(s => {
        return new Promise((resolve) => {
          // Send message to background
          browserAPI.runtime.sendMessage({ action: "fetchScript", url: s.src }, (response) => {
            // CRITICAL FIX: Check for errors so we don't crash
            if (browserAPI.runtime.lastError || !response) {
              resolve(""); // Return empty string if fetch fails
            } else {
              resolve(response.content || "");
            }
          });
        });
      });

    // 3. Wait for fetches, but DO NOT FAIL if one breaks
    Promise.all(fetchPromises).then(extScripts => {
      combined += "\n" + extScripts.join("\n");

      // 4. Run the Regex Scans
      const secPatterns = {
        "Google/Gemini API Key": /AIza[0-9A-Za-z-_]{35}/g,
        "Supabase SERVICE_ROLE": /service_role[^a-zA-Z0-9]+(eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)/g,
        "AWS Access Key": /AKIA[0-9A-Z]{16}/g,
        "Stripe Secret Key": /(sk_live|sk_test)_[0-9a-zA-Z]{24}/g,
        "Source Map Exposed": /\/\/# sourceMappingURL=(.*\.map)/g,
        "Hardcoded Password": /(?:password|passwd|pwd)\s*[:=]\s*["']([^"']{3,})["']/gi,
        "Internal IP Address": /10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}/g
      };

      const stackPatterns = {
        "Database: Supabase": /\.supabase\.co/g,
        "Framework: React": /react-dom/g,
        "Framework: Next.js": /_next\/static/g,
        "UI: Bootstrap": /Bootstrap v([\d.]+)/gi,
        "UI: Tailwind": /tailwind/gi
      };

      let res = { security: {}, stack: {} };
      
      // Capture matches safely
      try {
        for (const [n, r] of Object.entries(secPatterns)) {
          const m = combined.match(r); 
          if (m) res.security[n] = [...new Set(m)];
        }
        for (const [n, r] of Object.entries(stackPatterns)) {
          if (combined.match(r)) res.stack[n] = ["Detected"];
        }
      } catch (e) {
        console.error("Regex Scan Error:", e);
      }
      
      // 5. Send results back to popup
      sendResponse({ data: res });
    });

    // Return true indicates we will respond asynchronously
    return true;
  }
});