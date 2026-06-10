import Stripe from "stripe";

/**
 * Client Stripe côté serveur (service / clé secrète). JAMAIS importé côté client.
 * Instancié paresseusement pour ne pas exiger la clé au moment du build.
 */
let singleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!singleton) {
    singleton = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return singleton;
}
