import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, Loader2, QrCode, CreditCard, Lock } from "lucide-react";
import { criarCobranca, verificarStatusPagamento } from "@/lib/asaas.functions";

type Forma = "PIX" | "CREDIT_CARD";

export interface DadosCliente {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  advogada_id?: string | null;
}

interface Props {
  tipo: "acesso" | "recarga";
  dados: DadosCliente;
  onConfirmado: () => void;
  /** Texto opcional para o botão. */
  ctaLabel?: string;
}

const VALOR_ACESSO = 97.9;
const VALOR_RECARGA = 29.9;

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

function maskCard(v: string) {
  return onlyDigits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}
function maskExpiry(v: string) {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}
function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function AsaasPaymentForm({ tipo, dados, onConfirmado, ctaLabel }: Props) {
  const valor = tipo === "acesso" ? VALOR_ACESSO : VALOR_RECARGA;
  const [forma, setForma] = useState<Forma>("PIX");
  const [parcelas, setParcelas] = useState(1);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [pix, setPix] = useState<{ paymentId: string; payload: string; image: string } | null>(
    null,
  );
  const [copiado, setCopiado] = useState(false);

  // Cartão
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCcv, setCardCcv] = useState("");
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");

  const criar = useServerFn(criarCobranca);
  const verificar = useServerFn(verificarStatusPagamento);
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
    };
  }, []);

  const iniciarPolling = (paymentId: string) => {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = window.setInterval(async () => {
      try {
        const s = await verificar({ data: { paymentId } });
        if (s.status === "CONFIRMED" || s.status === "RECEIVED") {
          if (pollingRef.current) window.clearInterval(pollingRef.current);
          onConfirmado();
        }
      } catch {
        /* ignore */
      }
    }, 5000);
  };

  const gerarPix = async () => {
    setErro(null);
    setLoading(true);
    try {
      const r = await criar({
        data: {
          ...dados,
          tipo_produto: tipo,
          formaPagamento: "PIX",
        },
      });
      if (r.kind === "pix") {
        setPix({
          paymentId: r.paymentId,
          payload: r.pix.payload,
          image: r.pix.encodedImage,
        });
        iniciarPolling(r.paymentId);
      }
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível gerar o Pix.");
    } finally {
      setLoading(false);
    }
  };

  const pagarCartao = async () => {
    setErro(null);
    if (cardNumber.replace(/\s/g, "").length < 13) return setErro("Número de cartão inválido.");
    if (!cardName.trim()) return setErro("Informe o nome impresso no cartão.");
    const [mm, yy] = cardExpiry.split("/");
    if (!mm || !yy || mm.length !== 2 || yy.length !== 2)
      return setErro("Validade do cartão inválida (MM/AA).");
    if (cardCcv.length < 3) return setErro("CVV inválido.");
    if (onlyDigits(cep).length !== 8) return setErro("CEP inválido.");
    if (!numero.trim()) return setErro("Informe o número do endereço.");

    setLoading(true);
    try {
      const r = await criar({
        data: {
          ...dados,
          tipo_produto: tipo,
          formaPagamento: "CREDIT_CARD",
          parcelas,
          cartao: {
            holderName: cardName.trim(),
            number: cardNumber.replace(/\s/g, ""),
            expiryMonth: mm,
            expiryYear: yy,
            ccv: cardCcv,
          },
          endereco: { cep, numero: numero.trim() },
        },
      });
      if (r.kind === "card") {
        if (r.status === "CONFIRMED" || r.status === "RECEIVED") {
          onConfirmado();
        } else {
          iniciarPolling(r.paymentId);
        }
      }
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível processar o cartão.");
    } finally {
      setLoading(false);
    }
  };

  const copiar = async () => {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.payload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* ignore */
    }
  };

  // Pix gerado: mostrar QR + copia-e-cola
  if (pix) {
    return (
      <div className="rounded-xl border border-[#A8006E]/20 bg-white p-6 text-center">
        <QrCode className="mx-auto w-7 h-7 text-[#A8006E] mb-3" />
        <h3 className="font-display text-xl font-semibold text-[#6B0F4B]">
          Escaneie o QR Code para pagar
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {formatBRL(valor)} via Pix · confirmação em segundos
        </p>

        <div className="mt-5 flex justify-center">
          <img
            src={`data:image/png;base64,${pix.image}`}
            alt="QR Code Pix"
            className="w-56 h-56 rounded-lg border border-gray-100"
          />
        </div>

        <div className="mt-5 text-left">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Ou copie o código Pix
          </label>
          <div className="flex gap-2">
            <input
              readOnly
              value={pix.payload}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-200 bg-gray-50 truncate"
            />
            <button
              onClick={copiar}
              className="px-3 py-2 rounded-lg bg-[#A8006E] text-white text-sm font-medium hover:opacity-90 flex items-center gap-1"
            >
              {copiado ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-5 leading-relaxed">
          Aguardando confirmação do pagamento…
          <br />
          Assim que confirmar, você receberá um email para criar sua senha. 💜
        </p>
        <Loader2 className="mx-auto mt-3 w-5 h-5 text-[#A8006E] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seletor */}
      <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => setForma("PIX")}
          className={`py-2 rounded-md text-sm font-semibold transition ${
            forma === "PIX" ? "bg-white text-[#6B0F4B] shadow" : "text-gray-600"
          }`}
        >
          Pix à vista
        </button>
        <button
          type="button"
          onClick={() => setForma("CREDIT_CARD")}
          className={`py-2 rounded-md text-sm font-semibold transition ${
            forma === "CREDIT_CARD" ? "bg-white text-[#6B0F4B] shadow" : "text-gray-600"
          }`}
        >
          Cartão de crédito
        </button>
      </div>

      {forma === "PIX" ? (
        <div className="rounded-lg bg-[#FDF6F9] p-4 text-sm text-gray-700">
          <p>
            <strong>{formatBRL(valor)}</strong> à vista no Pix — confirmação imediata.
          </p>
          <button
            type="button"
            onClick={gerarPix}
            disabled={loading}
            className="mt-4 w-full text-white font-semibold py-3.5 rounded-lg hover:opacity-90 transition disabled:opacity-50"
            style={{ backgroundColor: "#A8006E" }}
          >
            {loading ? "Gerando Pix…" : ctaLabel ?? "Gerar Pix"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Parcelas */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Em quantas vezes?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((n) => {
                const v = valor / n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setParcelas(n)}
                    className={`py-2 px-2 rounded-md text-xs font-medium border transition ${
                      parcelas === n
                        ? "border-[#A8006E] bg-[#FDF6F9] text-[#6B0F4B]"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {n === 1 ? "À vista" : `${n}x`}
                    <div className="font-semibold mt-0.5">{formatBRL(v)}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cartão */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Número do cartão
            </label>
            <input
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(maskCard(e.target.value))}
              placeholder="0000 0000 0000 0000"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nome no cartão</label>
            <input
              value={cardName}
              onChange={(e) => setCardName(e.target.value.toUpperCase())}
              placeholder="COMO IMPRESSO NO CARTÃO"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Validade (MM/AA)
              </label>
              <input
                inputMode="numeric"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(maskExpiry(e.target.value))}
                placeholder="MM/AA"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">CVV</label>
              <input
                inputMode="numeric"
                value={cardCcv}
                onChange={(e) => setCardCcv(onlyDigits(e.target.value).slice(0, 4))}
                placeholder="123"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">CEP</label>
              <input
                inputMode="numeric"
                value={cep}
                onChange={(e) => setCep(maskCEP(e.target.value))}
                placeholder="00000-000"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Número</label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="123"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#A8006E]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={pagarCartao}
            disabled={loading}
            className="mt-2 w-full text-white font-semibold py-3.5 rounded-lg hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: "#A8006E" }}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Processando…
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                {ctaLabel ?? "Pagar e criar minha conta"}
              </>
            )}
          </button>
          <p className="text-[11px] text-gray-500 flex items-center gap-1 justify-center">
            <Lock className="w-3 h-3" /> Pagamento seguro processado pelo Asaas
          </p>
        </div>
      )}

      {erro && (
        <div className="text-sm text-red-700 bg-red-50 px-3 py-2 rounded-md">{erro}</div>
      )}
    </div>
  );
}

export const VALORES = { acesso: VALOR_ACESSO, recarga: VALOR_RECARGA };
