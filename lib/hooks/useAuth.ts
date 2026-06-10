"use client";

import { useContext } from "react";

import { AuthContext } from "@/components/providers/AuthProvider";

/**
 * Accès au contexte d'authentification global : { user, company, isLoading }.
 * Le AuthProvider (dans app/(app)/layout.tsx) porte l'état (session Supabase
 * via onAuthStateChange + Company via /api/auth/me) ; ce hook le consomme.
 */
export function useAuth() {
  return useContext(AuthContext);
}

export default useAuth;
