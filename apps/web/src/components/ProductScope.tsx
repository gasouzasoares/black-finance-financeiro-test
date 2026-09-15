import {Accordion,AccordionContent,AccordionItem,AccordionTrigger} from './ui/accordion';
import {Card,CardContent} from './ui/card';
import {Badge} from './ui/badge';

export function ProductScope(){return <Card><CardContent><h2>O que já posso fazer?</h2><p className="muted">Veja o que está disponível nesta versão de teste.</p><Accordion type="single" collapsible className="guide-accordion">
 <AccordionItem value="ready"><AccordionTrigger>Rotina financeira disponível</AccordionTrigger><AccordionContent>Empresas e contas internas, receitas e despesas, categorias, rateios, contatos, vencimentos, liquidação integral, reversão, transferências, extrato e controle de acesso. Os filtros e resumos de lançamentos usam todos os registros encontrados no período, mesmo quando há mais de uma página.</AccordionContent></AccordionItem>
 <AccordionItem value="planned"><AccordionTrigger>Módulos e limites desta versão</AccordionTrigger><AccordionContent><div className="scope-list">{[
 ['Faturas gerenciais','Rascunho com itens, desconto fixo, emissão, transação vinculada e impressão. Sem emissão fiscal ou envio automático.'],
 ['Relatórios e DRE','Extrato e DRE por competência ou caixa, com grupos e detalhamento por categoria.'],
 ['Importação e conciliação OFX','CSV com prévia e confirmação. OFX com duplicidades, sugestões de transações liquidadas e vínculo sem alterar o saldo. Até 500 linhas por arquivo.'],
 ['Recorrências','Modelos semanais, mensais, trimestrais e anuais. Gere até 24 ocorrências por confirmação; pause, retome ou encerre. Não há execução agendada automática.'],
 ['Parcelamento, pagamento parcial e anexos','Permanecem indisponíveis. A liquidação atual é integral.'],
 ].map(([title,description])=><div key={title}><strong>{title}</strong><Badge variant="outline">Uso interno</Badge><p>{description}</p></div>)}</div></AccordionContent></AccordionItem>
 </Accordion></CardContent></Card>;}
