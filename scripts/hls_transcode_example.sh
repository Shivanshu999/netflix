#!/usr/bin/env bash
# Example FFmpeg pipeline to generate HLS renditions from a single MP4 input.
# This is for demo/documentation only – in a real OTT setup, you would run this
# in a background job or a dedicated transcoding service.

set -euo pipefail

INPUT_FILE="$1"          # e.g. ./input/movie.mp4
OUTPUT_DIR="$2"         # e.g. ./public/streams/movie-1

if [ -z "${INPUT_FILE}" ] || [ -z "${OUTPUT_DIR}" ]; then
  echo "Usage: $0 <input.mp4> <output_dir>" >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"

# Generate HLS with multiple bitrates (360p, 720p) as a simple example.
# In production you'd tune these to your content and devices.

ffmpeg -y -i "${INPUT_FILE}" \
  -filter:v:0 scale=w=640:h=360:force_original_aspect_ratio=decrease \
  -c:a aac -ar 48000 -c:v:0 h264 -profile:v:0 main -crf 20 -sc_threshold 0 \
  -g 48 -keyint_min 48 -b:v:0 800k -maxrate:v:0 856k -bufsize:v:0 1200k -b:a:0 96k \
  -filter:v:1 scale=w=1280:h=720:force_original_aspect_ratio=decrease \
  -c:v:1 h264 -profile:v:1 main -crf 20 -sc_threshold 0 \
  -g 48 -keyint_min 48 -b:v:1 2800k -maxrate:v:1 2996k -bufsize:v:1 4200k -b:a:1 128k \
  -map 0:v:0 -map 0:a:0 -map 0:v:0 -map 0:a:0 \
  -f hls \
  -hls_time 4 \
  -hls_playlist_type vod \
  -hls_segment_filename "${OUTPUT_DIR}/v%v/segment_%03d.ts" \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0 v:1,a:1" \
  "${OUTPUT_DIR}/v%v/index.m3u8"

echo "HLS renditions generated under ${OUTPUT_DIR}. Use master.m3u8 as manifestUrl."






