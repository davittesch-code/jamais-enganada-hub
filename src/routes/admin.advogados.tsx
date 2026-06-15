import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdvogadaModal } from "@/components/admin/AdvogadaModal";

export const Route = createFileRoute("/admin/advogados")({
  component: AdminAdvogados,
});

export interface Advogada {
  id: string;
  nome: string;
  oab: string;
  whatsapp: string;
  especialidade: string | null;
  ativo: boolean;
}

function AdminAdvogados() {
  const [lista, setLista] = useState<Advogada[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ aberta: boolean; advogada: Advogada | null }>({
    aberta: false,
    advogada: null,
  });

  const carregar = async () => {
    setLoading(true);
    const { data: advs } = await supabase
      .from("advogados")
      .select("id, nome, oab, whatsapp, especialidade, ativo")
      .order("nome");
    const advList = (advs ?? []) as Advogada[];
    setLista(advList);

    const { data: profs } = await supabase
      .from("profiles")
      .select("advogado_id")
      .not("advogado_id", "is", null);
    const map: Record<string, number> = {};
    (profs ?? []).forEach((p: { advogado_id: string | null }) => {
      if (p.advogado_id) map[p.advogado_id] = (map[p.advogado_id] ?? 0) + 1;
    });
    setCounts(map);
    setLoading(false);
  };

  useEffect(() => {
    void carregar();
  }, []);

  const desativar = async (adv: Advogada) => {
    const { error } = await supabase
      .from("advogados")
      .update({ ativo: !adv.ativo })
      .eq("id", adv.id);
    if (error) {
      toast.error("Falha ao alterar status");
      return;
    }
    toast.success(adv.ativo ? "Advogada desativada" : "Advogada ativada");
    void carregar();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header
        className="px-10 py-6 text-white flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #6B0F4B 0%, #A8006E 100%)" }}
      >
        <div>
          <h1 className="text-[22px] font-bold">Advogadas</h1>
          <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
            {lista.length} cadastradas
          </p>
        </div>
        <button
          onClick={() => setModal({ aberta: true, advogada: null })}
          className="flex items-center gap-2 px-4 py-2 bg-white text-[#A8006E] rounded-md font-medium text-sm hover:bg-white/90"
        >
          <Plus className="w-4 h-4" /> Cadastrar advogada
        </button>
      </header>

      <div className="p-6 lg:p-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-[180px] bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
            <p className="mb-4">Nenhuma advogada cadastrada ainda.</p>
            <button
              onClick={() => setModal({ aberta: true, advogada: null })}
              className="px-4 py-2 bg-[#A8006E] text-white rounded-md text-sm hover:opacity-90"
            >
              Cadastrar primeira advogada
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {lista.map((a) => (
              <div key={a.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#6B0F4B] text-white flex items-center justify-center text-xl font-bold shrink-0">
                    {a.nome[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-[18px] text-[#1A0010] truncate">
                        {a.nome}
                      </h3>
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={
                          a.ativo
                            ? { background: "#DCFCE7", color: "#16A34A" }
                            : { background: "#F3F4F6", color: "#6B7280" }
                        }
                      >
                        ● {a.ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">OAB: {a.oab}</p>
                    {a.especialidade && (
                      <p className="text-xs text-gray-400 mt-0.5">{a.especialidade}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> {a.whatsapp}
                    </p>
                    <p className="text-xs text-[#A8006E] mt-2 font-medium">
                      {counts[a.id] ?? 0} cliente(s) vinculada(s)
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={() => setModal({ aberta: true, advogada: a })}
                    className="flex-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => void desativar(a)}
                    className="px-3 py-1.5 text-sm rounded-md hover:bg-red-50 text-red-600"
                  >
                    {a.ativo ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal.aberta && (
        <AdvogadaModal
          advogada={modal.advogada}
          onClose={() => setModal({ aberta: false, advogada: null })}
          onSaved={() => {
            setModal({ aberta: false, advogada: null });
            void carregar();
          }}
        />
      )}
    </div>
  );
}
