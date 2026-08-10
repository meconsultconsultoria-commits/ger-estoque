# GER — Gestão de Estoque e Registros

Versão preparada para execução externa em Cloudflare Workers + D1.

## Infraestrutura

- Worker: `ger-estoque`
- D1: `ger-estoque-db`
- Binding: `DB`
- R2: não utilizado

## Instalação e build

```bash
npm ci
npm run build
```

## Deploy

```bash
npx wrangler deploy
```

Antes do primeiro acesso, execute `schema.sql` no Console do D1 `ger-estoque-db`.
Com o banco vazio, a tela inicial permitirá criar o primeiro administrador.

A autenticação externa é feita por e-mail e senha. O código não depende mais do Sign in with ChatGPT.

Consulte `MIGRACAO_CLOUDFLARE.md` para detalhes de migração e tratamento dos dados do ambiente anterior.
