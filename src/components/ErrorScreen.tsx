import { Component, type ReactNode } from 'react';

/** If anything in the app crashes, show a friendly screen with a reload button instead of a dead page. */
export default class ErrorScreen extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[चला खेळूया] app error', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ fontFamily: 'Mukta, sans-serif', maxWidth: 420, margin: '60px auto', padding: 24, textAlign: 'center', color: '#10233F' }}>
        <p style={{ fontSize: 24, fontWeight: 700, margin: '0 0 16px' }}>काहीतरी चुकले. पान पुन्हा उघडा.</p>
        <button
          type="button"
          onClick={() => {
            const u = new URL(window.location.href);
            u.searchParams.set('_r', String(Date.now()));
            window.location.replace(u.toString());
          }}
          style={{ fontSize: 22, fontWeight: 700, padding: '14px 28px', borderRadius: 16, border: '3px solid #10233F', background: '#F39200' }}
        >
          पुन्हा उघडा
        </button>
      </div>
    );
  }
}
