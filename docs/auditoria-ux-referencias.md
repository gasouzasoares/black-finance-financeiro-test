# Revisão de UX/UI com referências do Procfy

## Evidência e limites

Referências: os 11 prints fornecidos pelo usuário nesta conversa. Imagens 1–2: painel. Imagens 3–8 e 10: variações da mesma lista de transações; 5 e 10 repetem Despesas variáveis. Imagem 9: faturas. Imagem 11: relatórios. As imagens não foram incorporadas ao repositório público.

VERIFIED indica observação nos prints ou no código/teste identificados. INFERRED indica hipótese de UX. UNKNOWN indica comportamento não demonstrado pelas imagens. DOCUMENTED indica o plano de construção fornecido. Esta é uma revisão heurística com testes funcionais, não um estudo com usuários nem uma certificação de acessibilidade.

## Comparação e decisões

| Referência / achado | Evidência | Decisão nesta entrega |
|---|---|---|
| Painel reúne visão financeira e compromissos próximos | VERIFIED, imagens 1–2 | Atalhos para receitas, despesas, hoje e vencidos junto ao painel; preservam conta, empresa e período |
| Troca de mês tem acesso direto | VERIFIED, imagens 3–8 | Setas de mês anterior/próximo e retorno ao mês atual, mantendo datas explícitas |
| Receitas e tipos de despesa são acessos da mesma lista | VERIFIED, imagens 3–8 e 10 | Abas Todos/Receitas/Despesas; grupos gerenciais quando se escolhe Despesas |
| Totais ficam próximos à operação | VERIFIED, imagens 3–10 | A receber/recebido/a pagar/pago calculados no servidor para todo o filtro; a aba específica mostra só seu par de totais |
| Contato e categoria aparecem na linha | VERIFIED, imagem 3 | Coluna Contato/Categoria e valores claros quando não classificados |
| Listas vazias oferecem uma ação | VERIFIED, imagens 4–10 | Estado vazio com limpeza dos refinamentos e criação, quando autorizada |
| Busca atual perdia o foco durante atualizações | VERIFIED, inspeção do componente anterior | Barra preservada durante carregamento, debounce de 300 ms e teste de foco |
| Registros pagos mantinham a legenda A pagar/A receber | VERIFIED, código anterior | Legendas Pago/Recebido conforme o estado; situação explícita na coluna |
| Formulário não herdava a intenção da lista | VERIFIED, código anterior | Receita ou despesa pré-selecionada pela aba; mudança do tipo limpa categorias incompatíveis |
| Lista com muitas colunas exige esforço no celular | INFERRED, revisão da interface anterior | Lista em cartões no celular, com descrição, valor, conta, categoria, vencimento e situação; detalhes acessíveis pelo título |
| 50 registros tornavam a página muito longa | INFERRED, revisão visual | 20 registros por página e tabela com rolagem interna no desktop; resumo continua abrangendo todo o filtro |
| Faturas, relatórios e conciliação aparecem no menu original | VERIFIED, imagens 9 e 11; só o acesso à conciliação está visível | Guia informa claramente os módulos ainda planejados; não foram criadas telas que aparentam funcionar sem implementação |

## Lacunas funcionais preservadas

| Frente | Estado nesta versão | O que precisa ser definido/validado |
|---|---|---|
| Faturas | Não implementada | Emissão, numeração atômica, estados, integração com recebíveis e documentos próprios. Imagem 9 só comprova a lista e seus filtros |
| DRE e catálogo de relatórios | Não implementados | Regimes, fórmulas, filtros, reconciliação e exportação. A imagem 11 não comprova a fórmula usada pelo produto original |
| Previsto versus realizado e comparativos percentuais do painel | Parcial: valores pendentes e realizados, sem equivalência com os indicadores do Procfy | Separar vencimento, competência e realização; definir tratamento de denominador zero. Não reproduzir 100% sobre valores zerados |
| Calendário mensal | Agenda em lista com filtros hoje/vencidos, sem grade mensal | Navegação, dias com compromissos e semântica de múltiplos eventos |
| Importação / OFX | Não implementados | Parser, prévia, deduplicação, confirmação e reversão seguras |
| Recorrências / parcelamento | Não implementados | Geração idempotente, edição da série, cancelamento e datas |
| Pagamentos parciais | Não implementados | Distribuição por rateio e saldo remanescente; hoje a liquidação é integral |
| Anexos, notificações e documentos | Não implementados | Armazenamento, permissões, limites e entrega |

O plano de construção original documenta validação de fórmulas antes de relatórios/faturas/importações. Os prints trazem referências de apresentação; não comprovam esse aceite nem todas as regras desses módulos. A entrega concentra as adições na rotina financeira existente e registra as próximas frentes para revisão.

## Contrato e desempenho

`GET /v1/entries/summary` usa a mesma autorização e o mesmo construtor de filtros da lista. Retorna `count`, `receivable_minor`, `payable_minor`, `received_minor` e `paid_minor`. Valores monetários seguem strings de centavos inteiros; cancelados contam na quantidade quando selecionados, mas não nos totais financeiros.

Lista e resumo aceitam `direction`, `group`, `party_id`, `category_id`, `cost_center_id`, `label_id` e `focus=today|overdue`, além dos filtros existentes. Período é obrigatório e limitado a 12 meses. Hoje e vencidos são pendências **dentro desse período**. A limpeza de refinamentos mantém conta, CNPJ e período, conforme indicado junto à lista.

Os totais seguem **vencimento**, inclusive os estados Pago/Recebido. Não representam fluxo de caixa por realização nem DRE por competência. Filtrar uma categoria/grupo/centro seleciona lançamentos que contenham essa classificação e totaliza o valor integral de cada lançamento, uma vez. Essa regra é indicada quando um grupo é selecionado; relatórios de valores por linha de rateio continuam fora desta entrega.

O resumo ignora cursor e limite e não é buscado novamente ao trocar somente a página. Lista usa paginação por chave e busca com debounce. Nomes de categorias são consultados somente para as linhas retornadas. Sem cache adicional, Redis, nova infraestrutura ou novos índices nesta entrega. Consultas aproveitam os índices existentes de conta/vencimento, rateios por lançamento e chave composta de marcadores. A busca ILIKE continua limitada pelo período; desempenho em 100 mil registros **não foi aferido** nesta revisão. Avaliar EXPLAIN e p95 nesse volume antes de introduzir índices condicionais de classificação ou busca textual.

## Programa de revisão e aceite

1. Repetir tarefas reais: cadastrar receita, localizar despesa, registrar pagamento, corrigir liquidação e conferir extrato.
2. Registrar se cada tarefa foi concluída sem ajuda, número de passos, dúvidas de nomenclatura e erros de interpretação. Não há medição com participantes nesta entrega.
3. Conferir desktop/celular, teclado, foco, nomes acessíveis, contraste, carregamento, erro e estado vazio. Revisão manual com leitor de tela continua pendente.
4. Validar a mesma combinação de filtros na lista e no resumo, incluindo segunda página, cancelados, outra conta e perfil restrito.
5. Antes de novas funcionalidades financeiras, definir sua regra de negócio e o exemplo esperado; só depois integrar à navegação.

Evidências automatizadas: `ui-validation.json`, `ux-reference-validation.json`, `browser-finance-validation.json` e testes de integração financeira. Capturas locais: `docs/screenshots/ux-dashboard.png`, `ux-transactions-desktop.png` e `ux-transactions-mobile.png`. Repositório público recebe apenas código e documentação textual; as referências do usuário e credenciais ficam fora.
