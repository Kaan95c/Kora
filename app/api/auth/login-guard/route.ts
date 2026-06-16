import { NextResponse } from "next/server";
import { z } from "zod";

import { withApi } from "@/lib/api-handler";
import {
  checkLoginLock,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["check", "fail", "success"]),
  // Simple identifiant (clé Redis), pas un compte — on borne juste la longueur.
  email: z.string().min(1).max(200),
});

/** IP du client (Vercel pose `x-forwarded-for` ; fallback `x-real-ip`). */
function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "anonymous"
  );
}

/**
 * Garde anti brute-force du login (lockout progressif Upstash, par IP + email).
 * Le `signIn` Supabase reste côté client ; cette route entoure la tentative :
 * - `check`   : avant le signIn → si verrouillé, le client n'appelle pas Supabase
 *               (sinon un bon mot de passe pendant le verrou passerait) ;
 * - `fail`    : après un signIn en échec → INCR + pose éventuelle du verrou ;
 * - `success` : après un signIn réussi → reset des compteurs.
 *
 * Réponse : `{ locked, retryAfter }` (toujours 200 ; fail-open sans Upstash).
 */
export const POST = withApi(async (req) => {
  const { action, email } = bodySchema.parse(await req.json());
  const ip = clientIp(req);

  if (action === "success") {
    await clearLoginFailures(ip, email);
    return NextResponse.json({ locked: false, retryAfter: 0 });
  }

  const status =
    action === "fail"
      ? await recordLoginFailure(ip, email)
      : await checkLoginLock(ip, email);

  return NextResponse.json(status);
});
