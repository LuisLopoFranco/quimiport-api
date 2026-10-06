import { ValidationError } from '../errors/DomainError';

/**
 * Objeto de valor: responsável técnico da carga (ex.: químico com registro no CRQ).
 * Nesta fase fica embutido na carga; numa fase futura pode virar uma entidade
 * própria com cadastro e autenticação.
 */
export class ResponsavelTecnico {
  private constructor(
    readonly nome: string,
    readonly registroProfissional: string,
  ) {}

  static criar(input: { nome?: string; registroProfissional?: string } | undefined | null): ResponsavelTecnico {
    if (!input || !input.nome?.trim()) {
      throw new ValidationError('Toda carga deve possuir responsável técnico informado');
    }
    if (!input.registroProfissional?.trim()) {
      throw new ValidationError('O registro profissional do responsável técnico é obrigatório');
    }
    return new ResponsavelTecnico(input.nome.trim(), input.registroProfissional.trim());
  }
}