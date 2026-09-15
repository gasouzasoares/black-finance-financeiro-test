# API financeira v1

Todas as rotas de dados exigem identidade ativa e política autorizada. Local: Bearer Supabase/JWKS. Cloud: cookie de sessão Better Auth. `/v1/config` e `/health` são públicos e não retornam segredos. Comandos JSON exigem `Idempotency-Key` (8–128 caracteres); alterações de registro exigem `If-Match` com a versão inteira retornada na leitura.

| Método e rota | Finalidade |
|---|---|
| GET /v1/me | Identidade ativa |
| GET/PATCH /v1/organization-profile | Perfil e política / atualizar nome |
| GET/POST /v1/legal-entities | Listar/criar empresas |
| PATCH /v1/legal-entities/{id} | Alterar identificação e arquivamento |
| GET/POST /v1/accounts | Listar/criar contas, abertura de saldo |
| PATCH /v1/accounts/{id} | Nome e arquivamento |
| GET/POST /v1/parties, /categories, /cost-centers, /labels | Cadastros |
| PATCH /v1/{cadastro}/{id} | Atualização e arquivamento |
| GET/POST /v1/entries | Listar/criar lançamentos |
| GET/PATCH /v1/entries/{id} | Detalhe com linhas/histórico / editar pendente sem liquidações anteriores |
| POST /v1/entries/{id}/settlements | Liquidar integralmente |
| POST /v1/entries/{id}/reverse | Reverter liquidação |
| POST /v1/entries/{id}/cancel | Cancelar pendente |
| GET/POST /v1/transfers | Listar/criar transferências |
| POST /v1/transfers/{id}/reverse | Reverter os dois lados |
| GET /v1/accounts/{id}/statement | Extrato com saldos e cursor |
| GET /v1/dashboard | Cards e caixa diário |
| GET /v1/agenda | Pendentes por vencimento |
| GET /v1/users | Usuários e políticas |
| PATCH /v1/users/{uuid}/policy | Política e situação; somente proprietário |
| GET /v1/audit-events | Últimos 200 eventos; somente proprietário |
| GET /v1/invitations | Consulta de convites |
| POST /v1/invitations | Indisponível no teste: 503 EMAIL_NOT_CONFIGURED |

## Criação de lançamento

```json
{
  "account_id": "1",
  "party_id": null,
  "direction": "expense",
  "title": "Serviços de demonstração",
  "amount_minor": "12345",
  "due_on": "2026-09-20",
  "competence_on": "2026-09-01",
  "notes": "",
  "allocations": [
    {"amount_minor": "7407", "category_id": "2", "cost_center_id": null},
    {"amount_minor": "4938", "category_id": "2", "cost_center_id": null}
  ],
  "label_ids": []
}
```

IDs de exemplo dependem do ambiente. `12345` representa R$ 123,45. Uma única linha pode receber 100% do valor. Máximo de 100 rateios e 30 marcadores. Apenas BRL e liquidação integral estão expostos.

Liquidação: `{"settled_on":"2026-09-14","reason":""}`. Reversão: `{"effective_on":"2026-09-14","reason":"Correção do registro"}`. Cancelamento: `{"reason":"Cadastro incorreto"}`. Transferência: `source_account_id`, `destination_account_id`, `amount_minor`, `effective_on`, `reason`.

## Leitura e paginação

`from` e `to` são obrigatórios nas listas financeiras/painel/extrato, com período de até 366 dias. Filtros: `account_id`, `legal_entity_id`, `direction`, `status`, `q`. Paginação financeira: `limit` padrão 50, máximo 200, `cursor` opaco retornado como `next_cursor`. Cursor inválido é rejeitado; não há OFFSET. O cursor não contém autorização e é sempre combinado com a política atual.

## Erros

Envelope: `code`, `message`, `field_errors`, `request_id`. 401: sessão ausente/inválida; 403: direito ausente; 404: recurso inexistente ou fora do escopo; 409: duplicidade, conflito idempotente, operação concorrente ou estado incompatível; 412: versão desatualizada; 422: campos/regras inválidos; 428: versão obrigatória; 429: excesso de chamadas. Mensagens não incluem SQL, conexões ou segredos.

No caso de falha de rede, repetir a mesma operação com a mesma chave. Se o payload mudar, gerar nova chave. Não obter uma nova versão automaticamente para confirmar uma ação sem a pessoa revisar o registro atualizado.
