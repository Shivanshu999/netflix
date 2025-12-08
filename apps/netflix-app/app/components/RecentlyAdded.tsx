import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { MovieCard } from "./MovieCard";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

// Define the type for your movie data
type MovieData = {
  id: number;
  overview: string;
  title: string;
  imageString: string;
  youtubeString: string;
  age: number;
  release: number;
  duration: number;
  WatchLists: {
    id: string;
  }[];
};

async function getData(userId: string): Promise<MovieData[]> {
  return prisma.movie.findMany({
    select: {
      id: true,
      overview: true,
      title: true,
      WatchLists: {
        where: {
          userId: userId,
        },
      },
      imageString: true,
      youtubeString: true,
      age: true,
      release: true,
      duration: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 4,
  });
}


export default async function RecentlyAdded() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  const data: MovieData[] = await getData(user?.id as string);


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-8 gap-6">
      {data.map((movie: MovieData) => (
        <div key={movie.id} className="relative h-48">
          {/* Movie poster */}
          <Image
            src={movie.imageString}
            alt={movie.title}
            width={500}
            height={400}
            className="rounded-sm absolute w-full h-full object-cover"
          />

          {/* Hover card */}
          <div className="h-60 relative z-10 w-full transform transition duration-500 hover:scale-125 opacity-0 hover:opacity-100">
            <div className="bg-gradient-to-b from-transparent via-black/50 to-black z-10 w-full h-full rounded-lg flex items-center justify-center border">
              <Image
                src={movie.imageString}
                alt={movie.title}
                width={800}
                height={800}
                className="absolute w-full h-full -z-10 rounded-lg object-cover"
              />

              <MovieCard
                key={movie.id}
                movieId={movie.id}
                overview={movie.overview}
                title={movie.title}
                wachtListId={movie.WatchLists[0]?.id}
                youtubeUrl={movie.youtubeString}
                watchList={movie.WatchLists.length > 0}
                age={movie.age}
                time={movie.duration}
                year={movie.release}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}