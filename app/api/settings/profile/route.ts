import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthedCompany } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { withApi } from "@/lib/api-handler";
import { profileUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

// PUT : met à jour le nom du user (Prisma) + le displayName Supabase (admin).
export const PUT = withApi(async (request: Request) => {
  const { user } = await getAuthedCompany();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = profileUpdateSchema.parse(await request.json());

  // Source de vérité applicative (scopé au user courant via supabaseId).
  await prisma.user.updateMany({
    where: { supabaseId: user.id },
    data: { name },
  });

  // Miroir côté Supabase Auth (user_metadata.full_name).
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, full_name: name },
  });

  return NextResponse.json({ name });
});
