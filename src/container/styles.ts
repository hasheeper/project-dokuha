export const hostStyles = `
  :host {
    color-scheme: dark;
    display: block;
    min-height: 100vh;
    background: transparent;
    color: #f4efe9;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .frame {
    width: 100vw;
    height: 100vh;
    border: 0;
    display: block;
    background: transparent;
  }

  .center {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 24px;
    text-align: center;
  }

  .panel {
    max-width: 520px;
    display: grid;
    gap: 12px;
  }

  .title {
    margin: 0;
    font-size: 18px;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .message {
    margin: 0;
    color: rgba(244, 239, 233, .68);
    font-size: 13px;
    line-height: 1.6;
  }

  .error {
    color: #ff8f9d;
    white-space: pre-wrap;
  }
`;
