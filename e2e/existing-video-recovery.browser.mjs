/* global document, window, fetch */
import { setTimeout } from "node:timers";
import { URL } from "node:url";
import console from "node:console";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const backend = path.resolve(process.env.R162_BACKEND_ROOT || "../ai-video-pipeline");
const root = path.join(backend, ".tmp-live-validation/r162");
const api = "http://127.0.0.1:18082", app = process.env.R162_APP_URL || "http://127.0.0.1:5182";
const db = `test_r162_browser_${Date.now()}`;
const output = path.resolve("docs/r162-recovery-review"); await mkdir(output, {recursive:true});
let server, browser, serverOutput="";
const errors=[], violations=[], checks=[];
const requests=[];
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function start() {
 server=spawn(path.join(root,"recovery-browser.test.exe"),["-test.run=^TestR162RecoveryBrowserServer$","-test.timeout=20m"],{cwd:path.join(backend,"internal/http"),env:{...process.env,R162_BROWSER_SERVER:"1",R162_BROWSER_DB:db},windowsHide:true,stdio:["ignore","pipe","pipe"]});
 server.stdout.on("data",chunk=>{serverOutput+=chunk});server.stderr.on("data",chunk=>{serverOutput+=chunk});
 for(let i=0;i<120;i++){try{const r=await fetch(`${api}/__evidence`);if(r.ok)return;}catch{/* starting */}if(server.exitCode!==null)throw new Error(serverOutput);await delay(250);}
 throw new Error(`API did not start: ${serverOutput}`);
}
async function stop(){if(!server)return;const exited=new Promise(resolve=>server.once("exit",resolve));server.kill();await exited;server=undefined;}
async function evidence(){const r=await fetch(`${api}/__evidence`);assert.ok(r.ok);return r.json();}
try{
 await start(); const before=await evidence();
 browser=await chromium.launch({headless:true,channel:"chrome"});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 await context.route("**/*",route=>{const req=route.request(),url=new URL(req.url());if(url.origin!==new URL(app).origin&&url.origin!==api){violations.push(`${req.method()} ${url.origin}${url.pathname}`);return route.abort();}if(req.method()==="POST"){requests.push(url.pathname);if(!/^\/gemini-autopilot\/projects\/[^/]+\/video-recovery\/[^/]+\/(recover|manual|upload)$/.test(url.pathname)&&!/^\/gemini-autopilot\/control\/(reconcile_recovery|resume|pause)$/.test(url.pathname)){violations.push(url.pathname);return route.abort();}}return route.continue();});
 const page=await context.newPage();page.on("pageerror",e=>errors.push(e.message));
 for(const shape of ["portrait","landscape"]){
  const id=`auto-${shape}`;
  await page.goto(`${app}/scene-jobs/${id}`);
  const panel=page.getByRole("region",{name:"Existing video recovery"});
  const recover=panel.getByRole("button",{name:"Recover Existing Video"});await recover.waitFor();
  // First recovery download is failed by the fixture. The only operator action
  // after reload/restart is clicking this same application control again.
  await recover.click(); await panel.getByRole("status").filter({hasText:"Download failed"}).waitFor();
  await stop(); await start(); await page.reload(); await recover.waitFor();
  await recover.click();await panel.getByText("Recovery completed",{exact:true}).waitFor({timeout:90000});
  await page.reload();await panel.getByText("Recovery completed",{exact:true}).waitFor();
  assert.equal(await panel.getByRole("button",{name:"Recover Existing Video"}).count(),0);
  checks.push(`${shape}: original run recovered through application control, MP4 full decode/R3, reload, no duplicate import`);
  await page.screenshot({path:path.join(output,`${id}-completed.png`),fullPage:true});
 }
 for(const shape of ["portrait","landscape"]){
  const id=`manual-${shape}`;
  await page.goto(`${app}/scene-jobs/${id}`);const panel=page.getByRole("region",{name:"Existing video recovery"});
  await panel.getByRole("button",{name:"Recover Existing Video"}).click();await panel.getByRole("status").filter({hasText:"Download failed"}).waitFor();
  await panel.getByRole("button",{name:"Upload Existing MP4"}).click();await panel.getByText("Waiting for owner MP4",{exact:true}).waitFor();
  await stop();await start();await page.reload();await panel.getByText("Waiting for owner MP4",{exact:true}).waitFor();
  await panel.getByLabel("Original Gemini MP4").setInputFiles(path.join(root,`${shape}.mp4`));
  const preview=panel.getByLabel("Recovered MP4 preview");await preview.waitFor();
  await page.waitForFunction(()=>document.querySelector('video[aria-label="Recovered MP4 preview"]')?.readyState>=2);
  const upload=panel.getByRole("button",{name:"Validate and import original MP4"});assert.ok(await upload.isDisabled());
  await panel.getByRole("checkbox").check();await upload.click();await panel.getByText("Recovery completed",{exact:true}).waitFor({timeout:90000});
  await panel.getByText(/Provider attribution was not verified/).waitFor();
  await page.screenshot({path:path.join(output,`${id}-completed.png`),fullPage:true});
  await stop();await start();await page.reload();await panel.getByText("Recovery completed",{exact:true}).waitFor();
  checks.push(`${shape}: failed automatic recovery, app-only MP4 preview and explicit owner association; API process restart before upload and after import, no duplicate`);
 }
 await page.goto(`${app}/gemini-autopilot`);await page.getByRole("heading",{name:"Gemini Autopilot",exact:true}).waitFor();
 await page.getByText(/Finished & saved projects/).click(); await page.getByRole("link",{name:"Recover Existing Video",exact:true}).first().waitFor();checks.push("Gemini Autopilot provides direct project recovery links");
 await page.setViewportSize({width:390,height:844});await page.goto(`${app}/scene-jobs/manual-portrait`);await page.getByText("Recovery completed",{exact:true}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:path.join(output,"390-completed.png"),fullPage:true});checks.push("390px recovery status remains readable without horizontal overflow");
 for (const id of ["auto-portrait","auto-landscape","manual-portrait","manual-landscape"]) {
 const response=await fetch(`${api}/scene-video-jobs/${id}`);const job=await response.json();assert.equal(job.scenes[0].status,"accepted");
 }
 const after=await evidence();assert.equal(after.submissions,before.submissions);assert.equal(after.enabled,false);assert.equal(after.recovery_only,true);assert.equal(after.block,before.block);assert.deepEqual(after.originals,before.originals);
 assert.deepEqual(after.attempts,{"auto-portrait":1,"auto-landscape":1,"manual-portrait":1,"manual-landscape":1});assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);
 checks.push("Original runs byte-equivalent through API, one clip each, accounting 4/4 unchanged, queue paused, protected hold retained, zero provider connections");
 // Reproduce the reported recovery-to-Resume failure against the same isolated
 // actual HTTP handlers. This test server never starts its scheduler loop.
 const scenario=async mode=>{const response=await fetch(`${api}/__resume-scenario/${mode}`,{method:"POST"});assert.ok(response.ok,await response.text());await page.goto(`${app}/gemini-autopilot`);await page.getByLabel("Autopilot status").waitFor();};
 await page.setViewportSize({width:1440,height:1000});
 await scenario("stale");
 const sceneRecovery=page.getByRole("region",{name:"Scene recovery"});
 await sceneRecovery.getByRole("button",{name:"Reconcile recovered results",exact:true}).click();
 const resume=page.getByRole("button",{name:"Resume Autopilot",exact:true});await resume.waitFor();assert.ok(await resume.isEnabled());
 assert.equal((await evidence()).enabled,false);assert.equal((await evidence()).submissions,before.submissions);
 assert.equal(requests.filter(p=>p==="/gemini-autopilot/control/resume").length,0);
 await resume.click();await page.getByRole("button",{name:"Pause Autopilot",exact:true}).waitFor();assert.equal((await evidence()).enabled,true);
 await page.getByRole("button",{name:"Pause Autopilot",exact:true}).click();await resume.waitFor();assert.equal((await evidence()).enabled,false);
 checks.push("Recovered original plus preserved failed history: rendered reconciliation clears only the stale blocker, separate rendered Resume and Pause exercise real HTTP handlers; no worker loop exists");
 await scenario("mixed");await sceneRecovery.getByText(/Other unresolved project.*Scene 2/).waitFor();
 assert.equal(await page.getByRole("button",{name:"Resume Autopilot",exact:true}).count(),0);
 assert.equal(await sceneRecovery.getByRole("link",{name:"Recover Existing Video",exact:true}).getAttribute("href"),"/scene-jobs/other-unresolved#video-recovery");
 const denied=await fetch(`${api}/gemini-autopilot/control/resume`,{method:"POST"});assert.equal(denied.status,409);assert.match(await denied.text(),/Other unresolved project|Scene 2|unresolved/i);
 checks.push("Recovered result plus another uncertain Scene 2: rendered UI identifies exact project and working recovery link; real Resume HTTP handler rejects");
 await scenario("worker_disabled");await page.getByRole("heading",{name:"Generation worker disabled",exact:true}).waitFor();
 assert.ok(await page.getByRole("button",{name:"Resume Autopilot",exact:true}).isDisabled());await page.getByText(/Resume cannot start videos until/).waitFor();
 const disabled=await fetch(`${api}/gemini-autopilot/control/resume`,{method:"POST"});assert.equal(disabled.status,409);assert.match(await disabled.text(),/worker.*disabled|disabled.*worker/i);
 checks.push("Disabled runtime worker: rendered Resume disabled with explicit backend-start requirement; real Resume HTTP handler rejects");
 assert.deepEqual((await evidence()).originals["auto-landscape"],after.originals["auto-landscape"]);assert.equal((await evidence()).submissions,before.submissions);assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);

 await writeFile(path.join(output,"browser-report.json"),JSON.stringify({synthetic_media:true,actual_api_handlers:true,actual_mongo_database:db,actual_api_process_restarts:6,provider_connections:0,checks,requests,errors,violations,before,after},null,2));
 console.log(`${checks.length} real-browser recovery checks passed; zero provider connections or generation routes.`);
}finally{await browser?.close();await stop();await writeFile(path.join(output,"server.log"),serverOutput);}
