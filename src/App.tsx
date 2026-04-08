import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import PandaBridge from 'pandasuite-bridge';
import { PandaBridgeRoot, usePandaBridge } from 'pandasuite-bridge-react';

const SLOT_NUMBERS = [1, 2, 3] as const;
const RESERVED_SEARCH_PARAMS = new Set(['mode', 'scheme']);

type SlotNumber = (typeof SLOT_NUMBERS)[number];
type ParamValueId = `param${SlotNumber}`;

type BridgeProperties = Partial<Record<'scheme' | ParamValueId, string>>;

type ParamEntry = {
  id: ParamValueId;
  slotLabel: string;
  value: string;
  isFilled: boolean;
};

type LauncherParam = {
  id: string;
  key: string;
  value: string;
};

type LauncherState = {
  scheme: string;
  params: LauncherParam[];
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

function cleanValue(value: string | null | undefined) {
  return (value ?? '').trim();
}

function createSlotEntry(slot: SlotNumber, value = ''): ParamEntry {
  return {
    id: `param${slot}`,
    slotLabel: `Parameter ${slot}`,
    value,
    isFilled: Boolean(cleanValue(value)),
  } as ParamEntry;
}

function createDefaultEntries() {
  return SLOT_NUMBERS.map((slot) => createSlotEntry(slot));
}

function createLauncherParam(key = '', value = ''): LauncherParam {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    key,
    value,
  };
}

function updateFilledState(entry: ParamEntry): ParamEntry {
  return {
    ...entry,
    isFilled: Boolean(cleanValue(entry.value)),
  };
}

function getFilledParams(entries: ParamEntry[]) {
  return entries.reduce<Record<string, string>>((result, entry) => {
    if (cleanValue(entry.value)) {
      result[entry.id] = entry.value;
    }

    return result;
  }, {});
}

function hasAnyParamValue(entries: ParamEntry[]) {
  return entries.some((entry) => cleanValue(entry.value));
}

function buildEntriesFromSearch(searchParams: URLSearchParams) {
  const entries = createDefaultEntries();
  SLOT_NUMBERS.forEach((slot, index) => {
    const id = `param${slot}` as ParamValueId;
    const value = searchParams.get(id);

    if (value !== null) {
      entries[index] = updateFilledState(createSlotEntry(slot, value));
    }
  });

  return entries;
}

function buildLauncherParamsFromSearch(searchParams: URLSearchParams) {
  const params: LauncherParam[] = [];

  searchParams.forEach((value, key) => {
    if (RESERVED_SEARCH_PARAMS.has(key)) {
      return;
    }

    params.push(createLauncherParam(key, value));
  });

  return params;
}

function hasBridgeLaunchData(properties: BridgeProperties) {
  return (
    properties.scheme !== undefined ||
    SLOT_NUMBERS.some((slot) => {
      const valueId = `param${slot}` as ParamValueId;
      return properties[valueId] !== undefined;
    })
  );
}

function buildEntries(properties: BridgeProperties, searchParams: URLSearchParams, preferBridge: boolean) {
  if (!preferBridge) {
    return buildEntriesFromSearch(searchParams);
  }

  return SLOT_NUMBERS.map((slot) => {
    const valueId = `param${slot}` as ParamValueId;
    return updateFilledState(createSlotEntry(slot, properties[valueId] ?? ''));
  });
}

function buildViewerDeeplink(scheme: string, entries: ParamEntry[]) {
  const normalizedScheme = cleanValue(scheme);
  const query = new URLSearchParams();

  entries.forEach((entry) => {
    if (cleanValue(entry.value)) {
      query.set(entry.id, entry.value);
    }
  });

  const base = normalizedScheme ? `${normalizedScheme}://` : 'app_scheme://';
  const queryString = query.toString();

  return queryString ? `${base}?${queryString}` : base;
}

function buildLauncherDeeplink(scheme: string, entries: LauncherParam[]) {
  const normalizedScheme = cleanValue(scheme);
  const query = new URLSearchParams();

  entries.forEach((entry) => {
    const safeKey = cleanValue(entry.key);

    if (safeKey && cleanValue(entry.value)) {
      query.set(safeKey, entry.value);
    }
  });

  const base = normalizedScheme ? `${normalizedScheme}://` : 'app_scheme://';
  const queryString = query.toString();

  return queryString ? `${base}?${queryString}` : base;
}

function buildViewerLauncherHref(scheme: string, entries: ParamEntry[]) {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', 'launcher');

  if (cleanValue(scheme)) {
    searchParams.set('scheme', cleanValue(scheme));
  }

  entries.forEach((entry) => {
    if (cleanValue(entry.value)) {
      searchParams.set(entry.id, entry.value);
    }
  });

  return `${window.location.pathname}?${searchParams.toString()}`;
}

function buildLauncherHref(scheme: string, entries: LauncherParam[]) {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', 'launcher');

  if (cleanValue(scheme)) {
    searchParams.set('scheme', cleanValue(scheme));
  }

  entries.forEach((entry) => {
    if (cleanValue(entry.value)) {
      searchParams.set(entry.id, entry.value);
    }
  });

  return `${window.location.pathname}?${searchParams.toString()}`;
}

function getPresetForScheme(scheme: string) {
  const normalizedScheme = cleanValue(scheme).toLowerCase();
  return SCHEME_PRESETS.find((preset) => preset.scheme === normalizedScheme)?.id || 'custom';
}

function createLauncherState(searchParams: URLSearchParams): LauncherState {
  const params = buildLauncherParamsFromSearch(searchParams);

  return {
    scheme: searchParams.get('scheme') || 'app_scheme',
    params: params.length > 0 ? params : [createLauncherParam('param1', 'value1')],
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
  const prefersBridge = hasBridgeLaunchData(bridgeProperties);
  const entries = useMemo(
    () => buildEntries(bridgeProperties, searchParams, prefersBridge),
    [bridgeProperties, prefersBridge, searchParams],
  );
  const filledParams = useMemo(() => getFilledParams(entries), [entries]);
  const scheme = cleanValue(bridgeProperties.scheme) || searchParams.get('scheme') || 'app_scheme';
  const deeplink = useMemo(() => buildViewerDeeplink(scheme, entries), [entries, scheme]);
  const launcherHref = useMemo(() => buildViewerLauncherHref(scheme, entries), [entries, scheme]);
  const sourceLabel = prefersBridge ? 'PandaSuite bindings' : 'Browser preview';
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
          paramsJson: JSON.stringify(filledParams, null, 2),
          lastUpdateIso: lastUpdateIso ?? '',
          updateCount,
        },
      });
    } catch {
      // Standalone browser preview runs without the PandaSuite host.
    }
  }, [deeplink, filledParams, lastUpdateIso, updateCount]);

  return (
    <PageFrame ctaLabel="Open launcher" ctaHref={launcherHref}>
      <main className="shell">
        <section className="hero">
          <div className="hero__inner">
            <h1 className="hero__title">URL parameters viewer</h1>
            <p className="hero__description">
              Bind properties to the PandaSuite launch context and inspect incoming values through the bridge.
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
                label={
                  Object.keys(filledParams).length > 0
                    ? `${Object.keys(filledParams).length} resolved parameter(s)`
                    : 'No resolved parameter'
                }
                tone={Object.keys(filledParams).length > 0 ? 'neutral' : 'warning'}
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
            {Object.keys(filledParams).length === 0 ? (
              <div className="empty-state">
                <p>No launch value received yet.</p>
                <p>
                  Bind `param1`, `param2`, and `param3` directly to{' '}
                  <strong>Project &gt; Context &gt; Launch &gt; Parameter(s)</strong>.
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
            ) : null}
            <div className="entry-list">
              {entries.map(({ id, value, isFilled, slotLabel }) => (
                <div className={`entry-card ${isFilled ? '' : 'entry-card--muted'}`} key={id}>
                  <div className="entry-key">{id}</div>
                  <div className="entry-meta">{slotLabel}</div>
                  <div className="entry-value">{isFilled ? value : 'No value received'}</div>
                </div>
              ))}
            </div>
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
  const deeplink = useMemo(() => buildLauncherDeeplink(scheme, params), [params, scheme]);

  useEffect(() => {
    const nextUrl = buildLauncherHref(scheme, params);
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
      const savedState = JSON.parse(rawValue) as Partial<LauncherState>;
      const savedParams = Array.isArray(savedState.params)
        ? savedState.params.map((entry) => createLauncherParam(entry.key, entry.value))
        : [createLauncherParam('param1', 'value1')];

      setScheme(savedState.scheme || 'app_scheme');
      setPresetId(getPresetForScheme(savedState.scheme || 'app_scheme'));
      setParams(savedParams.length > 0 ? savedParams : initialState.params);
    } catch {
      // Ignore invalid cached launcher state.
    }
  }, [initialState.params, initialState.scheme]);

  function updateParam(id: string, field: 'key' | 'value', nextValue: string) {
    setParams((currentValue) =>
      currentValue.map((entry) => (entry.id === id ? { ...entry, [field]: nextValue } : entry)),
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
              <StatusPill label={`${params.length} launcher parameter(s)`} tone="success" />
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
                    aria-label={`Parameter ${index + 1} name`}
                    value={entry.key}
                    onChange={(event) => updateParam(entry.id, 'key', event.target.value)}
                    placeholder={`param${index + 1}`}
                  />
                  <input
                    aria-label={`Parameter ${index + 1} value`}
                    value={entry.value}
                    onChange={(event) => updateParam(entry.id, 'value', event.target.value)}
                    placeholder="Value"
                  />
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => setParams((currentValue) => currentValue.filter((item) => item.id !== entry.id))}
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
                onClick={() => setParams((currentValue) => [...currentValue, createLauncherParam(`param${currentValue.length + 1}`)])}
              >
                Add parameter
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setParams([createLauncherParam('param1', 'value1')]);
                  setNotice('All parameter fields cleared.');
                }}
              >
                Clear values
              </button>
            </div>
            <p className="notice">
              This launcher is intentionally dynamic for demo purposes. Add or remove parameters as needed.
            </p>
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
              Add the parameter names you want to test so they match your{' '}
              <a href={DOC_LINKS.urlParameters} target="_blank" rel="noreferrer">
                Project &gt; Context &gt; Launch
              </a>{' '}
              parameters.
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
