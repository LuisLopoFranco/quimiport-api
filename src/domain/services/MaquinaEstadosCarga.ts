import { BusinessRuleError } from '../errors/DomainError';
import { ROTULO_STATUS, StatusCarga } from '../value-objects/StatusCarga';

/**
 * Máquina de estados da carga química.
 *
 * A tabela abaixo é a ÚNICA fonte da verdade sobre quais transições são
 * permitidas. Tudo o que não está aqui é proibido.
 *
 * Fluxo principal:
 *   REGISTRADA → EM_ANALISE → EM_INSPECAO → LIBERADA → EM_MOVIMENTACAO → FINALIZADA
 *
 * Fluxos alternativos:
 *   REGISTRADA → CANCELADA, EM_ANALISE → CANCELADA, EM_INSPECAO → BLOQUEADA,
 *   EM_INSPECAO → CANCELADA, LIBERADA → CANCELADA, BLOQUEADA → CANCELADA
 *
 * Estados terminais: FINALIZADA e CANCELADA.
 */
export const TRANSICOES_PERMITIDAS: Readonly<Record<StatusCarga, readonly StatusCarga[]>> = {
  REGISTRADA: ['EM_ANALISE', 'CANCELADA'],
  EM_ANALISE: ['EM_INSPECAO', 'CANCELADA'],
  EM_INSPECAO: ['LIBERADA', 'BLOQUEADA', 'CANCELADA'],
  LIBERADA: ['EM_MOVIMENTACAO', 'CANCELADA'],
  BLOQUEADA: ['CANCELADA'],
  EM_MOVIMENTACAO: ['FINALIZADA'],
  FINALIZADA: [],
  CANCELADA: [],
};

export const ESTADOS_TERMINAIS: readonly StatusCarga[] = ['FINALIZADA', 'CANCELADA'];

export class MaquinaEstadosCarga {
  static podeTransitar(de: StatusCarga, para: StatusCarga): boolean {
    return TRANSICOES_PERMITIDAS[de].includes(para);
  }

  static proximosStatus(de: StatusCarga): readonly StatusCarga[] {
    return TRANSICOES_PERMITIDAS[de];
  }

  /**
   * Lança BusinessRuleError com uma mensagem específica quando a transição
   * viola uma regra de negócio conhecida, ou uma mensagem genérica caso contrário.
   */
  static validar(de: StatusCarga, para: StatusCarga): void {
    if (this.podeTransitar(de, para)) return;

    const detalhes = { statusAtual: de, statusSolicitado: para, permitidos: TRANSICOES_PERMITIDAS[de] };

    if (de === para) {
      throw new BusinessRuleError(`A carga já está com status ${ROTULO_STATUS[de]}`, detalhes);
    }
    if (de === 'CANCELADA' && para === 'LIBERADA') {
      throw new BusinessRuleError('Uma carga cancelada não pode ser liberada', detalhes);
    }
    if (ESTADOS_TERMINAIS.includes(de)) {
      throw new BusinessRuleError(
        `Uma carga com status ${ROTULO_STATUS[de]} não pode sofrer novas alterações de status`,
        detalhes,
      );
    }
    if (de === 'BLOQUEADA' && para === 'EM_MOVIMENTACAO') {
      throw new BusinessRuleError('Uma carga bloqueada não pode entrar em movimentação', detalhes);
    }
    if (de === 'EM_INSPECAO' && para === 'FINALIZADA') {
      throw new BusinessRuleError(
        'Uma carga em inspeção não pode ser finalizada sem antes ser liberada',
        detalhes,
      );
    }
    throw new BusinessRuleError(
      `Transição de status inválida: ${ROTULO_STATUS[de]} → ${ROTULO_STATUS[para]}`,
      detalhes,
    );
  }
}