import { NotFoundError } from '../../../domain/errors/DomainError';
import { ICargaQuimicaRepository } from '../../../domain/repositories/ICargaQuimicaRepository';
import { IProdutoQuimicoRepository } from '../../../domain/repositories/IProdutoQuimicoRepository';
import { CargaQuimicaOutput, toCargaOutput } from '../../dtos/CargaQuimicaDTO';
import { toProdutoOutput } from '../../dtos/ProdutoQuimicoDTO';

export class BuscarCargaQuimica {
  constructor(
    private readonly cargas: ICargaQuimicaRepository,
    private readonly produtos: IProdutoQuimicoRepository,
  ) {}

  async executar(id: string): Promise<CargaQuimicaOutput> {
    const carga = await this.cargas.buscarPorId(id);
    if (!carga) throw new NotFoundError('Carga química não encontrada', { id });
    const produto = await this.produtos.buscarPorId(carga.dados.produtoQuimicoId);
    return toCargaOutput(carga, produto ? toProdutoOutput(produto) : undefined);
  }
}