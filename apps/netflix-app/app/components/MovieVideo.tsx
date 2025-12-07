import { prisma } from "@/lib/prisma";
import MovieButtons from "./MovieButtons";
import HlsPlayer from "./HlsPlayer";

async function getData() {
  const data = await prisma.movie.findFirst({
    where: {
      videoSource: {
        not: "",
      },
    },
    select: {
      title: true,
      overview: true,
      videoSource: true,
      manifestUrl: true,
      imageString: true,
      release: true,
      duration: true,
      id: true,
      age: true,
      youtubeString: true,
    },
  });
  return data;
}

export default async function MovieVideo() {
  const data = await getData();

  const playbackSrc = data?.manifestUrl || data?.videoSource || "";

  return (
    <div className="relative h-[55vh] lg:h-[60vh] w-full flex justify-start items-center">
      <HlsPlayer
        poster={data?.imageString ?? ""}
        src={playbackSrc}
        autoPlay
        muted
        loop
        className="w-full absolute top-0 left-0 h-[60vh] object-cover brightness-[60%]"
      />

      <div className="absolute w-[90%] lg:w-[40%] mx-auto">
        <h1 className="text-white text-4xl md:text-5xl lg:text-6xl font-bold">
          {data?.title}
        </h1>
        <p className="text-white text-lg mt-5 line-clamp-3">{data?.overview}</p>
        <div className="flex gap-x-3 mt-4">
          <MovieButtons
            age={data?.age as number}
            duration={data?.duration as number}
            id={data?.id as number}
            overview={data?.overview as string}
            releaseDate={data?.release as number}
            title={data?.title as string}
            youtubeUrl={data?.youtubeString as string}
            key={data?.id}
          />
        </div>
      </div>
    </div>
  );
}