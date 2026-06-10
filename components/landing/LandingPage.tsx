"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import "./landing.css";

type Billing = "monthly" | "annual";

const PRICES: Record<Billing, { free: number; starter: number; pro: number }> = {
  monthly: { free: 0, starter: 19, pro: 39 },
  annual: { free: 0, starter: 15, pro: 31 },
};

export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [billing, setBilling] = useState<Billing>("monthly");

  const price = PRICES[billing];
  const billed = (key: keyof typeof price) =>
    billing === "annual" && price[key] > 0
      ? `Facturé ${price[key] * 12}€ par an`
      : "";

  // Reveal au scroll — IntersectionObserver + fallback si IO ne déclenche jamais
  // (mêmes garde-fous que la landing d'origine).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));

    const revealAll = () =>
      els.forEach((el) => {
        el.style.transition = "none";
        el.classList.add("in");
      });

    if (!("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    let ioFired = false;
    const io = new IntersectionObserver(
      (entries) => {
        ioFired = true;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));

    const timer = setTimeout(() => {
      if (!ioFired) {
        io.disconnect();
        revealAll();
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      io.disconnect();
    };
  }, []);

  return (
    <div className="kora-landing" ref={rootRef}>
      {/* ============ NAV ============ */}
      <header className="nav">
        <div className="container nav-inner">
          <a className="nav-brand" href="#">
            <img src="/landing/logo.png" alt="Kora" />
            <strong>KORA</strong>
          </a>
          <ul className="nav-links">
            <li className="hide-mobile">
              <a href="#fonctionnalites">Fonctionnalités</a>
            </li>
            <li className="hide-mobile">
              <a href="#comment">Comment ça marche</a>
            </li>
            <li className="hide-mobile">
              <a href="#tarifs">Tarifs</a>
            </li>
            <li className="hide-mobile">
              <a href="#faq">FAQ</a>
            </li>
            <li>
              <Link href="/login">Connexion</Link>
            </li>
            <li>
              <Link className="btn btn-primary" href="/register">
                Commencer gratuitement
              </Link>
            </li>
          </ul>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="hero">
        <div className="container">
          <div className="hero-copy">
            <span className="eyebrow">Le partenaire créatif</span>
            <h1 className="display">
              Votre activité, enfin
              <br />
              sereine et organisée.
            </h1>
            <p className="lede">
              Kora réunit clients, projets, devis, contrats, facturation et
              rendez-vous dans un espace de travail calme — pour que vous passiez
              moins de temps à gérer, et plus de temps à créer.
            </p>
            <div className="hero-ctas">
              <Link className="btn btn-primary btn-lg" href="/register">
                Commencer gratuitement
              </Link>
              <a className="btn btn-ghost btn-lg" href="#fonctionnalites">
                Découvrir Kora
              </a>
            </div>
            <p className="hero-note">
              Démo personnalisée de 20 minutes · Sans engagement
            </p>
          </div>
          <div className="hero-shot">
            <img
              src="/landing/hero-dashboard.png"
              alt="Tableau de bord Kora : revenus du mois, projets actifs, documents en attente"
            />
          </div>
        </div>
        <div className="hero-base"></div>
      </section>

      {/* ============ PROFESSIONS STRIP ============ */}
      <section className="strip">
        <div className="container strip-inner">
          <p>Pensé pour tous les indépendants</p>
          <div className="strip-pills">
            <span className="pill">Designers</span>
            <span className="pill">Photographes</span>
            <span className="pill">Architectes</span>
            <span className="pill">Vidéastes</span>
            <span className="pill">Coachs</span>
            <span className="pill">Consultants</span>
            <span className="pill">Développeurs</span>
            <span className="pill">Rédacteurs</span>
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="section" id="fonctionnalites">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Fonctionnalités</span>
            <h2 className="headline">Tout votre studio, un seul outil</h2>
            <p className="lede">
              Fini les allers-retours entre six applications. Kora couvre
              l&apos;ensemble de votre relation client, du premier contact au
              paiement final.
            </p>
          </div>
          <div className="features-grid">
            <article className="feature-card reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                </svg>
              </div>
              <h3>Projets</h3>
              <p>
                Un pipeline clair pour chaque mission : statuts, échéances et
                tâches urgentes, visibles d&apos;un coup d&apos;œil depuis le
                tableau de bord.
              </p>
            </article>
            <article className="feature-card reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="3.5"></circle>
                  <path d="M5 20c1.3-3 4-4.5 7-4.5s5.7 1.5 7 4.5"></path>
                </svg>
              </div>
              <h3>Contacts &amp; CRM</h3>
              <p>
                Tout l&apos;historique de chaque client au même endroit :
                échanges, documents, rendez-vous et factures liés
                automatiquement.
              </p>
            </article>
            <article className="feature-card reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="3" width="14" height="18" rx="2"></rect>
                  <line x1="9" y1="9" x2="15" y2="9"></line>
                  <line x1="9" y1="13" x2="15" y2="13"></line>
                  <line x1="9" y1="17" x2="13" y2="17"></line>
                </svg>
              </div>
              <h3>Documents &amp; signatures</h3>
              <p>
                Devis, contrats et propositions envoyés en quelques clics — vos
                clients signent en ligne, vous suivez chaque statut.
              </p>
            </article>
            <article className="feature-card reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 9 11 13 14 20 6"></polyline>
                  <line x1="4" y1="21" x2="20" y2="21"></line>
                </svg>
              </div>
              <h3>Finance &amp; facturation</h3>
              <p>
                Facturez, encaissez et suivez l&apos;évolution de votre chiffre
                d&apos;affaires mois après mois, sans tableur ni calcul manuel.
              </p>
            </article>
            <article className="feature-card reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <line x1="8" y1="3" x2="8" y2="7"></line>
                  <line x1="16" y1="3" x2="16" y2="7"></line>
                </svg>
              </div>
              <h3>Scheduler</h3>
              <p>
                Définissez vos types de session et vos disponibilités ; vos
                clients réservent directement le créneau qui leur convient.
              </p>
            </article>
            <article className="feature-card reveal">
              <div className="feature-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="13 3 7 13 11 13 9 21 17 10 13 10 15 3"></polyline>
                </svg>
              </div>
              <h3>Automations</h3>
              <p>
                Relances de devis, rappels de rendez-vous, suivis de paiement :
                Kora s&apos;en occupe pendant que vous travaillez.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ============ SHOWCASE 1 ============ */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="showcase">
            <div className="showcase-copy reveal">
              <span className="eyebrow">Pilotage</span>
              <h2 className="headline">Votre activité d&apos;un coup d&apos;œil</h2>
              <p className="lede">
                Chaque matin, votre tableau de bord vous dit exactement où vous
                en êtes : ce qui rentre, ce qui bloque, et ce qui mérite votre
                attention aujourd&apos;hui.
              </p>
              <ul>
                <li>
                  <span className="check"></span>Revenus du mois et croissance
                  sur 12 mois
                </li>
                <li>
                  <span className="check"></span>Documents en attente de
                  signature
                </li>
                <li>
                  <span className="check"></span>Tâches urgentes signalées
                  automatiquement
                </li>
              </ul>
            </div>
            <div className="showcase-stack reveal">
              <div className="showcase-media">
                <img
                  src="/landing/revenue-chart.png"
                  alt="Graphique de croissance des revenus sur 12 mois"
                />
              </div>
              <div className="showcase-media">
                <img
                  src="/landing/upcoming.png"
                  alt="Prochains rendez-vous à venir"
                />
              </div>
            </div>
          </div>

          {/* ============ SHOWCASE 2 ============ */}
          <div className="showcase flip">
            <div className="showcase-copy reveal">
              <span className="eyebrow">Rendez-vous</span>
              <h2 className="headline">Vos clients réservent, vous validez</h2>
              <p className="lede">
                Créez vos types de session — appel découverte gratuit, session
                stratégie payante — et partagez votre page de réservation. Votre
                agenda se remplit tout seul, dans vos disponibilités.
              </p>
              <ul>
                <li>
                  <span className="check"></span>Types de session gratuits ou
                  payants
                </li>
                <li>
                  <span className="check"></span>Disponibilités hebdomadaires
                  personnalisables
                </li>
                <li>
                  <span className="check"></span>Vue semaine et mois, rappels
                  automatiques
                </li>
              </ul>
            </div>
            <div className="showcase-media reveal">
              <img
                src="/landing/scheduler.png"
                alt="Scheduler Kora : agenda hebdomadaire, types de session et disponibilités"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section
        className="section"
        id="comment"
        style={{ background: "var(--surface-low)" }}
      >
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Comment ça marche</span>
            <h2 className="headline">Opérationnel en une après-midi</h2>
          </div>
          <div className="steps">
            <article className="step reveal">
              <div className="step-num">1</div>
              <h3>Installez votre espace</h3>
              <p>
                Importez vos contacts et vos projets en cours. Définissez vos
                types de session et vos disponibilités — c&apos;est tout.
              </p>
            </article>
            <article className="step reveal">
              <div className="step-num">2</div>
              <h3>Envoyez vos documents</h3>
              <p>
                Créez devis et contrats depuis vos modèles, envoyez-les à vos
                clients et faites-les signer en ligne, sans imprimante.
              </p>
            </article>
            <article className="step reveal">
              <div className="step-num">3</div>
              <h3>Encaissez et automatisez</h3>
              <p>
                Facturez en un clic, laissez les relances se faire toutes seules
                et regardez votre courbe de revenus grimper.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="section">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Ils utilisent Kora</span>
            <h2 className="headline">Des indépendants plus sereins</h2>
          </div>
          <div className="quotes">
            <article className="quote reveal">
              <blockquote>
                « Avant Kora, je jonglais entre quatre outils et un tableur.
                Aujourd&apos;hui tout est au même endroit, et mes clients signent
                leurs contrats en ligne le jour même. »
              </blockquote>
              <div className="quote-author">
                <div className="avatar">CM</div>
                <div>
                  <strong>Claire M.</strong>
                  <span>Photographe indépendante</span>
                </div>
              </div>
            </article>
            <article className="quote reveal">
              <blockquote>
                « La page de réservation a changé ma vie : plus d&apos;allers-retours
                par e-mail pour caler un créneau. Mes appels découverte se
                remplissent tout seuls. »
              </blockquote>
              <div className="quote-author">
                <div className="avatar peach">TB</div>
                <div>
                  <strong>Thomas B.</strong>
                  <span>Consultant en stratégie</span>
                </div>
              </div>
            </article>
            <article className="quote reveal">
              <blockquote>
                « Les relances automatiques de factures m&apos;ont fait gagner des
                heures — et je suis payée plus vite. Je recommande Kora à tous les
                créatifs de mon réseau. »
              </blockquote>
              <div className="quote-author">
                <div className="avatar">SL</div>
                <div>
                  <strong>Sofia L.</strong>
                  <span>Directrice de studio design</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section className="section pricing" id="tarifs">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">Tarifs</span>
            <h2 className="headline">Un prix simple, qui grandit avec vous</h2>
            <div
              className="billing-toggle"
              role="group"
              aria-label="Période de facturation"
            >
              <button
                type="button"
                className={billing === "monthly" ? "active" : ""}
                onClick={() => setBilling("monthly")}
              >
                Mensuel
              </button>
              <button
                type="button"
                className={billing === "annual" ? "active" : ""}
                onClick={() => setBilling("annual")}
              >
                Annuel<span className="save">−20%</span>
              </button>
            </div>
          </div>
          <div className="plans">
            <article className="plan reveal">
              <div className="plan-head">
                <h3>Gratuit</h3>
                <p>Pour découvrir Kora et gérer vos premiers clients.</p>
              </div>
              <div>
                <div className="plan-price">
                  <span className="amount">{price.free}€</span>
                  <span className="period">/ mois</span>
                </div>
                <p className="plan-billed">{billed("free")}</p>
              </div>
              <ul>
                <li>
                  <span className="check"></span>3 projets
                </li>
                <li>
                  <span className="check"></span>5 contacts
                </li>
                <li>
                  <span className="check"></span>3 documents / factures
                </li>
                <li>
                  <span className="check"></span>Scheduler inclus
                </li>
                <li>
                  <span className="check"></span>Portail client non inclus
                </li>
              </ul>
              <Link className="btn btn-ghost" href="/register">
                Commencer gratuitement
              </Link>
            </article>
            <article className="plan featured reveal">
              <span className="plan-tag">Le plus populaire</span>
              <div className="plan-head">
                <h3>Starter</h3>
                <p>
                  Pour les indépendants qui veulent gérer leur activité
                  professionnellement.
                </p>
              </div>
              <div>
                <div className="plan-price">
                  <span className="amount">{price.starter}€</span>
                  <span className="period">/ mois</span>
                </div>
                <p className="plan-billed">{billed("starter")}</p>
              </div>
              <ul>
                <li>
                  <span className="check"></span>15 projets
                </li>
                <li>
                  <span className="check"></span>50 contacts
                </li>
                <li>
                  <span className="check"></span>30 documents / factures
                </li>
                <li>
                  <span className="check"></span>3 automatisations
                </li>
                <li>
                  <span className="check"></span>Portail client inclus
                </li>
                <li>
                  <span className="check"></span>Support email
                </li>
              </ul>
              <Link className="btn btn-primary" href="/register">
                Commencer gratuitement
              </Link>
            </article>
            <article className="plan reveal">
              <div className="plan-head">
                <h3>Pro</h3>
                <p>
                  Pour les studios et agences créatives qui veulent tout
                  automatiser.
                </p>
              </div>
              <div>
                <div className="plan-price">
                  <span className="amount">{price.pro}€</span>
                  <span className="period">/ mois</span>
                </div>
                <p className="plan-billed">{billed("pro")}</p>
              </div>
              <ul>
                <li>
                  <span className="check"></span>Projets illimités
                </li>
                <li>
                  <span className="check"></span>Contacts illimités
                </li>
                <li>
                  <span className="check"></span>Documents illimités
                </li>
                <li>
                  <span className="check"></span>Automatisations illimitées
                </li>
                <li>
                  <span className="check"></span>Portail client inclus
                </li>
                <li>
                  <span className="check"></span>PDF personnalisé avec logo
                </li>
                <li>
                  <span className="check"></span>Support prioritaire
                </li>
              </ul>
              <Link className="btn btn-ghost" href="/register">
                Commencer gratuitement
              </Link>
            </article>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="section" id="faq">
        <div className="container">
          <div className="section-head reveal">
            <span className="eyebrow">FAQ</span>
            <h2 className="headline">Questions fréquentes</h2>
          </div>
          <div className="faq-list">
            <details className="faq-item reveal">
              <summary>
                Comment se passe la démo ?<span className="faq-chevron">+</span>
              </summary>
              <p>
                Un appel de 20 minutes avec notre équipe : nous découvrons votre
                façon de travailler, puis nous vous montrons Kora configuré pour
                votre métier. Sans engagement, et vous repartez avec un espace
                d&apos;essai.
              </p>
            </details>
            <details className="faq-item reveal">
              <summary>
                Puis-je migrer depuis un autre outil ?
                <span className="faq-chevron">+</span>
              </summary>
              <p>
                Oui. Vous pouvez importer vos contacts et projets depuis un
                fichier CSV ou directement depuis les outils les plus courants.
                Notre équipe vous accompagne gratuitement pour la migration sur
                les plans Pro et Studio.
              </p>
            </details>
            <details className="faq-item reveal">
              <summary>
                Les signatures électroniques sont-elles valables juridiquement ?
                <span className="faq-chevron">+</span>
              </summary>
              <p>
                Oui. Chaque signature est horodatée et associée à une piste
                d&apos;audit complète, conforme au règlement eIDAS en vigueur dans
                l&apos;Union européenne.
              </p>
            </details>
            <details className="faq-item reveal">
              <summary>
                Y a-t-il un engagement de durée ?
                <span className="faq-chevron">+</span>
              </summary>
              <p>
                Aucun. Les abonnements sont sans engagement et résiliables à tout
                moment. La facturation annuelle est simplement une option, avec
                20% de réduction.
              </p>
            </details>
            <details className="faq-item reveal">
              <summary>
                Comment mes clients paient-ils leurs factures ?
                <span className="faq-chevron">+</span>
              </summary>
              <p>
                Chaque facture inclut un lien de paiement en ligne : carte
                bancaire ou virement. Le statut se met à jour automatiquement dans
                votre espace dès la réception du paiement.
              </p>
            </details>
            <details className="faq-item reveal">
              <summary>
                Mes données sont-elles en sécurité ?
                <span className="faq-chevron">+</span>
              </summary>
              <p>
                Vos données sont chiffrées, hébergées dans l&apos;Union européenne
                et sauvegardées quotidiennement. Vous pouvez les exporter à tout
                moment — elles vous appartiennent.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="section" id="demo">
        <div className="container">
          <div className="cta-panel reveal">
            <h2 className="headline">Reprenez le contrôle de votre activité</h2>
            <p>
              Voyez en 20 minutes comment Kora peut simplifier votre quotidien —
              projets, documents, facturation et rendez-vous réunis dans un seul
              espace calme.
            </p>
            <Link className="btn btn-light btn-lg" href="/register">
              Commencer gratuitement
            </Link>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a className="nav-brand" href="#">
                <img
                  src="/landing/logo.png"
                  alt="Kora"
                  style={{ height: "28px" }}
                />
                <strong>KORA</strong>
              </a>
              <p>Le partenaire de gestion des indépendants créatifs.</p>
            </div>
            <div>
              <h4>Produit</h4>
              <ul>
                <li>
                  <a href="#fonctionnalites">Fonctionnalités</a>
                </li>
                <li>
                  <a href="#tarifs">Tarifs</a>
                </li>
                <li>
                  <a href="#faq">FAQ</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Ressources</h4>
              <ul>
                <li>
                  <a href="#">Guide de démarrage</a>
                </li>
                <li>
                  <a href="#">Blog</a>
                </li>
                <li>
                  <a href="#">Support</a>
                </li>
              </ul>
            </div>
            <div>
              <h4>Légal</h4>
              <ul>
                <li>
                  <a href="#">Mentions légales</a>
                </li>
                <li>
                  <a href="#">Confidentialité</a>
                </li>
                <li>
                  <a href="#">CGV</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Kora. Tous droits réservés.</span>
            <span>Fait avec soin pour les indépendants.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
