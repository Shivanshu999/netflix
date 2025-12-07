"use client";

import { useEffect, useRef } from "react";
import type { DetailedHTMLProps, VideoHTMLAttributes } from "react";

type VideoProps = DetailedHTMLProps<
  VideoHTMLAttributes<HTMLVideoElement>,
  HTMLVideoElement
>;

type HlsPlayerProps = {
  src: string;
} & VideoProps;

export default function HlsPlayer({ src, ...videoProps }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any>(null);

  useEffect(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;

    // If the browser supports native HLS (Safari / some smart TVs)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    // Dynamically import hls.js on the client only
    (async () => {
      try {
        const HlsModule = await import("hls.js");
        const Hls = HlsModule.default;
        if (Hls && Hls.isSupported()) {
          hlsRef.current = new Hls();
          hlsRef.current.loadSource(src);
          hlsRef.current.attachMedia(video);
        } else {
          // Fallback: try setting the src directly
          video.src = src;
        }
      } catch (error) {
        console.error("Failed to load hls.js:", error);
        // Fallback: try setting the src directly
        video.src = src;
      }
    })();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  return <video ref={videoRef} {...videoProps} />;
}


