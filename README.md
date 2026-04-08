# PandaSuite URL Params Viewer

Modern PandaSuite custom component built with React, TypeScript and Vite.

It covers two complementary use cases:

- `viewer` mode: the PandaSuite custom component displays launch URL parameters received through PandaBridge bindings.
- `launcher` mode: a standalone page builds a deep link such as `app_scheme://?param1=value` and sends the user back to the native app.

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
- `http://localhost:5173/?auth_type=demo&created=2026-04-07` to preview fallback values in the browser

## Production build

```bash
npm run build
```

This creates:

- `dist/` for GitHub Pages or any static hosting
- `pandasuite-component.zip` to upload as a PandaSuite custom component release asset

## Recommended PandaSuite setup

Use the project in two separate ways inside PandaSuite:

- **Custom component** for the parameter viewer
- **Web component** for the launcher page

Recommended setup:

1. Deploy `dist/` to GitHub Pages.
2. Use the hosted URL as the source of the custom component and refresh metadata so Studio loads `pandasuite.json`.
3. Add a separate **Web** component in `Online` mode and point it to:
   `https://pandasuite.github.io/react-url-params-viewer/?mode=launcher`

Use the ZIP only when you explicitly need an offline Web component import.

## PandaSuite setup

1. Publish the static build somewhere accessible by PandaSuite, for example GitHub Pages.
2. Refresh metadata in PandaSuite Studio so it loads `pandasuite.json`.
3. Add the custom component URL to your project.
4. Bind each `paramXValue` property to `Project > Context > Launch > Parameter(s) > ...`.
5. Keep the matching `paramXKey` equal to the exact launch parameter name.
6. Optionally set `scheme` so the component shows the same deeplink prefix as the native app.

## PandaViewer preset

The launcher includes a built-in `PandaViewer` preset.

- Scheme: `pandasuite`
- Source checked in Android: `pandaviewer/build.gradle`
- Source checked in iOS: `Targets/PandaViewer/PandaViewer-Info.plist`

Example binding plan:

- `param1Key = auth_type`
- `param1Value -> Project > Context > Launch > Parameter(s) > auth_type`
- `param2Key = created`
- `param2Value -> Project > Context > Launch > Parameter(s) > created`

When the native app is reopened with:

```text
app_scheme://?auth_type=68d6ba8ab47c018f0004e4
```

the component should receive the updated property value through PandaBridge and refresh its UI.

## Launcher page

The launcher page can run from:

- a separate PandaSuite Web component
- GitHub Pages
- any browser

Open it with:

```text
https://pandasuite.github.io/react-url-params-viewer/?mode=launcher
```

You can also prefill the form through the page URL:

```text
https://pandasuite.github.io/react-url-params-viewer/?mode=launcher&scheme=app_scheme&auth_type=68d6ba8ab47c018f0004e4&created=2026-04-07
```

The page keeps the form state in the URL and in `localStorage`, so it is easy to tweak values and retest deep links from the WebView.

## GitHub Pages

The workflow in [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) deploys `dist/` to GitHub Pages on every push to `main`.

Enable Pages in the repository settings with **GitHub Actions** as the source.
