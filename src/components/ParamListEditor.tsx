import type { LauncherParam } from '../types';
import { createLauncherParam } from '../utils/params';

type ParamListEditorProps = {
  params: LauncherParam[];
  onParamsChange: (params: LauncherParam[]) => void;
};

export default function ParamListEditor({ params, onParamsChange }: ParamListEditorProps) {
  function updateParam(id: string, field: 'key' | 'value', nextValue: string) {
    onParamsChange(
      params.map((entry) => (entry.id === id ? { ...entry, [field]: nextValue } : entry)),
    );
  }

  function removeParam(id: string) {
    onParamsChange(params.filter((item) => item.id !== id));
  }

  function addParam() {
    onParamsChange([...params, createLauncherParam(`param${params.length + 1}`)]);
  }

  return (
    <>
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
              onClick={() => removeParam(entry.id)}
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
          onClick={addParam}
        >
          Add parameter
        </button>
      </div>
      <p className="notice">
        This launcher is intentionally dynamic for demo purposes. Add or remove parameters as needed.
      </p>
    </>
  );
}
