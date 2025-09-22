// Deprecated: Supabase client removed after migration to NextAuth + MongoDB.
export function createClient() {
  throw new Error(
    "Supabase client is removed. Use NextAuth + MongoDB instead."
  );
}
