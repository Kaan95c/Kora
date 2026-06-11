import { NextResponse } from "next/server";

import { getAuthedCompany } from "@/lib/auth";
import { buildInvoiceBuffer } from "@/lib/invoice-pdf";
import { withApi } from "@/lib/api-handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET : PDF de la facture (authed, scopé company) → téléchargement.
export const GET = withApi(async (
  _request: Request,
  { params }: { params: { id: string } }
) => {
  const { user, company } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await buildInvoiceBuffer(params.id, { companyId: company.id });
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
