const browserAPI = typeof browser !== "undefined" ? browser : chrome;

browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanPage") {
    let combined = document.documentElement.outerHTML;
    const scripts = Array.from(document.getElementsByTagName('script'));
    
    const fetchPromises = scripts.filter(s => s.src).map(s => {
      return new Promise((resolve) => {
        browserAPI.runtime.sendMessage({ action: "fetchScript", url: s.src }, (res) => resolve(res?.content || ""));
      });
    });

    Promise.all(fetchPromises).then(extScripts => {
      // We combine everything into one massive string to scan all at once
      combined += "\n" + extScripts.join("\n");

      // CRITICAL: The 'g' flag at the end of these regexes is what finds ALL keys
      const secPatterns = {
        "Google/Gemini API Key": /AIza[0-9A-Za-z-_]{35}/g,
        "Supabase SERVICE_ROLE Key": /service_role[^a-zA-Z0-9]+(eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)/g,
        "Source Map Exposed": /\/\/# sourceMappingURL=(.*\.map)/g,
        "Vulnerable Library (jsdiff)": /jsdiff\s*v([0-7]\.\d+\.\d+|8\.0\.[0-2])/g,
        "GitHub Repo": /https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+/g
      };

      const stackPatterns = {
        "Database: Supabase": /\.supabase\.co/g,
        "Framework: React": /react-dom/g,
        "UI: Bootstrap": /Bootstrap v([\d.]+)/gi
      };

      let res = { security: {}, stack: {} };
      
      // Scanning for Security Risks
      for (const [n, r] of Object.entries(secPatterns)) {
        const m = combined.match(r); 
        if (m) {
          // This captures ALL matches found by the 'g' flag
          res.security[n] = [...new Set(m)]; 
        }
      }
      
      // Scanning for Tech Stack
      for (const [n, r] of Object.entries(stackPatterns)) {
        if (combined.match(r)) res.stack[n] = ["Detected"];
      }
      
      sendResponse({ data: res });
    });
    return true;
  }
});