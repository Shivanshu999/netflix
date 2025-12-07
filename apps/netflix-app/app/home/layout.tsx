import { ReactNode } from "react";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { LoginLink, RegisterLink } from "@kinde-oss/kinde-auth-nextjs/components";
import Navbar from "../components/Navbar";

export default async function HomeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  // ✅ If user is not logged in, show login/register buttons
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <h1 className="text-3xl font-bold mb-4">Welcome to MovieVerse 🎬</h1>
        <p className="text-gray-400 mb-6 text-center max-w-md">
          Please sign in or create an account to access your personalized dashboard and watchlist.
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

  // ✅ If user is logged in, show the navbar and main content
  return (
    <>
      <Navbar user={user} />
      <main className="w-full max-w-7xl mx-auto sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}