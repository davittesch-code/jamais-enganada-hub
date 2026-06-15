import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Advogada } from "@/routes/admin.advogados";

interface Props {
  advogada: Advogada | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AdvogadaModal({ advogada, onClose, onSaved }: Props) {
  const [nome, setNome] = useState("");
  const [oab, setOab] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (advogada) {
      setNome(advogada.nome);
      setOab(advogada.oab);
      setWhatsapp(advogada.whatsapp);
      setEspecialidade(advogada.especialidade ?? "");
      setAtivo(advogada.ativo);
    } else {
      setNome("");
      setOab("");
      setWhatsapp("");
      setEspecialidade("");
      setAtivo(true);
    }
  }, [advogada]);

  const salvar = async () => {
    if (!nome.trim() || !oab.trim() || !whatsapp.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const wsClean = whatsapp.replace(/\D/g, "");
    if (wsClean.length < 10 || wsClean.length > 13) {
      toast.error("WhatsApp inválido (10-13 dígitos)");
      return;
    }

    setSalvando(true);
    const payload = {
      nome: nome.trim(),
      oab: oab.trim(),
      whatsapp: wsClean,
      especialidade: especialidade.trim() || null,
      ativo,
    };
    const { error } = advogada
      ? await supabase.from("advogados").update(payload).eq("id", advogada.id)
      : await supabase.from("advogados").insert(payload);
    setSalvando(false);

    if (error) {
      toast.error(`Falha: ${error.message}`);
      return;
    }
    toast.success(advogada ? "Advogada atualizada" : "Advogada cadastrada");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-[480px] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-[#1A0010]">
            {advogada ? "Editar advogada" : "Cadastrar advogada"}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1A0010] mb-1">
              Nome completo *
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A0010] mb-1">
              OAB *
            </label>
            <input
              value={oab}
              onChange={(e) => setOab(e.target.value)}
              placeholder="ex: SP 123.456"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Número de registro na OAB</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A0010] mb-1">
              WhatsApp *
            </label>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="ex: 5511999990000"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este número será exibido na assessoria das clientes vinculadas
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A0010] mb-1">
              Especialidade
            </label>
            <input
              value={especialidade}
              onChange={(e) => setEspecialidade(e.target.value)}
              placeholder="Ex: Direito de Família e da Mulher"
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            <span>Ativa</span>
          </label>
        </div>

        <div className="px-5 py-4 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
          >
            Cancelar
          </button>
          <button
            onClick={() => void salvar()}
            disabled={salvando}
            className="px-4 py-2 text-sm bg-[#A8006E] text-white rounded-md hover:opacity-90 disabled:opacity-40"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}
