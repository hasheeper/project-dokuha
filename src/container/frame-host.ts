import type { DokuhaMessage, DokuhaRegistryApp } from '../protocol/messages';
import { isDokuhaMessage } from '../protocol/messages';
import { appendRuntimeParams, loadRegistry, resolveRequestedApp } from '../registry/load-registry';
import { hostStyles } from './styles';

class DokuhaFrameHost extends HTMLElement {
  private frame: HTMLIFrameElement | null = null;
  private currentApp: DokuhaRegistryApp | null = null;

  connectedCallback(): void {
    this.attachShadow({ mode: 'open' });
    this.renderLoading();
    void this.boot();
  }

  private async boot(): Promise<void> {
    try {
      const params = new URLSearchParams(location.search || location.hash.slice(1));
      const registry = await loadRegistry('../registry/apps.json');
      const app = resolveRequestedApp(registry, params);
      const entry = app.entry || app.container;
      if (!entry) throw new Error(`No entry configured for app: ${app.id}`);
      this.currentApp = app;
      this.renderFrame(appendRuntimeParams(new URL(entry.replace(/^\.\//, ''), new URL('../', location.href)), params));
      window.addEventListener('message', this.handleMessage);
    } catch (error) {
      this.renderError(error instanceof Error ? error.message : String(error));
    }
  }

  private handleMessage = (event: MessageEvent): void => {
    const message = event.data as DokuhaMessage;
    if (!isDokuhaMessage(message)) return;

    if (event.source === this.frame?.contentWindow) {
      if (message.type === 'dokuha:open-app') {
        this.navigateToApp(message.app, message.params);
        return;
      }
      this.forwardToParent(message);
      return;
    }

    this.frame?.contentWindow?.postMessage(message, '*');
  };

  private navigateToApp(appId: string, params: Record<string, unknown> = {}): void {
    const nextUrl = new URL('./index.html', location.href);
    nextUrl.searchParams.set('app', appId);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') nextUrl.searchParams.set(key, String(value));
    });
    location.href = nextUrl.href;
  }

  private forwardToParent(message: DokuhaMessage): void {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  }

  private renderFrame(src: URL): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>${hostStyles}</style>
      <iframe
        class="frame"
        title="${this.currentApp?.name || 'DOKUHA App'}"
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
        allow="fullscreen"
        allowfullscreen
        referrerpolicy="no-referrer"
      ></iframe>
    `;
    this.frame = this.shadowRoot.querySelector('iframe');
    if (!this.frame) return;
    this.frame.addEventListener('load', () => {
      if (!this.currentApp) return;
      this.frame?.contentWindow?.postMessage(
        {
          type: 'dokuha:container-ready',
          appId: this.currentApp.id,
          app: this.currentApp
        },
        '*'
      );
    });
    this.frame.src = src.href;
  }

  private renderLoading(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>${hostStyles}</style>
      <div class="center">
        <section class="panel">
          <h1 class="title">Project DOKUHA</h1>
          <p class="message">Loading registry driven app container...</p>
        </section>
      </div>
    `;
  }

  private renderError(message: string): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>${hostStyles}</style>
      <div class="center">
        <section class="panel">
          <h1 class="title">Container Failed</h1>
          <p class="message error">${message}</p>
        </section>
      </div>
    `;
  }
}

customElements.define('dokuha-frame-host', DokuhaFrameHost);
