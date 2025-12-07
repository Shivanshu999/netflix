"use client";

import { Button } from "@/components/ui/button";
import { InfoIcon, PlayCircle } from "lucide-react";
import { useState } from "react";
import PlayVideoModal from "./PlayVideoModal";
import { useSubscriptionGate } from "@/app/hooks/useSubscriptionGate";

interface iAppProps {
  overview: string;
  youtubeUrl: string;
  id: number;
  age: number;
  title: string;
  releaseDate: number;
  duration: number;
}

export default function MovieButtons({
  age,
  duration,
  id,
  overview,
  releaseDate,
  title,
  youtubeUrl,
}: iAppProps) {
  const [open, setOpen] = useState(false);
  const { ensureSubscribed, checking } = useSubscriptionGate();

  const handleOpen = async () => {
    const allowed = await ensureSubscribed();
    if (allowed) {
      setOpen(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        className="text-lg font-medium"
        disabled={checking}
      >
        <PlayCircle className="mr-2 h-6 w-6" /> Play
      </Button>
      <Button
        onClick={handleOpen}
        className="text-lg font-medium bg-white/40 hover:bg-white/30 text-white"
        disabled={checking}
      >
        <InfoIcon className="mr-2 h-6 w-6" /> Learn More
      </Button>

      <PlayVideoModal
        state={open}
        changeState={setOpen}
        age={age}
        duration={duration}
        key={id}
        overview={overview}
        release={releaseDate}
        title={title}
        youtubeUrl={youtubeUrl}
      />
    </>
  );
}
