import { renderToBuffer } from "@react-pdf/renderer";

import { prisma } from "@/lib/prisma";
import { InvoicePDF, type InvoiceData } from "@/components/pdf/InvoicePDF";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// react-pdf <Image> ne gère que le raster (PNG/JPG) → on ignore SVG/autres.
function safeLogo(url: string | null): string | null {
  return url && /\.(png|jpe?g)$/i.test(url) ? url : null;
}

/**
 * Construit le buffer PDF d'une facture/devis.
 * - scopé company si `opts.companyId` fourni (route authed) ; sinon par id (route publique).
 * - fallback : si aucune LineItem, une ligne unique reprenant `document.total`.
 * Renvoie null si le document est introuvable.
 */
export async function buildInvoiceBuffer(
  documentId: string,
  opts?: { companyId?: string }
): Promise<{ buffer: Buffer; filename: string } | null> {
  const doc = await prisma.document.findFirst({
    where: opts?.companyId
      ? { id: documentId, companyId: opts.companyId }
      : { id: documentId },
    select: {
      id: true,
      title: true,
      number: true,
      type: true,
      total: true,
      createdAt: true,
      dueDate: true,
      contact: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          address: true,
        },
      },
      company: {
        select: {
          name: true,
          address: true,
          siret: true,
          vatNumber: true,
          logoUrl: true,
          email: true,
          phone: true,
        },
      },
      lineItems: {
        orderBy: { order: "asc" },
        select: {
          name: true,
          description: true,
          quantity: true,
          unitPrice: true,
          total: true,
          taxRate: true,
        },
      },
    },
  });

  if (!doc) return null;

  const lines =
    doc.lineItems.length > 0
      ? doc.lineItems
      : [
          {
            name: doc.title,
            description: null,
            quantity: 1,
            unitPrice: doc.total ?? 0,
            total: doc.total ?? 0,
            taxRate: 20,
          },
        ];

  const subtotalHT = lines.reduce((s, l) => s + l.total, 0);
  const totalTVA = lines.reduce((s, l) => s + (l.total * l.taxRate) / 100, 0);
  const totalTTC = subtotalHT + totalTVA;

  const due =
    doc.dueDate ?? new Date(doc.createdAt.getTime() + 30 * 86_400_000);

  const data: InvoiceData = {
    type: doc.type,
    number: doc.number ?? doc.title,
    issueDate: fmtDate(doc.createdAt),
    dueDate: fmtDate(due),
    company: {
      name: doc.company.name,
      address: doc.company.address,
      siret: doc.company.siret,
      vatNumber: doc.company.vatNumber,
      logoUrl: safeLogo(doc.company.logoUrl),
      email: doc.company.email,
      phone: doc.company.phone,
    },
    client: {
      name: doc.contact
        ? `${doc.contact.firstName} ${doc.contact.lastName}`
        : "—",
      email: doc.contact?.email ?? null,
      address: doc.contact?.address ?? null,
    },
    lines: lines.map((l) => ({
      name: l.name,
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      total: l.total,
      taxRate: l.taxRate,
    })),
    subtotalHT,
    totalTVA,
    totalTTC,
  };

  const buffer = await renderToBuffer(<InvoicePDF data={data} />);
  const safeName = (doc.number ?? doc.title).replace(/[^\w.-]+/g, "-");
  return { buffer, filename: `${safeName}.pdf` };
}
