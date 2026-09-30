import React from 'react';

// Full-screen loading splash (auth shell + card).
export function LoadingScreen() {
  return (
    <main className="auth-shell single">
      <section className="auth-card">
        <p className="eyebrow">Franco</p>
        <h1>Loading your account</h1>
        <p className="lede">Preparing your learning space.</p>
      </section>
    </main>
  );
}
