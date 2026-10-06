import { randomUUID } from 'node:crypto';
import { BusinessRuleError, ValidationError } from '../errors/DomainError';
import {
  ClasseRisco,
  CLASSES_RISCO_VALIDAS,
  GrupoCompatibilidade,
  GRUPOS_COMPATIBILIDADE,
  isClasseRisco,
  isGrupoCompatibilidade,
} from '../value-objects/ClasseRisco';
import { isStatusProduto, STATUS_PRODUTO, StatusProduto } from '../value-objects/StatusProduto';

export interface ProdutoQuimicoProps {
  id: string;
  nome: string;
  descricao: string | null;
  numeroOnu: string;
  classeRisco: ClasseRisco;
  grupoCompatibilidade: GrupoCompatibilidade | null;
  status: StatusProduto;
  createdAt: Date;
  updatedAt: Date;
}

export interface DadosProdutoQuimico {
  nome?: string;
  descricao?: string | null;
  numeroOnu?: string;
  classeRisco?: string;
  grupoCompatibilidade?: string | null;
  status?: string;
}

/** Número ONU: 4 dígitos (ex.: 1203 para gasolina). Aceita o prefixo "UN". */
const NUMERO_ONU_REGEX = /^(UN)?\d{4}$/i;

export class ProdutoQuimico {
  private constructor(private props: ProdutoQuimicoProps) {}

  /** Cria um produto novo aplicando todas as regras de cadastro. */
  static criar(dados: DadosProdutoQuimico, agora: Date = new Date()): ProdutoQuimico {
    const validado = ProdutoQuimico.validar(dados);
    return new ProdutoQuimico({
      id: randomUUID(),
      ...validado,
      status: validado.status ?? 'ATIVO',
      createdAt: agora,
      updatedAt: agora,
    });
  }

  /** Reconstrói um produto a partir do banco (dados já confiáveis). */
  static restaurar(props: ProdutoQuimicoProps): ProdutoQuimico {
    return new ProdutoQuimico({ ...props });
  }

  private static validar(dados: DadosProdutoQuimico) {
    if (!dados.nome || !dados.nome.trim()) {
      throw new ValidationError('Um produto químico não pode ser cadastrado sem nome');
    }
    if (!dados.classeRisco) {
      throw new ValidationError('Um produto químico não pode ser cadastrado sem classe de risco');
    }
    if (!isClasseRisco(dados.classeRisco)) {
      throw new ValidationError(`Classe de risco inválida. Use: ${CLASSES_RISCO_VALIDAS.join(', ')}`);
    }
    if (!dados.numeroOnu || !NUMERO_ONU_REGEX.test(dados.numeroOnu.trim())) {
      throw new ValidationError('Número ONU inválido. Informe 4 dígitos (ex.: 1203 ou UN1203)');
    }
    const grupo = dados.grupoCompatibilidade ?? null;
    if (grupo !== null && !isGrupoCompatibilidade(grupo)) {
      throw new ValidationError(
        `Grupo de compatibilidade inválido. Use: ${GRUPOS_COMPATIBILIDADE.join(', ')}`,
      );
    }
    if (dados.status !== undefined && !isStatusProduto(dados.status)) {
      throw new ValidationError(`Status de produto inválido. Use: ${STATUS_PRODUTO.join(', ')}`);
    }
    return {
      nome: dados.nome.trim(),
      descricao: dados.descricao?.trim() || null,
      numeroOnu: dados.numeroOnu.trim().toUpperCase().replace(/^UN/, ''),
      classeRisco: dados.classeRisco,
      grupoCompatibilidade: grupo as GrupoCompatibilidade | null,
      status: dados.status as StatusProduto | undefined,
    };
  }

  /** Atualização completa (PUT). Revalida todos os campos. */
  atualizar(dados: DadosProdutoQuimico, agora: Date = new Date()): void {
    const validado = ProdutoQuimico.validar(dados);
    this.props = {
      ...this.props,
      ...validado,
      status: validado.status ?? this.props.status,
      updatedAt: agora,
    };
  }

  inativar(agora: Date = new Date()): void {
    if (this.props.status === 'INATIVO') {
      throw new BusinessRuleError('O produto químico já está inativo');
    }
    this.props.status = 'INATIVO';
    this.props.updatedAt = agora;
  }

  /** Regra: um produto inativo não deve ser usado em novas cargas. */
  garantirQuePodeSerUsadoEmCarga(): void {
    if (!this.estaAtivo) {
      throw new BusinessRuleError(
        'Uma carga química não pode ser registrada com produto químico inativo',
        { produtoQuimicoId: this.props.id },
      );
    }
  }

  get estaAtivo(): boolean {
    return this.props.status === 'ATIVO';
  }
  get id() {
    return this.props.id;
  }
  toJSON(): ProdutoQuimicoProps {
    return { ...this.props };
  }
}