import { useEffect, useMemo, useState } from 'react';
import { APP_BASE_PATH, DOC_LINKS, SCHEME_PRESETS } from '../constants';
import type { LauncherState } from '../types';
import { isMobileDevice } from '../utils/bridge';
import { buildLauncherDeeplink, buildLauncherUrl, cleanValue } from '../utils/deeplink';
import { createLauncherParam, createLauncherState, getPresetForScheme } from '../utils/params';
import DeeplinkPreview from './DeeplinkPreview';
import PageFrame from './PageFrame';
import ParamListEditor from './ParamListEditor';
import SchemePresetPicker from './SchemePresetPicker';

export default function LauncherScreen() {
  const initialState = useMemo(() => createLauncherState(new URLSearchParams(window.location.search)), []);
  const [scheme, setScheme] = useState(initialState.scheme);
  const [params, setParams] = useState(initialState.params);
  const [presetId, setPresetId] = useState(() => getPresetForScheme(initialState.scheme));
  const [notice, setNotice] = useState('Edit the scheme and parameters, then reopen the app.');
  const deeplink = useMemo(() => buildLauncherDeeplink(scheme, params), [params, scheme]);
  const backToAppHref = useMemo(() => `${cleanValue(scheme) || 'pandasuite'}://`, [scheme]);
  const isMobile = useMemo(() => isMobileDevice(), []);
  const viewerHref = APP_BASE_PATH;

  useEffect(() => {
    const nextUrl = buildLauncherUrl(scheme, params.map((p) => ({ id: p.key, value: p.value })));
    window.history.replaceState({}, '', nextUrl);
    window.localStorage.setItem(
      'url-params-viewer-launcher',
      JSON.stringify({ scheme, params }),
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

  function handleSchemeChange(value: string) {
    setScheme(value);
    setPresetId(getPresetForScheme(value));
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
            <DeeplinkPreview deeplink={deeplink} />
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

            <SchemePresetPicker
              presetId={presetId}
              scheme={scheme}
              onPresetChange={applyPreset}
              onSchemeChange={handleSchemeChange}
            />

            <ParamListEditor
              params={params}
              onParamsChange={setParams}
            />
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
