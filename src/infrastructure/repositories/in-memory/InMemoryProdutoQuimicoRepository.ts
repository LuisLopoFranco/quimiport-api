import { ProdutoQuimico } from '../../../domain/entities/ProdutoQuimico';
import { IProdutoQuimicoRepository } from '../../../domain/repositories/IProdutoQuimicoRepository';
import { StatusProduto } from '../../../domain/value-objects/StatusProduto';

/**
 * Implementação em memória: usada nos testes e para rodar a API sem banco
 * (DATABASE_URL=memory). Prova na prática a inversão de dependência (ADR 005).
 */
export class InMemoryProdutoQuimicoRepository implements IProdutoQuimicoRepository {
  private readonly itens = new Map<string, ReturnType<ProdutoQuimico['toJSON']>>();

  async salvar(produto: ProdutoQuimico): Promise<void> {
    this.itens.set(produto.id, produto.toJSON());
  }

  async buscarPorId(id: string): Promise<ProdutoQuimico | null> {
    const props = this.itens.get(id);
    return props ? ProdutoQuimico.restaurar(props) : null;
  }

  async listar(filtros: { status?: StatusProduto } = {}): Promise<ProdutoQuimico[]> {
    return [...this.itens.values()]
      .filter((p) => !filtros.status || p.status === filtros.status)
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .map((p) => ProdutoQuimico.restaurar(p));
  }
}