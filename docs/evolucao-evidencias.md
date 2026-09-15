# Extratos, documentos e contexto da ONG

A criação automática revisada a partir do extrato e a exportação XLSX para o contador estão descritas no [guia de automação](automacao-e-contador.md). Use **Analisar extrato e documentos** em Conciliações para preparar transações novas sem cadastrá-las previamente.

## Como usar

1. Em **Conciliações**, escolha a conta e envie o XLSX. Selecione a planilha, o cabeçalho e as colunas. Ignore linhas de saldo e confira a revisão. O saldo permanece igual.
2. Em **Documentos**, escolha a conta e envie PDFs ou imagens. Abra **Revisar documento**, confira o original e corrija os campos antes de confirmar. Um arquivo ilegível fica disponível para preenchimento manual.
3. No menu do usuário, abra **Cadastros da ONG**. Cadastre instituições, programas, áreas, atividades, finalidades e fontes de recurso. Use **Contatos** para o cadastro principal de pessoas e fornecedores; o complemento permite vários e-mails e vínculos institucionais com períodos.
4. Abra uma transação pelo título ou por **Editar detalhes**. Em **Contexto e evidências**, escolha os cadastros, pessoas e comprovantes; confira movimentos e eventos sugeridos. Registre a justificativa e confirme ou deixe pendente.
5. **Documentação completa** é uma declaração humana após conferência. Exige documentos confirmados e contexto confirmado. Alterar a versão financeira ou revisar um documento exige nova conferência.
6. A conciliação financeira permanece em **Conciliações**: vincula o movimento à liquidação integral da mesma conta, data, direção e valor. Vincular evidências é uma ação diferente e não altera caixa.
7. Abra **Prestação de contas** pelo menu do usuário ou por Relatórios. Filtre por conta, CNPJ, período, categoria, dimensão, documentação, revisão e conciliação. Escolha programa, instituição, atividade, área, finalidade ou fonte de recurso para o gráfico. Clique no grupo ou em **Ver evidências**. A exportação refere-se à página visível; nomes e e-mails são opcionais e desmarcados inicialmente.

## Banco e integridade

Migrações aditivas `20260915000300_evidence.sql` e `20260915000400_evidence_review_indexes.sql`. Aplicação: `pnpm exec tsx scripts/migrate-evidence.ts`; `--cloud` somente para o projeto de teste já vinculado. O executor valida destino, usa bloqueio de migração e confere checksums. Migrações anteriores permanecem intactas.

| Entidade | Uso |
|---|---|
| `import_batches`, `import_rows` | Extrato XLSX reutiliza revisão/conciliação do OFX; CSV continua criando transações pendentes após confirmação |
| `documents` | Original privado e imutável, hash, texto, campos extraídos/revisados, origem, situação, duração e custo |
| `context_dimensions` | Instituição, programa, área, atividade, finalidade e fonte de recurso |
| `party_context` | E-mails adicionais, histórico de vínculos institucionais e observações; complementa `parties` |
| `entry_context` | Justificativa, situação de revisão, revisor, versão e declaração de documentação completa |
| `entry_dimensions`, `entry_contacts` | Associações contextuais, sem alocação monetária |
| `entry_documents`, `entry_movements`, `entry_events` | Relações muitos-para-muitos entre transações e evidências |
| `provider_connections`, `oauth_states` | Conexões individuais, seleção de recursos, credenciais cifradas e consentimentos temporários |
| `external_events`, `document_copies` | Identificadores estáveis dos provedores e estado de disponibilidade |

Fornecedores continuam em `entries.party_id`. Instituições relacionadas são dimensões independentes. Uma atividade pode ser associada a várias instituições e transações por seus vínculos de contexto. E-mails coincidentes não possuem restrição de unicidade nem provocam fusão de contatos.

Valores financeiros usam centavos inteiros; cálculos e somas usam bigint/NUMERIC no banco e BigInt no domínio. Evidências não escrevem no razão financeiro. Os relatórios filtram relações com EXISTS e somam cada transação uma vez. No gráfico, vários vínculos da dimensão selecionada formam uma combinação única; isso não substitui o rateio financeiro existente.

Comandos de revisão usam versão e chave de idempotência. O histórico registra ator, data, ação, motivo e mudanças. Reautorizações acontecem antes de reapresentar respostas idempotentes. Acesso a documentos verifica conta, CNPJ e as classificações das transações vinculadas. Documentos compartilhados com um lançamento fora do escopo não são expostos a esse usuário.

## APIs

Todas as rotas exigem autenticação. Mutação recebe JSON; comandos de domínio exigem `Idempotency-Key`; revisão recebe `X-Entity-Version` (ou `If-Match` para clientes diretos).

| Método / caminho | Finalidade |
|---|---|
| POST `/v1/xlsx/inspect` | Inspecionar planilhas/cabeçalhos sem gravar movimentos |
| POST `/v1/xlsx/import` | Mapear e persistir revisão do extrato |
| GET `/v1/documents` | Lista por conta/CNPJ, cursor `after` e busca exata por hash |
| POST `/v1/documents` | Original base64 e resultado de leitura; valida MIME, tamanho e duplicidade |
| GET `/v1/documents/:id` | Texto, campos e proveniência |
| GET `/v1/documents/:id/file` | Original autenticado em JSON/base64 para o visualizador |
| GET `/v1/documents/:id/original` | Original com cabeçalhos privados e restrição de conteúdo ativo |
| PATCH `/v1/documents/:id` | Corrigir/confirmar/rejeitar; invalida revisão de completude dos vínculos |
| GET/POST/PATCH `/v1/context/dimensions[/:id]` | Cadastros da ONG |
| GET/PATCH `/v1/parties/:id/context` | E-mails e vínculos institucionais revisados |
| GET/PATCH `/v1/entries/:id/context` | Consultar e revisar classificação e evidências |
| GET `/v1/entries/:id/suggestions` | Candidatos por valor/data e menções aos cadastros |
| GET `/v1/entries/:id/contact-suggestions` | Nomes/e-mails das evidências salvas, com possíveis contatos existentes |
| GET `/v1/reports/accountability` | Totais exatos, agrupamento por dimensão e transações paginadas |
| GET `/v1/integrations/google` | Configuração disponível e estado da conexão do usuário |
| POST `/v1/integrations/google/connect` | Iniciar consentimento |
| GET `/v1/integrations/google/callback` | Validar consentimento e trocar código por credenciais no servidor |
| GET `/v1/integrations/google/choices` | Pastas disponíveis ao aplicativo e agendas da pessoa |
| PATCH `/v1/integrations/google/settings` | Salvar pasta e até cinco agendas |
| POST `/v1/integrations/google/folders` | Criar pasta dedicada no Drive |
| POST `/v1/integrations/google/sync` | Consulta explícita de eventos do período |
| GET `/v1/integrations/google/events` | Eventos da conexão da pessoa e agendas selecionadas |
| POST `/v1/integrations/google/documents/:id` | Criar/verificar cópia autorizada do documento no Drive |
| POST `/v1/integrations/google/disconnect` | Remover credenciais locais e interromper uso da conexão |

Recursos de permissão adicionados: `documents`, `context`, `integrations`. Transações, contatos, importações, relatórios e exportações continuam sujeitos às respectivas permissões existentes. Conexões Google são individuais, inclusive para proprietários da organização.

## Extração, sugestões e custo

PDF.js extrai texto; páginas sem texto suficiente usam Tesseract em português. Imagens também usam Tesseract. Bibliotecas, worker, WASM e modelo de idioma são servidos pela própria aplicação. O processamento ocorre em worker no navegador e os arquivos de OCR são carregados quando usados. Não há serviço pago de OCR ou modelo generativo contratado. `cost_minor` registra zero de cobrança externa por leitura; `duration_ms` registra tempo de processamento, não custo de infraestrutura.

A extração de campos usa padrões de texto e pode deixar campos vazios. A pessoa pode corrigir todos os campos. A leitura não valida a autenticidade fiscal. Texto extraído, descrições e eventos são dados; não são executados como instruções.

As sugestões usam regras explícitas: valor igual, proximidade de datas e menção literal aos nomes dos cadastros. Elas não são probabilidades calibradas. E-mails/nomes coincidentes apresentam alternativas, sem fusão automática. O domínio de um e-mail não determina a instituição. Evento próximo não comprova finalidade; convite não comprova presença.

Limites atuais: XLSX 2 MB, 20 planilhas, 600 linhas por planilha, 50 colunas e até 500 movimentos importados; prévia de cabeçalhos e seleção para ignorar nas primeiras 100 linhas. Macros, referências externas e fórmulas não são executadas; fórmulas exigem substituição por valores. A validação do ZIP limita o tamanho descompactado a 20 MB.

Documentos: 1,5 MB por arquivo, lote de 10, PDF de até 10 páginas, imagem de até 12 megapixels, texto de até 60 mil caracteres. OCR tem limite de 90 segundos por reconhecimento. Arquivos grandes devem ser divididos ou reduzidos. Preserve a aba durante o processamento. Reenvio do mesmo hash reutiliza o documento/leitura na mesma conta. Cópias visualmente iguais mas com bytes diferentes podem exigir identificação manual.

O original canônico fica no banco privado, com quota inicial de 50 MB para este ambiente interno de teste. `DOCUMENT_QUOTA_BYTES` permite configuração explícita, limitada pelo código a 500 MB; aumentar não muda planos automaticamente. Este armazenamento é limitado e não substitui um serviço de objetos para acervos grandes. Drive recebe cópia opcional; falha ou exclusão no Drive não apaga o original canônico. Uploads no Drive reservam ID estável para evitar nova cópia em tentativas repetidas.

Índices cobrem conta/id nas listas, hash único por conta, referências reversas dos vínculos, período dos eventos e campos de valor/data usados nas correspondências. Listas de documentos e relatórios usam cursor e 50 registros por página. Consultas de sugestões são limitadas. Não foi realizado benchmark de escala em produção; limites e índices reduzem trabalho, mas a capacidade deve ser medida com o acervo real antes de ampliá-los.

## Ativação do Google

O código da integração está instalado, mas o projeto precisa de um cliente OAuth próprio. A conexão Google disponível ao agente não fornece esse cliente à aplicação.

1. No projeto Google Cloud autorizado, habilitar Drive API e Calendar API e configurar a tela de consentimento/testadores.
2. Criar cliente OAuth do tipo aplicação Web.
3. Cadastrar o retorno `https://black-finance-financeiro-test.vercel.app/v1/integrations/google/callback`.
4. Configurar `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no servidor Vercel. As credenciais não entram no navegador ou repositório. A aplicação usa a chave de autenticação existente para derivar a chave de cifra do cofre; rotacioná-la exige reconectar o Google.
5. Publicar a configuração e cada usuário escolher **Conectar Google**, autorizar, selecionar/criar pasta e escolher agendas.

OAuth usa state vinculado à sessão e ao usuário, expiração, uso único, PKCE e credenciais cifradas com AES-256-GCM. Escopos: `drive.file`, leitura de lista de calendários e leitura de eventos. Pastas listadas são as disponíveis ao aplicativo; não é solicitado acesso irrestrito ao Drive. A primeira versão permite criar uma pasta dedicada.

A consulta de agendas é manual, até 31 dias e 1.000 eventos por agenda. Eventos removidos ou fora da janela atualizada deixam de aparecer; seleções revogadas deixam de ser consultadas. O sistema não altera eventos, envia convites nem lê Gmail. Outros usuários não veem agendas privadas de uma pessoa; calendários compartilhados precisam ser autorizados e selecionados na própria conexão.

Referências de implementação: [OAuth Web Server](https://developers.google.com/identity/protocols/oauth2/web-server), [uploads do Drive](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [consulta de eventos](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [ExcelJS](https://github.com/exceljs/exceljs), [Tesseract.js](https://github.com/naptha/tesseract.js).

## Limitações explícitas

- Liquidação e conciliação financeiras permanecem integrais, uma liquidação por movimento. Relações vários-para-vários são evidências, não baixas parciais. Tarifas, descontos, estornos e reembolsos precisam de lançamentos/ajustes financeiros compatíveis; não se força uma correspondência divergente.
- Duplicidades entre formatos OFX/XLSX e documentos reprocessados com bytes diferentes requerem conferência humana. Um arquivo XLSX sem identificador pode conter dois movimentos legítimos idênticos; use identificadores distintos para distingui-los.
- Não há classificação generativa automática, análise semântica avançada, validação fiscal governamental, caixa de e-mail ou reconhecimento garantido de qualquer formato de nota.
- Google requer a configuração e o consentimento externos acima. Testes com provedor simulado não equivalem a conexão real validada.
- Outlook, OneDrive, Dropbox, tarefas automáticas de sincronização e compartilhamento organizacional de agendas privadas não foram ativados nesta versão. O modelo identifica provedor/conexão/ID externo para futuras integrações.
- A exportação é da página visível em CSV; não é pacote completo de documentos nem laudo de auditoria. DRE mantém o módulo próprio por caixa/competência; prestação de contas usa vencimento e transações não canceladas.

## Validação

Testes unitários cobrem Excel, valores, datas, fórmulas, extração de campos e integridade da cifra. Testes de integração verificam original privado, duplicidade/idempotência, revisão com versão, escopo de conta/usuário, muitos-para-muitos sem duplicar somas, conciliação sem postar novamente, completude declarada e trilha de revisão. Fluxo Google é exercitado com provedor simulado: state de uso único, agendas selecionadas, eventos ausentes, falha de acesso e desconexão.

As verificações visuais e os arquivos de evidência ficam no projeto local. Capturas de tela e documentos financeiros não são publicados no GitHub.

As mutações pelo navegador enviam `X-Entity-Version` para controle de concorrência, pois o proxy do Vercel interpreta `If-Match` antes da aplicação. A API direta mantém compatibilidade com `If-Match`; cabeçalhos divergentes são rejeitados. A versão continua sendo validada na transação do banco.

Em 15/09/2026, o fluxo completo foi aprovado no endereço público do Vercel: Excel sem alteração de saldo, PDF com texto, OCR de imagem em português, revisão humana, vínculo à transação, relatório e layout em celular. O lançamento fictício foi cancelado ao final. Compilação, lint e checagem de tipos aprovados; 14 testes unitários e 6 testes de integração aprovados durante a entrega. Após o ajuste de concorrência na nuvem, foram repetidos os testes financeiros, de evidências e de Google simulado.
