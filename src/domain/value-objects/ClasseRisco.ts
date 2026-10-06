/**
 * Classes e subclasses de risco da ONU (Recomendações da ONU para o Transporte
 * de Produtos Perigosos / Código IMDG, usado no transporte marítimo).
 */
export const CLASSES_RISCO = {
  '1': 'Explosivos',
  '2.1': 'Gases inflamáveis',
  '2.2': 'Gases não inflamáveis e não tóxicos',
  '2.3': 'Gases tóxicos',
  '3': 'Líquidos inflamáveis',
  '4.1': 'Sólidos inflamáveis',
  '4.2': 'Substâncias sujeitas a combustão espontânea',
  '4.3': 'Substâncias que, em contato com água, emitem gases inflamáveis',
  '5.1': 'Substâncias oxidantes',
  '5.2': 'Peróxidos orgânicos',
  '6.1': 'Substâncias tóxicas',
  '6.2': 'Substâncias infectantes',
  '7': 'Material radioativo',
  '8': 'Substâncias corrosivas',
  '9': 'Substâncias e artigos perigosos diversos',
} as const;

export type ClasseRisco = keyof typeof CLASSES_RISCO;
export const CLASSES_RISCO_VALIDAS = Object.keys(CLASSES_RISCO) as ClasseRisco[];

export function isClasseRisco(valor: unknown): valor is ClasseRisco {
  return typeof valor === 'string' && valor in CLASSES_RISCO;
}

/**
 * Grupos de compatibilidade (letras A a S, sem I, M, O, P, Q, R) usados pela
 * ONU para segregar explosivos (classe 1). Para as demais classes o campo é opcional.
 */
export const GRUPOS_COMPATIBILIDADE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'N', 'S'] as const;
export type GrupoCompatibilidade = (typeof GRUPOS_COMPATIBILIDADE)[number];

export function isGrupoCompatibilidade(valor: unknown): valor is GrupoCompatibilidade {
  return typeof valor === 'string' && (GRUPOS_COMPATIBILIDADE as readonly string[]).includes(valor);
}