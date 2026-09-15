# Análise automática e entrega ao contador

## Fluxo de uso

1. Em **Documentos**, envie as notas e comprovantes na conta bancária correspondente. O PDF/imagem é lido pelo OCR já instalado. Confira os dados quando necessário. Se o Google estiver conectado, marque **Salvar também no Google Drive**; o link fica na revisão do documento.
2. Em **Conciliações**, envie o extrato XLSX ou OFX. No Excel, confira planilha, cabeçalho, colunas de entradas/saídas e linhas de saldo antes de importar.
3. Abra o arquivo e clique em **Analisar extrato e documentos**. O sistema prepara uma proposta para cada movimento pendente. Rascunhos existentes são preservados; uma interrupção permite continuar pelos movimentos restantes.
4. Abra **Revisar proposta**. Confira descrição, categoria, fornecedor, competência, instituições, programa, pessoas, justificativa, notas e eventos. Nomes e e-mails encontrados aparecem com a origem. Um novo contato só é criado ao aprovar sua proposta; contatos ambíguos exigem escolha.
5. Clique em **Aprovar e conciliar**. Para um movimento novo, a mesma operação cria a transação, registra a realização na data bancária e concilia. Para uma transação existente, ela é reutilizada; se estiver pendente, será liquidada. Não há envio de pagamentos ao banco. **Salvar sem lançar** e **Rejeitar proposta** não alteram saldo.
6. Para reutilizar classificações, preencha um termo em **Regra para próximas análises**. A regra vale para sua conta de usuário, conta bancária e direção. Pode ser desativada em **Atividades, agenda de apoio e regras de classificação**.
7. Em **Relatórios → Prestação de contas e evidências**, escolha os filtros e o agrupamento. Use **Copiar gráfico**, **Baixar gráfico PNG** ou **Baixar pacote do contador (XLSX)**.

## Agenda e triangulação

A análise combina descrição bancária, valor, direção, datas, emitente/CPF/CNPJ, contatos existentes, documentos e eventos autorizados. Uma única nota de mesmo valor e emissão em até sete dias pode ser pré-selecionada. Notas já vinculadas não são escolhidas automaticamente. Transações semelhantes são apresentadas para evitar duplicidade. Regras de palavras ajudam a sugerir alimentação, combustível, estacionamento e transporte quando há categorias compatíveis cadastradas.

Um evento único no dia pode ser sugerido somente como contexto, com aviso explícito sobre esse critério. Vários eventos exigem escolha. Participantes convidados não são tratados como presença comprovada. Instituições e programas são sugeridos por menções aos cadastros e regras aprovadas. Não há percentuais de confiança artificiais nem modelo generativo contratado.

Se a conexão Google estiver ativa e o usuário puder atualizá-la, o botão consulta as agendas selecionadas para extratos de até 31 dias. Para períodos maiores, utiliza os eventos já sincronizados e informa essa limitação. Falhas do Google são mostradas; não impedem a análise do extrato e das notas. Rascunhos com agendas revogadas não podem ser aprovados sem reanálise.

**Atividades cadastradas** permitem registrar data, nome, descrição, participantes e dimensões da ONG, inclusive antes de conectar Google. São registros privados do usuário, sem aprovação financeira implícita. Cancelamentos preservam o histórico. A mesma área está disponível na Agenda.

A conexão real Google continua dependendo de `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e consentimento de cada conta, conforme [guia de integração](evolucao-evidencias.md). Nenhuma conexão do agente é transferida para o aplicativo.

## Excel para o contador

O pacote contém:

- **Leia primeiro:** período, filtros, critérios e orientações.
- **Lançamentos:** uma linha por transação, conta/CNPJ, direção, valores, competência, realização, fornecedor, programa, instituição, área, atividade, finalidade, fonte, justificativa e revisão.
- **Rateios e contas:** categorias, centros de custo, valores rateados e mapeamento de débito/crédito informado pela organização.
- **Extrato importado:** descrição e identificador originais, datas, valores, situação e transação vinculada, incluindo movimentos ainda pendentes.
- **Comprovantes:** notas vinculadas, dados extraídos/revisados, hash e links privados do Drive disponíveis para quem exportou.
- **Agenda e atividades:** vínculos de contexto autorizados.
- **Pendências:** ausência de nota, documentação incompleta, revisão, conciliação e códigos contábeis faltantes.
- **Resumo:** valores agrupados para construir gráficos editáveis no Excel.
- **Contatos:** somente se a opção de incluir nomes/e-mails estiver marcada.

O XLSX exporta todo o filtro, não apenas as 50 linhas visíveis. Limites: 5.000 transações, 5.000 movimentos, 20.000 rateios e 10.000 comprovantes vinculados. Se exceder, reduza o período/conta. O extrato usa data bancária e filtros de conta/CNPJ; os demais filtros de classificação aplicam-se aos lançamentos. Os gráficos mostram até 30 grupos; os dados completos das transações estão nas demais abas. Valores em centavos permanecem exatos; valores além da precisão numérica do Excel são exportados como texto.

Os links do Drive permanecem privados. O contador precisa ter acesso aos arquivos; exportar não cria compartilhamentos. Códigos de débito/crédito vazios aparecem como pendência. O pacote auxilia a preparação contábil e não é um formato de escrituração/importação específico de software do contador.

## DRE

Apresentação com indicadores de receita e resultado, grupos expansíveis, linhas de subtotal e detalhamento por categoria. Mantidos os cálculos existentes por caixa e competência; transferências/saldos iniciais não compõem o resultado. A impressão permite salvar em PDF.

## Integridade, arquitetura e limites

Migração aditiva: `20260915000500_analysis.sql`. Tabelas: `analysis_proposals`, `classification_rules`, `planned_activities`, `entry_planned_activities`, `accounting_mappings`. Índices: proposta única por movimento/usuário, estado/usuário, regra por conta/direção/termo e atividade por usuário/data. Os índices anteriores de documento/valor/data e importação são reutilizados.

O pacote XLSX tem limite de 3 MB; reduza o período ou filtre uma conta se necessário.

O motor é determinístico (`rules-v1`) e utiliza o OCR local existente. Não foi contratado serviço de IA nem alterado plano. Cada movimento é processado em requisição própria, com progresso e rascunho persistido. Não há processamento automático em segundo plano depois de fechar a aba.

Aprovação usa uma transação de banco para criação, liquidação, conciliação e vínculos, com rollback integral se qualquer parte falhar. Comandos idempotentes, versões, restrição única de movimento/liquidação e escopo de conta evitam repetição de lançamentos. Alterar uma nota ou transação após a análise exige reanálise. A aprovação não declara documentação completa automaticamente.

Transferências entre contas, investimentos/resgates, pagamentos parciais, tarifas agregadas e várias notas para um pagamento exigem conferência e operações financeiras compatíveis. Evidências podem ter vários vínculos, mas não criam rateios monetários implícitos. Correspondências financeiras continuam integrais. Vínculos contextuais não multiplicam valores.

APIs adicionadas:

| Rota | Uso |
|---|---|
| GET/POST `/v1/imports/:batch/analysis` | Listar propostas / analisar um movimento |
| GET/PATCH `/v1/imports/:batch/analysis/:id` | Consultar / revisar rascunho |
| POST `.../:id/approve`, `reject`, `restart` | Aprovar atomicamente, rejeitar ou descartar rascunho e reanalisar |
| GET/POST `/v1/context/activities` | Consultar / criar atividade |
| PATCH `/v1/context/activities/:id` | Editar/cancelar atividade com versão |
| GET `/v1/context/rules` | Consultar regras do usuário |
| POST `/v1/context/rules/:id/disable` | Desativar regra |
| GET `/v1/documents/:id/copies` | Consultar links privados na conexão autorizada |
| GET `/v1/reports/accountant.xlsx` | Gerar XLSX com filtros e evidências |
| GET/PATCH `/v1/reports/accounting-mappings` | Consultar / revisar códigos contábeis |

As mutações usam `Idempotency-Key` e `X-Entity-Version` quando há revisão de registro. Permissões existentes de conciliação, documentos, contatos, contexto, criação, liquidação e exportação são aplicadas separadamente. Arquivos, textos de notas e eventos são dados, nunca instruções executáveis.

## Verificação

15 testes unitários e 7 testes de integração aprovados nesta entrega. Cobertura inclui aprovação sem alteração anterior de saldo, repetição de comandos, transação existente, bloqueio de duplicidade, rollback de falha posterior à liquidação, escopo de conta, extração do XLSX gerado e preservação das regras de DRE/recorrências. Compilação, checagem de tipos e lint aprovados. A conexão Google real permanece pendente de ativação externa.

Validação no navegador da versão pública em 15/09/2026: PDF e extrato XLSX fictícios, descrição preenchida pela nota, saldo preservado antes da aprovação, criação/liquidação/conciliação, download do pacote XLSX e PNG, DRE em desktop/celular. Nenhum erro JavaScript. Lançamentos fictícios revertidos e cancelados; saldo restaurado. Registro: `automation-browser-validation.json`.
