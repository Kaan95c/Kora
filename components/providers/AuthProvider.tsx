"use client";

import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

export type Company = {
  id: string;
  name: string;
  plan: string;
  primaryColor: string;
  invoicePrefix: string;
  quotePrefix: string;
  logoUrl?: string | null;
  siret?: string | null;
  vatNumber?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
} | null;

export type AuthContextValue = {
  user: User | null;
  company: Company;
  isLoading: boolean;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  company: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadCompany() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setCompany(data.company ?? null);
        } else {
          setCompany(null);
        }
      } catch {
        setCompany(null);
      }
    }

    // onAuthStateChange émet immédiatement l'état initial (INITIAL_SESSION).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        loadCompany();
      } else {
        setCompany(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, company, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
