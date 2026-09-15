# Comece por aqui

## Teste com os cadastros de demonstração

1. Entre no sistema. A tela inicial agora apresenta um roteiro de uso.
2. Abra **Contas e extratos** e conheça uma conta marcada como DEMO.
3. Em **Lançamentos → Novo lançamento**, registre uma receita ou despesa pequena. Preencha descrição, conta, valor e vencimento; selecione uma categoria.
4. Salve. O lançamento fica **pendente**, sem alterar o saldo realizado.
5. Abra seu detalhe e escolha **Liquidar** quando quiser simular que o pagamento ou recebimento aconteceu. Informe a data da realização e confirme.
6. Confira o resultado em **Contas e extratos → Ver extrato**. Nenhuma dessas ações envia dinheiro ao banco.

Para desfazer o teste, reverta a liquidação informando o motivo e depois cancele o lançamento. O histórico permanece registrado.

## Organize seus próprios cadastros

Siga **Empresas → Contas e extratos → Categorias → Lançamentos**. Informe cuidadosamente o saldo inicial e sua data de abertura para evitar duplicar valores já registrados. As demonstrações não representam suas empresas reais.

Contatos, centros de custo e marcadores são auxiliares. Você pode configurá-los depois de entender o fluxo principal. Administração reúne acessos, histórico e configurações da organização.

## Rotina de uso

Na **Visão geral**, use **Ver receitas**, **Ver despesas**, **Vencem hoje** ou **Ver vencidos**. Os atalhos preservam empresa, conta e período; amplie o período para procurar pendências mais antigas.

Em **Lançamentos**, escolha **Receitas** ou **Despesas**. Dentro de despesas, os botões de grupo ajudam a localizar custos fixos, variáveis, pessoas ou impostos. Use as setas para trocar de mês. **Mais filtros** reúne contato, categoria, centro de custo e marcador.

Os totais acima da lista abrangem todas as páginas. São agrupados por vencimento; para conferir quando o dinheiro realmente entrou ou saiu, consulte o extrato. No celular, toque no título de um cartão para abrir os detalhes.

No guia inicial, **O que já posso fazer?** informa quais recursos estão disponíveis e quais continuam planejados. A comparação completa com os prints está em `auditoria-ux-referencias.md`.

- **Agenda:** compromissos pendentes por vencimento.
- **Lançamentos:** receitas, despesas, pagamentos, recebimentos e suas correções.
- **Visão geral:** totais e movimentos do período selecionado.
- **Extrato:** saldo anterior, movimento e saldo após cada lançamento.
- **Transferências:** movimentação entre suas próprias contas.

O botão **Como usar**, no topo, reabre o guia a qualquer momento.

## Padronização da interface

Select, Checkbox, Alert, Accordion e Tooltip oficiais do shadcn se somam aos componentes já usados de botão, formulário, tabela, cartão, diálogo e navegação móvel. Fontes, cores e logo da Black Finance foram preservados. Datas continuam usando Input do shadcn com o seletor de data nativo do navegador.

Validação local e na URL pública https://black-finance-financeiro-test.vercel.app: 14 telas verificadas em desktop e celular, sem transbordamento horizontal do documento; fluxo de criar, liquidar, reverter e cancelar passou com o novo Select. Guia e glossário verificados, zero erros JavaScript não tratados. Resultado detalhado em `ui-validation.json`.
