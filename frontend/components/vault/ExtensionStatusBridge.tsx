'use client';

import { useEffect } from 'react';
import { useExtensionStatusStore } from '../../store/useExtensionStatusStore';
import { useDialogStore } from '../../store/useDialogStore';

const PING_INTERVAL_MS = 3000;
const UNAVAILABLE_AFTER_MS = 10000;

/**
 * Listens for extension postMessage pings and vault status updates.
 */
export function ExtensionStatusBridge() {
  const setFromPing = useExtensionStatusStore((s) => s.setFromPing);
  const markUnavailable = useExtensionStatusStore((s) => s.markUnavailable);
  const openAutofillLockedModal = useDialogStore((s) => s.openAutofillLockedModal);

  useEffect(() => {
    let lastPingAt = Date.now();

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data?.type === 'SPHYNX_EXTENSION_DETECTED') {
        lastPingAt = Date.now();
        setFromPing({
          extensionId: event.data.extensionId,
          isUnlocked: event.data.isUnlocked,
        });
      }

      if (event.data?.type === 'SPHYNX_VAULT_STATUS') {
        lastPingAt = Date.now();
        setFromPing({
          extensionId: event.data.extensionId,
          isUnlocked: event.data.isUnlocked,
        });
      }

      if (event.data?.type === 'SPHYNX_AUTOFILL_LOCKED') {
        openAutofillLockedModal();
      }
    };

    window.addEventListener('message', onMessage);

    const ping = () => {
      window.postMessage({ type: 'SPHYNX_PING_EXTENSION' }, '*');
    };

    ping();
    const pingInterval = setInterval(ping, PING_INTERVAL_MS);

    const watchdog = setInterval(() => {
      if (Date.now() - lastPingAt > UNAVAILABLE_AFTER_MS) {
        markUnavailable();
      }
    }, PING_INTERVAL_MS);

    return () => {
      window.removeEventListener('message', onMessage);
      clearInterval(pingInterval);
      clearInterval(watchdog);
    };
  }, [setFromPing, markUnavailable, openAutofillLockedModal]);

  return null;
}
