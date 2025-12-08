"use client";

import { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
};

export function VideoPlayer({ src, poster, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: 0.5,
      }
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Auto-play on mount
    const video = videoRef.current;
    if (video) {
      // Try to play automatically
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            // Auto-play was prevented
            setIsPlaying(false);
          });
      }
    }
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
        setShowControls(true);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
        setShowControls(true);
        setTimeout(() => setShowControls(false), 1000);
      }
    }
  };

  return (
    <div className="relative h-full w-full" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        className={className}
        poster={poster}
        playsInline
        loop
        muted={false} // Ensure sound is on if desired, or provide mute toggle
      />

      {/* Play/Pause Icon Overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          !isPlaying || showControls ? "opacity-100" : "opacity-0"
        } pointer-events-none`}
      >
        <div className="rounded-full bg-black/40 p-4 backdrop-blur-sm">
          {isPlaying ? (
            <Pause className="h-8 w-8 text-white fill-white" />
          ) : (
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          )}
        </div>
      </div>
    </div>
  );
}
