# Drive central: entrada, revisão e nomes dos comprovantes

## Uso

1. Em **Integrações → Drive central**, autorize a conta Google. Essa autorização é própria da plataforma; a conexão do assistente não a substitui.
2. Cole o link da pasta raiz, por exemplo a pasta do ano. Abra a subpasta mensal e confirme **conta bancária + ano/mês**. A organização e o compartilhamento existentes no Drive são preservados. É possível vincular várias pastas ao mesmo mês.
3. Escaneie as notas pelo celular para a subpasta vinculada. Coloque o extrato XLSX na mesma pasta ou vincule uma pasta separada. Clique em **Buscar arquivos**. A busca abrange os arquivos diretamente na pasta; para uma subpasta, faça um vínculo próprio.
4. Use **Ler notas novas**. PDFs com texto são extraídos; imagens e páginas escaneadas passam pelo OCR local em português. Em caso de falha, o documento pode ser revisado manualmente. O original permanece no Drive, e o banco guarda somente texto, campos, tamanho, identificador e assinatura de conteúdo.
5. No primeiro envio de cada extrato Excel, use **Conferir colunas do Excel**. Escolha planilha, cabeçalho, datas, descrição e valor com sinal ou débito/crédito. Linhas de saldo devem ser excluídas do mapeamento. A importação não cria transações automaticamente.
6. Clique em **Analisar mês: notas + extratos + agenda**. Ele lê as notas novas e prepara propostas para os movimentos pendentes dos extratos já importados. Consulta as agendas selecionadas no mês. Falhas são informadas e rascunhos existentes são preservados.
7. Em **Revisar nota**, confira emissão, total, emitente e demais campos. Em **Analisar extrato → Revisar proposta**, ajuste descrição, categoria, instituição, programa, atividade, justificativa e contatos. Aprove cada movimento após a conferência.
8. Use **Preparar nomes e verificar pendências**. O sistema verifica a revisão das notas, o contexto das transações, a liquidação e a conciliação. Arquivos pendentes, alterados, removidos ou extratos não resolvidos bloqueiam a confirmação. Um arquivo fora do escopo pode ser excluído da revisão com justificativa, sem apagar o original ou desfazer lançamentos.
9. Confira os nomes propostos, marque a confirmação e clique em **Confirmar mês e aplicar nomes**. Somente comprovantes são renomeados; os extratos, as pastas, o conteúdo, os links e o compartilhamento não são alterados. O histórico permite retomar falhas.

Exemplo genérico: `2026-08-06 - Restaurante - Reunião institucional - R$ 23,94 - BF42-11.pdf`.

## Critérios de análise

A conciliação reutiliza o motor de propostas: valor exato em centavos, direção, proximidade de data, descrição, emitente e regras de classificação. Agenda e participantes fornecem contexto. Duas despesas do mesmo valor podem existir; evento no mesmo dia não comprova presença ou finalidade. As sugestões exigem revisão. Não é apresentado um percentual de acerto sem medição, nem contratado um modelo de IA pago.

## Autorização e acesso

O modo anterior usa `drive.file`, adequado para arquivos criados ou selecionados individualmente para o aplicativo. Para encontrar arquivos escaneados externamente em pastas existentes, o modo central solicita explicitamente `https://www.googleapis.com/auth/drive`. Esse escopo Google é amplo; a aplicação restringe busca, download e renomeação às raízes e pastas vinculadas pelo usuário. A agenda permanece em leitura. Veja [escopos oficiais do Google Drive](https://developers.google.com/workspace/drive/api/guides/api-specific-auth).

O serviço valida o proprietário da conexão, permissões de produto, conta/CNPJ e ancestralidade da pasta. Suporta pastas em drives compartilhados com `supportsAllDrives` e `includeItemsFromAllDrives`. Atalhos não são seguidos. A reconexão invalida eventos sincronizados até uma nova consulta. Tokens ficam criptografados no servidor e não são devolvidos ao navegador.

## Persistência e recuperação

- `drive_sources`: pasta, conexão, conta e mês; vínculo único da pasta por conexão.
- `drive_intake_files`: identificação estável do Drive, assinatura MD5 fornecida pelo Google, versão, tamanho, situação e documento/extrato associado. A chave conexão + arquivo evita importação duplicada.
- `documents.storage='drive'`: mantém o original externo, sem copiar seus bytes para o banco. A cópia de leitura não representa um backup do original.
- `drive_closures`: registro imutável da prévia aprovada, hash e responsável.
- `drive_rename_jobs`: nomes anterior/proposto, situação e falha por arquivo. A operação verifica novamente os dados revisados e o conteúdo antes de alterar o nome, usa ETag/If-Match e confirma o resultado no Drive. Se o provedor não disponibilizar controle de versão, falha sem renomear.

Falhas depois de o Google aplicar o nome são recuperáveis: a tentativa seguinte reconhece o nome aprovado e conclui o registro sem uma segunda alteração. Arquivos cujo conteúdo mudou depois de importados exigem nova versão como outro arquivo; a evidência anterior não é sobrescrita. Alterações na classificação ou revisão podem exigir nova prévia. O histórico preserva a aprovação anterior.

## Limites e escopo

PDF/JPG/PNG/WebP: até 20 MB, 10 páginas e 12 megapixels por imagem/página renderizada. Downloads em trechos de até 750 KB evitam respostas grandes da função web. XLSX: até 2 MB, com os limites e a validação do importador existente. A entrada central de extratos usa XLSX; OFX continua disponível no módulo Conciliações. Arquivos nativos Google e outros tipos não são interpretados como notas.

A leitura e a sequência de análise são iniciadas pelo botão e executadas enquanto a tela está aberta. Não há monitoramento contínuo da pasta em segundo plano. Arquivos concluídos persistem e os demais podem ser retomados. Uma pasta admite até 1.000 arquivos por busca, com paginação Google. Para volumes maiores, subdivida as pastas.

A confirmação é **documental e por pasta/conta/mês**. Não bloqueia contabilmente o período nem certifica que todos os extratos bancários da organização foram apresentados. Novos arquivos ou mudanças posteriores precisam de nova revisão. Para entrega contábil, use o pacote XLSX em Relatórios.

## Verificação

Testes unitários cobrem escopos, nomes seguros e identificação de formatos. O teste de integração usa banco local real e respostas Google simuladas para validar: confinamento da pasta, repetição da busca/importação, leitura de PDF acima de 1,5 MB sem armazenar bytes no banco, conciliação com revisão, bloqueio antes da confirmação, falha após renomeação e retomada sem duplicação, arquivo alterado e falta de escopo.

A interface foi conferida em desktop e largura de 390 px com dados fictícios, incluindo prévia e habilitação do botão somente após marcar a confirmação. A leitura e renomeação na pasta real dependem da autorização ampliada da conta no Google e da escolha da conta bancária de cada pasta; testes simulados não substituem essa validação externa.
