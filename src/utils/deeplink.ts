import { APP_BASE_PATH } from '../constants';
import type { LauncherParam, ParamEntry } from '../types';

export function cleanValue(value: string | null | undefined) {
  return (value ?? '').trim();
}

export function buildDeeplink(
  scheme: string,
  entries: { key: string; value: string }[],
  fallbackScheme = 'pandasuite',
) {
  const normalizedScheme = cleanValue(scheme);
  const base = `${normalizedScheme || fallbackScheme}://`;
  const query = new URLSearchParams();

  entries.forEach(({ key, value }) => {
    const safeKey = cleanValue(key);
    if (safeKey && cleanValue(value)) {
      query.set(safeKey, value);
    }
  });

  const queryString = query.toString();
  return queryString ? `${base}?${queryString}` : base;
}

export function buildViewerDeeplink(scheme: string, entries: ParamEntry[]) {
  return buildDeeplink(
    scheme,
    entries.map((e) => ({ key: e.id, value: e.value })),
    'pandasuite',
  );
}

export function buildLauncherDeeplink(scheme: string, entries: LauncherParam[]) {
  return buildDeeplink(
    scheme,
    entries.map((e) => ({ key: e.key, value: e.value })),
    'app_scheme',
  );
}

export function buildLauncherUrl(scheme: string, params: { id: string; value: string }[]) {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', 'launcher');

  if (cleanValue(scheme)) {
    searchParams.set('scheme', cleanValue(scheme));
  }

  params.forEach((entry) => {
    if (cleanValue(entry.value)) {
      searchParams.set(entry.id, entry.value);
    }
  });

  return `${APP_BASE_PATH}?${searchParams.toString()}`;
}
