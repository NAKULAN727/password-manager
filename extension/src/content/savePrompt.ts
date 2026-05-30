/**
 * Save Prompt UI — Injected into the page via Shadow DOM.
 * Premium glassmorphism notification that slides in from bottom-right.
 */

const PROMPT_STYLES = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(20px) scale(0.95); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateY(0) scale(1); }
    to { opacity: 0; transform: translateY(20px) scale(0.95); }
  }

  .sphynx-save-prompt {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 340px;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    animation: slideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .sphynx-save-prompt.closing {
    animation: slideOut 0.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  }

  .sphynx-prompt-card {
    background: rgba(20, 16, 9, 0.95);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(232, 160, 32, 0.15);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(232, 160, 32, 0.05);
    padding: 20px;
    color: #F0E6D0;
  }

  .sphynx-prompt-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .sphynx-prompt-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(232, 160, 32, 0.1);
    border: 1px solid rgba(232, 160, 32, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sphynx-prompt-icon svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: #E8A020;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .sphynx-prompt-title {
    font-size: 14px;
    font-weight: 700;
    color: #F0E6D0;
    margin: 0;
  }

  .sphynx-prompt-subtitle {
    font-size: 11px;
    color: #9A7D5A;
    margin: 0;
    margin-top: 2px;
  }

  .sphynx-prompt-details {
    background: rgba(10, 8, 6, 0.6);
    border: 1px solid #2A1E10;
    border-radius: 10px;
    padding: 12px;
    margin-bottom: 16px;
  }

  .sphynx-detail-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .sphynx-detail-row + .sphynx-detail-row {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #2A1E10;
  }

  .sphynx-detail-label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9A7D5A;
    min-width: 55px;
  }

  .sphynx-detail-value {
    font-size: 12px;
    color: #F0E6D0;
    font-family: monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sphynx-prompt-actions {
    display: flex;
    gap: 8px;
  }

  .sphynx-btn {
    flex: 1;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .sphynx-btn-primary {
    background: linear-gradient(135deg, #E8A020, #B86A1A);
    color: #0A0806;
  }
  .sphynx-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 15px rgba(232, 160, 32, 0.3);
  }

  .sphynx-btn-secondary {
    background: transparent;
    border: 1px solid #2A1E10;
    color: #9A7D5A;
  }
  .sphynx-btn-secondary:hover {
    border-color: rgba(232, 160, 32, 0.3);
    color: #F0E6D0;
  }

  .sphynx-btn-danger {
    background: transparent;
    border: 1px solid rgba(204, 74, 58, 0.2);
    color: #CC4A3A;
    font-size: 10px;
    padding: 8px 10px;
  }
  .sphynx-btn-danger:hover {
    border-color: rgba(204, 74, 58, 0.5);
    background: rgba(204, 74, 58, 0.05);
  }

  .sphynx-prompt-footer {
    margin-top: 10px;
    text-align: center;
  }
`;

export interface SavePromptOptions {
  hostname: string;
  username: string;
  password: string;
  mode: 'save' | 'update';
  existingEntryId?: string;
  existingLabel?: string;
  onSave: () => void;
  onUpdate: () => void;
  onDismiss: () => void;
  onNeverForSite: () => void;
}

let activePromptContainer: HTMLDivElement | null = null;

/**
 * Shows the save credential prompt in the page.
 */
export function showSavePrompt(options: SavePromptOptions): void {
  // Remove any existing prompt
  dismissSavePrompt();

  const container = document.createElement('div');
  container.id = 'sphynx-save-prompt-host';
  container.style.position = 'fixed';
  container.style.zIndex = '2147483647';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '0';
  container.style.height = '0';
  container.style.overflow = 'visible';
  document.body.appendChild(container);

  const shadow = container.attachShadow({ mode: 'closed' });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = PROMPT_STYLES;
  shadow.appendChild(style);

  // Build prompt
  const prompt = document.createElement('div');
  prompt.className = 'sphynx-save-prompt';

  const isUpdate = options.mode === 'update';

  prompt.innerHTML = `
    <div class="sphynx-prompt-card">
      <div class="sphynx-prompt-header">
        <div class="sphynx-prompt-icon">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <div>
          <p class="sphynx-prompt-title">${isUpdate ? 'Update Credential?' : 'Save to Sphynx?'}</p>
          <p class="sphynx-prompt-subtitle">${isUpdate ? 'Password changed for this account' : 'New login detected'}</p>
        </div>
      </div>

      <div class="sphynx-prompt-details">
        <div class="sphynx-detail-row">
          <span class="sphynx-detail-label">Site</span>
          <span class="sphynx-detail-value">${escapeHtml(options.hostname)}</span>
        </div>
        <div class="sphynx-detail-row">
          <span class="sphynx-detail-label">User</span>
          <span class="sphynx-detail-value">${escapeHtml(options.username)}</span>
        </div>
      </div>

      <div class="sphynx-prompt-actions">
        <button class="sphynx-btn sphynx-btn-primary" id="sphynx-save-btn">
          ${isUpdate ? 'Update' : 'Save'}
        </button>
        <button class="sphynx-btn sphynx-btn-secondary" id="sphynx-dismiss-btn">
          Not Now
        </button>
      </div>

      <div class="sphynx-prompt-footer">
        <button class="sphynx-btn sphynx-btn-danger" id="sphynx-never-btn">
          Never For This Site
        </button>
      </div>
    </div>
  `;

  shadow.appendChild(prompt);
  activePromptContainer = container;

  // Bind events
  const saveBtn = shadow.getElementById('sphynx-save-btn');
  const dismissBtn = shadow.getElementById('sphynx-dismiss-btn');
  const neverBtn = shadow.getElementById('sphynx-never-btn');

  saveBtn?.addEventListener('click', () => {
    if (isUpdate) {
      options.onUpdate();
    } else {
      options.onSave();
    }
    animateOut(prompt, container);
  });

  dismissBtn?.addEventListener('click', () => {
    options.onDismiss();
    animateOut(prompt, container);
  });

  neverBtn?.addEventListener('click', () => {
    options.onNeverForSite();
    animateOut(prompt, container);
  });

  // Auto-dismiss after 15 seconds
  setTimeout(() => {
    if (document.body.contains(container)) {
      options.onDismiss();
      animateOut(prompt, container);
    }
  }, 15000);
}

/**
 * Dismisses the active save prompt if one exists.
 */
export function dismissSavePrompt(): void {
  if (activePromptContainer && document.body.contains(activePromptContainer)) {
    activePromptContainer.remove();
    activePromptContainer = null;
  }
}

function animateOut(prompt: HTMLDivElement, container: HTMLDivElement) {
  prompt.classList.add('closing');
  setTimeout(() => {
    container.remove();
    activePromptContainer = null;
  }, 200);
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
