/**
 * Hosted Project DOKUHA SillyTavern loader entry.
 *
 * Import this from JS-Slash-Runner:
 *   import 'http://127.0.0.1:4173/apps/st-bridge/dokuha-bridge-loader.js?env=local&force=1&v=dev';
 */
const CURRENT_URL = new URL(import.meta.url);
const APP_BASE_URL = new URL('../..', CURRENT_URL);
const LOADER_URL = new URL('ST/dokuha-bridge-loader.js', APP_BASE_URL);

for (const [key, value] of CURRENT_URL.searchParams.entries()) {
  LOADER_URL.searchParams.set(key, value);
}

LOADER_URL.searchParams.set('appBase', APP_BASE_URL.href.replace(/\/+$/, ''));

const REQUESTED_ENV = CURRENT_URL.searchParams.get('env') || CURRENT_URL.searchParams.get('mode');
if (REQUESTED_ENV) window.DOKUHA_LOADER_ENV = REQUESTED_ENV;

await import(LOADER_URL.href);
