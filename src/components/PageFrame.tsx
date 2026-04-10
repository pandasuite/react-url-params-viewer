import { APP_BASE_PATH, LOGO_PATH } from '../constants';
import type { PageFrameProps } from '../types';

export default function PageFrame({ children, ctaLabel, ctaHref, ctaOnClick, pageClassName }: PageFrameProps) {
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
