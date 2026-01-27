import dotenv from "dotenv";
dotenv.config();

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import ffmpeg from "fluent-ffmpeg";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

const AWS_REGION = requireEnv("AWS_REGION");
const INPUT_BUCKET = requireEnv("BUCKET_NAME");
const OUTPUT_BUCKET = requireEnv("OUTPUT_BUCKET");
const KEY = requireEnv("KEY");

const WORKDIR = "/tmp/hls";
const OUTPUT_PREFIX = `hls/${path.basename(KEY, path.extname(KEY))}`;

const VARIANTS = [
  { name: "360p", width: 640, height: 360, bitrate: "800k" },
  { name: "480p", width: 854, height: 480, bitrate: "1400k" },
  { name: "720p", width: 1280, height: 720, bitrate: "2800k" },
];

const s3 = new S3Client({ region: AWS_REGION });

async function alreadyProcessed() {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: OUTPUT_BUCKET,
        Key: `${OUTPUT_PREFIX}/master.m3u8`,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

async function downloadInput(filePath) {
  
  const res = await s3.send(
    new GetObjectCommand({ Bucket: INPUT_BUCKET, Key: KEY }),
  );
  if (!res.Body) throw new Error("S3 object has no body");

  await pipeline(res.Body, fs.createWriteStream(filePath));
}

async function uploadDirectory(dir) {
  const files = await fsPromises.readdir(dir, { recursive: true });

  for (const file of files) {
    const fullPath = path.join(dir, file);
    if ((await fsPromises.stat(fullPath)).isDirectory()) continue;

    await s3.send(
      new PutObjectCommand({
        Bucket: OUTPUT_BUCKET,
        Key: `${OUTPUT_PREFIX}/${file}`,
        Body: fs.createReadStream(fullPath),
        ContentType: file.endsWith(".m3u8")
          ? "application/vnd.apple.mpegurl"
          : "video/mp2t",
      }),
    );
  }
}

async function transcodeHLS(inputPath, v) {
  await fsPromises.mkdir(`${WORKDIR}/${v.name}`, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(`${WORKDIR}/${v.name}/index.m3u8`)
      .videoCodec("libx264")
      .audioCodec("aac")
      .size(`${v.width}x${v.height}`)
      .outputOptions([
        "-preset veryfast",
        "-g 48",
        "-sc_threshold 0",
        `-b:v ${v.bitrate}`,
        "-b:a 128k",
        "-ac 2",
        "-hls_time 6",
        "-hls_playlist_type vod",
        "-hls_segment_filename",
        `${WORKDIR}/${v.name}/segment_%03d.ts`,
      ])
      .on("end", () => {
        console.log(
          JSON.stringify({
            event: "VARIANT_DONE",
            key: KEY,
            variant: v.name,
          }),
        );
        resolve();
      })
      .on("error", reject)
      .run();
  });
}

async function createMasterPlaylist() {
  let content = "#EXTM3U\n#EXT-X-VERSION:3\n";

  for (const v of VARIANTS) {
    const bw = Number(v.bitrate.replace("k", "")) * 1000;
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bw},RESOLUTION=${v.width}x${v.height},CODECS="avc1.4d401f,mp4a.40.2"\n`;
    content += `${v.name}/index.m3u8\n`;
  }

  await fsPromises.writeFile(`${WORKDIR}/master.m3u8`, content);
}

async function main() {
  console.log(
    JSON.stringify({
      event: "HLS_JOB_STARTED",
      key: KEY,
      variants: VARIANTS.map((v) => v.name),
    }),
  );

  if (await alreadyProcessed()) {
    console.log(
      JSON.stringify({
        event: "JOB_SKIPPED_ALREADY_EXISTS",
        key: KEY,
      }),
    );
    return;
  }

  await fsPromises.mkdir(WORKDIR, { recursive: true });
  const inputPath = `${WORKDIR}/input.mp4`;

  try {
    const start = Date.now();

    await downloadInput(inputPath);

    for (const v of VARIANTS) {
      await transcodeHLS(inputPath, v);
    }

    await createMasterPlaylist();
    await uploadDirectory(WORKDIR);

    console.log(
      JSON.stringify({
        event: "HLS_JOB_SUCCESS",
        key: KEY,
        durationSec: Math.round((Date.now() - start) / 1000),
      }),
    );
  } finally {
    await fsPromises.rm(WORKDIR, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(JSON.stringify({
  event: "HLS_JOB_FAILED",
  key: KEY,
  error: err.message,
}));
  process.exit(1); // 🚨 triggers SQS retry
});
