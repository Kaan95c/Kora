import { NextResponse } from "next/server";
import { createElement } from "react";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { ensurePaymentIntent } from "@/lib/payments-server";
import { sendEmail } from "@/lib/email";
import { InvoiceEmail } from "@/components/emails/InvoiceEmail";
import { withApi } from "@/lib/api-handler";
import { paymentIntentSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

// POST : génère (ou réutilise) un PaymentIntent + envoie la facture par email,
// et renvoie l'URL de paiement.
export const POST = withApi(async (request: Request) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "No company" }, { status: 403 });
  }

  const { documentId } = paymentIntentSchema.parse(await request.json());

  const doc = await prisma.document.findFirst({
    where: { id: documentId, companyId: company.id },
    select: {
      id: true,
      type: true,
      total: true,
      status: true,
      number: true,
      companyId: true,
      contactId: true,
      projectId: true,
      contact: { select: { email: true, firstName: true, lastName: true } },
      company: { select: { name: true } },
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (doc.type !== "INVOICE") {
    return NextResponse.json(
      { error: "Only invoices can be paid online" },
      { status: 400 }
    );
  }
  if (!doc.total || doc.total <= 0) {
    return NextResponse.json(
      { error: "This invoice has no amount" },
      { status: 400 }
    );
  }
  if (doc.status === "PAID") {
    return NextResponse.json(
      { error: "This invoice is already paid" },
      { status: 400 }
    );
  }

  await ensurePaymentIntent(doc);

  const origin = new URL(request.url).origin;
  const url = `${origin}/pay/${doc.id}`;

  // Envoie la facture au client (best-effort).
  let emailed = false;
  if (doc.contact?.email) {
    const res = await sendEmail({
      to: doc.contact.email,
      subject: `Invoice ${doc.number ?? ""} from ${doc.company.name}`.trim(),
      react: createElement(InvoiceEmail, {
        studioName: doc.company.name,
        clientName: doc.contact.firstName,
        invoiceNumber: doc.number ?? doc.id.slice(0, 8).toUpperCase(),
        amount: eur(doc.total),
        payUrl: url,
      }),
    });
    emailed = res.ok;
  }

  return NextResponse.json({ url, emailed });
});
