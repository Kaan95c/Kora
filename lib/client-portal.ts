import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { hasClientPortal } from "@/lib/plan-limits";

/**
 * Portail client (étape 15) — accès public par lien/token SIGNÉ (HMAC).
 *
 * Pas de compte Supabase côté client, pas de stockage en base : le token est
 * dérivé de l'`id` du contact via HMAC-SHA256 (stateless, infalsifiable). Le
 * studio partage `/client/<token>` ; le portail vérifie la signature puis ne
 * renvoie QUE les données rattachées à ce contact (scope par `contactId`).
 *
 * Secret : `CLIENT_PORTAL_SECRET` si défini, sinon repli sur la
 * `SUPABASE_SERVICE_ROLE_KEY` (déjà présente, jamais exposée au client).
 * Plus de valeur littérale par défaut : si aucun secret n'est configuré, on
 * échoue (fail-closed) plutôt que d'utiliser un secret devinable.
 * Résolu paresseusement (pas au chargement du module) pour ne pas casser le build.
 */
function getSecret(): string {
  const secret =
    process.env.CLIENT_PORTAL_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      "CLIENT_PORTAL_SECRET (ou SUPABASE_SERVICE_ROLE_KEY) doit être défini pour signer les liens du portail client."
    );
  }
  return secret;
}

function sign(contactId: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(contactId)
    .digest("base64url");
}

/** Construit le token signé `<payload>.<signature>` pour un contact. */
export function signClientToken(contactId: string): string {
  const payload = Buffer.from(contactId, "utf8").toString("base64url");
  return `${payload}.${sign(contactId)}`;
}

/** Vérifie un token et renvoie le `contactId` s'il est valide, sinon `null`. */
export function verifyClientToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let contactId: string;
  try {
    contactId = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!contactId) return null;

  // Comparaison à temps constant (anti timing-attack).
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(contactId));
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  return contactId;
}

/** Chemin relatif du portail pour un token donné. */
export function clientPortalPath(token: string): string {
  return `/client/${token}`;
}

// ───────────────────────── Data loader ─────────────────────────

export type PortalDocument = {
  id: string;
  title: string;
  number: string | null;
  type: "INVOICE" | "QUOTE" | "CONTRACT" | "PROPOSAL";
  status: "DRAFT" | "SENT" | "SIGNED" | "PAID";
  total: number | null;
  dueDate: Date | null;
  createdAt: Date;
};

export type PortalPayment = {
  id: string;
  amount: number;
  status: "PENDING" | "PAID" | "OVERDUE" | "REFUNDED";
  method: "CARD" | "BANK_TRANSFER" | "SEPA" | "CASH" | null;
  paidAt: Date | null;
  createdAt: Date;
  document: { number: string | null; title: string } | null;
};

export type PortalAppointment = {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  sessionType: { name: string; color: string } | null;
};

export type PortalProject = {
  id: string;
  name: string;
  status: "INQUIRY" | "FOLLOW_UP" | "BOOKING" | "ACTIVE" | "ARCHIVED";
  totalAmount: number;
  paidAmount: number;
};

export type PortalData = {
  contact: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName: string | null;
  };
  company: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  };
  documents: PortalDocument[];
  payments: PortalPayment[];
  appointments: PortalAppointment[];
  projects: PortalProject[];
  totals: { outstanding: number; paid: number };
};

/**
 * Charge l'intégralité des données visibles par le client à partir d'un token.
 * Renvoie `null` si le token est invalide ou le contact introuvable.
 * Les documents en DRAFT sont volontairement masqués (non finalisés).
 */
export async function getPortalData(token: string): Promise<PortalData | null> {
  const contactId = verifyClientToken(token);
  if (!contactId) return null;

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      companyName: true,
      status: true,
      company: {
        select: {
          name: true,
          logoUrl: true,
          primaryColor: true,
          email: true,
          phone: true,
          address: true,
          plan: true,
        },
      },
    },
  });

  if (!contact || contact.status === "ARCHIVED") return null;

  // Portail désactivé sur le plan Free → lien invalide (même les liens déjà
  // partagés cessent de fonctionner si la company repasse en Free).
  const { plan, ...company } = contact.company;
  if (!hasClientPortal(plan)) return null;

  const [documents, payments, appointments, projects] = await Promise.all([
    prisma.document.findMany({
      where: { contactId, status: { not: "DRAFT" } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        number: true,
        type: true,
        status: true,
        total: true,
        dueDate: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { contactId },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        amount: true,
        status: true,
        method: true,
        paidAt: true,
        createdAt: true,
        document: { select: { number: true, title: true } },
      },
    }),
    prisma.appointment.findMany({
      where: { contactId },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        sessionType: { select: { name: true, color: true } },
      },
    }),
    prisma.project.findMany({
      where: { contactId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
      },
    }),
  ]);

  // Solde dû = factures envoyées/signées non payées. Payé = factures réglées.
  const outstanding = documents
    .filter((d) => d.type === "INVOICE" && (d.status === "SENT" || d.status === "SIGNED"))
    .reduce((sum, d) => sum + (d.total ?? 0), 0);
  const paid = documents
    .filter((d) => d.type === "INVOICE" && d.status === "PAID")
    .reduce((sum, d) => sum + (d.total ?? 0), 0);

  return {
    contact: {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      companyName: contact.companyName,
    },
    company,
    documents,
    payments,
    appointments,
    projects,
    totals: { outstanding, paid },
  };
}

// ───────────────────────── Formatage ─────────────────────────

export const euros = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

export function portalDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function portalDateTime(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
