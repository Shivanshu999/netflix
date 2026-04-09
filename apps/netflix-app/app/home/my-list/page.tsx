import { prisma } from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { WatchlistGrid } from "@/app/components/WatchlistGrid";

async function getData(userId: string) {
  return prisma.watchList.findMany({
    where: { userId },
    select: {
      Movie: {
        select: {
          id: true,
          title: true,
          age: true,
          duration: true,
          imageString: true,
          overview: true,
          release: true,
          youtubeString: true,
          WatchLists: true,
        },
      },
    },
  });
}

export default async function MyList() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-white">
        <h1 className="text-3xl font-bold mb-4">You’re not signed in</h1>
        <div className="flex gap-4">
          <LoginLink>Sign In</LoginLink>
          <RegisterLink>Sign Up</RegisterLink>
        </div>
      </div>
    );
  }

  const data = await getData(user.id);

  return (
    <div className="px-5 sm:px-0 mt-10">
      <h1 className="text-white text-4xl font-bold underline mb-6">
        My List
      </h1>

      <WatchlistGrid data={data} />
    </div>
  );
}