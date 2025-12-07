import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { redirect } from "next/navigation";

export default async function Home() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  console.log("CURRENT DATABASE_URL =", process.env.DATABASE_URL);
  // ✅ If the user is authenticated, go directly to /home
  if (user) {
    redirect("/home");
  }

  // ✅ If not authenticated, show login/register links instead of redirecting
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-black text-white text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to MovieVerse 🎬</h1>
      <p className="text-gray-400 mb-8 max-w-md">
        Sign in or create an account to explore movies, manage your watchlist, and more.
      </p>
      <div className="flex gap-4">
        <LoginLink className="bg-blue-600 px-5 py-2 rounded-lg text-white hover:bg-blue-700 transition">
          Sign In
        </LoginLink>
        <RegisterLink className="bg-green-600 px-5 py-2 rounded-lg text-white hover:bg-green-700 transition">
          Sign Up
        </RegisterLink>
      </div>
    </main>
  );
}