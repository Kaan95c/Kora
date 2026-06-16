import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Pattern "updateSession" Supabase : rafraîchit le token et renvoie
 * la réponse (avec cookies mis à jour) + le user courant.
 *
 * `nonce` + `csp` (optionnels) sont injectés dans les **headers de requête**
 * forwardés à Next → le moteur de rendu lit la CSP, en extrait le nonce et
 * l'applique automatiquement à ses scripts de bootstrap. On reconstruit les
 * headers depuis `request.headers` à chaque `NextResponse.next` (y compris
 * après que Supabase a posé les cookies de refresh) pour préserver les cookies
 * tout en ajoutant le nonce.
 */
export async function updateSession(
  request: NextRequest,
  nonce?: string,
  csp?: string
) {
  const nextWithHeaders = () => {
    if (!nonce || !csp) return NextResponse.next({ request });
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("content-security-policy", csp);
    return NextResponse.next({ request: { headers: requestHeaders } });
  };

  let supabaseResponse = nextWithHeaders();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = nextWithHeaders();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT : ne pas exécuter de code entre createServerClient et getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
