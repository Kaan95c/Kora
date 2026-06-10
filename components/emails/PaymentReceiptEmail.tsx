import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
} from "@react-email/components";

export type PaymentReceiptEmailProps = {
  studioName: string;
  clientName: string;
  invoiceNumber: string;
  amount: string; // déjà formaté
  invoiceUrl: string; // lien de téléchargement du PDF
};

export function PaymentReceiptEmail({
  studioName,
  clientName,
  invoiceNumber,
  amount,
  invoiceUrl,
}: PaymentReceiptEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Payment received — invoice ${invoiceNumber}`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{studioName}</Text>
          </Section>

          <Section style={card}>
            <Section style={checkWrap}>
              <Text style={check}>✓</Text>
            </Section>
            <Heading style={h1}>Payment received</Heading>
            <Text style={text}>
              Thank you {clientName}! We&apos;ve received your payment of{" "}
              <strong>{amount}</strong> for invoice{" "}
              <strong>{invoiceNumber}</strong>. A copy of your paid invoice is
              available below.
            </Text>

            <Button style={button} href={invoiceUrl}>
              Download invoice
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Sent by {studioName} · Powered by Kora
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PaymentReceiptEmail;

// ───────────────────────── Styles ─────────────────────────

const body = {
  backgroundColor: "#fbf9f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};
const container = { maxWidth: "480px", margin: "0 auto", padding: "0 16px" };
const header = { padding: "8px 0 16px" };
const brand = { fontSize: "18px", fontWeight: 700, color: "#1b1c1a", margin: 0 };
const card = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "32px",
  border: "1px solid #eceae4",
  textAlign: "center" as const,
};
const checkWrap = { margin: "0 0 16px" };
const check = {
  display: "inline-block",
  width: "48px",
  height: "48px",
  lineHeight: "48px",
  borderRadius: "24px",
  backgroundColor: "#d5e8cb",
  color: "#3b4b36",
  fontSize: "24px",
  fontWeight: 700,
  margin: 0,
};
const h1 = { fontSize: "22px", fontWeight: 700, color: "#1b1c1a", margin: "0 0 12px" };
const text = { fontSize: "14px", lineHeight: "22px", color: "#444841", margin: "0 0 24px" };
const button = {
  backgroundColor: "#52634c",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "13px 0",
};
const hr = { borderColor: "#eceae4", margin: "24px 0 12px" };
const footer = { fontSize: "12px", color: "#747870", textAlign: "center" as const, margin: 0 };
