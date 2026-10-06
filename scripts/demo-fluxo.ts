/*
 * Refaz o fluxo de demonstração (o mesmo das requisições 4 a 10 do docs/api/quimiport.http)
 * e mostra o resultado de cada passo. Funciona em qualquer terminal:
 *
 *   npm run demo
 *
 * A API precisa estar no ar (npm run dev ou Docker). Outro endereço: API_URL=http://... npm run demo
 */
const BASE = process.env.API_URL ?? 'http://localhost:3000';
const ETANOL = '11111111-1111-4111-8111-111111111111';

let falhas = 0;

async function chamar(metodo: string, caminho: string, corpo?: unknown) {
  const resposta = await fetch(BASE + caminho, {
    method: metodo,
    headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await resposta.text();
  return { status: resposta.status, json: texto ? JSON.parse(texto) : null };
}

async function passo(nome: string, esperado: number, metodo: string, caminho: string, corpo?: unknown) {
  const r = await chamar(metodo, caminho, corpo);
  const ok = r.status === esperado;
  if (!ok) falhas++;
  const detalhe = r.json?.erro ? ` - ${r.json.erro.mensagem}` : '';
  console.log(`${ok ? '✔' : '✘'} ${nome}: ${r.status} (esperado ${esperado})${detalhe}`);
  return r;
}

async function main() {
  console.log(`API: ${BASE}\n`);

  try {
    await chamar('GET', '/health');
  } catch {
    console.error('A API não respondeu. Suba com "npm run dev" (ou Docker) e rode de novo.');
    process.exit(1);
  }

  // O Etanol do seed precisa existir e estar ATIVO
  const etanol = await chamar('GET', `/produtos-quimicos/${ETANOL}`);
  if (etanol.status === 404) {
    console.error('O produto Etanol do seed não existe. Rode "npm run db:seed" e tente de novo.');
    process.exit(1);
  }
  if (etanol.json.status !== 'ATIVO') {
    const { nome, descricao, numeroOnu, classeRisco } = etanol.json;
    await passo('reativar o Etanol', 200, 'PUT', `/produtos-quimicos/${ETANOL}`, {
      nome, descricao, numeroOnu, classeRisco, status: 'ATIVO',
    });
  }

  // Código novo a cada execução, para não dar 409 (código repetido)
  const codigo = `QP-DEMO-${Date.now().toString().slice(-6)}`;
  const registro = await passo(`registrar carga ${codigo}`, 201, 'POST', '/cargas-quimicas', {
    codigo,
    produtoQuimicoId: ETANOL,
    quantidade: 25000,
    unidadeMedida: 'L',
    origem: 'Terminal Alemoa - Santos/SP',
    destino: 'Paulínia/SP',
    responsavelTecnico: { nome: 'Maria Souza', registroProfissional: 'CRQ-IV 04123456' },
    documentos: [{ tipo: 'FISPQ', numero: 'FISPQ-ETANOL-01', dataValidade: '2027-12-31' }],
  });
  if (registro.status !== 201) process.exit(1);
  const id = registro.json.id;

  await passo('Registrada → Em análise', 200, 'PATCH', `/cargas-quimicas/${id}/status`, { status: 'EM_ANALISE' });
  await passo('Em análise → Em inspeção', 200, 'PATCH', `/cargas-quimicas/${id}/status`, { status: 'EM_INSPECAO' });
  await passo('liberar sem a ficha de emergência (regra)', 422, 'PATCH', `/cargas-quimicas/${id}/liberar`);
  await passo('anexar a ficha de emergência', 201, 'POST', `/cargas-quimicas/${id}/documentos`, {
    tipo: 'FICHA_EMERGENCIA', numero: 'FE-1170-01', dataValidade: '2027-12-31',
  });
  await passo('liberar', 200, 'PATCH', `/cargas-quimicas/${id}/liberar`);
  await passo('Liberada → Registrada (proibida)', 422, 'PATCH', `/cargas-quimicas/${id}/status`, { status: 'REGISTRADA' });

  const graphql = await chamar('POST', '/graphql', {
    query: '{ cargasPorStatus(status: LIBERADA) { codigo produtoQuimico { nome } } }',
  });
  console.log('\nGraphQL, cargas liberadas:');
  console.log(JSON.stringify(graphql.json, null, 2));

  console.log(falhas ? `\n${falhas} passo(s) com resultado inesperado.` : '\nTodos os passos deram o resultado esperado.');
  process.exit(falhas ? 1 : 0);
}

main();
