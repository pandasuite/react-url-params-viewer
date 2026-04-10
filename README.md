# PandaSuite URL Params Viewer

A demo component built with React, TypeScript and Vite that shows how to expose and consume URL parameters through the PandaSuite bridge.

## Why this project exists

PandaSuite lets you bind launch URL parameters to custom component properties via `pandasuite.json`. This project demonstrates the full round-trip:

1. **Viewer** (PandaSuite custom component) — reads `param1`, `param2` and `scheme` from the bridge via `usePandaBridge()` and displays them.
2. **Launcher** (external browser page) — builds a deep link like `scheme://?param1=value` and sends the user back to the native app.

The typical flow:

```
PandaSuite app (Viewer)
  → opens the Launcher in an external browser
  → user fills in parameters
  → taps "Open app"
  → deep link reopens the PandaSuite app
  → Viewer receives the new values through the bridge
```

The code is intentionally simple and well-separated so you can read each file independently and understand how the bridge integration works.

## Project structure

```
src/
  App.tsx                              # Routes between Viewer and Launcher (?mode=launcher)
  types.ts                             # Shared type definitions
  constants.ts                         # Presets, doc links, base paths
  utils/
    deeplink.ts                        # Deep link URL building
    params.ts                          # Parameter entry helpers
    bridge.ts                          # PandaBridge utilities (open URL, detect native host)
  components/
    PageFrame.tsx                      # Shared layout shell (header + CTA)
    DeeplinkPreview.tsx                # Deep link display (shared between screens)
    ViewerScreen.tsx                   # Bridge consumer — reads properties, sends queryable data
      └─ uses usePandaBridge()         #   This is the core bridge integration
    LauncherScreen.tsx                 # Deep link builder — form state, localStorage persistence
      ├─ SchemePresetPicker.tsx        #   Preset chips + custom scheme input
      └─ ParamListEditor.tsx           #   Dynamic parameter rows (add/remove)
```

### Key files to read first

- **`pandasuite.json`** — declares which properties are bindable in PandaSuite Studio (`param1`, `param2`, `scheme`).
- **`ViewerScreen.tsx`** — shows how `usePandaBridge()` exposes bridge properties and how `PandaBridge.send(PandaBridge.UPDATED, ...)` pushes queryable data back.
- **`LauncherScreen.tsx`** — shows how to build a deep link and trigger it with `window.location.href`.

## Stack

- React 18
- TypeScript
- Vite
- `pandasuite-bridge-react`

## Install

```bash
npm install
```

## Local development

```bash
npm run dev
```

Useful URLs:

- `http://localhost:5173/` for the viewer
- `http://localhost:5173/?mode=launcher` for the launcher page

## Production build

```bash
npm run build
```

This creates:

- `dist/` for GitHub Pages or any static hosting
- `pandasuite-component.zip` to upload as a PandaSuite custom component release asset

## PandaSuite setup

Use the project in two separate ways inside PandaSuite:

- **Custom component** for the parameter viewer
- **Web component** for the launcher page

You can integrate it in two different forms:

- **Hosted URL**: use the deployed site, for example GitHub Pages
- **ZIP package**: use `pandasuite-component.zip` when you want an offline import

### Recommended hosted setup

1. Deploy `dist/` to GitHub Pages.
2. Use the hosted root URL as the source of the custom component and refresh metadata.
3. Add a separate **Web** component in `Online` mode and point it to:
   `https://pandasuite.github.io/react-url-params-viewer/?mode=launcher`

### Recommended packaged setup

1. Build the project to generate `pandasuite-component.zip`.
2. Import the ZIP where you need an offline package.
3. If you use the ZIP for the Web component, open `index.html` with `?mode=launcher`.

### Binding parameters

1. Refresh metadata in PandaSuite Studio so it loads `pandasuite.json`.
2. Bind `param1` and `param2` to `Project > Context > Launch > Parameter(s) > ...`.
3. Optionally set `scheme` so the component uses the same deep link prefix as the native app.

### What you can customize

- **`pandasuite.json`** — rename props, add more props, remove demo props, or change defaults and placeholders to match your own project.
- **`scheme`** — controls the deep link prefix (`pandasuite://`, `myapp://`, etc.).
- **The launcher page** — the form is intentionally dynamic: add, remove, rename and fill parameters freely.

## PandaViewer preset

The launcher includes a built-in `PandaViewer` preset.

- Scheme: `pandasuite`
- Source checked in Android: `pandaviewer/build.gradle`
- Source checked in iOS: `Targets/PandaViewer/PandaViewer-Info.plist`

Example binding plan:

- `param1 -> Project > Context > Launch > Parameter(s) > auth_type`
- `param2 -> Project > Context > Launch > Parameter(s) > created`

When the native app is reopened with:

```text
pandasuite://?param1=google&param2=0
```

the component receives the updated property values through PandaBridge and refreshes its UI.

## GitHub Pages

The workflow in [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) deploys `dist/` to GitHub Pages on every push to `main`.

Enable Pages in the repository settings with **GitHub Actions** as the source.
