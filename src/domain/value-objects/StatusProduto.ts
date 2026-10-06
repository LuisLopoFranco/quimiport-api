export const STATUS_PRODUTO = ['ATIVO', 'INATIVO'] as const;
export type StatusProduto = (typeof STATUS_PRODUTO)[number];

export function isStatusProduto(valor: unknown): valor is StatusProduto {
  return typeof valor === 'string' && (STATUS_PRODUTO as readonly string[]).includes(valor);
}