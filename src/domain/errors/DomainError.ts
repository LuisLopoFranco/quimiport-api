/**
 * Erros de domínio.
 *
 * Cada classe representa uma categoria de falha que a camada de apresentação
 * traduz para um código HTTP (ver presentation/http/middlewares/errorHandler.ts).
 * O domínio não conhece HTTP: ele só diz "o que" deu errado.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Dados de entrada inválidos (campo ausente, formato errado). */
export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR';
}

/** Uma regra de negócio impediu a operação (ex.: produto inativo, transição proibida). */
export class BusinessRuleError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION';
}

/** Recurso não encontrado. */
export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND';
}

/** Conflito com o estado atual (ex.: código de carga duplicado). */
export class ConflictError extends DomainError {
  readonly code = 'CONFLICT';
}