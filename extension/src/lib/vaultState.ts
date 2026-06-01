/**
 * Single source of truth for extension vault lock state (chrome.storage.local).
 * Survives service-worker restarts better than in-memory kVault alone.
 */

export const VAULT_STATE_KEY = 'sphynx_vault_state';

export interface SphynxVaultState {
  isUnlocked: boolean;
  address: string | null;
  hasKeyMaterial: boolean;
  updatedAt: number;
}

export async function readVaultState(): Promise<SphynxVaultState | null> {
  const data = await chrome.storage.local.get(VAULT_STATE_KEY);
  const raw = data[VAULT_STATE_KEY] as SphynxVaultState | undefined;
  return raw ?? null;
}

export async function persistVaultState(partial: {
  isUnlocked: boolean;
  address?: string | null;
  hasKeyMaterial?: boolean;
}): Promise<SphynxVaultState> {
  const prev = await readVaultState();
  const next: SphynxVaultState = {
    isUnlocked: partial.isUnlocked,
    address: partial.address !== undefined ? partial.address : (prev?.address ?? null),
    hasKeyMaterial:
      partial.hasKeyMaterial !== undefined
        ? partial.hasKeyMaterial
        : (prev?.hasKeyMaterial ?? false),
    updatedAt: Date.now(),
  };
  await chrome.storage.local.set({ [VAULT_STATE_KEY]: next });
  return next;
}
