// Store results for the PDF generator
var browser = browser || chrome;
let lastResults = null;

// Helper to show/hide buttons
const toggleButtons = (scanFinished) => {
  const reportBtn = document.getElementById('reportBtn');
  const clearBtn = document.getElementById('clearBtn');
  const displayStyle = scanFinished ? "block" : "none";
  
  reportBtn.style.display = displayStyle;
  clearBtn.style.display = displayStyle;
};

document.getElementById('scanBtn').addEventListener('click', async () => {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = "Scanning scripts... please wait.";
  toggleButtons(false);

  try {
    // 1. Find the active tab
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab) return;

    // 2. Send message to content.js
    chrome.tabs.sendMessage(tab.id, { action: "scanPage" }, (response) => {
      if (chrome.runtime.lastError) {
        resultsDiv.innerHTML = "Error: Please refresh the page and try again.";
        return;
      }

      if (response && response.data) {
        lastResults = response.data;
        displayResults(response.data);
        
        // Show report/clear buttons if we found something
        if (Object.keys(lastResults).length > 0) {
          toggleButtons(true);
        }
      }
    });
  } catch (err) {
    resultsDiv.innerHTML = "Error: Extension failed to connect.";
  }
});

// Clear Button logic
document.getElementById('clearBtn').addEventListener('click', () => {
  lastResults = null;
  document.getElementById('results').innerHTML = '<p class="placeholder">Results cleared.</p>';
  toggleButtons(false);
});

// PDF Button logic
document.getElementById('reportBtn').addEventListener('click', () => {
  if (lastResults) generatePDFReport(lastResults);
});

function displayResults(data) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = ""; 

  const types = Object.keys(data);
  if (types.length === 0) {
    resultsDiv.innerHTML = "<p class='placeholder'>No potential keys found.</p>";
    return;
  }

  types.forEach(type => {
    const section = document.createElement('div');
    section.className = 'result-group';
    section.innerHTML = `
      <span class="type-label">${type}</span>
      ${data[type].map(match => `<div class="match-item">${match}</div>`).join('')}
    `;
    resultsDiv.appendChild(section);
  });
}

// Reuse the generatePDFReport function with severity badges provided earlier
function generatePDFReport(data) {
  const reportWindow = window.open('', '_blank');
  const severityMap = {
    "AWS Access Key": { level: "CRITICAL", color: "#721c24", bg: "#f8d7da" },
    "Stripe Key": { level: "CRITICAL", color: "#721c24", bg: "#f8d7da" },
    "Slack Webhook": { level: "HIGH", color: "#856404", bg: "#fff3cd" },
    "Google/Gemini API Key": { level: "HIGH", color: "#856404", bg: "#fff3cd" },
    "Firebase Config": { level: "MEDIUM", color: "#0c5460", bg: "#d1ecf1" },
    "Supabase URL": { level: "MEDIUM", color: "#0c5460", bg: "#d1ecf1" },
    "JWT Token": { level: "MEDIUM", color: "#0c5460", bg: "#d1ecf1" },
    "Internal IP Address": { level: "LOW", color: "#155724", bg: "#d4edda" },
    "GitHub Repo": { level: "INFO", color: "#383d41", bg: "#e2e3e5" }
  };

  let reportHtml = `<html><head><title>Audit Report</title><style>
    body { font-family: sans-serif; padding: 30px; }
    .header { border-bottom: 2px solid #007bff; margin-bottom: 20px; }
    .finding-box { border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 5px; }
    .badge { float: right; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; }
    .finding-data { background: #f4f4f4; padding: 5px; font-family: monospace; margin-top: 5px; }
    @media print { .no-print { display: none; } }
  </style></head><body>
    <div class="header"><h1>Security Scout Report</h1><p>${new Date().toLocaleString()}</p></div>`;

  for (const [type, matches] of Object.entries(data)) {
    const sev = severityMap[type] || { level: "INFO", color: "#333", bg: "#eee" };
    reportHtml += `
      <div class="finding-box">
        <span class="badge" style="color:${sev.color}; background-color:${sev.bg};">${sev.level}</span>
        <strong>${type}</strong>
        <div class="finding-data">${matches.join('<br>')}</div>
      </div>`;
  }

  reportHtml += `<button class="no-print" onclick="window.print()">Print PDF</button></body></html>`;
  reportWindow.document.write(reportHtml);
  reportWindow.document.close();
}