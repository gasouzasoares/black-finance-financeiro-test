import {useState} from 'react';
import {Check,X} from 'lucide-react';
import {AppButton as Button} from './AppButton';
import {Input} from './ui/input';
import {Select,options} from '../Editor';
import {Feedback} from './Feedback';
import {type API,type Item,minor,civilToday,text} from '../lib/api';

export function QuickEntry({api,account,accounts,catalogs,direction,group,done,cancel}:{api:API;account:string;accounts:Item[];catalogs:Record<string,Item[]>;direction:string;group:string;done:()=>void;cancel:()=>void}){
 const [title,setTitle]=useState(''),[due,setDue]=useState(civilToday()),[value,setValue]=useState(''),[contact,setContact]=useState(''),[category,setCategory]=useState(''),[selectedAccount,setAccount]=useState(account),[error,setError]=useState(''),[busy,setBusy]=useState(false),[attempt,setAttempt]=useState<{body:string;key:string}>();
 const categories=(catalogs.categories??[]).filter(c=>c.status==='active'&&c.direction===direction&&(!group||c.reporting_group===group));
 return <form className="ref-quick-entry" onSubmit={e=>{e.preventDefault();setBusy(true);setError('');void(async()=>{try{if(group&&!category)throw new Error('Selecione uma categoria do grupo escolhido.');const amount=minor(value);const body={title,account_id:selectedAccount,direction,amount_minor:amount,due_on:due,competence_on:due,party_id:contact||null,notes:'',allocations:[{amount_minor:amount,category_id:category||null,cost_center_id:null}],label_ids:[]};const raw=JSON.stringify(body),key=attempt?.body===raw?attempt.key:crypto.randomUUID();setAttempt({body:raw,key});await api('/v1/entries','POST',body,undefined,key);done();}catch(e){setError((e as Error).message);}finally{setBusy(false);}})();}}>
 <div className="ref-quick-grid"><Input type="date" aria-label="Data da nova transação" required value={due} onChange={e=>setDue(e.target.value)} disabled={busy}/><Input autoFocus aria-label="Descrição da nova transação" placeholder="Descrição" required maxLength={240} value={title} onChange={e=>setTitle(e.target.value)} disabled={busy}/><Select label="Contato da nova transação" value={contact} options={options(catalogs.parties??[])} onChange={setContact} disabled={busy}/><Select label="Categoria da nova transação" value={category} options={options(categories)} onChange={setCategory} disabled={busy}/><Input aria-label="Valor da nova transação" placeholder="0,00" inputMode="decimal" required value={value} onChange={e=>setValue(e.target.value)} disabled={busy}/><Select label="Conta da nova transação" value={selectedAccount} options={options(accounts.filter(a=>a.status==='active'))} onChange={setAccount} disabled={busy}/><Button type="submit" size="icon" disabled={busy||!selectedAccount} aria-label="Salvar nova transação"><Check/></Button><Button type="button" size="icon" variant="ghost" disabled={busy} aria-label="Fechar nova transação" onClick={cancel}><X/></Button></div>
 <small>{direction==='income'?'Recebimento':'Despesa'} · {text(accounts.find(a=>a.id===selectedAccount)?.name)||'Selecione uma conta'} · salva como pendente, com competência igual à data informada.</small>{error&&<Feedback error>{error}</Feedback>}
 </form>;
}
