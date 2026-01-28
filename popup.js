const browserAPI = typeof browser !== "undefined" ? browser : chrome;
let lastResults = null;

document.getElementById('scanBtn').addEventListener('click', async () => {
  const div = document.getElementById('results');
  div.innerHTML = "Auditing tech stack and security...";
  
  let [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });

  browserAPI.runtime.sendMessage({ action: "getServerInfo", url: tab.url }, (serverInfo) => {
    browserAPI.tabs.sendMessage(tab.id, { action: "scanPage" }, (response) => {
      if (response && response.data) {
        response.data.stack[`Server: ${serverInfo.server}`] = ["Detected"];
        lastResults = response.data;
        renderUI(response.data);
        document.getElementById('reportBtn').style.display = "block";
        document.getElementById('txtBtn').style.display = "block";
      }
    });
  });
});

function renderUI(data) {
  const div = document.getElementById('results');
  div.innerHTML = "<h4>Security Risks</h4>";
  
  Object.entries(data.security).forEach(([type, matches]) => {
    // This join('<br>') ensures every key appears on its own line
    div.innerHTML += `<div class="risk-item"><b>${type}</b><br><small>${matches.join('<br>')}</small></div>`;
  });

  div.innerHTML += "<h4>Tech Stack</h4>";
  let stackHtml = '<div class="stack-container">';
  Object.keys(data.stack).forEach(t => stackHtml += `<span class="badge">${t}</span>`);
  div.innerHTML += stackHtml + '</div>';
}

// Logic to download as .TXT
document.getElementById('txtBtn').addEventListener('click', () => {
  let content = `SECURITY SCOUT AUDIT REPORT\nGenerated: ${new Date().toLocaleString()}\n\n`;
  content += "--- SECURITY RISKS ---\n";
  Object.entries(lastResults.security).forEach(([type, matches]) => {
    content += `${type}:\n${matches.join('\n')}\n\n`;
  });
  content += "--- TECH STACK ---\n" + Object.keys(lastResults.stack).join(', ');

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `security_audit_${new Date().getTime()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});