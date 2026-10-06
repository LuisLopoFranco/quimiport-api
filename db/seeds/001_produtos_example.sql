-- Produtos de exemplo comuns no Porto de Santos (idempotente)
INSERT INTO produtos_quimicos (id, nome, descricao, numero_onu, classe_risco, grupo_compatibilidade, status)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Etanol', 'Álcool etílico anidro combustível', '1170', '3', NULL, 'ATIVO'),
  ('22222222-2222-4222-8222-222222222222', 'Ácido sulfúrico', 'Solução com mais de 51% de ácido', '1830', '8', NULL, 'ATIVO'),
  ('33333333-3333-4333-8333-333333333333', 'Hidróxido de sódio', 'Soda cáustica em solução', '1824', '8', NULL, 'ATIVO'),
  ('44444444-4444-4444-8444-444444444444', 'Amônia anidra', 'Gás liquefeito sob pressão', '1005', '2.3', NULL, 'ATIVO'),
  ('55555555-5555-4555-8555-555555555555', 'Nitrato de amônio', 'Fertilizante oxidante', '1942', '5.1', NULL, 'INATIVO')
ON CONFLICT (id) DO NOTHING;