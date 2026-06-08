import type { DokuhaRegistryApp } from '../protocol/messages';
import { loadRegistry } from '../registry/load-registry';
import { hostStyles } from './styles';

class DokuhaAppShell extends HTMLElement {
  connectedCallback(): void {
    this.attachShadow({ mode: 'open' });
    this.renderLoading();
    void this.boot();
  }

  private async boot(): Promise<void> {
    try {
      const params = new URLSearchParams(location.search || location.hash.slice(1));
      const directApp = params.get('app') || params.get('target');
      if (directApp) {
        this.renderFrame(directApp, params);
        return;
      }

      const registry = await loadRegistry('./registry/apps.json');
      this.renderLauncher(Object.values(registry.apps));
    } catch (error) {
      this.renderError(error instanceof Error ? error.message : String(error));
    }
  }

  private renderFrame(appId: string, params: URLSearchParams): void {
    const nextUrl = new URL('./containers/app.html', location.href);
    nextUrl.searchParams.set('app', appId);
    for (const [key, value] of params.entries()) {
      if (key !== 'app' && key !== 'target') nextUrl.searchParams.set(key, value);
    }
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>${hostStyles}</style>
      <iframe
        class="frame"
        title="Project DOKUHA"
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
        allow="fullscreen"
        allowfullscreen
        referrerpolicy="no-referrer"
        src="${nextUrl.href}"
      ></iframe>
    `;
  }

  private renderLauncher(apps: DokuhaRegistryApp[]): void {
    if (!this.shadowRoot) return;
    const cards = apps
      .map(
        (app) => `
      <a class="card" href="./index.html?app=${encodeURIComponent(app.id)}">
        <span>${app.type}</span>
        <strong>${app.name}</strong>
        <em>${app.status || 'active'}</em>
        <p>${app.notes || ''}</p>
      </a>
    `
      )
      .join('');

    this.shadowRoot.innerHTML = `
      <style>
        ${hostStyles}
        .launcher {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 32px;
          background:
            radial-gradient(circle at 12% 18%, rgba(234, 69, 113, .16), transparent 32%),
            linear-gradient(135deg, #121014 0%, #19151e 48%, #101014 100%);
          color: #f4f1f6;
        }
        .stack {
          width: min(920px, 100%);
          display: grid;
          gap: 18px;
        }
        h1 {
          margin: 0;
          font-size: clamp(28px, 5vw, 54px);
          line-height: 1;
          letter-spacing: 0;
        }
        .sub {
          margin: 0;
          color: #aaa4b2;
          font-size: 14px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
          margin-top: 10px;
        }
        .card {
          display: grid;
          gap: 8px;
          padding: 18px;
          min-height: 150px;
          color: inherit;
          text-decoration: none;
          background: rgba(28, 26, 33, .82);
          border: 1px solid rgba(234, 69, 113, .2);
          border-radius: 8px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, .22);
        }
        .card:hover {
          border-color: rgba(234, 69, 113, .55);
          transform: translateY(-1px);
        }
        .card span {
          font-size: 11px;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: #a6a3b0;
        }
        .card strong {
          font-size: 18px;
        }
        .card em {
          width: fit-content;
          padding: 3px 8px;
          border-radius: 999px;
          background: #ea4571;
          color: #fff;
          font-size: 11px;
          font-style: normal;
          text-transform: uppercase;
        }
        .card p {
          margin: 0;
          color: #aaa4b2;
          font-size: 13px;
          line-height: 1.5;
        }
      </style>
      <main class="launcher">
        <section class="stack">
          <h1>Project DOKUHA</h1>
          <p class="sub">Registry driven static iframe host. Vite + TypeScript, no React/Vue/Angular.</p>
          <div class="grid">${cards}</div>
        </section>
      </main>
    `;
  }

  private renderLoading(): void {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>${hostStyles}</style>
      <div class="center">
        <section class="panel">
          <h1 class="title">Project DOKUHA</h1>
          <p class="message">Loading app registry...</p>
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
          <h1 class="title">Launcher Failed</h1>
          <p class="message error">${message}</p>
        </section>
      </div>
    `;
  }
}

customElements.define('dokuha-app-shell', DokuhaAppShell);
