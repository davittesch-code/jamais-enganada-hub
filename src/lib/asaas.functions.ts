// Server functions for Asaas payments (called from the browser).
// Card data goes straight to Asaas via this handler — never persisted, never logged.
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

const baseSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  cpf: z.string().trim().min(11).max(20),
  telefone: z.string().trim().min(10).max(20),
  tipo_produto: z.enum(["acesso", "recarga"]),
  advogada_id: z.string().uuid().nullish(),
});

const pixSchema = baseSchema.extend({
  formaPagamento: z.literal("PIX"),
});

const cardSchema = baseSchema.extend({
  formaPagamento: z.literal("CREDIT_CARD"),
  parcelas: z.number().int().min(1).max(3),
  cartao: z.object({
    holderName: z.string().trim().min(2).max(120),
    number: z.string().trim().min(13).max(25),
    expiryMonth: z.string().trim().min(1).max(2),
    expiryYear: z.string().trim().min(2).max(4),
    ccv: z.string().trim().min(3).max(4),
  }),
  endereco: z.object({
    cep: z.string().trim().min(8).max(10),
    numero: z.string().trim().min(1).max(20),
  }),
});

const criarCobrancaSchema = z.discriminatedUnion("formaPagamento", [pixSchema, cardSchema]);

export const criarCobranca = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => criarCobrancaSchema.parse(input))
  .handler(async ({ data }) => {
    const {
      findOrCreateCustomer,
      createPixPayment,
      createCardPayment,
      getPixQrCode,
      PRECOS,
    } = await import("./asaas.server");

    const customer = await findOrCreateCustomer({
      name: data.nome,
      email: data.email,
      cpfCnpj: data.cpf,
      mobilePhone: data.telefone,
    });

    const valor = PRECOS[data.tipo_produto];
    const description =
      data.tipo_produto === "acesso"
        ? "Acesso Jamais Enganada — 1 ano"
        : "Recarga Jamais Enganada — +10 consultas, +1 perfil";

    // externalReference do Asaas tem limite de 100 chars; usamos apenas o
    // tipo do produto e guardamos os dados completos em cadastros_pendentes.
    const externalReference = data.tipo_produto;

    async function salvarCadastroPendente(asaasPaymentId: string) {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      await supabaseAdmin.from("cadastros_pendentes" as any).upsert(
        {
          asaas_payment_id: asaasPaymentId,
          nome: data.nome,
          email: data.email,
          cpf: data.cpf.replace(/\D/g, ""),
          telefone: data.telefone.replace(/\D/g, ""),
          advogada_id: data.advogada_id ?? null,
          tipo_produto: data.tipo_produto,
          processado: false,
        },
        { onConflict: "asaas_payment_id" },
      );
    }

    if (data.formaPagamento === "PIX") {
      const payment = await createPixPayment({
        customerId: customer.id,
        value: valor,
        description,
        externalReference,
      });
      await salvarCadastroPendente(payment.id);
      const qr = await getPixQrCode(payment.id);
      return {
        kind: "pix" as const,
        paymentId: payment.id,
        status: payment.status,
        valor,
        pix: {
          payload: qr.payload,
          encodedImage: qr.encodedImage,
          expirationDate: qr.expirationDate,
        },
      };
    }

    let remoteIp = "127.0.0.1";
    try {
      remoteIp = getRequestIP({ xForwardedFor: true }) ?? "127.0.0.1";
    } catch {
      /* ignore */
    }

    const payment = await createCardPayment({
      customerId: customer.id,
      value: valor,
      installmentCount: data.parcelas,
      description,
      externalReference,
      card: data.cartao,
      holder: {
        name: data.nome,
        email: data.email,
        cpfCnpj: data.cpf,
        postalCode: data.endereco.cep,
        addressNumber: data.endereco.numero,
        phone: data.telefone,
      },
      remoteIp,
    });
    await salvarCadastroPendente(payment.id);

    return {
      kind: "card" as const,
      paymentId: payment.id,
      status: payment.status,
      valor,
      parcelas: data.parcelas,
    };
  });

export const verificarStatusPagamento = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ paymentId: z.string().min(3) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getPayment } = await import("./asaas.server");
    const p = await getPayment(data.paymentId);
    return { status: p.status, value: p.value };
  });
