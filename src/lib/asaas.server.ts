// Server-only Asaas helpers. NEVER import from client code.
// Asaas docs: https://docs.asaas.com/

export type AsaasBillingType = "PIX" | "CREDIT_CARD" | "BOLETO" | "UNDEFINED";

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
  mobilePhone?: string;
}

export interface AsaasPayment {
  id: string;
  status:
    | "PENDING"
    | "RECEIVED"
    | "CONFIRMED"
    | "OVERDUE"
    | "REFUNDED"
    | "RECEIVED_IN_CASH"
    | "REFUND_REQUESTED"
    | "REFUND_IN_PROGRESS"
    | "CHARGEBACK_REQUESTED"
    | "CHARGEBACK_DISPUTE"
    | "AWAITING_CHARGEBACK_REVERSAL"
    | "DUNNING_REQUESTED"
    | "DUNNING_RECEIVED"
    | "AWAITING_RISK_ANALYSIS";
  value: number;
  netValue?: number;
  billingType: AsaasBillingType;
  invoiceUrl?: string;
  dueDate: string;
  customer: string;
  externalReference?: string;
  installmentCount?: number;
}

export interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

export const PRECOS = {
  acesso: 97.9,
  recarga: 29.9,
} as const;

export type TipoProduto = keyof typeof PRECOS;

function normalizeExternalReference(reference: string): TipoProduto {
  if (reference === "acesso" || reference === "recarga") return reference;

  try {
    const parsed = JSON.parse(reference);
    const candidate = Array.isArray(parsed) ? parsed[0] : parsed;
    const tipo = candidate?.tipo_produto ?? candidate?.tipoProduto;
    if (tipo === "acesso" || tipo === "recarga") return tipo;
  } catch {
    // Se não for JSON, cai no erro explícito abaixo.
  }

  throw new Error("externalReference inválido para cobrança Asaas");
}

function getEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`${key} não configurado`);
  return v;
}

function apiUrl(): string {
  return (process.env.ASAAS_API_URL ?? "https://sandbox.asaas.com/api/v3").replace(/\/$/, "");
}

function apiKey(): string {
  return getEnv("ASAAS_API_KEY");
}

async function asaasRequest<T = any>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${apiUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey(),
      "User-Agent": "JamaisEnganada/1.0",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.description ??
      json?.message ??
      `Asaas ${res.status}`;
    const err = new Error(msg);
    (err as any).status = res.status;
    (err as any).asaas = json;
    throw err;
  }
  return json as T;
}

/** Find by CPF/email, or create new customer in Asaas. */
export async function findOrCreateCustomer(input: {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone?: string;
}): Promise<AsaasCustomer> {
  // Try by CPF
  const search = await asaasRequest<{ data: AsaasCustomer[] }>(
    `/customers?cpfCnpj=${encodeURIComponent(input.cpfCnpj.replace(/\D/g, ""))}`,
  );
  if (search.data?.length) return search.data[0];

  const created = await asaasRequest<AsaasCustomer>(`/customers`, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      cpfCnpj: input.cpfCnpj.replace(/\D/g, ""),
      mobilePhone: input.mobilePhone?.replace(/\D/g, ""),
      notificationDisabled: false,
    }),
  });
  return created;
}

export interface CreatePixPaymentInput {
  customerId: string;
  value: number;
  description: string;
  externalReference: TipoProduto;
}

export async function createPixPayment(input: CreatePixPaymentInput): Promise<AsaasPayment> {
  const today = new Date().toISOString().slice(0, 10);
  return asaasRequest<AsaasPayment>(`/payments`, {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: "PIX",
      value: input.value,
      dueDate: today,
      description: input.description,
      externalReference: normalizeExternalReference(input.externalReference),
    }),
  });
}

export async function getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
  return asaasRequest<AsaasPixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

export interface CreateCardPaymentInput {
  customerId: string;
  value: number;
  installmentCount: number;
  description: string;
  externalReference: TipoProduto;
  card: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  holder: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    phone: string;
  };
  remoteIp: string;
}

export async function createCardPayment(input: CreateCardPaymentInput): Promise<AsaasPayment> {
  const today = new Date().toISOString().slice(0, 10);
  const parcelas = Math.max(1, Math.min(3, input.installmentCount));
  const valorParcela = Math.round((input.value / parcelas) * 100) / 100;

  const body: any = {
    customer: input.customerId,
    billingType: "CREDIT_CARD",
    value: input.value,
    dueDate: today,
    description: input.description,
    externalReference: normalizeExternalReference(input.externalReference),
    creditCard: {
      holderName: input.card.holderName,
      number: input.card.number.replace(/\s/g, ""),
      expiryMonth: input.card.expiryMonth.padStart(2, "0"),
      expiryYear:
        input.card.expiryYear.length === 2 ? `20${input.card.expiryYear}` : input.card.expiryYear,
      ccv: input.card.ccv,
    },
    creditCardHolderInfo: {
      name: input.holder.name,
      email: input.holder.email,
      cpfCnpj: input.holder.cpfCnpj.replace(/\D/g, ""),
      postalCode: input.holder.postalCode.replace(/\D/g, ""),
      addressNumber: input.holder.addressNumber,
      phone: input.holder.phone.replace(/\D/g, ""),
    },
    remoteIp: input.remoteIp,
  };

  if (parcelas > 1) {
    body.installmentCount = parcelas;
    body.installmentValue = valorParcela;
  }

  return asaasRequest<AsaasPayment>(`/payments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getPayment(paymentId: string): Promise<AsaasPayment> {
  return asaasRequest<AsaasPayment>(`/payments/${paymentId}`);
}

