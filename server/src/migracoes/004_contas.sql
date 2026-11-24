-- Contas dos gestores pela tela de usuários (decisão do Paulo, 24/11/2026).
-- `trocar_senha`: a senha foi definida pelo administrador (provisória) e a pessoa
-- precisa trocá-la antes de usar o Hub. Enquanto for true, o back só aceita
-- ler/encerrar a sessão e trocar a senha.
ALTER TABLE usuarios ADD COLUMN trocar_senha boolean NOT NULL DEFAULT false;
ALTER TABLE usuarios ADD COLUMN senha_trocada_em timestamptz;
CREATE INDEX usuarios_organizacao ON usuarios (organizacao_id);
