# Comece por aqui

## Faça seu primeiro teste

1. Entre no sistema. A **Página inicial** mostra o painel financeiro.
2. No cartão à direita, escolha uma conta marcada como DEMO. O CNPJ fica no rodapé do menu lateral.
3. Abra **Transações → Recebimentos → Nova transação**, logo abaixo do cabeçalho da tabela. Informe descrição, valor, vencimento e conta; selecione uma categoria.
4. Salve. A transação começa **pendente**, sem alterar o saldo realizado.
5. Ative **Pago?** na linha, informe a data da realização e confirme. Essa ação registra o recebimento; não envia dinheiro ao banco.
6. Abra **Relatórios**, escolha a conta e confira o extrato do período.

Para desfazer o teste, desative **Pago?**, informe o motivo e confirme a reversão. Depois, no menu de três pontos da linha, escolha **Cancelar transação**. O histórico permanece registrado.

## Onde ficam as funções

- **Página inicial:** previsto/realizado, movimento de caixa, comparação, alterações recentes, conta e compromissos.
- **Transações:** recebimentos, despesas fixas, variáveis, pessoas, impostos e transferências, em uma única sequência de abas.
- **Contatos:** clientes e fornecedores.
- **Relatórios:** extrato por conta e período.
- **Menu do usuário**, no alto da lateral: empresas, contas bancárias, categorias, centros de custo, marcadores, acessos, histórico, organização, agenda e este guia.

As setas ao lado do mês mudam o período. **Filtrar** reúne situação, contato, categoria, centro de custo e marcador. Clique em Data, Descrição ou Valor para ordenar. O total abaixo da tabela abrange todas as páginas do filtro. O botão **+** abre o formulário completo; os três pontos da linha abrem detalhes e ações.

No celular, abra o menu pelo botão no topo. A tabela pode ser deslizada horizontalmente para acessar suas colunas.

## Cadastre sua organização

Abra o menu do usuário e siga **Empresas → Contas bancárias → Categorias → Transações**. Informe o saldo inicial e sua data com cuidado para evitar duplicidade. As empresas e valores DEMO são fictícios.

A aplicação tem uma organização com múltiplos CNPJs e contas internas. Contatos, centros de custo e marcadores são auxiliares e podem ser configurados depois do primeiro teste.

## Como interpretar o painel

Previsto/realizado agrupa transações pelo vencimento. O gráfico de caixa e o extrato usam a data de realização. A previsão da conta soma ao saldo atual as entradas pendentes e subtrai as saídas pendentes do período. Amplie o período para procurar pendências antigas.

**Faturas, importações, OFX, DRE, anexos, recorrências, parcelamento e pagamentos parciais ainda não estão implantados.** As posições correspondentes na interface informam essa limitação. Relatórios contém o extrato disponível, sem simular os demais relatórios.

A comparação com a referência e as regras estão em `fidelidade-procfy.md`. A verificação desta interface está em `reference-layout-validation.json`.
