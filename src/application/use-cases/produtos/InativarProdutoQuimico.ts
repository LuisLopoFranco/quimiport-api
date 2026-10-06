import { NotFoundError } from '../../../domain/errors/DomainError';
import { IProdutoQuimicoRepository } from '../../../domain/repositories/IProdutoQuimicoRepository';
import { ProdutoQuimicoOutput, toProdutoOutput } from '../../dtos/ProdutoQuimicoDTO';
import { ILogger } from '../../interfaces/ILogger';

/** Inativação lógica: o registro continua no banco, mas não pode ir para novas cargas. */
export class InativarProdutoQuimico {
  constructor(
    private readonly produtos: IProdutoQuimicoRepository,
    private readonly logger: ILogger,
  ) {}

  async executar(id: string): Promise<ProdutoQuimicoOutput> {
    const produto = await this.produtos.buscarPorId(id);
    if (!produto) throw new NotFoundError('Produto químico não encontrado', { id });
    produto.inativar();
    await this.produtos.salvar(produto);
    this.logger.info({ produtoQuimicoId: id }, 'Produto químico inativado');
    return toProdutoOutput(produto);
  }
}