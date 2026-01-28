/**
 * content.js
 * Scans the live page and requests external script contents via the background worker.
 */
var browser = browser || chrome;
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scanPage") {
    // Start with the main HTML of the page
    let combinedContent = document.documentElement.outerHTML;
    const scripts = Array.from(document.getElementsByTagName('script'));
    
    // Create a list of promises to fetch external JS files
    const fetchPromises = scripts
      .filter(s => s.src)
      .map(s => {
        return new Promise((resolve) => {
          // Ask background.js to fetch the code to bypass CORS
          chrome.runtime.sendMessage({ action: "fetchScript", url: s.src }, (response) => {
            resolve(response?.content || "");
          });
        });
      });

    // Wait for all external scripts to be retrieved
    Promise.all(fetchPromises).then(externalScriptsContent => {
      // Combine the main HTML with all the external JS code
      combinedContent += "\n" + externalScriptsContent.join("\n");

      // Comprehensive list of patterns for a security-minded audit
      const patterns = {
        "Supabase URL": /https?:\/\/[a-z0-9]{20}\.supabase\.co/gi,
        "JWT Token": /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
        "Google/Gemini API Key": /AIza[0-9A-Za-z-_]{35}/g,
        "Stripe Key": /(sk_live|sk_test|pk_live|pk_test)_[0-9a-zA-Z]{24}/g,
        "GitHub Repo": /https?:\/\/github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+/g,
        "Slack Webhook": /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9_]{8}\/B[A-Z0-9_]{8}\/[A-Za-z0-9_]{24}/g,
        "AWS Access Key": /AKIA[0-9A-Z]{16}/g,
        "Firebase Config": /apiKey: "AIza[0-9A-Za-z-_]{35}"/g,
        "Internal IP Address": /10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}/g
      };

      let results = {};
      
      // Execute the regex scans
      for (const [name, regex] of Object.entries(patterns)) {
        const matches = combinedContent.match(regex);
        if (matches) {
          // Use Set to ensure we only return unique findings
          results[name] = [...new Set(matches)];
        }
      }

      // Send the final results back to the popup
      sendResponse({ data: results });
    });

    // Return true to indicate we will respond asynchronously
    return true; 
  }
});