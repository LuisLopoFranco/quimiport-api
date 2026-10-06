import { NotFoundError } from '../../../domain/errors/DomainError';
import { ICargaQuimicaRepository } from '../../../domain/repositories/ICargaQuimicaRepository';
import { CargaQuimicaOutput, DocumentoInput, toCargaOutput } from '../../dtos/CargaQuimicaDTO';
import { ILogger } from '../../interfaces/ILogger';

export class AnexarDocumentoCarga {
  constructor(
    private readonly cargas: ICargaQuimicaRepository,
    private readonly logger: ILogger,
  ) {}

  async executar(id: string, documento: DocumentoInput): Promise<CargaQuimicaOutput> {
    const carga = await this.cargas.buscarPorId(id);
    if (!carga) throw new NotFoundError('Carga química não encontrada', { id });
    carga.adicionarDocumento(documento);
    await this.cargas.salvar(carga);
    this.logger.info({ cargaId: id, tipo: documento.tipo }, 'Documento anexado à carga');
    return toCargaOutput(carga);
  }
}