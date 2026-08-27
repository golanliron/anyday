"use client";

// Supabase Auth manages the session via cookies + the Supabase client, so no
// React context provider is required. Kept as a pass-through so layout.tsx and
// any importers stay unchanged.
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
