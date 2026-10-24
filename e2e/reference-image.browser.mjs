/* global document, window */
import assert from "node:assert/strict";
import console from "node:console";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { Buffer } from "node:buffer";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const base = process.env.REFERENCE_BASE_URL || "http://127.0.0.1:5181";
const appOrigin = new URL(base).origin;
const fixtureOrigin = "http://127.0.0.1:18080";
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../docs/reference-image-review");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const checks = [], violations = [], browserErrors = [];
const capability = { supported: true, status: "verified", aspect_ratios: ["9:16", "16:9"], media_types: ["image/png", "image/jpeg"], max_bytes: 10485760, max_width: 4096, max_height: 4096, max_pixels: 16000000 };
const options = { standard_available: true, gemini_available: true, scene_seconds: 8, gemini_capabilities: { native_seconds: 10, max_scenes: 8, aspect_ratios: ["9:16", "16:9"] } };
try {
 for (const width of [1440, 390]) {
  const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, ...(width === 390 ? { isMobile: true, hasTouch: true } : {}) });
  const page = await context.newPage();
  let supported = false, mutations = 0;
  page.on("pageerror", error => browserErrors.push(error.message));
  await context.route("**/*", async route => {
   const req = route.request(), url = new URL(req.url());
   if (url.origin === appOrigin && req.method() === "GET" && (req.resourceType() === "document" || /^(\/src\/|\/node_modules\/|\/@|\/assets\/|\/favicon\.ico$)/.test(url.pathname))) return route.continue();
   if (url.origin !== fixtureOrigin) { violations.push(`${req.method()} ${url.origin}${url.pathname}`); return route.abort("blockedbyclient"); }
   const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Cache-Control": "no-store" };
   const respond = (body, status = 200) => route.fulfill({ status, contentType: "application/json", headers, body: JSON.stringify(body) });
   if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
   if (req.method() === "GET" && url.pathname === "/storage") return respond({ local: [], drive_status: "connected", queue_count: 0 });
   if (req.method() === "GET" && url.pathname === "/scene-video-options") return respond(options);
   if (req.method() === "GET" && url.pathname === "/colab/status") return respond({state:"not_configured",automatic:false});
   if (req.method() === "GET" && url.pathname === "/flow/subject-reference-capability") return respond({...capability,supported:false,status:"unverified"});
   if (req.method() === "GET" && url.pathname === "/gemini-autopilot/subject-reference-capability") return respond({ ...capability, supported:false, status:"unverified", message: "Subject Reference is unavailable: browser subject roles remain unverified. Create without an image." });
   if (req.method() === "GET" && url.pathname === "/gemini-autopilot/starting-image-capability") return respond({...capability,supported,status:supported?"verified":"unverified",message:"Native Starting Image acknowledgement is unverified in this isolated fixture."});
   if (req.method() === "POST" && url.pathname === "/gemini-autopilot/queue") {
    mutations++;
    assert.ok(req.headers()["idempotency-key"]);
    assert.match(req.postDataBuffer().toString("utf8"), /name="starting_image"; filename="synthetic.png"/);
    assert.match(req.postDataBuffer().toString("utf8"), /"image_mode":"starting_image"/);
    return respond({ error: "Fixture upload failure; nothing was persisted." }, 503);
   }
   violations.push(`${req.method()} ${url.pathname}`); return route.abort("blockedbyclient");
  });
  await page.goto(`${base}/videos/new?workflow=gemini_web`);
  // Native browser canvas creates a valid illustrative fixture, unrelated to provider output.
  const png = Buffer.from(await page.evaluate(() => {
   const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
   const ctx = canvas.getContext("2d"); ctx.fillStyle = "#e0e7ff"; ctx.fillRect(0, 0, 640, 360);
   ctx.fillStyle = "#3730a3"; ctx.fillRect(220, 80, 200, 200); ctx.fillStyle = "white"; ctx.font = "18px sans-serif"; ctx.fillText("FIXTURE", 280, 185);
   ctx.fillStyle = "#312e81"; ctx.font = "16px sans-serif"; ctx.fillText("ILLUSTRATIVE REFERENCE - NO PROVIDER OUTPUT", 100, 325);
   return canvas.toDataURL("image/png").split(",")[1];
  }), "base64");
  const input = page.getByLabel("Starting image file");
  await page.getByText(/Native Starting Image acknowledgement/).waitFor(); assert.equal(await input.count(),0);
  assert.equal(await page.getByRole("option",{name:/Starting Image/}).evaluate(option=>option.disabled),true);
  assert.equal(await page.getByLabel("Production workflow").inputValue(), "gemini_web");
  await page.screenshot({ path: path.join(output, `${width}-unverified.png`), fullPage: true });
  checks.push(`${width}px unverified provider disables image selection and honors dashboard route`);
  supported = true; await page.reload(); await page.getByRole("combobox",{name:/^Image mode/}).selectOption("starting_image"); await input.waitFor(); await page.waitForFunction(() => !document.querySelector('input[type="file"]').disabled);
  await page.getByLabel("Idea / story").fill("ILLUSTRATIVE FIXTURE: same synthetic subject in a new setting");
  await input.setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: png });
  await page.getByAltText("Starting image preview").waitFor();
  await page.getByLabel(/Video title/).fill("Reference Image UI fixture");
  await page.screenshot({ path: path.join(output, `${width}-preview.png`), fullPage: true });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  checks.push(`${width}px native browser decoding, preview, form preservation and no horizontal overflow`);
  for (const aspect of ["9:16","16:9"]) {
   await page.getByRole("combobox",{name:/^Aspect ratio/}).selectOption(aspect);
   await page.getByRole("button", { name: "Add to Gemini Queue" }).click();
   await page.getByRole("alert").filter({ hasText: "Fixture upload failure" }).waitFor();
   assert.equal(await page.getByRole("combobox",{name:/^Aspect ratio/}).inputValue(),aspect);
   assert.ok(await page.getByAltText("Starting image preview").isVisible());
  }
  assert.equal(mutations,2);
  checks.push(`${width}px explicit starting-image multipart role, both aspect ratios, and visible persistence failure preserve image`);
  await page.getByRole("button", { name: "Remove image" }).click(); assert.equal(await page.getByAltText("Starting image preview").count(), 0);
  await input.setInputFiles({ name: "synthetic.png", mimeType: "image/png", buffer: png }); await page.getByAltText("Starting image preview").waitFor();
  await page.getByLabel("Production workflow").selectOption("flow_web"); assert.equal(await page.getByAltText("Starting image preview").count(), 0);
  await page.getByLabel("Production workflow").selectOption("gemini_web"); assert.equal(await page.getByAltText("Starting image preview").count(), 0);
  assert.equal(mutations, 2); checks.push(`${width}px removal and workflow switching clear references without another request`);
  await context.close();
 }
 assert.deepEqual(violations, []); assert.deepEqual(browserErrors, []);
 await writeFile(path.join(output, "browser-report.json"), JSON.stringify({ fixture_only: true, forwarded_backend_or_provider_requests: 0, checks, violations, browser_errors: browserErrors }, null, 2));
 console.log(`${checks.length} Starting Image fixture browser checks passed; no backend or provider requests forwarded.`);
} finally { await browser.close(); }
