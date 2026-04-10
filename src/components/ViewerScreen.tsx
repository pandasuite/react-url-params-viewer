import { useEffect, useMemo, useRef, useState } from 'react';
import PandaBridge from 'pandasuite-bridge';
import { usePandaBridge } from 'pandasuite-bridge-react';
import type { BridgeProperties } from '../types';
import { SLOT_NUMBERS } from '../types';
import { hasBridgeLaunchData, hasNativePandaHost, openExternalUrl, toAbsoluteUrl } from '../utils/bridge';
import { buildViewerDeeplink, buildLauncherUrl, cleanValue } from '../utils/deeplink';
import { buildEntriesFromSearch, createSlotEntry, formatRelativeTime, getFilledParams } from '../utils/params';
import DeeplinkPreview from './DeeplinkPreview';
import PageFrame from './PageFrame';

function buildEntries(properties: BridgeProperties, searchParams: URLSearchParams, preferBridge: boolean) {
  if (!preferBridge) {
    return buildEntriesFromSearch(searchParams);
  }
  return SLOT_NUMBERS.map((slot) => {
    const valueId = `param${slot}` as const;
    return createSlotEntry(slot, properties[valueId] ?? '');
  });
}

export default function ViewerScreen() {
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
  const launcherHref = useMemo(() => toAbsoluteUrl(buildLauncherUrl(rawScheme, entries)), [entries, rawScheme]);
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
            <DeeplinkPreview deeplink={deeplink} />
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
