import {ChevronLeft,ChevronRight,CalendarDays,ArrowDownLeft,ArrowUpRight} from 'lucide-react';
import {AppButton as Button} from './AppButton';
import {Card,CardContent} from './ui/card';
import {Tabs,TabsList,TabsTrigger} from './ui/tabs';
import {type Item,money,date,groupNames} from '../lib/api';

export function PeriodNavigator({from,to,onChange,today}:{from:string;to:string;onChange:(from:string,to:string)=>void;today:string}) {
 const month=(source:string,delta:number)=>{let d=new Date(`${source.slice(0,7)}-15T12:00:00Z`);if(!Number.isFinite(d.getTime()))d=new Date(`${today.slice(0,7)}-15T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+delta);const start=d.toISOString().slice(0,7)+'-01';const end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).toISOString().slice(0,10);onChange(start,end);};
 return <div className="period-nav"><div><Button variant="outline" size="icon" aria-label="Mês anterior" onClick={()=>month(from,-1)}><ChevronLeft/></Button><span><CalendarDays size={16}/>{date(from)} — {date(to)}</span><Button variant="outline" size="icon" aria-label="Próximo mês" onClick={()=>month(from,1)}><ChevronRight/></Button></div><Button variant="ghost" onClick={()=>month(today,0)}>Mês atual</Button></div>;
}
export function TransactionTabs({direction,group,onChange}:{direction:string;group:string;onChange:(direction:string,group:string)=>void}){
 return <div className="transaction-tabs"><Tabs value={direction||'all'} onValueChange={v=>onChange(v==='all'?'':v,'')}><TabsList aria-label="Tipo de transação"><TabsTrigger value="all">Todos</TabsTrigger><TabsTrigger value="income"><ArrowDownLeft size={16}/>Receitas</TabsTrigger><TabsTrigger value="expense"><ArrowUpRight size={16}/>Despesas</TabsTrigger></TabsList></Tabs>{direction==='expense'&&<div className="group-filters" aria-label="Grupos de despesa">{[['','Todas as despesas'],...Object.entries(groupNames).filter(([key])=>key!=='revenue')].map(([key,name])=><Button key={key} size="sm" variant={group===key?'default':'outline'} aria-pressed={group===key} onClick={()=>onChange(direction,key??'')}>{name}</Button>)}</div>}</div>;
}
export function TransactionSummary({data,direction}:{data:Item;direction:string}){
 return <div className={`transaction-summary ${direction?'two-totals':''}`} aria-label="Resumo dos filtros">{[['A receber',data.receivable_minor],['Recebido',data.received_minor],['A pagar',data.payable_minor],['Pago',data.paid_minor]].filter((_,i)=>!direction||(direction==='income'?i<2:i>=2)).map(([name,value])=><Card key={String(name)}><CardContent><small>{String(name)}</small><strong>{money(value)}</strong></CardContent></Card>)}</div>;
}
