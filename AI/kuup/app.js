(function installKuupFatalHandler(){const show=(kind,message,error)=>{try{console.error('[Kuup '+kind+']',message,error);let box=document.getElementById('notice');if(box){box.textContent='Kuupの起動エラー: '+message;box.style.display='block';box.style.color='#b42318';box.style.fontWeight='700';box.style.whiteSpace='pre-wrap';}let panel=document.getElementById('kuupFatal');if(!panel){panel=document.createElement('div');panel.id='kuupFatal';panel.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;padding:12px 14px;border-radius:12px;background:#fff4f2;color:#8f1d14;border:1px solid #f2b8b5;box-shadow:0 8px 28px rgba(0,0,0,.18);font:600 13px/1.45 system-ui,sans-serif;white-space:pre-wrap;word-break:break-word;';document.body?.appendChild(panel);}if(panel)panel.textContent='Kuup起動エラー\\n'+message;}catch{}};window.addEventListener('error',e=>show('error',e.message||'JavaScriptエラー',e.error));window.addEventListener('unhandledrejection',e=>{const r=e.reason;show('promise',r?.stack||r?.message||String(r),r);});})();
const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
const API_BASE='/AI/Kuup/API';
let authToken=localStorage.getItem('somenai-token')||'',chats=[],current=null,conversation=[],busy=false,register=false,config,usageState,settings={studyMode:0,webMode:'auto'},generationController=null,generationRequestId='',siteMode=false,siteConversation=[],siteGenerationController=null,siteProjectId=null,siteProjectStatus='idle',siteProject=null,sitePreviewPath='',sitePublished=null,siteTitle='My Site',sitePollTimer=0,siteGitHub=null,siteCapabilities={},githubConnection=null,githubRepos=[],siteActivityAutoTail=true,siteActivityClock=0,quality=['low','normal','high','image'].includes(localStorage.getItem('somenai-quality'))?localStorage.getItem('somenai-quality'):'normal',imageMode=false;
const qualityInfo={low:{label:'低',color:'green'},normal:{label:'中',color:'blue'},high:{label:'高',color:'purple'},image:{label:'画像生成',color:'orange'}};
const notice=s=>q('#notice').textContent=s||'';
function clearPromptBox(){const el=q('#prompt');el.value='';el.style.height='';el.scrollTop=0;}
async function api(path,method='GET',data){const headers={'Accept':'application/json'};if(data)headers['Content-Type']='application/json';if(authToken)headers.Authorization='Bearer '+authToken;const url=API_BASE+path;let res;try{res=await fetch(url,{method,headers,body:data?JSON.stringify(data):undefined,cache:'no-store',credentials:'same-origin',mode:'same-origin'});}catch(e){console.error('Kuup API request failed:',url,e);throw new Error('Kuup AIサーバーに接続できません。');}let value={};try{value=await res.json();}catch{}if(!res.ok){if(res.status===401&&!['/login','/register'].includes(path)){authToken='';localStorage.removeItem('somenai-token');if(!q('#auth').open)q('#auth').showModal();}throw new Error(value.error||`通信エラー（${res.status}）`);}return value;}
const safe=fn=>(...args)=>{try{return Promise.resolve(fn(...args)).catch(e=>notice(e.message));}catch(e){notice(e.message);}};
function closePopovers(except){for(const el of qa('.menu-card'))if(el!==except)el.hidden=true;}
function updateModel(){if(siteMode){const mark=q('#modelButton .header-mark');if(mark)mark.src='./cook-logo.svg';q('#modelName').textContent='Kuup Cook · 自動';q('#prompt').placeholder=siteProjectStatus==='running'?'バックグラウンドで作業中…':siteProject?.mode==='repo'?'このリポジトリに何をする？ 追加・変更・削除を頼めます':siteProject?'どこを変える？ 追加の指示を送ってください':'作りたいサイトを説明してください';q('#attachButton').hidden=true;q('#modelButton').classList.add('site-auto');return;}const mark=q('#modelButton .header-mark');if(mark)mark.src='./kuup-mark.jpg';q('#modelButton').classList.remove('site-auto');const qualityMeta=qualityInfo[quality];if(usageState)q('#usageTiny').textContent=usageState.items[quality].remaining;q('#modelName').textContent=quality==='image'?'画像生成':`Kuup AI ${qualityMeta.label}`;q('#prompt').placeholder=quality==='image'?'つくりたい画像を説明してください':'Kuup AI にメッセージを送信';q('#attachButton').hidden=quality==='image';if(typeof pendingAssets!=='undefined'&&pendingAssets.length)updateAttachmentNotice();qa('[data-quality]').forEach(b=>{b.classList.toggle('selected',b.dataset.quality===quality);b.setAttribute('aria-pressed',String(b.dataset.quality===quality));});}
function renderUsage(){if(!usageState)return;q('#usageTiny').textContent=usageState.items[quality].remaining;const names={low:'🟢 低',normal:'🔵 中',high:'🟣 高',image:'🎨 画像生成'};for(const k of ['low','normal','high','image'])q('#left'+(k==='normal'?'Normal':k[0].toUpperCase()+k.slice(1))).textContent=`残り ${usageState.items[k].remaining}`;q('#usageCards').replaceChildren(...Object.entries(usageState.items).map(([k,v])=>{const d=document.createElement('div');d.className='usage-card';const s=document.createElement('small'),strong=document.createElement('strong');s.textContent=names[k];strong.textContent=`残り ${v.remaining} / ${v.limit}回`;d.append(s,strong);return d;}));}
async function refreshUsage(){usageState=await api('/usage');renderUsage();}

function renderHistory(){
 const nav=q('#history');nav.replaceChildren();const term=q('#search').value.trim().toLowerCase(),list=chats.filter(c=>c.title.toLowerCase().includes(term));
 for(const c of list){
  const row=document.createElement('div');row.className='history-row '+(c.kind==='site'?'site':'chat');
  const b=document.createElement('button');b.className='history-item '+((c.kind==='site'&&siteMode&&c.id===siteProjectId)||(!siteMode&&c.id===current)?'active':'');b.dataset.kind=c.kind||'chat';
  const icon=document.createElement('span');icon.className='history-kind';icon.textContent=c.kind==='site'?'◇':'';
  const label=document.createElement('span');label.className='history-label';label.textContent=c.title;b.append(icon,label);
  if(c.kind==='site'){
   const state=document.createElement('span');state.className='history-site-state '+(c.status||'idle');state.textContent=c.status==='running'?'作業中':c.status==='complete'?'完了':c.status==='error'?'エラー':c.status==='stopped'?'停止':'待機';
   if(c.status==='running'){const spin=document.createElement('i');spin.className='history-running';spin.setAttribute('aria-hidden','true');state.prepend(spin);}b.append(state);
  }
  bindHistoryActions(b,c);row.append(b);
  if(c.kind==='site'){
   const del=document.createElement('button');del.type='button';del.className='history-site-delete';del.setAttribute('aria-label',c.title+'を削除');del.setAttribute('title','Cookを削除');
   del.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M7 7l1 13h8l1-13"/><path d="M10 11v5M14 11v5"/></svg>';
   del.onclick=e=>{e.stopPropagation();siteHistoryActions(c);};row.append(del);
  }
  nav.append(row);
 }
 if(!list.length){const p=document.createElement('p');p.textContent=term?'見つかりません':'会話はここに表示されます';nav.append(p);}
}
async function refresh(){chats=await api('/chats');renderHistory();const selected=siteMode?chats.find(c=>c.kind==='site'&&c.id===siteProjectId):chats.find(c=>(c.kind||'chat')==='chat'&&c.id===current);q('#chatTitle').textContent=selected?.title||(siteMode?'Kuup Cook':'新しいチャット');}
function inline(el,text){const parts=text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);for(const p of parts){if(p.startsWith('**')&&p.endsWith('**')){const n=document.createElement('strong');n.textContent=p.slice(2,-2);el.append(n);}else if(p.startsWith('`')&&p.endsWith('`')){const n=document.createElement('code');n.textContent=p.slice(1,-1);el.append(n);}else el.append(document.createTextNode(p));}}
function tableNode(lines){
 const wrap=document.createElement('div');
 wrap.className='table-wrap';
 wrap.style.cssText='display:block;width:100%;max-width:100%;min-width:0;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;touch-action:pan-x;overscroll-behavior-x:contain;box-sizing:border-box;';
 const table=document.createElement('table');
 table.setAttribute('role','table');
 const rows=lines.filter((_,i)=>i!==1).map((line,i)=>{
  const tr=document.createElement('tr');
  line.replace(/^\||\|$/g,'').split('|').forEach(cell=>{
   const el=document.createElement(i?'td':'th');
   inline(el,cell.trim());
   tr.append(el);
  });
  if(i===0)tr.classList.add('table-header-row');
  return tr;
 });
 const columnCount=Math.max(1,...rows.map(row=>row.children.length));
 const tableWidth=Math.max(1000,columnCount*240);
 const colgroup=document.createElement('colgroup');
 for(let i=0;i<columnCount;i++){
  const col=document.createElement('col');
  col.style.width='240px';
  colgroup.append(col);
 }
 table.append(colgroup);
 table.style.cssText='display:table!important;width:'+tableWidth+'px!important;min-width:'+tableWidth+'px!important;max-width:none!important;table-layout:fixed!important;border-collapse:collapse;';
 rows[0]?.children && [...rows[0].children].forEach((el,j)=>{el.style.width='240px';el.style.minWidth='240px';});
 const headers=rows[0]?[...rows[0].children].map(el=>el.textContent.trim()):[];
 rows.forEach((tr,i)=>{
  [...tr.children].forEach((el,j)=>{
   el.style.width='240px';
   el.style.minWidth='240px';
   if(i>0&&el.tagName==='TD')el.dataset.label=headers[j]||'項目';
  });
  table.append(tr);
 });
 wrap.append(table);
 return wrap;
}
function chartNode(raw){const box=document.createElement('div');box.className='chart';try{const d=JSON.parse(raw);const title=document.createElement('strong');title.textContent=d.title||'グラフ';box.append(title);const max=Math.max(...d.values,1);d.labels.forEach((label,i)=>{const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:90px 1fr 45px;gap:8px;align-items:center;margin:8px 0;font-size:12px';const l=document.createElement('span'),track=document.createElement('span'),bar=document.createElement('i'),v=document.createElement('b');l.textContent=label;track.style.cssText='height:12px;background:var(--hover);border-radius:6px;overflow:hidden';bar.style.cssText=`display:block;height:100%;width:${Math.max(2,d.values[i]/max*100)}%;background:#4385f5;border-radius:6px`;v.textContent=d.values[i];track.append(bar);row.append(l,track,v);box.append(row);});}catch{const pre=document.createElement('pre');pre.textContent=raw;box.append(pre);}return box;}
function normalizedCodeLang(lang){return (lang||'').trim().toLowerCase().replace(/^language-/,'');}
function codeMeta(lang,code){const l=normalizedCodeLang(lang);const html=l==='html'||l==='htm'||l==='xhtml'||(!l&&/^\s*(?:<!doctype\s+html|<html[\s>])/i.test(code));if(html)return{label:'HTML',ext:'html',mime:'text/html;charset=utf-8',runnable:true};const types={css:['CSS','css','text/css;charset=utf-8'],js:['JavaScript','js','text/javascript;charset=utf-8'],javascript:['JavaScript','js','text/javascript;charset=utf-8'],ts:['TypeScript','ts','text/plain;charset=utf-8'],typescript:['TypeScript','ts','text/plain;charset=utf-8'],json:['JSON','json','application/json;charset=utf-8'],py:['Python','py','text/x-python;charset=utf-8'],python:['Python','py','text/x-python;charset=utf-8'],java:['Java','java','text/plain;charset=utf-8'],c:['C','c','text/plain;charset=utf-8'],cpp:['C++','cpp','text/plain;charset=utf-8'],cxx:['C++','cpp','text/plain;charset=utf-8'],cs:['C#','cs','text/plain;charset=utf-8'],csharp:['C#','cs','text/plain;charset=utf-8'],php:['PHP','php','text/plain;charset=utf-8'],rb:['Ruby','rb','text/plain;charset=utf-8'],ruby:['Ruby','rb','text/plain;charset=utf-8'],go:['Go','go','text/plain;charset=utf-8'],rs:['Rust','rs','text/plain;charset=utf-8'],rust:['Rust','rs','text/plain;charset=utf-8'],sh:['Shell','sh','text/plain;charset=utf-8'],bash:['Bash','sh','text/plain;charset=utf-8'],sql:['SQL','sql','text/plain;charset=utf-8'],xml:['XML','xml','application/xml;charset=utf-8'],svg:['SVG','svg','image/svg+xml;charset=utf-8'],md:['Markdown','md','text/markdown;charset=utf-8'],markdown:['Markdown','md','text/markdown;charset=utf-8'],yaml:['YAML','yaml','text/yaml;charset=utf-8'],yml:['YAML','yml','text/yaml;charset=utf-8']};const t=types[l];return t?{label:t[0],ext:t[1],mime:t[2],runnable:false}:{label:l?l.toUpperCase():'CODE',ext:l&&/^[a-z0-9]+$/.test(l)?l:'txt',mime:'text/plain;charset=utf-8',runnable:false};}
async function copyCodeText(text){if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return;}catch{}}const area=document.createElement('textarea');area.value=text;area.setAttribute('readonly','');area.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';document.body.append(area);area.select();document.execCommand('copy');area.remove();}
function downloadCode(code,meta){const url=URL.createObjectURL(new Blob([code],{type:meta.mime})),a=document.createElement('a');a.href=url;a.download='kuup-code-'+new Date().toISOString().replace(/[:.]/g,'-')+'.'+meta.ext;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function openHtmlPreview(code){const dialog=document.createElement('dialog');dialog.className='code-preview-dialog';const shell=document.createElement('div');shell.className='code-preview-shell';const head=document.createElement('div');head.className='code-preview-head';const title=document.createElement('strong');title.textContent='HTML プレビュー';const close=document.createElement('button');close.className='code-preview-close';close.type='button';close.textContent='×';close.setAttribute('aria-label','プレビューを閉じる');const frame=document.createElement('iframe');frame.className='code-preview-frame';frame.title='HTMLプレビュー';frame.setAttribute('sandbox','allow-scripts allow-modals allow-downloads');frame.src='./code-preview.html?v=1';close.onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();frame.onload=()=>frame.contentWindow?.postMessage({type:'kuup-html-preview',html:code},'*');head.append(title,close);shell.append(head,frame);dialog.append(shell);document.body.append(dialog);dialog.showModal();}
function codeIconButton(icon,label,extra=''){const b=document.createElement('button');b.type='button';b.className='code-icon '+extra;b.setAttribute('aria-label',label);b.setAttribute('title',label);const i=document.createElement('span');i.className='code-icon-glyph';i.setAttribute('aria-hidden','true');i.innerHTML=icon;b.append(i);return b;}
function codeNode(lang,code){const meta=codeMeta(lang,code),box=document.createElement('div');box.className='code-block';const bar=document.createElement('div');bar.className='code-toolbar';const label=document.createElement('span');label.className='code-language';label.textContent=meta.label;const actions=document.createElement('div');actions.className='code-actions';const copy=codeIconButton('<svg viewBox="0 0 24 24"><rect x="8" y="8" width="10" height="10" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>','コードを全部コピー','code-copy');copy.onclick=safe(async()=>{await copyCodeText(code);copy.classList.add('done');copy.setAttribute('aria-label','コピーしました');copy.setAttribute('title','コピーしました');setTimeout(()=>{if(copy.isConnected){copy.classList.remove('done');copy.setAttribute('aria-label','コードを全部コピー');copy.setAttribute('title','コードを全部コピー');}},1200);});const download=codeIconButton('<svg viewBox="0 0 24 24"><path d="M12 4v10"/><path d="m8 10 4 4 4-4"/><path d="M5 19h14"/></svg>','コードをダウンロード','code-download');download.onclick=()=>downloadCode(code,meta);actions.append(copy,download);if(meta.runnable){const run=codeIconButton('<svg viewBox="0 0 24 24" class="play"><path d="M8 5.5v13l10-6.5z"/></svg>','HTMLを実行','code-run');run.onclick=()=>openHtmlPreview(code);actions.append(run);}bar.append(label,actions);const pre=document.createElement('pre'),c=document.createElement('code');c.textContent=code;pre.append(c);box.append(bar,pre);return box;}
function renderMath(target){
 if(typeof window.renderMathInElement!=='function')return;
 try{
  window.renderMathInElement(target,{
   delimiters:[
    {left:'$$',right:'$$',display:true},
    {left:'\\[',right:'\\]',display:true},
    {left:'$',right:'$',display:false},
    {left:'\\(',right:'\\)',display:false}
   ],
   throwOnError:false,
   strict:false
  });
 }catch{}
}
function normalizeRichText(text){return String(text??'').replace(/\r\n?/g,'\n').replace(/<!--[\s\S]*?-->/g,'').replace(/<br\b[^>]*>/gi,'\n').replace(/&lt;br\b[^&]*&gt;/gi,'\n').replace(/&nbsp;/gi,' ').replace(/<\/?[a-z][^>]*>/gi,'');}
function format(target,text){const blocks=String(text??'').replace(/\r\n?/g,'\n').split(/```/);target.replaceChildren();blocks.forEach((block,bi)=>{if(bi%2){const first=block.indexOf('\n'),lang=first>=0?block.slice(0,first).trim():'',code=first>=0?block.slice(first+1):block;if(lang==='chart')target.append(chartNode(code));else target.append(codeNode(lang,code));return;}const lines=normalizeRichText(block).split('\n');for(let i=0;i<lines.length;){if(lines[i].includes('|')&&lines[i+1]&&/^\s*\|?\s*:?-+/.test(lines[i+1])){const group=[lines[i],lines[i+1]];i+=2;while(i<lines.length&&lines[i].includes('|'))group.push(lines[i++]);target.append(tableNode(group));continue;}const line=lines[i++];if(!line.trim())continue;const h=line.match(/^#{1,4}\s+(.+)/);const quote=line.match(/^>\s?(.+)/);const el=document.createElement(h?'h3':quote?'blockquote':'p');inline(el,h?h[1]:quote?quote[1]:line);target.append(el);}});renderMath(target);}
function streamPainter(answer){
 let queue='',timer=0,lastPaint=0,resolveDrain=null;
 const paint=()=>{if(!queue){clearInterval(timer);timer=0;if(resolveDrain){resolveDrain();resolveDrain=null;}return;}const take=queue.length>700?18:queue.length>250?8:queue.length>80?3:1;answer.content+=queue.slice(0,take);queue=queue.slice(take);const now=performance.now();if(now-lastPaint>28||!queue){const target=q('#messages').lastElementChild?.querySelector('.content');if(target)format(target,answer.content);lastPaint=now;const pane=q('#messages');if(pane.scrollHeight-pane.scrollTop-pane.clientHeight<180)pane.scrollTop=pane.scrollHeight;}};
 return {push(text){queue+=text;if(!timer)timer=setInterval(paint,12);},async drain(){if(!queue)return;if(!timer)timer=setInterval(paint,8);await new Promise(resolve=>{resolveDrain=resolve;});},cancel(){queue='';if(timer)clearInterval(timer);timer=0;resolveDrain?.();resolveDrain=null;}};
}
function sourcesNode(items){const details=document.createElement('details');details.className='sources';const grid=document.createElement('div');grid.className='source-grid';let count=0;for(const source of items){let url;try{url=new URL(source.url);if(!['http:','https:'].includes(url.protocol))continue;}catch{continue;}const link=document.createElement('a');link.className='source-card';link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';const copy=document.createElement('span');copy.className='source-copy';const title=document.createElement('strong');title.textContent=source.title||url.hostname;const site=document.createElement('small');site.textContent=url.hostname.replace(/^www\\./,'');copy.append(title,site);const arrow=document.createElement('span');arrow.className='source-arrow';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');link.append(copy,arrow);grid.append(link);count++;}if(!count)return document.createDocumentFragment();const summary=document.createElement('summary');const label=document.createElement('span');label.textContent='参照元';const amount=document.createElement('small');amount.textContent=count+'件';const caret=document.createElement('span');caret.className='source-caret';caret.setAttribute('aria-hidden','true');caret.textContent='⌄';summary.append(label,amount,caret);details.append(summary,grid);return details;}
function localizeCookProgressLabel(label=''){
 const text=String(label||'');
 const exact={
  'Reading the order...':'依頼を確認しています…',
  'Checking the recipe...':'依頼の難しさを確認しています…',
  'Preparing ingredients...':'サイト構成を考えています…',
  'Preparing the next cook...':'変更内容を整理しています…',
  'Cooking the files...':'ファイルを作成しています…',
  'Taste testing...':'動作を確認しています…'
 };
 if(exact[text])return exact[text];
 let m=text.match(/^Recipe grade ([ABC])$/);if(m)return '難易度 '+m[1]+' と判定しました';
 m=text.match(/^Picking a chef\.\.\.\s*(Low|Mid|High)$/);if(m)return 'クックを選んでいます… '+({Low:'低',Mid:'中',High:'高'}[m[1]]||m[1]);
 m=text.match(/^Switching chefs\.\.\.\s*(Low|Mid|High)$/);if(m)return 'クックを交代させています… '+({Low:'低',Mid:'中',High:'高'}[m[1]]||m[1]);
 m=text.match(/^Calling the same chef again\.\.\.\s*(\d+\/\d+)$/);if(m)return '同じクックを呼び直しています… '+m[1];
 m=text.match(/^Plating\s+(\d+)\s+files\.\.\.$/);if(m)return m[1]+'個のファイルをプレビュー用に準備しています…';
 return text;
}

function formatCookElapsed(ms){
 const total=Math.max(0,Math.floor(Number(ms||0)/1000)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),sec=total%60;
 return h?(h+'時間 '+m+'分 '+sec+'秒'):m?(m+'分 '+sec+'秒'):(sec+'秒');
}
function renderCookActivity(job){
 const dialog=q('#siteActivityDialog');if(!dialog||!job)return;
 const status=job.status||siteProjectStatus||'running';
 const title=q('#siteActivityTitle'),meta=q('#siteActivityMeta'),steps=q('#siteActivitySteps'),output=q('#siteActivityOutput'),outputMeta=q('#siteActivityOutputMeta'),live=q('#siteActivityLive');
 if(title)title.textContent=status==='complete'?'Cookの作業が完了しました':status==='error'?'Cookがエラーで停止しました':status==='stopped'?'Cookを停止しました':'Cookの作業を確認中…';
 if(live){live.textContent=status==='running'?'LIVE':status==='complete'?'DONE':status.toUpperCase();live.className='site-activity-live '+status;}
 const elapsed=status==='running'&&job.startedAt?Date.now()-job.startedAt:job.startedAt?Math.max(0,Number(job.updated||Date.now())-Number(job.startedAt)):0;
 const chars=Number(job.liveOutputChars||0);
 if(meta)meta.textContent='経過 '+formatCookElapsed(elapsed)+' · AI出力 '+chars.toLocaleString()+'文字';
 if(steps){
  steps.replaceChildren();
  for(const step of job.progress||[]){
   const row=document.createElement('div');row.className='site-activity-step '+(step.state||'done');
   const icon=document.createElement('span');icon.textContent=step.state==='active'?'●':step.state==='error'?'!':step.state==='stopped'?'■':'✓';
   const copy=document.createElement('div');const label=document.createElement('b');label.textContent=localizeCookProgressLabel(step.label);copy.append(label);row.append(icon,copy);steps.append(row);
  }
 }
 const value=String(job.liveOutput||'');
 if(output){output.textContent=value||'AIの出力を待っています…';if(siteActivityAutoTail)output.scrollTop=output.scrollHeight;}
 if(outputMeta)outputMeta.textContent=value?(value.length.toLocaleString()+'文字表示'):'まだ出力なし';
}
function openCookActivity(){
 const dialog=q('#siteActivityDialog');if(!dialog)return;dialog.showModal();siteActivityAutoTail=true;
 const job=siteConversation.find(x=>x.kind==='progress')?.job;if(job)renderCookActivity(job);
}
function closeCookActivity(){const dialog=q('#siteActivityDialog');if(dialog?.open)dialog.close();}
function siteProgressNode(m){
 const article=document.createElement('article');article.className='message assistant site-progress-message';
 const who=document.createElement('div');who.className='who';const logo=document.createElement('span');logo.className='mini-logo';const label=document.createElement('span');label.textContent='Kuup Cook';who.append(logo,label);article.append(who);
 const status=m.status||'working',card=document.createElement('div');card.className='site-progress-card '+status;
 const head=document.createElement('div');head.className='site-progress-head';const mark=document.createElement('span');
 if(status==='success'){mark.className='site-progress-check';mark.textContent='✓';}else if(status==='error'){mark.className='site-progress-error';mark.textContent='!';}else if(status==='stopped'){mark.className='site-progress-stopped';mark.textContent='■';}else mark.className='site-progress-spinner';
 const title=document.createElement('b');title.textContent=status==='success'?'完成しました ✓':status==='error'?'作成に失敗しました':status==='stopped'?'停止しました':'作成中…';head.append(mark,title);card.append(head);
 const job=m.job;
 if(job){
  const bar=document.createElement('button');bar.type='button';bar.className='site-progress-inspector';bar.innerHTML='<span><b>作業の中身を見る</b><small>コード生成・検索・確認などの進捗とAI出力を表示</small></span><strong>›</strong>';bar.onclick=openCookActivity;card.append(bar);
  const stats=document.createElement('div');stats.className='site-progress-live-meta';
  const chars=Number(job.liveOutputChars||0);const elapsed=job.startedAt?Date.now()-job.startedAt:0;stats.textContent=(status==='working'?'実行中 · ':'')+'経過 '+formatCookElapsed(elapsed)+' · AI出力 '+chars.toLocaleString()+'文字';card.append(stats);
 }
 for(const step of m.steps||[]){const row=document.createElement('div');row.className='site-progress-step '+(step.state||'done');const icon=document.createElement('span');icon.textContent=step.state==='active'?'●':step.state==='error'?'!':step.state==='stopped'?'■':'✓';const text=document.createElement('span');text.textContent=localizeCookProgressLabel(step.label);row.append(icon,text);card.append(row);}
 if(status==='error'&&m.error){const detail=document.createElement('div');detail.className='site-progress-error-detail';detail.textContent=m.error;card.append(detail);}
 if(status==='error'||status==='stopped'){const retry=document.createElement('button');retry.type='button';retry.className='site-progress-retry';retry.textContent='↻ もう一度試す';retry.onclick=()=>{const last=[...siteConversation].reverse().find(x=>x.role==='user'&&x.content)?.content;if(last&&!busy){q('#prompt').value=last;sendSiteMessage();}};card.append(retry);}
 article.append(card);return article;
}
function siteProjectNode(m){
 const isRepo=m.project?.mode==='repo',article=document.createElement('article');article.className='message assistant site-project-message';const who=document.createElement('div');who.className='who';const logo=document.createElement('span');logo.className='mini-logo';const label=document.createElement('span');label.textContent='Kuup Cook';who.append(logo,label);article.append(who);
 const bubble=document.createElement('div');bubble.className='site-project-card';const top=document.createElement('div');top.className='site-project-top';const copy=document.createElement('div');const kicker=document.createElement('small');kicker.textContent=isRepo?'GitHubリポジトリ':'完成';const title=document.createElement('b');title.textContent=m.project?.summary||(isRepo?'リポジトリを読み込みました。':'サイトが完成しました。');copy.append(kicker,title);top.append(copy);
 if(m.previewPath){const preview=document.createElement('button');preview.type='button';preview.className='site-preview-button';preview.textContent='▶ プレビュー';preview.onclick=()=>openSitePreview(m.previewPath);top.append(preview);}bubble.append(top);
 const files=document.createElement('div');files.className='site-file-list';const projectFiles=m.project?.files||[],visible=projectFiles.slice(0,24);for(const file of visible){const chip=document.createElement('span');chip.textContent=file.path;files.append(chip);}if(projectFiles.length>visible.length){const more=document.createElement('span');more.textContent='+'+(projectFiles.length-visible.length)+' ファイル';files.append(more);}bubble.append(files);
 if(isRepo&&m.project?.profile){
  const profile=document.createElement('div');profile.className='site-repo-profile';const h=document.createElement('b');h.textContent='リポジトリ解析';profile.append(h);
  const row=document.createElement('div');row.className='site-repo-profile-chips';const bits=[m.project.profile.kind,...(m.project.profile.frameworks||[]),...(m.project.profile.languages||[]).slice(0,3)].filter(Boolean);
  for(const bit of bits){const chip=document.createElement('span');chip.textContent=bit;row.append(chip);}profile.append(row);bubble.append(profile);
 }
 if(isRepo&&m.project?.changes){
  const changes=m.project.changes,section=document.createElement('div');section.className='site-change-summary';const head=document.createElement('div');head.className='site-change-summary-head';const h=document.createElement('b');h.textContent='今回の変更';const counts=document.createElement('span');counts.textContent='追加 '+(changes.added?.length||0)+' ・ 更新 '+(changes.modified?.length||0)+' ・ 削除 '+(changes.deleted?.length||0);head.append(h,counts);section.append(head);
  for(const [mark,items,kind] of [['＋',changes.added||[],'added'],['↻',changes.modified||[],'modified'],['−',changes.deleted||[],'deleted']]){for(const path of items.slice(0,8)){const line=document.createElement('div');line.className='site-change-line '+kind;const m=document.createElement('span');m.textContent=mark;const p=document.createElement('code');p.textContent=path;line.append(m,p);section.append(line);}if(items.length>8){const more=document.createElement('small');more.textContent='ほか '+(items.length-8)+' 件';section.append(more);}}
  bubble.append(section);
 }
 if(isRepo&&m.project?.checks?.length){
  const checks=document.createElement('details');checks.className='site-check-results';const summary=document.createElement('summary');summary.textContent='✓ 自動チェック '+m.project.checks.length+'件';checks.append(summary);const list=document.createElement('div');for(const item of m.project.checks.slice(0,20)){const line=document.createElement('div');line.textContent='✓ '+item;list.append(line);}checks.append(list);bubble.append(checks);
 }
 const actions=document.createElement('div');actions.className='site-project-actions';
 if(isRepo&&m.project?.source?.autoSave){const auto=document.createElement('span');auto.className='site-github-autosave';auto.textContent='GitHub自動保存 ON';actions.append(auto);}
 if(m.previewPath){const publish=document.createElement('button');publish.type='button';publish.disabled=siteProjectStatus==='running'||siteCapabilities.canPublish===false;publish.textContent=siteProjectStatus==='running'?'作業完了後に公開':sitePublished?'公開内容を更新':(isRepo?'サイト公開':'公開する');publish.onclick=safe(publishSiteProject);actions.append(publish);}
 const github=document.createElement('button');github.type='button';github.className='site-github-button';github.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6a4.7 4.7 0 0 1 1.3-3.2c-.1-.3-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.3 2.9.1 3.2a4.7 4.7 0 0 1 1.3 3.2c0 4.6-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.4 11.4 0 0 0 12 .8Z"/></svg><span>'+(siteGitHub?(isRepo?'GitHubへ変更を保存':'GitHubを更新'):'GitHubへ保存')+'</span>';github.onclick=safe(openGitHubExport);if(siteProjectStatus==='running'){github.disabled=true;const label=github.querySelector('span');if(label)label.textContent='作業完了後にGitHubへ保存';}actions.append(github);
 if(sitePublished){const open=document.createElement('a');open.href=sitePublished.url;open.target='_blank';open.rel='noopener';open.textContent='公開ページ ↗';actions.append(open);const copyUrl=document.createElement('button');copyUrl.type='button';copyUrl.textContent='URLをコピー';copyUrl.onclick=safe(async()=>{await copyCodeText(sitePublished.url);copyUrl.textContent='コピーしました';setTimeout(()=>{if(copyUrl.isConnected)copyUrl.textContent='URLをコピー';},1000);});actions.append(copyUrl);const revoke=document.createElement('button');revoke.type='button';revoke.className='site-revoke';revoke.textContent='公開を取り消す';revoke.onclick=safe(revokeSiteProject);actions.append(revoke);}
 bubble.append(actions);article.append(bubble);return article;
}
function siteMessageNode(m){if(m.kind==='progress')return siteProgressNode(m);if(m.kind==='project')return siteProjectNode(m);const node=messageNode(m,Number.MIN_SAFE_INTEGER);if(m.role==='assistant'){const label=node.querySelector('.who span:last-child');if(label)label.textContent='Kuup Cook';}return node;}
function renderSiteConversation({forceBottom=false}={}){
 const area=q('#messages'),distanceFromBottom=area.scrollHeight-area.scrollTop-area.clientHeight,wasNearBottom=distanceFromBottom<140;
 area.replaceChildren(...siteConversation.map(siteMessageNode));
 if(siteProject){
  const card=siteProjectNode({project:siteProject,previewPath:sitePreviewPath});
  if(siteProjectStatus==='running'){
   const badge=document.createElement('div');badge.className='site-previous-build';
   const emptyRepo=siteProject?.mode==='repo'&&!(siteProject?.files||[]).length;
   badge.textContent=emptyRepo?'GitHubリポジトリを準備済み · Cookが作成中':'前の完成版 · 作業中も利用できます';
   const projectCard=card.querySelector('.site-project-card');if(projectCard)projectCard.prepend(badge);
  }
  area.append(card);
 }
 q('#welcome').hidden=true;q('#siteBuilderOpen').classList.add('active');q('#chatTitle').textContent=siteTitle||'Kuup Cook';for(const id of ['rename','delete','export'])q('#'+id).disabled=true;
 const running=siteProjectStatus==='running';q('#send').hidden=running;q('#stop').hidden=!running;q('#stop').disabled=false;q('#prompt').disabled=running;requestAnimationFrame(()=>{if(forceBottom||wasNearBottom)area.scrollTop=area.scrollHeight;});
}
function siteStateMessages(data){
 const result=(data.messages||[]).map(m=>({role:m.role,content:m.content}));
 if(data.job){
  const status=data.job.status==='complete'?'success':data.job.status==='error'?'error':data.job.status==='stopped'?'stopped':'working';
  if(data.job.progress?.length||data.job.status==='running'||data.job.error)result.push({role:'assistant',kind:'progress',steps:data.job.progress||[],status,error:data.job.error||'',job:data.job});
 }
 return result;
}
function applySiteProjectData(data,{renderNow=true}={}){
 siteProjectId=data.id;siteProjectStatus=data.status||'idle';siteProject=data.project||null;sitePreviewPath=data.previewPath||'';
 const fallbackPublishedUrl=data.published?.slug?'https://asro.jp/AI/kuup/'+encodeURIComponent(q('#username').textContent)+'/'+encodeURIComponent(data.published.slug):'';
 sitePublished=data.published?{...data.published,url:data.published.url||fallbackPublishedUrl}:null;siteGitHub=data.github||null;
 siteCapabilities=data.capabilities||{mode:siteProject?.mode==='repo'?'repo':'site',fileCount:siteProject?.files?.length||0,canPreview:!!sitePreviewPath,canPublish:!!sitePreviewPath&&siteProjectStatus!=='running',canGitHubSave:!!siteProject,gitHubAutoSave:!!siteProject?.source?.autoSave};
 siteTitle=data.title||'Kuup Cook';siteConversation=siteStateMessages(data);renderCookActivity(data.job);if(data.status!=='running'){q('#toolStatus').hidden=true;q('#toolStatus').textContent='';}if(renderNow){updateModel();renderSiteConversation();renderHistory();}
}
async function pollSiteProject(id){
 clearTimeout(sitePollTimer);if(!id)return;
 let data=null;
 try{data=await api('/site-projects/'+id);}
 catch(e){
  if(siteMode&&siteProjectId===id&&siteProjectStatus==='running'){sitePollTimer=setTimeout(()=>pollSiteProject(id),1800);return;}
  if(siteMode&&siteProjectId===id)notice(e.message);return;
 }
 const before=siteProjectStatus;
 if(siteMode&&siteProjectId===id){applySiteProjectData(data);if(before==='running'&&data.status==='complete'&&data.previewPath){const shouldOpen=data.project?.mode!=='repo'||!q('#sitePreviewDrawer').hidden;if(shouldOpen)openSitePreview(data.previewPath);}}
 try{await refresh();}catch{}
 if(data.status==='running'&&siteMode&&siteProjectId===id){sitePollTimer=setTimeout(()=>pollSiteProject(id),800);return;}
 if(data.status!=='running'){try{await refreshUsage();}catch{}}
 if(q('#notice').textContent==='Kuup AIサーバーに接続できません。')notice('');
}
async function openSiteProject(id){
 if(busy&&generationController){generationController.abort();setBusy(false);}
 siteMode=true;document.body.classList.add('site-mode');current=null;pendingAssets=[];renderPending();closePopovers();closeSitePreview();document.body.classList.remove('sidebar-open');
 const data=await api('/site-projects/'+id);applySiteProjectData(data,{renderNow:false});updateModel();renderSiteConversation({forceBottom:true});renderHistory();if(data.status==='running')pollSiteProject(id);q('#prompt').focus();
}
function cookActionIntent(text){
 const t=String(text||'').normalize('NFKC').trim().replace(/[。.!！?？]+$/,'').replace(/\s+/g,'').replace(/github/ig,'GitHub');
 if(/^(?:この)?(?:サイト|ページ)?(?:を)?(?:プレビューして|プレビューする|見せて|表示して)$/.test(t))return 'preview';
 if(/^(?:この)?(?:サイト|ページ)?(?:を)?(?:公開して|公開する|デプロイして|デプロイする)$/.test(t))return 'publish';
 if(/^(?:この)?(?:サイト|ページ)?(?:の)?(?:公開を取り消して|公開を停止して|非公開にして)$/.test(t))return 'unpublish';
 if(/^(?:この)?(?:変更|サイト|プロジェクト)?(?:を)?GitHub(?:に|へ)?(?:保存して|保存する|反映して|反映する)$/.test(t))return 'github';
 return '';
}
async function runCookActionIntent(intent){
 if(!siteProjectId||!siteProject)return false;
 if(intent==='preview'){if(!sitePreviewPath)throw Error('まだプレビューできる画面がありません。まずCookに作成を頼んでね。');clearPromptBox();await openSitePreview(sitePreviewPath);notice('プレビューを開いたよ。');return true;}
 if(intent==='publish'){if(siteProjectStatus==='running')throw Error('Cookが作業中です。完成したらそのまま公開できるよ。');if(!sitePreviewPath)throw Error('このプロジェクトには公開できる index.html がありません。');clearPromptBox();await publishSiteProject();return true;}
 if(intent==='unpublish'){if(!sitePublished)throw Error('このサイトはまだ公開されていません。');clearPromptBox();await revokeSiteProject();return true;}
 if(intent==='github'){clearPromptBox();if(siteCapabilities.gitHubAutoSave){notice('GitHub自動保存はONだよ。Cookの変更はテスト通過後に自動で保存される。');return true;}await openGitHubExport();return true;}
 return false;
}
async function sendSiteMessage(){
 const text=q('#prompt').value.trim();if(!text||siteProjectStatus==='running')return;
 const action=cookActionIntent(text);if(action&&siteProjectId&&siteProject){await runCookActionIntent(action);return;}
 if(!siteProjectId){
  const created=await api('/site-projects','POST',{prompt:text});applySiteProjectData(created,{renderNow:false});
  siteConversation=siteStateMessages(created);if(!siteConversation.length)siteConversation=[{role:'assistant',content:'作業を始めたよ。別のチャットへ移動してもバックグラウンドで続くよ。'}];
 }
 clearPromptBox();await api('/site-projects/'+siteProjectId+'/messages','POST',{content:text});siteProjectStatus='running';updateModel();await refresh();await pollSiteProject(siteProjectId);
}
async function openSitePreview(path=sitePreviewPath){
 if(!path)return;sitePreviewPath=path;const frame=q('#sitePreviewFrame'),title=q('#sitePreviewTitle'),url=API_BASE+path+(path.includes('?')?'&':'?')+'v='+Date.now();
 q('#sitePreviewDrawer').hidden=false;document.body.classList.add('site-preview-open');title.textContent='プレビューを確認しています…';
 try{const check=await fetch(url,{cache:'no-store'});if(!check.ok)throw Error('プレビューを読み込めませんでした（'+check.status+'）');frame.src=url;title.textContent=siteTitle||'Kuup Cook';}
 catch(e){title.textContent='プレビューを開けませんでした';notice(e.message);}
}
function closeSitePreview(){q('#sitePreviewDrawer').hidden=true;document.body.classList.remove('site-preview-open');}
async function publishSiteProject(){if(!siteProjectId||!siteProject)return;const result=await api('/site-projects/'+siteProjectId+'/publish','POST',{});sitePublished=result;const data=await api('/site-projects/'+siteProjectId);applySiteProjectData(data);notice('');}
async function revokeSiteProject(){if(!siteProjectId||!sitePublished)return;await api('/site-projects/'+siteProjectId+'/publish','DELETE');sitePublished=null;const data=await api('/site-projects/'+siteProjectId);applySiteProjectData(data);notice('');}
async function openSiteBuilder(){
 if(busy&&generationController){generationController.abort();setBusy(false);}
 clearTimeout(sitePollTimer);siteMode=true;document.body.classList.add('site-mode');current=null;pendingAssets=[];renderPending();closePopovers();closeSitePreview();
 siteProjectId=null;siteProjectStatus='idle';siteProject=null;sitePreviewPath='';sitePublished=null;siteGitHub=null;siteCapabilities={};siteTitle='新しいCook';
 clearPromptBox();siteConversation=[{role:'assistant',content:'やりたいことをそのまま言って。新しいサイトやアプリを0から作ったり、今あるものを直したり、動作確認までCookが進めるよ。'}];
 updateModel();render();renderHistory();document.body.classList.remove('sidebar-open');q('#prompt').focus();
}
function messageNode(m,index){const article=document.createElement('article');article.className='message '+m.role;const bubble=document.createElement('div');bubble.className='bubble';if(m.role==='assistant'){const who=document.createElement('div');who.className='who';const logo=document.createElement('span');logo.className='mini-logo';logo.textContent='';const label=document.createElement('span');label.textContent=`Kuup AI${m.status==='interrupted'?' · 中断':''}`;who.append(logo,label);article.append(who);}const content=document.createElement('div');content.className='content';if(m.image){const img=document.createElement('img');img.className='generated-image';img.src=m.image;img.alt=m.content;content.append(img);const p=document.createElement('p');p.textContent=m.content;content.append(p);}else if(busy&&m.role==='assistant'&&!m.content){const dots=document.createElement('span');dots.className='thinking-dots';dots.setAttribute('aria-label','回答を生成しています');for(let n=0;n<3;n++)dots.append(document.createElement('i'));content.append(dots);}else format(content,m.content||'');for(const asset of m.assets||[]){const holder=document.createElement('div');holder.className='asset-holder';holder.textContent=asset.name;content.append(holder);loadMedia(asset,holder);}bubble.append(content);if(m.sources?.length)bubble.append(sourcesNode(m.sources));article.append(bubble);if(m.role==='assistant'&&(m.content||m.image)){const tools=document.createElement('div');tools.className='message-tools';const copy=document.createElement('button');copy.textContent='コピー';copy.onclick=safe(async()=>{await navigator.clipboard.writeText(m.content);copy.textContent='コピー済み';});tools.append(copy);if(index===conversation.length-1&&!m.image){const retry=document.createElement('button');retry.textContent='↻ 再生成';retry.disabled=busy;retry.onclick=safe(()=>send(true));tools.append(retry);}article.append(tools);}return article;}
function render(){if(siteMode){renderSiteConversation();return;}const area=q('#messages');area.replaceChildren(...conversation.map(messageNode));q('#welcome').hidden=conversation.length>0;q('#siteBuilderOpen').classList.remove('active');const generating=busy&&!!generationController;q('#send').hidden=generating;q('#send').disabled=busy;q('#stop').hidden=!generating;q('#stop').disabled=false;q('#prompt').disabled=busy;q('#fileInput').disabled=busy;q('#modelButton').disabled=busy;q('#logout').disabled=busy;q('#attachButton').disabled=busy;for(const id of ['rename','delete','export'])q('#'+id).disabled=!current||busy;}
function setBusy(v,mode='generation'){busy=v;const generating=v&&mode==='generation'&&!siteMode;document.body.classList.toggle('generating',generating);q('#messages').setAttribute('aria-busy',String(generating));q('#send').hidden=generating;q('#send').disabled=v;q('#stop').hidden=!generating;q('#stop').disabled=false;q('#prompt').disabled=v;q('#fileInput').disabled=v;q('#modelButton').disabled=v;q('#logout').disabled=v;q('#attachButton').disabled=v;renderHistory();render();}
async function openChat(id){clearTimeout(sitePollTimer);clearPromptBox();if(busy&&generationController){generationController.abort();setBusy(false);}siteMode=false;siteProjectId=null;document.body.classList.remove('site-mode');q('#stop').hidden=true;q('#send').hidden=false;q('#prompt').disabled=false;closeSitePreview();updateModel();pendingAssets=[];renderPending();const c=await api('/chats/'+id);current=id;conversation=c.messages;notice();render();renderHistory();q('#chatTitle').textContent=c.title;document.body.classList.remove('sidebar-open');q('#messages').scrollTop=q('#messages').scrollHeight;}
function newChat(){clearTimeout(sitePollTimer);clearPromptBox();if(busy&&generationController){generationController.abort();setBusy(false);}siteMode=false;document.body.classList.remove('site-mode');q('#stop').hidden=true;q('#send').hidden=false;q('#prompt').disabled=false;closeSitePreview();updateModel();pendingAssets=[];renderPending();current=null;conversation=[];q('#chatTitle').textContent='新しいチャット';render();renderHistory();notice();q('#prompt').focus();document.body.classList.remove('sidebar-open');}
function showToolStatus(event){const el=q('#toolStatus');el.classList.remove('search-wave');el.removeAttribute('aria-label');el.replaceChildren();if(event.name==='web_search'&&event.state==='done'){el.hidden=true;return;}el.hidden=false;if(event.name==='web_search'&&event.state==='running'){el.classList.add('search-wave');el.setAttribute('aria-label','検索中');const icon=document.createElement('span');icon.className='search-icon';icon.textContent='⌕';icon.setAttribute('aria-hidden','true');el.append(icon);for(const char of '検索中'){const letter=document.createElement('span');letter.className='search-letter';letter.textContent=char;letter.setAttribute('aria-hidden','true');el.append(letter);}return;}el.textContent=(event.name==='schoollink_search'?'🏫 ':'')+event.label;}
async function send(regenerate=false){
 if(busy)return;if(quality==='image'&&!regenerate)return generateImage();if(quality==='image'&&regenerate){notice('再生成する回答の精度を「低・中・高」から選んでください。');return;}
 const content=q('#prompt').value.trim();if(!regenerate&&!content)return;notice();generationController?.abort();generationController=new AbortController();generationRequestId=crypto.randomUUID();const localRequestId=generationRequestId,controller=generationController;setBusy(true);
 try{if(!current){current=(await api('/chats','POST',{})).id;await refresh();}}catch(e){if(localRequestId===generationRequestId)setBusy(false);throw e;}
 const id=current;let started=false,ended=false,answer,sources=[],painter=null;q('#toolStatus').hidden=true;
 try{
  const res=await fetch(`${API_BASE}/chats/${id}/generate`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+authToken},signal:controller.signal,body:JSON.stringify({content,regenerate,quality,assets:pendingAssets.map(a=>a.id),requestId:localRequestId})});
  if(!res.ok){const b=await res.json();throw new Error(b.error);}
  const reader=res.body.getReader(),decoder=new TextDecoder();let buffer='';
  while(true){const {value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line)continue;const event=JSON.parse(line);if(event.requestId&&event.requestId!==localRequestId)continue;
   if(event.type==='start'){started=true;if(regenerate){while(conversation.at(-1)?.role==='assistant')conversation.pop();}else{conversation.push({role:'user',content,assets:pendingAssets});pendingAssets=[];renderPending();clearPromptBox();}answer={role:'assistant',content:'',model:event.model,sources:[]};conversation.push(answer);painter=streamPainter(answer);render();}
   if(event.type==='tool')showToolStatus(event);
   if(event.type==='delta'){if(painter)painter.push(event.text);}
   if(event.type==='sources'){sources=event.items;answer.sources=sources;}
   if(event.type==='error')notice(event.message);
   if(event.type==='done')ended=true;
  }}
  await painter?.drain();
  if(!ended)throw Error('通信が途中で切れました。保存済みの回答を読み直しました。再生成できます。');
 }catch(e){painter?.cancel();if(e.name!=='AbortError')notice(e.message||'通信に失敗しました。');}
 finally{
  if(localRequestId!==generationRequestId)return;q('#toolStatus').hidden=true;generationController=null;setBusy(false);
  try{if(started){const latest=await api('/chats/'+id);conversation=latest.messages;if(sources.length&&conversation.at(-1))conversation.at(-1).sources=sources;}await Promise.all([refresh(),refreshUsage()]);render();}catch(e){notice(e.message);}q('#prompt').focus();
 }
}

q('#composer').onsubmit=safe(e=>{e.preventDefault();return siteMode?sendSiteMessage():send();});q('#prompt').oninput=e=>{e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,180)+'px';};q('#prompt').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&!matchMedia('(pointer: coarse)').matches){e.preventDefault();safe(()=>siteMode?sendSiteMessage():send())();}};
q('#modelButton').onclick=e=>{if(siteMode)return;e.stopPropagation();const m=q('#modelMenu');closePopovers(m);m.hidden=!m.hidden;};qa('[data-quality]').forEach(b=>b.onclick=()=>{if(busy)return;quality=b.dataset.quality;localStorage.setItem('somenai-quality',quality);updateModel();q('#modelMenu').hidden=true;});q('#moreButton').onclick=e=>{e.stopPropagation();const m=q('#moreMenu');closePopovers(m);m.hidden=!m.hidden;};document.addEventListener('click',()=>closePopovers());
q('#newChat').onclick=newChat;q('#search').oninput=renderHistory;q('#stop').onclick=safe(async()=>{q('#stop').disabled=true;if(siteMode&&siteProjectId){q('#toolStatus').hidden=false;q('#toolStatus').textContent='停止しています…';try{await api('/site-projects/'+siteProjectId+'/stop','POST',{});siteProjectStatus='stopped';await pollSiteProject(siteProjectId);}finally{q('#toolStatus').hidden=true;q('#toolStatus').textContent='';}}else{q('#toolStatus').hidden=false;q('#toolStatus').textContent='停止しています…';try{const stopping=api('/chats/'+current+'/stop','POST',{});generationController?.abort();await stopping;}finally{q('#toolStatus').hidden=true;q('#toolStatus').textContent='';}}});q('#menu').onclick=()=>document.body.classList.add('sidebar-open');q('#closeSide').onclick=q('#scrim').onclick=()=>document.body.classList.remove('sidebar-open');
q('#themeToggle').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('somenai-theme',document.body.classList.contains('dark')?'dark':'light');};document.body.classList.remove('dark');
function githubRepoByName(name){return githubRepos.find(r=>r.fullName===name);}
function fillGithubRepoSelect(select,preferred=''){
 select.replaceChildren();for(const repo of githubRepos){const option=document.createElement('option');option.value=repo.fullName;option.textContent=repo.fullName+(repo.private?' · Private':'');select.append(option);}
 if(preferred&&githubRepos.some(r=>r.fullName===preferred))select.value=preferred;
}
async function refreshGithubConnection(){
 githubConnection=await api('/connections/github');const status=q('#githubConnectionStatus'),connected=!!githubConnection.connected;
 const scope=githubConnection.repositorySelection==='all'?'すべてのリポジトリ':'選択したリポジトリ';
 status.classList.toggle('connected',connected);status.textContent=!githubConnection.configured?'サーバー側のGitHub App設定がまだ完了していません。':connected?'接続済み · @'+githubConnection.login+' · '+scope:'未接続';
 q('#githubConnect').hidden=connected||!githubConnection.configured;q('#githubManage').hidden=!connected||!githubConnection.manageUrl;q('#githubDisconnect').hidden=!connected;q('#githubWorkflow').hidden=!connected;return githubConnection;
}
async function loadGithubRepos(force=false){
 if(!githubConnection?.connected)await refreshGithubConnection();if(!githubConnection?.connected)throw Error('先にGitHubを接続してください。');
 if(!githubRepos.length||force){const result=await api('/github/repos');githubRepos=result.items||[];}
 return githubRepos;
}
async function openConnections(){
 q('#connectionsDialog').showModal();q('#githubConnectionStatus').textContent='状態を確認しています…';
 try{const state=await refreshGithubConnection();if(state.connected)await loadGithubRepos(false);}catch(e){q('#githubConnectionStatus').textContent=e.message;}
}
async function connectGithub(){
 const popup=window.open('about:blank','kuup-github-connect','popup,width=620,height=760');
 if(!popup)throw Error('GitHub接続用の画面を開けません。ポップアップを許可してもう一度試してください。');
 try{
  const start=await api('/connections/github/start','POST',{});popup.location.href=start.url;q('#githubConnectionStatus').textContent='GitHubで接続を許可してください…';
  for(let i=0;i<180;i++){await new Promise(r=>setTimeout(r,1000));const state=await api('/connections/github');if(state.connected){githubConnection=state;githubRepos=[];try{popup.close();}catch{}await refreshGithubConnection();await loadGithubRepos(true);return;}if(popup.closed&&i>4)break;}
  throw Error('GitHub接続を確認できませんでした。もう一度試してください。');
 }catch(e){try{popup.close();}catch{}throw e;}
}
async function disconnectGithub(){
 if(!confirm('KuupとGitHubの接続を解除する？ Cookのプロジェクトは消えません。GitHub App自体のインストールはGitHub側に残ります。'))return;
 await api('/connections/github','DELETE');githubConnection=null;githubRepos=[];await refreshGithubConnection();
}
function manageGithubAccess(){
 if(!githubConnection?.manageUrl)throw Error('GitHubのアクセス管理画面を開けません。');
 window.open(githubConnection.manageUrl,'_blank','noopener,noreferrer');
}
function defaultCookBranch(){return 'kuup-cook/'+Date.now().toString(36);}
function syncImportRepo(){
 const repo=githubRepoByName(q('#githubImportRepo').value);if(repo)q('#githubImportRef').value=repo.defaultBranch||'main';
}
async function openGithubImport(){
 await refreshGithubConnection();if(!githubConnection.connected){await openConnections();return;}
 await loadGithubRepos();if(!githubRepos.length)throw Error('利用できるGitHubリポジトリがありません。');
 fillGithubRepoSelect(q('#githubImportRepo'));syncImportRepo();q('#githubImportPath').value='';q('#githubImportStatus').textContent='';q('#githubImportDialog').showModal();
}
async function openGitHubExport(){
 if(!siteProjectId||!siteProject)throw Error('完成したCookを開いてからGitHubへ保存してください。');
 await refreshGithubConnection();if(!githubConnection.connected){await openConnections();return;}
 await loadGithubRepos();if(!githubRepos.length)throw Error('利用できるGitHubリポジトリがありません。');
 const preferred=siteGitHub?.repo||'';fillGithubRepoSelect(q('#githubExportRepo'),preferred);syncExportRepo();
 if(siteGitHub?.repo===q('#githubExportRepo').value){q('#githubExportBranch').value=siteGitHub.branch||defaultCookBranch();q('#githubExportPath').value=siteGitHub.path||'';}else{q('#githubExportBranch').value=defaultCookBranch();q('#githubExportPath').value='';}
 q('#githubExportMessage').value='Update '+(siteTitle||'site')+' from Kuup Cook';q('#githubExportPr').checked=true;q('#githubExportStatus').textContent='';q('#githubExportResult').replaceChildren();q('#githubExportDialog').showModal();
}
function syncExportRepo(){
 const repo=githubRepoByName(q('#githubExportRepo').value);if(!repo)return;q('#githubExportBase').value=repo.defaultBranch||'main';
 if(!siteGitHub||siteGitHub.repo!==repo.fullName)q('#githubExportBranch').value=defaultCookBranch();
}
q('#settingsOpen').onclick=safe(async()=>{q('#settingsDialog').showModal();const me=await api('/me');q('#adminInvites').hidden=!me.isAdmin;q('#issuedInvite').hidden=true;q('#inviteIssueStatus').textContent='';settings=await api('/settings');await refreshUsage();q('#studyMode').checked=!!settings.studyMode;qa('[data-web]').forEach(b=>b.classList.toggle('active',b.dataset.web===settings.webMode));q('#settingsDialog').showModal();});let issuedInviteSvg='';
q('#issueInvite').onclick=safe(async()=>{const button=q('#issueInvite');button.disabled=true;q('#inviteIssueStatus').textContent='発行しています…';try{const invite=await api('/admin/invites','POST',{});issuedInviteSvg=invite.svg;q('#inviteImage').src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(invite.svg);q('#inviteExpiry').textContent='有効期限: '+new Date(invite.expires).toLocaleString('ja-JP');q('#issuedInvite').hidden=false;q('#inviteIssueStatus').textContent='発行しました。同じQRで複数人登録できます。';}catch(e){q('#inviteIssueStatus').textContent=e.message;}finally{button.disabled=false;}});
q('#saveInvite').onclick=()=>{if(!issuedInviteSvg)return;const url=URL.createObjectURL(new Blob([issuedInviteSvg],{type:'image/svg+xml'})),link=document.createElement('a');link.href=url;link.download='somenai-invite.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
q('#usageButton').onclick=()=>q('#settingsOpen').click();q('#settingsClose').onclick=()=>q('#settingsDialog').close();q('#studyMode').onchange=safe(async e=>{settings=await api('/settings','PATCH',{studyMode:e.target.checked});});qa('[data-web]').forEach(b=>b.onclick=safe(async()=>{settings=await api('/settings','PATCH',{webMode:b.dataset.web});qa('[data-web]').forEach(x=>x.classList.toggle('active',x.dataset.web===settings.webMode));}));
qa('[data-prompt]').forEach(b=>b.onclick=()=>{q('#prompt').value=b.dataset.prompt;q('#prompt').focus();});
q('#rename').onclick=()=>openRename(current);q('#editCancel').onclick=()=>q('#editDialog').close();q('#editForm').onsubmit=safe(async e=>{e.preventDefault();await api('/chats/'+actionChatId,'PATCH',{title:q('#editTitle').value});q('#editDialog').close();await refresh();});q('#delete').onclick=()=>openDelete(current);q('#deleteCancel').onclick=()=>q('#deleteDialog').close();q('#deleteConfirm').onclick=safe(async()=>{const id=actionChatId;await api('/chats/'+id,'DELETE');q('#deleteDialog').close();if(current===id)newChat();await refresh();});q('#export').onclick=()=>{const title=chats.find(c=>c.id===current)?.title||'chat';const blob=new Blob([`# ${title}\n\n`+conversation.map(m=>`## ${m.role==='user'?'あなた':'Kuup AI'}\n\n${m.content}`).join('\n\n')],{type:'text/markdown;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=title.replace(/[^\p{L}\p{N}_-]/gu,'_').slice(0,50)+'.md';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
q('#logout').onclick=safe(async()=>{await api('/logout','POST',{});siteMode=false;document.body.classList.remove('site-mode');closeSitePreview();stopScanner();authScreen(false);usageState=null;githubConnection=null;githubRepos=[];authToken='';localStorage.removeItem('somenai-token');localStorage.removeItem('somenai-image-job');current=null;chats=[];conversation=[];render();renderHistory();q('#username').textContent='ゲスト';q('#auth').showModal();});
q('#connectionsOpen').onclick=safe(openConnections);q('#connectionsClose').onclick=()=>q('#connectionsDialog').close();q('#githubConnect').onclick=safe(connectGithub);q('#githubManage').onclick=safe(manageGithubAccess);q('#githubDisconnect').onclick=safe(disconnectGithub);q('#githubRefreshRepos').onclick=safe(async()=>{await loadGithubRepos(true);const scope=githubConnection.repositorySelection==='all'?'すべて':'選択中';q('#githubConnectionStatus').textContent='接続済み · @'+githubConnection.login+' · '+scope+' · '+githubRepos.length+'リポジトリ利用可能';});q('#githubImportOpen').onclick=safe(openGithubImport);q('#githubImportClose').onclick=()=>q('#githubImportDialog').close();q('#githubExportClose').onclick=()=>q('#githubExportDialog').close();q('#githubImportRepo').onchange=syncImportRepo;q('#githubExportRepo').onchange=syncExportRepo;
q('#githubImportForm').onsubmit=safe(async e=>{e.preventDefault();const button=e.submitter;button.disabled=true;q('#githubImportStatus').textContent='GitHubから読み込んでいます…';try{const data=await api('/site-projects/github-import','POST',{repo:q('#githubImportRepo').value,ref:q('#githubImportRef').value.trim(),pathPrefix:q('#githubImportPath').value.trim()});q('#githubImportDialog').close();q('#connectionsDialog').close();await refresh();await openSiteProject(data.id);}catch(err){q('#githubImportStatus').textContent=err.message;}finally{button.disabled=false;}});
q('#githubExportForm').onsubmit=safe(async e=>{e.preventDefault();const repo=q('#githubExportRepo').value,baseBranch=q('#githubExportBase').value.trim(),branch=q('#githubExportBranch').value.trim(),pathPrefix=q('#githubExportPath').value.trim();if(!confirm(repo+' の '+branch+' にCookのファイルを保存する？'))return;const button=e.submitter;button.disabled=true;q('#githubExportStatus').textContent='GitHubへ保存しています…';q('#githubExportResult').replaceChildren();try{const result=await api('/site-projects/'+siteProjectId+'/github-export','POST',{repo,baseBranch,branch,pathPrefix,message:q('#githubExportMessage').value.trim(),createPullRequest:q('#githubExportPr').checked});q('#githubExportStatus').textContent='保存しました ✓';const addLink=(href,label)=>{if(!href)return;const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label+' ↗';q('#githubExportResult').append(a);};addLink(result.commitUrl,'コミットを見る');addLink(result.pullRequest?.url,'Pull Requestを見る');siteGitHub={repo:result.repo,branch:result.branch,path:result.pathPrefix};const latest=await api('/site-projects/'+siteProjectId);applySiteProjectData(latest);}catch(err){q('#githubExportStatus').textContent=err.message;}finally{button.disabled=false;}});
q('#siteBuilderOpen').onclick=openSiteBuilder;q('#sitePreviewClose').onclick=closeSitePreview;q('#sitePreviewRefresh').onclick=()=>{if(sitePreviewPath)openSitePreview(sitePreviewPath);};
q('#siteActivityClose').onclick=closeCookActivity;q('#siteActivityTail').onclick=()=>{siteActivityAutoTail=true;const out=q('#siteActivityOutput');if(out)out.scrollTop=out.scrollHeight;};q('#siteActivityOutput').addEventListener('scroll',e=>{const out=e.currentTarget;siteActivityAutoTail=out.scrollHeight-out.scrollTop-out.clientHeight<40;});setInterval(()=>{const dialog=q('#siteActivityDialog');if(!dialog?.open||!siteProjectId)return;const job=siteConversation.find(x=>x.kind==='progress')?.job;if(job&&job.status==='running')renderCookActivity(job);},1000);
let registrationGrant='',grantExpiry=0,cameraStream=null,scanFrame=0,scanGeneration=0,verifyingInvite=false;
function stopScanner(){scanGeneration++;cancelAnimationFrame(scanFrame);cameraStream?.getTracks().forEach(t=>t.stop());cameraStream=null;q('#qrVideo').srcObject=null;}
function authScreen(signup){
 register=signup;stopScanner();const allowed=register&&registrationGrant&&grantExpiry>Date.now();
 q('#authTitle').textContent=register?(allowed?'アカウントを作成':'招待QRを読み取る'):'Kuup AIへログイン';
 q('#authDescription').textContent=register?(allowed?'招待認証が完了しました。名前とパスワードを設定してください。':'新規登録には管理者からの招待が必要です。'):'名前とパスワードでログインします。';
 q('#accountFields').hidden=!!(register&&!allowed);q('#name').disabled=q('#password').disabled=!!(register&&!allowed);
 q('#authSubmit').hidden=!!(register&&!allowed);q('#authSubmit').textContent=register?'登録する':'ログイン';q('#qrGate').hidden=!register||!!allowed;
 q('#authToggle').textContent=register?'ログインに戻る':'新規登録';q('#authError').textContent='';q('#password').autocomplete=register?'new-password':'current-password';
}
async function acceptInvite(value){
 if(verifyingInvite)return;const url=new URL(value,location.href);
 if(url.origin!==location.origin||url.pathname!==location.pathname)throw Error('Kuup AIの招待QRを読み取ってください。');
 const token=new URLSearchParams(url.hash.slice(1)).get('invite');if(!token)throw Error('招待QRが見つかりません。');
 verifyingInvite=true;stopScanner();q('#qrStatus').textContent='招待を確認しています…';
 try{const r=await api('/invites/verify','POST',{token});registrationGrant=r.grant;grantExpiry=r.expires;authScreen(true);if(!q('#auth').open)q('#auth').showModal();q('#name').focus();}
 finally{verifyingInvite=false;}
}
async function startScanner(){
 stopScanner();const generation=scanGeneration;q('#qrStatus').textContent='カメラを準備しています…';
 try{
 const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
 if(generation!==scanGeneration){stream.getTracks().forEach(t=>t.stop());return;}
 cameraStream=stream;const video=q('#qrVideo');video.srcObject=stream;await video.play();q('#qrStatus').textContent='招待QRを枠の中に入れてください。';
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});let last=0;
 const scan=now=>{if(generation!==scanGeneration)return;if(now-last>160&&video.readyState>=2){last=now;canvas.width=640;canvas.height=Math.round(video.videoHeight/video.videoWidth*640);ctx.drawImage(video,0,0,canvas.width,canvas.height);const data=ctx.getImageData(0,0,canvas.width,canvas.height);const code=window.jsQR(data.data,data.width,data.height);if(code){acceptInvite(code.data).catch(e=>{stopScanner();q('#qrStatus').textContent=e.message;});return;}}scanFrame=requestAnimationFrame(scan);};scanFrame=requestAnimationFrame(scan);
 }catch{stopScanner();q('#qrStatus').textContent='カメラを使えません。カメラの許可を確認するか、QRの画像を選んでください。';}
}
q('#auth').addEventListener('cancel',e=>e.preventDefault());
q('#authToggle').onclick=()=>{authScreen(!register);if(register&&!registrationGrant)startScanner();};
q('#startCamera').onclick=startScanner;
q('#qrFile').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;stopScanner();const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1600/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);const data=ctx.getImageData(0,0,canvas.width,canvas.height),code=window.jsQR(data.data,data.width,data.height);if(!code)throw Error('QRを読み取れませんでした。QR全体が鮮明な画像を選んでください。');await acceptInvite(code.data);}
 catch(e){q('#qrStatus').textContent=e.message;}finally{URL.revokeObjectURL(url);}
};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopScanner();});
q('#authForm').onsubmit=async e=>{
 e.preventDefault();q('#authError').textContent='';if(register&&(!registrationGrant||grantExpiry<=Date.now())){registrationGrant='';authScreen(true);return;}
 q('#authSubmit').disabled=true;
 try{const u=await api(register?'/register':'/login','POST',{name:q('#name').value,password:q('#password').value,grant:registrationGrant});authToken=u.token;localStorage.setItem('somenai-token',authToken);registrationGrant='';stopScanner();q('#auth').close();q('#password').value='';authScreen(false);await loadUser();}
 catch(e){q('#authError').textContent=e.message;}finally{q('#authSubmit').disabled=false;}
};
async function loadUser(){githubConnection=null;githubRepos=[];const [u,c,s,use]=await Promise.all([api('/me'),api('/chats'),api('/settings'),api('/usage')]);chats=c;settings=s;applyAppearance(s.appearance||{});usageState=use;q('#username').textContent=u.name;q('#avatar').textContent=u.name.slice(0,1).toUpperCase();renderHistory();renderUsage();void resumeImageJob();}
async function init(){updateModel();try{if(!API_BASE)throw new Error('API接続先をconfig.jsに設定してください。');config=await api('/config');q('#authToggle').hidden=!config.registration;const tools=[['🔎 Web検索',config.tools.web],['🏫 SchoolLink',config.tools.schoolLink],['🎨 画像生成',config.tools.image],['🐙 GitHub接続',config.tools.github],['🧮 計算','ready']];q('#toolReadiness').replaceChildren(...tools.map(([name,ready])=>{const d=document.createElement('div');d.className='tool-item';const a=document.createElement('span'),b=document.createElement('span');a.textContent=name;b.className=ready?'ready':'pending';b.textContent=ready?'利用可能':'未設定';d.append(a,b);return d;}));const inviteURL=location.href;if(new URLSearchParams(location.hash.slice(1)).has('invite')){history.replaceState(null,'',location.pathname+location.search);authScreen(true);q('#auth').showModal();try{await acceptInvite(inviteURL);}catch(e){q('#qrStatus').textContent=e.message;}render();return;}if(authToken){try{await loadUser();}catch{if(!q('#auth').open)q('#auth').showModal();}}else q('#auth').showModal();render();}catch(e){notice(e.message);}}

let pendingAssets=[];
function updateAttachmentNotice(){if(!pendingAssets.length||quality==='high'){notice('');return;}const hasPdf=pendingAssets.some(a=>a.mime==='application/pdf');notice(hasPdf?'PDFを読み取るには「高」を選択してください。':quality==='normal'?'「中」で画像を読み取れます（最大3枚）。':'画像を読み取るには「中」または「高」を選択してください。');}

function renderPending(){const box=q('#pendingFiles');box.hidden=!pendingAssets.length;box.replaceChildren(...pendingAssets.map(a=>{const tile=document.createElement('div');tile.className='pending-tile';tile.title=a.name;if(a.mime.startsWith('image/')){const img=document.createElement('img');img.alt=a.name;tile.append(img);loadThumbnail(a,img);}else{const icon=document.createElement('span');icon.className='pending-pdf';icon.textContent='PDF';tile.append(icon);}const remove=document.createElement('button');remove.type='button';remove.className='pending-remove';const cross=document.createElement('span');cross.setAttribute('aria-hidden','true');cross.textContent='×';remove.append(cross);remove.setAttribute('aria-label',a.name+'を外す');remove.onclick=()=>{if(busy)return;pendingAssets=pendingAssets.filter(x=>x.id!==a.id);renderPending();updateAttachmentNotice();};tile.append(remove);return tile;}));}
async function loadThumbnail(asset,img){try{const r=await fetch(API_BASE+'/media/'+asset.id,{headers:{Authorization:'Bearer '+authToken}});if(!r.ok)throw Error();const blob=await r.blob(),url=URL.createObjectURL(blob);img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>URL.revokeObjectURL(url);img.src=url;}catch{img.alt='画像を読み込めませんでした';}}
async function loadMedia(asset,holder){
 try{const r=await fetch(API_BASE+'/media/'+asset.id,{headers:{Authorization:'Bearer '+authToken}});if(!r.ok)throw Error('ファイルを取得できません');const blob=await r.blob(),url=URL.createObjectURL(blob);const el=document.createElement(asset.mime.startsWith('image/')?'img':'a');if(el.tagName==='IMG'){el.src=url;el.alt=asset.name;el.className=asset.kind==='generated'?'generated-image':'attachment-image';const link=document.createElement('a');link.href=url;link.download=asset.name;link.textContent='画像を保存';holder.replaceChildren(el,link);return;}else{el.href=url;el.download=asset.name;el.textContent='↓ '+asset.name;el.addEventListener('click',()=>setTimeout(()=>URL.revokeObjectURL(url),1000),{once:true});}holder.replaceChildren(el);}catch{holder.textContent='ファイルを読み込めませんでした';}
}

let uploading=false;
q('#fileInput').onchange=safe(async e=>{
 if(busy||uploading)return;
 const files=[...e.target.files];e.target.value='';
 if(files.length+pendingAssets.length>4)throw Error('添付は4件までです。');
 if(files.some(f=>!['image/png','image/jpeg','image/webp','application/pdf'].includes(f.type)))throw Error('PNG・JPEG・WebP・PDFに対応しています。');
 if(files.reduce((n,f)=>n+f.size,0)+pendingAssets.reduce((n,f)=>n+f.size,0)>10*1024*1024)throw Error('添付は合計10MBまでです。');
 uploading=true;setBusy(true,'upload');notice();
 try{
 if(!current){current=(await api('/chats','POST',{})).id;await refresh();}
 for(const f of files){const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('ファイルを読めませんでした'));r.readAsDataURL(f);});const result=await api('/chats/'+current+'/uploads','POST',{name:f.name,data});pendingAssets.push(result.asset);renderPending();}
 updateAttachmentNotice();
 }finally{uploading=false;setBusy(false);}
});

async function generateImage(){
 if(busy)return;const prompt=q('#prompt').value.trim();if(!prompt)return;
 if(pendingAssets.length){notice('画像生成では添付は使えません。添付を外すか回答の精度を選んでください。');return;}
 setBusy(true);notice();q('#toolStatus').hidden=false;q('#toolStatus').textContent='画像を生成しています…';
 try{
 if(!current){current=(await api('/chats','POST',{})).id;await api('/chats/'+current,'PATCH',{title:prompt.slice(0,40)});}
 const job=await api('/images','POST',{prompt,chatId:current});
 if(job.id){localStorage.setItem('somenai-image-job',job.id);await waitForImage(job.id);localStorage.removeItem('somenai-image-job');}
 clearPromptBox();
 conversation=(await api('/chats/'+current)).messages;await refresh();await refreshUsage();
 }catch(e){notice(e.message);}
 finally{q('#toolStatus').hidden=true;setBusy(false);render();}
}
async function waitForImage(id){for(let attempt=0;attempt<85;attempt++){await new Promise(r=>setTimeout(r,2000));let job;try{job=await api('/images/'+id);}catch(e){if(attempt<5)continue;throw e;}if(job.status==='done')return;if(job.status==='failed'){localStorage.removeItem('somenai-image-job');throw Error(job.error||'画像を生成できませんでした。');}}throw Error('画像生成の確認が時間切れになりました。更新後に会話を確認してください。');}
async function resumeImageJob(){const id=localStorage.getItem('somenai-image-job');if(!id||busy)return;try{const job=await api('/images/'+id);if(job.status==='running'){notice('画像を生成しています…');await waitForImage(id);}else if(job.status==='failed')throw Error(job.error||'画像を生成できませんでした。');localStorage.removeItem('somenai-image-job');await refresh();await refreshUsage();if(current===job.chatId){conversation=(await api('/chats/'+job.chatId)).messages;render();}notice();}catch(e){localStorage.removeItem('somenai-image-job');notice(e.message);}}
q('#attachButton').onclick=()=>{if(!siteMode)q('#fileInput').click();};
function applyAppearance(v){
 document.body.classList.toggle('dark',v.theme==='dark');document.body.dataset.accent=['ink','blue','mint','violet','coral'].includes(v.accent)?v.accent:'ink';document.body.dataset.composer=['auto','blue','mint','violet','coral'].includes(v.composer)?v.composer:'auto';
 qa('[data-accent]').filter(x=>x.tagName==='BUTTON').forEach(b=>b.setAttribute('aria-pressed',b.dataset.accent===document.body.dataset.accent));
 qa('[data-composer]').filter(x=>x.tagName==='BUTTON').forEach(b=>b.setAttribute('aria-pressed',b.dataset.composer===document.body.dataset.composer));
}
let appearanceQueue=Promise.resolve();
function appearanceChange(change){const next={...(settings.appearance||{}),...change};applyAppearance(next);settings.appearance=next;q('#saveStatus').textContent='保存中…';appearanceQueue=appearanceQueue.catch(()=>{}).then(async()=>{if(authToken)await api('/settings','PATCH',{appearance:next});q('#saveStatus').textContent='保存しました';}).catch(e=>{q('#saveStatus').textContent='保存できませんでした。もう一度選択してください。';throw e;});return appearanceQueue;}
q('#themeToggle').onclick=safe(()=>appearanceChange({theme:document.body.classList.contains('dark')?'light':'dark'}));
qa('#accentPicker button').forEach(b=>b.onclick=safe(()=>appearanceChange({accent:b.dataset.accent})));
qa('#composerPicker button').forEach(b=>b.onclick=safe(()=>appearanceChange({composer:b.dataset.composer})));
// Safari can retain the keyboard's short visualViewport height after it closes.
function viewport(){
  const height=window.visualViewport?.height;
  const keyboardOpen=document.activeElement===q('#prompt')&&height&&height<window.innerHeight-80;
  if(keyboardOpen)document.documentElement.style.setProperty('--vh',height+'px');
  else document.documentElement.style.removeProperty('--vh');
}
window.visualViewport?.addEventListener('resize',viewport);
window.addEventListener('resize',viewport);
window.addEventListener('pageshow',viewport);
q('#prompt').addEventListener('focus',viewport);
q('#prompt').addEventListener('blur',()=>{
  viewport();
  setTimeout(viewport,350);
  setTimeout(viewport,800);
});
viewport();
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();newChat();}if(e.key==='Escape'){document.body.classList.remove('sidebar-open');closePopovers();}});

let actionChatId=null;
function openRename(id){actionChatId=id;q('#editTitle').value=chats.find(c=>c.id===id)?.title||'';q('#editDialog').showModal();}
function openDelete(id){actionChatId=id;q('#deleteDialog').showModal();}
function historyActions(id){if(busy)return;actionChatId=id;q('#chatActionTitle').textContent=chats.find(c=>c.id===id)?.title||'チャットの操作';q('#chatActions').showModal();}
function siteHistoryActions(project){if(confirm('「'+project.title+'」を削除する？ 制作履歴と公開中のサイトも削除されます。'))safe(async()=>{await api('/site-projects/'+project.id,'DELETE');if(siteMode&&siteProjectId===project.id)newChat();await refresh();})();}
function bindHistoryActions(button,chat){
 let timer=null,startX=0,startY=0,held=false;const clear=()=>{clearTimeout(timer);timer=null;};
 button.onpointerdown=e=>{if(e.button!==0||busy)return;held=false;startX=e.clientX;startY=e.clientY;timer=setTimeout(()=>{held=true;chat.kind==='site'?siteHistoryActions(chat):historyActions(chat.id);},550);};
 button.onpointermove=e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>10)clear();};
 button.onpointerup=button.onpointercancel=button.onpointerleave=clear;
 button.oncontextmenu=e=>{e.preventDefault();clear();held=true;chat.kind==='site'?siteHistoryActions(chat):historyActions(chat.id);};
 button.onclick=safe(()=>{clear();if(held){held=false;return;}return chat.kind==='site'?openSiteProject(chat.id):openChat(chat.id);});
 button.onkeydown=e=>{if((e.shiftKey&&e.key==='F10')||e.key==='ContextMenu'){e.preventDefault();chat.kind==='site'?siteHistoryActions(chat):historyActions(chat.id);}};
}
q('#chatActionsClose').onclick=()=>q('#chatActions').close();
q('#historyRename').onclick=()=>{q('#chatActions').close();openRename(actionChatId);};
q('#historyDelete').onclick=()=>{q('#chatActions').close();openDelete(actionChatId);};
setInterval(()=>{if(authToken)refresh().catch(()=>{});},2500);setInterval(()=>{if(authToken)refreshUsage().catch(()=>{});},60000);
applyAppearance({});
init();
