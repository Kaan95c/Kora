import { z } from "zod";

/**
 * Schémas Zod — source de vérité de la validation des entrées API.
 * Branchés dans les routes POST/PUT/PATCH via `schema.parse(await req.json())`.
 * Une `ZodError` est convertie en 400 détaillé par `lib/api-handler`.
 *
 * Par défaut, Zod **retire** les clés inconnues (pas de `.strict()`) → on ne
 * garde que les champs validés.
 */

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Couleur hexadécimale invalide.");

// ───────────────────────── Contact ─────────────────────────
const CONTACT_STATUS = ["LEAD", "PROSPECT", "CLIENT", "ARCHIVED"] as const;
export const contactCreateSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(100),
  lastName: z.string().trim().min(1, "Le nom est requis.").max(100),
  email: z
    .string()
    .trim()
    .min(1, "L'email est requis.")
    .email("Email invalide.")
    .max(200),
  phone: z.string().trim().max(40).nullish(),
  companyName: z.string().trim().max(150).nullish(),
  address: z.string().trim().max(300).nullish(),
  notes: z.string().trim().max(5000).nullish(),
  status: z.enum(CONTACT_STATUS).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(50).optional(),
});
export const contactUpdateSchema = contactCreateSchema.partial();

// ───────────────────────── Project ─────────────────────────
const PROJECT_STATUS = [
  "INQUIRY",
  "FOLLOW_UP",
  "BOOKING",
  "ACTIVE",
  "ARCHIVED",
] as const;
export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(150),
  contactId: z.string().trim().min(1).nullish(),
  status: z.enum(PROJECT_STATUS).optional(),
  startDate: z.string().trim().nullish(),
});
export const projectStatusSchema = z.object({
  status: z.enum(PROJECT_STATUS),
});
/** PATCH = mise à jour partielle (header, infos, notes) → tout optionnel. */
export const projectUpdateSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(150).optional(),
  status: z.enum(PROJECT_STATUS).optional(),
  contactId: z.string().trim().min(1).nullish(),
  description: z.string().trim().max(5000).nullish(),
  notes: z.string().trim().max(10000).nullish(),
  totalAmount: z.union([z.number(), z.string()]).nullish(),
  startDate: z.string().trim().nullish(),
  endDate: z.string().trim().nullish(),
});

// ───────────────────────── Task ─────────────────────────
export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis.").max(200),
});
export const taskUpdateSchema = z.object({
  taskId: z.string().trim().min(1, "taskId est requis."),
  title: z.string().trim().min(1).max(200).optional(),
  completed: z.boolean().optional(),
});

// ───────────────────────── Document ─────────────────────────
const DOCUMENT_TYPE = ["INVOICE", "QUOTE", "CONTRACT", "PROPOSAL"] as const;
const DOCUMENT_STATUS = ["DRAFT", "SENT", "SIGNED", "PAID"] as const;
export const documentCreateSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis.").max(200),
  number: z.string().trim().max(60).nullish(),
  type: z.enum(DOCUMENT_TYPE, { message: "Type de document invalide." }),
  status: z.enum(DOCUMENT_STATUS).optional(),
  total: z.union([z.number(), z.string()]).nullish(),
  contactId: z.string().trim().min(1).nullish(),
  projectId: z.string().trim().min(1).nullish(),
});
export const documentStatusSchema = z.object({
  status: z.enum(DOCUMENT_STATUS),
});

// ───────────────────────── Message ─────────────────────────
export const messageCreateSchema = z.object({
  body: z.string().trim().min(1, "Le message est requis.").max(10000),
  subject: z.string().trim().max(200).nullish(),
  contactId: z.string().trim().min(1, "Un destinataire est requis."),
  projectId: z.string().trim().min(1).nullish(),
});

// ───────────────────────── Appointment ─────────────────────────
export const appointmentCreateSchema = z.object({
  title: z.string().trim().min(1, "Le titre est requis.").max(200),
  startAt: z.string().trim().min(1, "La date de début est requise."),
  endAt: z.string().trim().nullish(),
  notes: z.string().trim().max(5000).nullish(),
  contactId: z.string().trim().min(1).nullish(),
  sessionTypeId: z.string().trim().min(1).nullish(),
});
export const appointmentUpdateSchema = appointmentCreateSchema.partial();

// ───────────────────────── SessionType ─────────────────────────
export const sessionTypeCreateSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(100),
  duration: z.coerce.number().int().min(1).max(1440).optional(),
  color: hexColor.optional(),
  price: z.union([z.number(), z.string()]).nullish(),
});
export const sessionTypeUpdateSchema = sessionTypeCreateSchema.partial();

// ───────────────────────── Automation ─────────────────────────
const AUTOMATION_TRIGGER = [
  "NEW_LEAD",
  "CONTRACT_SIGNED",
  "INVOICE_SENT",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "APPOINTMENT_BOOKED",
  "PROJECT_STATUS_CHANGED",
  "TAG_ADDED",
] as const;
export const automationCreateSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(150),
  description: z.string().trim().max(1000).nullish(),
  trigger: z.enum(AUTOMATION_TRIGGER),
  isActive: z.boolean().optional(),
  // Le détail des actions (type/delayHours/config) est validé côté serveur par
  // `buildActionsCreate` (lib/automations-server) → on garde les objets bruts.
  actions: z.array(z.unknown()).max(20).optional(),
});
/** PATCH = toggle (isActive seul) OU update complet → tout optionnel. */
export const automationPatchSchema = automationCreateSchema.partial();

// ───────────────────────── Settings ─────────────────────────
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(120),
});
export const studioUpdateSchema = z.object({
  name: z.string().trim().min(1, "Le nom du studio est requis.").max(150),
  siret: z.string().trim().max(30).nullish(),
  vatNumber: z.string().trim().max(30).nullish(),
  address: z.string().trim().max(300).nullish(),
  phone: z.string().trim().max(40).nullish(),
  email: z
    .union([z.string().trim().email("Email invalide.").max(200), z.literal("")])
    .nullish(),
});
export const brandingUpdateSchema = z.object({
  primaryColor: hexColor.optional(),
  // logoUrl provient de notre propre upload Storage → on valide juste la taille.
  logoUrl: z.string().trim().max(500).nullish(),
  invoicePrefix: z.string().trim().max(10).optional(),
  quotePrefix: z.string().trim().max(10).optional(),
});

// ───────────────────────── Paiement / Compte ─────────────────────────
export const paymentIntentSchema = z.object({
  documentId: z.string().trim().min(1, "documentId est requis."),
});
export const setupCompanySchema = z.object({
  // L'identité (supabaseId + email) vient de la session validée serveur, pas du
  // body → on ne valide ici que les infos saisies dans le formulaire. Les clés
  // `userId`/`email` éventuellement encore envoyées sont ignorées (Zod les retire).
  studioName: z.string().trim().min(1, "Le nom du studio est requis.").max(150),
  fullName: z.string().trim().max(120).nullish(),
});
export const billingCheckoutSchema = z.object({
  plan: z.enum(["STARTER", "PRO"], { message: "Plan invalide." }),
});
export const languageSchema = z.object({
  language: z.enum(["fr", "en"], { message: "Langue invalide." }),
});
