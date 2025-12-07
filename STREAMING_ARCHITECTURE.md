# Streaming Architecture (HLS + CDN-style Delivery)

This document describes how the Netflix-like OTT project handles video streaming in a **production-style** way using HLS and a CDN-style origin, suitable to discuss in backend interviews.

## 1. Content & Storage Model

- The `Movie` model (Prisma) now includes:
  - `videoSource`: legacy MP4 URL (trailer or fallback)
  - `youtubeString`: legacy YouTube trailer URL
  - `manifestUrl`: **HLS/DASH manifest URL** used for primary playback
  - `cdnProvider`: optional logical provider name (e.g. `demo-mux`, `cloudfront`)
- Example (from `prisma/schema.prisma`):
  - `manifestUrl   String?`
  - `cdnProvider   String?`

**How it’s used**:
- Backend (Next.js server components) reads `manifestUrl` and passes it to an HLS-aware player.
- If `manifestUrl` is missing, the app falls back to `videoSource` (direct MP4).

## 2. Transcoding Pipeline (Offline Demo)

In a real OTT, content is ingested as a high-quality MP4 and transcoded into multiple HLS renditions.

For this project we:
- Provide an **offline FFmpeg script** at `scripts/hls_transcode_example.sh` that:
  - Takes an input MP4 and an output directory
  - Produces:
    - `master.m3u8` (master playlist)
    - Multiple variant playlists + `.ts` segments (e.g. 360p, 720p)
- The script is meant as a **demo of the pipeline**, not a production-ready implementation.

In production you would:
- Run FFmpeg (or a managed transcoding service) in a background worker (e.g. via RabbitMQ event when content is uploaded).
- Store outputs in object storage (S3, GCS, etc.).
- Point `manifestUrl` in the DB to the CDN-fronted master playlist.

## 3. Serving Streams (Origin/CDN Simulation)

Options for this project:

- **Simplest demo** (what we currently do):
  - Use a publicly available HLS test stream for `manifestUrl`, e.g.:
    - `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`
  - This lets the player demonstrate real HLS behavior without running our own origin.

- **Next.js `public/` origin** (easy to add):
  - Generate HLS assets under `apps/netflix-app/public/streams/movie-1/`.
  - Set `manifestUrl` to `/streams/movie-1/master.m3u8`.
  - Next.js serves these as static files; in production you’d put a CDN in front of the Next.js origin.

- **Standalone origin server** (Node/Express or Nginx):
  - Run a separate static server just for HLS segments.
  - Wire a CDN (CloudFront/Cloudflare) to that origin for caching and global delivery.

In interviews, you can explain:
- Origin (object storage + static server) → CDN edge nodes → end users.
- Segment caching, cache-control headers, and invalidation strategies for new versions.

## 4. Player Integration in Next.js

- A client-side `HlsPlayer` component is added (`app/components/HlsPlayer.tsx`):
  - Uses `hls.js` when supported to attach an HLS stream to a `<video>` element.
  - Falls back to native HLS support on Safari (`video.canPlayType('application/vnd.apple.mpegurl')`).
- The `MovieVideo` server component now:
  - Fetches the `Movie` from Prisma, selecting `manifestUrl` and `videoSource`.
  - Computes `playbackSrc = manifestUrl || videoSource`.
  - Renders `<HlsPlayer src={playbackSrc} ... />` for the hero/banner video.

This shows real-world separation of concerns:
- Server components fetch data and pass it down.
- Client components handle browser-specific playback logic.

## 5. Access Control & Subscription Gate

- The project already has subscription/auth logic (Kinde auth + subscription checks).
- The **principle** we follow for streaming:
  - Only authenticated, active subscribers should receive a valid `manifestUrl`.
- Practically, this means:
  - Pages/components that render the player are behind existing subscription gates.
  - In a more advanced variant, the backend would:
    - Issue **signed URLs** or short-lived tokens for manifests and segments.
    - Validate tokens at the origin or CDN edge.

For interviews, you can discuss:
- Why just hiding `manifestUrl` isn’t enough at scale.
- How you’d implement signed URLs (e.g. CloudFront signed cookies/URLs) and/or DRM.

## 6. Streaming Analytics Hooks (Design)

- The plan includes adding a `PlaybackEvent` table and `/api/analytics/playback` endpoint to log events:
  - `eventType` (play, pause, ended, error)
  - `userId`, `movieId`
  - `positionSeconds`, `createdAt`
- On the frontend, the player can send events on `onPlay`, `onPause`, `onEnded` etc.
- These events are a base for:
  - **Watch history & Continue Watching**
  - Simple recommendations ("because you watched X")
  - Prometheus metrics such as `video_plays_total{movieId="..."}`.

## 7. Production-grade Considerations

If asked “What would you change for real Netflix scale?” you can mention:

- **Multi-CDN & Geo-replication**:
  - Multiple CDNs with traffic steering (e.g. based on geography or performance).
  - Multi-region object storage with replication.
- **DRM & Security**:
  - Widevine/FairPlay/PlayReady with license servers.
  - Strict token-based/DRM-protected manifest & segment access.
- **Resilience & Observability**:
  - Health checks and autoscaling for origin servers.
  - Fine-grained Prometheus metrics on buffering events, error rates, and startup latency.
- **Cost & Performance Tuning**:
  - Adaptive bitrate ladder tuning.
  - Per-title encoding for optimal quality/bitrate trade-offs.

This architecture gives you a solid, realistic story while keeping the implementation manageable in a personal project.


