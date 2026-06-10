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

export type InvoiceEmailProps = {
  studioName: string;
  clientName: string;
  invoiceNumber: string;
  amount: string; // déjà formaté, ex. "2 940,00 €"
  payUrl: string;
};

export function InvoiceEmail({
  studioName,
  clientName,
  invoiceNumber,
  amount,
  payUrl,
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`${studioName} — invoice ${invoiceNumber} (${amount})`}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>{studioName}</Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>Your invoice is ready</Heading>
            <Text style={text}>
              Hi {clientName}, {studioName} has sent you invoice{" "}
              <strong>{invoiceNumber}</strong>. You can pay it securely online in
              a couple of clicks.
            </Text>

            <Section style={amountBox}>
              <Text style={amountLabel}>Amount due</Text>
              <Text style={amountValue}>{amount}</Text>
            </Section>

            <Button style={button} href={payUrl}>
              Pay invoice
            </Button>

            <Text style={muted}>
              Or copy this link into your browser:
              <br />
              {payUrl}
            </Text>
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

export default InvoiceEmail;

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
const brand = {
  fontSize: "18px",
  fontWeight: 700,
  color: "#1b1c1a",
  margin: 0,
};
const card = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "32px",
  border: "1px solid #eceae4",
};
const h1 = { fontSize: "22px", fontWeight: 700, color: "#1b1c1a", margin: "0 0 12px" };
const text = { fontSize: "14px", lineHeight: "22px", color: "#444841", margin: "0 0 20px" };
const amountBox = {
  backgroundColor: "#f5f3f0",
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "0 0 24px",
};
const amountLabel = {
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  color: "#747870",
  margin: "0 0 4px",
};
const amountValue = { fontSize: "28px", fontWeight: 700, color: "#1b1c1a", margin: 0 };
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
const muted = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#747870",
  margin: "20px 0 0",
  wordBreak: "break-all" as const,
};
const hr = { borderColor: "#eceae4", margin: "24px 0 12px" };
const footer = { fontSize: "12px", color: "#747870", textAlign: "center" as const, margin: 0 };
