import { z } from 'zod';
import { STATUS_CARGA } from '../../../domain/value-objects/StatusCarga';
import { STATUS_PRODUTO } from '../../../domain/value-objects/StatusProduto';

/**
 * Validação de FORMATO na borda HTTP (tipos, tamanhos, formatos).
 * As regras de NEGÓCIO (nome obrigatório, quantidade > 0, produto ativo...)
 * ficam no domínio, para valer igualmente em REST, GraphQL e testes.
 */
const textoOpcional = (max: number) => z.string().max(max).optional();

export const produtoBodySchema = z.object({
  nome: textoOpcional(150),
  descricao: z.string().max(2000).nullish(),
  numeroOnu: textoOpcional(6),
  classeRisco: textoOpcional(3),
  grupoCompatibilidade: z.string().max(1).nullish(),
  status: z.string().optional(),
});

export const produtoQuerySchema = z.object({
  status: z.enum(STATUS_PRODUTO).optional(),
});

const documentoSchema = z.object({
  tipo: z.string(),
  numero: z.string().max(60),
  dataValidade: z.iso.date({ message: 'dataValidade deve estar no formato AAAA-MM-DD' }),
});

export const cargaBodySchema = z.object({
  codigo: textoOpcional(30),
  produtoQuimicoId: z.uuid({ message: 'produtoQuimicoId deve ser um UUID' }).optional(),
  quantidade: z.number({ message: 'quantidade deve ser numérica' }),
  unidadeMedida: z.string(),
  origem: textoOpcional(150),
  destino: textoOpcional(150),
  responsavelTecnico: z
    .object({ nome: textoOpcional(150), registroProfissional: textoOpcional(50) })
    .nullish(),
  documentos: z.array(documentoSchema).max(20).optional(),
  dataEntrada: z.iso.datetime({ offset: true }).or(z.iso.date()).optional(),
});

export const documentoBodySchema = documentoSchema;

export const cargaQuerySchema = z.object({
  status: z.enum(STATUS_CARGA).optional(),
  produtoQuimicoId: z.uuid().optional(),
});

export const alterarStatusSchema = z.object({
  status: z.enum(STATUS_CARGA, { message: `status deve ser um de: ${STATUS_CARGA.join(', ')}` }),
  motivo: z.string().max(500).optional(),
});

export const motivoSchema = z.object({ motivo: z.string().max(500).optional() }).optional();

export const idParamSchema = z.object({ id: z.uuid({ message: 'id deve ser um UUID válido' }) });