import { showSavePrompt, dismissSavePrompt } from './savePrompt';

// ============================================================
// TYPES
// ============================================================

interface DecryptedCredentials {
  username: string;
  plaintext: string;
}

interface CapturedCredential {
  username: string;
  password: string;
  hostname: string;
  timestamp: number;
}

// ============================================================
// GLOBAL STATE
// ============================================================

let activeBadgeContainers = new Map<HTMLInputElement, HTMLDivElement>();
let activeDropdown: HTMLDivElement | null = null;
let currentInput: HTMLInputElement | null = null;

// Save-password detection state
let lastCapturedCredential: CapturedCredential | null = null;
let lastNavigationUrl: string = window.location.href;
let savePromptShownForCredential: string | null = null;

// ============================================================
// AUTOFILL BADGE STYLES (Shadow DOM)
// ============================================================

const SHADOW_STYLE = `
  .sphynx-badge-trigger {
    width: 20px;
    height: 20px;
    cursor: pointer;
    background: linear-gradient(135deg, #E8A020 0%, #B86A1A 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 8px rgba(232, 160, 32, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }
  .sphynx-badge-trigger:hover {
    transform: scale(1.15);
    box-shadow: 0 0 12px rgba(232, 160, 32, 0.7);
  }
  .sphynx-badge-icon {
    width: 10px;
    height: 10px;
    border: 1.5px solid #0A0806;
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
    background-color: #0A0806;
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
    background: rgba(20, 16, 9, 0.95);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1.5px solid rgba(232, 160, 32, 0.2);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(232, 160, 32, 0.05);
    z-index: 2147483647;
    margin-top: 5px;
    display: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #F0E6D0;
    padding: 6px;
    animation: slideDown 0.2s cubic-bezier(0.22, 1, 0.36, 1);
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
    color: rgba(232, 160, 32, 0.65);
    padding: 6px 8px;
    border-bottom: 1px solid rgba(42, 30, 16, 0.5);
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
    background: rgba(232, 160, 32, 0.1);
  }

  .sphynx-item-label {
    font-weight: 600;
    color: #F0E6D0;
  }

  .sphynx-item-sub {
    font-size: 10px;
    color: #9A7D5A;
  }

  .sphynx-dropdown-empty {
    padding: 12px;
    text-align: center;
    font-size: 11px;
    color: #9A7D5A;
    line-height: 1.4;
  }

  .sphynx-dropdown-empty a {
    color: #E8A020;
    text-decoration: none;
    font-weight: 600;
  }
`;

// ============================================================
// LOGIN FORM DETECTION
// ============================================================

/**
 * Detects if an input is likely a username/email field.
 */
function isUsernameField(input: HTMLInputElement): boolean {
  const type = input.type.toLowerCase();
  if (type === 'email' || type === 'text' || type === 'tel') {
    const indicators = ['user', 'email', 'login', 'account', 'name', 'id', 'phone'];
    const fieldStr = `${input.name} ${input.id} ${input.placeholder} ${input.autocomplete}`.toLowerCase();
    return indicators.some(ind => fieldStr.includes(ind)) || type === 'email';
  }
  return false;
}

/**
 * Detects if an input is a password field.
 */
function isPasswordField(input: HTMLInputElement): boolean {
  return input.type === 'password';
}

/**
 * Finds the username field associated with a password field.
 */
function findAssociatedUsername(passwordInput: HTMLInputElement): HTMLInputElement | null {
  // Check within the same form
  const form = passwordInput.closest('form');
  if (form) {
    const inputs = Array.from(form.querySelectorAll('input'));
    for (const input of inputs) {
      if (input !== passwordInput && isUsernameField(input as HTMLInputElement)) {
        return input as HTMLInputElement;
      }
    }
    // Fallback: first text/email input before the password
    for (const input of inputs) {
      if (input === passwordInput) break;
      const type = (input as HTMLInputElement).type.toLowerCase();
      if (type === 'text' || type === 'email') {
        return input as HTMLInputElement;
      }
    }
  }

  // No form: search nearby in DOM
  const allInputs = Array.from(document.querySelectorAll('input'));
  const pwIdx = allInputs.indexOf(passwordInput);
  if (pwIdx > 0) {
    for (let i = pwIdx - 1; i >= Math.max(0, pwIdx - 3); i--) {
      const input = allInputs[i] as HTMLInputElement;
      if (isUsernameField(input) || input.type === 'text' || input.type === 'email') {
        return input;
      }
    }
  }

  return null;
}

/**
 * Captures credentials from a form submission or navigation.
 */
function captureCredentials(passwordInput: HTMLInputElement): CapturedCredential | null {
  const password = passwordInput.value;
  if (!password || password.length < 1) return null;

  const usernameInput = findAssociatedUsername(passwordInput);
  const username = usernameInput?.value || '';

  // Skip if no username (likely not a login form)
  if (!username) return null;

  // Skip if this looks like a registration form (multiple password fields)
  const form = passwordInput.closest('form');
  if (form) {
    const passwordFields = form.querySelectorAll('input[type="password"]');
    if (passwordFields.length > 2) return null; // Likely registration with confirm
  }

  return {
    username,
    password,
    hostname: window.location.hostname,
    timestamp: Date.now()
  };
}

/**
 * Determines if a form submission likely represents a successful login.
 * We capture on submit and then verify via navigation/page change.
 */
function handleFormSubmit(event: Event) {
  const form = event.target as HTMLFormElement;
  const passwordInputs = form.querySelectorAll('input[type="password"]');

  if (passwordInputs.length === 0) return;

  // Use the first visible password field
  let targetPassword: HTMLInputElement | null = null;
  for (const pw of passwordInputs) {
    const input = pw as HTMLInputElement;
    if (input.value && input.offsetParent !== null) {
      targetPassword = input;
      break;
    }
  }

  if (!targetPassword) return;

  const captured = captureCredentials(targetPassword);
  if (captured) {
    lastCapturedCredential = captured;
    console.log('[Sphynx] Credentials captured on form submit:', captured.hostname, captured.username);
  }
}

/**
 * Monitors for successful login by detecting page navigation or URL changes.
 * Shows save prompt after navigation (indicating successful login).
 */
function checkForSuccessfulLogin() {
  if (!lastCapturedCredential) return;

  // Only show prompt if credentials were captured recently (within 10s)
  const age = Date.now() - lastCapturedCredential.timestamp;
  if (age > 10000) {
    lastCapturedCredential = null;
    return;
  }

  // Avoid showing duplicate prompts for the same credential
  const credKey = `${lastCapturedCredential.hostname}:${lastCapturedCredential.username}`;
  if (savePromptShownForCredential === credKey) return;
  savePromptShownForCredential = credKey;

  const credential = lastCapturedCredential;

  // Ask background if we should show save prompt
  chrome.runtime.sendMessage({
    type: 'CHECK_SAVE_CREDENTIAL',
    payload: {
      hostname: credential.hostname,
      username: credential.username
    }
  }, (response) => {
    if (!response || !response.success) return;

    const { action, existingEntryId, existingLabel } = response.data;

    if (action === 'ignored') {
      console.log('[Sphynx] Domain is in ignore list, skipping save prompt.');
      return;
    }

    showSavePrompt({
      hostname: credential.hostname,
      username: credential.username,
      password: credential.password,
      mode: action === 'update' ? 'update' : 'save',
      existingEntryId,
      existingLabel,
      onSave: () => {
        chrome.runtime.sendMessage({
          type: 'SAVE_CREDENTIAL',
          payload: {
            hostname: credential.hostname,
            username: credential.username,
            password: credential.password,
            label: credential.hostname
          }
        }, (res) => {
          if (res?.success) {
            console.log('[Sphynx] Credential saved successfully.');
          } else {
            console.error('[Sphynx] Save failed:', res?.error);
          }
        });
      },
      onUpdate: () => {
        if (existingEntryId) {
          chrome.runtime.sendMessage({
            type: 'UPDATE_CREDENTIAL',
            payload: {
              entryId: existingEntryId,
              password: credential.password
            }
          }, (res) => {
            if (res?.success) {
              console.log('[Sphynx] Credential updated successfully.');
            } else {
              console.error('[Sphynx] Update failed:', res?.error);
            }
          });
        }
      },
      onDismiss: () => {
        console.log('[Sphynx] Save prompt dismissed.');
      },
      onNeverForSite: () => {
        chrome.runtime.sendMessage({
          type: 'IGNORE_DOMAIN',
          payload: { hostname: credential.hostname }
        });
      }
    });

    // Clear captured credential after showing prompt
    lastCapturedCredential = null;
  });
}

// ============================================================
// SPA NAVIGATION DETECTION
// ============================================================

/**
 * Detects URL changes for SPA navigation (pushState, replaceState, popstate).
 */
function setupNavigationDetection() {
  // Override pushState and replaceState
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    originalPushState.apply(this, args);
    onNavigationChange();
  };

  history.replaceState = function (...args) {
    originalReplaceState.apply(this, args);
    onNavigationChange();
  };

  window.addEventListener('popstate', onNavigationChange);

  // Also detect full page loads
  window.addEventListener('load', () => {
    setTimeout(checkForSuccessfulLogin, 500);
  });
}

function onNavigationChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastNavigationUrl) {
    lastNavigationUrl = currentUrl;
    // Delay to allow page to settle
    setTimeout(checkForSuccessfulLogin, 800);
  }
}

// ============================================================
// AUTOFILL BADGE SYSTEM (existing functionality)
// ============================================================

function scanForPasswordInputs() {
  const inputs = document.querySelectorAll('input[type="password"]');
  inputs.forEach((element) => {
    const input = element as HTMLInputElement;
    if (!activeBadgeContainers.has(input)) {
      injectAutofillBadge(input);
    }
  });
}

function injectAutofillBadge(passwordInput: HTMLInputElement) {
  const badgeContainer = document.createElement('div');
  badgeContainer.style.position = 'absolute';
  badgeContainer.style.zIndex = '2147483646';
  badgeContainer.style.pointerEvents = 'none';

  document.body.appendChild(badgeContainer);

  const shadow = badgeContainer.attachShadow({ mode: 'closed' });

  const styleTag = document.createElement('style');
  styleTag.textContent = SHADOW_STYLE;
  shadow.appendChild(styleTag);

  const badge = document.createElement('div');
  badge.className = 'sphynx-badge-trigger';
  badge.style.pointerEvents = 'auto';

  const icon = document.createElement('div');
  icon.className = 'sphynx-badge-icon';
  badge.appendChild(icon);
  shadow.appendChild(badge);

  const reposition = () => {
    if (!document.body.contains(passwordInput)) {
      badgeContainer.remove();
      activeBadgeContainers.delete(passwordInput);
      return;
    }

    const rect = passwordInput.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    badgeContainer.style.left = `${rect.left + scrollX + rect.width - 28}px`;
    badgeContainer.style.top = `${rect.top + scrollY + (rect.height - 20) / 2}px`;
  };

  reposition();
  activeBadgeContainers.set(passwordInput, badgeContainer);

  window.addEventListener('resize', reposition);
  document.addEventListener('scroll', reposition, true);

  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    currentInput = passwordInput;
    showAutofillDropdown(passwordInput, shadow);
  });
}

function showAutofillDropdown(passwordInput: HTMLInputElement, shadow: ShadowRoot) {
  if (activeDropdown) {
    activeDropdown.remove();
    activeDropdown = null;
  }

  const dropdown = document.createElement('div');
  dropdown.className = 'sphynx-dropdown';
  dropdown.style.display = 'block';

  chrome.runtime.sendMessage({ type: 'GET_ENTRIES' }, (response) => {
    if (!response || !response.success) {
      dropdown.innerHTML = `
        <div class="sphynx-dropdown-empty">
          🔒 Vault is locked.<br>
          Open the <strong>Sphynx extension</strong> to unlock.
        </div>
      `;
    } else {
      const entries = response.data || [];
      const currentHost = window.location.hostname.toLowerCase();

      const relevantEntries = entries.filter((e: any) => {
        const label = e.label.toLowerCase();
        const url = (e.url || '').toLowerCase();
        return label.includes(currentHost) || currentHost.includes(label.split('.')[0]) || url.includes(currentHost);
      });

      const displayEntries = relevantEntries.length > 0 ? relevantEntries : entries;

      if (displayEntries.length === 0) {
        dropdown.innerHTML = `
          <div class="sphynx-dropdown-title">Sphynx Vault</div>
          <div class="sphynx-dropdown-empty">
            No entries found.<br>
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

  const dismissDropdown = (e: MouseEvent) => {
    if (activeDropdown && !dropdown.contains(e.target as Node)) {
      dropdown.remove();
      activeDropdown = null;
      document.removeEventListener('click', dismissDropdown);
    }
  };
  document.addEventListener('click', dismissDropdown);
}

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

    let usernameInput: HTMLInputElement | null = null;
    const parentForm = passwordInput.closest('form');

    if (parentForm) {
      usernameInput = parentForm.querySelector('input[type="text"], input[type="email"], input:not([type])') as HTMLInputElement;
    } else {
      const inputs = Array.from(document.querySelectorAll('input'));
      const idx = inputs.indexOf(passwordInput);
      if (idx > 0) {
        const prev = inputs[idx - 1];
        if (prev.type === 'text' || prev.type === 'email') {
          usernameInput = prev;
        }
      }
    }

    if (usernameInput && username) {
      setNativeValue(usernameInput, username);
    }

    setNativeValue(passwordInput, password);

    console.log('[Sphynx] Credentials filled successfully.');

    // Purge plaintext from response
    response.data.password = '';
    response.data.username = '';
  });
}

/**
 * Sets input value in a way that triggers React/Vue/Angular change detection.
 */
function setNativeValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// ============================================================
// FORM SUBMIT LISTENERS
// ============================================================

/**
 * Attaches submit listeners to all forms on the page.
 */
function attachFormListeners() {
  const forms = document.querySelectorAll('form');
  forms.forEach((form) => {
    if (!(form as any).__sphynxListenerAttached) {
      form.addEventListener('submit', handleFormSubmit, true);
      (form as any).__sphynxListenerAttached = true;
    }
  });

  // Also listen for button clicks that might submit without form.submit()
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const button = target.closest('button[type="submit"], input[type="submit"]');
    if (button) {
      const form = button.closest('form');
      if (form) {
        const passwordInputs = form.querySelectorAll('input[type="password"]');
        if (passwordInputs.length > 0) {
          for (const pw of passwordInputs) {
            const input = pw as HTMLInputElement;
            if (input.value) {
              const captured = captureCredentials(input);
              if (captured) {
                lastCapturedCredential = captured;
              }
              break;
            }
          }
        }
      }
    }
  }, true);

  // Capture on Enter key in password fields
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      if (target && target.type === 'password' && target.value) {
        const captured = captureCredentials(target);
        if (captured) {
          lastCapturedCredential = captured;
        }
      }
    }
  }, true);
}

// ============================================================
// INITIALIZATION
// ============================================================

// Start autofill badge scanning
scanForPasswordInputs();

// Attach form submit listeners
attachFormListeners();

// Setup SPA navigation detection
setupNavigationDetection();

// MutationObserver for dynamically loaded forms
const observer = new MutationObserver(() => {
  scanForPasswordInputs();
  attachFormListeners();
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
  return true;
});

// Broadcast extension ID to Sphynx frontend for auto-syncing.
// Re-broadcasts periodically to handle SPA navigation (dashboard loads after login).
if (window.location.origin === 'http://localhost:3000') {
  function broadcastExtensionId() {
    window.postMessage({ type: 'SPHYNX_EXTENSION_DETECTED', extensionId: chrome.runtime.id }, '*');
  }

  // Initial broadcast after page settles
  setTimeout(broadcastExtensionId, 500);

  // Re-broadcast on SPA navigation (URL changes without full page reload)
  let lastUrl = window.location.href;
  const navObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(broadcastExtensionId, 300);
    }
  });
  navObserver.observe(document.body, { childList: true, subtree: true });

  // Also listen for explicit requests from the web app
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SPHYNX_PING_EXTENSION') {
      broadcastExtensionId();
    }
  });
}

console.log('[Sphynx] Content script active: Form scanning + credential capture initialized.');
