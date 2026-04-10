import { RESERVED_SEARCH_PARAMS, SCHEME_PRESETS } from '../constants';
import type { LauncherParam, LauncherState, ParamEntry, SlotNumber } from '../types';
import { cleanValue } from './deeplink';

export function createSlotEntry(slot: SlotNumber, value = ''): ParamEntry {
  return {
    id: `param${slot}`,
    value,
    isFilled: Boolean(cleanValue(value)),
  } as ParamEntry;
}

export function createLauncherParam(key = '', value = ''): LauncherParam {
  return {
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    key,
    value,
  };
}

export function getFilledParams(entries: ParamEntry[]) {
  return entries.reduce<Record<string, string>>((result, entry) => {
    if (cleanValue(entry.value)) {
      result[entry.id] = entry.value;
    }
    return result;
  }, {});
}

export function buildLauncherParamsFromSearch(searchParams: URLSearchParams) {
  const params: LauncherParam[] = [];
  searchParams.forEach((value, key) => {
    if (RESERVED_SEARCH_PARAMS.has(key)) {
      return;
    }
    params.push(createLauncherParam(key, value));
  });
  return params;
}

export function createLauncherState(searchParams: URLSearchParams): LauncherState {
  const params = buildLauncherParamsFromSearch(searchParams);
  return {
    scheme: searchParams.get('scheme') || 'pandasuite',
    params: params.length > 0 ? params : [createLauncherParam('param1', 'value1')],
  };
}

export function getPresetForScheme(scheme: string) {
  const normalizedScheme = cleanValue(scheme).toLowerCase();
  return SCHEME_PRESETS.find((preset) => preset.scheme === normalizedScheme)?.id || 'custom';
}

export function formatRelativeTime(isoValue: string | null) {
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
