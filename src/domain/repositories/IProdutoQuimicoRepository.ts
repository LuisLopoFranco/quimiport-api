import { ProdutoQuimico } from '../entities/ProdutoQuimico';
import { StatusProduto } from '../value-objects/StatusProduto';

/**
 * Contrato do repositório (porta). O domínio define a interface e a
 * infraestrutura fornece a implementação (PostgreSQL ou memória).
 */
export interface IProdutoQuimicoRepository {
  salvar(produto: ProdutoQuimico): Promise<void>;
  buscarPorId(id: string): Promise<ProdutoQuimico | null>;
  listar(filtros?: { status?: StatusProduto }): Promise<ProdutoQuimico[]>;
}