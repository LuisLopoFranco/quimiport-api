import { buildSchema } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';
import { BuscarProdutoQuimico } from '../../application/use-cases/produtos/BuscarProdutoQuimico';
import { ListarCargasQuimicas } from '../../application/use-cases/cargas/ListarCargasQuimicas';
import { NotFoundError } from '../../domain/errors/DomainError';
import { MaquinaEstadosCarga } from '../../domain/services/MaquinaEstadosCarga';
import { isStatusCarga, STATUS_CARGA } from '../../domain/value-objects/StatusCarga';

/**
 * Diferencial opcional: um endpoint GraphQL pequeno e somente leitura.
 *
 * Cenário de uso: um painel do porto quer, numa única chamada, as cargas de um
 * status com apenas alguns campos e os dados do produto de cada uma. Em REST
 * isso exigiria N+1 chamadas (lista + um GET por produto); em GraphQL o cliente
 * escolhe os campos e o servidor resolve as associações.
 *
 * Reutiliza os MESMOS casos de uso da API REST: nenhuma regra é duplicada.
 */
export const typeDefs = /* GraphQL */ `
  enum StatusCarga { ${STATUS_CARGA.join(' ')} }

  type ProdutoQuimico {
    id: ID!
    nome: String!
    descricao: String
    numeroOnu: String!
    classeRisco: String!
    grupoCompatibilidade: String
    status: String!
  }

  type CargaQuimica {
    id: ID!
    codigo: String!
    quantidade: Float!
    unidadeMedida: String!
    origem: String!
    destino: String!
    status: StatusCarga!
    documentosPendentes: [String!]!
    proximosStatusPermitidos: [StatusCarga!]!
    produtoQuimico: ProdutoQuimico
  }

  type ValidacaoTransicao {
    de: StatusCarga!
    para: StatusCarga!
    permitida: Boolean!
  }

  type Query {
    "Cargas filtradas por status"
    cargasPorStatus(status: StatusCarga!): [CargaQuimica!]!
    "Detalhes de um produto químico"
    produtoQuimico(id: ID!): ProdutoQuimico
    "Consulta a máquina de estados sem alterar nada"
    validarTransicao(de: StatusCarga!, para: StatusCarga!): ValidacaoTransicao!
  }
`;

export function criarGraphqlHandler(deps: { listarCargas: ListarCargasQuimicas; buscarProduto: BuscarProdutoQuimico }) {
  const schema = buildSchema(typeDefs);

  const buscarProdutoOuNull = async (id: string) => {
    try {
      return await deps.buscarProduto.executar(id);
    } catch (erro) {
      if (erro instanceof NotFoundError) return null;
      throw erro;
    }
  };

  const rootValue = {
    cargasPorStatus: async ({ status }: { status: string }) => {
      if (!isStatusCarga(status)) return [];
      const cargas = await deps.listarCargas.executar({ status });
      return cargas.map((c) => ({ ...c, produtoQuimico: () => buscarProdutoOuNull(c.produtoQuimicoId) }));
    },
    produtoQuimico: ({ id }: { id: string }) => buscarProdutoOuNull(id),
    validarTransicao: ({ de, para }: { de: string; para: string }) => ({
      de,
      para,
      permitida: isStatusCarga(de) && isStatusCarga(para) && MaquinaEstadosCarga.podeTransitar(de, para),
    }),
  };

  return createHandler({ schema, rootValue });
}