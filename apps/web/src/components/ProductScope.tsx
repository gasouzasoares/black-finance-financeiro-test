import {Accordion,AccordionContent,AccordionItem,AccordionTrigger} from './ui/accordion';
import {Card,CardContent} from './ui/card';
import {Badge} from './ui/badge';

export function ProductScope(){return <Card><CardContent><h2>O que já posso fazer?</h2><p className="muted">Veja o que está disponível nesta versão de teste.</p><Accordion type="single" collapsible className="guide-accordion">
 <AccordionItem value="ready"><AccordionTrigger>Rotina financeira disponível</AccordionTrigger><AccordionContent>Empresas e contas internas, receitas e despesas, categorias, rateios, contatos, vencimentos, liquidação integral, reversão, transferências, extrato e controle de acesso. Os filtros e resumos de lançamentos usam todos os registros encontrados no período, mesmo quando há mais de uma página.</AccordionContent></AccordionItem>
 <AccordionItem value="planned"><AccordionTrigger>Faturas, relatórios e outras próximas etapas</AccordionTrigger><AccordionContent><div className="scope-list">{[
 ['Faturas e documentos','Ainda não disponível. Exige emissão, numeração, vínculo com recebíveis e documentos próprios.'],
 ['Relatórios e DRE','Ainda não disponível. O gráfico atual mostra caixa realizado; ele não é uma DRE.'],
 ['Importação e conciliação OFX','Ainda não disponível. Exige prévia, detecção de duplicidade e confirmação dos vínculos.'],
 ['Recorrências e parcelamento','Ainda não disponível. Hoje cada lançamento é cadastrado individualmente.'],
 ['Pagamento parcial e anexos','Ainda não disponível. A liquidação atual é integral.'],
 ].map(([title,description])=><div key={title}><strong>{title}</strong><Badge variant="outline">Planejado</Badge><p>{description}</p></div>)}</div></AccordionContent></AccordionItem>
 </Accordion></CardContent></Card>;}
