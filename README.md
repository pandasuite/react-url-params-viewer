# PandaSuite URL Params Viewer

Modern PandaSuite custom component built with React, TypeScript and Vite.

It covers two complementary use cases:

- `viewer` mode: the PandaSuite custom component displays launch URL parameters received through PandaBridge bindings.
- `launcher` mode: a standalone page builds a deep link such as `app_scheme://?param1=value` and sends the user back to the native app.

The project is intentionally a demo component: the launcher stays flexible for experimentation, while `pandasuite.json` exposes only a small set of bindable slots that developers are expected to adapt to their own project.

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
- `http://localhost:5173/?param1=demo&param2=2026-04-07` to preview fallback values in the browser

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
4. Bind `param1`, `param2`, and `param3` to `Project > Context > Launch > Parameter(s) > ...`.
5. Optionally set `scheme` so the component shows the same deeplink prefix as the native app.

## PandaViewer preset

The launcher includes a built-in `PandaViewer` preset.

- Scheme: `pandasuite`
- Source checked in Android: `pandaviewer/build.gradle`
- Source checked in iOS: `Targets/PandaViewer/PandaViewer-Info.plist`

Example binding plan:

- `param1 -> Project > Context > Launch > Parameter(s) > auth_type`
- `param2 -> Project > Context > Launch > Parameter(s) > created`
- `param3 -> Project > Context > Launch > Parameter(s) > wid`

When the native app is reopened with:

```text
pandasuite://?param1=google&param2=0&param3=bc0fd30b93e36ed000046c
```

the component should receive the updated property values through PandaBridge and refresh its UI.

## Demo behavior

- The PandaSuite viewer keeps `3` bindable slots in `pandasuite.json`.
- The launcher page is dynamic on purpose: you can add and remove parameters freely to test deep links.
- In a real project, you will usually tailor `pandasuite.json` to the exact parameters and fields you want to expose in Studio.

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
https://pandasuite.github.io/react-url-params-viewer/?mode=launcher&scheme=app_scheme&param1=value1&param2=2026-04-07
```

The page keeps the form state in the URL and in `localStorage`, so it is easy to tweak values and retest deep links from the WebView.

## GitHub Pages

The workflow in [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) deploys `dist/` to GitHub Pages on every push to `main`.

Enable Pages in the repository settings with **GitHub Actions** as the source.
