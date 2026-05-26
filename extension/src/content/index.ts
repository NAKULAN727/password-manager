// Types from extension
interface DecryptedCredentials {
  username: string;
  plaintext: string;
}

// Global reference for active components
let activeBadgeContainers = new Map<HTMLInputElement, HTMLDivElement>();
let activeDropdown: HTMLDivElement | null = null;
let currentInput: HTMLInputElement | null = null;

// CSS styles to inject inside the Shadow DOM
const SHADOW_STYLE = `
  .sphynx-badge-trigger {
    width: 20px;
    height: 20px;
    cursor: pointer;
    background: linear-gradient(135deg, #F4D068 0%, #D4AF37 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 8px rgba(212, 175, 55, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.2s ease-in-out;
  }
  .sphynx-badge-trigger:hover {
    transform: scale(1.15);
    box-shadow: 0 0 12px rgba(212, 175, 55, 0.7);
  }
  .sphynx-badge-icon {
    width: 10px;
    height: 10px;
    border: 1.5px solid #05070B;
    border-bottom: 0;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    position: relative;
    top: -1px;
  }
  .sphynx-badge-icon::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 5px;
    background-color: #05070B;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 1px;
  }
  
  .sphynx-dropdown {
    position: absolute;
    width: 250px;
    max-height: 200px;
    overflow-y: auto;
    background: rgba(9, 13, 22, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1.5px solid rgba(212, 175, 55, 0.25);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    z-index: 2147483647;
    margin-top: 5px;
    display: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #F1F5F9;
    padding: 6px;
    animation: slideDown 0.2s ease-out;
  }
  
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .sphynx-dropdown-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(212, 175, 55, 0.65);
    padding: 6px 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }

  .sphynx-dropdown-item {
    padding: 8px 10px;
    font-size: 12px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
    transition: background 0.15s ease;
  }

  .sphynx-dropdown-item:hover {
    background: rgba(212, 175, 55, 0.15);
  }

  .sphynx-item-label {
    font-weight: 600;
    color: #FFF;
  }

  .sphynx-item-sub {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
  }

  .sphynx-dropdown-empty {
    padding: 12px;
    text-align: center;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
    line-height: 1.4;
  }

  .sphynx-dropdown-empty a {
    color: #D4AF37;
    text-decoration: none;
    font-weight: 600;
  }
`;

/**
 * Detects all password fields on the page and initializes autofill badges
 */
function scanForPasswordInputs() {
  const inputs = document.querySelectorAll('input[type="password"]');
  inputs.forEach((element) => {
    const input = element as HTMLInputElement;
    if (!activeBadgeContainers.has(input)) {
      injectAutofillBadge(input);
    }
  });
}

/**
 * Injects a floating autofill trigger badge relative to the target input
 */
function injectAutofillBadge(passwordInput: HTMLInputElement) {
  // Create wrapper container in host DOM
  const badgeContainer = document.createElement('div');
  badgeContainer.style.position = 'absolute';
  badgeContainer.style.zIndex = '2147483646';
  badgeContainer.style.pointerEvents = 'none'; // click-through where transparent

  document.body.appendChild(badgeContainer);

  // Attach a secure Closed Shadow DOM to prevent host styles leak
  const shadow = badgeContainer.attachShadow({ mode: 'closed' });

  // Add styles
  const styleTag = document.createElement('style');
  styleTag.textContent = SHADOW_STYLE;
  shadow.appendChild(styleTag);

  // Add badge trigger element
  const badge = document.createElement('div');
  badge.className = 'sphynx-badge-trigger';
  badge.style.pointerEvents = 'auto'; // Re-enable pointer events

  const icon = document.createElement('div');
  icon.className = 'sphynx-badge-icon';
  badge.appendChild(icon);
  shadow.appendChild(badge);

  // Track coordinates and position dynamically
  const reposition = () => {
    if (!document.body.contains(passwordInput)) {
      badgeContainer.remove();
      activeBadgeContainers.delete(passwordInput);
      return;
    }
    
    const rect = passwordInput.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // Position badge floating at the far right of the password input
    badgeContainer.style.left = `${rect.left + scrollX + rect.width - 28}px`;
    badgeContainer.style.top = `${rect.top + scrollY + (rect.height - 20) / 2}px`;
  };

  reposition();
  activeBadgeContainers.set(passwordInput, badgeContainer);

  // Listen for window resizes and document updates to maintain correct positioning
  window.addEventListener('resize', reposition);
  document.addEventListener('scroll', reposition, true);

  // Observe when the user interacts with the trigger
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    currentInput = passwordInput;
    showAutofillDropdown(passwordInput, shadow);
  });
}

/**
 * Renders a dropdown overlay loaded with local decrypted vault options
 */
function showAutofillDropdown(passwordInput: HTMLInputElement, shadow: ShadowRoot) {
  // Clear any existing active dropdown first
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }

  // Create the dropdown menu
  const dropdown = document.createElement('div');
  dropdown.className = 'sphynx-dropdown';
  dropdown.style.display = 'block';

  // Request credentials entries from background service worker
  chrome.runtime.sendMessage({ type: 'GET_ENTRIES' }, (response) => {
    if (!response || !response.success) {
      // Locked or not synced state
      dropdown.innerHTML = `
        <div class="sphynx-dropdown-empty">
          🔒 Vault is locked.<br>
          Please open the <strong>Sphynx extension</strong> in your toolbar to unlock.
        </div>
      `;
    } else {
      const entries = response.data || [];
      const currentHost = window.location.hostname.toLowerCase();

      // Filter entries relevant to current domain
      const relevantEntries = entries.filter((e: any) => {
        const label = e.label.toLowerCase();
        const username = e.username.toLowerCase();
        return label.includes(currentHost) || currentHost.includes(label) || label.includes(currentHost.split('.')[0]);
      });

      const displayEntries = relevantEntries.length > 0 ? relevantEntries : entries;

      if (displayEntries.length === 0) {
        dropdown.innerHTML = `
          <div class="sphynx-dropdown-title">Sphynx Vault</div>
          <div class="sphynx-dropdown-empty">
            No entries found in your vault.<br>
            <a href="http://localhost:3000/dashboard" target="_blank">Add credentials</a>
          </div>
        `;
      } else {
        dropdown.innerHTML = `<div class="sphynx-dropdown-title">Select Account</div>`;
        
        displayEntries.forEach((entry: any) => {
          const item = document.createElement('div');
          item.className = 'sphynx-dropdown-item';
          
          const label = document.createElement('span');
          label.className = 'sphynx-item-label';
          label.textContent = entry.label;

          const sub = document.createElement('span');
          sub.className = 'sphynx-item-sub';
          sub.textContent = entry.username || 'No username';

          item.appendChild(label);
          item.appendChild(sub);

          item.addEventListener('click', (ev) => {
            ev.stopPropagation();
            performSecureAutofill(passwordInput, entry.id);
            dropdown.remove();
            activeDropdown = null;
          });

          dropdown.appendChild(item);
        });
      }
    }
  });

  shadow.appendChild(dropdown);
  activeDropdown = dropdown;

  // Click-away listener to close dropdown
  const dismissDropdown = (e: MouseEvent) => {
    if (activeDropdown && !dropdown.contains(e.target as Node)) {
      dropdown.remove();
      activeDropdown = null;
      document.removeEventListener('click', dismissDropdown);
    }
  };
  document.addEventListener('click', dismissDropdown);
}

/**
 * Requests specific credentials from background, fills form inputs, and executes auto-login
 */
function performSecureAutofill(passwordInput: HTMLInputElement, entryId: string) {
  chrome.runtime.sendMessage({
    type: 'GET_CREDENTIALS',
    payload: {
      entryId,
      hostname: window.location.hostname
    }
  }, (response) => {
    if (!response || !response.success || !response.data) {
      console.error('Secure retrieval failed:', response?.error || 'Empty payload');
      return;
    }

    const { username, password } = response.data;

    // 1. Locate username/email input inside the same form hierarchy
    let usernameInput: HTMLInputElement | null = null;
    const parentForm = passwordInput.closest('form');

    if (parentForm) {
      usernameInput = parentForm.querySelector('input[type="text"], input[type="email"], input:not([type])') as HTMLInputElement;
    } else {
      // Fallback search nearby in DOM
      const inputs = Array.from(document.querySelectorAll('input'));
      const idx = inputs.indexOf(passwordInput);
      if (idx > 0) {
        const prev = inputs[idx - 1];
        if (prev.type === 'text' || prev.type === 'email') {
          usernameInput = prev;
        }
      }
    }

    // 2. Autofill fields using React/JS framework-safe custom events
    if (usernameInput && username) {
      usernameInput.value = username;
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
      usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

    console.log('Sphynx: Credentials successfully filled.');

    // 3. SECURELY PURGE plaintext password from content script memory instantly
    response.data.password = '';
    response.data.username = '';

    // 4. Handle Optional Auto-Login / Submission
    // Trigger submission after a small safety delay so the user sees the fill
    setTimeout(() => {
      if (parentForm) {
        const submitBtn = parentForm.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
        if (submitBtn) {
          submitBtn.click();
        } else {
          parentForm.submit();
        }
        console.log('Sphynx: Triggered auto-login form submission.');
      }
    }, 600);
  });
}

// Start observing the page immediately
scanForPasswordInputs();

// Set up MutationObserver to detect dynamically loaded forms (SPA support)
const observer = new MutationObserver(() => {
  scanForPasswordInputs();
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for fill requests from the Extension Popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FILL_ACTIVE_TAB') {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    if (passwordInputs.length > 0) {
      performSecureAutofill(passwordInputs[0] as HTMLInputElement, message.entryId);
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, error: 'No password input fields detected on this page.' });
    }
  }
  return true; // Keep response channel open
});

// Broadcast extension ID to Sphynx frontend for auto-syncing
if (window.location.origin === 'http://localhost:3000') {
  // Wait slightly to ensure page listeners are ready
  setTimeout(() => {
    window.postMessage({ type: 'SPHYNX_EXTENSION_DETECTED', extensionId: chrome.runtime.id }, '*');
  }, 1000);
}

console.log('Sphynx content script active: Form scanning initiated.');
