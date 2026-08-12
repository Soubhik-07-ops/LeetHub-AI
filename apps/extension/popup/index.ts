const linkBtn = document.getElementById('link-btn') as HTMLButtonElement;
const unlinkBtn = document.getElementById('unlink-btn') as HTMLButtonElement;
const dashboardBtn = document.getElementById('dashboard-btn') as HTMLButtonElement;
const codeInput = document.getElementById('pairing-code') as HTMLInputElement;
const connectSection = document.getElementById('connect-section') as HTMLDivElement;
const connectedSection = document.getElementById('connected-section') as HTMLDivElement;
const statusIndicator = document.getElementById('status-indicator') as HTMLDivElement;
const statusText = document.getElementById('status-text') as HTMLSpanElement;
const errorMsg = document.getElementById('error-msg') as HTMLDivElement;

const recentSubmissionCard = document.getElementById('recent-submission') as HTMLDivElement;
const subTitle = document.getElementById('sub-title') as HTMLDivElement;
const subStatus = document.getElementById('sub-status') as HTMLSpanElement;
const subDate = document.getElementById('sub-date') as HTMLDivElement;

// Allow injection of API_BASE during build/packaging, default to localhost for development
declare var process: any;
const API_BASE = (typeof process !== "undefined" && process.env && process.env.API_BASE) 
    ? process.env.API_BASE 
    : "http://localhost:8000/api/v1";

async function updateUI() {
  chrome.storage.sync.get(['leethub_credential'], (syncResult) => {
    let credential = syncResult.leethub_credential;
    
    // 1. Optimistic UI Update (Instant)
    renderUI(credential);

    // 2. Background Verification
    if (credential) {
      fetch(`${API_BASE}/extension/verify`, {
        headers: { "Authorization": `Bearer ${credential}` }
      })
      .then(res => {
        if (!res.ok) {
          chrome.storage.sync.remove(['leethub_credential'], () => {
            renderUI(null);
          });
        }
      })
      .catch(e => console.error("Failed to verify credential", e));
    }
  });
}

function renderUI(credential: string | null) {
  chrome.storage.local.get(['leethub_latest_submission'], (localResult) => {
    if (credential) {
      connectSection.style.display = 'none';
      connectedSection.style.display = 'block';
      statusText.textContent = 'Connected';
      statusIndicator.className = 'status-indicator status-connected';
      
      const latest = localResult.leethub_latest_submission;
      if (latest) {
        recentSubmissionCard.style.display = 'block';
        subTitle.textContent = latest.problemTitle || latest.problemSlug || "Unknown Problem";
        subStatus.textContent = latest.status;
        subStatus.className = `badge ${latest.status.toLowerCase()}`;
        if (latest.submittedAt) {
          subDate.textContent = new Date(latest.submittedAt).toLocaleString();
        }
      } else {
        recentSubmissionCard.style.display = 'none';
      }
    } else {
      connectSection.style.display = 'block';
      connectedSection.style.display = 'none';
      statusText.textContent = 'Not Connected';
      statusIndicator.className = 'status-indicator status-disconnected';
      recentSubmissionCard.style.display = 'none';
    }
  });
}

linkBtn.addEventListener('click', async () => {
  const code = codeInput.value.trim();
  if (!code || code.length !== 6) {
    errorMsg.textContent = 'Please enter a 6-digit code.';
    return;
  }

  errorMsg.textContent = '';
  linkBtn.disabled = true;
  linkBtn.textContent = 'Connecting...';

  try {
    const response = await fetch(`${API_BASE}/extension/link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Failed to connect');
    }

    const data = await response.json();
    if (data.credential) {
      chrome.storage.sync.set({ leethub_credential: data.credential }, () => {
        codeInput.value = '';
        updateUI();
      });
    }
  } catch (error: any) {
    errorMsg.textContent = error.message;
  } finally {
    linkBtn.disabled = false;
    linkBtn.textContent = 'Connect';
  }
});

unlinkBtn.addEventListener('click', () => {
  unlinkBtn.disabled = true;
  unlinkBtn.textContent = 'Disconnecting...';

  chrome.storage.sync.get(['leethub_credential'], (syncResult) => {
    const credential = syncResult.leethub_credential;
    if (credential) {
      // Tell backend to revoke the token
      fetch(`${API_BASE}/extension/unlink`, {
        method: 'DELETE',
        headers: { "Authorization": `Bearer ${credential}` }
      }).finally(() => {
        chrome.storage.sync.remove(['leethub_credential'], () => {
          codeInput.value = '';
          unlinkBtn.disabled = false;
          unlinkBtn.textContent = 'Disconnect';
          updateUI();
        });
      });
    } else {
      chrome.storage.sync.remove(['leethub_credential'], () => {
        codeInput.value = '';
        unlinkBtn.disabled = false;
        unlinkBtn.textContent = 'Disconnect';
        updateUI();
      });
    }
  });
});

if (dashboardBtn) {
  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: "http://localhost:3000" });
  });
}

document.addEventListener('DOMContentLoaded', updateUI);
