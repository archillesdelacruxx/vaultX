import { type NextAuthConfig, type Session } from "next-auth";

/**
 * Edge-safe NextAuth config. Credentials provider is added in auth/index.ts
 * because it imports the database client (Node-only).
 */
export const authConfig = {
  providers: [],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = String(user.id);
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    session: ({ session, token }): Session => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
        role: token.role as string,
      },
    }),
  },
} satisfies NextAuthConfig;
