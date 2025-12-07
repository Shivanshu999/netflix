import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

/**
 * getKindeServerSession provides server-side access
 * to the currently logged-in user's session.
 *
 * Usage:
 *   const { getUser } = getKindeServerSession();
 *   const user = await getUser();
 */

export const kindeAuth = {
  getSession: async () => {
    const { getUser } = getKindeServerSession();
    return await getUser();
  },
};