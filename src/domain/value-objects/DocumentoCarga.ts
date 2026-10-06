import { ValidationError } from '../errors/DomainError';

export const TIPOS_DOCUMENTO = [
  'FISPQ',
  'FICHA_EMERGENCIA',
  'NOTA_FISCAL',
  'LAUDO_TECNICO',
  'CERTIFICADO_ANALISE',
  'OUTRO',
] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

/**
 * Documentos sem os quais uma carga química não pode ser liberada.
 * FISPQ (Ficha de Informações de Segurança de Produtos Químicos) e Ficha de
 * Emergência são exigidos no transporte de produtos perigosos no Brasil.
 */
export const DOCUMENTOS_OBRIGATORIOS: readonly TipoDocumento[] = ['FISPQ', 'FICHA_EMERGENCIA'];

export interface DocumentoCargaProps {
  tipo: TipoDocumento;
  numero: string;
  dataValidade: Date;
}

/** Objeto de valor: um documento anexado à carga. */
export class DocumentoCarga {
  private constructor(readonly props: Readonly<DocumentoCargaProps>) {}

  static criar(input: { tipo: string; numero: string; dataValidade: Date | string }): DocumentoCarga {
    if (!(TIPOS_DOCUMENTO as readonly string[]).includes(input.tipo)) {
      throw new ValidationError(`Tipo de documento inválido. Use: ${TIPOS_DOCUMENTO.join(', ')}`);
    }
    if (!input.numero || !input.numero.trim()) {
      throw new ValidationError('O número do documento é obrigatório');
    }
    const dataValidade = new Date(input.dataValidade);
    if (Number.isNaN(dataValidade.getTime())) {
      throw new ValidationError('Data de validade do documento inválida');
    }
    return new DocumentoCarga({
      tipo: input.tipo as TipoDocumento,
      numero: input.numero.trim(),
      dataValidade,
    });
  }

  get tipo() {
    return this.props.tipo;
  }
  get numero() {
    return this.props.numero;
  }
  get dataValidade() {
    return this.props.dataValidade;
  }

  /** Um documento é válido até o fim do dia de validade. */
  estaValidoEm(data: Date): boolean {
    const fimDoDia = new Date(this.props.dataValidade);
    fimDoDia.setUTCHours(23, 59, 59, 999);
    return fimDoDia.getTime() >= data.getTime();
  }
}