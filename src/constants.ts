import type { SchemePreset } from './types';

export const RESERVED_SEARCH_PARAMS = new Set(['mode', 'scheme']);

export const SCHEME_PRESETS: SchemePreset[] = [
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

export const DOC_LINKS = {
  customComponents: 'https://docs.pandasuite.com/essentials/components/custom-components/',
  urlParameters: 'https://docs.pandasuite.com/essentials/project-properties/url-parameters/',
  webComponent: 'https://docs.pandasuite.com/essentials/components/web/',
};

export const APP_BASE_PATH = import.meta.env.BASE_URL;
export const LOGO_PATH = `${import.meta.env.BASE_URL}assets/logo-pandasuite.svg`;
