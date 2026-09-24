const accents=['neutral','blue','green','purple','rose'];
function applyAccent(value){
  document.body.dataset.accent=accents.includes(value)?value:'neutral';
  document.querySelectorAll('[data-accent]').forEach(button=>{if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.accent===document.body.dataset.accent));});
}
const composerColors=['auto','ocean','mint','violet','sunset'];
function applyComposerColor(value){
  document.body.dataset.composer=composerColors.includes(value)?value:'auto';
  document.querySelectorAll('[data-composer]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.composer===document.body.dataset.composer)));
}
let accent='neutral';try{accent=localStorage.getItem('somenai-accent')||accent;}catch{}
applyAccent(accent);
let composerColor='auto';try{composerColor=localStorage.getItem('somenai-composer-color')||composerColor;}catch{}
applyComposerColor(composerColor);
document.querySelectorAll('#accentPicker button').forEach(button=>button.addEventListener('click',()=>{applyAccent(button.dataset.accent);try{localStorage.setItem('somenai-accent',button.dataset.accent);}catch{}}));
document.querySelectorAll('#composerPicker button').forEach(button=>button.addEventListener('click',()=>{applyComposerColor(button.dataset.composer);try{localStorage.setItem('somenai-composer-color',button.dataset.composer);}catch{}}));
function fitViewport(){
  const v=window.visualViewport;
  document.documentElement.style.setProperty('--viewport-height',`${v?.height||window.innerHeight}px`);
  document.documentElement.style.setProperty('--viewport-top',`${v?.offsetTop||0}px`);
}
window.visualViewport?.addEventListener('resize',fitViewport);
window.visualViewport?.addEventListener('scroll',fitViewport);
window.addEventListener('resize',fitViewport);fitViewport();
