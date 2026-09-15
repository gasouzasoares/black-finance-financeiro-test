# Fórmulas e dataset de referência · seção 2

Valores persistidos como BIGINT em centavos e transmitidos como strings. Operações monetárias em TypeScript usam BigInt. O formulário usa vírgula decimal e rejeita valores ambíguos como `123.45`.

## Datas e estados

- `due_on`: vencimento; utilizado na lista, agenda e pendências do painel.
- `competence_on`: competência; preservada separadamente para relatórios futuros.
- `settled_on` / `effective_on`: realização de caixa. Data futura e data anterior à abertura da conta são rejeitadas. Reversão não pode anteceder o evento original.
- Dia corrente: America/Sao_Paulo. Datas civis não são convertidas em instantes UTC.
- Lançamento: `open → settled → open` por reversão; `open → cancelled` por cancelamento.
- Transferência: `confirmed → reversed`, com os dois lados sempre na mesma transação.

## Definições

**Saldo realizado por conta** = soma de todos os `cash_postings.signed_minor`, incluindo abertura, liquidações, transferências e reversões. Deve coincidir com `account_balances.balance_minor` e com a soma de `cash_daily.net_minor`.

**Saldo anterior do extrato** = soma dos movimentos anteriores ao início do período. **Saldo por linha** = saldo anterior + soma acumulada dos movimentos por `(effective_on,id)`. **Saldo final** = saldo anterior + movimentos dentro do período, independentemente da página exibida.

**A receber / a pagar** = soma dos cabeçalhos pendentes, da direção correspondente, com vencimento entre as datas escolhidas. **Vencidos** = soma das receitas e despesas pendentes desse período cujo vencimento é anterior ao dia corrente. Não é vencido apenas por vencer hoje.

**Saldo do painel** considera todas as datas das contas selecionadas. Os cards de pendências consideram o período. Essa diferença está indicada nos próprios cards.

Todo cabeçalho tem pelo menos uma linha. A soma dos rateios deve coincidir com o valor total, verificada também por constraint diferida do banco. Liquidação integral copia o valor de cada linha para seu item e gera o movimento correspondente. O grupo gerencial é congelado na linha ao confirmar; editar a categoria depois não muda o histórico.

Transferências não compõem receitas/despesas. Saldo negativo é permitido: o aplicativo registra fatos financeiros e não executa pagamento no banco. Tags não multiplicam valores.

## Dataset sintético inicial

Identificado como DEMO em empresas, contatos, categorias e lançamentos. Os CNPJs são exemplos para validação do formato, não uma afirmação de vínculo da organização com empresas reais. Aberturas totalizam R$ 395.000,00. Há 200 lançamentos com duas linhas de 60%/40%, 120 liquidações e quatro reversões. Restam 116 liquidados e 84 pendentes. Transferência entre empresas de R$ 2.500,00 conserva o consolidado.

| Conta | Saldo realizado esperado |
|---|---:|
| Conta operacional | R$ 356.700,00 |
| Reserva financeira | R$ 40.760,00 |
| Conta de projetos | R$ 171.700,00 |
| Caixa interno | −R$ 34.960,00 |
| **Consolidado** | **R$ 534.200,00** |

| Situação | Quantidade | Valor esperado |
|---|---:|---:|
| Receitas pendentes | 44 | R$ 315.100,00 |
| Despesas pendentes | 40 | R$ 100.800,00 |
| Receitas liquidadas | 56 | R$ 218.400,00 |
| Despesas liquidadas | 60 | R$ 79.200,00 |

Os vencimentos ficam no mês de geração do dataset. O card de vencidos muda com o dia corrente. Em 14/09/2026, período 01–30/09, o valor observado foi R$ 200.020,00. Os arquivos `demo-cloud-totals.json` e `demo-local-totals.json` (quando gerado localmente) registram a reconciliação inicial. Testes posteriores podem acrescentar lançamentos explicitamente identificados; o teste de navegador cancela seu lançamento depois de reverter a liquidação.

## Conferência humana prevista no plano

Conferir datas, saldo, extrato, agenda, cards e categoria → grupo gerencial antes de implementar DRE e demais relatórios. A DRE ainda não foi implementada nem aprovada. O plano diz: “Sem esse aceite, não construir relatórios, faturas ou importação”.
