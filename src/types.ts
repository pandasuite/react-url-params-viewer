import type { ReactNode } from 'react';

export const SLOT_NUMBERS = [1, 2] as const;

export type SlotNumber = (typeof SLOT_NUMBERS)[number];
export type ParamValueId = `param${SlotNumber}`;

export type BridgeProperties = Partial<Record<'scheme' | ParamValueId, string>>;

export type ParamEntry = {
  id: ParamValueId;
  value: string;
  isFilled: boolean;
};

export type LauncherParam = {
  id: string;
  key: string;
  value: string;
};

export type LauncherState = {
  scheme: string;
  params: LauncherParam[];
};

export type PageFrameProps = {
  children: ReactNode;
  ctaLabel: string;
  ctaHref: string;
  ctaOnClick?: () => void;
  pageClassName?: string;
};

export type SchemePreset = {
  id: string;
  label: string;
  scheme: string;
  helper: string;
};
