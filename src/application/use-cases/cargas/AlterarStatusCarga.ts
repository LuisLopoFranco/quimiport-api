import { NotFoundError, ValidationError } from '../../../domain/errors/DomainError';
import { ICargaQuimicaRepository } from '../../../domain/repositories/ICargaQuimicaRepository';
import { isStatusCarga, STATUS_CARGA } from '../../../domain/value-objects/StatusCarga';
import { CargaQuimicaOutput, toCargaOutput } from '../../dtos/CargaQuimicaDTO';
import { ILogger } from '../../interfaces/ILogger';
import { IMetricas } from '../../interfaces/IMetricas';

/**
 * Caso de uso: Atualizar status da carga.
 * É usado pelos endpoints /status, /bloquear, /liberar e /cancelar: todos passam
 * pela mesma máquina de estados dentro do agregado.
 */
export class AlterarStatusCarga {
  constructor(
    private readonly cargas: ICargaQuimicaRepository,
    private readonly logger: ILogger,
    private readonly metricas: IMetricas,
  ) {}

  async executar(id: string, novoStatus: string, motivo?: string | null): Promise<CargaQuimicaOutput> {
    if (!isStatusCarga(novoStatus)) {
      throw new ValidationError(`Status inválido. Use: ${STATUS_CARGA.join(', ')}`);
    }
    const carga = await this.cargas.buscarPorId(id);
    if (!carga) throw new NotFoundError('Carga química não encontrada', { id });

    const anterior = carga.status;
    try {
      carga.alterarStatus(novoStatus, motivo);
    } catch (erro) {
      this.logger.warn(
        { cargaId: id, statusAtual: anterior, statusSolicitado: novoStatus, motivo: (erro as Error).message },
        'Alteração de status recusada',
      );
      throw erro;
    }
    await this.cargas.salvar(carga);

    const evento =
      novoStatus === 'BLOQUEADA' ? 'Carga bloqueada' : novoStatus === 'LIBERADA' ? 'Carga liberada' : 'Status da carga alterado';
    this.logger.info({ cargaId: id, codigo: carga.codigo, de: anterior, para: novoStatus, motivo }, evento);
    this.metricas.statusAlterado(anterior, novoStatus);
    return toCargaOutput(carga);
  }
}