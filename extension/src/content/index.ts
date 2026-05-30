import { showSavePrompt } from './savePrompt';

// ============================================================
// EXTENSION CONTEXT GUARD
// ============================================================

function isContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

// ============================================================
// TYPES
// ============================================================

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

// Save-password detection state
let lastCapturedCredential: CapturedCredential | null = null;
let lastNavigationUrl: string = window.location.href;
let savePromptShownForCredential: string | null = null;

// ============================================================
// CREDENTIAL PERSISTENCE (via background worker message passing)
// Content scripts cannot access chrome.storage.session directly.
// ============================================================

/**
 * Store captured credential via background worker.
 * Background has access to chrome.storage.session.
 */
function storePendingCredential(cred: CapturedCredential): void {
  if (!isContextValid()) return;
  chrome.runtime.sendMessage({
    type: 'STORE_PENDING_CREDENTIAL',
    payload: cred
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn('[Sphynx] Failed to store pending credential:', chrome.runtime.lastError.message);
      return;
    }
    console.log('[Sphynx] Pending credential stored:', cred.hostname, cred.username);
  });
}

/**
 * Retrieve pending credential from background worker.
 * Called on new page load to check if credentials were captured before navigation.
 */
function checkPendingCredential(): void {
  if (!isContextValid()) return;
  chrome.runtime.sendMessage({ type: 'GET_PENDING_CREDENTIAL' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[Sphynx] Failed to get pending credential:', chrome.runtime.lastError.message);
      return;
    }
    if (!response?.success || !response.data) return;

    const pending = response.data as CapturedCredential;
    console.log('[Sphynx] Pending credential restored:', pending.hostname, pending.username);

    // Only process if captured recently (within 60 seconds)
    const age = Date.now() - pending.timestamp;
    if (age > 60000) {
      console.log('[Sphynx] Pending credential expired (age:', age, 'ms)');
      return;
    }

    // Detect successful login: check if we navigated away from login page
    const currentPath = window.location.pathname.toLowerCase();
    const loginIndicators = ['/login', '/signin', '/sign-in', '/auth', '/authenticate'];
    const stillOnLoginPage = window.location.hostname === pending.hostname &&
      loginIndicators.some(ind => currentPath.includes(ind));

    if (stillOnLoginPage) {
      console.log('[Sphynx] Still on login page, likely failed login. Skipping prompt.');
      return;
    }

    console.log('[Sphynx] Login success detected — navigated away from login page');
    lastCapturedCredential = pending;
    checkForSuccessfulLogin();
  });
}

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
    border: 1.5px solid rgba(232, 160, 32, 0.2);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(232, 160, 32, 0.05);
    z-index: 2147483647;
    margin-top: 5px;
    display: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #F0E6D0;
    padding: 6px;
    animation: slideDown 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .sphynx-dropdown-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: rgba(232, 160, 32, 0.65); padding: 6px 8px; border-bottom: 1px solid rgba(42, 30, 16, 0.5); }
  .sphynx-dropdown-item { padding: 8px 10px; font-size: 12px; border-radius: 6px; cursor: pointer; display: flex; flex-direction: column; gap: 2px; transition: background 0.15s ease; }
  .sphynx-dropdown-item:hover { background: rgba(232, 160, 32, 0.1); }
  .sphynx-item-label { font-weight: 600; color: #F0E6D0; }
  .sphynx-item-sub { font-size: 10px; color: #9A7D5A; }
  .sphynx-dropdown-empty { padding: 12px; text-align: center; font-size: 11px; color: #9A7D5A; line-height: 1.4; }
  .sphynx-dropdown-empty a { color: #E8A020; text-decoration: none; font-weight: 600; }
`;

// ============================================================
// LOGIN FORM DETECTION
// ============================================================

function isUsernameField(input: HTMLInputElement): boolean {
  const type = input.type.toLowerCase();
  if (type === 'email' || type === 'text' || type === 'tel') {
    const indicators = ['user', 'email', 'login', 'account', 'name', 'id', 'phone'];
    const fieldStr = `${input.name} ${input.id} ${input.placeholder} ${input.autocomplete}`.toLowerCase();
    return indicators.some(ind => fieldStr.includes(ind)) || type === 'email';
  }
  return false;
}

function findAssociatedUsername(passwordInput: HTMLInputElement): HTMLInputElement | null {
  const form = passwordInput.closest('form');
  if (form) {
    const inputs = Array.from(form.querySelectorAll('input'));
    for (const input of inputs) {
      if (input !== passwordInput && isUsernameField(input as HTMLInputElement)) {
        return input as HTMLInputElement;
      }
    }
    for (const input of inputs) {
      if (input === passwordInput) break;
      const type = (input as HTMLInputElement).type.toLowerCase();
      if (type === 'text' || type === 'email') return input as HTMLInputElement;
    }
  }
  const allInputs = Array.from(document.querySelectorAll('input'));
  const pwIdx = allInputs.indexOf(passwordInput);
  if (pwIdx > 0) {
    for (let i = pwIdx - 1; i >= Math.max(0, pwIdx - 3); i--) {
      const input = allInputs[i] as HTMLInputElement;
      if (isUsernameField(input) || input.type === 'text' || input.type === 'email') return input;
    }
  }
  return null;
}

function captureCredentials(passwordInput: HTMLInputElement): CapturedCredential | null {
  const password = passwordInput.value;
  if (!password || password.length < 1) return null;

  const usernameInput = findAssociatedUsername(passwordInput);
  const username = usernameInput?.value || '';
  if (!username) return null;

  const form = passwordInput.closest('form');
  if (form) {
    const passwordFields = form.querySelectorAll('input[type="password"]');
    if (passwordFields.length > 2) return null;
  }

  return { username, password, hostname: window.location.hostname, timestamp: Date.now() };
}

// ============================================================
// FORM SUBMIT HANDLER
// ============================================================

function handleFormSubmit(event: Event) {
  const form = event.target as HTMLFormElement;
  const passwordInputs = form.querySelectorAll('input[type="password"]');
  if (passwordInputs.length === 0) return;

  let targetPassword: HTMLInputElement | null = null;
  for (const pw of passwordInputs) {
    const input = pw as HTMLInputElement;
    if (input.value && input.offsetParent !== null) { targetPassword = input; break; }
  }
  if (!targetPassword) return;

  const captured = captureCredentials(targetPassword);
  if (captured) {
    lastCapturedCredential = captured;
    storePendingCredential(captured);
    console.log('[Sphynx] Form submitted — credentials captured:', captured.hostname, captured.username);
  }
}

// ============================================================
// SAVE PROMPT LOGIC
// ============================================================

function checkForSuccessfulLogin() {
  if (!lastCapturedCredential) return;

  const age = Date.now() - lastCapturedCredential.timestamp;
  if (age > 60000) {
    lastCapturedCredential = null;
    return;
  }

  const credKey = `${lastCapturedCredential.hostname}:${lastCapturedCredential.username}`;
  if (savePromptShownForCredential === credKey) return;
  savePromptShownForCredential = credKey;

  const credential = lastCapturedCredential;
  console.log('[Sphynx] Checking save prompt for:', credential.hostname, credential.username);

  if (!isContextValid()) {
    triggerSavePrompt(credential, 'save', undefined, undefined);
    return;
  }

  chrome.runtime.sendMessage({
    type: 'CHECK_SAVE_CREDENTIAL',
    payload: { hostname: credential.hostname, username: credential.username }
  }, (response) => {
    if (chrome.runtime.lastError || !response?.success) {
      triggerSavePrompt(credential, 'save', undefined, undefined);
      return;
    }

    const { action, existingEntryId, existingLabel } = response.data;
    if (action === 'ignored') {
      console.log('[Sphynx] Domain ignored, skipping.');
      return;
    }
    triggerSavePrompt(credential, action, existingEntryId, existingLabel);
  });
}

function triggerSavePrompt(credential: CapturedCredential, action: string, existingEntryId?: string, existingLabel?: string) {
  console.log('[Sphynx] Save prompt displayed:', credential.hostname, credential.username, 'mode:', action);

  showSavePrompt({
    hostname: credential.hostname,
    username: credential.username,
    password: credential.password,
    mode: action === 'update' ? 'update' : 'save',
    existingEntryId,
    existingLabel,
    onSave: () => {
      if (!isContextValid()) return;
      chrome.runtime.sendMessage({
        type: 'SAVE_CREDENTIAL',
        payload: { hostname: credential.hostname, username: credential.username, password: credential.password, label: credential.hostname }
      }, (res) => { console.log('[Sphynx] Save result:', res?.success ? 'OK' : res?.error); });
    },
    onUpdate: () => {
      if (!isContextValid() || !existingEntryId) return;
      chrome.runtime.sendMessage({
        type: 'UPDATE_CREDENTIAL',
        payload: { entryId: existingEntryId, password: credential.password }
      }, (res) => { console.log('[Sphynx] Update result:', res?.success ? 'OK' : res?.error); });
    },
    onDismiss: () => { console.log('[Sphynx] Save prompt dismissed.'); },
    onNeverForSite: () => {
      if (!isContextValid()) return;
      chrome.runtime.sendMessage({ type: 'IGNORE_DOMAIN', payload: { hostname: credential.hostname } });
      console.log('[Sphynx] Domain ignored:', credential.hostname);
    }
  });

  lastCapturedCredential = null;
}

// ============================================================
// SPA NAVIGATION DETECTION
// ============================================================

function setupNavigationDetection() {
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
  window.addEventListener('load', () => { setTimeout(checkForSuccessfulLogin, 500); });
}

function onNavigationChange() {
  const currentUrl = window.location.href;
  if (currentUrl !== lastNavigationUrl) {
    lastNavigationUrl = currentUrl;
    setTimeout(checkForSuccessfulLogin, 800);
  }
}

// ============================================================
// AUTOFILL BADGE SYSTEM
// ============================================================

function scanForPasswordInputs() {
  if (!isContextValid()) return;
  const inputs = document.querySelectorAll('input[type="password"]');
  inputs.forEach((element) => {
    const input = element as HTMLInputElement;
    if (!activeBadgeContainers.has(input)) injectAutofillBadge(input);
  });
}

function injectAutofillBadge(passwordInput: HTMLInputElement) {
  const badgeContainer = document.createElement('div');
  badgeContainer.style.cssText = 'position:absolute;z-index:2147483646;pointer-events:none;';
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
    if (!document.body.contains(passwordInput)) { badgeContainer.remove(); activeBadgeContainers.delete(passwordInput); return; }
    const rect = passwordInput.getBoundingClientRect();
    badgeContainer.style.left = `${rect.left + window.scrollX + rect.width - 28}px`;
    badgeContainer.style.top = `${rect.top + window.scrollY + (rect.height - 20) / 2}px`;
  };

  reposition();
  activeBadgeContainers.set(passwordInput, badgeContainer);
  window.addEventListener('resize', reposition);
  document.addEventListener('scroll', reposition, true);

  badge.addEventListener('click', (e) => { e.stopPropagation(); showAutofillDropdown(passwordInput, shadow); });
}

function showAutofillDropdown(passwordInput: HTMLInputElement, shadow: ShadowRoot) {
  if (activeDropdown) { activeDropdown.remove(); activeDropdown = null; }
  const dropdown = document.createElement('div');
  dropdown.className = 'sphynx-dropdown';
  dropdown.style.display = 'block';

  chrome.runtime.sendMessage({ type: 'GET_ENTRIES' }, (response) => {
    if (!response?.success) {
      dropdown.innerHTML = '<div class="sphynx-dropdown-empty">🔒 Vault is locked.<br>Open the <strong>Sphynx extension</strong> to unlock.</div>';
    } else {
      const entries = response.data || [];
      const host = window.location.hostname.toLowerCase();
      const relevant = entries.filter((e: any) => { const l = e.label.toLowerCase(); const u = (e.url || '').toLowerCase(); return l.includes(host) || host.includes(l.split('.')[0]) || u.includes(host); });
      const display = relevant.length > 0 ? relevant : entries;

      if (display.length === 0) {
        dropdown.innerHTML = '<div class="sphynx-dropdown-title">Sphynx Vault</div><div class="sphynx-dropdown-empty">No entries found.</div>';
      } else {
        dropdown.innerHTML = '<div class="sphynx-dropdown-title">Select Account</div>';
        display.forEach((entry: any) => {
          const item = document.createElement('div');
          item.className = 'sphynx-dropdown-item';
          item.innerHTML = `<span class="sphynx-item-label">${entry.label}</span><span class="sphynx-item-sub">${entry.username || 'No username'}</span>`;
          item.addEventListener('click', (ev) => { ev.stopPropagation(); performSecureAutofill(passwordInput, entry.id); dropdown.remove(); activeDropdown = null; });
          dropdown.appendChild(item);
        });
      }
    }
  });

  shadow.appendChild(dropdown);
  activeDropdown = dropdown;
  const dismiss = (e: MouseEvent) => { if (activeDropdown && !dropdown.contains(e.target as Node)) { dropdown.remove(); activeDropdown = null; document.removeEventListener('click', dismiss); } };
  document.addEventListener('click', dismiss);
}

function performSecureAutofill(passwordInput: HTMLInputElement, entryId: string) {
  chrome.runtime.sendMessage({ type: 'GET_CREDENTIALS', payload: { entryId, hostname: window.location.hostname } }, (response) => {
    if (!response?.success || !response.data) return;
    const { username, password } = response.data;
    const form = passwordInput.closest('form');
    let usernameInput: HTMLInputElement | null = null;
    if (form) usernameInput = form.querySelector('input[type="text"], input[type="email"]') as HTMLInputElement;
    if (usernameInput && username) setNativeValue(usernameInput, username);
    setNativeValue(passwordInput, password);
    console.log('[Sphynx] Credentials filled.');
    response.data.password = '';
    response.data.username = '';
  });
}

function setNativeValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  if (setter) setter.call(input, value); else input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// ============================================================
// FORM SUBMIT LISTENERS
// ============================================================

function attachFormListeners() {
  document.querySelectorAll('form').forEach((form) => {
    if (!(form as any).__sphynxAttached) {
      form.addEventListener('submit', handleFormSubmit, true);
      (form as any).__sphynxAttached = true;
    }
  });
}

// Global button click capture
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const button = target.closest('button[type="submit"], input[type="submit"], button:not([type])');
  if (button) {
    const form = button.closest('form');
    if (form) {
      const pws = form.querySelectorAll('input[type="password"]');
      for (const pw of pws) {
        const input = pw as HTMLInputElement;
        if (input.value) {
          const captured = captureCredentials(input);
          if (captured) { lastCapturedCredential = captured; storePendingCredential(captured); console.log('[Sphynx] Button click — captured:', captured.hostname, captured.username); }
          break;
        }
      }
    }
  }
}, true);

// Global Enter key capture
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const target = e.target as HTMLInputElement;
    if (target?.type === 'password' && target.value) {
      const captured = captureCredentials(target);
      if (captured) { lastCapturedCredential = captured; storePendingCredential(captured); console.log('[Sphynx] Enter key — captured:', captured.hostname, captured.username); }
    }
  }
}, true);

// ============================================================
// INITIALIZATION
// ============================================================

scanForPasswordInputs();
attachFormListeners();
setupNavigationDetection();

// Check for pending credentials from previous page navigation
setTimeout(checkPendingCredential, 800);

// MutationObserver for dynamic forms
const observer = new MutationObserver(() => {
  if (!isContextValid()) { observer.disconnect(); return; }
  scanForPasswordInputs();
  attachFormListeners();
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for autofill requests from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'FILL_ACTIVE_TAB') {
    const pws = document.querySelectorAll('input[type="password"]');
    if (pws.length > 0) { performSecureAutofill(pws[0] as HTMLInputElement, message.entryId); sendResponse({ success: true }); }
    else sendResponse({ success: false, error: 'No password fields found.' });
  }
  return true;
});

// Extension ID broadcast for Sphynx frontend
if (window.location.origin === 'http://localhost:3000') {
  const broadcast = () => { window.postMessage({ type: 'SPHYNX_EXTENSION_DETECTED', extensionId: chrome.runtime.id }, '*'); };
  setTimeout(broadcast, 500);
  let lastUrl = window.location.href;
  const navObs = new MutationObserver(() => { if (window.location.href !== lastUrl) { lastUrl = window.location.href; setTimeout(broadcast, 300); } });
  navObs.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('message', (event) => { if (event.data?.type === 'SPHYNX_PING_EXTENSION') broadcast(); });
}

console.log('[Sphynx] Content script active: Form scanning + credential capture initialized.');
