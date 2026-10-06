import { NotFoundError } from '../../../domain/errors/DomainError';
import { HistoricoStatus, ICargaQuimicaRepository } from '../../../domain/repositories/ICargaQuimicaRepository';

export class ConsultarHistoricoCarga {
  constructor(private readonly cargas: ICargaQuimicaRepository) {}

  async executar(id: string): Promise<HistoricoStatus[]> {
    const carga = await this.cargas.buscarPorId(id);
    if (!carga) throw new NotFoundError('Carga química não encontrada', { id });
    return this.cargas.listarHistorico(id);
  }
}