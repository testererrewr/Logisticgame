'use client';

import {Download} from 'lucide-react';
import {useEffect, useState} from 'react';

interface InstallPrompt extends Event {
  prompt(): Promise<{outcome: 'accepted' | 'dismissed'}>;
}

export function InstallLoadstar() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [android, setAndroid] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    const standalone = matchMedia('(display-mode: standalone)');
    const update = () => setInstalled(standalone.matches);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {setInstalled(true);setPrompt(null);};
    update();
    setAndroid(/Android/i.test(navigator.userAgent));
    standalone.addEventListener('change', update);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      standalone.removeEventListener('change', update);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || (!prompt && !android)) return null;

  async function install() {
    if (!prompt) {
      setHelp(value => !value);
      return;
    }
    const available = prompt;
    setPrompt(null);
    try {
      const choice = await available.prompt();
      if (choice.outcome === 'accepted') setInstalled(true);
    } catch {
      setHelp(true);
    }
  }

  return <div className="loadstar-install">
    <button type="button" className="log-secondary" onClick={() => void install()} aria-expanded={prompt ? undefined : help}>
      <Download size={18} aria-hidden="true"/> Loadstar installieren
    </button>
    {help && <p role="status">Öffne in Chrome das Menü ⋮ und wähle „App installieren“ oder „Zum Startbildschirm hinzufügen“.</p>}
  </div>;
}

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
