import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Scale } from "lucide-react";
import { toast } from "sonner";
import { PrivateRoute } from "@/components/PrivateRoute";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/painel-advogada/configuracoes")({
  component: () => (
    <PrivateRoute roles={["advogado", "super_admin"]}>
      <ConfiguracoesPage />
    </PrivateRoute>
  ),
});

interface Form {
  full_name: string;
  whatsapp: string;
  oab_number: string;
  especialidade: string;
  escritorio_nome: string;
  bio: string;
}

const EMPTY: Form = {
  full_name: "",
  whatsapp: "",
  oab_number: "",
  especialidade: "",
  escritorio_nome: "",
  bio: "",
};

function ConfiguracoesPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, whatsapp, oab_number, especialidade, escritorio_nome, bio")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          whatsapp: data.whatsapp ?? "",
          oab_number: data.oab_number ?? "",
          especialidade: data.especialidade ?? "",
          escritorio_nome: data.escritorio_nome ?? "",
          bio: data.bio ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const whats = form.whatsapp.replace(/\D+/g, "");
    if (!whats || whats.length < 12) {
      toast.error("Informe um WhatsApp válido com DDI + DDD + número (ex: 5511999990000)");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        whatsapp: whats,
        oab_number: form.oab_number,
        especialidade: form.especialidade,
        escritorio_nome: form.escritorio_nome,
        bio: form.bio,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Alterações salvas!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div
        className="px-8 py-8 text-white"
        style={{ background: "linear-gradient(135deg,#6B0F4B,#A8006E)" }}
      >
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-white/80 text-sm mt-1">
          Mantenha seus dados profissionais atualizados.
        </p>
      </div>

      <div className="p-6 sm:p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-6 shadow-sm space-y-5">
          <Field label="Nome completo" value={form.full_name} onChange={(v) => set("full_name", v)} required />
          <Field
            label="WhatsApp"
            value={form.whatsapp}
            onChange={(v) => set("whatsapp", v)}
            placeholder="5511999990000"
            required
            help="DDI + DDD + número. Este é o número que receberá as mensagens das suas clientes."
          />
          <Field label="Número OAB" value={form.oab_number} onChange={(v) => set("oab_number", v)} placeholder="SP 123.456" />
          <Field
            label="Especialidade"
            value={form.especialidade}
            onChange={(v) => set("especialidade", v)}
            placeholder="Direito de Família e da Mulher"
          />
          <Field label="Nome do escritório" value={form.escritorio_nome} onChange={(v) => set("escritorio_nome", v)} />
          <label className="block">
            <span className="block text-sm font-medium mb-1.5">Bio / apresentação</span>
            <textarea
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Conte um pouco sobre sua atuação para suas clientes…"
            />
          </label>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#6B0F4B] hover:bg-[#A8006E] text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Salvando…" : "Salvar alterações"}
            </button>
          </div>
        </form>

        {/* Preview ao vivo */}
        <aside className="space-y-3">
          <h3 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Como suas clientes te verão
          </h3>
          <div
            className="rounded-2xl border p-5 shadow-sm"
            style={{ background: "#FDF6F9", borderColor: "#E8D0E0" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full bg-[#A8006E] text-white flex items-center justify-center text-xl font-semibold">
                {(form.full_name.trim()[0] || "A").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[#1A0010] truncate">
                  {form.full_name || "Sua nome aparecerá aqui"}
                </p>
                {form.oab_number && (
                  <p className="text-xs text-muted-foreground">OAB {form.oab_number}</p>
                )}
              </div>
            </div>

            {form.especialidade && (
              <div className="flex items-center gap-2 text-sm text-[#6B0F4B] font-medium mb-2">
                <Scale className="w-4 h-4" />
                {form.especialidade}
              </div>
            )}

            {form.escritorio_nome && (
              <p className="text-sm text-muted-foreground mb-2">{form.escritorio_nome}</p>
            )}

            {form.bio && (
              <p className="text-sm text-[#1A0010] mt-3 whitespace-pre-line">{form.bio}</p>
            )}

            {form.whatsapp && (
              <button
                disabled
                className="mt-4 w-full py-2.5 rounded-lg text-sm font-medium text-white opacity-90 flex items-center justify-center gap-2"
                style={{ background: "#25D366" }}
              >
                WhatsApp
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Esta visualização atualiza enquanto você edita.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {help && <p className="text-xs text-muted-foreground mt-1.5">{help}</p>}
    </label>
  );
}
