export async function readDocument(file:File,onProgress:(s:string)=>void){
 const start=performance.now();let text='',method:'pdf-text'|'ocr'|'manual'='manual';
 let worker:Awaited<ReturnType<typeof import('tesseract.js')['createWorker']>>|undefined;
 const recognize=async(image:File|HTMLCanvasElement)=>{onProgress('Lendo texto da imagem no seu dispositivo…');if(!worker){const {createWorker}=await import('tesseract.js');worker=await createWorker('por',1,{workerPath:'/ocr/worker.min.js',corePath:'/ocr',langPath:'/ocr',logger:()=>{}});}const timer=setTimeout(()=>{void worker?.terminate();},90000);try{return (await worker.recognize(image)).data.text;}finally{clearTimeout(timer);}};
 try{
  if(file.type==='application/pdf'){
   const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs-dist/build/pdf.worker.min.mjs',import.meta.url).href;
   const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),disableFontFace:true,maxImageSize:12000000});const pdf=await task.promise;
   try{if(pdf.numPages>10)throw new Error('Use documentos de até 10 páginas. Divida o PDF.');method='pdf-text';for(let i=1;i<=pdf.numPages;i++){onProgress(`Lendo página ${i} de ${pdf.numPages}…`);const page=await pdf.getPage(i),content=await page.getTextContent();let pageText=content.items.map(item=>'str'in item?item.str+('hasEOL'in item&&item.hasEOL?'\n':' '):'').join('');if(pageText.trim().length<30){method='ocr';const viewport=page.getViewport({scale:1.5});if(viewport.width*viewport.height>12000000)throw new Error('Página muito grande para leitura.');const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;await page.render({canvas,viewport}).promise;pageText=await recognize(canvas);canvas.width=canvas.height=0;}text+=pageText+'\n';if(text.length>60000)throw new Error('Documento contém texto demais. Divida em arquivos menores.');page.cleanup();}}finally{await task.destroy();}
  }else{const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>12000000){bitmap.close();throw new Error('Imagem deve ter até 12 megapixels.');}bitmap.close();text=await recognize(file);method='ocr';}
  return {text:text.slice(0,60000),method,duration_ms:Math.round(performance.now()-start)};
 }finally{await worker?.terminate();}
}
