import { useDialogStore } from '../store/useDialogStore';

/**
 * Hook for opening Sphynx-styled dialogs instead of native browser prompts.
 */
export function useSphynxDialog() {
  const confirmDeleteSecret = useDialogStore((s) => s.confirmDeleteSecret);
  return { confirmDeleteSecret };
}
