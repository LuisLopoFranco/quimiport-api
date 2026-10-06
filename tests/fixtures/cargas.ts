import { RegistrarCargaQuimicaInput } from '../../src/application/dtos/CargaQuimicaDTO';

export const DOCUMENTOS_VALIDOS = [
  { tipo: 'FISPQ', numero: 'FISPQ-001', dataValidade: '2099-12-31' },
  { tipo: 'FICHA_EMERGENCIA', numero: 'FE-001', dataValidade: '2099-12-31' },
];

let sequencial = 0;

export const cargaValida = (
  produtoQuimicoId: string,
  sobrescrever: Partial<RegistrarCargaQuimicaInput> = {},
): RegistrarCargaQuimicaInput => ({
  codigo: `QP-TESTE-${++sequencial}`,
  produtoQuimicoId,
  quantidade: 1500,
  unidadeMedida: 'L',
  origem: 'Terminal Alemoa - Santos/SP',
  destino: 'Paulínia/SP',
  responsavelTecnico: { nome: 'Maria Souza', registroProfissional: 'CRQ-IV 04123456' },
  documentos: DOCUMENTOS_VALIDOS,
  ...sobrescrever,
});