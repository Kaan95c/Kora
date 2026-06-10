import { Resend } from "resend";
import type { ReactElement } from "react";

/**
 * Envoi d'email centralisé (Resend) — **best-effort** : ne lève jamais, et
 * ne fait rien si `RESEND_API_KEY` est absente (mode démo).
 *
 * Expéditeur = `RESEND_FROM` (domaine vérifié `kora-app.fr`). Les emails partent
 * aux vrais destinataires — plus aucune redirection sandbox.
 */
type SendArgs = {
  to: string;
  subject: string;
  react?: ReactElement;
  text?: string;
};

type SendResult = { ok: boolean; skipped?: boolean; error?: string };

const DEFAULT_FROM = "Kora <onboarding@resend.dev>";

export async function sendEmail(args: SendArgs): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, skipped: true };

  const from = process.env.RESEND_FROM || DEFAULT_FROM;

  try {
    const resend = new Resend(apiKey);
    const { error } = args.react
      ? await resend.emails.send({
          from,
          to: args.to,
          subject: args.subject,
          react: args.react,
        })
      : await resend.emails.send({
          from,
          to: args.to,
          subject: args.subject,
          text: args.text ?? "",
        });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
