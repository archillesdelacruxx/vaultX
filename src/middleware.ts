import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "~/server/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const path = nextUrl.pathname;

  const isAuthPage = ["/login", "/register", "/forgot-password", "/reset"].some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (!isLoggedIn && !isAuthPage) {
    const login = new URL("/login", nextUrl);
    login.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(login);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
