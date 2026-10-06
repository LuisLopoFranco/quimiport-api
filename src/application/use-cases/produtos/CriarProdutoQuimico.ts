import { ProdutoQuimico } from '../../../domain/entities/ProdutoQuimico';
import { IProdutoQuimicoRepository } from '../../../domain/repositories/IProdutoQuimicoRepository';
import { CriarProdutoQuimicoInput, ProdutoQuimicoOutput, toProdutoOutput } from '../../dtos/ProdutoQuimicoDTO';
import { ILogger } from '../../interfaces/ILogger';
import { IMetricas } from '../../interfaces/IMetricas';

/**
 * Caso de uso: Cadastrar produto químico.
 * Orquestra: cria a entidade (que valida as regras), persiste, registra log e métrica.
 */
export class CriarProdutoQuimico {
  constructor(
    private readonly produtos: IProdutoQuimicoRepository,
    private readonly logger: ILogger,
    private readonly metricas: IMetricas,
  ) {}

  async executar(input: CriarProdutoQuimicoInput): Promise<ProdutoQuimicoOutput> {
    const produto = ProdutoQuimico.criar(input);
    await this.produtos.salvar(produto);
    this.logger.info({ produtoQuimicoId: produto.id, nome: input.nome }, 'Produto químico criado');
    this.metricas.produtoCriado();
    return toProdutoOutput(produto);
  }
}