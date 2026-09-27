const state=document.getElementById('state'),frame=document.getElementById('site');
const params=new URLSearchParams(location.search),parts=location.pathname.split('/').filter(Boolean),kuup=parts.findIndex(x=>x.toLowerCase()==='kuup');
const username=params.get('user')||(kuup>=0?parts[kuup+1]||'':''),slug=params.get('site')||(kuup>=0?parts[kuup+2]||'':''),pretty=params.get('pretty')||'';
const base=(window.SOMENAI_API_BASE||'').replace(/\/$/,'');
if(!username||!slug){state.textContent='公開サイトが見つかりません。';}
else fetch(base+'/sites/public/'+encodeURIComponent(username)+'/'+encodeURIComponent(slug),{cache:'no-store'}).then(async r=>{
 const data=await r.json();if(!r.ok)throw Error(data.error||'公開サイトが見つかりません。');
 document.title=data.title+' — Kuup Site';frame.src=base+data.entry;state.hidden=true;
 if(pretty&&pretty.startsWith('/AI/kuup/')&&history.replaceState)history.replaceState(null,'',pretty);
}).catch(e=>{state.textContent=e.message||'サイトを読み込めませんでした。';});