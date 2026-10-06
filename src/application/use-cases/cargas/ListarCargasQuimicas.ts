import { FiltrosCarga, ICargaQuimicaRepository } from '../../../domain/repositories/ICargaQuimicaRepository';
import { CargaQuimicaOutput, toCargaOutput } from '../../dtos/CargaQuimicaDTO';

export class ListarCargasQuimicas {
  constructor(private readonly cargas: ICargaQuimicaRepository) {}

  async executar(filtros: FiltrosCarga = {}): Promise<CargaQuimicaOutput[]> {
    const lista = await this.cargas.listar(filtros);
    return lista.map((c) => toCargaOutput(c));
  }
}