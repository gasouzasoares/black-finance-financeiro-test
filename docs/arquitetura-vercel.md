# Arquitetura do ambiente de teste na Vercel

## Mudança autorizada

O pedido de VPS foi substituído explicitamente pelo usuário por um teste na Vercel. Criou-se um projeto separado e um banco Neon gratuito pela integração existente da equipe. Nenhum outro projeto foi alterado. A aplicação está publicada em https://black-finance-financeiro-test.vercel.app.

| Camada | Implementação |
|---|---|
| Interface | React/Vite, assets estáticos pela Vercel |
| API | Fastify dentro de Vercel Function Node 24; caminhos /v1 |
| Autenticação cloud | Better Auth 1.7.4, cookie HttpOnly, cadastro público fechado, sessão persistida no banco |
| Banco cloud | Neon Postgres gratuito via Marketplace; TLS com verificação do certificado |
| Banco local | Supabase Postgres 17, com Auth/JWKS original preservado |
| Conexões | Cloud: no máximo 3 por instância, attachDatabasePool; local API 10 / worker 4 |
| Região | Banco us-east-1; função configurada iad1 |

A API usa `app_runtime`, sem superuser ou DDL. No cloud, esse papel tem permissões explícitas nas tabelas financeiras e nas tabelas de autenticação. A conexão administrativa serve apenas ao provisionamento. Nenhum segredo entra na SPA, no código ou nos arquivos de entrega.

A inicialização de conexões ocorre dentro da invocação da função e é compartilhada entre requisições concorrentes. Uma falha inicial limpa a promessa para permitir recuperação na chamada seguinte. Timeout de conexão cloud de 15 segundos para o despertar do banco; o limite das consultas financeiras continua em 2 segundos. A função aguarda o término da resposta antes de concluir sua execução.

O worker contínuo do Compose não é implantado como processo persistente na Vercel. As seções futuras precisarão de jobs por funções/Workflow/Queues, conforme suas durações. Não há PDF, importação ou envio de e-mail rodando em segundo plano nesta entrega.

## Modelo financeiro

`organization_profile` é singleton. `legal_entities → accounts → entries → entry_allocations`. Liquidações ficam em `settlements` e `settlement_items`; fatos de caixa em `cash_postings`. Projeções `account_balances` e `cash_daily` são atualizadas na mesma transação. `transfers` liga os dois lados; `audit_events` é append-only.

Todos os comandos financeiros usam chave de idempotência; alterações de agregados usam If-Match. Contas são bloqueadas por ID crescente, depois o lançamento. Respostas repetidas são reautorizadas com a política atual. Razão da reversão/cancelamento fica no histórico. Livro de caixa não recebe UPDATE/DELETE do runtime.

O núcleo mantém os índices Base I01–I07, I09–I11 e I21 do plano, mais PKs, unicidades e constraints necessárias. Não foram adicionados índices condicionais para relatórios ainda inexistentes. B-tree de conta/data atende extrato; índice parcial de linhas pendentes atende a futura consulta especializada de agenda. O endpoint atual de agenda usa o filtro de cabeçalho pendente, garantindo o mesmo escopo integral de autorização da lista.

Estimativas do plano por um milhão de linhas: I01 30–50 MB; I02/I07 40–60 MB; I03 5–8 MB com 15% pendentes; I04–I06 30–50 MB cada; I09 55–90 MB. São estimativas, não medições de capacidade do banco gratuito. O dataset desta etapa não comprova os SLOs da seção 6.

## Autorização

`access_policies` centraliza permissões e listas de CNPJs/contas/direções/grupos por usuário. É uma adaptação enxuta das tabelas de papéis do plano: não há edição/reutilização de papéis compartilhados nesta etapa. Arrays vazios negam acesso. Um lançamento só aparece integralmente quando todas as linhas são autorizadas. Saldo exige direito próprio; extrato integral exige também todas as direções e grupos da conta. Histórico global é exclusivo do proprietário.

Alterações de política têm trava transacional para proteger o último proprietário; não há bloqueio de sessão que possa consumir o pool esperando outra conexão. A situação do usuário e a política são consultadas em cada requisição. Os 19 grupos de configuração estão visíveis; direitos de módulos futuros não tornam esses módulos disponíveis.

## Identidade visual

Skill aplicada: Black Finance identidade visual. Logo original `LOGO CENTRAL VAZADO16.svg`, sem redesenho; Kumbh Sans Regular/Bold originais e licença OFL preservados. Paleta principal: #06231D, #104238, #ECEDEA, #E3EF26, #076653 e #8E9781. Branco das superfícies e cor de erro são adaptações funcionais do produto; não são novas cores oficiais da marca.

Componentes oficiais shadcn/ui adicionados por CLI: Button, Card, Input, Label, Textarea, Badge, Table, Dialog, AlertDialog, Sheet, Separator e Skeleton. Seletores simples usam o elemento nativo por acessibilidade móvel. Raios, breakpoints, densidade e hierarquia da aplicação são escolhas do projeto. Semibold não foi apresentado como arquivo disponível: a interface utiliza os pesos originais 400 e 700, sem síntese de fonte.

## Limites explícitos

Convites/recuperação por e-mail e MFA completo estão pendentes. A rota de convite responde EMAIL_NOT_CONFIGURED e a tela informa esse limite. Não há envio automático para terceiros. Lançamento já liquidado e revertido preserva suas linhas: edição de valor/rateio é recusada; a correção nessa situação exige cancelamento e novo registro. A conta não muda de CNPJ pela API desta etapa. Cadastros/listas administrativas têm limite de 1.000/200 registros; paginação por cursor existe nas listas financeiras e no extrato.

O ambiente é de teste, não uma homologação de operação financeira ou produção. O portão 1 completo segue pendente pelo fluxo de convites; o núcleo da seção 2 foi implementado e testado para revisão, sem declarar aprovação humana nem as seções seguintes concluídas.
