import { IProdutoQuimicoRepository } from '../../../domain/repositories/IProdutoQuimicoRepository';
import { StatusProduto } from '../../../domain/value-objects/StatusProduto';
import { ProdutoQuimicoOutput, toProdutoOutput } from '../../dtos/ProdutoQuimicoDTO';

export class ListarProdutosQuimicos {
  constructor(private readonly produtos: IProdutoQuimicoRepository) {}

  async executar(filtros: { status?: StatusProduto } = {}): Promise<ProdutoQuimicoOutput[]> {
    const lista = await this.produtos.listar(filtros);
    return lista.map(toProdutoOutput);
  }
}