import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import PandaBridge from 'pandasuite-bridge';
import { PandaBridgeRoot, usePandaBridge } from 'pandasuite-bridge-react';

const SLOT_NUMBERS = [1, 2] as const;
const RESERVED_SEARCH_PARAMS = new Set(['mode', 'scheme']);

type SlotNumber = (typeof SLOT_NUMBERS)[number];
type ParamValueId = `param${SlotNumber}`;

type BridgeProperties = Partial<Record<'scheme' | ParamValueId, string>>;

type ParamEntry = {
  id: ParamValueId;
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
  ctaOnClick?: () => void;
  pageClassName?: string;
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
    scheme: 'app_custom',
    helper: 'Use any other scheme declared by your host app.',
  },
];

const DOC_LINKS = {
  customComponents: 'https://docs.pandasuite.com/essentials/components/custom-components/',
  urlParameters: 'https://docs.pandasuite.com/essentials/project-properties/url-parameters/',
  webComponent: 'https://docs.pandasuite.com/essentials/components/web/',
};
const APP_BASE_PATH = import.meta.env.BASE_URL;
const LOGO_PATH = `${import.meta.env.BASE_URL}assets/logo-pandasuite.svg`;

function cleanValue(value: string | null | undefined) {
  return (value ?? '').trim();
}

function createSlotEntry(slot: SlotNumber, value = ''): ParamEntry {
  return {
    id: `param${slot}`,
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

  const base = normalizedScheme ? `${normalizedScheme}://` : 'pandasuite://';
  const queryString = query.toString();

  return queryString ? `${base}?${queryString}` : base;
}

function buildBaseDeeplink(scheme: string) {
  const normalizedScheme = cleanValue(scheme);
  return normalizedScheme ? `${normalizedScheme}://` : 'pandasuite://';
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

  return `${APP_BASE_PATH}?${searchParams.toString()}`;
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

  return `${APP_BASE_PATH}?${searchParams.toString()}`;
}

function getPresetForScheme(scheme: string) {
  const normalizedScheme = cleanValue(scheme).toLowerCase();
  return SCHEME_PRESETS.find((preset) => preset.scheme === normalizedScheme)?.id || 'custom';
}

function createLauncherState(searchParams: URLSearchParams): LauncherState {
  const params = buildLauncherParamsFromSearch(searchParams);

  return {
    scheme: searchParams.get('scheme') || 'pandasuite',
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

function toAbsoluteUrl(url: string) {
  return new URL(url, window.location.href).toString();
}

function hasNativePandaHost() {
  const windowWithBridge = window as Window & {
    WebViewAndroidBridge?: unknown;
    WebViewJavascriptBridge?: unknown;
  };

  return Boolean(windowWithBridge.WebViewAndroidBridge || windowWithBridge.WebViewJavascriptBridge);
}

function isMobileDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }

  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function openExternalUrl(url: string) {
  const absoluteUrl = toAbsoluteUrl(url);

  try {
    PandaBridge.send(PandaBridge.OPEN_URL, [absoluteUrl, true]);
    return;
  } catch {
    // Standalone browser preview has no native host bridge.
  }

  const openedWindow = window.open(absoluteUrl, '_blank', 'noopener,noreferrer');
  if (!openedWindow) {
    window.location.href = absoluteUrl;
  }
}

function PageFrame({ children, ctaLabel, ctaHref, ctaOnClick, pageClassName }: PageFrameProps) {
  return (
    <div className={`page-shell${pageClassName ? ` ${pageClassName}` : ''}`}>
      <header className="header-bar">
        <div className="header-bar__inner">
          <a className="topbar__brand" href={APP_BASE_PATH}>
            <img src={LOGO_PATH} alt="PandaSuite" />
          </a>
          <div className="header-bar__actions">
            {ctaOnClick ? (
              <button type="button" className="header-bar__cta" onClick={ctaOnClick}>
                {ctaLabel}
              </button>
            ) : (
              <a className="header-bar__cta" href={ctaHref}>
                {ctaLabel}
              </a>
            )}
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
  const rawScheme = cleanValue(bridgeProperties.scheme) || searchParams.get('scheme') || '';
  const entries = useMemo(
    () => buildEntries(bridgeProperties, searchParams, prefersBridge),
    [bridgeProperties, prefersBridge, searchParams],
  );
  const filledParams = useMemo(() => getFilledParams(entries), [entries]);
  const scheme = rawScheme || 'pandasuite';
  const deeplink = useMemo(() => buildViewerDeeplink(scheme, entries), [entries, scheme]);
  const launcherHref = useMemo(() => toAbsoluteUrl(buildViewerLauncherHref(rawScheme, entries)), [entries, rawScheme]);
  const opensLauncherExternally = prefersBridge || hasNativePandaHost();
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

  function openLauncher() {
    if (opensLauncherExternally) {
      openExternalUrl(launcherHref);
      return;
    }

    window.location.href = launcherHref;
  }

  return (
    <PageFrame
      pageClassName="page-shell--viewer"
      ctaLabel="Open launcher"
      ctaHref={launcherHref}
      ctaOnClick={opensLauncherExternally ? openLauncher : undefined}
    >
      <main className="shell">
        <section className="hero">
          <div className="hero__inner">
            <h1 className="hero__title">URL parameters viewer</h1>
            <p className="hero__description">
              Bind properties to the PandaSuite launch context and inspect incoming values through the bridge.
            </p>
          </div>
        </section>

        <section className="content-grid">
          <article className="panel panel--payload">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">Launch context</span>
                <h2>Received deep link</h2>
              </div>
            </div>
            <div className="deeplink-preview">
              <code>{deeplink}</code>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="meta-label">Last update</span>
                <strong>{formatRelativeTime(lastUpdateIso)}</strong>
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
              </div>
            ) : null}
            <div className="entry-list">
              {entries.map(({ id, value, isFilled }) => (
                <div className={`entry-card ${isFilled ? '' : 'entry-card--muted'}`} key={id}>
                  <div className="entry-key">{id}</div>
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
  const backToAppHref = useMemo(() => buildBaseDeeplink(scheme), [scheme]);
  const isMobile = useMemo(() => isMobileDevice(), []);
  const viewerHref = APP_BASE_PATH;

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
    if (initialState.params.length > 0 || initialState.scheme !== 'pandasuite') {
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

      setScheme(savedState.scheme || 'pandasuite');
      setPresetId(getPresetForScheme(savedState.scheme || 'pandasuite'));
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
      setScheme(preset.scheme);
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

  function openAppBase() {
    window.location.href = backToAppHref;
  }

  function backToViewer() {
    window.location.href = viewerHref;
  }

  return (
    <PageFrame
      ctaLabel={isMobile ? 'Back to app' : 'Back to viewer'}
      ctaHref={isMobile ? backToAppHref : viewerHref}
      ctaOnClick={isMobile ? openAppBase : undefined}
    >
      <main className="shell">
        <section className="hero">
          <div className="hero__inner">
            <h1 className="hero__title">Deep link launcher</h1>
          </div>
        </section>

        <section className="content-grid">
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
              <button type="button" className="button button--primary" onClick={isMobile ? openApp : backToViewer}>
                {isMobile ? 'Open app' : 'Back to viewer'}
              </button>
              <button type="button" className="button button--secondary" onClick={() => copyText(deeplink, 'Deeplink copied.')}>
                Copy deeplink
              </button>
            </div>
            <p className="notice">{notice}</p>
          </article>

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

            {presetId !== 'pandaviewer' ? (
              <label className="field">
                <span>App scheme</span>
                <input
                  value={scheme}
                  onChange={(event) => {
                    setScheme(event.target.value);
                    setPresetId(getPresetForScheme(event.target.value));
                  }}
                  placeholder="pandasuite"
                />
              </label>
            ) : null}

            <div className="field-group">
              <span className="field-group__label">Parameters</span>
            </div>

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
            </div>
            <p className="notice">
              This launcher is intentionally dynamic for demo purposes. Add or remove parameters as needed.
            </p>
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
