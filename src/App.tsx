import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import PandaBridge from 'pandasuite-bridge';
import { PandaBridgeRoot, usePandaBridge } from 'pandasuite-bridge-react';

const SLOT_COUNT = 6;
const RESERVED_SEARCH_PARAMS = new Set(['mode', 'scheme']);

type BridgeProperties = Partial<Record<'title' | 'subtitle' | 'scheme', string>> &
  Partial<Record<`param${number}Key` | `param${number}Value`, string>>;

type ParamEntry = {
  id: string;
  key: string;
  value: string;
};

type LauncherState = {
  scheme: string;
  params: ParamEntry[];
};

type PageFrameProps = {
  children: ReactNode;
  ctaLabel: string;
  ctaHref: string;
};

type SchemePreset = {
  id: string;
  label: string;
  scheme: string;
  helper: string;
};

const SCHEME_PRESETS: SchemePreset[] = [
  {
    id: 'pandaviewer',
    label: 'PandaViewer',
    scheme: 'pandasuite',
    helper: 'Scheme found in PandaViewer Android and iOS targets.',
  },
  {
    id: 'custom',
    label: 'Custom',
    scheme: '',
    helper: 'Use any other scheme declared by your host app.',
  },
];

const DOC_LINKS = {
  customComponents: 'https://docs.pandasuite.com/essentials/components/custom-components/',
  urlParameters: 'https://docs.pandasuite.com/essentials/project-properties/url-parameters/',
  webComponent: 'https://docs.pandasuite.com/essentials/components/web/',
};

function createParamEntry(key = '', value = ''): ParamEntry {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    key,
    value,
  };
}

function cleanValue(value: string | null | undefined) {
  return (value ?? '').trim();
}

function buildEntries(properties: BridgeProperties, searchParams: URLSearchParams) {
  const bridgedEntries: ParamEntry[] = [];

  for (let index = 1; index <= SLOT_COUNT; index += 1) {
    const key = cleanValue(properties[`param${index}Key`]);
    const value = properties[`param${index}Value`] ?? '';

    if (!key) {
      continue;
    }

    bridgedEntries.push(createParamEntry(key, value));
  }

  if (bridgedEntries.length > 0) {
    return bridgedEntries;
  }

  const fallbackEntries: ParamEntry[] = [];

  searchParams.forEach((value, key) => {
    if (RESERVED_SEARCH_PARAMS.has(key)) {
      return;
    }

    fallbackEntries.push(createParamEntry(key, value));
  });

  return fallbackEntries;
}

function buildDeeplink(scheme: string, entries: ParamEntry[]) {
  const normalizedScheme = cleanValue(scheme);
  const query = new URLSearchParams();

  entries.forEach(({ key, value }) => {
    const safeKey = cleanValue(key);

    if (!safeKey) {
      return;
    }

    query.set(safeKey, value);
  });

  const base = normalizedScheme ? `${normalizedScheme}://` : 'app_scheme://';
  const queryString = query.toString();

  return queryString ? `${base}?${queryString}` : base;
}

function buildLauncherHref(scheme: string, entries: ParamEntry[]) {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', 'launcher');

  if (cleanValue(scheme)) {
    searchParams.set('scheme', cleanValue(scheme));
  }

  entries.forEach(({ key, value }) => {
    const safeKey = cleanValue(key);

    if (!safeKey) {
      return;
    }

    searchParams.set(safeKey, value);
  });

  return `${window.location.pathname}?${searchParams.toString()}`;
}

function getPresetForScheme(scheme: string) {
  const normalizedScheme = cleanValue(scheme).toLowerCase();
  return SCHEME_PRESETS.find((preset) => preset.scheme === normalizedScheme)?.id || 'custom';
}

function createLauncherState(searchParams: URLSearchParams): LauncherState {
  const params: ParamEntry[] = [];

  searchParams.forEach((value, key) => {
    if (RESERVED_SEARCH_PARAMS.has(key)) {
      return;
    }

    params.push(createParamEntry(key, value));
  });

  return {
    scheme: searchParams.get('scheme') || 'app_scheme',
    params: params.length > 0 ? params : [createParamEntry('param1', '68d6ba8ab47c018f0004e4')],
  };
}

function formatRelativeTime(isoValue: string | null) {
  if (!isoValue) {
    return 'Waiting for PandaBridge updates';
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return isoValue;
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
}

function StatusPill({ label, tone }: { label: string; tone: 'neutral' | 'success' | 'warning' }) {
  return <span className={`status-pill status-pill--${tone}`}>{label}</span>;
}

function DocsLinks() {
  return (
    <div className="docs-links" aria-label="Documentation links">
      <a href={DOC_LINKS.customComponents} target="_blank" rel="noreferrer">
        Custom components
      </a>
      <a href={DOC_LINKS.urlParameters} target="_blank" rel="noreferrer">
        URL parameters
      </a>
      <a href={DOC_LINKS.webComponent} target="_blank" rel="noreferrer">
        Web component
      </a>
    </div>
  );
}

function PageFrame({ children, ctaLabel, ctaHref }: PageFrameProps) {
  return (
    <div className="page-shell">
      <header className="header-bar">
        <div className="header-bar__inner">
          <a className="topbar__brand" href="/">
            <img src="/assets/logo-pandasuite.svg" alt="PandaSuite" />
          </a>
          <div className="header-bar__actions">
            <a className="header-bar__cta" href={ctaHref}>
              {ctaLabel}
            </a>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function ViewerScreen() {
  const { properties } = usePandaBridge();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const bridgeProperties = (properties ?? {}) as BridgeProperties;
  const entries = useMemo(
    () => buildEntries(bridgeProperties, searchParams),
    [bridgeProperties, searchParams],
  );
  const scheme = cleanValue(bridgeProperties.scheme) || searchParams.get('scheme') || 'app_scheme';
  const deeplink = useMemo(() => buildDeeplink(scheme, entries), [scheme, entries]);
  const launcherHref = useMemo(() => buildLauncherHref(scheme, entries), [scheme, entries]);
  const sourceLabel = Object.keys(bridgeProperties).length > 0 ? 'PandaSuite bindings' : 'Browser preview';
  const lastSnapshot = useRef<string | null>(null);
  const [lastUpdateIso, setLastUpdateIso] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    const snapshot = JSON.stringify(bridgeProperties);

    if (snapshot === lastSnapshot.current) {
      return;
    }

    setLastUpdateIso(new Date().toISOString());
    setUpdateCount((currentValue) => (lastSnapshot.current === null ? 0 : currentValue + 1));
    lastSnapshot.current = snapshot;
  }, [bridgeProperties]);

  useEffect(() => {
    try {
      PandaBridge.send(PandaBridge.UPDATED, {
        queryable: {
          deeplink,
          paramsJson: JSON.stringify(
            Object.fromEntries(entries.map(({ key, value }) => [key, value])),
            null,
            2,
          ),
          lastUpdateIso: lastUpdateIso ?? '',
          updateCount,
        },
      });
    } catch {
      // Standalone browser preview runs without the PandaSuite host.
    }
  }, [deeplink, entries, lastUpdateIso, updateCount]);

  return (
    <PageFrame ctaLabel="Open launcher" ctaHref={launcherHref}>
      <main className="shell">
        <section className="hero">
          <div className="hero__inner">
            <h1 className="hero__title">URL parameters viewer</h1>
            <p className="hero__description">
              {bridgeProperties.subtitle ||
                'Bind properties to the PandaSuite launch context and inspect incoming values through the bridge.'}
            </p>
            <div className="hero__actions">
              <a className="button button--primary" href={launcherHref}>
                Test app return
              </a>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => navigator.clipboard.writeText(deeplink).catch(() => undefined)}
              >
                Copy deeplink
              </button>
            </div>
            <DocsLinks />
            <div className="hero__pills">
              <StatusPill label={sourceLabel} tone="success" />
              <StatusPill
                label={entries.length > 0 ? `${entries.length} resolved parameter(s)` : 'No resolved parameter'}
                tone={entries.length > 0 ? 'neutral' : 'warning'}
              />
            </div>
          </div>
        </section>

        <section className="content-grid">
          <article className="panel panel--payload">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Launch context</span>
                <h2>Received deep link</h2>
              </div>
              <span className="mono-badge">{scheme}://</span>
            </div>
            <div className="deeplink-preview">
              <code>{deeplink}</code>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="meta-label">Last update</span>
                <strong>{formatRelativeTime(lastUpdateIso)}</strong>
              </div>
              <div className="stat-card">
                <span className="meta-label">Refresh count</span>
                <strong>{updateCount}</strong>
              </div>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Bindings</span>
                <h2>Resolved parameters</h2>
              </div>
            </div>
            {entries.length > 0 ? (
              <div className="entry-list">
                {entries.map(({ key, value }) => (
                  <div className="entry-card" key={key}>
                    <div className="entry-key">{key}</div>
                    <div className="entry-value">{value || 'Empty value'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No slot is populated yet.</p>
                <p>
                  Bind `paramXValue` to <strong>Project &gt; Context &gt; Launch &gt; Parameter(s)</strong>.
                </p>
                <p>
                  See{' '}
                  <a href={DOC_LINKS.urlParameters} target="_blank" rel="noreferrer">
                    URL parameters docs
                  </a>{' '}
                  and{' '}
                  <a href={DOC_LINKS.customComponents} target="_blank" rel="noreferrer">
                    custom components docs
                  </a>
                  .
                </p>
              </div>
            )}
          </article>
        </section>

        <section className="panel panel--debug">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Debug</span>
                <h2>Raw PandaBridge payload</h2>
              </div>
            </div>
          <pre>{JSON.stringify(bridgeProperties, null, 2)}</pre>
        </section>
      </main>
    </PageFrame>
  );
}

function LauncherScreen() {
  const initialState = useMemo(() => createLauncherState(new URLSearchParams(window.location.search)), []);
  const [scheme, setScheme] = useState(initialState.scheme);
  const [params, setParams] = useState(initialState.params);
  const [presetId, setPresetId] = useState(() => getPresetForScheme(initialState.scheme));
  const [notice, setNotice] = useState('Edit the scheme and parameters, then reopen the app.');
  const deeplink = useMemo(() => buildDeeplink(scheme, params), [scheme, params]);

  useEffect(() => {
    const searchParams = new URLSearchParams();
    searchParams.set('mode', 'launcher');

    if (cleanValue(scheme)) {
      searchParams.set('scheme', cleanValue(scheme));
    }

    params.forEach(({ key, value }) => {
      const safeKey = cleanValue(key);
      if (!safeKey) {
        return;
      }

      searchParams.set(safeKey, value);
    });

    const nextUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.replaceState({}, '', nextUrl);
    window.localStorage.setItem(
      'url-params-viewer-launcher',
      JSON.stringify({
        scheme,
        params,
      }),
    );
  }, [params, scheme]);

  useEffect(() => {
    if (initialState.params.length > 0 || initialState.scheme !== 'app_scheme') {
      return;
    }

    const rawValue = window.localStorage.getItem('url-params-viewer-launcher');
    if (!rawValue) {
      return;
    }

    try {
      const savedState = JSON.parse(rawValue) as LauncherState;
      setScheme(savedState.scheme || 'app_scheme');
      setPresetId(getPresetForScheme(savedState.scheme || 'app_scheme'));
      setParams(
        savedState.params?.length
          ? savedState.params.map((entry) => createParamEntry(entry.key, entry.value))
          : initialState.params,
      );
    } catch {
      // Ignore invalid cached launcher state.
    }
  }, [initialState.params, initialState.scheme]);

  function updateParam(index: number, nextValue: ParamEntry) {
    setParams((currentValue) =>
      currentValue.map((entry, entryIndex) => (entryIndex === index ? nextValue : entry)),
    );
  }

  function applyPreset(nextPresetId: string) {
    const preset = SCHEME_PRESETS.find((item) => item.id === nextPresetId);
    setPresetId(nextPresetId);

    if (!preset) {
      return;
    }

    if (preset.id === 'custom') {
      setNotice('Custom scheme selected.');
      return;
    }

    setScheme(preset.scheme);
    setNotice(`${preset.label} preset applied.`);
  }

  async function copyText(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(successMessage);
    } catch {
      setNotice('Clipboard access failed. Copy manually from the preview.');
    }
  }

  function openApp() {
    setNotice(`Trying to open ${deeplink}`);
    window.location.href = deeplink;
    window.setTimeout(() => {
      setNotice('If the app did not reopen, verify the scheme registration and the exact parameter names.');
    }, 1400);
  }

  return (
    <PageFrame ctaLabel="Open viewer" ctaHref="/">
      <main className="shell">
        <section className="hero">
          <div className="hero__inner">
            <h1 className="hero__title">Deep link launcher</h1>
            <p className="hero__description">
              Configure the scheme and parameters, then send the user back to the native application.
            </p>
            <div className="hero__actions">
              <button type="button" className="button button--primary" onClick={openApp}>
                Open app
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => copyText(window.location.href, 'Page URL copied.')}
              >
                Copy page URL
              </button>
            </div>
            <DocsLinks />
            <div className="hero__pills">
              <StatusPill label="External page" tone="neutral" />
              <StatusPill label={`${params.length} parameter row(s)`} tone="success" />
            </div>
          </div>
        </section>

        <section className="content-grid">
          <article className="panel panel--payload">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Configuration</span>
                <h2>Scheme and parameters</h2>
              </div>
            </div>

            <div className="preset-group" aria-label="Scheme presets">
              {SCHEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-chip ${presetId === preset.id ? 'preset-chip--active' : ''}`}
                  onClick={() => applyPreset(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="preset-helper">
              {SCHEME_PRESETS.find((preset) => preset.id === presetId)?.helper}
              {' '}
              <a href={DOC_LINKS.urlParameters} target="_blank" rel="noreferrer">
                Open docs
              </a>
            </p>

            <label className="field">
              <span>App scheme</span>
              <input
                value={scheme}
                onChange={(event) => {
                  setScheme(event.target.value);
                  setPresetId(getPresetForScheme(event.target.value));
                }}
                placeholder="app_scheme"
              />
            </label>

            <div className="launcher-list">
              {params.map((entry, index) => (
                <div className="launcher-row" key={entry.id}>
                  <input
                    aria-label={`Key ${index + 1}`}
                    value={entry.key}
                    onChange={(event) =>
                      updateParam(index, {
                        ...entry,
                        key: event.target.value,
                      })
                    }
                    placeholder="auth_type"
                  />
                  <input
                    aria-label={`Value ${index + 1}`}
                    value={entry.value}
                    onChange={(event) =>
                      updateParam(index, {
                        ...entry,
                        value: event.target.value,
                      })
                    }
                    placeholder="68d6ba8ab47c018f0004e4"
                  />
                  <button
                    type="button"
                  className="button button--ghost"
                  onClick={() => setParams((currentValue) => currentValue.filter((_, entryIndex) => entryIndex !== index))}
                  disabled={params.length === 1}
                >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="toolbar">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setParams((currentValue) => [...currentValue, createParamEntry()])}
              >
                Add parameter
              </button>
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Output</span>
                <h2>Generated deep link</h2>
              </div>
            </div>
            <div className="deeplink-preview">
              <code>{deeplink}</code>
            </div>
            <div className="stack">
              <button type="button" className="button button--primary" onClick={openApp}>
                Open app
              </button>
              <button type="button" className="button button--secondary" onClick={() => copyText(deeplink, 'Deeplink copied.')}>
                Copy deeplink
              </button>
            </div>
            <p className="notice">{notice}</p>
          </article>
        </section>

        <section className="panel panel--usage">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Usage</span>
                <h2>Suggested PandaSuite flow</h2>
              </div>
            </div>
          <ol className="steps">
            <li>
              Open this page from a{' '}
              <a href={DOC_LINKS.webComponent} target="_blank" rel="noreferrer">
                PandaSuite Web component
              </a>{' '}
              or GitHub Pages with `?mode=launcher`.
            </li>
            <li>Fill in the exact scheme registered by the native app.</li>
            <li>
              Reuse the same parameter names as in{' '}
              <a href={DOC_LINKS.urlParameters} target="_blank" rel="noreferrer">
                Project &gt; Context &gt; Launch
              </a>
              .
            </li>
            <li>Press `Open app` to leave the browser and relaunch the app.</li>
          </ol>
          <p className="usage-links">
            Need more detail? Read the{' '}
            <a href={DOC_LINKS.customComponents} target="_blank" rel="noreferrer">
              custom components guide
            </a>
            .
          </p>
        </section>
      </main>
    </PageFrame>
  );
}

function InnerApp() {
  const mode = new URLSearchParams(window.location.search).get('mode');

  if (mode === 'launcher') {
    return <LauncherScreen />;
  }

  return <ViewerScreen />;
}

export default function App() {
  return (
    <PandaBridgeRoot>
      <InnerApp />
    </PandaBridgeRoot>
  );
}
