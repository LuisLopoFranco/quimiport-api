import { ValidationError } from '../errors/DomainError';

export const UNIDADES_MEDIDA = ['KG', 'T', 'L', 'M3'] as const;
export type UnidadeMedida = (typeof UNIDADES_MEDIDA)[number];

/**
 * Objeto de valor: quantidade + unidade.
 * Imutável e sempre válido. Se existe uma instância, a quantidade é > 0.
 */
export class Quantidade {
  private constructor(
    readonly valor: number,
    readonly unidade: UnidadeMedida,
  ) {}

  static criar(valor: number, unidade: string): Quantidade {
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
      throw new ValidationError('A quantidade da carga deve ser maior que zero');
    }
    if (!(UNIDADES_MEDIDA as readonly string[]).includes(unidade)) {
      throw new ValidationError(`Unidade de medida inválida. Use: ${UNIDADES_MEDIDA.join(', ')}`);
    }
    return new Quantidade(valor, unidade as UnidadeMedida);
  }
}