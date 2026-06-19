interface Props {
  visible: boolean;
}

export function ProgressoSalvoBadge({ visible }: Props) {
  return (
    <div
      aria-hidden={!visible}
      className="fixed bottom-20 right-4 z-30 pointer-events-none select-none transition-opacity duration-500 text-xs text-gray-400 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm"
      style={{ opacity: visible ? 1 : 0 }}
    >
      💾 Progresso salvo automaticamente
    </div>
  );
}
