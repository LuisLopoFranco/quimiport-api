import { CriarProdutoQuimicoInput } from '../../src/application/dtos/ProdutoQuimicoDTO';

export const produtoValido = (sobrescrever: Partial<CriarProdutoQuimicoInput> = {}): CriarProdutoQuimicoInput => ({
  nome: 'Etanol',
  descricao: 'Álcool etílico anidro',
  numeroOnu: '1170',
  classeRisco: '3',
  ...sobrescrever,
});