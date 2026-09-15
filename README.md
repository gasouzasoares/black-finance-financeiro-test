# Black Finance · Gestão financeira interna

> Publicação parcial pelo conector: o arquivo `pnpm-lock.yaml` excedeu o limite técnico da revisão automática e as capturas em `docs/screenshots/` foram bloqueadas para revisão de dados. Esses arquivos permanecem no pacote local completo. Para reproduzir exatamente as dependências validadas, adicione o lockfile original antes de executar a instalação com `--frozen-lockfile`. O workflow está temporariamente limitado à execução manual até esse arquivo ser publicado.

Aplicação de teste para uma organização com múltiplos CNPJs e contas internas. Sem multi-tenancy. Interface com identidade Black Finance e componentes oficiais do shadcn/ui.

**Aplicação publicada:** https://black-finance-financeiro-test.vercel.app. A tela de acesso é pública; os dados financeiros exigem autenticação. A demonstração usa dados sintéticos.

## Implementado

- Painel com saldo realizado, a receber, a pagar, vencidos e movimentos diários.
- Empresas, contas, contatos, categorias, centros de custo e marcadores.
- Lançamentos com valores em centavos, rateio, vencimento e competência distintos, filtros e paginação por cursor.
- Liquidação integral, reversão e cancelamento com idempotência e versão do registro.
- Transferências entre contas/CNPJs e reversão dos dois lados em uma transação.
- Extrato por conta com saldo anterior, movimentos, saldo por linha e saldo final.
- Políticas por empresa, conta, direção e grupo; proteção do último proprietário e trilha de auditoria.

## Executar neste computador

Ambiente Docker/Supabase local:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/start-local.ps1
```

Aplicação em http://localhost:8080. Acesso local gerado em `.local/credentials.json`.

Preview da integração Vercel/Neon, usando o banco de demonstração já provisionado:

```powershell
pnpm build
pnpm exec tsx scripts/preview-cloud.ts
```

Aplicação em http://127.0.0.1:8090. Acesso desse teste em `.local/acesso-cloud.txt`; não compartilhar nem versionar. O preview exige os arquivos privados de configuração deste PC, excluídos do ZIP.

## Implantação Vercel

Projeto criado: `black-finance/black-finance-financeiro-test`. Banco Neon gratuito exclusivo: `black-finance-financeiro-test-db`, região us-east-1. Função Node na região iad1, autenticação Better Auth e SPA Vite. O Docker Compose permanece disponível para desenvolvimento local.

O banco e o administrador de teste estão provisionados. `APP_DATABASE_URL`, `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` estão configurados no ambiente production do projeto separado de teste, fora do código. Publicação e fluxo HTTPS verificados em 14/09/2026; consulte `docs/validacao-financeira.md`. Nenhum outro projeto foi modificado.

## Verificação

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Para integração local, pause o worker, execute `pnpm test:integration` e restaure o worker. A suíte exige Supabase local na porta 54322; cria apenas registros sintéticos e nunca executa contra o banco de produção. Os testes conservam seus registros no ambiente local.

## Arquivos principais

- `vercel.json`, `api/index.ts`: adaptação para Vercel Functions + SPA.
- `deploy/docker-compose.yml`: stack Docker local e alternativa VPS original.
- `supabase/migrations/20260915000100_financial_core.sql`: banco financeiro e índices.
- `packages/domain/src/finance.ts`: regras, transações e consultas.
- `packages/contracts/src/finance.ts`: validação dos contratos.
- `apps/api/src/finance-routes.ts`: endpoints.
- `apps/web/src`: interface Black Finance/shadcn.
- `scripts/provision-cloud.ts`: provisionamento exclusivo do projeto de teste, sem segredos no código.
- `scripts/seed-demo.ts` e `.sql`: 2 CNPJs, 4 contas e 200 lançamentos sintéticos.
- `docs/formulas.md`: definições e totais a conferir.
- `docs/arquitetura-vercel.md`: decisões da adaptação e limites.
- `docs/validacao-financeira.md`: resultados e evidências.

## Limites desta etapa

Este é o núcleo financeiro de teste até a seção 2. Convites e recuperação por e-mail, MFA completo, recorrências/parcelamento, arquivos, importações/OFX, faturas/PDF, os 21 relatórios e API externa ainda não estão concluídos. A matriz inclui os grupos futuros, mas não os habilita como funcionalidades.

O plano fornecido prevê a conferência humana das fórmulas após a seção 2, antes de relatórios, faturas e importações. Não há pagamentos bancários reais, emissão fiscal, multi-moeda nem promessa de desempenho em produção.
