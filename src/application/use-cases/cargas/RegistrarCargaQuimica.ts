import { CargaQuimica } from '../../../domain/entities/CargaQuimica';
import { ConflictError, NotFoundError, ValidationError } from '../../../domain/errors/DomainError';
import { ICargaQuimicaRepository } from '../../../domain/repositories/ICargaQuimicaRepository';
import { IProdutoQuimicoRepository } from '../../../domain/repositories/IProdutoQuimicoRepository';
import { CargaQuimicaOutput, RegistrarCargaQuimicaInput, toCargaOutput } from '../../dtos/CargaQuimicaDTO';
import { toProdutoOutput } from '../../dtos/ProdutoQuimicoDTO';
import { ILogger } from '../../interfaces/ILogger';
import { IMetricas } from '../../interfaces/IMetricas';

/**
 * Caso de uso: Registrar carga química.
 * 1. Busca o produto associado (precisa existir).
 * 2. Garante que o código da carga é único.
 * 3. Delega ao agregado CargaQuimica a validação das regras (produto ativo, quantidade > 0, responsável...).
 * 4. Persiste e registra log/métrica.
 */
export class RegistrarCargaQuimica {
  constructor(
    private readonly cargas: ICargaQuimicaRepository,
    private readonly produtos: IProdutoQuimicoRepository,
    private readonly logger: ILogger,
    private readonly metricas: IMetricas,
  ) {}

  async executar(input: RegistrarCargaQuimicaInput): Promise<CargaQuimicaOutput> {
    if (!input.produtoQuimicoId) {
      throw new ValidationError('Uma carga química não pode ser registrada sem produto químico associado');
    }
    const produto = await this.produtos.buscarPorId(input.produtoQuimicoId);
    if (!produto) {
      throw new NotFoundError('Produto químico não encontrado', { produtoQuimicoId: input.produtoQuimicoId });
    }

    const carga = CargaQuimica.registrar({ ...input, produto });

    if (await this.cargas.buscarPorCodigo(carga.codigo)) {
      throw new ConflictError('Já existe uma carga com este código', { codigo: carga.codigo });
    }

    await this.cargas.salvar(carga);
    this.logger.info(
      { cargaId: carga.id, codigo: carga.codigo, produtoQuimicoId: produto.id },
      'Carga química registrada',
    );
    this.metricas.cargaRegistrada();
    return toCargaOutput(carga, toProdutoOutput(produto));
  }
}