/**
 * Error handling utilities — User-friendly error messages.
 * No technical stack traces exposed to the user.
 */

export interface UserError {
  message: string;
  action?: string; // Suggested action label
  actionType?: 'retry' | 'unlock' | 'reconnect' | 'dismiss';
}

/**
 * Converts raw errors into user-friendly messages.
 */
export function toUserError(error: unknown): UserError {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  // Network errors
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('network')) {
    return {
      message: 'Unable to connect to Sphynx.',
      action: 'Retry',
      actionType: 'retry',
    };
  }

  // Timeout
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return {
      message: 'Connection timed out.',
      action: 'Retry',
      actionType: 'retry',
    };
  }

  // Auth / JWT errors
  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('expired')) {
    return {
      message: 'Session expired.',
      action: 'Reconnect',
      actionType: 'reconnect',
    };
  }

  // Vault locked
  if (lower.includes('vault is locked') || lower.includes('locked')) {
    return {
      message: 'Vault is locked.',
      action: 'Unlock Vault',
      actionType: 'unlock',
    };
  }

  // Decryption failure
  if (lower.includes('decrypt') || lower.includes('tampered') || lower.includes('incorrect key')) {
    return {
      message: 'Decryption failed. Key may have changed.',
      action: 'Re-unlock',
      actionType: 'unlock',
    };
  }

  // Session sync
  if (lower.includes('no active wallet') || lower.includes('not synced') || lower.includes('sync')) {
    return {
      message: 'Extension not connected. Open Sphynx website first.',
      action: 'Reconnect',
      actionType: 'reconnect',
    };
  }

  // Key derivation
  if (lower.includes('derivation') || lower.includes('invalid password')) {
    return {
      message: 'Invalid password. Please try again.',
      actionType: 'dismiss',
    };
  }

  // Generic fallback
  return {
    message: 'Something went wrong. Please try again.',
    action: 'Dismiss',
    actionType: 'dismiss',
  };
}
