/**
 * Environment configuration for the Sphynx extension.
 * Uses build-time defines injected by esbuild.
 */

declare const __WEB_APP_URL__: string;
declare const __API_URL__: string;

export const CONFIG = {
  WEB_APP_URL: typeof __WEB_APP_URL__ !== 'undefined' ? __WEB_APP_URL__ : 'https://password-manager-sigma-green.vercel.app',
  API_URL: typeof __API_URL__ !== 'undefined' ? __API_URL__ : 'https://password-manager-gg4l.onrender.com/api',
};
