import { BusinessRuleError } from '../../src/domain/errors/DomainError';
import { MaquinaEstadosCarga, TRANSICOES_PERMITIDAS } from '../../src/domain/services/MaquinaEstadosCarga';
import { STATUS_CARGA, StatusCarga } from '../../src/domain/value-objects/StatusCarga';

const permitidas: [StatusCarga, StatusCarga][] = [
  ['REGISTRADA', 'EM_ANALISE'],
  ['EM_ANALISE', 'EM_INSPECAO'],
  ['EM_INSPECAO', 'LIBERADA'],
  ['LIBERADA', 'EM_MOVIMENTACAO'],
  ['EM_MOVIMENTACAO', 'FINALIZADA'],
  ['REGISTRADA', 'CANCELADA'],
  ['EM_ANALISE', 'CANCELADA'],
  ['EM_INSPECAO', 'BLOQUEADA'],
  ['EM_INSPECAO', 'CANCELADA'],
  ['LIBERADA', 'CANCELADA'],
  ['BLOQUEADA', 'CANCELADA'],
];

const proibidasDoEnunciado: [StatusCarga, StatusCarga, RegExp][] = [
  ['CANCELADA', 'LIBERADA', /cancelada não pode ser liberada/],
  ['FINALIZADA', 'EM_MOVIMENTACAO', /Finalizada não pode sofrer novas alterações/],
  ['BLOQUEADA', 'EM_MOVIMENTACAO', /bloqueada não pode entrar em movimentação/],
  ['REGISTRADA', 'FINALIZADA', /Transição de status inválida/],
  ['EM_INSPECAO', 'FINALIZADA', /não pode ser finalizada sem antes ser liberada/],
  ['LIBERADA', 'REGISTRADA', /Transição de status inválida/],
];

describe('Máquina de estados da carga', () => {
  it.each(permitidas)('permite %s → %s', (de, para) => {
    expect(MaquinaEstadosCarga.podeTransitar(de, para)).toBe(true);
    expect(() => MaquinaEstadosCarga.validar(de, para)).not.toThrow();
  });

  it.each(proibidasDoEnunciado)('proíbe %s → %s', (de, para, mensagem) => {
    expect(MaquinaEstadosCarga.podeTransitar(de, para)).toBe(false);
    expect(() => MaquinaEstadosCarga.validar(de, para)).toThrow(mensagem);
  });

  it('a tabela tem exatamente as 11 transições do enunciado', () => {
    const total = Object.values(TRANSICOES_PERMITIDAS).reduce((soma, lista) => soma + lista.length, 0);
    expect(total).toBe(permitidas.length);
  });

  it('estados terminais não aceitam nenhuma transição', () => {
    for (const terminal of ['FINALIZADA', 'CANCELADA'] as StatusCarga[]) {
      for (const destino of STATUS_CARGA) {
        expect(() => MaquinaEstadosCarga.validar(terminal, destino)).toThrow(BusinessRuleError);
      }
    }
  });

  it('todas as combinações fora da tabela são proibidas', () => {
    for (const de of STATUS_CARGA) {
      for (const para of STATUS_CARGA) {
        const esperado = permitidas.some(([a, b]) => a === de && b === para);
        expect(MaquinaEstadosCarga.podeTransitar(de, para)).toBe(esperado);
      }
    }
  });

  it('recusa transição para o mesmo status', () => {
    expect(() => MaquinaEstadosCarga.validar('REGISTRADA', 'REGISTRADA')).toThrow(/já está com status/);
  });
});