import { DOC_LINKS, SCHEME_PRESETS } from '../constants';

type SchemePresetPickerProps = {
  presetId: string;
  scheme: string;
  onPresetChange: (presetId: string) => void;
  onSchemeChange: (scheme: string) => void;
};

export default function SchemePresetPicker({ presetId, scheme, onPresetChange, onSchemeChange }: SchemePresetPickerProps) {
  return (
    <>
      <div className="preset-group" aria-label="Scheme presets">
        {SCHEME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`preset-chip ${presetId === preset.id ? 'preset-chip--active' : ''}`}
            onClick={() => onPresetChange(preset.id)}
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
            onChange={(event) => onSchemeChange(event.target.value)}
            placeholder="pandasuite"
          />
        </label>
      ) : null}
    </>
  );
}
