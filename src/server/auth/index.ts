import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { cache } from "react";
import { z } from "zod";

import { authConfig } from "~/server/auth.config";
import { db } from "~/server/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth: uncachedAuth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.users.findFirst({
          where: { email: parsed.data.email.toLowerCase().trim() },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(
          parsed.data.password,
          user.password_hash,
        );
        if (!ok) return null;

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
          currency: String(user.currency ?? "USD"),
        };
      },
    }),
  ],
});

const auth = cache(uncachedAuth);

export { auth };
