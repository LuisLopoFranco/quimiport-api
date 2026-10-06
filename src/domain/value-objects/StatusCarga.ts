export const STATUS_CARGA = [
  'REGISTRADA',
  'EM_ANALISE',
  'EM_INSPECAO',
  'LIBERADA',
  'BLOQUEADA',
  'EM_MOVIMENTACAO',
  'FINALIZADA',
  'CANCELADA',
] as const;

export type StatusCarga = (typeof STATUS_CARGA)[number];

export function isStatusCarga(valor: unknown): valor is StatusCarga {
  return typeof valor === 'string' && (STATUS_CARGA as readonly string[]).includes(valor);
}

/** Rótulos legíveis, usados em mensagens de erro e na documentação. */
export const ROTULO_STATUS: Record<StatusCarga, string> = {
  REGISTRADA: 'Registrada',
  EM_ANALISE: 'Em análise',
  EM_INSPECAO: 'Em inspeção',
  LIBERADA: 'Liberada',
  BLOQUEADA: 'Bloqueada',
  EM_MOVIMENTACAO: 'Em movimentação',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};