# Módulos financeiros de uso interno

Escopo solicitado em 15/09/2026: faturas, importações, conciliação OFX, DRE e recorrências. Uma organização, múltiplas contas e CNPJs internos. Preservar a navegação inspirada nas referências e a identidade Black Finance.

## Fluxos a entregar

- Fatura: itens, quantidades, valores, desconto, emissão, vencimento, contato e conta; geração de uma transação vinculada, consulta de situação e impressão. Documento gerencial, sem emissão fiscal ou envio automático ao cliente.
- Importação: arquivo CSV, prévia com validação por linha, confirmação explícita e relatório do resultado. Valores monetários exatos e proteção contra reimportação.
- OFX: leitura do extrato, identificação de duplicidades, revisão e vínculo com transações existentes. Importar o arquivo não deve alterar o saldo automaticamente.
- DRE gerencial: período, conta/CNPJ, competência ou caixa, grupos financeiros e detalhamento; transferências e saldo inicial excluídos do resultado. Valores não classificados devem continuar visíveis.
- Recorrências: modelo, frequência, início/fim, geração de transações pendentes, pausa e encerramento; uma ocorrência por data, sem liquidação automática.

## Critérios de validação

Reutilizar permissões e regras do núcleo financeiro. Confirmar atomicidade, idempotência, filtros de acesso, centavos exatos, duplicidades, datas de fim de mês e reversões. Testar navegação e formulários no computador e celular antes da publicação.

O registro interno de pagamentos e recebimentos foi preservado. Cobrança da assinatura, envio de dinheiro ao banco e emissão fiscal não fazem parte desta entrega.

Referência técnica OFX: [especificação Banking 2.3 da Financial Data Exchange](https://financialdataexchange.org/common/Uploaded%20files/OFX%20files/OFX%20Banking%20Specification%20v2.3.pdf), incluindo identificador FITID para duplicidades e valor assinado TRNAMT.

## Operação e limites

- Faturas: rascunho → emitida; cancelamento direto de rascunho. A situação financeira de uma emitida acompanha a transação vinculada. Correções de valor exigem cancelar a transação e emitir nova fatura, preservando o histórico. Quantidades inteiras, desconto fixo em reais e impressão pelo navegador. Sem cálculo fiscal ou disparo de mensagens.
- Importações: CSV em UTF-8 ou Windows-1252, separador ponto e vírgula ou vírgula, campos com aspas e quebras de linha. Cabeçalhos data, descricao, valor e id opcional. Valores negativos são despesas. Sem id, data/descrição/valor iguais são duplicidades; movimentos distintos devem fornecer ids distintos.
- OFX: extratos bancários/cartão em BRL, uma conta por arquivo, folhas SGML ou XML. Sem investimentos, correções bancárias automáticas, XML com entidades ou múltiplas contas. Conciliar exige transação já liquidada na mesma conta/data/direção/valor. Reversão posterior sinaliza o vínculo para revisão e permite vinculá-lo à nova liquidação.
- Arquivos: até 700 KB e 500 movimentos; prévia preserva erros por linha. CSV confirma até 24 linhas de cada vez, atomicamente. Nenhum conteúdo de arquivo é executado.
- Recorrências: semanal, mensal, trimestral ou anual, início e fim até dez anos. Geração explícita de até 24 ocorrências por confirmação. O dia original é preservado; dia 31 se ajusta ao último dia dos meses curtos. Não existe execução agendada em segundo plano. Pausa preserva o índice; retomar recupera datas pendentes.
- Listagens de módulos: até 200 registros recentes por conta/CNPJ. Faturas filtradas pela emissão no intervalo selecionado. Esse limite é explícito; não há alegação de paginação completa nesses módulos.
- DRE: receita bruta + deduções + impostos = receita líquida; somar despesas variáveis = resultado bruto; somar fixas e pessoal = operacional; somar não classificado = resultado total. Grupos de despesa usam valores negativos. Competência usa rateios não cancelados; caixa usa itens de liquidação e reversão nas respectivas datas. Transferências e abertura ficam fora.

## API e integridade

- GET/POST /v1/invoices; POST /v1/invoices/:id/issue e /cancel.
- GET/POST /v1/recurrences; POST /v1/recurrences/:id/generate, /pause, /resume e /end.
- GET/POST /v1/imports; GET /v1/imports/:id; POST /confirm; GET /candidates; POST /reconcile.
- GET /v1/reports/dre?from=...&to=...&basis=competence|cash.

Comandos usam chaves de idempotência; transições versionadas exigem If-Match. As autorizações são reavaliadas mesmo em repetição de comando. Permissões existentes invoices, imports, reconciliation, templates, reports e entries são reutilizadas. Nenhuma permissão de escrita no histórico ou no livro de caixa foi acrescentada.

Migration aditiva 20260915000200_internal_modules.sql. Fatura tem vínculo único com transação; ocorrência tem chave única por recorrência/data; fingerprint tem chave por conta/identificador externo; liquidação pode ter apenas um vínculo OFX. Índices de conta/data atendem às listagens e os índices existentes de rateios e liquidações atendem à DRE. Não foram adicionados Redis, outro servidor ou serviço pago. A prévia insere suas linhas em lote. Não foi realizado benchmark de grande volume; os limites de arquivo e confirmação contêm o custo por requisição.

## Validação

Testes unitários de parsing, centavos exatos, entidades XML e datas de recorrência. Integração real em PostgreSQL local: fatura/recebível, repetição de comandos, CSV duplicado/inválido, recorrência em fim de mês, OFX sem segundo movimento de caixa e DRE antes/depois de liquidação/reversão. Navegador e publicação: modules-browser-validation.json.
