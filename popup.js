const browserAPI = typeof browser !== "undefined" ? browser : chrome;
let lastResults = null;

document.getElementById('scanBtn').addEventListener('click', async () => {
  const div = document.getElementById('results');
  div.innerHTML = "<p>Scanning... (please wait)</p>";
  
  let [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });

  // Safety Timer: If scan takes > 5 seconds, stop waiting
  const timeoutId = setTimeout(() => {
    div.innerHTML = "<p style='color:red'>Scan Timed Out.<br>Try refreshing the page.</p>";
  }, 5000);

  // 1. Get Cookies
  browserAPI.runtime.sendMessage({ action: "getCookies", url: tab.url }, (cookieData) => {
    
    // 2. Get Server Headers
    browserAPI.runtime.sendMessage({ action: "getServerInfo", url: tab.url }, (serverInfo) => {
      
      // 3. Scan Content
      browserAPI.tabs.sendMessage(tab.id, { action: "scanPage" }, (response) => {
        clearTimeout(timeoutId); // Stop the error timer

        if (browserAPI.runtime.lastError || !response) {
          div.innerHTML = "<p>Connection Error. Refresh page.</p>";
          return;
        }

        if (response.data) {
          response.data.stack[`Server: ${serverInfo?.server || "Unknown"}`] = ["Detected"];
          response.data.cookies = cookieData?.cookies || [];
          
          lastResults = response.data;
          renderUI(response.data);
          
          document.getElementById('txtBtn').style.display = "block";
        }
      });
    });
  });
});

function renderUI(data) {
  const div = document.getElementById('results');
  div.innerHTML = "";

  // 1. SECURITY RISKS (Show ALL matches)
  if (Object.keys(data.security).length > 0) {
    div.innerHTML += "<h4>Security Risks</h4>";
    Object.entries(data.security).forEach(([type, matches]) => {
      div.innerHTML += `
        <div class="risk-item">
          <span class="risk-title">${type}</span>
          ${matches.map(m => `<span class="risk-value">${m}</span>`).join('')} 
        </div>`;
    });
  } else {
    div.innerHTML += "<h4>Security Risks</h4><p class='placeholder'>No high-risk secrets found.</p>";
  }

  // 2. COOKIES (Show ALL, no limit)
  if (data.cookies && data.cookies.length > 0) {
    div.innerHTML += `<h4>Cookies (${data.cookies.length})</h4><div class="cookie-container">`;
    data.cookies.forEach(c => {
       div.innerHTML += `<div class="cookie-box"><b>${c.name}</b>: ${c.value}</div>`;
    });
    div.innerHTML += "</div>";
  }

  // 3. TECH STACK
  div.innerHTML += "<h4>Tech Stack</h4><div style='margin-top:5px;'>";
  Object.keys(data.stack).forEach(t => div.innerHTML += `<span class="badge">${t}</span>`);
  div.innerHTML += "</div>";
}

// .TXT Download Logic
document.getElementById('txtBtn').addEventListener('click', () => {
  let content = `SECURITY SCOUT REPORT\n${new Date().toLocaleString()}\n\n`;
  content += "--- SECURITY FINDINGS ---\n";
  Object.entries(lastResults.security).forEach(([k, v]) => content += `${k}:\n${v.join('\n')}\n\n`);
  content += "--- COOKIES ---\n";
  lastResults.cookies.forEach(c => content += `${c.name}: ${c.value}\n`);
  content += "\n--- TECH STACK ---\n" + Object.keys(lastResults.stack).join(', ');
  
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = "audit_log.txt";
  a.click();
});