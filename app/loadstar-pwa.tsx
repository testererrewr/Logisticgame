'use client';

import {useEffect, useState} from 'react';

export function LoadstarPwaRuntime() {
  const [newRelease, setNewRelease] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    let release: {version: string; role: string} | null = null;
    let registration: ServiceWorkerRegistration | undefined;
    const controller = new AbortController();
    let checking = false;

    void navigator.serviceWorker.register('/service-worker.js', {updateViaCache: 'none'})
      .then(value => {registration = value;})
      .catch(() => {});

    async function checkRelease() {
      if (checking || document.hidden || controller.signal.aborted) return;
      checking = true;
      try {
        const response = await fetch('/api/logistik/instance', {cache: 'no-store', signal: controller.signal});
        if (!response.ok) return;
        const next = await response.json() as {version?: string; role?: string};
        if (!next.version || !next.role) return;
        if (!release || next.role !== release.role) release = {version: next.version, role: next.role};
        else setNewRelease(next.version !== release.version);
      } catch {
        // The next foreground or online check will retry.
      } finally {
        checking = false;
      }
    }

    const foreground = () => {
      if (document.hidden) return;
      void registration?.update().catch(() => {});
      void checkRelease();
    };
    const timer = window.setInterval(checkRelease, 60_000);
    void checkRelease();
    document.addEventListener('visibilitychange', foreground);
    window.addEventListener('online', foreground);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', foreground);
      window.removeEventListener('online', foreground);
    };
  }, []);

  if (!newRelease) return null;
  return <aside className="loadstar-update" aria-label="Loadstar-Update">
    <span role="status">Neue Version verfügbar</span>
    <button type="button" onClick={() => location.reload()}>Neu laden</button>
  </aside>;
}
