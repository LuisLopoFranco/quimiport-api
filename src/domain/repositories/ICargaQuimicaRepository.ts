import { CargaQuimica, MudancaStatus } from '../entities/CargaQuimica';
import { StatusCarga } from '../value-objects/StatusCarga';

export interface HistoricoStatus extends MudancaStatus {
  id: number;
}

export interface FiltrosCarga {
  status?: StatusCarga;
  produtoQuimicoId?: string;
}

export interface ICargaQuimicaRepository {
  /** Insere ou atualiza a carga, seus documentos e o histórico pendente (em transação). */
  salvar(carga: CargaQuimica): Promise<void>;
  buscarPorId(id: string): Promise<CargaQuimica | null>;
  buscarPorCodigo(codigo: string): Promise<CargaQuimica | null>;
  listar(filtros?: FiltrosCarga): Promise<CargaQuimica[]>;
  listarHistorico(cargaId: string): Promise<HistoricoStatus[]>;
}