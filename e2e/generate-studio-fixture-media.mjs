/* global document */
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import console from "node:console";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// Optional offline regeneration of the committed, clearly marked fixture media.
// The acceptance harness itself only reads the MP4s and does not need FFmpeg.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || "playwright");
const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.STUDIO_BROWSER_CHANNEL || "chrome" });
try {
  for (const portrait of [false, true]) {
    const page = await browser.newPage();
    const data = await page.evaluate(isPortrait => {
      const canvas = document.createElement("canvas");
      const width = canvas.width = isPortrait ? 360 : 640;
      const height = canvas.height = isPortrait ? 640 : 360;
      const g = canvas.getContext("2d");
      const sky = g.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#182c4d"); sky.addColorStop(0.65, "#c3a3a0"); sky.addColorStop(1, "#e9bc8b");
      g.fillStyle = sky; g.fillRect(0, 0, width, height);
      g.fillStyle = "#f8deb2"; g.beginPath(); g.arc(width * 0.73, height * 0.28, width * 0.07, 0, 7); g.fill();
      for (const [level, color] of [[0.55, "#53627b"], [0.68, "#354b65"], [0.8, "#1e354c"]]) {
        g.fillStyle = color; g.beginPath(); g.moveTo(0, height);
        for (let x = 0; x <= width + 40; x += 40) g.lineTo(x, height * level + Math.sin(x / 71 + level * 10) * height * 0.1);
        g.lineTo(width, height); g.fill();
      }
      g.fillStyle = "#14293b"; g.fillRect(width * 0.18, height * 0.53, width * 0.2, height * 0.31);
      g.beginPath(); g.moveTo(width * 0.14, height * 0.55); g.lineTo(width * 0.28, height * 0.39); g.lineTo(width * 0.42, height * 0.55); g.fill();
      g.fillStyle = "#f0c581"; g.fillRect(width * 0.24, height * 0.61, width * 0.08, height * 0.12);
      g.fillStyle = "rgba(8, 19, 36, .82)"; g.fillRect(12, 12, width - 24, 51);
      g.fillStyle = "#ffffff"; g.font = `600 ${isPortrait ? 12 : 15}px sans-serif`;
      g.fillText("ILLUSTRATIVE FIXTURE · NO PROVIDER OUTPUT", 22, 34);
      g.font = "12px sans-serif"; g.fillStyle = "#cfdae7"; g.fillText("Offline media for interface acceptance", 22, 51);
      return canvas.toDataURL("image/png").split(",")[1];
    }, portrait);
    await page.close();
    const prefix = path.join(directory, `studio-${portrait ? "portrait" : "wide"}`);
    const frame = `${prefix}.frame.png`;
    await writeFile(frame, Buffer.from(data, "base64"));
    try {
      execFileSync(process.env.FFMPEG_PATH || "ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-i", frame, "-t", "8", "-r", "24", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", `${prefix}.mp4`], { stdio: "pipe", windowsHide: true });
    } finally { await unlink(frame); }
    console.log(`Generated ${prefix}.mp4 (8 seconds, H.264, illustrative fixture only)`);
  }
} finally { await browser.close(); }
