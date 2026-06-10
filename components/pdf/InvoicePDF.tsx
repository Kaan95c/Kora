import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

// ───────────────────────── Données ─────────────────────────

export type InvoiceLine = {
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  total: number; // HT (quantité × PU)
  taxRate: number; // %
};

export type InvoiceData = {
  type: string; // INVOICE | QUOTE | ...
  number: string;
  issueDate: string;
  dueDate: string;
  company: {
    name: string;
    address: string | null;
    siret: string | null;
    vatNumber: string | null;
    logoUrl: string | null;
    email: string | null;
    phone: string | null;
  };
  client: {
    name: string;
    email: string | null;
    address: string | null;
  };
  lines: InvoiceLine[];
  subtotalHT: number;
  totalTVA: number;
  totalTTC: number;
};

const GREEN = "#52634c";
const DARK = "#1b1c1a";
const MUTED = "#444841";
const LIGHT = "#747870";
const BORDER = "#e2e0da";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: MUTED,
    paddingTop: 40,
    paddingHorizontal: 44,
    paddingBottom: 70,
  },

  // En-tête vert
  header: {
    backgroundColor: GREEN,
    borderRadius: 8,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logo: { height: 26, marginBottom: 6, objectFit: "contain" },
  studioName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 4,
  },
  studioLine: { fontSize: 8.5, color: "#ffffff", opacity: 0.85, lineHeight: 1.4 },
  headerRight: { alignItems: "flex-end" },
  docType: {
    fontFamily: "Helvetica-Bold",
    fontSize: 20,
    color: "#ffffff",
    letterSpacing: 1,
  },
  docNumber: { fontSize: 10, color: "#ffffff", opacity: 0.85, marginTop: 4 },

  // Méta + client
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  blockLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: LIGHT,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  clientName: { fontFamily: "Helvetica-Bold", fontSize: 11, color: DARK, marginBottom: 2 },
  clientLine: { fontSize: 9, color: MUTED, lineHeight: 1.4 },
  metaRight: { alignItems: "flex-end" },
  metaItem: { flexDirection: "row", marginBottom: 3 },
  metaKey: { fontSize: 9, color: LIGHT, marginRight: 8 },
  metaVal: { fontFamily: "Helvetica-Bold", fontSize: 9, color: DARK },

  // Tableau
  table: { marginTop: 26 },
  thead: {
    flexDirection: "row",
    backgroundColor: "#f2f1ec",
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  cName: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: DARK },
  cDesc: { fontSize: 8, color: LIGHT, marginTop: 2 },
  cell: { fontSize: 9, color: MUTED },

  colDesc: { width: "52%" },
  colQty: { width: "12%", textAlign: "right" },
  colUnit: { width: "18%", textAlign: "right" },
  colTotal: { width: "18%", textAlign: "right" },

  // Totaux
  totals: { marginTop: 18, flexDirection: "row", justifyContent: "flex-end" },
  totalsBox: { width: "45%" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalKey: { fontSize: 9.5, color: MUTED },
  totalVal: { fontSize: 9.5, color: DARK, fontFamily: "Helvetica-Bold" },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 8,
    paddingHorizontal: 10,
    paddingBottom: 8,
    backgroundColor: GREEN,
    borderRadius: 6,
  },
  grandKey: { fontFamily: "Helvetica-Bold", fontSize: 11, color: "#ffffff" },
  grandVal: { fontFamily: "Helvetica-Bold", fontSize: 13, color: "#ffffff" },

  // Pied de page
  footer: {
    position: "absolute",
    bottom: 28,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: LIGHT, lineHeight: 1.4, width: "75%" },
  footerBrand: { fontSize: 8, color: GREEN, fontFamily: "Helvetica-Bold" },
});

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const isQuote = data.type === "QUOTE";
  const { company, client } = data;

  return (
    <Document
      title={data.number}
      author={company.name}
      creator="Kora"
      producer="Kora"
    >
      <Page size="A4" style={styles.page}>
        {/* En-tête */}
        <View style={styles.header}>
          <View>
            {company.logoUrl ? (
              // react-pdf <Image> n'est pas une balise HTML (pas de prop alt).
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={company.logoUrl} style={styles.logo} />
            ) : null}
            <Text style={styles.studioName}>{company.name}</Text>
            {company.address ? (
              <Text style={styles.studioLine}>{company.address}</Text>
            ) : null}
            <Text style={styles.studioLine}>
              {[
                company.siret ? `SIRET ${company.siret}` : null,
                company.vatNumber ? `TVA ${company.vatNumber}` : null,
              ]
                .filter(Boolean)
                .join("  ·  ")}
            </Text>
            {(company.email || company.phone) && (
              <Text style={styles.studioLine}>
                {[company.email, company.phone].filter(Boolean).join("  ·  ")}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docType}>{isQuote ? "DEVIS" : "FACTURE"}</Text>
            <Text style={styles.docNumber}>{data.number}</Text>
          </View>
        </View>

        {/* Client + dates */}
        <View style={styles.metaRow}>
          <View>
            <Text style={styles.blockLabel}>
              {isQuote ? "Devis pour" : "Facturé à"}
            </Text>
            <Text style={styles.clientName}>{client.name}</Text>
            {client.email ? (
              <Text style={styles.clientLine}>{client.email}</Text>
            ) : null}
            {client.address ? (
              <Text style={styles.clientLine}>{client.address}</Text>
            ) : null}
          </View>
          <View style={styles.metaRight}>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>Date d&apos;émission</Text>
              <Text style={styles.metaVal}>{data.issueDate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaKey}>
                {isQuote ? "Valable jusqu'au" : "Échéance"}
              </Text>
              <Text style={styles.metaVal}>{data.dueDate}</Text>
            </View>
          </View>
        </View>

        {/* Tableau */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.th, styles.colDesc]}>Désignation</Text>
            <Text style={[styles.th, styles.colQty]}>Qté</Text>
            <Text style={[styles.th, styles.colUnit]}>PU HT</Text>
            <Text style={[styles.th, styles.colTotal]}>Total HT</Text>
          </View>

          {data.lines.map((line, i) => (
            <View style={styles.row} key={i}>
              <View style={styles.colDesc}>
                <Text style={styles.cName}>{line.name}</Text>
                {line.description ? (
                  <Text style={styles.cDesc}>{line.description}</Text>
                ) : null}
              </View>
              <Text style={[styles.cell, styles.colQty]}>{line.quantity}</Text>
              <Text style={[styles.cell, styles.colUnit]}>
                {eur(line.unitPrice)}
              </Text>
              <Text style={[styles.cell, styles.colTotal]}>
                {eur(line.total)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totaux */}
        <View style={styles.totals}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalKey}>Sous-total HT</Text>
              <Text style={styles.totalVal}>{eur(data.subtotalHT)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalKey}>TVA (20%)</Text>
              <Text style={styles.totalVal}>{eur(data.totalTVA)}</Text>
            </View>
            <View style={styles.grandRow}>
              <Text style={styles.grandKey}>Total TTC</Text>
              <Text style={styles.grandVal}>{eur(data.totalTTC)}</Text>
            </View>
          </View>
        </View>

        {/* Pied de page */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {company.name}
            {company.siret ? ` — SIRET ${company.siret}` : ""}
            {company.vatNumber ? ` — TVA ${company.vatNumber}` : ""}.
            {"\n"}
            TVA non applicable, art. 293 B du CGI le cas échéant. Paiement à
            réception. Pénalités de retard au taux légal en vigueur.
          </Text>
          <Text style={styles.footerBrand}>Généré par Kora</Text>
        </View>
      </Page>
    </Document>
  );
}

export default InvoicePDF;
