import type {API} from './api';
export async function driveFile(api:API,id:string,onProgress:(s:string)=>void){
 let offset:number|null=0,name='',mime='',checksum='';const parts:Uint8Array<ArrayBuffer>[]=[];
 do{onProgress(`Baixando do Drive… ${(offset/1000000).toFixed(1)} MB`);const r: {base64:string;next:number|null;name:string;mime:string;checksum:string}=await api(`/v1/drive/files/${id}/chunk?offset=${offset}`);if(checksum&&checksum!==r.checksum)throw Error('Arquivo alterado durante o download. Recomece.');checksum=r.checksum;name=r.name;mime=r.mime;parts.push(Uint8Array.from(atob(r.base64),c=>c.charCodeAt(0)));offset=r.next;}while(offset!==null);
 return {file:new File(parts,name,{type:mime}),checksum};
}
