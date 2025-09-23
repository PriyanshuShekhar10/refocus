export { default as middleware } from "next-auth/middleware";

export const config = {
  matcher: [
    "/(product)/(.*)",
    "/profile/:path*",
    "/features/:path*",
    // Explicitly protect API namespaces (avoid regex lookaheads which are unsupported)
    "/api/friends/:path*",
    "/api/sessions/:path*",
    "/api/users/:path*",
  ],
};
