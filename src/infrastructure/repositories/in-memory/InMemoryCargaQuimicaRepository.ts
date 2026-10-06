import { CargaQuimica, CargaQuimicaProps } from '../../../domain/entities/CargaQuimica';
import {
  FiltrosCarga,
  HistoricoStatus,
  ICargaQuimicaRepository,
} from '../../../domain/repositories/ICargaQuimicaRepository';

export class InMemoryCargaQuimicaRepository implements ICargaQuimicaRepository {
  private readonly itens = new Map<string, CargaQuimicaProps>();
  private readonly historico: (HistoricoStatus & { cargaId: string })[] = [];
  private proximoId = 1;

  async salvar(carga: CargaQuimica): Promise<void> {
    this.itens.set(carga.id, { ...carga.dados, documentos: [...carga.dados.documentos] });
    for (const m of carga.retirarMudancasPendentes()) {
      this.historico.push({ ...m, id: this.proximoId++, cargaId: carga.id });
    }
  }

  async buscarPorId(id: string): Promise<CargaQuimica | null> {
    const props = this.itens.get(id);
    return props ? CargaQuimica.restaurar(props) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<CargaQuimica | null> {
    const props = [...this.itens.values()].find((c) => c.codigo === codigo);
    return props ? CargaQuimica.restaurar(props) : null;
  }

  async listar(filtros: FiltrosCarga = {}): Promise<CargaQuimica[]> {
    return [...this.itens.values()]
      .filter((c) => !filtros.status || c.status === filtros.status)
      .filter((c) => !filtros.produtoQuimicoId || c.produtoQuimicoId === filtros.produtoQuimicoId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((c) => CargaQuimica.restaurar(c));
  }

  async listarHistorico(cargaId: string): Promise<HistoricoStatus[]> {
    return this.historico
      .filter((h) => h.cargaId === cargaId)
      .map(({ cargaId: _ignorado, ...h }) => h);
  }
}