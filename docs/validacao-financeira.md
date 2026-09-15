# Validação dos módulos financeiros · 14/09/2026

## Evidências executadas

- TypeScript e ESLint passaram.
- Docker Compose recompilado com a versão final: API, worker e servidor web em execução, todos com healthcheck saudável.
- Build de produção da API e SPA passou; a área autenticada e o cliente Supabase local são carregados separadamente.
- Build local e build remoto pelo CLI oficial da Vercel passaram para o destino production, incluindo a função Node e a SPA.
- 8 testes unitários da fundação passaram.
- 3 testes de integração passaram: núcleo financeiro, Auth real/JWKS/revogação e fila/lease/fencing.
- A suíte financeira executou 1.002 comandos de criar, liquidar e reverter com valores pseudoaleatórios, além dos cenários de concorrência e transferências. Reconciliou livro, saldo e totais diários e comparou com o saldo esperado independentemente.
- 20 liquidações concorrentes com a mesma chave criaram um único evento. Com chaves diferentes, apenas uma foi aceita. Payload diferente na mesma chave foi rejeitado.
- Acesso restrito testado em lista, detalhe, painel e saldo; revogação bloqueou a chamada seguinte. Repetição de resposta idempotente após remoção da conta foi recusada.
- Último proprietário protegido: a remoção do único proprietário foi rejeitada.
- Data futura rejeitada; cancelamento de lançamento liquidado rejeitado; reversão recompôs a pendência e o saldo.
- Renomear/reclassificar categoria não mudou o grupo congelado na linha antiga.
- API runtime não pode atualizar o livro de caixa nem apagar a auditoria.
- Banco cloud de demonstração: 2 CNPJs, 4 contas, 200 lançamentos; reconciliação registrada em `demo-cloud-totals.json`.
- Navegador Edge, com o banco Neon real por servidor local: login, painel, criação, liquidação, reversão, cancelamento, contas, extrato e navegação móvel passaram. Zero erros JavaScript não tratados. Sem transbordamento horizontal do documento em 390 px; tabelas têm rolagem própria.

Capturas: [painel](screenshots/finance-dashboard.png), [lançamentos](screenshots/finance-transactions.png), [contas](screenshots/finance-accounts.png), [extrato](screenshots/finance-statement.png), [mobile](screenshots/finance-mobile.png), [formulário mobile](screenshots/finance-mobile-form.png). A suíte de navegador registra os resultados em `browser-finance-validation.json`.

## Publicação Vercel

Publicação concluída em 14/09/2026 no projeto de teste `black-finance-financeiro-test`, destino production, região iad1. URL estável: https://black-finance-financeiro-test.vercel.app. Versão verificada: https://black-finance-financeiro-test-62xrhptxu-black-finance.vercel.app.

`GET /health` retornou HTTP 200 com `status: ok`. O navegador Edge executou sobre HTTPS login, painel, criação de lançamento, liquidação, reversão, cancelamento, contas, extrato e navegação móvel. Todos passaram, sem erros JavaScript não tratados. O lançamento sintético usado no teste terminou cancelado, sem efeito líquido no saldo. As capturas financeiras e `browser-finance-validation.json` foram atualizadas com essa execução remota.

A primeira versão teve timeout ao iniciar conexões durante a importação do módulo serverless. A versão final inicia a conexão dentro da invocação, permite nova tentativa após falha de inicialização e aguarda o encerramento da resposta HTTP. O timeout de conexão cloud é 15 segundos; o limite de consulta financeira permanece 2 segundos. Credenciais configuradas exclusivamente nas variáveis da Vercel; não incluídas no repositório nem no ZIP.

## Não declarado como concluído

- Convite por e-mail, recuperação e MFA de ponta a ponta.
- Pipeline remoto no GitHub Actions (arquivo preparado).
- Aprovação humana de fórmulas/DRE; faturas, importações, recorrências e relatórios futuros.
- Carga de 100 mil lançamentos e SLOs da seção 6. Tempos do PC acessando Neon incluem rede e não são benchmark de produção.
