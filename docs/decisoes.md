# Decisões atuais

A implementação avançou da fundação para o núcleo financeiro. A VPS foi substituída, por instrução do usuário, pelo ambiente de teste Vercel/Neon. Consulte [arquitetura atual](arquitetura-vercel.md), [fórmulas](formulas.md) e [validação financeira](validacao-financeira.md). O conteúdo abaixo preserva as decisões históricas da seção 0.

# Decisões da implementação — seção 0

## ADR 001 — Stack adotada

Supabase Postgres/Auth/Storage; API Fastify e worker Node 24 em processos separados; React/Vite servido por Caddy. SQL explícito via `pg`. Um pacote raiz mantém o build simples, com diretórios por aplicação e domínio. Não há tenant, broker, Redis, ORM ou microsserviços adicionais.

## ADR 002 — Separação local e VPS

Compose descreve os três serviços implantáveis na VPS. O Supabase CLI oficial administra seus próprios containers no desenvolvimento. `docker-compose.local.yml` acrescenta a resolução de `host.docker.internal`; a API acessa Auth/DB locais por essa rota. O emissor validado no JWT continua sendo a URL pública do Auth, não o hostname interno do container.

## ADR 003 — Credenciais e autorização

Migration cria `app_runtime` sem senha hardcoded e com permissões explícitas. Bootstrap local gera segredo aleatório, usa credencial administrativa apenas para provisionamento e grava arquivos ignorados pelo Git. A identidade mínima referencia `auth.users.id`; cada `/v1/me` consulta `app.users.status` novamente. Sem usuário ativo, acesso negado. A matriz de CNPJ/conta e convites pertence à seção 1 e não está habilitada.

JWT: assinatura ES256/RS256, emissor, audiência `authenticated`, expiração, emissão, UUID do sujeito e papel verificados. JWKS com cache e prazo de consulta. Chaves de assinatura assimétricas locais são geradas antes de subir Auth; não há modo de aceitar JWT sem assinatura nem fallback para senha/segredo compartilhado.

MFA TOTP foi habilitado na configuração local do Auth. A interface de matrícula/desafio MFA ainda não foi implementada; não considerar a experiência de MFA homologada.

## ADR 004 — Fila mínima

`FOR UPDATE SKIP LOCKED` faz o claim; lease de 60 segundos, heartbeat a cada 15 e token por tentativa impedem que uma tentativa expirada conclua a tentativa mais recente. A última tentativa expirada é encerrada como falha. Polling ocioso cresce de 500 ms até 5 segundos; um handler por vez. O único handler habilitado é `noop`, suficiente para homologar a infraestrutura. Nenhum efeito financeiro ou envio externo foi implementado.

Um worker marcado `unhealthy` não é automaticamente reiniciado por Compose apenas por esse estado; ele continua tentando recuperar o banco. A política `unless-stopped` recupera saídas do processo. Supervisão e alertas operacionais serão necessários para produção.

## ADR 005 — Índices e recursos

A fundação usa PKs/uniques de usuários/jobs e dois índices parciais na fila: `(available_at,id)` para `queued` e `(lease_expires_at,id)` para `running`. Nenhum índice financeiro foi criado antes das tabelas correspondentes. Pools limitados a 10 conexões na API e 4 no worker; 2 segundos de timeout de consulta na API, 30 no worker e 500 ms de lock timeout.

As imagens foram baixadas e construídas. Em uma leitura ociosa, API consumiu 33,7 MiB, worker 16,73 MiB e Caddy 20,65 MiB, sem incluir Supabase, Docker Desktop ou WSL; isso não é benchmark de carga. O ambiente local omite Studio, Realtime, processamento de imagem, Edge Runtime e analytics. Supabase local não deve ser exposto à internet; suas portas de desenvolvimento devem continuar protegidas pelo host.

## ADR 006 — Migrations, CI e portão

O comando de inicialização aplica apenas migrations pendentes, sem apagar dados. A CI usa um banco local descartável e `db reset --local`, conforme o plano. Testes de integração exigem o Supabase local e recusam host/porta de produção. Não executar testes de fila com o worker da aplicação ativo.

**Parte local do portão 0 aprovada; portão remoto ainda aberto.** Imagens, migrations, oito testes unitários, dois testes de integração Auth/Postgres/fila, worker no container e navegação com login passaram. HTTPS na VPS e Supabase gerenciado ainda precisam ser validados. O pipeline existe, mas não foi enviado a um repositório remoto nem executado em GitHub Actions.

A chave ES256 local declara `key_ops: ["sign"]`, exigido pelo Auth utilizado. O preparo normaliza chaves anteriores preservando material e identificador. O provedor de e-mail permanece habilitado em `auth.email.enable_signup`; o cadastro público permanece bloqueado por `auth.enable_signup = false`. O teste real verifica ambas as condições.

## Ajustes conhecidos do plano para etapas futuras

A validade de URLs de upload assinado deve seguir a capacidade real da versão adotada do SDK/Storage; não presumir que `createSignedUploadUrl` aceita uma validade arbitrária de 1 hora. Buckets já foram descritos na migration, mas o fluxo de upload pertence à seção 3.

Os 21 relatórios, os testes de mil comandos financeiros e os testes de 100 mil lançamentos pertencem às próximas seções. Não há benchmark de capacidade nem promessa de latência nesta entrega.

## Fontes técnicas consultadas

- [Instalação oficial do Docker no Windows](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Instalação do WSL e necessidade de reinicialização](https://learn.microsoft.com/en-us/windows/wsl/install)
- [Supabase CLI e ambiente Docker local](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Assinatura assimétrica e JWKS do Supabase](https://supabase.com/docs/guides/auth/signing-keys)
- [Configuração do Supabase CLI](https://supabase.com/docs/guides/local-development/cli/config)
- [Versões do Node.js](https://nodejs.org/en/about/previous-releases)
