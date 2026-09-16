# Drive central: leitura restrita de comprovantes

## Uso

1. O administrador configura a conta técnica dedicada e compartilha **somente a pasta Comprovantes**, como leitor. Não é necessário ampliar a autorização pessoal do Google.
2. Em **Integrações → Drive central → Abrir raiz salva**, escolha o ano e a pasta mensal. Confirme conta bancária e mês. Todos os anos podem ser usados; cada pasta mensal deve ser vinculada à conta correta.
3. Escaneie as notas pelo celular para essa pasta e clique em **Buscar arquivos**. A busca lista arquivos diretamente na pasta vinculada; subpastas precisam de vínculo próprio.
4. Use **Ler notas novas**. PDFs com texto e imagens são processados no navegador. Confira os campos em **Revisar nota**. Mantenha a tela aberta durante a leitura.
5. Para o extrato XLSX, escolha **Conferir colunas do Excel**, confira data, descrição, valores e exclusão de linhas de saldo. A importação não aprova movimentos automaticamente.
6. Use **Analisar mês: notas + extratos + agenda**, depois **Analisar extrato** para revisar e aprovar sugestões. A agenda usa sua conexão Google pessoal e apenas os calendários selecionados.

Os arquivos originais e seus nomes permanecem intactos. A renomeação mensal foi desativada conforme o requisito de somente leitura. A edição dos dados extraídos ocorre na plataforma, sem modificar os arquivos do Drive.

## Configuração do servidor

- Conta dedicada proposta: `finance-comprovantes-reader@blackfinancehub.iam.gserviceaccount.com`.
- Não conceder papéis IAM no projeto, participação no drive compartilhado inteiro nem delegação de domínio.
- Compartilhar exclusivamente a pasta raiz como **leitor**, com herança para anos e meses.
- Guardar a chave JSON exclusivamente na variável secreta `GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON` do servidor/Vercel; nunca no GitHub ou no cliente web.
- O servidor troca uma asserção RSA assinada por um token de até uma hora, com escopo `drive.readonly`, sem impersonação. O cache em memória é invalidado quando a chave muda.
- A raiz Comprovantes é fixada no servidor. Salvar outra raiz é recusado. Não há fallback para OAuth pessoal amplo quando a conta técnica falta ou falha.
- A configuração da credencial não prova compartilhamento: verificar a listagem real da raiz após compartilhar. Enquanto não houver credencial válida, a interface mostra configuração pendente.

Referência: [OAuth para contas de serviço](https://developers.google.com/identity/protocols/oauth2/service-account).

## Limites e proteção

Permissões do produto, conta/CNPJ e proprietário da conexão são validados antes da leitura. A ancestralidade fica limitada à raiz autorizada, com até oito níveis, e atalhos não são seguidos. Drives compartilhados são suportados. O Google limita o acesso efetivo aos itens compartilhados com a conta técnica; não compartilhar outros itens com ela.

Até 1.000 arquivos por pasta, PDFs/imagens de até 20 MB e 10 páginas, XLSX de até 2 MB. Downloads em blocos de 750 KB. Cada arquivo mantém identificação, tamanho e assinatura para impedir duplicação ou uso de conteúdo alterado durante a leitura. Originais externos não são armazenados novamente no banco.

As propostas cruzam valor exato, direção, data, texto da nota e contexto da agenda. Coincidência de data/valor não comprova vínculo; a aprovação humana continua necessária. Não há monitoramento contínuo nem OCR executado em segundo plano no servidor.

As tabelas anteriores de revisão e histórico são preservadas. Endpoints antigos de aprovação de nomes e renomeação recusam operações em modo leitura, inclusive para clientes antigos.

## Validação

Testes cobrem assinatura e escopo somente leitura, ausência de impersonação, cache e falha sem credenciais, bloqueio de outra raiz, importação retomável de PDF/XLSX, deduplicação, arquivo alterado, conciliação revisada e ausência de escrita no Drive. A configuração real de conta e compartilhamento precisa ser concluída e verificada separadamente.
