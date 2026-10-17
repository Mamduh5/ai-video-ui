/* global document, window */
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import console from "node:console";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { URL } from "node:url";

// Standalone fixture-only acceptance harness. No backend or provider is contacted.
// Start Vite with VITE_API_BASE_URL=http://127.0.0.1:18080 on port 5177.
// Reuse an existing Playwright installation with PLAYWRIGHT_MODULE_PATH if needed.
const require = createRequire(import.meta.url);
const playwrightPath = process.env.PLAYWRIGHT_MODULE_PATH || "playwright";
const { chromium } = require(playwrightPath);
const baseURL = process.env.LIBRARY_BASE_URL || "http://127.0.0.1:5177";
const fixtureOrigin = "http://127.0.0.1:18080";
const outputDir = path.resolve(process.env.LIBRARY_SCREENSHOT_DIR || "docs/project-library-review");
const statuses = ["completed", "completed", "awaiting_human_decision", "failed", "running", "pending", "awaiting_external_generation", "awaiting_review"];
const names = ["Moonlight Coffee", "The Clockmaker's Last Letter", "Rain over Bangkok", "Paper City Adventure", "Golden Hour Roadtrip", "A Small Robot, a Big Idea", "Legacy storyboard", "ตลาดเช้า / A very long title that remains readable on a small screen"];

function fixtureProject(index) {
  const provider = ["flow_web", "gemini_web", "manual"][index % 3];
  const status = statuses[index % statuses.length];
  const archived = index % 19 === 2;
  const accepted = status === "completed" ? 3 : index % 3;
  const title = index === 511 ? "Remote Lighthouse / Entire-library needle" : index < names.length ? names[index] : `Studio study ${String(index + 1).padStart(4, "0")}`;
  return {
    id: `fixture-${String(index + 1).padStart(4, "0")}`, title, status,
    display_status: status === "completed" ? "Completed" : status === "failed" ? "Failed" : status === "running" ? "Generating scene" : status === "awaiting_human_decision" ? "Needs your decision" : status === "pending" ? "Ready to start" : status === "awaiting_review" ? "Reviewing scene" : "Waiting for generated video",
    provider, workflow: provider === "gemini_web" ? "gemini_autopilot" : provider === "flow_web" ? index % 2 ? "flow_unattended" : "flow_supervised" : "manual",
    paused: index % 11 === 4,
    progress: {scene_count: index === 6 ? 0 : 3, accepted_count: accepted, percent: index === 6 ? 0 : Math.round(accepted / 3 * 100)},
    storage: {state: archived ? "archived" : "local", label: archived ? "Archived to Google Drive" : "Local", archive_percent: archived ? 100 : 0},
    next_action: {type: archived ? "restore_local" : status === "completed" ? "watch_final_video" : status === "running" ? "generating" : status === "failed" ? "retry" : "review", label: archived ? "Restore & Watch" : status === "completed" ? "Watch Final Video" : status === "running" ? "Generating" : status === "failed" ? "Review failure" : "Open project", message: "Fixture navigation only", background: status === "running"},
    created_at: index === 6 ? null : new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString(),
    updated_at: index === 6 ? null : new Date(Date.UTC(2026, 9, 17, 8, -index)).toISOString(),
    thumbnail_url: archived || index % 7 === 5 ? null : `/__library-fixture/thumbnail/${index}.svg`,
    video_url: null, duration_seconds: index === 6 ? null : 24, aspect_ratio: index === 6 ? null : "16:9",
    next_automatic_at: null, eligibility_estimated: false,
    acceptance_type: status === "completed" ? provider === "gemini_web" ? "autopilot" : provider === "flow_web" && index % 2 ? "flow_unattended" : null : null,
  };
}

const largeDataset = Array.from({length: 512}, (_, index) => fixtureProject(index));
function thumbnail(index) {
  const colors = [["#312e81", "#a5b4fc"], ["#7c2d12", "#fcd34d"], ["#164e63", "#67e8f9"], ["#14532d", "#bef264"]];
  const [dark, light] = colors[index % colors.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient></defs><path fill="url(#b)" d="M0 0h320v180H0z"/><circle cx="237" cy="52" r="25" fill="#fff" opacity=".7"/><path d="M0 160L80 77l75 85 55-51 110 61v8H0z" fill="#0f172a" opacity=".6"/><rect x="22" y="25" width="100" height="4" rx="2" fill="#fff" opacity=".65"/><rect x="22" y="36" width="70" height="3" rx="1.5" fill="#fff" opacity=".35"/><path d="M144 65l37 24-37 24z" fill="#fff" opacity=".9"/></svg>`;
}

const checks = [];
const safetyViolations = [];
const browserErrors = [];
const contexts = [];
const fixtureStates = [];
await mkdir(outputDir, {recursive: true});
const browser = await chromium.launch({headless: true, channel: process.env.LIBRARY_BROWSER_CHANNEL || "chrome"});

async function makePage({mobile = false, dataset = largeDataset, slow = 0} = {}) {
  const context = await browser.newContext(mobile ? {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 1} : {viewport: {width: 1440, height: 1000}, deviceScaleFactor: 1});
  contexts.push(context);
  const page = await context.newPage();
  const state = {dataset, requests: [], details: [], cursors: new Map(), failures: false, slow, sequence: 0};
  fixtureStates.push(state);
  page.on("pageerror", error => browserErrors.push(error.message));
  page.on("response", response => { const url = new URL(response.url()); if (url.origin === fixtureOrigin && url.pathname === "/scene-video-library") state.requests.push(Object.fromEntries(url.searchParams)); });
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin === new URL(baseURL).origin) return route.continue();
    if (url.origin !== fixtureOrigin || request.method() !== "GET") {
      safetyViolations.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort("blockedbyclient");
    }
    const respond = (body, status = 200) => route.fulfill({status, contentType: "application/json", headers: {"Access-Control-Allow-Origin": "*", "Cache-Control": "no-store"}, body: JSON.stringify(body)});
    if (url.pathname === "/storage") return respond({local: [], drive_status: "connected", queue_count: 0});
    if (url.pathname.startsWith("/__library-fixture/thumbnail/")) {
      return route.fulfill({status: 200, contentType: "image/svg+xml", headers: {"Access-Control-Allow-Origin": "*"}, body: thumbnail(Number(url.pathname.split("/").at(-1).split(".")[0]))});
    }
    if (url.pathname === "/scene-video-library") {
      const params = url.searchParams;
      if (state.slow) await delay(state.slow);
      if (state.failures) return respond({error: "Fixture library temporarily unavailable", code: "library_unavailable"}, 503);
      const binding = JSON.stringify([params.get("q") || "", params.get("status") || "", params.get("provider") || "", params.get("paused") || "", params.get("sort") || "recent"]);
      let rows = state.dataset.filter(project => {
        const query = (params.get("q") || "").toLowerCase().trim();
        return (!query || `${project.title} ${project.id}`.toLowerCase().includes(query)) && (!params.has("status") || project.status === params.get("status")) && (!params.has("provider") || project.provider === params.get("provider")) && (!params.has("paused") || project.paused === (params.get("paused") === "true"));
      });
      const sort = params.get("sort") || "recent";
      rows = [...rows].sort((a, b) => sort === "name" ? (a.title < b.title ? -1 : a.title > b.title ? 1 : a.id.localeCompare(b.id)) : String(b[sort === "created" ? "created_at" : "updated_at"] || "").localeCompare(String(a[sort === "created" ? "created_at" : "updated_at"] || "")) || a.id.localeCompare(b.id));
      const cursor = params.get("cursor");
      const continuation = cursor ? state.cursors.get(cursor) : {binding, offset: 0};
      assert.ok(continuation, "client reuses only opaque server-issued cursors");
      assert.equal(continuation.binding, binding, "cursor remains query-bound");
      const limit = Number(params.get("limit") || 40);
      assert.equal(limit, 40, "browser explicitly requests bounded pages of 40");
      const projects = rows.slice(continuation.offset, continuation.offset + limit);
      const more = continuation.offset + limit < rows.length;
      const nextCursor = more ? `opaque-library-position-${++state.sequence}-${Buffer.from(binding).toString("base64url").slice(-8)}` : null;
      if (nextCursor) state.cursors.set(nextCursor, {binding, offset: continuation.offset + limit});
      return respond({api_version: "scene-video-library.v1", projects, page: {limit, has_more: more, next_cursor: nextCursor}, sort});
    }
    if (/^\/scene-video-jobs\/fixture-\d+$/.test(url.pathname)) {
      const id = url.pathname.split("/").at(-1);
      state.details.push(id);
      const project = state.dataset.find(value => value.id === id);
      return respond({id, title: project?.title, status: "awaiting_external_generation", current_step: "awaiting_external_generation", scenes: []});
    }
    safetyViolations.push(`${request.method()} ${url.pathname}`);
    return route.abort("blockedbyclient");
  });
  return {page, state};
}

async function check(name, run) {
  const start = Date.now();
  try { await run(); checks.push({name, result: "PASS", elapsed_ms: Date.now() - start}); console.log(`PASS ${name}`); }
  catch (error) { checks.push({name, result: "FAIL", message: error.message}); throw error; }
}

async function articles(page, count) {
  await page.waitForFunction(expected => document.querySelectorAll("main article").length === expected, count);
}
async function settled(page) {
  await page.waitForTimeout(650);
}
async function screenshot(page, name) {
  await page.screenshot({path: path.join(outputDir, name), fullPage: false, animations: "disabled"});
}
async function noOverflow(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "page fits viewport without horizontal overflow");
}

try {
  const {page, state} = await makePage({slow: 650});
  await check("large fixture: initial loading, bounded first page, no detail fanout", async () => {
    await page.goto(baseURL);
    await page.getByRole("status").filter({hasText: /loading/i}).first().waitFor();
    await articles(page, 40);
    await settled(page);
    assert.equal(state.requests.length, 1);
    assert.equal(state.details.length, 0);
    assert.equal(await page.getByRole("button", {name: "List view", exact: true}).getAttribute("aria-pressed"), "true");
    await noOverflow(page);
    await screenshot(page, "desktop-list.png");
    state.slow = 0;
  });
  await check("large fixture: explicit cursor loading appends 40 with no automatic sweep", async () => {
    await page.getByRole("button", {name: "Load more", exact: true}).click();
    await articles(page, 80);
    await settled(page);
    assert.equal(state.requests.length, 2);
    assert.ok(state.requests[1].cursor?.startsWith("opaque-library-position-"));
    await page.getByRole("button", {name: "Load more", exact: true}).click();
    await articles(page, 120);
    assert.equal(state.requests.length, 3);
    assert.equal(new Set(await page.locator("main article h3").allTextContents()).size, 120);
    assert.equal(state.details.length, 0);
  });
  await check("detail route and browser Back preserve loaded projects and scroll", async () => {
    const row = page.locator("main article").nth(88);
    const link = row.getByRole("link").first();
    await link.scrollIntoViewIfNeeded();
    const target = await link.getAttribute("href");
    const before = await page.evaluate(() => window.scrollY);
    assert.ok(before > 1000, "test visits a project beyond the first page");
    await link.click();
    await page.waitForURL(`**${target}`);
    await page.getByRole("heading", {name: "Scene-video job", exact: true}).waitFor();
    assert.equal(state.details.length, 1);
    await page.goBack();
    await articles(page, 120);
    await settled(page);
    assert.ok(Math.abs(await page.evaluate(() => window.scrollY) - before) < 80, "browser Back restores previous scroll");
    assert.equal(state.requests.length, 3, "cached traversal stays available on Back");
  });
  await check("debounced server search locates a project beyond the loaded 120", async () => {
    const before = state.requests.length;
    const search = page.getByRole("searchbox", {name: "Search projects"});
    await search.fill("");
    await search.pressSequentially("Remote Lighthouse", {delay: 20});
    assert.equal(await search.inputValue(), "Remote Lighthouse", "fast typing preserves every character");
    await articles(page, 1);
    await settled(page);
    assert.ok(state.requests.length - before < "Remote Lighthouse".length, "debounce coalesces rapid typing rather than requesting every character");
    assert.equal(state.requests.at(-1).q, "Remote Lighthouse");
    assert.equal(state.requests.at(-1).cursor, undefined);
    assert.ok((await page.locator("main article").innerText()).includes("Entire-library needle"));
    assert.equal(new URL(page.url()).searchParams.get("q"), "Remote Lighthouse");
  });
  await check("combined provider, machine status and pause filters reset the cursor", async () => {
    await page.getByRole("button", {name: "Clear filters", exact: true}).first().click();
    await articles(page, 120);
    await page.getByRole("combobox", {name: /^Provider/}).selectOption("gemini_web");
    await settled(page);
    await page.getByRole("combobox", {name: /^Status/}).selectOption("completed");
    await settled(page);
    await page.getByRole("combobox", {name: /^Pause state/}).selectOption("active");
    await settled(page);
    const last = state.requests.at(-1);
    assert.equal(last.provider, "gemini_web");
    assert.equal(last.status, "completed");
    assert.equal(last.paused, "false");
    assert.equal(last.cursor, undefined);
    const expected = largeDataset.filter(item => item.provider === "gemini_web" && item.status === "completed" && !item.paused).length;
    await articles(page, Math.min(expected, 40));
  });
  await check("supported sorts reach the server and preserve query binding", async () => {
    await page.getByLabel("Sort by", {exact: true}).selectOption("name");
    await settled(page);
    assert.equal(state.requests.at(-1).sort, "name");
    assert.equal(state.requests.at(-1).provider, "gemini_web");
    const titles = await page.locator("main article h3").allTextContents();
    assert.deepEqual(titles, [...titles].sort());
    await page.getByLabel("Sort by", {exact: true}).selectOption("created");
    await settled(page);
    assert.equal(state.requests.at(-1).sort, "created");
    assert.equal(state.requests.at(-1).cursor, undefined);
  });
  await check("history retains filters, sort and grid preference after opening a project", async () => {
    await page.getByRole("button", {name: "Grid view", exact: true}).click();
    await page.locator('[aria-label="Grid view"][aria-pressed="true"]').waitFor();
    const previous = page.url();
    await page.locator("main article").first().getByRole("link").first().click();
    await page.getByRole("heading", {name: "Scene-video job", exact: true}).waitFor();
    await page.goBack();
    await settled(page);
    assert.equal(page.url(), previous);
    assert.equal(await page.getByRole("combobox", {name: /^Provider/}).inputValue(), "gemini_web");
    assert.equal(await page.getByRole("combobox", {name: /^Status/}).inputValue(), "completed");
    assert.equal(await page.getByLabel("Sort by", {exact: true}).inputValue(), "created");
    assert.equal(await page.getByRole("button", {name: "Grid view", exact: true}).getAttribute("aria-pressed"), "true");
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(page, "desktop-grid.png");
  });
  await check("no-results state and clear filters recover the library", async () => {
    await page.getByRole("searchbox", {name: "Search projects"}).fill("not-a-fixture-project-xyz");
    await articles(page, 0);
    await page.getByText(/no projects found/i).waitFor();
    await screenshot(page, "desktop-no-results.png");
    await page.getByRole("button", {name: "Clear filters", exact: true}).first().click();
    await articles(page, 120);
    assert.equal(state.requests.at(-1).cursor, undefined);
  });
  await check("explicit refresh failure is visible and retry recovers", async () => {
    state.failures = true;
    await page.getByRole("button", {name: "Refresh", exact: true}).click();
    await page.getByRole("alert").filter({hasText: /fixture library temporarily unavailable/i}).waitFor();
    await screenshot(page, "desktop-error.png");
    state.failures = false;
    await page.getByRole("button", {name: /try again|retry/i}).click();
    await settled(page);
    assert.equal(await page.getByRole("alert").count(), 0);
    await articles(page, 40);
  });
  const small = await makePage({dataset: largeDataset.slice(0, 7)});
  await check("small fixture ends naturally and includes archived, missing and legacy media", async () => {
    await small.page.goto(baseURL);
    await articles(small.page, 7);
    assert.equal(await small.page.getByRole("button", {name: "Load more", exact: true}).count(), 0);
    assert.equal(small.state.requests.length, 1);
    assert.equal(small.state.details.length, 0);
    await screenshot(small.page, "desktop-small-library.png");
  });
  const empty = await makePage({dataset: []});
  await check("empty library gives a clear creation entry point", async () => {
    await empty.page.goto(baseURL);
    await empty.page.getByText(/create your first|no projects yet/i).first().waitFor();
    assert.ok(await empty.page.getByRole("link", {name: /new video|new project|create/i}).count());
    await screenshot(empty.page, "desktop-empty-library.png");
  });
  const mobile = await makePage({mobile: true});
  await check("390px touch layout supports search, filters and view controls without overflow", async () => {
    await mobile.page.goto(baseURL);
    await articles(mobile.page, 40);
    await noOverflow(mobile.page);
    await screenshot(mobile.page, "mobile-list.png");
    const search = mobile.page.getByRole("searchbox", {name: "Search projects"});
    await search.tap();
    await search.fill("Remote Lighthouse");
    await search.press("Enter");
    await articles(mobile.page, 1);
    await noOverflow(mobile.page);
    await mobile.page.getByRole("button", {name: "Clear filters", exact: true}).first().tap();
    await articles(mobile.page, 40);
    await mobile.page.getByRole("combobox", {name: /^Provider/}).selectOption("flow_web");
    await settled(mobile.page);
    assert.equal(mobile.state.requests.at(-1).provider, "flow_web");
    await mobile.page.getByRole("button", {name: "Grid view", exact: true}).tap();
    await mobile.page.locator('[aria-label="Grid view"][aria-pressed="true"]').waitFor();
    await noOverflow(mobile.page);
    await screenshot(mobile.page, "mobile-grid.png");
    await mobile.page.getByRole("button", {name: "List view", exact: true}).focus();
    await mobile.page.keyboard.press("Enter");
    await mobile.page.locator('[aria-label="List view"][aria-pressed="true"]').waitFor();
    assert.equal(await mobile.page.getByRole("button", {name: "List view", exact: true}).getAttribute("aria-pressed"), "true");
    const action = mobile.page.locator("main article").first().getByRole("link").first();
    await action.scrollIntoViewIfNeeded();
    await action.tap();
    await mobile.page.getByRole("heading", {name: "Scene-video job", exact: true}).waitFor();
    await mobile.page.goBack();
    await articles(mobile.page, 40);
    assert.equal(await mobile.page.getByRole("combobox", {name: /^Provider/}).inputValue(), "flow_web");
    await noOverflow(mobile.page);
  });
  await check("fixture boundary has no unexpected endpoints, mutations or browser exceptions", async () => {
    assert.deepEqual(safetyViolations, []);
    assert.deepEqual(browserErrors, []);
  });
} catch (error) {
  console.error(error.stack);
  for (const [index, context] of contexts.entries()) { const current = context.pages()[0]; if (current) { await screenshot(current, `failure-${index}.png`); console.error(JSON.stringify({url: current.url(), content: (await current.locator("body").innerText()).slice(0, 1800), requests: fixtureStates[index]?.requests}, null, 2)); } }
  process.exitCode = 1;
} finally {
  await writeFile(path.join(outputDir, "browser-validation.json"), `${JSON.stringify({dataset_sizes: [512, 7, 0], viewports: [{width: 1440, height: 1000}, {width: 390, height: 844}], checks, completed_requests: fixtureStates.map(state => state.requests), safety_violations: safetyViolations, browser_errors: browserErrors, note: "Synthetic fixtures; all API traffic intercepted. No real API, provider, database or media state used."}, null, 2)}\n`);
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
}
