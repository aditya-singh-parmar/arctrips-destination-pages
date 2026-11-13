
(function(){
  var tabs=[].slice.call(document.querySelectorAll('.acts button[data-g]'));
  var panels=[].slice.call(document.querySelectorAll('.hpanel'));
  if(!tabs.length) return;
  function show(g,push){
    tabs.forEach(function(t){var on=t.dataset.g===g;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;});
    panels.forEach(function(p){p.hidden=p.dataset.g!==g;});
    if(push&&history.replaceState)history.replaceState(null,'','#'+g);
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){show(t.dataset.g,true);});
    t.addEventListener('keydown',function(e){
      var n=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:-1; if(n<0)return;
      n=(n+tabs.length)%tabs.length; tabs[n].focus(); show(tabs[n].dataset.g,true); e.preventDefault();
    });
  });
  var h=(location.hash||'').slice(1);
  show(tabs.some(function(t){return t.dataset.g===h;})?h:tabs[0].dataset.g,false);
})();