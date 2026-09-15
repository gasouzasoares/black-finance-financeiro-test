import {ProductScope} from './ProductScope';
import { ArrowRight, BookOpen, Building2, Wallet, ArrowLeftRight, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function GettingStarted({ navigate, can }: { navigate: (page: string) => void; can: (resource: string, action?: string) => boolean }) {
  const steps = [
    { title: 'Conheça as contas', description: 'Abra uma conta de demonstração e veja o saldo inicial. Cada conta pertence a um CNPJ.', page: 'accounts', resource: 'accounts', icon: Wallet, action: 'Ver contas' },
    { title: 'Registre um lançamento', description: 'Crie uma receita ou despesa com descrição, conta, valor e vencimento. Ela começa como pendente.', page: 'entries', resource: 'entries', icon: ArrowLeftRight, action: 'Abrir lançamentos' },
    { title: 'Registre o pagamento', description: 'Na tabela de Transações, ative Pago? e confirme a data em que o dinheiro entrou ou saiu. Isso atualiza o saldo.', page: 'entries', resource: 'entries', icon: CheckCircle2, action: 'Ver transações' },
    { title: 'Confira o resultado', description: 'Em Contas bancárias, abra Ver extrato. Compare o movimento e o saldo após a operação.', page: 'accounts', resource: 'accounts', icon: BookOpen, action: 'Conferir extrato' },
  ];
  return <div className="getting-started">
    <Alert className="demo-alert"><Info /><AlertTitle>Você está em um ambiente de teste</AlertTitle><AlertDescription>As empresas e os valores com “DEMO” são fictícios. Você pode usá-los para aprender. Nenhuma ação envia pagamentos ao banco.</AlertDescription></Alert>
    <Card className="start-hero"><CardContent><div><Badge variant="outline">SEU PRIMEIRO PASSO</Badge><h2>Comece com uma conta e um lançamento.</h2><p>Você não precisa configurar todos os menus. Faça este roteiro para entender como o dinheiro é registrado e conferido.</p></div>{can('entries') && <Button onClick={() => navigate('entries')}>Experimentar um lançamento <ArrowRight /></Button>}</CardContent></Card>
    <div className="start-steps">{steps.map((step, index) => <Card key={step.title}><CardContent><div className="step-top"><span className="step-number">{index + 1}</span><step.icon size={20} /></div><h3>{step.title}</h3><p>{step.description}</p>{can(step.resource) ? <Button variant="outline" onClick={() => navigate(step.page)}>{step.action}<ArrowRight size={15} /></Button> : <p className="helper">Peça acesso a esta área ao administrador.</p>}</CardContent></Card>)}</div>
    <Card><CardContent><h2>Depois do primeiro teste</h2><Accordion type="single" collapsible className="guide-accordion">
      <AccordionItem value="setup"><AccordionTrigger>Quero configurar meus próprios cadastros</AccordionTrigger><AccordionContent><ol className="guide-list"><li><strong>Empresas:</strong> cadastre o CNPJ da organização.</li><li><strong>Contas bancárias:</strong> crie a conta, informe o saldo inicial e sua data de abertura.</li><li><strong>Categorias:</strong> separe receitas e despesas por finalidade.</li><li><strong>Transações:</strong> registre o que tem a receber e a pagar.</li></ol><div className="guide-actions">{can('organization', 'manage') && <Button variant="outline" onClick={() => navigate('legal-entities')}><Building2 />Cadastrar empresa</Button>}{can('categories') && <Button variant="outline" onClick={() => navigate('categories')}>Ver categorias</Button>}</div></AccordionContent></AccordionItem>
      <AccordionItem value="routine"><AccordionTrigger>Qual tela eu uso no dia a dia?</AccordionTrigger><AccordionContent><p><strong>Agenda:</strong> confira compromissos pendentes e vencimentos. <strong>Transações:</strong> registre receitas, despesas e pagamentos. <strong>Página inicial:</strong> acompanhe os totais. <strong>Extrato:</strong> confira o saldo e cada movimento da conta.</p><p>Use Transferências quando o dinheiro mudar entre suas próprias contas. Contatos, centros de custo e marcadores são cadastros auxiliares; podem ficar para depois.</p></AccordionContent></AccordionItem>
      <AccordionItem value="terms"><AccordionTrigger>O que significam os termos financeiros?</AccordionTrigger><AccordionContent><dl className="glossary"><div><dt>Pendente</dt><dd>Previsto, mas ainda não pago ou recebido.</dd></div><div><dt>Liquidar</dt><dd>Registrar que o pagamento ou recebimento aconteceu. Não envia dinheiro ao banco.</dd></div><div><dt>Vencimento</dt><dd>Data prevista para pagar ou receber.</dd></div><div><dt>Competência</dt><dd>Data à qual a receita ou despesa pertence, mesmo que o pagamento ocorra depois.</dd></div><div><dt>Reverter</dt><dd>Desfazer uma liquidação por meio de um movimento contrário, mantendo o histórico.</dd></div><div><dt>Rateio</dt><dd>Dividir o valor de um lançamento entre classificações.</dd></div></dl></AccordionContent></AccordionItem>
    </Accordion></CardContent></Card>
    <ProductScope/>
  </div>;
}
