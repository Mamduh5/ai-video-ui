# Project Details browser acceptance

`project-details.browser.mjs` checks the real React workspace using isolated,
synthetic API responses and committed illustrative H.264 MP4 media. It blocks
unexpected origins, endpoints and every mutation request. It never contacts a
backend, provider, production media or database, and uses a temporary Chrome
profile.

Start the frontend with its fixture API origin in one PowerShell terminal:

```powershell
$env:VITE_API_BASE_URL = 'http://127.0.0.1:18080'
npm.cmd --prefix 'D:\Mamduh\Personal\ai-video-ui' run dev -- --host 127.0.0.1 --port 5177 --strictPort
```

Run the harness from a second terminal. It reuses an installed Playwright module
without adding a frontend dependency:

```powershell
$env:PLAYWRIGHT_MODULE_PATH = 'D:\Mamduh\Personal\social-account-managemnet\node_modules\playwright'
node 'D:\Mamduh\Personal\ai-video-ui\e2e\project-details.browser.mjs'
```

`STUDIO_BASE_URL` defaults to `http://127.0.0.1:5177`.
`STUDIO_SCREENSHOT_DIR` defaults to the absolute repository path
`docs/project-details-review`. `STUDIO_BROWSER_CHANNEL` defaults to installed
Chrome. Output includes the `browser-report.json` check results and 1440px and
390px screenshots.

Coverage includes supervised review and regeneration visibility, scene
selection, native media decoding, completed/archived projects, Gemini queue and
recovery, unattended production, pause, storyboard, opening images, conformance,
continuity handoff, missing media, loading/errors, library navigation context,
keyboard/touch controls, drawer defaults/completion/manual refetch behavior and
page overflow. Synthetic media establishes UI/media handling only; it is not
evidence of live provider output or human audiovisual acceptance. Both fixture
MP4s are exactly eight seconds long. Captures require a finite native duration,
working native playback, and enabled seek/filmstrip controls.

The harness does not require FFmpeg. To regenerate the two MP4s offline, run
`generate-studio-fixture-media.mjs` with the same Playwright environment and an
installed FFmpeg (`FFMPEG_PATH` may provide an explicit executable path). The
generator draws the clearly marked illustration in a browser canvas and encodes
the local image as a finite-duration MP4. No provider is involved.
