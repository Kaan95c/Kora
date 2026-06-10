# Kora — SaaS Gestion Client

## Stack

Next.js 14 App Router + TypeScript + Tailwind CSS + shadcn/ui + Prisma + Supabase + Stripe + Resend

## Couleurs principales

- Primary (vert sauge) : #52634c
- Background : #fbf9f5
- Surface/cards : #ffffff
- Texte principal : #1b1c1a
- Texte secondaire : #444841
- Bordures légères : #c4c8be
- Accent pêche : #f8dac5

## Fonts

- Manrope : titres, navigation, body
- Inter : tableaux, labels, badges

## Conventions

- TypeScript strict, jamais de "any"
- Icônes : Lucide React uniquement
- Styles : Tailwind uniquement, pas de CSS custom sauf exceptions
- Composants UI : shadcn/ui en priorité
- Spacing : multiples de 8px
- Border radius cards : 16px / boutons : 8px / badges : 9999px
- Shadows : tonal légères, jamais noires pures
- Hover sur cards : translateY(-2px) + shadow plus forte

## Commandes

- npm run dev
- npx prisma migrate dev
- npx prisma studio

## Sécurité

- Jamais de clé API côté client
- Filtrer toutes les requêtes DB par companyId
