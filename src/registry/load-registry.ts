import type { DokuhaRegistry, DokuhaRegistryApp } from '../protocol/messages';

export async function loadRegistry(registryUrl = './registry/apps.json'): Promise<DokuhaRegistry> {
  const response = await fetch(registryUrl, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Failed to load registry: HTTP ${response.status}`);
  const registry = (await response.json()) as DokuhaRegistry;
  if (!registry.apps || typeof registry.apps !== 'object') {
    throw new Error('Registry is missing apps map.');
  }
  return registry;
}

export function resolveRequestedApp(registry: DokuhaRegistry, params: URLSearchParams): DokuhaRegistryApp {
  const requested = params.get('app') || params.get('target') || registry.defaultApp || Object.keys(registry.apps)[0];
  const app = requested ? registry.apps[requested] : null;
  if (!app) throw new Error(`App not found: ${requested || '(empty)'}`);
  return app;
}

export function appendRuntimeParams(targetUrl: URL, params: URLSearchParams): URL {
  for (const [key, value] of params.entries()) {
    if (key === 'app' || key === 'target') continue;
    targetUrl.searchParams.set(key, value);
  }
  return targetUrl;
}
