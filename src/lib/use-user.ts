"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "./supabase-browser";

export interface AppUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

/**
 * Client-side current-user hook backed by Supabase Auth. Returns null while
 * loading or when signed out / not configured.
 */
export function useUser(): AppUser | null {
  const [user, setUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const u = data.user;
      setUser(u ? toAppUser(u) : null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sessionData) => {
      const u = sessionData?.user;
      setUser(u ? toAppUser(u) : null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return user;
}

export async function signOutUser() {
  const supabase = getSupabaseBrowser();
  if (supabase) await supabase.auth.signOut();
  window.location.href = "/";
}

function toAppUser(u: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): AppUser {
  const meta = u.user_metadata || {};
  return {
    id: u.id,
    email: u.email ?? null,
    name: (meta.full_name as string) || (meta.name as string) || (u.email?.split("@")[0] ?? null),
    image: (meta.avatar_url as string) || (meta.picture as string) || null,
  };
}
