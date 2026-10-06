import { NotFoundError } from '../../../domain/errors/DomainError';
import { IProdutoQuimicoRepository } from '../../../domain/repositories/IProdutoQuimicoRepository';
import { AtualizarProdutoQuimicoInput, ProdutoQuimicoOutput, toProdutoOutput } from '../../dtos/ProdutoQuimicoDTO';
import { ILogger } from '../../interfaces/ILogger';

export class AtualizarProdutoQuimico {
  constructor(
    private readonly produtos: IProdutoQuimicoRepository,
    private readonly logger: ILogger,
  ) {}

  async executar(id: string, input: AtualizarProdutoQuimicoInput): Promise<ProdutoQuimicoOutput> {
    const produto = await this.produtos.buscarPorId(id);
    if (!produto) throw new NotFoundError('Produto químico não encontrado', { id });
    produto.atualizar(input);
    await this.produtos.salvar(produto);
    this.logger.info({ produtoQuimicoId: id }, 'Produto químico atualizado');
    return toProdutoOutput(produto);
  }
}