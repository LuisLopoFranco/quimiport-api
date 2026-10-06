import { randomUUID } from 'node:crypto';
import { BusinessRuleError, ValidationError } from '../errors/DomainError';
import { MaquinaEstadosCarga } from '../services/MaquinaEstadosCarga';
import { DOCUMENTOS_OBRIGATORIOS, DocumentoCarga } from '../value-objects/DocumentoCarga';
import { Quantidade, UnidadeMedida } from '../value-objects/Quantidade';
import { ResponsavelTecnico } from '../value-objects/ResponsavelTecnico';
import { StatusCarga } from '../value-objects/StatusCarga';
import { ProdutoQuimico } from './ProdutoQuimico';

export interface MudancaStatus {
  statusAnterior: StatusCarga | null;
  statusNovo: StatusCarga;
  motivo: string | null;
  alteradoEm: Date;
}

export interface CargaQuimicaProps {
  id: string;
  codigo: string;
  produtoQuimicoId: string;
  quantidade: Quantidade;
  origem: string;
  destino: string;
  responsavelTecnico: ResponsavelTecnico;
  documentos: DocumentoCarga[];
  status: StatusCarga;
  motivoBloqueio: string | null;
  dataEntrada: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistrarCargaDados {
  codigo: string;
  produto: ProdutoQuimico | null | undefined;
  quantidade: number;
  unidadeMedida: string;
  origem: string;
  destino: string;
  responsavelTecnico?: { nome?: string; registroProfissional?: string } | null;
  documentos?: { tipo: string; numero: string; dataValidade: Date | string }[];
  dataEntrada?: Date | string;
}

/**
 * Agregado raiz do domínio.
 *
 * Toda mudança na carga passa por métodos desta classe, que aplicam as regras
 * de negócio e registram o histórico de status. Ninguém altera `status`
 * diretamente.
 */
export class CargaQuimica {
  /** Mudanças de status ainda não persistidas (o repositório grava e limpa). */
  private mudancasPendentes: MudancaStatus[] = [];

  private constructor(private props: CargaQuimicaProps) {}

  static registrar(dados: RegistrarCargaDados, agora: Date = new Date()): CargaQuimica {
    if (!dados.produto) {
      throw new ValidationError('Uma carga química não pode ser registrada sem produto químico associado');
    }
    dados.produto.garantirQuePodeSerUsadoEmCarga();

    if (!dados.codigo?.trim()) throw new ValidationError('O código da carga é obrigatório');
    if (!dados.origem?.trim()) throw new ValidationError('A origem da carga é obrigatória');
    if (!dados.destino?.trim()) throw new ValidationError('O destino da carga é obrigatório');

    const quantidade = Quantidade.criar(dados.quantidade, dados.unidadeMedida);
    const responsavelTecnico = ResponsavelTecnico.criar(dados.responsavelTecnico);
    const documentos = (dados.documentos ?? []).map((d) => DocumentoCarga.criar(d));
    const dataEntrada = dados.dataEntrada ? new Date(dados.dataEntrada) : agora;
    if (Number.isNaN(dataEntrada.getTime())) throw new ValidationError('Data de entrada inválida');

    const carga = new CargaQuimica({
      id: randomUUID(),
      codigo: dados.codigo.trim().toUpperCase(),
      produtoQuimicoId: dados.produto.id,
      quantidade,
      origem: dados.origem.trim(),
      destino: dados.destino.trim(),
      responsavelTecnico,
      documentos,
      status: 'REGISTRADA',
      motivoBloqueio: null,
      dataEntrada,
      createdAt: agora,
      updatedAt: agora,
    });
    carga.mudancasPendentes.push({ statusAnterior: null, statusNovo: 'REGISTRADA', motivo: null, alteradoEm: agora });
    return carga;
  }

  static restaurar(props: CargaQuimicaProps): CargaQuimica {
    return new CargaQuimica({ ...props, documentos: [...props.documentos] });
  }

  /**
   * Ponto único de mudança de status. Valida a transição na máquina de estados
   * e aplica as regras específicas de cada status de destino.
   */
  alterarStatus(novoStatus: StatusCarga, motivo?: string | null, agora: Date = new Date()): void {
    MaquinaEstadosCarga.validar(this.props.status, novoStatus);

    if (novoStatus === 'LIBERADA') this.garantirDocumentacaoObrigatoria(agora);
    if (novoStatus === 'BLOQUEADA' && !motivo?.trim()) {
      throw new ValidationError('Informe o motivo do bloqueio da carga');
    }

    const anterior = this.props.status;
    this.props.status = novoStatus;
    this.props.motivoBloqueio = novoStatus === 'BLOQUEADA' ? motivo!.trim() : this.props.motivoBloqueio;
    this.props.updatedAt = agora;
    this.mudancasPendentes.push({
      statusAnterior: anterior,
      statusNovo: novoStatus,
      motivo: motivo?.trim() || null,
      alteradoEm: agora,
    });
  }

  liberar(agora?: Date) {
    this.alterarStatus('LIBERADA', null, agora);
  }
  bloquear(motivo: string, agora?: Date) {
    this.alterarStatus('BLOQUEADA', motivo, agora);
  }
  cancelar(motivo?: string | null, agora?: Date) {
    this.alterarStatus('CANCELADA', motivo, agora);
  }

  adicionarDocumento(dados: { tipo: string; numero: string; dataValidade: Date | string }, agora = new Date()) {
    if (['FINALIZADA', 'CANCELADA'].includes(this.props.status)) {
      throw new BusinessRuleError('Não é possível anexar documentos a uma carga finalizada ou cancelada');
    }
    this.props.documentos.push(DocumentoCarga.criar(dados));
    this.props.updatedAt = agora;
  }

  /** Regra: uma carga não pode ser liberada sem a documentação obrigatória válida. */
  documentosPendentes(agora: Date = new Date()): string[] {
    return DOCUMENTOS_OBRIGATORIOS.filter(
      (tipo) => !this.props.documentos.some((d) => d.tipo === tipo && d.estaValidoEm(agora)),
    );
  }

  private garantirDocumentacaoObrigatoria(agora: Date) {
    const pendentes = this.documentosPendentes(agora);
    if (pendentes.length > 0) {
      throw new BusinessRuleError(
        'Uma carga não pode ser liberada sem documentação obrigatória',
        { documentosPendentesOuVencidos: pendentes },
      );
    }
  }

  retirarMudancasPendentes(): MudancaStatus[] {
    const mudancas = this.mudancasPendentes;
    this.mudancasPendentes = [];
    return mudancas;
  }

  get id() {
    return this.props.id;
  }
  get codigo() {
    return this.props.codigo;
  }
  get status() {
    return this.props.status;
  }
  get dados(): Readonly<CargaQuimicaProps> {
    return this.props;
  }

  toJSON() {
    const p = this.props;
    return {
      id: p.id,
      codigo: p.codigo,
      produtoQuimicoId: p.produtoQuimicoId,
      quantidade: p.quantidade.valor,
      unidadeMedida: p.quantidade.unidade as UnidadeMedida,
      origem: p.origem,
      destino: p.destino,
      responsavelTecnico: {
        nome: p.responsavelTecnico.nome,
        registroProfissional: p.responsavelTecnico.registroProfissional,
      },
      documentos: p.documentos.map((d) => ({
        tipo: d.tipo,
        numero: d.numero,
        dataValidade: d.dataValidade.toISOString().slice(0, 10),
      })),
      status: p.status,
      motivoBloqueio: p.motivoBloqueio,
      dataEntrada: p.dataEntrada,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}