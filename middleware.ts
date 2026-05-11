export { default as middleware } from "next-auth/middleware";

export const config = {
  matcher: [
    // Protect actual URL paths (route groups like (product) are not in URLs)
    "/dashboard/:path*",
    "/profile/:path*",
    "/features/:path*",
    "/notes/:path*",
    "/sessions/:path*",
    "/chat/:path*",
    "/global-chat/:path*",
    // Explicitly protect API namespaces (avoid regex lookaheads which are unsupported)
    "/api/friends/:path*",
    "/api/sessions/:path*",
    "/api/users/:path*",
    "/api/global-chat/:path*",
    "/api/chat/:path*",
  ],
};
