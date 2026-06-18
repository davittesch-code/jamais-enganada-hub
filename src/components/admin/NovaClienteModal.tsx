import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { criarClienteAdmin } from "@/lib/admin-users.functions";

interface Advogada {
  id: string;
  nome: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function gerarSenha(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function NovaClienteModal({ open, onClose, onCreated }: Props) {
  const criar = useServerFn(criarClienteAdmin);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState(gerarSenha());
  const [advogadoId, setAdvogadoId] = useState<string>("");
  const [ativo, setAtivo] = useState(true);
  const [advogadas, setAdvogadas] = useState<Advogada[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [credenciais, setCredenciais] = useState<{ email: string; senha: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome("");
    setEmail("");
    setSenha(gerarSenha());
    setAdvogadoId("");
    setAtivo(true);
    setCredenciais(null);
    (async () => {
      const { data } = await supabase.from("advogados").select("id, nome").eq("ativo", true).order("nome");
      setAdvogadas((data ?? []) as Advogada[]);
    })();
  }, [open]);

  if (!open) return null;

  const podeSalvar = nome.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && senha.length >= 6 && !salvando;

  const handleSalvar = async () => {
    setSalvando(true);
    const r = await criar({
      data: {
        email: email.trim().toLowerCase(),
        password: senha,
        full_name: nome.trim(),
        advogado_id: advogadoId || null,
        ativo,
      },
    });
    setSalvando(false);
    if (!r.ok) {
      toast.error(r.error ?? "Falha ao cadastrar");
      return;
    }
    toast.success("Cliente cadastrada! Ela já pode fazer login.");
    setCredenciais({ email: email.trim().toLowerCase(), senha });
    onCreated();
  };

  const copiarCreds = async () => {
    if (!credenciais) return;
    await navigator.clipboard.writeText(
      `Email: ${credenciais.email}\nSenha: ${credenciais.senha}\nAcesse em: https://jamaisenganada.com.br`,
    );
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#1A0010]">
            {credenciais ? "Cliente cadastrada 💜" : "Cadastrar cliente"}
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {credenciais ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Envie essas credenciais para a cliente. Ela pode trocar a senha depois.
            </p>
            <div className="bg-[#FDF6F9] border border-[#A8006E]/30 rounded-md p-3 font-mono text-sm space-y-1">
              <div><span className="text-gray-500">Email:</span> {credenciais.email}</div>
              <div><span className="text-gray-500">Senha:</span> {credenciais.senha}</div>
            </div>
            <button
              onClick={() => void copiarCreds()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#A8006E] text-white rounded-md text-sm hover:opacity-90"
            >
              {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiado ? "Copiado" : "Copiar credenciais"}
            </button>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#1A0010] mb-1">Nome completo*</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1A0010] mb-1">Email*</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1A0010] mb-1">Senha temporária*</label>
              <div className="flex gap-2">
                <input
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="flex-1 border rounded-md px-3 py-2 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setSenha(gerarSenha())}
                  className="p-2 border rounded-md hover:bg-gray-50"
                  title="Gerar nova senha"
                >
                  <RefreshCw className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#1A0010] mb-1">Advogada vinculada</label>
              <select
                value={advogadoId}
                onChange={(e) => setAdvogadoId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">— Sem vínculo —</option>
                {advogadas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-[#1A0010] cursor-pointer">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="rounded"
              />
              Conta já ativa (sem pagamento)
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleSalvar()}
                disabled={!podeSalvar}
                className="px-4 py-2 text-sm bg-[#A8006E] text-white rounded-md hover:opacity-90 disabled:opacity-40"
              >
                {salvando ? "Salvando..." : "Cadastrar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
