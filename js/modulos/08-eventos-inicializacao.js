/* Módulo extraído de js/sandbox.js original. Carregue na ordem definida no index.html. */
var inicializarGestaoPagina=()=>{
  setTimeout(async()=>{
    var matriz=await carregarMatrizDados();
    if(matriz?.servidores&&typeof window.importCadastroServidores==="function"){
      window.importCadastroServidores(matriz.servidores);
    }
    if(Array.isArray(matriz?.extraRecorrentes)&&typeof window.importGruposExtraRecorrentes==="function"){
      window.importGruposExtraRecorrentes(matriz.extraRecorrentes);
    }
    if(Array.isArray(matriz?.configPostos)){
      aplicarConfigPostosSalva(matriz.configPostos);
    }
    aplicarHorariosMatrizSalva(matriz);
    if(matriz?.responsaveisVersao===2&&listaResponsaveisTemNomes(matriz.responsaveis)){
      aplicarResponsaveisSalvos(matriz.responsaveis||[]);
      salvarResponsaveisDados();
    }
    // NOVA REGRA DE REFRESH:
    // 1) abertura normal: tela limpa, sem buscar localStorage antigo;
    // 2) F5/reload: restaura snapshot completo da sessão;
    // 3) fechar e abrir de novo: sessionStorage não volta, então a tela abre limpa.
    var reload=paginaFoiRecarregada();
    if(reload){
      if(!restaurarAutosavePagina())limparPaginaNova();
    }else{
      // Após crash/restauração do navegador, sessionStorage pode sumir; tenta o snapshot emergencial em localStorage.
      limparAutosaveEmergencial();
      apagarCachesAntigosRefresh();
      limparPaginaNova();
    }
    atualizarBotaoGravarGestao();
    setTimeout(liberarRefreshGuard,60);
  },500);
};window.renderResponsaveisPostos=renderResponsaveisPostos;
window.renderResponsaveisViews=renderResponsaveisViews;
window.sincronizarResponsaveisEscalas=sincronizarResponsaveisEscalas;
window.validarResponsaveisAusentesPlantaoAtual=validarResponsaveisAusentesPlantaoAtual;
window.carregarTabelasEscalaDados=carregarTabelasEscalaDados;
window.getAlocacoesEscalaRows=()=>alocacaoRows.map((row)=>({...row}));
window.s03EstadoAlocarEfetivo=estadoAlocarEfetivo;
var abrirResponsaveisPosto=()=>{
  if(respFiltroForca)respFiltroForca.value="PPF";
  var plantaoNavbar=normResp(document.getElementById("topoPlantaoDia")?.textContent);
  if(respFiltroPlantao)respFiltroPlantao.value=plantoesResp.includes(plantaoNavbar)?plantaoNavbar:"TODOS";
  popoverResponsaveisPosto?.classList.add("is-open");popoverResponsaveisPosto?.setAttribute("aria-hidden","false");
  try{
    renderResponsaveisPostos();
  }catch(err){
    console.error("Falha ao renderizar responsaveis de posto",err);
  }
};
var fecharResponsaveisPosto=()=>{popoverResponsaveisPosto?.classList.remove("is-open");popoverResponsaveisPosto?.setAttribute("aria-hidden","true");};
document.addEventListener("click",(event)=>{
  if(event.target.closest(".resp-title-action"))abrirResponsaveisPosto();
});
popoverResponsaveisPosto?.querySelector(".resp-pop-sair")?.addEventListener("click",fecharResponsaveisPosto);
popoverResponsaveisPosto?.addEventListener("click",(event)=>{if(event.target===popoverResponsaveisPosto)fecharResponsaveisPosto();});
respFiltroForca?.addEventListener("change",renderResponsaveisPostos);
respFiltroPlantao?.addEventListener("change",renderResponsaveisPostos);
respBusca?.addEventListener("input",renderResponsaveisPostos);
popoverResponsaveisPosto?.querySelector(".resp-pop-limpar")?.addEventListener("click",()=>{if(respFiltroForca)respFiltroForca.value="PPF";if(respFiltroPlantao)respFiltroPlantao.value="TODOS";if(respBusca)respBusca.value="";renderResponsaveisPostos();});
// LEGADO COMENTADO: arrastar nomes do Efetivo para a escala foi desativado.
// O método principal/único de alocação agora é a dropdown da própria célula.
document.getElementById("eftCanonicoBody")?.addEventListener("dragstart",(event)=>{
  event.preventDefault();
  dragAtualEscala=null;
});
document.getElementById("eftCanonicoBody")?.addEventListener("dragend",()=>{dragAtualEscala=null;});
document.getElementById("eftCanonicoBody")?.addEventListener("click",(event)=>{
  if(!modoAlocarAtivo||!selecaoAlocar)return;
  var tr=event.target.closest("tr");
  if(!tr)return;
  if(normResp(tr.dataset.sit)!=="PRES")return;
  if(event.target.closest(".sit-btn"))return;
  event.preventDefault();
  event.stopPropagation();
  aplicarAlocarNome(txtResp(tr.dataset.nome||tr.children[2]?.textContent),normResp(tr.dataset.forca));
},true);
document.addEventListener("click",(event)=>{
  selecionarPostoAlocarEvento(event);
},true);
document.addEventListener("click",(event)=>{
  if(!modoAlocarAtivo||!selecaoAlocar)return;
  var tr=event.target.closest?.("#eftCanonicoBody tr");
  if(!tr||event.target.closest(".sit-btn"))return;
  if(normResp(tr.dataset.sit)!=="PRES")return;
  event.preventDefault();
  event.stopPropagation();
  aplicarAlocarNome(txtResp(tr.dataset.nome||tr.children[2]?.textContent),normResp(tr.dataset.forca));
},true);

document.addEventListener("click",(event)=>{
  // Fecha a dropdown flutuante somente quando o usuário clica fora dela e fora da célula-alvo.
  var picker=event.target.closest?.(".s03-cell-picker");
  if(picker)return;
  var td=event.target.closest?.(".s03-table tbody td");
  document.querySelectorAll(".s03-cell-picker").forEach((control)=>{
    if(td&&control._s03AnchorTd===td)return;
    var anchor=control._s03AnchorTd;
    anchor?.classList.remove("s03-dropdown-open","s03-dropdown-target");
    control.remove();
  });
},true);

document.addEventListener("click",(event)=>{
  if(event.target.closest?.(".s03-table"))return;
  if(event.target.closest?.(".s03-tool-edicao,#popoverS03LimparTabela,[data-s03-cell-action]"))return;
  cancelarSelecoesEdicaoEscala();
},true);
document.addEventListener("dragend",()=>{if(tdAvisoForca)limparAvisoForcaRestrita(tdAvisoForca);});
["click","dblclick","pointerdown","keydown","input","change","drop","dragstart"].forEach((eventName)=>{
  document.addEventListener(eventName,bloquearInteracaoLeitura,true);
});
document.getElementById("topoDatePicker")?.addEventListener("focus",(event)=>event.target.blur());
document.getElementById("topoDatePicker")?.addEventListener("click",(event)=>event.preventDefault());
document.getElementById("topoDatePicker")?.addEventListener("change",()=>{validarResponsaveisAusentesPlantaoAtual();renderResponsaveisViews();renderResponsaveisPostos();atualizarBotaoGravarGestao();});
document.getElementById("topoDatePicker")?.addEventListener("input",()=>{renderResponsaveisViews();atualizarBotaoGravarGestao();});
document.addEventListener("pointermove",atualizarPonteiroAcaoEscala);
document.addEventListener("pointermove",atualizarPonteiroColunaEscala);
// NOVO: seleção múltipla Excel-like precisa acompanhar o ponteiro fora da célula inicial.
// Sem estes listeners globais, apenas a primeira célula era selecionada.
document.addEventListener("pointermove",atualizarSelecaoEditarEscala);
document.addEventListener("pointerup",finalizarPonteiroAcaoEscala);
document.addEventListener("pointerup",finalizarPonteiroColunaEscala);
document.addEventListener("pointerup",finalizarSelecaoEditarEscala);
document.addEventListener("pointercancel",finalizarPonteiroAcaoEscala);
document.addEventListener("pointercancel",finalizarPonteiroColunaEscala);
document.addEventListener("pointercancel",finalizarSelecaoEditarEscala);
document.addEventListener("dragover",setDropOkDocumento,true);
document.addEventListener("drop",aplicarDropEscalaDocumento,true);
var acionarFerramentaEscala=(btn,event)=>{
  if(!btn||btn.disabled)return;
  event?.preventDefault?.();
  var tool=btn.dataset.s03Tool;
  if(tool==="editar")setModoEditarEscala(!modoEditarEscala);
  else if(tool==="alocar")setModoAlocar(!modoAlocarAtivo); // LEGADO comentado no HTML: mantido por compatibilidade.
  else if(tool==="lista")setModoDropdownEscala(!modoDropdownEscala); // LEGADO comentado no HTML: mantido por compatibilidade.
  else if(tool==="recortar")copiarSelecaoEscala(true);
  else if(tool==="copiar")copiarSelecaoEscala(false);
  else if(tool==="colar")colarClipboardEscala(document.activeElement?.closest?.(".s03-table tbody td"));
  else if(tool==="limpar")limparSelecaoEditavelEscala();
  else if(tool==="trocar")trocarVetoresEscala();
  else setModoColunaEscala(tool);
};
document.querySelectorAll(".s03-tool-edicao [data-s03-tool]").forEach((btn)=>btn.addEventListener("click",(event)=>acionarFerramentaEscala(btn,event)));
var btnOutrosTop=document.getElementById("btnOutrosTop");
var menuOutrosTop=document.getElementById("menuOutrosTop");
var fecharMenuOutrosTop=()=>{
  menuOutrosTop?.classList.remove("is-open");
  menuOutrosTop?.setAttribute("aria-hidden","true");
  btnOutrosTop?.setAttribute("aria-expanded","false");
};
var alternarMenuOutrosTop=(event)=>{
  event?.preventDefault?.();
  var abrir=!menuOutrosTop?.classList.contains("is-open");
  if(abrir){
    menuOutrosTop?.classList.add("is-open");
    menuOutrosTop?.setAttribute("aria-hidden","false");
    btnOutrosTop?.setAttribute("aria-expanded","true");
  }else{
    fecharMenuOutrosTop();
  }
};
btnOutrosTop?.addEventListener("click",alternarMenuOutrosTop);
menuOutrosTop?.addEventListener("click",(event)=>{if(event.target.closest(".topo-outros-item"))fecharMenuOutrosTop();});
document.addEventListener("click",(event)=>{
  if(!menuOutrosTop?.classList.contains("is-open"))return;
  if(event.target.closest?.(".topo-menu-wrap"))return;
  fecharMenuOutrosTop();
},true);
document.getElementById("btnNovoTop")?.addEventListener("click",confirmarNovoPagina);
document.getElementById("btnGravarTop")?.addEventListener("click",gravarPagina);
document.getElementById("btnAbrirTop")?.addEventListener("click",abrirPagina);
document.getElementById("btnExportarTop")?.addEventListener("click",exportarPagina);
document.getElementById("btnImportarTop")?.addEventListener("click",importarPagina);
document.getElementById("btnDuplicarTop")?.addEventListener("click",duplicarPagina);
document.getElementById("btnEditarTop")?.addEventListener("click",editarEscalaEncerradaPagina);
document.getElementById("btnExcluirTop")?.addEventListener("click",excluirPagina);
["change","input","click","drop"].forEach((eventName)=>document.addEventListener(eventName,agendarAutosavePagina,true));
window.addEventListener("beforeunload",salvarLocalEmergencial);
inicializarGestaoPagina();
setTimeout(liberarRefreshGuard,1800);
document.querySelectorAll(".s03-banner-x").forEach((btn)=>btn.addEventListener("click",()=>{
  abrirPopoverLimparTabela(btn.closest(".s03-card")?.querySelector(".s03-table"));
}));
document.getElementById("btnS03LimparConfirmar")?.addEventListener("click",()=>fecharPopoverLimparTabela(true));
document.getElementById("btnS03LimparSair")?.addEventListener("click",()=>fecharPopoverLimparTabela(false));
document.getElementById("popoverS03LimparTabela")?.addEventListener("click",(event)=>{
  if(event.target===event.currentTarget)fecharPopoverLimparTabela(false);
});
document.addEventListener("keydown",(event)=>{
  if(campoTextoAtivoEscala(event.target)||!event.ctrlKey||event.metaKey||event.altKey)return;
  var key=String(event.key||"").toLowerCase();
  if(key!=="z"&&key!=="y")return;
  event.preventDefault();
  event.stopPropagation();
  if(key==="z")desfazerHistoricoEscala();
  else refazerHistoricoEscala();
},true);
document.addEventListener("keydown",(event)=>{
  if(campoTextoAtivoEscala(event.target))return;
  var key=String(event.key||"").toLowerCase();
  if(event.ctrlKey||event.metaKey){
    if(key==="x"||key==="c"||key==="v"){
      event.preventDefault();
      event.stopPropagation();
      if(!modoEditarEscala)setModoEditarEscala(true);
      if(key==="x")copiarSelecaoEscala(true);
      else if(key==="c")copiarSelecaoEscala(false);
      else if(key==="v")colarClipboardEscala(document.activeElement?.closest?.(".s03-table tbody td"));
    }
    return;
  }
  // LEGADO: M/C por teclado para ações antigas só fica disponível no modo EDITAR.
  if(!modoEditarEscala||event.altKey)return;
  if(key!=="c"&&key!=="m")return;
  var selecoes=obterSelecoesCelulaEscala();
  if(selecoes.length<=1)return;
  event.preventDefault();
  event.stopPropagation();
  prepararAcaoCelulasEscala(selecoes,key==="m"?"move":"copy");
},true);
document.addEventListener("keydown",(event)=>{
  if(event.key!=="Escape")return;
  if(modoEditarEscala)setModoEditarEscala(false);
  if(modoAlocarAtivo)setModoAlocar(false);
  if(modoDropdownEscala)setModoDropdownEscala(false);
  if(modoColunaEscala)limparEstadoColunaEscala();
  if(tabelaLimparPendente)fecharPopoverLimparTabela(false);
  cancelarSelecoesEdicaoEscala();
  fecharMenuOutrosTop();
});
document.querySelectorAll(".lp-force-btn").forEach((btn)=>btn.addEventListener("click",()=>{
  if(modoAlocarAtivo)limparSelecaoAlocar();
  setTimeout(()=>renderResponsaveisViews(),0);
}));
aplicarHorariosAtuais();
garantirHorariosVivencias();
setupAlocacaoEscalas();
observarTabelasEscala();
atualizarDisponibilidadeColuna();
inicializarHistoricoEscala();
document.addEventListener("dragover",(event)=>{
  var td = event.target?.closest?.("td");
  if(tdAvisoForca && tdAvisoForca!==td)limparAvisoForcaRestrita(tdAvisoForca);
});
renderResponsaveisViews();
setTimeout(()=>{carregarTabelasEscalaDados();garantirHorariosVivencias();renderResponsaveisViews();observarTabelasEscala();atualizarDisponibilidadeColuna();},350);
setTimeout(()=>{carregarTabelasEscalaDados();garantirHorariosVivencias();renderResponsaveisViews();observarTabelasEscala();atualizarDisponibilidadeColuna();},1000);
