# Projects library browser fixture check

`project-library.browser.mjs` is a standalone acceptance harness for the real
React application. It uses synthetic libraries of 512, 7 and 0 projects and
intercepts every API request. It never contacts a backend, database, provider or
production media. Unexpected origins, endpoints and mutation requests fail the
run. Chrome uses an isolated temporary browser profile.

Use an existing Playwright installation; this task adds no package dependency.
An installed Chrome browser is the default. `LIBRARY_BROWSER_CHANNEL` can select
another already-installed Playwright channel.

In one PowerShell terminal, from the frontend repository:

```powershell
$env:VITE_API_BASE_URL = 'http://127.0.0.1:18080'
npm run dev -- --host 127.0.0.1 --port 5177 --strictPort
```

In a second terminal:

```powershell
# Omit if Playwright resolves from the current repository.
$env:PLAYWRIGHT_MODULE_PATH = '<existing Playwright module directory>'
node e2e/project-library.browser.mjs
```

`LIBRARY_BASE_URL` defaults to `http://127.0.0.1:5177` and
`LIBRARY_SCREENSHOT_DIR` defaults to `docs/project-library-review`.

The report records completed API responses. React StrictMode's canceled mount
request is excluded. Rapid typing must preserve the entire input and final
server query; its request count must be coalesced rather than one request per
character. Exact debounce timing belongs to the deterministic component tests,
because a busy browser host can pause between input events for more than the
debounce interval.

The checks cover bounded explicit cursor loading, search beyond loaded results,
combined provider/status/pause filters, supported sorts, grid/list views,
detail navigation and browser Back with retained pages and scroll, loading,
refresh errors and retry, empty/no-results, legacy and archived media, and 390px
touch/keyboard interactions without horizontal overflow. Screenshots contain
synthetic thumbnails and project names for owner layout review. They do not
establish live API deployment or human video/creative acceptance.
