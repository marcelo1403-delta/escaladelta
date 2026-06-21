/* Módulo extraído de js/sandbox.js original. Carregue na ordem definida no index.html. */
// JS extraido de sandbox_teste.html. Separacao inicial sem mudanca de comportamento.

var STORAGE_REFRESH_SESSION_KEY="escalaAgent:refreshSnapshot:v4";
var STORAGE_REFRESH_LOCAL_KEY="escalaAgent:emergenciaLocal:v1";
var liberarRefreshGuard=()=>{try{document.documentElement.classList.remove("s03-refresh-guard");}catch(err){}};
var apagarCachesAntigosRefresh=()=>{try{localStorage.removeItem("escalaAgent:lastSave");localStorage.removeItem("escalaAgent:tabelasEscala:v2");}catch(err){}};
var tabEscala=document.getElementById("tabEscala");
var tabServidores=document.getElementById("tabServidores");
var ativarEscala=()=>{document.body.classList.add("aba-escala-ativa");document.body.classList.remove("aba-cadastro-ativa");tabEscala?.classList.add("active");tabServidores?.classList.remove("active");};
var ativarCadastro=()=>{document.body.classList.add("aba-cadastro-ativa");document.body.classList.remove("aba-escala-ativa");tabServidores?.classList.add("active");tabEscala?.classList.remove("active");};
tabEscala?.addEventListener("click",ativarEscala);
tabServidores?.addEventListener("click",ativarCadastro);
document.addEventListener("click",(event)=>{
  var btn=event.target.closest?.("#btnS02Toggle");
  if(!btn)return;
  var sec=btn.closest(".secao02");
  if(!sec)return;
  var recolhida=sec.classList.toggle("is-recolhida");
  btn.textContent=recolhida?"▶":"◀";
  btn.setAttribute("aria-expanded",String(!recolhida));
});
document.getElementById("btnFullscreenEscala")?.addEventListener("click",async()=>{
try{
if(!document.fullscreenElement){
  await document.documentElement.requestFullscreen();
}else{
  await document.exitFullscreen();
}
}catch(err){
  console.warn("Fullscreen indisponível",err);
}
});
var aplicarTurnoEscala=(modo)=>{
  var turno=modo==="day"?"diurno":modo==="all"?"todos":"noturno";
  document.body.classList.toggle("turno-diurno",turno==="diurno");
  document.body.classList.toggle("turno-noturno",turno==="noturno");
  document.body.classList.toggle("turno-todos",turno==="todos");
  document.querySelectorAll(".s03-tool-turnos .s03-btn.turno").forEach((btn)=>{
    btn.classList.toggle("active",btn.classList.contains(modo));
  });
};
document.querySelectorAll(".s03-tool-turnos .s03-btn.turno").forEach((btn)=>{
  btn.addEventListener("click",()=>{
    aplicarTurnoEscala(btn.classList.contains("day")?"day":btn.classList.contains("all")?"all":"night");
  });
});
aplicarTurnoEscala(document.body.classList.contains("turno-noturno")?"night":document.body.classList.contains("turno-todos")?"all":"day");
var aplicarViewPadraoEscala=()=>{
  document.querySelectorAll(".lp-force-btn").forEach((btn)=>btn.classList.toggle("active",normResp(btn.dataset.force)==="PPF"));
  window._forcaAtiva="PPF";
  document.body.classList.add("force-ppf");
  document.body.classList.remove("force-fpn");
  aplicarTurnoEscala("day");
  setTimeout(()=>{
    if(typeof window.renderEfetivo==="function")window.renderEfetivo();
    renderResponsaveisViews?.();
  },0);
};
var btnConfigEscalas=document.getElementById("btnConfigEscalas");
var popoverConfigEscalas=document.getElementById("popoverConfigEscalas");
var makeOptions=(start,end,value)=>Array.from({length:end-start+1},(_,index)=>{const n=String(start+index);return `<option${n===String(value)?" selected":""}>${n}</option>`;}).join("");
document.querySelectorAll(".js-options-1-12").forEach((select)=>{select.innerHTML=makeOptions(1,12,select.dataset.value||1);});
