import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { buildInvoiceBuffer } from "@/lib/invoice-pdf";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET : PDF de la facture côté CLIENT (public). Gated : disponible seulement
// une fois la facture payée (status = PAID). documentId = cuid imprévisible.
export const GET = withApi(async (
  _request: Request,
  { params }: { params: { documentId: string } }
) => {
  const doc = await prisma.document.findUnique({
    where: { id: params.documentId },
    select: { id: true, status: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (doc.status !== "PAID") {
    return NextResponse.json(
      { error: "Invoice available after payment" },
      { status: 403 }
    );
  }

  const result = await buildInvoiceBuffer(params.documentId);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
