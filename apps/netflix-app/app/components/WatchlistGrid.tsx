// /app/components/WatchlistGrid.tsx

import { MovieCard } from "@/app/components/MovieCard";
import Image from "next/image";

export function WatchlistGrid({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <p className="text-gray-400 mt-10 text-center">
        Your watchlist is empty. Add some movies to see them here!
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-5 sm:px-0 mt-10 gap-6">
      {data.map((movie) => {
        if (!movie.Movie) return null;

        return (
          <div key={movie.Movie.id} className="relative h-60">
            <Image
              src={movie.Movie.imageString}
              alt={movie.Movie.title}
              width={500}
              height={400}
              className="rounded-sm absolute w-full h-full object-cover"
            />

            <div className="h-60 relative z-10 w-full transform transition duration-500 hover:scale-125 opacity-0 hover:opacity-100">
              <div className="bg-gradient-to-b from-transparent via-black/50 to-black w-full h-full rounded-lg flex items-center justify-center">
                
                <Image
                  src={movie.Movie.imageString}
                  alt={movie.Movie.title}
                  width={800}
                  height={800}
                  className="absolute w-full h-full -z-10 rounded-lg object-cover"
                />

                <MovieCard
                  movieId={movie.Movie.id}
                  age={movie.Movie.age}
                  overview={movie.Movie.overview}
                  time={movie.Movie.duration}
                  title={movie.Movie.title}
                  watchListId={movie.Movie.WatchLists[0]?.id}
                  watchList={movie.Movie.WatchLists.length > 0}
                  year={movie.Movie.release}
                  youtubeUrl={movie.Movie.youtubeString}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}