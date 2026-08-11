const linkBtn = document.getElementById('link-btn') as HTMLButtonElement;
const unlinkBtn = document.getElementById('unlink-btn') as HTMLButtonElement;
const codeInput = document.getElementById('pairing-code') as HTMLInputElement;
const connectSection = document.getElementById('connect-section') as HTMLDivElement;
const connectedSection = document.getElementById('connected-section') as HTMLDivElement;
const statusText = document.getElementById('status') as HTMLDivElement;
const errorMsg = document.getElementById('error-msg') as HTMLDivElement;

const API_BASE = "http://localhost:8000/api/v1";

async function updateUI() {
  chrome.storage.local.get(['leethub_credential'], (result) => {
    if (result.leethub_credential) {
      connectSection.style.display = 'none';
      connectedSection.style.display = 'block';
      statusText.textContent = '● Connected';
      statusText.className = 'status-connected';
    } else {
      connectSection.style.display = 'block';
      connectedSection.style.display = 'none';
      statusText.textContent = '○ Not Connected';
      statusText.className = 'status-disconnected';
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
      chrome.storage.local.set({ leethub_credential: data.credential }, () => {
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
  chrome.storage.local.remove(['leethub_credential'], () => {
    codeInput.value = '';
    updateUI();
  });
});

document.addEventListener('DOMContentLoaded', updateUI);
