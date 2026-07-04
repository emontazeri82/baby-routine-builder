import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type ReminderEmailProps = {
  babyName: string;
  reminderTitle: string;
  scheduledFor: string;
  actionUrl: string;
};

export function ReminderEmail({
  babyName,
  reminderTitle,
  scheduledFor,
  actionUrl,
}: ReminderEmailProps) {
  return (
    <Html>
      <Head />

      <Preview>
        Reminder: {reminderTitle}
      </Preview>

      <Body
        style={{
          backgroundColor: "#f8fafc",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            padding: 32,
            borderRadius: 12,
          }}
        >
          <Heading>
            🍼 Baby Routine Builder
          </Heading>

          <Text>
            It&apos;s time for:
          </Text>

          <Section>
            <Heading
              as="h2"
              style={{ fontSize: 24 }}
            >
              {reminderTitle}
            </Heading>

            <Text>
              Baby: {babyName}
            </Text>

            <Text>
              Scheduled: {scheduledFor}
            </Text>
          </Section>

          <Button
            href={actionUrl}
            style={{
              backgroundColor: "#6366f1",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 8,
            }}
          >
            Open Baby Routine Builder
          </Button>
        </Container>
      </Body>
    </Html>
  );
}