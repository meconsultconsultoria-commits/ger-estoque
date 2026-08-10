# GER Estoque — Migração para Cloudflare própria

Este pacote deriva da versão publicada 11 do GER — Gestão de Estoque e Registros.

## Infraestrutura de destino

- Worker: `ger-estoque`
- D1 binding: `DB`
- D1 database: `ger-estoque-db`
- D1 database id: `be6985c6-0ce9-4729-9085-d422fd1bc389`
- R2: não utilizado

## Alterações necessárias para independência do ChatGPT Sites

1. Removido o empacotamento ativo `.openai/hosting.json` / plugin `sites()`.
2. Removido o uso de `Sign in with ChatGPT` e dos cabeçalhos `oai-authenticated-*`.
3. Adicionada autenticação própria por e-mail e senha, sessão de 8 horas e cookie HttpOnly/Secure/SameSite=Lax.
4. Adicionada tabela `sessions` e coluna `users.password_hash`.
5. Removida a rotina que criava automaticamente 10 movimentações DEMO no primeiro login do administrador.
6. O e-mail deixa de ser um administrador mestre codificado; o primeiro usuário criado no banco vazio se torna administrador.
7. Mantidas as regras operacionais da versão 11: capacidade 120 t, alertas, Entrada/Saída/Ajuste, programação e auditoria.

Os arquivos específicos do ChatGPT Sites foram preservados apenas em `_migration_reference/` para auditoria e não participam do build.

## Banco

Execute `schema.sql` no Console do D1 `ger-estoque-db` antes do primeiro acesso.

O primeiro acesso ao Worker, com a tabela `users` vazia, exibirá o cadastro do administrador inicial.

## Build/deploy

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

## Dados do GER antigo

O pacote não contém as linhas do D1 administrado pelo ChatGPT Sites. Não desligue o GER antigo até que o saldo e o histórico necessários tenham sido reconciliados no novo ambiente.
