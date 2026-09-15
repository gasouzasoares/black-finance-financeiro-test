# Estrutura do Procfy com identidade Black Finance

Esta revisão substitui as decisões de navegação anteriores. Referências: os 11 prints enviados e as capturas da auditoria de 14/09/2026, especialmente NAVEGACAO-MENU, DASHBOARD, TRANSACOES-RAPIDO e TRANSACOES-FILTROS. Não são uma nova confirmação de sessão autenticada. Não foram usados código ou recursos gráficos do Procfy.

## Disposição aplicada

| Área | Implementação |
|---|---|
| Entrada | Abre na Página inicial; guia na ajuda e no menu do usuário |
| Navegação | Página inicial, Transações, Faturas, Contatos, Relatórios; separador; Importações e Conciliações (OFX) |
| Perfil | Cadastros, contas bancárias, configurações, usuários, agenda e histórico |
| Organização | Seletor de CNPJ no rodapé do menu; uma única organização |
| Painel | Duas colunas de indicadores à esquerda; conta, calendário e compromissos à direita |
| Indicadores | Previsto/realizado com anéis, fluxo diário com linha, comparativo e últimas alterações |
| Transações | Resumo superior, conta à direita, mês à esquerda, grupos na mesma linha |
| Tabela | Data, descrição, contato, categoria, valor, tipo, modo, Pago? e ações |
| Inclusão | Nova transação abaixo do cabeçalho; formulário completo no botão + |
| Pagamento | Switch abre confirmação e usa liquidação/reversão com versão e idempotência |
| Totais | Abaixo da lista, à direita; abrangem todo o filtro |
| Celular | Menu lateral, blocos empilhados e tabela com rolagem horizontal local |

O logo escuro é um original Black Finance. Kumbh Sans e a paleta da organização foram mantidos. Tons de receita/despesa são semânticos, não novas cores institucionais.

## Regras dos indicadores

- Previsto/realizado considera transações não canceladas pelo vencimento. Percentual = liquidado / (liquidado + pendente). Sem previsão, exibe traço, não 100%.
- Fluxo mostra movimento líquido por realização, não saldo acumulado ou DRE.
- Previsão da conta = saldo atual + receitas pendentes − despesas pendentes no período. Não é reconstrução de saldo passado.
- Comparativo usa o período anterior de igual duração, com datas na ajuda. Grupos somam linhas de rateio sem duplicar lançamentos. Sem base anterior, percentual indefinido.
- Calendário e compromissos usam pendências no período. Clicar no dia abre suas transações.
- Histórico mostra somente transações acessíveis, filtradas por vencimento. Histórico geral continua exclusivo do proprietário.
- Ordenação por data, descrição ou valor, crescente/decrescente. Cursor de outra ordenação é rejeitado.
- Transações: 20 registros por página. Transferências: até 200, filtradas por conta, CNPJ, período e motivo.
- Inclusão rápida salva pendente, com competência igual ao vencimento. Detalhes podem ser editados no formulário completo.

## Diferenças funcionais explícitas

Esta entrega aproxima a disposição e os fluxos existentes; não estabelece equivalência funcional integral.

Faturas, importações e OFX ocupam suas posições e abrem aviso de indisponibilidade. Relatórios oferece o extrato existente; DRE e demais relatórios permanecem pendentes. Anexos não mostram capacidade ou consumo fictícios. Pagamentos parciais, parcelamento e recorrências continuam ausentes. Transações são individuais, à vista e de liquidação integral; o modo de pagamento não é armazenado e aparece como Indefinido. Seleção de linhas oferece soma e limpeza, sem operações financeiras em lote.

Não foram reproduzidos assinatura, promoção, links de suporte, identidade ou ilustrações do Procfy. O banner representa o ambiente de teste Black Finance.

## Verificação

Integração: totais, calendário, histórico visível, ordenação/paginação, filtros de transferências, perfil restrito e invariantes após mais de mil comandos. Navegador: login, perfil, grupos, inclusão rápida, pagamento, reversão, cancelamento, filtros, mês, transferências, extrato e celular. Resultado da publicação em `reference-layout-validation.json`.

Capturas locais: `reference-dashboard.png`, `reference-transactions.png`, `reference-mobile.png`, `reference-transactions-mobile.png`. Referências originais e arquivos de acesso ficam fora do repositório público.
