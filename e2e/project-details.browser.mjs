/* global document, window */
import assert from "node:assert/strict";

import console from "node:console";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath, URL } from "node:url";

// Fixture-only acceptance against the real React application. Every API request
// is intercepted; unexpected origins, endpoints and all mutations fail closed.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseURL = process.env.STUDIO_BASE_URL || "http://127.0.0.1:5177";
const fixtureOrigin = "http://127.0.0.1:18080";
const appOrigin = new URL(baseURL).origin;
const outputDir = path.resolve(process.env.STUDIO_SCREENSHOT_DIR || path.join(repo, "docs/project-details-review"));
const checks = [], screenshots = [], safetyViolations = [], browserErrors = [], fixtureStates = [];
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.STUDIO_BROWSER_CHANNEL || "chrome" });
console.log("Started isolated fixture browser");

// Finite-duration H.264 assets are generated offline from an illustrative canvas.
// See generate-studio-fixture-media.mjs; no provider footage is involved.
const videos = {
  wide: await readFile(path.join(repo, "e2e/fixtures/studio-wide.mp4")),
  portrait: await readFile(path.join(repo, "e2e/fixtures/studio-portrait.mp4")),
};
const media = { duration_seconds: 8, width: 1280, height: 720, display_aspect_ratio: "16:9", video_codec: "h264", audio_present: true, audio_codec: "aac", audio_channels: 2 };
const review = { verdict: "warning", summary: "The clock remains visible, with a small continuity concern.", issues: [{ category: "prop_continuity", severity: "medium", description: "Clock shifts toward the edge of the table.", evidence_frames: [2] }], checks: { character_consistency: "pass", important_prop_consistency: "warning" }, retry_recommended: false, retry_prompt_delta: ["Keep the clock in the center of the table."], frames: [{ index: 1, timestamp_seconds: 0 }, { index: 2, timestamp_seconds: 4 }], limitations: ["Sampled frames do not establish audio or full motion."] };
function request(order, aspect = "16:9") {
  return { story_beat: ["A letter arrives", "A memory in the workshop", "The final farewell"][order - 1], scene_goal: ["Discover the letter", "Inspect the clock", "Leave the workshop"][order - 1], entry_state: "The clockmaker stands beside the oak table.", action: "He turns the clock and reads the letter.", exit_state: "The clock rests in the center of the table.", visual_description: "A warm, quiet workshop at dusk.", motion_prompt: "A slow camera move follows the clockmaker's hands.", character_continuity: "Same clockmaker and coat", environment_continuity: "Same workshop and oak table", aspect_ratio: aspect, duration_seconds: 8, generation_attempt: 1, audio_intent: { mode: "clip_native", dialogue: "Time has kept your letter safe." } };
}
function baseJob(id = "studio-review") {
  const scenes = [
    { order: 1, status: "accepted", first_frame_url: "/__studio-fixture/opening.svg", clip_url: "/__studio-fixture/video/wide.mp4", current_attempt: 1, generation_request: request(1), attempts: [{ attempt: 1, decision: "accepted", imported_at: "2026-10-17T10:00:00Z", media, conformance: { status: "pass", checks: [] }, review: { ...review, verdict: "pass", issues: [], retry_prompt_delta: [] }, handoff: { frame_index: 1, confirmed: true }, handoff_frames: [{ index: 1, timestamp_seconds: 7.8, object_key: "fixture/handoff", sha256: "fixture-only" }] }] },
    { order: 2, status: "human_decision_required", first_frame_url: "/__studio-fixture/opening.svg", clip_url: "/__studio-fixture/video/wide.mp4", current_attempt: 1, generation_request: request(2), attempts: [{ attempt: 1, imported_at: "2026-10-17T10:01:00Z", media, conformance: { status: "pass", checks: [] }, review }] },
    { order: 3, status: "waiting", generation_request: request(3), attempts: [] },
  ];
  return { id, title: "The Clockmaker's Last Letter", status: "awaiting_human_decision", current_step: "scene_review", display_status: "Needs your decision", generation_provider: "flow_web", review_policy: "ai_assisted", continuity_mode: "chained_frames", scene_count: 3, accepted_count: 1, aspect_ratio: "16:9", scene_seconds: 8, audio_policy: "clip_native", generation_settings: { version: "generation_settings.v1", mode: "dense_performance", performance_tempo: 2 }, next_action: { type: "review_scene", label: "Review Scene 2", message: "Watch the scene, review the findings, and decide whether to accept or regenerate.", scene_order: 2, background: false }, production: { mode: "supervised", status: "awaiting_acceptance", started: true, paused: false, auto_advance_after_accept: true, scene_count: 3, accepted_count: 1, current_scene: 2, flow_submissions: 2, uncertain_submissions: 0, scenes: scenes.map(scene => ({ order: scene.order, status: scene.order === 2 ? "awaiting_acceptance" : scene.status, can_generate: false, can_resume_flow: false, flow_submissions: scene.clip_url ? 1 : 0, uncertain_submissions: 0, attempt_count: scene.attempts.length })) }, scenes };
}
function completedJob(id = "studio-complete") {
  const job = baseJob(id);
  return { ...job, title: "A Letter Through Time", status: "completed", current_step: "completed", display_status: "Completed", accepted_count: 3, video_url: "/__studio-fixture/video/wide.mp4", scene_boundaries: [{ scene_order: 1, attempt: 1, start_seconds: 0, end_seconds: 2.5 }, { scene_order: 2, attempt: 1, start_seconds: 2.5, end_seconds: 5.25 }, { scene_order: 3, attempt: 1, start_seconds: 5.25, end_seconds: 8 }], next_action: { type: "watch_final_video", label: "Your video is ready", message: "Watch or download the completed video." }, production: { ...job.production, status: "completed", accepted_count: 3 }, scenes: job.scenes.map(scene => ({ ...scene, status: "accepted", clip_url: "/__studio-fixture/video/wide.mp4", current_attempt: 1, attempts: [{ attempt: 1, decision: "accepted", imported_at: "2026-10-17T10:02:00Z", media, conformance: { status: "pass", checks: [] }, review: { ...review, verdict: "pass", issues: [], retry_prompt_delta: [] } }] })) };
}
function producingScenes() { return baseJob().scenes.map(scene => scene.order === 2 ? { order: 2, status: "generating", generation_request: request(2), attempts: [] } : scene); }
const storage = archived => ({ state: archived ? "archived" : "not_requested", bytes_removed: archived ? 16000000 : 0, manifest: { verified: archived }, artifacts: [{ role: "final_video", local_object_key: "fixture/final.mp4", size: 16000000, verified: archived, local_removed: archived, drive_file_id: archived ? "fixture-drive-file" : undefined }] });
function frameSvg() { return '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="s" x2="0" y2="1"><stop stop-color="#273d61"/><stop offset="1" stop-color="#d8af8d"/></linearGradient></defs><path fill="url(#s)" d="M0 0h640v360H0z"/><circle cx="480" cy="90" r="35" fill="#f8deb2"/><path d="M0 220l130-120 120 110 110-80 180 90 100-60v200H0z" fill="#384b65"/><path d="M0 290l170-110 190 100 140-80 140 90v70H0z" fill="#1e354c"/><rect x="14" y="14" width="612" height="32" rx="4" fill="#101f34"/><text x="26" y="35" fill="#fff" font-family="sans-serif" font-size="15">ILLUSTRATIVE FIXTURE · NO PROVIDER OUTPUT</text></svg>'; }

async function makePage({ mobile = false, job = baseJob(), slow = 0, failure = false, archived = false, archiveRecord } = {}) {
  const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 900 }, deviceScaleFactor: 1, ...(mobile ? { isMobile: true, hasTouch: true } : {}) });
  const page = await context.newPage();
  const state = { job, slow, failure, archived, archiveRecord, requests: [], completedRequests: [], mutations: [] };
  fixtureStates.push(state);
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("response", response => { const url = new URL(response.url()); if (url.origin === fixtureOrigin) state.completedRequests.push(url.pathname); });
  await context.route("**/*", async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.origin === appOrigin && req.method() === "GET" && (req.resourceType() === "document" || /^(\/src\/|\/node_modules\/|\/@|\/assets\/|\/favicon\.ico$)/.test(url.pathname))) return route.continue();
    const reject = () => { safetyViolations.push(`${req.method()} ${url.origin}${url.pathname}`); return route.abort("blockedbyclient"); };
    if (url.origin !== fixtureOrigin || req.method() !== "GET") { if (req.method() !== "GET") state.mutations.push(`${req.method()} ${url.pathname}`); return reject(); }
    const headers = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
    const respond = (body, status = 200) => route.fulfill({ status, contentType: "application/json", headers, body: JSON.stringify(body) });
    state.requests.push(url.pathname);
    if (url.pathname === "/storage") return respond({ local: [], drive_status: "connected", queue_count: 0 });
    if (url.pathname === `/scene-video-jobs/${state.job.id}`) {
      if (state.slow) await delay(state.slow);
      if (state.failure) return respond({ error: "Fixture project temporarily unavailable" }, 503);
      return respond(state.job);
    }
    if (url.pathname === `/storage/projects/${state.job.id}`) return respond(state.archiveRecord ?? storage(state.archived));
    if (url.pathname === `/scene-video-jobs/${state.job.id}/slowdown/exports`) return respond({ exports: [] });
    if (/^\/__studio-fixture\/video\/(wide|portrait)\.mp4$/.test(url.pathname)) return route.fulfill({ status: 200, contentType: "video/mp4", headers, body: videos[url.pathname.includes("portrait") ? "portrait" : "wide"] });
    if (url.pathname === "/__studio-fixture/opening.svg" || /^\/scene-video-jobs\/[^/]+\/scenes\/\d+\/attempts\/\d+\/(frames|handoff)\/\d+$/.test(url.pathname)) return route.fulfill({ status: 200, contentType: "image/svg+xml", headers, body: frameSvg() });
    if (url.pathname === "/scene-video-library") return respond({ api_version: "scene-video-library.v1", projects: [{ id: state.job.id, title: state.job.title, status: state.job.status, display_status: state.job.display_status, provider: "flow_web", workflow: "flow_supervised", paused: false, progress: { scene_count: 3, accepted_count: 1, percent: 33 }, storage: { state: "local", label: "Local", archive_percent: 0 }, next_action: state.job.next_action, created_at: "2026-10-17T00:00:00Z", updated_at: "2026-10-17T10:00:00Z", thumbnail_url: null, video_url: null, duration_seconds: 24, aspect_ratio: "16:9", next_automatic_at: null, eligibility_estimated: false, acceptance_type: null }], page: { limit: 40, has_more: false, next_cursor: null }, sort: url.searchParams.get("sort") || "recent" });
    return reject();
  });
  return { page, state, context };
}
async function check(name, run) {
  const start = Date.now();
  try { await run(); checks.push({ name, result: "PASS", elapsed_ms: Date.now() - start }); console.log(`PASS ${name}`); }
  catch (error) { checks.push({ name, result: "FAIL", message: error.message }); throw error; }
}
async function open(page, id) { await page.goto(`${baseURL}/scene-jobs/${id}`); await page.locator(".project-studio").waitFor(); }
async function noOverflow(page) {
  const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert.ok(size.content <= size.viewport, `page fits viewport (${size.content}px / ${size.viewport}px)`);
}
async function screenshot(page, name, fullPage = false) {
  await noOverflow(page);
  // Exercise native playback before freezing the first frame. Metadata-only
  // preload can otherwise leave Chrome's initial spinner in a static capture.
  await page.locator(".studio-stage video").evaluateAll(async videos => {
    for (const video of videos) {
      await video.play(); await new Promise(resolve => window.setTimeout(resolve, 120)); video.pause(); video.currentTime = 0;
      if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error("Fixture native media duration must be finite");
    }
  });
  if (await page.locator(".studio-stage video").count()) {
    await page.getByLabel(/viewing duration$/).filter({ hasText: /^Source: 8/ }).first().waitFor();
    assert.equal(await page.locator('.studio-stage input[type="range"]').isEnabled(), true, "native finite duration enables seeking");
    for (const button of await page.locator('[aria-label="Scene filmstrip"] button').all()) assert.equal(await button.isEnabled(), true, "finite duration enables evidence-frame seeking");
  }
  await page.waitForTimeout(160); await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(outputDir, name), fullPage, animations: "disabled" }); screenshots.push(name);
}
const slowdown = page => page.getByRole("button", { name: "Export a separate slow version", exact: true });
const storageDrawer = page => page.locator('[aria-label="Project storage"]').getByRole("button", { name: "Storage", exact: true });
async function isOpen(locator) { return await locator.getAttribute("aria-expanded") === "true"; }
async function refresh(page, state) { const count = state.requests.filter(url => url === `/scene-video-jobs/${state.job.id}`).length; await page.getByRole("button", { name: "Refresh project", exact: true }).click(); await page.waitForFunction(() => !document.querySelector('[aria-label="Refresh project"]')?.disabled); await page.waitForTimeout(150); assert.ok(state.requests.filter(url => url === `/scene-video-jobs/${state.job.id}`).length > count); }

try {
  const reviewPage = await makePage();
  await check("supervised review: stage, horizontal timeline and immediate decision inspector", async () => {
    const { page } = reviewPage;
    await open(page, "studio-review");
    await page.getByRole("navigation", { name: "Scene timeline", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Select scene 2", exact: true }).getAttribute("aria-pressed"), "true");
    const inspector = page.getByLabel("Action inspector", { exact: true });
    await inspector.getByRole("button", { name: "Accept Scene", exact: true }).waitFor();
    await inspector.getByRole("button", { name: "Regenerate", exact: true }).waitFor();
    await inspector.getByRole("button", { name: "Regenerate with review corrections", exact: true }).waitFor();
    try { await page.waitForFunction(() => [...document.querySelectorAll("video")].some(video => video.readyState >= 2 && video.videoWidth === 640), undefined, { timeout: 15000 }); }
    catch (error) { console.log(JSON.stringify(await page.locator("video").evaluateAll(items => items.map(video => ({ src: video.currentSrc, ready: video.readyState, width: video.videoWidth, height: video.videoHeight, error: video.error?.message }))))); throw error; }
    const bounds = await inspector.boundingBox(); assert.ok(bounds.x > 850 && bounds.y < 600, "desktop inspector sits beside stage above the fold");
    assert.equal(await isOpen(slowdown(page)), false);
    if (await storageDrawer(page).count()) assert.equal(await isOpen(storageDrawer(page)), false);
    await screenshot(page, "desktop-flow-review.png");
    await screenshot(page, "desktop-flow-review-full.png", true);
  });
  await check("scene selection changes stage and keeps the global next action discoverable", async () => {
    const { page } = reviewPage;
    await page.getByRole("button", { name: "Select scene 1", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Select scene 1", exact: true }).getAttribute("aria-pressed"), "true");
    await page.getByRole("button", { name: "Select scene 3", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Select scene 3", exact: true }).getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator(".studio-stage video").count(), 0, "waiting scene has a placeholder");
    await page.getByRole("button", { name: "Select scene 2", exact: true }).click();
    await screenshot(page, "desktop-flow-selection.png");
  });
  await check("incomplete drawer choice survives explicit refetch and automatic polling", async () => {
    const { page, state } = reviewPage;
    await slowdown(page).click(); assert.equal(await isOpen(slowdown(page)), true);
    state.job = { ...state.job, next_action: { ...state.job.next_action, background: true } };
    await refresh(page, state);
    const before = state.requests.length; await page.waitForTimeout(2300); assert.ok(state.requests.length > before, "background fixture actually polls");
    assert.equal(await isOpen(slowdown(page)), true);
    await slowdown(page).click(); assert.equal(await isOpen(slowdown(page)), false);
    await refresh(page, state); assert.equal(await isOpen(slowdown(page)), false);
  });
  await check("completion expands applicable drawers once and preserves later manual closure", async () => {
    const { page, state } = reviewPage;
    state.job = completedJob("studio-review"); await refresh(page, state);
    assert.equal(await isOpen(slowdown(page)), true); assert.equal(await isOpen(storageDrawer(page)), true);
    await slowdown(page).click(); await storageDrawer(page).click();
    await refresh(page, state); assert.equal(await isOpen(slowdown(page)), false); assert.equal(await isOpen(storageDrawer(page)), false);
  });
  const complete = await makePage({ job: completedJob() });
  await check("completed project defaults to final video with native playback, markers and expanded drawers", async () => {
    const { page } = complete; await open(page, "studio-complete");
    assert.equal(await page.getByRole("button", { name: "Select final video", exact: true }).getAttribute("aria-pressed"), "true");
    await page.getByRole("link", { name: "Download Video", exact: true }).waitFor();
    await page.getByRole("navigation", { name: "Scene markers", exact: true }).waitFor();
    assert.equal(await isOpen(slowdown(page)), true); assert.equal(await isOpen(storageDrawer(page)), true);
    await screenshot(page, "desktop-completed.png");
    await screenshot(page, "desktop-completed-full.png", true);
  });
  await check("client navigation to another incomplete project resets drawer defaults", async () => {
    const { page, state } = complete;
    await slowdown(page).click();
    state.job = baseJob("studio-second");
    await page.locator(".project-studio").getByRole("link", { name: /Projects/ }).first().click();
    await page.locator("main article").first().getByRole("link").first().click();
    await page.waitForURL("**/scene-jobs/studio-second"); await page.locator(".project-studio").waitFor();
    assert.equal(await isOpen(slowdown(page)), false);
    if (await storageDrawer(page).count()) assert.equal(await isOpen(storageDrawer(page)), false);
  });
  const archivedJob = { ...completedJob("studio-archived"), video_url: "", next_action: { type: "restore_local", label: "Restore & Watch", message: "The verified archive is in Google Drive. Restore local media before playback." }, scenes: completedJob().scenes.map(scene => ({ ...scene, clip_url: "" })) };
  const archived = await makePage({ job: archivedJob, archived: true });
  await check("archived final: storage opens with restoration and no unusable video or slowdown control", async () => {
    const { page } = archived; await open(page, "studio-archived");
    await page.getByRole("button", { name: "Restore & Watch", exact: true }).waitFor();
    assert.equal(await isOpen(storageDrawer(page)), true); assert.equal(await page.locator("video").count(), 0);
    assert.equal(await page.getByRole("button", { name: "Calculate duration from source media", exact: true }).count(), 0);
    await screenshot(page, "desktop-archived.png");
    await screenshot(page, "desktop-archived-full.png", true);
  });
  await check("partial archive restores missing scenes while final playback and whole-final export remain available", async () => {
    const job = completedJob("studio-partial-archive");
    const archiveRecord = { state: "archived", manifest: { verified: true }, bytes_removed: 4000000, artifacts: [
      { role: "scene_clip", scene_order: 1, local_object_key: "fixture/scene-1.mp4", size: 3000000, verified: true, local_removed: true, drive_file_id: "fixture-scene-1" },
      { role: "reference_image", scene_order: 1, local_object_key: "fixture/reference-1.svg", size: 1000000, verified: true, local_removed: true, drive_file_id: "fixture-reference-1" },
      { role: "final_video", local_object_key: "fixture/final.mp4", size: 16000000, verified: true, local_removed: false, drive_file_id: "fixture-final" },
    ] };
    const { page, state } = await makePage({ job, archiveRecord }); await open(page, job.id);
    await page.getByRole("button", { name: "Restore & Watch", exact: true }).waitFor();
    assert.equal(await page.getByRole("radio", { name: "Individual scenes, then assemble", exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole("radio", { name: "Whole final video", exact: true }).isEnabled(), true);
    assert.equal(await page.getByRole("button", { name: "Calculate duration from source media", exact: true }).isEnabled(), true);
    assert.equal(state.completedRequests.filter(url => url === `/storage/projects/${job.id}`).length, 1, "workspace and drawer share one initial storage request");
    await page.getByRole("button", { name: "Select scene 1", exact: true }).click();
    await page.getByRole("heading", { name: "Restore this scene to preview", exact: true }).waitFor();
    assert.equal(await page.locator(".studio-stage video").count(), 0);
    assert.equal(await page.getByRole("button", { name: "Select scene 1", exact: true }).locator("img").count(), 0);
    await screenshot(page, "desktop-partial-archive-scene.png");
    await page.getByRole("button", { name: "Select final video", exact: true }).click();
    await page.getByLabel("Final video video", { exact: true }).waitFor();
    await screenshot(page, "desktop-partial-archive-final.png", true);
  });
  const matrix = [
    ["gemini-queued", "Gemini Autopilot", { autopilot: { provider: "gemini_web", review_status: "technical" }, generation_provider: "gemini_web", production: undefined, status: "pending", display_status: "Queued for Gemini Autopilot", scenes: producingScenes(), next_action: { type: "wait_for_generation", label: "Queued for Gemini", message: "Waiting for the automatic production queue.", scene_order: 2, background: true } }],
    ["gemini-generating", "Gemini Autopilot", { autopilot: { provider: "gemini_web", review_status: "technical" }, generation_provider: "gemini_web", production: undefined, status: "running", display_status: "Gemini is generating Scene 2", scenes: producingScenes(), next_action: { type: "wait_for_generation", label: "Generating Scene 2", message: "Generation is in progress. Technical validation follows automatically.", scene_order: 2, background: true } }],
    ["gemini-waiting", "Gemini Autopilot", { autopilot: { provider: "gemini_web", review_status: "technical" }, generation_provider: "gemini_web", production: undefined, status: "pending", display_status: "Waiting for next automatic action", scenes: producingScenes(), next_automatic_at: "2026-10-18T02:00:00Z", eligibility_estimated: true, next_action: { type: "wait_for_generation", label: "Waiting for availability", message: "The next availability check is estimated.", scene_order: 2, background: true } }],
    ["gemini-completed", "Creative quality has not been human reviewed", { ...completedJob("gemini-completed"), autopilot: { provider: "gemini_web", review_status: "technical" }, generation_provider: "gemini_web", production: undefined }],
    ["gemini-recovery", "Gemini Autopilot", { autopilot: { provider: "gemini_web", review_status: "technical" }, generation_provider: "gemini_web", production: undefined, status: "failed", display_status: "Recovery required", diagnostic: { code: "external_result_uncertain", stage: "generation", source: "fixture", message: "An existing result needs recovery. Check the queue before retrying.", retryable: false }, next_action: { type: "recover_generation", label: "Review recovery in Gemini queue", message: "An existing result needs recovery." } }],
    ["flow-unattended", "Flow unattended", { production: { ...baseJob().production, mode: "flow_unattended", status: "generating" }, status: "running", display_status: "Flow is generating Scene 2", scenes: producingScenes(), next_action: { type: "wait_for_generation", label: "Generating Scene 2", message: "Technical validation follows automatically.", scene_order: 2, background: true } }],
    ["flow-unattended-queued", "Flow unattended", { production: { ...baseJob().production, mode: "flow_unattended", status: "ready" }, status: "pending", display_status: "Queued for Flow unattended", scenes: producingScenes(), next_action: { type: "wait_for_generation", label: "Queued for automatic generation", message: "The queue will continue automatically.", scene_order: 2, background: true } }],
    ["flow-unattended-completed", "Technical acceptance is automatic", { ...completedJob("flow-unattended-completed"), production: { ...completedJob().production, mode: "flow_unattended" } }],
    ["flow-paused", "Paused", { production: { ...baseJob().production, paused: true }, display_status: "Production paused", next_action: { type: "resume_production", label: "Production paused", message: "Resume when you are ready.", scene_order: 2 } }],
    ["storyboard", "Start Production", { production: { ...baseJob().production, started: false, status: "ready", accepted_count: 0, current_scene: 1 }, accepted_count: 0, status: "awaiting_external_generation", display_status: "Storyboard ready", scenes: [1, 2, 3].map(order => ({ order, status: "waiting", generation_request: request(order), attempts: [] })), next_action: { type: "start_production", label: "Your storyboard is ready", message: "Review the story before starting production.", scene_order: 1 } }],
    ["opening-image", "Use This Image", { production: { ...baseJob().production, started: false, status: "ready" }, opening_image: { required: true, provider: "flow_web", versions: [{ version: 1, media_check: "passed", width: 1280, height: 720 }] }, opening_image_url: "/__studio-fixture/opening.svg", next_action: { type: "review_opening_image", label: "Review the opening image", message: "Approve the image before starting video generation.", scene_order: 1 } }],
    ["missing-artifacts", "Scene timeline", { status: "awaiting_external_generation", display_status: "Waiting for source media", scenes: [1, 2, 3].map(order => ({ order, status: "waiting", generation_request: request(order), attempts: [] })), next_action: { type: "wait_for_generation", label: "Waiting for generation", message: "No footage is available yet.", scene_order: 1, background: true } }],
  ];
  for (const [id, visible, overrides] of matrix) {
    await check(`${id}: truthful workflow, next action and responsive stage`, async () => {
      const fixture = await makePage({ job: { ...baseJob(id), ...overrides } }); await open(fixture.page, id);
      if (visible === "Scene timeline") await fixture.page.getByRole("navigation", { name: visible, exact: true }).waitFor();
      else await fixture.page.getByText(visible, { exact: false }).first().waitFor({ state: "attached" });
      if (id.startsWith("gemini") || id.startsWith("flow-unattended")) assert.equal(await fixture.page.getByRole("button", { name: "Accept Scene", exact: true }).count(), 0, "automatic workflows do not invent human acceptance");
      await screenshot(fixture.page, `desktop-${id}.png`);
    });
  }
  await check("media mismatch prioritizes conformance decisions without accepting the scene", async () => {
    const job = baseJob("studio-mismatch"); job.status = "conformance_attention_required"; job.next_action = { type: "resolve_media_mismatch", label: "Resolve media mismatch", message: "The imported media differs from the requested format.", scene_order: 2 };
    job.scenes[1] = { ...job.scenes[1], status: "conformance_attention_required", attempts: [{ attempt: 1, imported_at: "2026-10-17T10:01:00Z", media, conformance_decision: "pending", conformance: { status: "warning", checks: [{ field: "aspect_ratio", status: "warning", expected: "9:16", actual: "16:9", severity: "high" }] } }] };
    const { page } = await makePage({ job }); await open(page, job.id);
    await page.getByRole("button", { name: "Use Anyway", exact: true }).waitFor(); await page.getByRole("button", { name: "Generate Again", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Accept Scene", exact: true }).count(), 0);
    await screenshot(page, "desktop-media-mismatch.png");
  });
  await check("continuity handoff exposes selected terminal frame and explicit continuation", async () => {
    const job = baseJob("studio-handoff"); job.next_action = { type: "choose_handoff_frame", label: "Choose the continuity frame", message: "Confirm the ending frame before continuing.", scene_order: 1 }; job.scenes[0].attempts[0].handoff.confirmed = false;
    job.scenes[1] = { order: 2, status: "waiting", generation_request: request(2), attempts: [] };
    const { page } = await makePage({ job }); await open(page, job.id);
    await page.getByRole("button", { name: "Continue with selected frame", exact: true }).waitFor();
    await screenshot(page, "desktop-continuity-handoff.png");
  });
  await check("390px review: touch selection and keyboard drawers fit without page overflow", async () => {
    const { page } = await makePage({ mobile: true }); await open(page, "studio-review");
    await page.getByLabel("Action inspector", { exact: true }).getByRole("button", { name: "Accept Scene", exact: true }).waitFor();
    await screenshot(page, "mobile-flow-review-viewport.png");
    await screenshot(page, "mobile-flow-review.png", true);
    await page.getByRole("button", { name: "Select scene 1", exact: true }).tap(); assert.equal(await page.getByRole("button", { name: "Select scene 1", exact: true }).getAttribute("aria-pressed"), "true");
    const summary = slowdown(page); await summary.focus(); await page.keyboard.press("Enter"); assert.equal(await isOpen(slowdown(page)), true);
    await noOverflow(page); await summary.focus(); await page.keyboard.press("Space"); assert.equal(await isOpen(slowdown(page)), false);
  });
  await check("390px portrait media keeps native ratio and completed controls accessible", async () => {
    const job = completedJob("studio-portrait"); job.aspect_ratio = "9:16"; job.video_url = "/__studio-fixture/video/portrait.mp4"; job.scenes = job.scenes.map(scene => ({ ...scene, generation_request: { ...scene.generation_request, aspect_ratio: "9:16" } }));
    const { page } = await makePage({ mobile: true, job }); await open(page, job.id);
    await page.waitForFunction(() => [...document.querySelectorAll("video")].some(video => video.videoWidth === 360 && video.videoHeight === 640));
    await screenshot(page, "mobile-completed-portrait.png", true);
  });
  await check("390px archived media exposes restoration without overflow", async () => {
    const { page } = await makePage({ mobile: true, job: archivedJob, archived: true }); await open(page, archivedJob.id);
    await page.getByRole("button", { name: "Restore & Watch", exact: true }).waitFor(); await screenshot(page, "mobile-archived.png", true);
  });
  await check("library breadcrumb retains search, filters, sort and view context", async () => {
    const { page } = await makePage(); const query = "?q=Clock&provider=flow_web&status=awaiting_human_decision&sort=name&view=grid";
    await page.goto(`${baseURL}/${query}`); await page.locator("main article").first().getByRole("link").first().click(); await page.locator(".project-studio").waitFor();
    const back = page.locator(".project-studio").getByRole("link", { name: /Projects/ }).first(); assert.equal(await back.getAttribute("href"), `/${query}`); await back.click();
    assert.equal(new URL(page.url()).search, query); assert.equal(await page.getByRole("searchbox", { name: "Search projects", exact: true }).inputValue(), "Clock");
  });
  await check("loading and API failure remain explicit", async () => {
    const loading = await makePage({ slow: 1800 }); const navigation = loading.page.goto(`${baseURL}/scene-jobs/studio-review`); await loading.page.getByText(/Loading scene-video job/).waitFor(); await screenshot(loading.page, "desktop-loading.png"); await navigation; await loading.page.locator(".project-studio").waitFor();
    const failed = await makePage({ failure: true }); await failed.page.goto(`${baseURL}/scene-jobs/studio-review`); await failed.page.getByRole("alert").filter({ hasText: "Fixture project temporarily unavailable" }).waitFor({ timeout: 15000 }); await screenshot(failed.page, "desktop-load-error.png");
  });
  await check("no live requests, mutations, unexpected endpoints or uncaught browser errors", async () => {
    assert.deepEqual(safetyViolations, []); assert.deepEqual(browserErrors, []); assert.deepEqual(fixtureStates.flatMap(state => state.mutations), []);
  });
} finally {
  await writeFile(path.join(outputDir, "browser-report.json"), JSON.stringify({ generated_at: new Date().toISOString(), base_url: baseURL, fixture_api_origin: fixtureOrigin, viewports: [{ width: 1440, height: 900 }, { width: 390, height: 844 }], fixture_media: "Finite 8-second H.264 MP4 fixtures generated offline from an illustrative canvas. No provider footage or live creative review.", checks, screenshots, safety_violations: safetyViolations, browser_errors: browserErrors, mutation_requests: fixtureStates.flatMap(state => state.mutations) }, null, 2) + "\n");
  await browser.close();
}
console.log(`${checks.filter(check => check.result === "PASS").length} fixture browser checks passed. Screenshots: ${outputDir}`);
