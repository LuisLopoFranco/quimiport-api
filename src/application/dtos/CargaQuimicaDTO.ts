import { CargaQuimica } from '../../domain/entities/CargaQuimica';
import { MaquinaEstadosCarga } from '../../domain/services/MaquinaEstadosCarga';
import { ProdutoQuimicoOutput } from './ProdutoQuimicoDTO';

export interface DocumentoInput {
  tipo: string;
  numero: string;
  dataValidade: string;
}

export interface RegistrarCargaQuimicaInput {
  codigo: string;
  produtoQuimicoId: string;
  quantidade: number;
  unidadeMedida: string;
  origem: string;
  destino: string;
  responsavelTecnico: { nome: string; registroProfissional: string };
  documentos?: DocumentoInput[];
  dataEntrada?: string;
}

export interface CargaQuimicaOutput {
  id: string;
  codigo: string;
  produtoQuimicoId: string;
  produtoQuimico?: ProdutoQuimicoOutput;
  quantidade: number;
  unidadeMedida: string;
  origem: string;
  destino: string;
  responsavelTecnico: { nome: string; registroProfissional: string };
  documentos: { tipo: string; numero: string; dataValidade: string }[];
  documentosPendentes: string[];
  status: string;
  motivoBloqueio: string | null;
  proximosStatusPermitidos: string[];
  dataEntrada: string;
  createdAt: string;
  updatedAt: string;
}


export function toCargaOutput(carga: CargaQuimica, produto?: ProdutoQuimicoOutput): CargaQuimicaOutput {
  const c = carga.toJSON();
  return {
    ...c,
    ...(produto ? { produtoQuimico: produto } : {}),
    documentosPendentes: carga.documentosPendentes(),
    proximosStatusPermitidos: [...MaquinaEstadosCarga.proximosStatus(carga.status)],
    dataEntrada: c.dataEntrada.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}