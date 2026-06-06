import { useState } from "react";
import type { AdvogadaOpt } from "./useOnboarding";

interface Props {
  advogadas: AdvogadaOpt[];
  onSubmit: (advogada: AdvogadaOpt | null) => void;
}

export function AdvogadaPicker({ advogadas, onSubmit }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = advogadas.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="my-4 animate-in fade-in duration-300">
      {advogadas.length === 0 ? (
        <p className="text-sm text-center text-gray-500 py-4">
          Nenhuma advogada cadastrada no momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {advogadas.map((a) => {
            const sel = a.id === selectedId;
            const inicial = (a.nome.trim()[0] || "A").toUpperCase();
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => setSelectedId(a.id)}
                className="text-left rounded-xl p-3 transition-all bg-white"
                style={{
                  border: `2px solid ${sel ? "#552736" : "#E8D0E0"}`,
                  background: sel ? "#FDF6F9" : "#FFFFFF",
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
                    style={{ background: "#6B0F4B" }}
                  >
                    {inicial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm text-[#1A0010] truncate">
                      {a.nome}
                    </p>
                    <p className="text-xs text-gray-400">{a.oab}</p>
                    {a.especialidade && (
                      <p className="text-xs text-gray-500 truncate">
                        {a.especialidade}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-5">
        <button
          type="button"
          onClick={() => onSubmit(null)}
          className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          Continuar sem advogada
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onSubmit(selected)}
          className="px-6 py-2.5 rounded-full text-sm font-medium text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#552736" }}
        >
          Confirmar seleção
        </button>
      </div>
    </div>
  );
}
