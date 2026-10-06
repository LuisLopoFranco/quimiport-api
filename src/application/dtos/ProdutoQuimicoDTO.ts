import { ProdutoQuimico } from '../../domain/entities/ProdutoQuimico';

export interface CriarProdutoQuimicoInput {
  nome: string;
  descricao?: string | null;
  numeroOnu: string;
  classeRisco: string;
  grupoCompatibilidade?: string | null;
  status?: string;
}

export type AtualizarProdutoQuimicoInput = CriarProdutoQuimicoInput;

export interface ProdutoQuimicoOutput {
  id: string;
  nome: string;
  descricao: string | null;
  numeroOnu: string;
  classeRisco: string;
  grupoCompatibilidade: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function toProdutoOutput(produto: ProdutoQuimico): ProdutoQuimicoOutput {
  const p = produto.toJSON();
  return { ...p, createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
}