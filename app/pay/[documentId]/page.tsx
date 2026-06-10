import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { ensurePaymentIntent } from "@/lib/payments-server";
import { PayForm } from "./PayForm";

export const dynamic = "force-dynamic";

/**
 * Page de paiement publique (pas de login requis : /pay n'est pas dans
 * PROTECTED_PREFIXES). Server Component : crée/réutilise le PaymentIntent
 * côté serveur et passe le clientSecret au formulaire client.
 */
export default async function PayPage({
  params,
}: {
  params: { documentId: string };
}) {
  const doc = await prisma.document.findUnique({
    where: { id: params.documentId },
    select: {
      id: true,
      title: true,
      number: true,
      type: true,
      total: true,
      status: true,
      companyId: true,
      contactId: true,
      projectId: true,
      contact: { select: { firstName: true, lastName: true } },
      company: { select: { name: true } },
    },
  });

  if (!doc) notFound();

  const recap = {
    title: doc.title,
    number: doc.number,
    total: doc.total ?? 0,
    clientName: doc.contact
      ? `${doc.contact.firstName} ${doc.contact.lastName}`
      : null,
    companyName: doc.company?.name ?? "Studio",
  };

  if (doc.status === "PAID") {
    return (
      <PayForm
        recap={recap}
        documentId={doc.id}
        clientSecret={null}
        alreadyPaid
      />
    );
  }

  if (doc.type !== "INVOICE" || !doc.total || doc.total <= 0) {
    return (
      <PayForm
        recap={recap}
        documentId={doc.id}
        clientSecret={null}
        notPayable
      />
    );
  }

  const { clientSecret } = await ensurePaymentIntent(doc);
  return (
    <PayForm recap={recap} documentId={doc.id} clientSecret={clientSecret} />
  );
}
