-- Synthetic, explicitly labeled reference data. Atomic and called once per fixture.
DO $$
DECLARE actor uuid:=current_setting('app.seed_actor')::uuid; le1 bigint;le2 bigint;acc bigint[];a bigint;cat1 bigint;cat2 bigint;center bigint;party bigint;entry bigint;allocation bigint;settlement bigint;item bigint;original bigint;rev bigint;original_post bigint;amount bigint;line_amount bigint;posting bigint;i int;j int;d date;effective date;income boolean;month_start date:=date_trunc('month',now() AT TIME ZONE 'America/Sao_Paulo')::date;today date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
INSERT INTO app.legal_entities(name,cnpj) VALUES('BF Operações · DEMO','12ABC34501DE35') RETURNING id INTO le1;
INSERT INTO app.legal_entities(name,cnpj) VALUES('BF Projetos · DEMO','11222333000181') RETURNING id INTO le2;
FOR i IN 1..4 LOOP
 INSERT INTO app.accounts(legal_entity_id,name,kind,opening_on,is_default) VALUES(CASE WHEN i<=2 THEN le1 ELSE le2 END,(ARRAY['Conta operacional','Reserva financeira','Conta de projetos','Caixa interno'])[i],CASE WHEN i=4 THEN 'cash' ELSE 'bank' END,month_start-interval '1 month',i IN(1,3)) RETURNING id INTO a;acc:=array_append(acc,a);
 INSERT INTO app.cash_postings(account_id,effective_on,signed_minor,kind,description) VALUES(a,month_start-interval '1 month',(ARRAY[25000000,8000000,6000000,500000])[i],'opening','Saldo inicial de demonstração');
END LOOP;
INSERT INTO app.categories(name,direction,reporting_group) VALUES('Serviços e projetos · DEMO','income','revenue') RETURNING id INTO cat1;
INSERT INTO app.categories(name,direction,reporting_group) VALUES('Operação e estrutura · DEMO','expense','fixed') RETURNING id INTO cat2;
INSERT INTO app.cost_centers(name) VALUES('Operação · DEMO') RETURNING id INTO center;
INSERT INTO app.parties(name,email) VALUES('Contato de demonstração','contato@example.com') RETURNING id INTO party;
INSERT INTO app.labels(name) VALUES('Demonstração');
FOR i IN 1..200 LOOP
 income:=i%2=0;amount:=CASE WHEN income THEN 180000+i*3500 ELSE 60000+i*1200 END;d:=month_start+(i%28);effective:=today-(i%12);
 INSERT INTO app.entries(account_id,party_id,direction,title,amount_minor,due_on,competence_on,status,version) VALUES(acc[1+(i%4)],party,CASE WHEN income THEN 'income' ELSE 'expense' END,(CASE WHEN income THEN (ARRAY['Projeto de educação financeira','Consultoria de planejamento','Programa de desenvolvimento','Serviços institucionais'])[1+(i%4)] ELSE (ARRAY['Infraestrutura e ferramentas','Equipe e operação','Serviços de apoio','Produção de conteúdo'])[1+(i%4)] END)||' · DEMO '||lpad(i::text,3,'0'),amount,d,month_start,CASE WHEN i<=120 AND i%30<>0 THEN 'settled' ELSE 'open' END,CASE WHEN i>120 THEN 1 WHEN i%30=0 THEN 3 ELSE 2 END) RETURNING id INTO entry;
 IF i<=120 THEN INSERT INTO app.settlements(entry_id,account_id,amount_minor,settled_on,actor_id) VALUES(entry,acc[1+(i%4)],amount,effective,actor) RETURNING id INTO settlement;END IF;
 FOR j IN 1..2 LOOP
  line_amount:=CASE WHEN j=1 THEN amount*6/10 ELSE amount-amount*6/10 END;
  INSERT INTO app.entry_allocations(entry_id,amount_minor,settled_minor,due_on,competence_on,category_id,cost_center_id,reporting_group) VALUES(entry,line_amount,CASE WHEN i<=120 AND i%30<>0 THEN line_amount ELSE 0 END,d,month_start,CASE WHEN income THEN cat1 ELSE cat2 END,center,CASE WHEN income THEN 'revenue' ELSE 'fixed' END) RETURNING id INTO allocation;
  IF i<=120 THEN INSERT INTO app.settlement_items(settlement_id,allocation_id,amount_minor) VALUES(settlement,allocation,line_amount) RETURNING id INTO item;INSERT INTO app.cash_postings(account_id,effective_on,signed_minor,kind,settlement_item_id,description) VALUES(acc[1+(i%4)],effective,line_amount*CASE WHEN income THEN 1 ELSE -1 END,'settlement',item,'Liquidação de demonstração');END IF;
 END LOOP;
 IF i<=120 AND i%30=0 THEN
  INSERT INTO app.settlements(entry_id,account_id,amount_minor,settled_on,reversal_of,reason,actor_id) VALUES(entry,acc[1+(i%4)],amount,today,settlement,'Reversão de demonstração',actor) RETURNING id INTO rev;
  FOR allocation,line_amount,original_post IN SELECT al.id,al.amount_minor,c.id FROM app.entry_allocations al JOIN app.settlement_items si ON si.allocation_id=al.id AND si.settlement_id=settlement JOIN app.cash_postings c ON c.settlement_item_id=si.id WHERE al.entry_id=entry LOOP
   INSERT INTO app.settlement_items(settlement_id,allocation_id,amount_minor) VALUES(rev,allocation,line_amount) RETURNING id INTO item;INSERT INTO app.cash_postings(account_id,effective_on,signed_minor,kind,settlement_item_id,reversal_of,description) VALUES(acc[1+(i%4)],today,-line_amount*CASE WHEN income THEN 1 ELSE -1 END,'reversal',item,original_post,'Reversão de demonstração');
  END LOOP;
 END IF;
 INSERT INTO app.audit_events(actor_id,resource_type,resource_id,action,after_data,request_id) VALUES(actor,'entry',entry::text,'create',jsonb_build_object('source','demo-fixture-v1','amount_minor',amount::text),'demo-fixture-v1');
END LOOP;
INSERT INTO app.transfers(source_account_id,destination_account_id,amount_minor,effective_on,scope,reason) VALUES(acc[1],acc[3],250000,today,'intercompany','Transferência de demonstração') RETURNING id INTO original;
INSERT INTO app.cash_postings(account_id,effective_on,signed_minor,kind,transfer_id,description) VALUES(acc[1],today,-250000,'transfer',original,'Transferência entre empresas'),(acc[3],today,250000,'transfer',original,'Transferência entre empresas');
INSERT INTO app.account_balances(account_id,balance_minor) SELECT account_id,sum(signed_minor) FROM app.cash_postings WHERE account_id=ANY(acc) GROUP BY account_id;
INSERT INTO app.cash_daily(account_id,effective_on,net_minor) SELECT account_id,effective_on,sum(signed_minor) FROM app.cash_postings WHERE account_id=ANY(acc) GROUP BY account_id,effective_on;
END $$;
