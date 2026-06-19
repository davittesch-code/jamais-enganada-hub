import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, TrendingUp, ShoppingBag, RotateCw } from "lucide-react";

export const Route = createFileRoute("/admin/pagamentos")({
  component: AdminPagamentosPage,
});

type Pagamento = {
  id: string;
  email: string;
  produto: string;
  valor: number;
  status: string;
  asaas_payment_id: string | null;
  paddle_transaction_id: string | null;
  forma_pagamento: string | null;
  parcelas: number | null;
  created_at: string;
  environment: string;
};

type Stats = {
  total_recebido: number;
  total_acessos: number;
  total_recargas: number;
  total_geral: number;
};

function formaLabel(p: Pagamento) {
  if (!p.forma_pagamento) return p.paddle_transaction_id ? "Paddle (legado)" : "—";
  if (p.forma_pagamento === "PIX") return "Pix";
  if (p.forma_pagamento === "CREDIT_CARD")
    return p.parcelas && p.parcelas > 1 ? `Cartão ${p.parcelas}x` : "Cartão à vista";
  return p.forma_pagamento;
}

function AdminPagamentosPage() {
  const [rows, setRows] = useState<Pagamento[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [{ data: pagamentos }, { data: s }] = await Promise.all([
        supabase
          .from("pagamentos")
          .select(
            "id,email,produto,valor,status,asaas_payment_id,paddle_transaction_id,forma_pagamento,parcelas,created_at,environment",
          )
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.rpc("get_pagamentos_stats"),
      ]);
      setRows((pagamentos as Pagamento[]) ?? []);
      setStats((s as Stats) ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-[#6B0F4B]">Pagamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Histórico de transações via Asaas (Pix e cartão).
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Total recebido" value={stats ? `R$ ${Number(stats.total_recebido).toFixed(2)}` : "—"} />
        <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Acessos vendidos" value={stats ? String(stats.total_acessos) : "—"} />
        <StatCard icon={<RotateCw className="w-5 h-5" />} label="Recargas" value={stats ? String(stats.total_recargas) : "—"} />
        <StatCard icon={<Wallet className="w-5 h-5" />} label="Total de transações" value={stats ? String(stats.total_geral) : "—"} />
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Produto</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Forma</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Ambiente</th>
              <th className="px-4 py-3 font-semibold">Data</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum pagamento registrado ainda.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3 capitalize">{r.produto}</td>
                  <td className="px-4 py-3">R$ {Number(r.valor).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs">{formaLabel(r)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.status === "completo"
                          ? "inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs"
                          : r.status === "reembolsado"
                            ? "inline-block px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs"
                            : "inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs uppercase text-muted-foreground">
                    {r.environment === "sandbox" ? "teste" : "produção"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <div className="flex items-center gap-2 text-[#A8006E] mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="font-display text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
