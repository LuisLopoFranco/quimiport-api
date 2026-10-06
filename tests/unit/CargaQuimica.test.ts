import { CargaQuimica } from '../../src/domain/entities/CargaQuimica';
import { ProdutoQuimico } from '../../src/domain/entities/ProdutoQuimico';
import { BusinessRuleError, ValidationError } from '../../src/domain/errors/DomainError';
import { StatusCarga } from '../../src/domain/value-objects/StatusCarga';
import { DOCUMENTOS_VALIDOS } from '../fixtures/cargas';
import { produtoValido } from '../fixtures/produtos';

const produtoAtivo = () => ProdutoQuimico.criar(produtoValido());

const dadosCarga = (sobrescrever: Partial<Parameters<typeof CargaQuimica.registrar>[0]> = {}) => ({
  codigo: 'qp-0001',
  produto: produtoAtivo(),
  quantidade: 1000,
  unidadeMedida: 'L',
  origem: 'Santos',
  destino: 'Cubatão',
  responsavelTecnico: { nome: 'Maria', registroProfissional: 'CRQ 123' },
  documentos: DOCUMENTOS_VALIDOS,
  ...sobrescrever,
});

/** Leva a carga até o status desejado pelo fluxo principal. */
function cargaEm(status: StatusCarga, dados = dadosCarga()) {
  const carga = CargaQuimica.registrar(dados);
  const caminho: StatusCarga[] = ['EM_ANALISE', 'EM_INSPECAO', 'LIBERADA', 'EM_MOVIMENTACAO', 'FINALIZADA'];
  if (status === 'REGISTRADA') return carga;
  if (status === 'BLOQUEADA') {
    carga.alterarStatus('EM_ANALISE');
    carga.alterarStatus('EM_INSPECAO');
    carga.bloquear('Lacre violado');
    return carga;
  }
  for (const s of caminho) {
    carga.alterarStatus(s);
    if (s === status) break;
  }
  return carga;
}

describe('Agregado CargaQuimica', () => {
  describe('registro', () => {
    it('registra uma carga válida com status REGISTRADA e código em maiúsculas', () => {
      const carga = CargaQuimica.registrar(dadosCarga());
      expect(carga.status).toBe('REGISTRADA');
      expect(carga.codigo).toBe('QP-0001');
      expect(carga.retirarMudancasPendentes()).toEqual([
        expect.objectContaining({ statusAnterior: null, statusNovo: 'REGISTRADA' }),
      ]);
    });

    it('bloqueia registro sem produto químico associado', () => {
      expect(() => CargaQuimica.registrar(dadosCarga({ produto: null }))).toThrow(
        'Uma carga química não pode ser registrada sem produto químico associado',
      );
    });

    it('bloqueia registro com produto químico inativo', () => {
      const inativo = ProdutoQuimico.criar(produtoValido({ status: 'INATIVO' }));
      expect(() => CargaQuimica.registrar(dadosCarga({ produto: inativo }))).toThrow(BusinessRuleError);
    });

    it.each([0, -1, -0.5, Number.NaN])('bloqueia quantidade menor ou igual a zero (%p)', (quantidade) => {
      expect(() => CargaQuimica.registrar(dadosCarga({ quantidade }))).toThrow(
        'A quantidade da carga deve ser maior que zero',
      );
    });

    it('bloqueia registro sem responsável técnico', () => {
      expect(() => CargaQuimica.registrar(dadosCarga({ responsavelTecnico: undefined }))).toThrow(
        'Toda carga deve possuir responsável técnico informado',
      );
      expect(() =>
        CargaQuimica.registrar(dadosCarga({ responsavelTecnico: { nome: 'Ana', registroProfissional: '' } })),
      ).toThrow(ValidationError);
    });

    it('bloqueia unidade de medida inválida', () => {
      expect(() => CargaQuimica.registrar(dadosCarga({ unidadeMedida: 'GALAO' }))).toThrow(/Unidade de medida/);
    });
  });

  describe('liberação e documentação', () => {
    it('bloqueia liberação sem documentação obrigatória', () => {
      const carga = cargaEm('EM_INSPECAO', dadosCarga({ documentos: [] }));
      expect(() => carga.liberar()).toThrow('Uma carga não pode ser liberada sem documentação obrigatória');
      expect(carga.documentosPendentes()).toEqual(['FISPQ', 'FICHA_EMERGENCIA']);
    });

    it('bloqueia liberação com documento obrigatório vencido', () => {
      const docs = [
        { tipo: 'FISPQ', numero: 'F', dataValidade: '2099-01-01' },
        { tipo: 'FICHA_EMERGENCIA', numero: 'FE', dataValidade: '2020-01-01' },
      ];
      const carga = cargaEm('EM_INSPECAO', dadosCarga({ documentos: docs }));
      expect(() => carga.liberar()).toThrow(BusinessRuleError);
      expect(carga.documentosPendentes()).toEqual(['FICHA_EMERGENCIA']);
    });

    it('libera após anexar a documentação que faltava', () => {
      const carga = cargaEm('EM_INSPECAO', dadosCarga({ documentos: [DOCUMENTOS_VALIDOS[0]] }));
      carga.adicionarDocumento(DOCUMENTOS_VALIDOS[1]);
      carga.liberar();
      expect(carga.status).toBe('LIBERADA');
    });

    it('não anexa documento em carga cancelada', () => {
      const carga = cargaEm('REGISTRADA');
      carga.cancelar();
      expect(() => carga.adicionarDocumento(DOCUMENTOS_VALIDOS[0])).toThrow(BusinessRuleError);
    });
  });

  describe('mudanças de status', () => {
    it('percorre o fluxo principal completo e registra o histórico', () => {
      const carga = cargaEm('FINALIZADA');
      expect(carga.status).toBe('FINALIZADA');
      const historico = carga.retirarMudancasPendentes().map((m) => m.statusNovo);
      expect(historico).toEqual(['REGISTRADA', 'EM_ANALISE', 'EM_INSPECAO', 'LIBERADA', 'EM_MOVIMENTACAO', 'FINALIZADA']);
    });

    it('bloqueio exige motivo e o registra', () => {
      const carga = cargaEm('EM_INSPECAO');
      expect(() => carga.alterarStatus('BLOQUEADA')).toThrow('Informe o motivo do bloqueio da carga');
      carga.bloquear('Divergência na nota fiscal');
      expect(carga.dados.motivoBloqueio).toBe('Divergência na nota fiscal');
    });

    it('carga bloqueada não pode entrar em movimentação', () => {
      const carga = cargaEm('BLOQUEADA');
      expect(() => carga.alterarStatus('EM_MOVIMENTACAO')).toThrow(
        'Uma carga bloqueada não pode entrar em movimentação',
      );
      expect(carga.status).toBe('BLOQUEADA');
    });

    it('carga cancelada não pode ser liberada', () => {
      const carga = cargaEm('EM_INSPECAO');
      carga.cancelar('Cliente desistiu');
      expect(carga.status).toBe('CANCELADA');
      expect(() => carga.liberar()).toThrow('Uma carga cancelada não pode ser liberada');
    });

    it('carga em inspeção não pode ser finalizada sem antes ser liberada', () => {
      const carga = cargaEm('EM_INSPECAO');
      expect(() => carga.alterarStatus('FINALIZADA')).toThrow(/sem antes ser liberada/);
    });

    it.each(['REGISTRADA', 'EM_ANALISE', 'EM_INSPECAO', 'LIBERADA', 'BLOQUEADA'] as StatusCarga[])(
      'permite cancelar a partir de %s',
      (status) => {
        const carga = cargaEm(status);
        carga.cancelar();
        expect(carga.status).toBe('CANCELADA');
      },
    );

    it('não permite cancelar carga em movimentação ou finalizada', () => {
      expect(() => cargaEm('EM_MOVIMENTACAO').cancelar()).toThrow(BusinessRuleError);
      expect(() => cargaEm('FINALIZADA').cancelar()).toThrow(/não pode sofrer novas alterações/);
    });
  });
});