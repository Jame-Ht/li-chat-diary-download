import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const source=process.env.SITE_SOURCE||'website';
const output=process.env.SITE_OUTPUT||'_site';
const manifest=JSON.parse(await readFile(path.join(source,'downloads.json'),'utf8'));
const html=await readFile(path.join(source,'index.html'),'utf8');
const files=['LiChatDiary.exe','ModelAPI.txt','ReadMe.txt'];
if(manifest.files.length!==3||new Set(manifest.files.map(f=>f.name)).size!==3||manifest.files.some(f=>!files.includes(f.name)))throw Error('Expected exactly three download files');
const anchors=[...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);
if(anchors.length!==3||files.some(f=>!anchors.includes(`downloads/${f}`))||html.includes('\uFFFD')||html.includes('Source code')||html.includes('chatgpt.site')||html.includes('0.1.13'))throw Error('Invalid website content');
await mkdir(path.join(output,'downloads'),{recursive:true});
await writeFile(path.join(output,'index.html'),html);
await writeFile(path.join(output,'.nojekyll'),'');
for(const file of manifest.files){
 const url=new URL(file.url);
 if(url.origin!=='https://github.com'||!url.pathname.startsWith('/Jame-Ht/li-chat-diary-download/releases/download/'))throw Error('Unexpected download source');
 let bytes;
 if(process.env.LOCAL_DOWNLOADS)bytes=await readFile(path.join(process.env.LOCAL_DOWNLOADS,file.name));
 else {const response=await fetch(file.url,{signal:AbortSignal.timeout(300000)});if(!response.ok)throw Error(`Download failed: ${file.name} HTTP ${response.status}`);bytes=Buffer.from(await response.arrayBuffer());}
 const digest=`sha256:${createHash('sha256').update(bytes).digest('hex')}`;
 if(bytes.length!==file.size||digest!==file.digest)throw Error(`Content verification failed: ${file.name}`);
 await writeFile(path.join(output,'downloads',file.name),bytes);
 console.log(`Verified and packaged: ${file.name} (${bytes.length} bytes)`);
}
console.log('Website ready: one page, three verified downloads.');
