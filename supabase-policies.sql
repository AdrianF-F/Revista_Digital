-- SQL sugerido para Supabase (pique: ajustar conforme necessidade)
-- 1) Habilitar RLS:
ALTER TABLE public.trabalhos ENABLE ROW LEVEL SECURITY;

-- 2) Permitir INSERT para todos (envio público). Aqui assumimos que aprovacao será false por padrão.
CREATE POLICY allow_insert_public ON public.trabalhos
  FOR INSERT
  WITH CHECK ( true );

-- 3) Permitir UPDATE/DELETE/APROVE só para admins (por email). Substitua/ajuste se usar claims/roles.
-- OBS: esta é uma política simples usando auth.jwt() ->> 'email'. Em produção prefira claims customizadas.
CREATE POLICY admins_modify ON public.trabalhos
  FOR ALL
  USING (
    auth.jwt() ->> 'email' IN (
      'miguel.rocha.cardoso@escola.pr.gov.br',
      'francisco.silva.adrian@escola.pr.gov.br'
    )
  );

-- 4) Alternativa para UPDATE/DELETE especificamente:
CREATE POLICY admins_update ON public.trabalhos
  FOR UPDATE
  USING ( auth.jwt() ->> 'email' IN ('miguel.rocha.cardoso@escola.pr.gov.br','francisco.silva.adrian@escola.pr.gov.br') );

CREATE POLICY admins_delete ON public.trabalhos
  FOR DELETE
  USING ( auth.jwt() ->> 'email' IN ('miguel.rocha.cardoso@escola.pr.gov.br','francisco.silva.adrian@escola.pr.gov.br') );
