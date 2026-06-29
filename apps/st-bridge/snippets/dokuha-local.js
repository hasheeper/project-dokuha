const LOCAL_CACHE_KEY = 'dokuha-local-10';

const loaderUrl = new URL('../dokuha-bridge-loader.js', import.meta.url);
loaderUrl.searchParams.set('env', 'local');
loaderUrl.searchParams.set('force', '1');
loaderUrl.searchParams.set('v', LOCAL_CACHE_KEY);

await import(loaderUrl.href);
