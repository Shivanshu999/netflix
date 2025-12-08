import { MovieCard } from "@/app/components/MovieCard";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import {
  LoginLink,
  RegisterLink,
} from "@kinde-oss/kinde-auth-nextjs/components";

async function getData(userId: string) {
  const data = await prisma.watchList.findMany({
    where: { userId },
    select: {
      Movie: {
        select: {
          title: true,
          age: true,
          duration: true,
          imageString: true,
          overview: true,
          release: true,
          id: true,
          WatchLists: true,
          youtubeString: true,
        },
      },
    },
  });

  return data;
}

export default async function Watchlist() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  // ✅ Show KindeAuth login/register instead of redirect
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <h1 className="text-3xl font-bold mb-4">You’re not signed in</h1>
        <p className="text-gray-400 mb-6 text-center">
          Please sign in or register to access your watchlist.
        </p>
        <div className="flex gap-4">
          <LoginLink className="bg-blue-600 px-5 py-2 rounded-lg text-white hover:bg-blue-700 transition">
            Sign In
          </LoginLink>
          <RegisterLink className="bg-green-600 px-5 py-2 rounded-lg text-white hover:bg-green-700 transition">
            Sign Up
          </RegisterLink>
        </div>
      </div>
    );
  }

  const data = await getData(user.id);

  return (
    <>
      <h1 className="text-white text-4xl font-bold underline mt-10 px-5 sm:px-0">
        Your watchlist
      </h1>

      {data.length === 0 ? (
        <p className="text-gray-400 mt-10 text-center">
          Your watchlist is empty. Add some movies to get started!
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-5 sm:px-0 mt-10 gap-6">
          {data.map((movie) => (
            <div key={movie.Movie?.id} className="relative h-60">
              <Image
                src={movie.Movie?.imageString as string}
                alt={movie.Movie?.title || "Movie"}
                width={500}
                height={400}
                className="rounded-sm absolute w-full h-full object-cover"
              />

              <div className="h-60 relative z-10 w-full transform transition duration-500 hover:scale-125 opacity-0 hover:opacity-100">
                <div className="bg-gradient-to-b from-transparent via-black/50 to-black z-10 w-full h-full rounded-lg flex items-center justify-center">
                  <Image
                    src={movie.Movie?.imageString as string}
                    alt={movie.Movie?.title || "Movie"}
                    width={800}
                    height={800}
                    className="absolute w-full h-full -z-10 rounded-lg object-cover"
                  />

                  <MovieCard
                    key={movie.Movie?.id}
                    age={movie.Movie?.age as number}
                    movieId={movie.Movie?.id as number}
                    overview={movie.Movie?.overview as string}
                    time={movie.Movie?.duration as number}
                    title={movie.Movie?.title as string}
                    wachtListId={movie.Movie?.WatchLists?.[0]?.id as string}
                    watchList={(movie.Movie?.WatchLists?.length ?? 0) > 0}
                    year={movie.Movie?.release as number}
                    youtubeUrl={movie.Movie?.youtubeString as string}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
