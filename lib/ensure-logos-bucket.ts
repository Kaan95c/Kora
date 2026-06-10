import { createClient } from "@supabase/supabase-js";

/**
 * Crée (si absent) le bucket Storage public "logos".
 * Idempotent. Confirme aussi que la clé service_role accède bien au Storage.
 */
const BUCKET = "logos";

async function main() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: buckets, error } = await admin.storage.listBuckets();
  if (error) {
    console.error("❌ Storage inaccessible :", error.message);
    process.exit(1);
  }

  if (buckets.some((b) => b.name === BUCKET)) {
    console.log(`✅ Bucket "${BUCKET}" existe déjà.`);
    return;
  }

  const { error: createErr } = await admin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
  });
  if (createErr) {
    console.error("❌ Création du bucket échouée :", createErr.message);
    process.exit(1);
  }
  console.log(`✅ Bucket "${BUCKET}" créé (public, max 2 MB).`);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
