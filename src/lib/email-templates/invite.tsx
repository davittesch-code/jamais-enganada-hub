import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  confirmationUrl,
}: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu acesso à Jamais Enganada está pronto. Crie sua senha 💜</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={brand}>Jamais Enganada</Text>
        </Section>

        <Heading style={h1}>Bem-vinda! 💜</Heading>

        <Text style={text}>
          Seu pagamento foi confirmado e seu acesso à plataforma{' '}
          <strong>Jamais Enganada</strong> está liberado.
        </Text>

        <Text style={text}>
          Clique no botão abaixo para criar sua senha e começar sua jornada
          de autocuidado jurídico:
        </Text>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Criar minha senha →
          </Button>
        </Section>

        <Text style={textSmall}>
          Você terá acesso por <strong>1 ano</strong> a:
        </Text>
        <Text style={list}>
          ✓ Perfil jurídico completo e personalizado<br />
          ✓ Até 17 consultas com nossa IA<br />
          ✓ Plano de ação prático para você<br />
          ✓ Contato direto com uma advogada parceira
        </Text>

        <Hr style={hr} />

        <Text style={footer}>
          Se você não esperava este email, pode ignorá-lo com segurança.
          <br /><br />
          Conhecimento é proteção. 💜<br />
          Equipe Jamais Enganada
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
}
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const header = {
  background: 'linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)',
  borderRadius: '12px',
  padding: '24px',
  textAlign: 'center' as const,
  marginBottom: '24px',
}
const brand = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 600,
  margin: 0,
  letterSpacing: '-0.5px',
}
const h1 = {
  fontSize: '26px',
  fontWeight: 600,
  color: '#6B0F4B',
  margin: '8px 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#374151',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const textSmall = {
  fontSize: '14px',
  color: '#6B7280',
  margin: '24px 0 8px',
}
const list = {
  fontSize: '14px',
  color: '#374151',
  lineHeight: '1.9',
  background: '#FDF6F9',
  padding: '14px 18px',
  borderRadius: '10px',
  margin: '0 0 8px',
}
const button = {
  backgroundColor: '#A8006E',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 600,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#F3E8EF', margin: '32px 0 20px' }
const footer = {
  fontSize: '12px',
  color: '#9CA3AF',
  lineHeight: '1.6',
  textAlign: 'center' as const,
  margin: 0,
}
