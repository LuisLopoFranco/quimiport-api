import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import {
  BusinessRuleError,
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '../../../domain/errors/DomainError';

/**
 * Tradução de erros → HTTP. Formato padrão de erro:
 * { "erro": { "codigo": "...", "mensagem": "...", "detalhes": ... } }
 *
 * 400 ValidationError / ZodError  - dados de entrada inválidos
 * 404 NotFoundError               - recurso não existe
 * 409 ConflictError               - conflito (ex.: código duplicado)
 * 422 BusinessRuleError           - regra de negócio violada
 * 500                             - erro inesperado
 */
const STATUS_POR_ERRO = new Map<Function, number>([
  [ValidationError, 400],
  [NotFoundError, 404],
  [ConflictError, 409],
  [BusinessRuleError, 422],
]);

export const errorHandler: ErrorRequestHandler = (erro, req, res, _next) => {
  if (erro instanceof ZodError) {
    req.log?.warn({ issues: erro.issues }, 'Erro de validação');
    res.status(400).json({
      erro: {
        codigo: 'VALIDATION_ERROR',
        mensagem: 'Dados de entrada inválidos',
        detalhes: erro.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
      },
    });
    return;
  }

  if (erro instanceof DomainError) {
    const status = STATUS_POR_ERRO.get(erro.constructor) ?? 400;
    req.log?.warn({ codigo: erro.code, mensagem: erro.message, detalhes: erro.details }, 'Erro de domínio');
    res.status(status).json({ erro: { codigo: erro.code, mensagem: erro.message, detalhes: erro.details } });
    return;
  }

  // JSON malformado enviado pelo cliente
  if (erro?.type === 'entity.parse.failed') {
    res.status(400).json({ erro: { codigo: 'JSON_INVALIDO', mensagem: 'Corpo da requisição não é um JSON válido' } });
    return;
  }

  req.log?.error({ err: erro }, 'Erro interno não tratado');
  res.status(500).json({ erro: { codigo: 'INTERNAL_ERROR', mensagem: 'Erro interno do servidor' } });
};

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ erro: { codigo: 'ROTA_NAO_ENCONTRADA', mensagem: `Rota ${req.method} ${req.path} não existe` } });
};