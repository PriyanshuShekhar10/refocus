// Deprecated: Supabase server client removed after migration to NextAuth + MongoDB.
export async function createClient() {
  throw new Error(
    "Supabase server client is removed. Use NextAuth + MongoDB instead."
  );
}
