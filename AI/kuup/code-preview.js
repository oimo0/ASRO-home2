const runner=document.getElementById('runner');
window.addEventListener('message',event=>{
  if(event.source!==parent||!event.data||event.data.type!=='kuup-html-preview')return;
  runner.srcdoc=typeof event.data.html==='string'?event.data.html:'';
});