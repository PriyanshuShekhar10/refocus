// Deprecated Supabase confirm route removed after migration to NextAuth.
export async function GET() {
  return new Response("Not Found", { status: 404 });
}
