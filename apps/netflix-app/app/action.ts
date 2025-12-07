"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

export async function addToWatchlist(formData: FormData) {
  const movieId = formData.get("movieId");
  const pathname = formData.get("pathname") as string;

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.id) {  // Use user.id from Kinde
    throw new Error("User not authenticated.");
  }

  await prisma.watchList.create({
    data: {
      userId: user.id,  // Store Kinde's user ID (string)
      movieId: Number(movieId),
    },
  });

  revalidatePath(pathname);
}

export async function deleteFromWatchlist(formData: FormData) {
  const watchlistId = formData.get("watchlistId") as string;
  const pathname = formData.get("pathname") as string;

  await prisma.watchList.delete({
    where: {
      id: watchlistId,
    },
  });

  revalidatePath(pathname);
}