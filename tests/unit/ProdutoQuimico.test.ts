import { ProdutoQuimico } from '../../src/domain/entities/ProdutoQuimico';
import { BusinessRuleError, ValidationError } from '../../src/domain/errors/DomainError';
import { produtoValido } from '../fixtures/produtos';

describe('Entidade ProdutoQuimico', () => {
  it('cadastra um produto válido como ATIVO por padrão', () => {
    const produto = ProdutoQuimico.criar(produtoValido());
    const dados = produto.toJSON();
    expect(dados.id).toBeDefined();
    expect(dados.nome).toBe('Etanol');
    expect(dados.status).toBe('ATIVO');
    expect(dados.createdAt).toBeInstanceOf(Date);
  });

  it('normaliza o número ONU com prefixo UN', () => {
    expect(ProdutoQuimico.criar(produtoValido({ numeroOnu: 'un1170' })).toJSON().numeroOnu).toBe('1170');
  });

  it.each([undefined, '', '   '])('bloqueia cadastro sem nome (%p)', (nome) => {
    expect(() => ProdutoQuimico.criar(produtoValido({ nome: nome as string }))).toThrow(
      new ValidationError('Um produto químico não pode ser cadastrado sem nome'),
    );
  });

  it('bloqueia cadastro sem classe de risco', () => {
    expect(() => ProdutoQuimico.criar(produtoValido({ classeRisco: undefined as unknown as string }))).toThrow(
      'Um produto químico não pode ser cadastrado sem classe de risco',
    );
  });

  it('bloqueia classe de risco inexistente', () => {
    expect(() => ProdutoQuimico.criar(produtoValido({ classeRisco: '10' }))).toThrow(/Classe de risco inválida/);
  });

  it('bloqueia cadastro com status inválido', () => {
    expect(() => ProdutoQuimico.criar(produtoValido({ status: 'PENDENTE' }))).toThrow(/Status de produto inválido/);
  });

  it('bloqueia número ONU inválido e grupo de compatibilidade inválido', () => {
    expect(() => ProdutoQuimico.criar(produtoValido({ numeroOnu: '12' }))).toThrow(/Número ONU inválido/);
    expect(() => ProdutoQuimico.criar(produtoValido({ grupoCompatibilidade: 'Z' }))).toThrow(/Grupo de compatibilidade/);
  });

  it('inativa o produto e impede inativar duas vezes', () => {
    const produto = ProdutoQuimico.criar(produtoValido());
    produto.inativar();
    expect(produto.estaAtivo).toBe(false);
    expect(() => produto.inativar()).toThrow(BusinessRuleError);
  });

  it('produto inativo não pode ser usado em carga', () => {
    const produto = ProdutoQuimico.criar(produtoValido({ status: 'INATIVO' }));
    expect(() => produto.garantirQuePodeSerUsadoEmCarga()).toThrow(
      'Uma carga química não pode ser registrada com produto químico inativo',
    );
  });

  it('atualiza revalidando os campos e mantém o status quando não informado', () => {
    const produto = ProdutoQuimico.criar(produtoValido());
    produto.atualizar(produtoValido({ nome: 'Etanol hidratado' }));
    expect(produto.toJSON().nome).toBe('Etanol hidratado');
    expect(produto.toJSON().status).toBe('ATIVO');
    expect(() => produto.atualizar(produtoValido({ nome: '' }))).toThrow(ValidationError);
  });
});