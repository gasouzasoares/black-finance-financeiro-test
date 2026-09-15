export type Item={id:string;version:number;[key:string]:unknown};
export type API=<T=Item>(path:string,method?:string,body?:unknown,version?:number,key?:string)=>Promise<T>;
export class ApiError extends Error{constructor(message:string,public status:number,public fields:Record<string,string[]>={}){super(message);}}
export const text=(value:unknown)=>value==null?'':String(value);
export const money=(value:unknown)=>{if(value==null)return '••••';const n=BigInt(String(value));const abs=n<0n?-n:n;return `${n<0n?'−':''}R$ ${(abs/100n).toLocaleString('pt-BR')},${String(abs%100n).padStart(2,'0')}`;};
export const date=(value:unknown)=>text(value).slice(0,10).split('-').reverse().join('/');
export const minor=(value:string)=>{const raw=value.trim();if(!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(raw))throw new Error('Use vírgula para os centavos, por exemplo 123,45.');const s=raw.replace(/\./g,'').replace(',','.');if(!/^-?\d+(\.\d{1,2})?$/.test(s))throw new Error('Informe um valor com até duas casas decimais.');const [a,b='']=s.split('.');return(BigInt(a!)*100n+BigInt((a!.startsWith('-')?'-':'')+b.padEnd(2,'0'))).toString();};
export const decimal=(value:unknown)=>{const n=BigInt(text(value)||'0');return`${n<0n?'-':''}${(n<0n?-n:n)/100n},${String(n<0n?-(n%100n):n%100n).padStart(2,'0')}`;};
export const civilToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const groupNames:Record<string,string>={revenue:'Receitas',deductions:'Deduções',fixed:'Despesas fixas',variable:'Despesas variáveis',people:'Pessoas',taxes:'Impostos',unclassified:'Não classificado'};
