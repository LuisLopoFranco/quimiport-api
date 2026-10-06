import { NotFoundError } from '../../../domain/errors/DomainError';
import { IProdutoQuimicoRepository } from '../../../domain/repositories/IProdutoQuimicoRepository';
import { ProdutoQuimicoOutput, toProdutoOutput } from '../../dtos/ProdutoQuimicoDTO';

export class BuscarProdutoQuimico {
  constructor(private readonly produtos: IProdutoQuimicoRepository) {}

  async executar(id: string): Promise<ProdutoQuimicoOutput> {
    const produto = await this.produtos.buscarPorId(id);
    if (!produto) throw new NotFoundError('Produto químico não encontrado', { id });
    return toProdutoOutput(produto);
  }
}