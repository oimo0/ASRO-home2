// Kuup APIは同一オリジンの管理サーバー経由で、専用線上のメインサーバーへ転送する。
window.SOMENAI_API_BASE = '/AI/Kuup/API';

// app.js は module として読み込まれるため、構文エラー時は app.js 内のハンドラ自体が実行されない。
// ここで先にエラーを捕捉し、スマホでも原因を見えるようにする。
(function installKuupBootstrapDiagnostics(){
  function show(kind, message){
    try{
      console.error('[Kuup bootstrap '+kind+']', message);
      var p=document.getElementById('kuupBootstrapError');
      if(!p){
        p=document.createElement('div');
        p.id='kuupBootstrapError';
        p.style.cssText='position:fixed;left:10px;right:10px;bottom:10px;z-index:2147483647;padding:12px;border:2px solid #d92d20;border-radius:12px;background:#fff3f2;color:#8f1d14;font:700 13px/1.45 system-ui,sans-serif;white-space:pre-wrap;word-break:break-word;box-shadow:0 8px 28px rgba(0,0,0,.18)';
        (document.body||document.documentElement).appendChild(p);
      }
      p.textContent='Kuup起動エラー\n'+message;
    }catch(_){}
  }
  window.addEventListener('error',function(e){
    show('error',e.message||'JavaScriptの読み込みに失敗しました。');
  });
  window.addEventListener('unhandledrejection',function(e){
    var r=e.reason;
    show('promise',(r&&r.stack)||((r&&r.message)||String(r)));
  });
})();
