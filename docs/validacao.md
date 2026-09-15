# Registro de validação — 14/09/2026

Registro histórico da fundação local. Para o núcleo financeiro e a publicação Vercel, consulte [validação atual](validacao-financeira.md).

## Resultado local

Docker Desktop 4.91.0.239619, Docker CLI 29.8.0, Compose v5.5.1 e WSL 2.7.14.0 instalados e em execução no Windows build 26200.9445. O usuário realizou a reinicialização. Nenhum reset de dados foi necessário.

| Verificação | Resultado observado |
|---|---|
| TypeScript e ESLint | Aprovados |
| Testes unitários | 8 aprovados, zero falhas ou testes pulados |
| Integração Auth/Postgres | Login real, JWT/JWKS, suspensão imediata e permissões restritas aprovados |
| Configuração Auth | Provedor e-mail ativo e cadastro público desativado, verificados no serviço real |
| Integração fila | 20 claims concorrentes, deduplicação, heartbeat, lease expirado, fencing e última tentativa aprovados |
| Total de testes de integração | 2 aprovados, zero falhas ou testes pulados; worker pausado durante os testes e reiniciado após eles |
| Migrations | Aplicadas em Supabase Postgres 17; segunda execução sem migrations pendentes |
| Imagens da aplicação | Build de API/worker e site/Caddy concluído |
| Compose | API, worker e Caddy saudáveis |
| Worker real | Novo job noop inserido e concluído pelo processo no container |
| API | GET http://localhost:8080/health retornou status ok |
| Navegador Edge | Login, restauração da sessão após recarga, logout e rejeição de senha incorreta aprovados |
| Layout | Capturas desktop 1365×900 e mobile 390×844 inspecionadas; sem transbordamento horizontal |
| Erros no navegador | Zero erros JavaScript não tratados no fluxo testado |
| Caddy | Configuração validada dentro da imagem; HTTP local intencional |

Capturas sem senhas, tokens ou cookies: [login](screenshots/login-desktop.png), [acesso confirmado](screenshots/acesso-confirmado.png) e [mobile](screenshots/acesso-mobile.png).

Em uma leitura ociosa, API consumiu 33,7 MiB, worker 16,73 MiB e Caddy 20,65 MiB. Esses valores excluem Supabase, Docker Desktop e WSL; não representam teste de carga nem estimativa de capacidade.

## Correções verificadas durante a inicialização

- Docker encontrou sockets temporários inacessíveis após o reinício. Seus diretórios foram preservados com nomes de recuperação; o backend recriou os sockets e iniciou sem reset de volumes.
- Auth exigiu a indicação de operação de assinatura na chave ES256. O preparo agora gera/normaliza esse metadado e há teste de regressão.
- Desativar `auth.email.enable_signup` também desativava o login por e-mail. O provedor foi habilitado, mantendo `auth.enable_signup = false`. Os testes verificaram login e bloqueio de cadastro público após reiniciar Supabase preservando o banco.

Referências: [configuração do Supabase CLI](https://supabase.com/docs/guides/local-development/cli/config), [distinção entre provedor e cadastro](https://github.com/supabase/supabase/issues/40582), [seleção da chave no Auth v2.196.0](https://github.com/supabase/auth/blob/v2.196.0/internal/conf/jwk.go).

## Pendências fora da validação local

- Supabase gerenciado/Pro, SMTP, VPS, domínio e HTTPS remoto.
- Execução do pipeline em GitHub Actions.
- Experiência completa de MFA, recuperação e convites.
- Cadastros de CNPJs/contas, permissões por escopo e módulos financeiros das próximas seções.
- Benchmarks de carga e capacidade com dados financeiros.

A parte local do portão 0 foi validada; o portão completo depende das verificações remotas. Esta entrega é a fundação dockerizada, não o sistema financeiro completo.
