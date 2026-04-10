import PandaBridge from 'pandasuite-bridge';
import type { BridgeProperties, ParamValueId } from '../types';
import { SLOT_NUMBERS } from '../types';

export function hasBridgeLaunchData(properties: BridgeProperties) {
  return (
    properties.scheme !== undefined ||
    SLOT_NUMBERS.some((slot) => {
      const valueId = `param${slot}` as ParamValueId;
      return properties[valueId] !== undefined;
    })
  );
}

export function hasNativePandaHost() {
  const windowWithBridge = window as Window & {
    WebViewAndroidBridge?: unknown;
    WebViewJavascriptBridge?: unknown;
  };
  return Boolean(windowWithBridge.WebViewAndroidBridge || windowWithBridge.WebViewJavascriptBridge);
}

export function isMobileDevice() {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function toAbsoluteUrl(url: string) {
  return new URL(url, window.location.href).toString();
}

export { toAbsoluteUrl };

export function openExternalUrl(url: string) {
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
