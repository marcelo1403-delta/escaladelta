/* Módulo extraído de js/sandbox.js original. Carregue na ordem definida no index.html. */
var acaoCelulaEscala=null;
var dragAtualEscala=null;
var tdAvisoForca=null;
var ponteiroAcaoEscala=null;
var ignorarClickAcaoEscala=false;
var modoAlocarAtivo=false;
var selecaoAlocar=null;
var modoDropdownEscala=false;
// NOVO: modo padrão é alocação por dropdown; EDITAR só é ligado por toggle/atalho e inibe a dropdown.
var modoEditarEscala=false;
var clipboardEscala=null;
var selecaoArrastoEscala=null;
var modoColunaEscala=null;
var colunaOrigemEscala=null;
var ponteiroColunaEscala=null;
var ignorarClickColunaEscala=false;
var tabelaLimparPendente=null;
var selecoesCelulaEscala=new Set();
var limparSelecoesCelulaEscala=()=>{
  selecoesCelulaEscala.forEach((cell)=>cell.classList.remove("s03-cell-multi-selected"));
  selecoesCelulaEscala.clear();
};
var INDICATOR_ID="s03-multi-action-indicator";
var criarMultiActionIndicator=()=>{
  var el=document.getElementById(INDICATOR_ID);
  if(!el){
    el=document.createElement("div");
    el.id=INDICATOR_ID;
    el.className="s03-multi-action-indicator";
    el.draggable=true;
    el.addEventListener("dragstart",iniciarDragAcaoEscala);
    document.body.appendChild(el);
  }
  return el;
};
var showMultiActionIndicator=(text,draggable=false)=>{
  var el=criarMultiActionIndicator();
  el.textContent=text||"Ação em grupo";
  el.style.display="flex";
  el.draggable=draggable;
};
var hideMultiActionIndicator=()=>{const el=document.getElementById(INDICATOR_ID);if(el)el.style.display="none";};
var iniciarDragAcaoEscala=(event)=>{
  if(!acaoCelulaEscala||acaoCelulaEscala.tipo!=="multi"||acaoCelulaEscala.mover){
    event.preventDefault();
    return;
  }
  if(!event.dataTransfer)return;
  event.dataTransfer.setData("text/plain","Escala multi-cópia");
  event.dataTransfer.setData("application/x-s03-origin","escala");
  event.dataTransfer.setData("application/x-s03-action","copy");
  event.dataTransfer.effectAllowed="copy";
  var ghost=document.createElement("div");
  ghost.className="drag-nome-ghost s03-multi-action-ghost";
  ghost.textContent="+";
  document.body.appendChild(ghost);
  event.dataTransfer.setDragImage(ghost,15,15);
  setTimeout(()=>ghost.remove(),0);
};
var celulaSelecionavelEscala=(td)=>Boolean(td&&td.closest?.(".s03-table")&&!td.classList.contains("posto-cell")&&!td.classList.contains("s03-posto-inativo")&&!celulaChefePosto(td));
var marcarSelecaoCelulaEscala=(td)=>{
  if(!celulaSelecionavelEscala(td))return;
  selecoesCelulaEscala.add(td);
  td.classList.add("s03-cell-multi-selected");
};
var desmarcarSelecaoCelulaEscala=(td)=>{
  if(!td||!selecoesCelulaEscala.has(td))return;
  selecoesCelulaEscala.delete(td);
  td.classList.remove("s03-cell-multi-selected");
};
var toggleSelecaoCelulaEscala=(td)=>{
  if(!celulaSelecionavelEscala(td))return;
  if(selecoesCelulaEscala.has(td))desmarcarSelecaoCelulaEscala(td);
  else marcarSelecaoCelulaEscala(td);
};
var obterSelecoesCelulaEscala=()=>Array.from(selecoesCelulaEscala);
var selecionarUnicaCelulaEscala=(td)=>{
  limparSelecoesCelulaEscala();
  marcarSelecaoCelulaEscala(td);
  td?.focus?.({preventScroll:true});
};
var colunaGridEscala=(td)=>colunaAlocacao(td);
var selecionarRangeCelulasEscala=(origem,alvo)=>{
  if(!celulaSelecionavelEscala(origem)||!celulaSelecionavelEscala(alvo))return;
  var table=origem.closest("table");
  if(!table||table!==alvo.closest("table"))return;
  var rowA=origem.parentElement.sectionRowIndex;
  var rowB=alvo.parentElement.sectionRowIndex;
  var colA=colunaGridEscala(origem);
  var colB=colunaGridEscala(alvo);
  var minRow=Math.min(rowA,rowB),maxRow=Math.max(rowA,rowB);
  var minCol=Math.min(colA,colB),maxCol=Math.max(colA,colB);
  limparSelecoesCelulaEscala();
  Array.from(table.tBodies[0]?.rows||[]).forEach((row)=>{
    var r=row.sectionRowIndex;
    if(r<minRow||r>maxRow)return;
    Array.from(row.cells).forEach((cell)=>{
      var col=colunaGridEscala(cell);
      if(col>=minCol&&col<=maxCol&&celulaSelecionavelEscala(cell))marcarSelecaoCelulaEscala(cell);
    });
  });
};
var selecoesOrdenadasEscala=()=>obterSelecoesCelulaEscala().sort((a,b)=>(a.parentElement.sectionRowIndex-b.parentElement.sectionRowIndex)||(colunaGridEscala(a)-colunaGridEscala(b)));
var campoTextoAtivoEscala=(target)=>Boolean(target?.closest?.("input,textarea,select,[contenteditable='true']"));
var S03_TABLE_IDS=["tbl-T2","tbl-T3","tbl-T4","tbl-T5"];
var limparAvisoForcaRestrita=(td)=>{
  if(!td||!td.classList.contains("s03-force-warning"))return;
  if(td._s03WarnTimer)clearTimeout(td._s03WarnTimer);
  td.innerHTML=td._s03WarnOriginal||"";
  td.classList.remove("s03-drop-blocked","s03-force-warning");
  td._s03WarnOriginal=undefined;
  td._s03WarnTimer=undefined;
  if(tdAvisoForca===td)tdAvisoForca=null;
};
var limparMarcacoesDropEscala=()=>document.querySelectorAll(".s03-drop-hover,.s03-drop-blocked").forEach((td)=>td.classList.remove("s03-drop-hover","s03-drop-blocked"));
var limparAcaoCelulaEscala=()=>{
  document.querySelectorAll(".s03-cell-selected").forEach((cell)=>{
    cell.classList.remove("s03-cell-selected");
  });
  acaoCelulaEscala=null;
  hideMultiActionIndicator();
};
var selecionarCelulasMesmoEixo=(tds)=>{
  if(!tds.length)return{mesmaLinha:false,mesmaColuna:false};
  var primeira=tds[0];
  return{
    mesmaLinha:tds.every((td)=>td.parentElement===primeira.parentElement),
    mesmaColuna:tds.every((td)=>colunaAlocacao(td)===colunaAlocacao(primeira))
  };
};
var obterCelulaEscalaPorPosicao=(table,rowIndex,cellIndex)=>{
  var row=table.tBodies[0]?.rows[rowIndex];
  if(!row)return null;
  return Array.from(row.cells).find((cell)=>colunaGridEscala(cell)===cellIndex && !cell.classList.contains("posto-cell"))||null;
};
var prepararAcaoCelulasEscala=(tds,action)=>{
  var ocupadas=tds.filter(celulaOcupadaEscala);
  if(!ocupadas.length)return false;
  var {mesmaLinha,mesmaColuna}=selecionarCelulasMesmoEixo(ocupadas);
  if(!mesmaLinha&& !mesmaColuna){
    // informar usuário: seleção inválida para ação em grupo
    showMultiActionIndicator("Seleção inválida — alinhe em mesma linha/coluna");
    setTimeout(()=>hideMultiActionIndicator(),1200);
    return false;
  }
  var origens=ocupadas.map((td)=>({
    td,
    nome:nomeCelulaEscala(td),
    forca:forcaCelulaEscala(td),
    row:td.parentElement.sectionRowIndex,
    cellIndex:colunaGridEscala(td)
  }));
  limparAcaoCelulaEscala();
  acaoCelulaEscala={tipo:"multi",origens,mover:action==="move",mesmaLinha,mesmaColuna};
  ocupadas.forEach((td)=>td.classList.add("s03-cell-selected"));
  showMultiActionIndicator((acaoCelulaEscala.mover?"Mover":"➕ Copiar")+" — "+ocupadas.length+" células",!acaoCelulaEscala.mover);
  return true;
};
var aplicarAcaoCelulasEscala=(td)=>{
  if(!acaoCelulaEscala||acaoCelulaEscala.tipo!=="multi")return false;
  var table=td.closest("table");
  var origemTable=acaoCelulaEscala.origens[0].td.closest("table");
  if(!table||table!==origemTable)return false;
  var baseOrigemCol=Math.min(...acaoCelulaEscala.origens.map((orig)=>orig.cellIndex));
  var baseOrigemRow=Math.min(...acaoCelulaEscala.origens.map((orig)=>orig.row));
  var baseDestinoCol=colunaGridEscala(td);
  var baseDestinoRow=td.parentElement.sectionRowIndex;
  var destinos=acaoCelulaEscala.origens.map((orig)=>{
    var offset=acaoCelulaEscala.mesmaLinha?orig.cellIndex-baseOrigemCol:orig.row-baseOrigemRow;
    var destinoRow=acaoCelulaEscala.mesmaLinha?baseDestinoRow:baseDestinoRow+offset;
    var destinoCol=acaoCelulaEscala.mesmaLinha?baseDestinoCol+offset:baseDestinoCol;
    return{
      origem:orig,
      destinoRow,
      destinoCol,
      destinoTd:obterCelulaEscalaPorPosicao(table,destinoRow,destinoCol)
    };
  });
  if(destinos.some((item)=>!item.destinoTd))return false;
  var destinoTds=new Set(destinos.map((item)=>item.destinoTd));
  if(destinoTds.size!==acaoCelulaEscala.origens.length)return false;
  for(var item of destinos){
    if(item.destinoTd===item.origem.td&&acaoCelulaEscala.mover)return false;
    if(!podeReceberMultiPasteEscala(item.destinoTd,item.origem.forca,{sinalizar:false}))return false;
  }
  if(acaoCelulaEscala.mover){
    acaoCelulaEscala.origens.forEach((orig)=>limparCelulaEscala(orig.td));
  }
  destinos.forEach((item)=>preencherCelulaColuna(item.destinoTd,{nome:item.origem.nome,forca:item.origem.forca}));
  if(modoColunaEscala)atualizarMarcacoesColunaEscala();
  atualizarDisponibilidadeColuna();
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  limparMarcacoesDropEscala();
  salvarTabelasEscalaDados();
  salvarLocalEmergencial();
  if(acaoCelulaEscala.mover){
    limparAcaoCelulaEscala();
    limparSelecoesCelulaEscala();
  }else{
    showMultiActionIndicator("➕ Copiar — "+acaoCelulaEscala.origens.length+" células",true);
  }
  return true;
};
var celulasEscalaLinha=(row)=>Array.from(row.cells).filter((cell)=>!cell.classList.contains("posto-cell"));
var celulaEscalaPorColuna=(row,colIndex)=>Array.from(row.cells).find((cell)=>colunaGridEscala(cell)===colIndex && !cell.classList.contains("posto-cell"));
var navegarCelulaEscala=(td,direction)=>{
  var table=td.closest("table");
  var row=td.parentElement;
  if(!table||!row||row.tagName!=="TR")return null;
  var body=table.tBodies[0];
  if(!body)return null;
  var rows=Array.from(body.rows);
  var rowIndex=rows.indexOf(row);
  if(rowIndex<0)return null;
  if(direction==="left"||direction==="right"){
    var cells=celulasEscalaLinha(row);
    var index=cells.indexOf(td);
    if(index<0)return null;
    return cells[direction==="left"?index-1:index+1]||null;
  }
  var colIndex=colunaGridEscala(td);
  var step=direction==="up"?-1:1;
  for(var next=rowIndex+step;next>=0&&next<rows.length;next+=step){
    var candidate=celulaEscalaPorColuna(rows[next],colIndex);
    if(candidate)return candidate;
  }
  return null;
};
var tecladoAcaoCelulaEscala=(event)=>{
  var td=event.target.closest("td");
  if(!td||!td.closest(".s03-table")||td.classList.contains("posto-cell")||td.classList.contains("s03-posto-inativo")||celulaChefePosto(td))return;
  var selecoes=obterSelecoesCelulaEscala();
  if(event.key==="Delete"||event.key==="Backspace"){
    if(selecoes.length>1 && selecoes.includes(td)){
      event.preventDefault();
      event.stopPropagation();
      selecoes.forEach((cell)=>limparCelulaEscala(cell));
      limparSelecoesCelulaEscala();
      if(modoColunaEscala)atualizarMarcacoesColunaEscala();
      atualizarDisponibilidadeColuna();
      if(typeof window.renderEfetivo==="function")window.renderEfetivo();
      if(acaoCelulaEscala?.tipo==="multi")limparAcaoCelulaEscala();
      return;
    }
    if(!celulaOcupadaEscala(td))return;
    event.preventDefault();
    event.stopPropagation();
    limparCelulaEscala(td);
    if(modoColunaEscala)atualizarMarcacoesColunaEscala();
    atualizarDisponibilidadeColuna();
    if(typeof window.renderEfetivo==="function")window.renderEfetivo();
    if(acaoCelulaEscala?.origem===td)limparAcaoCelulaEscala();
    return;
  }
  var key=event.key.toLowerCase();
  if(key==="m"||key==="c"){
    if(selecoes.length>1){
      event.preventDefault();
      event.stopPropagation();
      prepararAcaoCelulasEscala(selecoes,key==="m"?"move":"copy");
      return;
    }
    if(!celulaOcupadaEscala(td))return;
    event.preventDefault();
    event.stopPropagation();
    prepararAcaoCelulaEscala(td,key==="m"?"move":"copy");
    return;
  }
  if(event.key==="Enter"&&acaoCelulaEscala&&acaoCelulaEscala.origem!==td){
    event.preventDefault();
    event.stopPropagation();
    if(acaoCelulaEscala.tipo==="multi"){
      aplicarAcaoCelulasEscala(td);
      return;
    }
    var ok=alocarCelulaEscala(td,acaoCelulaEscala.nome,acaoCelulaEscala.forca,acaoCelulaEscala.origem,acaoCelulaEscala.mover);
    if(acaoCelulaEscala?.mover||!ok)limparAcaoCelulaEscala();
    return;
  }
  if(["arrowleft","arrowright","arrowup","arrowdown"].includes(key)){
    var direction=key.replace("arrow","");
    var next=navegarCelulaEscala(td,direction);
    if(next){
      event.preventDefault();
      event.stopPropagation();
      next.focus();
    }
  }
};
var podeReceberDropEscala=(td,nome,forca,origem=null,mover=false,{sinalizar=true}={})=>{
  var table=td?.closest?.("table");
  if(!table||!nome||!forca||td.classList.contains("posto-cell")||td.classList.contains("s03-posto-inativo"))return false;
  var local=localAlocacao(td);
  if(!forcaPermitidaNoLocal(table.id,local,forca)){
    if(sinalizar)avisarForcaRestrita(td,forcaDoLocal(table.id,local));
    return false;
  }
  var destinoOcupado=celulaOcupadaEscala(td);
  var forcaDestino=forcaCelulaEscala(td);
  var mesmaForcaDestino=!destinoOcupado||normResp(forcaDestino)===normResp(forca);
  // Responsáveis/chefes automáticos de T2/T3 continuam protegidos: eles vêm da Seção 2.
  if(celulaChefePosto(td)){
    if(sinalizar)bloquearDrop(td);
    return false;
  }
  // Célula ocupada: permite sobrescrição desde que a força de destino seja compatível.
  // Bloqueio preservado apenas para célula de responsável de posto (celulaChefePosto já tratado acima)
  // e para força diferente (forcaPermitidaNoLocal já tratado acima).
  var ignorarDuplicado=origem&&mover?origem:null;
  if(destinoOcupado&&!mesmaForcaDestino){
    if(sinalizar)bloquearDrop(td);
    return false;
  }
  if(nomeDuplicadoNaColuna(table,td,nome,ignorarDuplicado)){
    if(sinalizar)bloquearDrop(td);
    return false;
  }
  return true;
};
var podeReceberMultiPasteEscala=(td,forca,{sinalizar=true}={})=>{
  var table=td?.closest?.("table");
  if(!table||!forca||td.classList.contains("posto-cell")||td.classList.contains("s03-posto-inativo")||celulaChefePosto(td))return false;
  var local=localAlocacao(td);
  if(!forcaPermitidaNoLocal(table.id,local,forca)){
    if(sinalizar)avisarForcaRestrita(td,forcaDoLocal(table.id,local));
    return false;
  }
  return true;
};
var validarDestinoAcaoCelulasEscala=(td)=>{
  if(!acaoCelulaEscala||acaoCelulaEscala.tipo!=="multi")return false;
  var table=td.closest("table");
  var origemTable=acaoCelulaEscala.origens[0].td.closest("table");
  if(!table||table!==origemTable) return false;
  var baseOrigemCol=Math.min(...acaoCelulaEscala.origens.map((orig)=>orig.cellIndex));
  var baseOrigemRow=Math.min(...acaoCelulaEscala.origens.map((orig)=>orig.row));
  var baseDestinoCol=colunaGridEscala(td);
  var baseDestinoRow=td.parentElement.sectionRowIndex;
  var destinos=acaoCelulaEscala.origens.map((orig)=>{
    var offset=acaoCelulaEscala.mesmaLinha?orig.cellIndex-baseOrigemCol:orig.row-baseOrigemRow;
    var destinoRow=acaoCelulaEscala.mesmaLinha?baseDestinoRow:baseDestinoRow+offset;
    var destinoCol=acaoCelulaEscala.mesmaLinha?baseDestinoCol+offset:baseDestinoCol;
    return{
      origem:orig,
      destinoTd:obterCelulaEscalaPorPosicao(table,destinoRow,destinoCol)
    };
  });
  if(destinos.some((item)=>!item.destinoTd))return false;
  var destinoTds=new Set(destinos.map((item)=>item.destinoTd));
  if(destinoTds.size!==acaoCelulaEscala.origens.length) return false;
  for(var item of destinos){
    if(item.destinoTd===item.origem.td&&acaoCelulaEscala.mover) return false;
    if(!podeReceberMultiPasteEscala(item.destinoTd,item.origem.forca)) return false;
  }
  return true;
};
var setDropOk=(event)=>{
  var td=tdEventoEscala(event);
  if(!td||!td.closest(".s03-table")||td.classList.contains("posto-cell")||td.classList.contains("s03-posto-inativo"))return;
  event.preventDefault();
  document.querySelectorAll(".s03-drop-hover").forEach((cell)=>{if(cell!==td)cell.classList.remove("s03-drop-hover");});
  var estado=estadoDragEscala(event);
  var origemDrag=event.dataTransfer?.getData("application/x-s03-origin");
  var acaoArrastoEscala=acaoCelulaEscala&&dragAtualEscala&&normResp(dragAtualEscala.nome)===normResp(acaoCelulaEscala.nome);
  var origem=acaoArrastoEscala||origemDrag==="escala"?acaoCelulaEscala?.origem:null;
  var moverDrag=(event.dataTransfer?.getData("application/x-s03-action")==="move")||(acaoArrastoEscala&&acaoCelulaEscala?.mover);
  var ok=false;
  if(origemDrag==="escala"&&acaoCelulaEscala?.tipo==="multi"){
    ok=validarDestinoAcaoCelulasEscala(td);
  } else {
    ok=podeReceberDropEscala(td,estado.nome,estado.forca,origem,moverDrag,{sinalizar:true});
  }
  if(!ok){
    if(event.dataTransfer)event.dataTransfer.dropEffect="none";
    return;
  }
  td.classList.add("s03-drop-hover");
  if(event.dataTransfer)event.dataTransfer.dropEffect=origemDrag==="escala"?(moverDrag?"move":"copy"):"copy";
};
var setDropOkDocumento=(event)=>{
  if(!event.target?.closest?.(".s03-table"))return;
  setDropOk(event);
};
var limparDrop=(event)=>{
  var td=tdEventoEscala(event);
  if(!td)return;
  td.classList.remove("s03-drop-hover","s03-drop-blocked");
  // Cancela o timer sempre, mesmo que a classe já tenha sido removida,
  // evitando que um timer residual reexiba a mensagem após o dragleave.
  if(td._s03WarnTimer){clearTimeout(td._s03WarnTimer);td._s03WarnTimer=undefined;}
  limparAvisoForcaRestrita(td);
};
var alocarCelulaEscala=(td,nome,forca,origem=null,mover=false)=>{
  if(!podeReceberDropEscala(td,nome,forca,origem,mover,{sinalizar:true}))return false;
  delete td.dataset.s03AutoChefe;
  td.innerHTML=htmlAlocado(nome);
  td.dataset.nomeAlocado=nome;
  td.dataset.forca=forca;
  if(mover&&origem&&origem!==td){
    origem.innerHTML="";
    delete origem.dataset.nomeAlocado;
    delete origem.dataset.forca;
  }
  if(modoColunaEscala)atualizarMarcacoesColunaEscala();
  atualizarDisponibilidadeColuna();
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  limparMarcacoesDropEscala();
  salvarTabelasEscalaDados();
  salvarLocalEmergencial();
  return true;
};
var turnoPermitidoTabela=(tableId,turno)=>{
  var t=normResp(turno);
  if(tableId==="tbl-T2"||tableId==="tbl-T3")return t==="24H"||t==="DIURNO";
  if(tableId==="tbl-T4"||tableId==="tbl-T5")return t==="24H"||t==="NOTURNO";
  return true;
};
var nomesDropdownEscala=(tableId,forca)=>{
  var rows=Array.isArray(window._efetivoAllRows)?window._efetivoAllRows:(Array.isArray(window._efetivoRows)?window._efetivoRows:[]);
  return rows.filter((row)=>row?.sit==="pres"&&normResp(row.forca)===normResp(forca)&&turnoPermitidoTabela(tableId,row.turno))
    .map((row)=>txtResp(row.nome))
    .filter(Boolean)
    .filter((nome,index,lista)=>lista.findIndex((item)=>normResp(item)===normResp(nome))===index)
    .sort((a,b)=>a.localeCompare(b));
};
var vagasForcaNoLocal=(tableId,local,forca)=>{
  var config=configPostoParaTabela(local,tableId);
  if(!config)return 0;
  if(forca==="PPF")return config.ppf==="SIM"?config.vagas:0;
  if(forca==="FPN")return config.fpn==="SIM"?config.vagas:0;
  return 0;
};
var forcasDropdownCelulaEscala=(td)=>{
  var table=td?.closest("table");
  var local=localAlocacao(td);
  var salva=normResp(td?.dataset?.forca);
  if(salva==="PPF"||salva==="FPN")return [salva];
  var ppf=vagasForcaNoLocal(table.id,local,"PPF");
  var fpn=vagasForcaNoLocal(table.id,local,"FPN");
  if(ppf>0&&fpn>0)return ["PPF","FPN"];
  if(ppf>0)return ["PPF"];
  if(fpn>0)return ["FPN"];
  return [];
};
var opcoesDropdownEscala=(table,td)=>{
  var forcas=forcasDropdownCelulaEscala(td);
  var multi=forcas.length>1;
  return forcas.flatMap((forca)=>nomesDropdownEscala(table.id,forca)
    .filter((nome)=>!nomeDuplicadoNaColuna(table,td,nome))
    .map((nome)=>({forca,nome,label:multi?`${forca} - ${nome}`:nome})));
};
var opcoesDropdownEscalaPorForca=(table,td,forca)=>nomesDropdownEscala(table.id,forca)
  .filter((nome)=>!nomeDuplicadoNaColuna(table,td,nome))
  .map((nome)=>({forca,nome,label:nome}));
var removerAlocacoesSemPresenca=({salvar=true}={})=>{
  var rows=Array.isArray(window._efetivoAllRows)?window._efetivoAllRows:(Array.isArray(window._efetivoRows)?window._efetivoRows:[]);
  if(!rows.length)return 0;
  var presentes=new Set(rows.filter((row)=>row?.sit==="pres").map((row)=>normResp(row.nome)));
  var removidos=0;
  S03_TABLE_IDS.forEach((id)=>{
    document.querySelectorAll(`#${id} tbody td:not(.posto-cell)`).forEach((td)=>{
      if(celulaChefePosto(td))return;
      var nome=nomeCelulaEscala(td);
      if(!nome||(!td.querySelector(".s03-alocado")&&!td.dataset.nomeAlocado))return;
      if(presentes.has(normResp(nome)))return;
      limparCelulaEscala(td);
      removidos+=1;
    });
  });
  if(removidos&&salvar){
    if(modoColunaEscala)atualizarMarcacoesColunaEscala();
    atualizarDisponibilidadeColuna();
    salvarTabelasEscalaDados();
    salvarLocalEmergencial();
  }
  return removidos;
};
window.removerAlocacoesSemPresenca=removerAlocacoesSemPresenca;
var removerDropdownsEscala=(exceto=null)=>{
  document.querySelectorAll(".s03-cell-select,.s03-cell-picker").forEach((control)=>{
    if(control!==exceto&&!control.contains(exceto)){
      (control.closest("td")||control._s03AnchorTd)?.classList.remove("s03-dropdown-open","s03-dropdown-target");
      control.remove();
    }
  });
};
var removerPreviewDropdownsEscala=()=>{
  document.querySelectorAll(".s03-cell-dropdown-preview").forEach((preview)=>{
    var td=preview._s03AnchorTd||preview.closest("td");
    if(td)td.classList.remove("s03-dropdown-preview");
    preview.remove();
  });
};
var mostrarPreviewDropdownCelulaEscala=(td)=>{
  if(modoEditarEscala||!td||td.querySelector(".s03-cell-picker")||td.classList.contains("s03-dropdown-open")||td.classList.contains("posto-cell")||td.classList.contains("s03-posto-inativo")||celulaChefePosto(td))return;
  var table=td.closest("table");
  if(!table||!forcasDropdownCelulaEscala(td).length)return;
  removerPreviewDropdownsEscala();
  var preview=document.createElement("div");
  preview.className="s03-cell-dropdown-preview";
  preview._s03AnchorTd=td;
  td.appendChild(preview);
  td.classList.add("s03-dropdown-preview");
};
var ocultarPreviewDropdownCelulaEscala=(td)=>{
  if(!td)return;
  td.classList.remove("s03-dropdown-preview");
  td.querySelector(".s03-cell-dropdown-preview")?.remove();
};
var ocultarDropdownCelulaEscala=(td)=>{
  td?.classList.remove("s03-dropdown-open","s03-dropdown-target");
  td?.querySelector(".s03-cell-select")?.remove();
  td?.querySelector(".s03-cell-picker")?.remove();
  document.querySelectorAll(".s03-cell-picker").forEach((control)=>{
    if(control._s03AnchorTd===td)control.remove();
  });
};
var dropdownCelulaEscalaEmUso=(td)=>{
  if(!td)return false;
  if(td.matches(":hover")||td.matches(":focus-within"))return true;
  return Array.from(document.querySelectorAll(".s03-cell-picker")).some((control)=>control._s03AnchorTd===td&&(control.matches(":hover")||control.matches(":focus-within")));
};
var aplicarOpcaoDropdownEscala=(td,opcao,substituir=false)=>{
  td.classList.remove("s03-dropdown-open","s03-dropdown-target");
  if(opcao?.vazio){
    if(!celulaChefePosto(td)){
      limparCelulaEscala(td);
      atualizarDisponibilidadeColuna();
      if(typeof window.renderEfetivo==="function")window.renderEfetivo();
      salvarTabelasEscalaDados();
      salvarLocalEmergencial();
    }
    return;
  }
  if(!opcao?.nome||!opcao?.forca)return;
  if(substituir&&celulaOcupadaEscala(td)){
    var anterior={html:td.innerHTML,nome:td.dataset.nomeAlocado,forca:td.dataset.forca,autoChefe:td.dataset.s03AutoChefe};
    limparCelulaEscala(td);
    var ok=alocarCelulaEscala(td,opcao.nome,opcao.forca);
    if(!ok){
      td.innerHTML=anterior.html;
      if(anterior.nome)td.dataset.nomeAlocado=anterior.nome;else delete td.dataset.nomeAlocado;
      if(anterior.forca)td.dataset.forca=anterior.forca;else delete td.dataset.forca;
      if(anterior.autoChefe)td.dataset.s03AutoChefe=anterior.autoChefe;else delete td.dataset.s03AutoChefe;
    }
    return;
  }
  alocarCelulaEscala(td,opcao.nome,opcao.forca);
};
// NOVO: a dropdown de alocação deve abrir ancorada na própria célula.
// O posicionamento flutuante em document.body foi mantido nos backups, mas não é mais usado.
var posicionarDropdownCelulaEscala=(td,control)=>{
  if(!td||!control)return;
  control.style.left="0";
  control.style.top="100%";
  control.style.width=`${Math.max(136,td.getBoundingClientRect().width)}px`;
};
var montarListaNomesCelulaEscala=(picker,table,td,forcas,substituir)=>{
  picker.querySelector(".s03-cell-name-list")?.remove();
  var lista=document.createElement("div");
  lista.className="s03-cell-name-list";
  var botoes=[];
  var opcoes=[{vazio:true,nome:"",forca:"",label:"",match:""}];
  var permitidas=Array.isArray(forcas)?forcas:[forcas].filter(Boolean);
  var multi=permitidas.length>1;
  permitidas.forEach((forca)=>{
    if(multi)opcoes.push({section:true,label:forca});
    opcoesDropdownEscalaPorForca(table,td,forca).forEach((opcao)=>opcoes.push({ ...opcao, label:multi?`${forca} - ${opcao.nome}`:opcao.nome, match:opcao.nome }));
  });
  var indiceAtivo=-1;
  var buffer="";
  var bufferTimer=null;
  var aplicarOpcao=(opcao)=>{
    if(!opcao||opcao.section)return;
    picker.remove();
    aplicarOpcaoDropdownEscala(td,opcao,substituir||celulaOcupadaEscala(td));
  };
  var marcarIndice=(index)=>{
    if(index<0||index>=botoes.length)return;
    indiceAtivo=index;
    botoes.forEach((btn,i)=>btn.classList.toggle("is-match",i===indiceAtivo));
    botoes[indiceAtivo].scrollIntoView({block:"nearest"});
  };
  opcoes.forEach((opcao)=>{
    if(opcao.section){
      var sep=document.createElement("div");
      sep.className="s03-cell-force-heading";
      sep.textContent=opcao.label;
      lista.appendChild(sep);
      return;
    }
    var btn=document.createElement("button");
    btn.type="button";
    btn.textContent=opcao.label;
    if(opcao.vazio){
      btn.classList.add("s03-cell-empty-option");
      btn.setAttribute("aria-label","Limpar célula");
      btn.title="Limpar célula";
    }
    btn._s03Opcao=opcao;
    btn.addEventListener("click",(event)=>{
      event.preventDefault();
      event.stopPropagation();
      aplicarOpcao(opcao);
    });
    lista.appendChild(btn);
  });
  botoes=Array.from(lista.querySelectorAll("button"));
  if(botoes.length>1)marcarIndice(1);
  else if(botoes.length)marcarIndice(0);
  if(botoes.length<=1){
    var vazio=document.createElement("div");
    vazio.className="s03-cell-name-empty";
    vazio.textContent="SEM NOMES DISPONÍVEIS";
    lista.appendChild(vazio);
  }
  picker.onkeydown=(event)=>{
    if(event.key==="Escape"){
      event.preventDefault();
      ocultarDropdownCelulaEscala(td);
      return;
    }
    if((event.key==="Enter"||event.key===" ")&&indiceAtivo>=0&&botoes[indiceAtivo]?._s03Opcao){
      event.preventDefault();
      aplicarOpcao(botoes[indiceAtivo]._s03Opcao);
      return;
    }
    if(event.key==="ArrowDown"||event.key==="ArrowUp"){
      event.preventDefault();
      var step=event.key==="ArrowDown"?1:-1;
      marcarIndice(Math.max(0,Math.min(botoes.length-1,indiceAtivo+step)));
      return;
    }
    if(event.key==="Backspace"){
      event.preventDefault();
      buffer=buffer.slice(0,-1);
    }else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      event.preventDefault();
      buffer+=event.key;
    }else{
      return;
    }
    clearTimeout(bufferTimer);
    bufferTimer=setTimeout(()=>{buffer="";},900);
    var alvo=normResp(buffer);
    if(!alvo)return;
    var index=botoes.findIndex((btn)=>!btn._s03Opcao?.vazio&&normResp(btn._s03Opcao?.match||btn.textContent).startsWith(alvo));
    if(index<0)index=botoes.findIndex((btn)=>!btn._s03Opcao?.vazio&&normResp(btn._s03Opcao?.match||btn.textContent).includes(alvo));
    if(index>=0)marcarIndice(index);
  };
  picker.appendChild(lista);
  picker.focus();
};
var mostrarDropdownCelulaEscala=(td,{substituir=false}={})=>{
  if(modoEditarEscala||!td||td.querySelector(".s03-cell-select,.s03-cell-picker")||td.classList.contains("s03-dropdown-open")||td.classList.contains("posto-cell")||td.classList.contains("s03-posto-inativo")||celulaChefePosto(td))return;
  var table=td.closest("table");
  var forcas=forcasDropdownCelulaEscala(td);
  if(!table||!forcas.length)return;
  removerDropdownsEscala();
  var picker=document.createElement("div");
  // NOVO: picker dentro da célula, não mais flutuante no body.
  picker.className="s03-cell-picker s03-cell-picker-in-cell s03-cell-picker-single"+(forcas.length>1?" s03-cell-picker-multi-force":"");
  picker._s03AnchorTd=td;
  picker.tabIndex=0;
  picker.addEventListener("click",(event)=>event.stopPropagation());
  picker.addEventListener("pointerdown",(event)=>event.stopPropagation());
  td.classList.add("s03-dropdown-open","s03-dropdown-target");
  td.appendChild(picker);
  posicionarDropdownCelulaEscala(td,picker);
  montarListaNomesCelulaEscala(picker,table,td,forcas,substituir);
};
var abrirDropdownModoLista=(event)=>{
  if(modoEditarEscala)return;
  var td=event.currentTarget?.tagName==="TD"?event.currentTarget:event.target?.closest?.(".s03-table tbody td");
  if(!td){
    if(acaoCelulaEscala)limparAcaoCelulaEscala();
    return;
  }
  mostrarDropdownCelulaEscala(td,{substituir:celulaOcupadaEscala(td)});
};
var aplicarDropEscala=(event)=>{
  var td=tdEventoEscala(event);
  if(!td||!td.closest(".s03-table")||td.classList.contains("posto-cell")||td.classList.contains("s03-posto-inativo"))return;
  event.preventDefault();
  event.stopPropagation();
  limparDrop(event);
  var estado=estadoDragEscala(event);
  var nome=estado.nome;
  var forca=estado.forca;
  var origemDrag=event.dataTransfer.getData("application/x-s03-origin");
  var acaoArrastoEscala=acaoCelulaEscala&&dragAtualEscala&&normResp(dragAtualEscala.nome)===normResp(acaoCelulaEscala.nome);
  var origem=acaoArrastoEscala||origemDrag==="escala"?acaoCelulaEscala?.origem:null;
  var moverDrag=(event.dataTransfer.getData("application/x-s03-action")==="move")||(acaoArrastoEscala&&acaoCelulaEscala?.mover);
  var ok=false;
  if(origemDrag==="escala"&&acaoCelulaEscala?.tipo==="multi"){
    ok=aplicarAcaoCelulasEscala(td);
  } else {
    ok=alocarCelulaEscala(td,nome,forca,origem,moverDrag);
  }
  if(ok&&origemDrag==="escala"&&!(acaoCelulaEscala?.tipo==="multi"&&!acaoCelulaEscala.mover))limparAcaoCelulaEscala();
  limparMarcacoesDropEscala();
};
var aplicarDropEscalaDocumento=(event)=>{
  if(!event.target?.closest?.(".s03-table"))return;
  aplicarDropEscala(event);
};
var prepararAcaoCelulaEscala=(td,action)=>{
  if(!td||(action!=="move"&&action!=="copy"))return false;
  var nome=nomeCelulaEscala(td);
  var forca=forcaCelulaEscala(td);
  if(!nome||!forca)return false;
  td.dataset.nomeAlocado=nome;
  td.dataset.forca=forca;
  limparAcaoCelulaEscala();
  acaoCelulaEscala={nome,forca,origem:td,mover:action==="move"};
  td.classList.add("s03-cell-selected");
  return true;
};
var iniciarDragCelulaEscala=(event)=>{
  var td=event.target.closest?.("td")||event.currentTarget;
  var action=event.target.closest("[data-s03-cell-action]")?.dataset.s03CellAction;
  if((action==="move"||action==="copy")&&acaoCelulaEscala?.origem!==td)prepararAcaoCelulaEscala(td,action);
  if(!acaoCelulaEscala||acaoCelulaEscala.origem!==td){
    event.preventDefault();
    return;
  }
  event.dataTransfer.setData("text/plain",acaoCelulaEscala.nome);
  event.dataTransfer.setData("application/x-forca",acaoCelulaEscala.forca);
  event.dataTransfer.setData("application/x-s03-origin","escala");
  event.dataTransfer.setData("application/x-s03-action",acaoCelulaEscala.mover?"move":"copy");
  event.dataTransfer.effectAllowed=acaoCelulaEscala.mover?"move":"copy";
  dragAtualEscala={nome:acaoCelulaEscala.nome,forca:acaoCelulaEscala.forca};
  var ghost=document.createElement("div");
  ghost.className="drag-nome-ghost";
  ghost.textContent=acaoCelulaEscala.nome;
  document.body.appendChild(ghost);
  event.dataTransfer.setDragImage(ghost,10,10);
  setTimeout(()=>ghost.remove(),0);
};
var finalizarDragCelulaEscala=()=>{dragAtualEscala=null;};
var criarGhostAcaoEscala=()=>{
  var ghost=document.createElement("div");
  ghost.className="drag-nome-ghost";
  ghost.textContent=acaoCelulaEscala?.nome||"";
  document.body.appendChild(ghost);
  return ghost;
};
var moverGhostAcaoEscala=(event)=>{
  if(!ponteiroAcaoEscala?.ghost)return;
  ponteiroAcaoEscala.ghost.style.left=`${event.clientX+10}px`;
  ponteiroAcaoEscala.ghost.style.top=`${event.clientY+10}px`;
};
var iniciarPonteiroAcaoEscala=(event)=>{
  var action=event.target.closest("[data-s03-cell-action]")?.dataset.s03CellAction;
  if(action!=="move"&&action!=="copy")return;
  var td=event.target.closest("td");
  if(!prepararAcaoCelulaEscala(td,action))return;
  event.preventDefault();
  event.stopPropagation();
  event.target.setPointerCapture?.(event.pointerId);
  ponteiroAcaoEscala={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,dragging:false,ghost:null};
};
var atualizarPonteiroAcaoEscala=(event)=>{
  if(!ponteiroAcaoEscala||ponteiroAcaoEscala.pointerId!==event.pointerId)return;
  var dx=Math.abs(event.clientX-ponteiroAcaoEscala.startX);
  var dy=Math.abs(event.clientY-ponteiroAcaoEscala.startY);
  if(!ponteiroAcaoEscala.dragging&&(dx>4||dy>4)){
    ponteiroAcaoEscala.dragging=true;
    ponteiroAcaoEscala.ghost=criarGhostAcaoEscala();
    ignorarClickAcaoEscala=true;
  }
  if(!ponteiroAcaoEscala.dragging)return;
  event.preventDefault();
  moverGhostAcaoEscala(event);
  var td=document.elementFromPoint(event.clientX,event.clientY)?.closest?.("td");
  document.querySelectorAll(".s03-drop-hover").forEach((cell)=>{if(cell!==td)cell.classList.remove("s03-drop-hover");});
  if(td&&td.closest(".s03-table")&&td!==acaoCelulaEscala?.origem&&!td.classList.contains("posto-cell")&&!td.classList.contains("s03-posto-inativo")){
    if(podeReceberDropEscala(td,acaoCelulaEscala.nome,acaoCelulaEscala.forca,acaoCelulaEscala.origem,acaoCelulaEscala.mover,{sinalizar:true})){
      td.classList.add("s03-drop-hover");
    }
  }
};
var finalizarPonteiroAcaoEscala=(event)=>{
  if(!ponteiroAcaoEscala||ponteiroAcaoEscala.pointerId!==event.pointerId)return;
  var estavaArrastando=ponteiroAcaoEscala.dragging;
  ponteiroAcaoEscala.ghost?.remove();
  ponteiroAcaoEscala=null;
  document.querySelectorAll(".s03-drop-hover").forEach((cell)=>cell.classList.remove("s03-drop-hover"));
  if(!estavaArrastando)return;
  event.preventDefault();
  var td=document.elementFromPoint(event.clientX,event.clientY)?.closest?.("td");
  if(td&&acaoCelulaEscala&&td!==acaoCelulaEscala.origem){
    var ok=alocarCelulaEscala(td,acaoCelulaEscala.nome,acaoCelulaEscala.forca,acaoCelulaEscala.origem,acaoCelulaEscala.mover);
    if(ok)limparAcaoCelulaEscala();
  }
  setTimeout(()=>{ignorarClickAcaoEscala=false;},0);
};
var limparSelecaoAlocar=()=>{
  document.querySelectorAll(".s03-alocar-cell-selected").forEach((td)=>td.classList.remove("s03-alocar-cell-selected"));
  selecaoAlocar=null;
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
};
var vagasAlocar=()=>selecaoAlocar?.cells?.filter((td)=>!celulaOcupadaEscala(td))||[];
var nomeJaNoPostoAlocar=(nome)=>Boolean(selecaoAlocar?.cells?.some((td)=>normResp(nomeCelulaEscala(td))===normResp(nome)));
var podeNomeAlocar=(nome,forca)=>{
  if(!modoAlocarAtivo||!selecaoAlocar||!nome||normResp(forca)!==selecaoAlocar.forca)return false;
  if(nomeJaNoPostoAlocar(nome))return false;
  return vagasAlocar().some((td)=>{
    var table=td.closest("table");
    return !nomeDuplicadoNaColuna(table,td,nome);
  });
};
var estadoAlocarEfetivo=(nome,forca)=>{
  if(!modoAlocarAtivo||!selecaoAlocar)return {ativo:false,disabled:false,selected:false};
  if(normResp(forca)!==selecaoAlocar.forca)return {ativo:true,disabled:true,selected:false};
  var jaNoPosto=nomeJaNoPostoAlocar(nome);
  var pode=podeNomeAlocar(nome,forca);
  return {ativo:true,disabled:!pode,selected:pode||jaNoPosto};
};
var aplicarAlocarNome=(nome,forca)=>{
  if(!podeNomeAlocar(nome,forca)){
    selecaoAlocar?.cells?.[0]&&bloquearDrop(selecaoAlocar.cells[0]);
    return false;
  }
  var vaga=vagasAlocar().find((td)=>!nomeDuplicadoNaColuna(td.closest("table"),td,nome));
  if(!vaga){
    selecaoAlocar?.cells?.[0]&&bloquearDrop(selecaoAlocar.cells[0]);
    return false;
  }
  var ok=alocarCelulaEscala(vaga,nome,normResp(forca));
  if(ok){
    if(!vagasAlocar().length)limparSelecaoAlocar();
    else if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  }
  return ok;
};
var selecionarPostoAlocar=(td)=>{
  if(!modoAlocarAtivo||!td||td.classList.contains("posto-cell")||td.classList.contains("s03-posto-inativo"))return false;
  var table=td.closest("table");
  var local=localAlocacao(td);
  var coluna=colunaAlocacao(td);
  var forca=forcaAtivaEscala();
  if(!table||!local||coluna<0||!forcaPermitidaNoLocal(table.id,local,forca)){
    bloquearDrop(td);
    return false;
  }
  document.querySelectorAll(".s03-alocar-cell-selected").forEach((cell)=>cell.classList.remove("s03-alocar-cell-selected"));
  var cells=Array.from(table.querySelectorAll("tbody td:not(.posto-cell)")).filter((cell)=>{
    if(cell.classList.contains("s03-posto-inativo")||celulaChefePosto(cell))return false;
    return normResp(localAlocacao(cell))===normResp(local)&&colunaAlocacao(cell)===coluna&&forcaPermitidaNoLocal(table.id,local,forca);
  });
  if(!cells.length){
    limparSelecaoAlocar();
    bloquearDrop(td);
    return false;
  }
  cells.forEach((cell)=>cell.classList.add("s03-alocar-cell-selected"));
  selecaoAlocar={tableId:table.id,local,coluna,forca,cells};
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  return true;
};
var selecionarPostoAlocarEvento=(event)=>{
  if(!modoAlocarAtivo)return false;
  if(event.target?.closest?.("[data-s03-cell-action]"))return false;
  var td=event.target?.closest?.(".s03-table tbody td");
  if(!td)return false;
  event.preventDefault();
  event.stopPropagation();
  return selecionarPostoAlocar(td);
};
var limparMarcacoesColunaEscala=()=>{
  document.querySelectorAll(".s03-col-source,.s03-col-dest,.s03-col-blocked,.s03-col-active,.s03-col-hover").forEach((el)=>{
    el.classList.remove("s03-col-source","s03-col-dest","s03-col-blocked","s03-col-active","s03-col-hover");
  });
};
var colunaDeHeaderEscala=(th)=>{
  var table=th?.closest("table");
  if(!table)return -1;
  if((table.id==="tbl-T2"||table.id==="tbl-T4")&&th.closest("tr")!==table.querySelector("thead tr:last-child"))return -1;
  if(table.id==="tbl-T2")return th.cellIndex>0?th.cellIndex:-1;
  if(table.id==="tbl-T4")return th.cellIndex+1;
  return th.cellIndex;
};
var alvoColunaEscala=(target)=>{
  var cell=target?.closest?.("td,th");
  var table=cell?.closest?.("table");
  if(!cell||!table||!S03_TABLE_IDS.includes(table.id))return null;
  var coluna=cell.tagName==="TH"?colunaDeHeaderEscala(cell):colunaAlocacao(cell);
  if(coluna<0)return null;
  return {table,coluna,cell};
};
var cellsColunaEscala=(table,coluna,{editaveis=false}={})=>Array.from(table.querySelectorAll("tbody td:not(.posto-cell)")).filter((td)=>{
  if(td.classList.contains("s03-posto-inativo"))return false;
  if(colunaAlocacao(td)!==coluna)return false;
  return !editaveis||!celulaChefePosto(td);
});
var colunaVaziaEscala=(table,coluna)=>cellsColunaEscala(table,coluna,{editaveis:true}).every((td)=>!celulaOcupadaEscala(td));
var colunaNaoVaziaEscala=(table,coluna)=>!colunaVaziaEscala(table,coluna);
var colunasTabelaEscala=(table)=>[...new Set(Array.from(table.querySelectorAll("tbody td:not(.posto-cell)")).map(colunaAlocacao).filter((coluna)=>coluna>=0))];
var dadosCelulaColuna=(td)=>{
  var nome=nomeCelulaEscala(td);
  return nome?{nome,forca:forcaCelulaEscala(td)}:null;
};
var limparCelulaEscala=(td)=>{
  td.innerHTML="";
  delete td.dataset.nomeAlocado;
  delete td.dataset.forca;
  delete td.dataset.s03AutoChefe;
};
var cellsEditaveisTabelaEscala=(table)=>colunasTabelaEscala(table).flatMap((coluna)=>cellsColunaEscala(table,coluna,{editaveis:true}));
var preencherCelulaColuna=(td,dados)=>{
  if(!dados?.nome){
    limparCelulaEscala(td);
    return;
  }
  td.innerHTML=htmlAlocado(dados.nome);
  td.dataset.nomeAlocado=dados.nome;
  td.dataset.forca=dados.forca||forcaAtivaEscala();
};
var atualizarMarcacoesColunaEscala=()=>{
  limparMarcacoesColunaEscala();
  if(!modoColunaEscala)return;
  S03_TABLE_IDS.forEach((id)=>{
    var table=document.getElementById(id);
    if(!table)return;
    var colunas=colunasTabelaEscala(table);
    var temOrigem=colunas.some((coluna)=>colunaNaoVaziaEscala(table,coluna));
    var tabelaOperavel=temOrigem;
    colunasTabelaEscala(table).forEach((coluna)=>{
      var vazia=colunaVaziaEscala(table,coluna);
      var classe=!tabelaOperavel?"s03-col-blocked":modoColunaEscala==="limpar"?(vazia?"s03-col-blocked":"s03-col-source"):(vazia?"s03-col-dest":"s03-col-source");
      cellsColunaEscala(table,coluna).forEach((td)=>td.classList.add(classe));
    });
  });
  if(colunaOrigemEscala){
    cellsColunaEscala(colunaOrigemEscala.table,colunaOrigemEscala.coluna).forEach((td)=>td.classList.add("s03-col-active"));
  }
};
var limparEstadoColunaEscala=()=>{
  modoColunaEscala=null;
  colunaOrigemEscala=null;
  ponteiroColunaEscala=null;
  limparMarcacoesColunaEscala();
  document.querySelectorAll(".s03-tool-edicao [data-s03-tool='mover'],.s03-tool-edicao [data-s03-tool='copiar'],.s03-tool-edicao [data-s03-tool='limpar']").forEach((btn)=>btn.classList.remove("active"));
};
var limparSelecaoTabelaInteira=()=>{
  document.querySelectorAll(".s03-table-clear-selected").forEach((td)=>td.classList.remove("s03-table-clear-selected"));
  tabelaLimparPendente=null;
};
var fecharPopoverLimparTabela=(limpar=false)=>{
  var pop=document.getElementById("popoverS03LimparTabela");
  if(limpar&&tabelaLimparPendente){
    cellsEditaveisTabelaEscala(tabelaLimparPendente).forEach(limparCelulaEscala);
    if(modoColunaEscala)atualizarMarcacoesColunaEscala();
    atualizarDisponibilidadeColuna();
    if(typeof window.renderEfetivo==="function")window.renderEfetivo();
    salvarTabelasEscalaDados();
    salvarLocalEmergencial();
  }
  limparSelecaoTabelaInteira();
  pop?.classList.remove("is-open");
  pop?.setAttribute("aria-hidden","true");
};
var abrirPopoverLimparTabela=(table)=>{
  if(!table)return;
  limparSelecaoTabelaInteira();
  tabelaLimparPendente=table;
  cellsEditaveisTabelaEscala(table).forEach((td)=>td.classList.add("s03-table-clear-selected"));
  var pop=document.getElementById("popoverS03LimparTabela");
  pop?.classList.add("is-open");
  pop?.setAttribute("aria-hidden","false");
};
var possibilidadeModoColuna=(modo)=>S03_TABLE_IDS.some((id)=>{
  var table=document.getElementById(id);
  if(!table)return false;
  var estados=colunasTabelaEscala(table).map((coluna)=>({vazia:colunaVaziaEscala(table,coluna),naoVazia:colunaNaoVaziaEscala(table,coluna)}));
  if(modo==="limpar")return estados.some((estado)=>estado.naoVazia);
  return estados.some((estado)=>estado.naoVazia);
});
var atualizarDisponibilidadeColuna=()=>{
  ["mover","copiar","limpar"].forEach((modo)=>{
    var possivel=possibilidadeModoColuna(modo);
    var btn=document.querySelector(`.s03-tool-edicao [data-s03-tool="${modo}"]`);
    if(btn){
      btn.disabled=!possivel;
      btn.classList.toggle("is-unavailable",!possivel);
    }
    if(modoColunaEscala===modo&&!possivel)limparEstadoColunaEscala();
  });
};
var validarDestinoColunaEscala=(origem,destino,mover=false)=>{
  if(!origem||!destino)return false;
  if(origem.table!==destino.table)return false;
  if(origem.coluna===destino.coluna)return false;
  if(!colunaNaoVaziaEscala(origem.table,origem.coluna))return false;
  var source=cellsColunaEscala(origem.table,origem.coluna,{editaveis:true});
  var target=cellsColunaEscala(destino.table,destino.coluna,{editaveis:true});
  var dados=source.map(dadosCelulaColuna);
  return dados.every((item,index)=>{
    if(!item?.nome)return true;
    var alvo=target[index];
    if(!alvo)return false;
    return podeReceberDropEscala(alvo,item.nome,item.forca,source[index]||null,mover,{sinalizar:false});
  });
};
var copiarColunaEscala=(origem,destino,mover=false)=>{
  if(!origem||!destino)return false;
  if(origem.table===destino.table&&origem.coluna===destino.coluna)return false;
  if(!colunaNaoVaziaEscala(origem.table,origem.coluna))return false;
  var source=cellsColunaEscala(origem.table,origem.coluna,{editaveis:true});
  var target=cellsColunaEscala(destino.table,destino.coluna,{editaveis:true});
  var dados=source.map(dadosCelulaColuna);
  var origemPorCelula=source;
  var valido=dados.every((item,index)=>{
    if(!item?.nome)return true;
    var alvo=target[index];
    if(!alvo)return false;
    return podeReceberDropEscala(alvo,item.nome,item.forca,origemPorCelula?.[index]||null,mover,{sinalizar:false});
  });
  if(!valido){
    target.forEach((td,index)=>{
      var item=dados[index];
      if(item?.nome)bloquearDrop(td);
    });
    return false;
  }
  target.forEach((td,index)=>preencherCelulaColuna(td,dados[index]));
  if(mover)source.forEach(limparCelulaEscala);
  colunaOrigemEscala=mover?destino:origem;
  atualizarMarcacoesColunaEscala();
  atualizarDisponibilidadeColuna();
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  salvarTabelasEscalaDados();
  salvarLocalEmergencial();
  return true;
};
var limparColunaEscala=(alvo)=>{
  if(!alvo||!colunaNaoVaziaEscala(alvo.table,alvo.coluna))return false;
  cellsColunaEscala(alvo.table,alvo.coluna,{editaveis:true}).forEach(limparCelulaEscala);
  colunaOrigemEscala=null;
  atualizarMarcacoesColunaEscala();
  atualizarDisponibilidadeColuna();
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  salvarTabelasEscalaDados();
  salvarLocalEmergencial();
  return true;
};
var acionarColunaEscala=(alvo)=>{
  if(!modoColunaEscala||!alvo)return false;
  if(modoColunaEscala==="limpar")return limparColunaEscala(alvo);
  if(colunaOrigemEscala&&!(colunaOrigemEscala.table===alvo.table&&colunaOrigemEscala.coluna===alvo.coluna)){
    return copiarColunaEscala(colunaOrigemEscala,{table:alvo.table,coluna:alvo.coluna},modoColunaEscala==="mover");
  }
  if(colunaNaoVaziaEscala(alvo.table,alvo.coluna)){
    colunaOrigemEscala={table:alvo.table,coluna:alvo.coluna};
    atualizarMarcacoesColunaEscala();
    return true;
  }
  return false;
};
var setModoColunaEscala=(modo)=>{
  var novoModo=modoColunaEscala===modo?null:modo;
  if(modoAlocarAtivo)setModoAlocar(false);
  if(modoDropdownEscala)setModoDropdownEscala(false);
  limparEstadoColunaEscala();
  modoColunaEscala=novoModo;
  if(!modoColunaEscala)return;
  document.querySelector(`.s03-tool-edicao [data-s03-tool="${modoColunaEscala}"]`)?.classList.add("active");
  atualizarMarcacoesColunaEscala();
  atualizarDisponibilidadeColuna();
};
var criarGhostColunaEscala=(alvo)=>{
  var ghost=document.createElement("div");
  ghost.className="drag-nome-ghost";
  ghost.textContent=`COLUNA ${alvo.coluna}`;
  document.body.appendChild(ghost);
  return ghost;
};
var iniciarPonteiroColunaEscala=(event)=>{
  if(modoColunaEscala!=="mover"&&modoColunaEscala!=="copiar")return false;
  var alvo=alvoColunaEscala(event.target);
  if(!alvo||!colunaNaoVaziaEscala(alvo.table,alvo.coluna))return false;
  ponteiroColunaEscala={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,origem:alvo,modo:modoColunaEscala,dragging:false,ghost:null};
  return true;
};
var atualizarPonteiroColunaEscala=(event)=>{
  if(!ponteiroColunaEscala||ponteiroColunaEscala.pointerId!==event.pointerId)return;
  var dx=Math.abs(event.clientX-ponteiroColunaEscala.startX);
  var dy=Math.abs(event.clientY-ponteiroColunaEscala.startY);
  if(!ponteiroColunaEscala.dragging&&(dx>4||dy>4)){
    ponteiroColunaEscala.dragging=true;
    colunaOrigemEscala=ponteiroColunaEscala.origem;
    ponteiroColunaEscala.ghost=criarGhostColunaEscala(colunaOrigemEscala);
    ignorarClickColunaEscala=true;
    atualizarMarcacoesColunaEscala();
  }
  if(!ponteiroColunaEscala.dragging)return;
  event.preventDefault();
  if(ponteiroColunaEscala.ghost){
    ponteiroColunaEscala.ghost.style.left=`${event.clientX+10}px`;
    ponteiroColunaEscala.ghost.style.top=`${event.clientY+10}px`;
  }
  var alvo=alvoColunaEscala(document.elementFromPoint(event.clientX,event.clientY));
  document.querySelectorAll(".s03-col-hover,.s03-col-blocked").forEach((cell)=>cell.classList.remove("s03-col-hover","s03-col-blocked"));
  if(alvo&&alvo.table===ponteiroColunaEscala.origem.table&&!(alvo.table===ponteiroColunaEscala.origem.table&&alvo.coluna===ponteiroColunaEscala.origem.coluna)){
    var podeAplicar = validarDestinoColunaEscala(ponteiroColunaEscala.origem, alvo, ponteiroColunaEscala.modo === "mover");
    cellsColunaEscala(alvo.table,alvo.coluna).forEach((td)=>td.classList.add(podeAplicar ? "s03-col-hover" : "s03-col-blocked"));
  }
};
var finalizarPonteiroColunaEscala=(event)=>{
  if(!ponteiroColunaEscala||ponteiroColunaEscala.pointerId!==event.pointerId)return;
  var estavaArrastando=ponteiroColunaEscala.dragging;
  var origem=ponteiroColunaEscala.origem;
  var modo=ponteiroColunaEscala.modo;
  ponteiroColunaEscala.ghost?.remove();
  ponteiroColunaEscala=null;
  document.querySelectorAll(".s03-col-hover,.s03-col-blocked").forEach((cell)=>cell.classList.remove("s03-col-hover","s03-col-blocked"));
  if(!estavaArrastando)return;
  event.preventDefault();
  var alvo=alvoColunaEscala(document.elementFromPoint(event.clientX,event.clientY));
  if(alvo&&alvo.table===origem.table&&!(alvo.table===origem.table&&alvo.coluna===origem.coluna)){
    copiarColunaEscala(origem,alvo,modo==="mover");
  }
  setTimeout(()=>{ignorarClickColunaEscala=false;},0);
};

var setModoEditarEscala=(ativo)=>{
  modoEditarEscala=Boolean(ativo);
  document.body.classList.toggle("s03-edit-mode",modoEditarEscala);
  document.querySelector(".s03-editar")?.classList.toggle("active",modoEditarEscala);
  if(modoEditarEscala){
    // LEGADO: alocar/lista/coluna ficam desativados no modo EDITAR para não conflitar com seleção Excel-like.
    if(modoAlocarAtivo)setModoAlocar(false);
    if(modoDropdownEscala)setModoDropdownEscala(false);
    removerDropdownsEscala();
  }else{
    limparSelecoesCelulaEscala();
    limparAcaoCelulaEscala();
  }
};
var iniciarSelecaoEditarEscala=(event)=>{
  if(!modoEditarEscala||event.button!==0||event.target?.closest?.("[data-s03-cell-action]"))return false;
  var td=event.target?.closest?.(".s03-table tbody td");
  if(!celulaSelecionavelEscala(td))return false;
  event.preventDefault();
  event.stopPropagation();
  selecaoArrastoEscala={origem:td,atual:td,pointerId:event.pointerId};
  if(event.ctrlKey||event.metaKey)toggleSelecaoCelulaEscala(td);else selecionarUnicaCelulaEscala(td);
  return true;
};
var atualizarSelecaoEditarEscala=(event)=>{
  if(!selecaoArrastoEscala||selecaoArrastoEscala.pointerId!==event.pointerId)return;
  var td=document.elementFromPoint(event.clientX,event.clientY)?.closest?.(".s03-table tbody td");
  if(td&&td!==selecaoArrastoEscala.atual&&celulaSelecionavelEscala(td)){
    selecaoArrastoEscala.atual=td;
    selecionarRangeCelulasEscala(selecaoArrastoEscala.origem,td);
  }
};
var finalizarSelecaoEditarEscala=(event)=>{
  if(!selecaoArrastoEscala||selecaoArrastoEscala.pointerId!==event.pointerId)return;
  if(obterSelecoesCelulaEscala().length>1)ignorarClickAcaoEscala=true;
  selecaoArrastoEscala=null;
};
var matrizSelecaoEscala=(tds)=>{
  var cells=tds.filter(celulaSelecionavelEscala);
  if(!cells.length)return null;
  var table=cells[0].closest("table");
  if(!table||cells.some((td)=>td.closest("table")!==table))return null;
  var rows=cells.map((td)=>td.parentElement.sectionRowIndex);
  var cols=cells.map(colunaGridEscala);
  var minRow=Math.min(...rows),minCol=Math.min(...cols),maxRow=Math.max(...rows),maxCol=Math.max(...cols);
  var set=new Set(cells);
  var entries=[];
  for(var r=minRow;r<=maxRow;r++){
    for(var c=minCol;c<=maxCol;c++){
      var td=obterCelulaEscalaPorPosicao(table,r,c);
      if(!td||!set.has(td))return null;
      entries.push({row:r-minRow,col:c-minCol,nome:nomeCelulaEscala(td),forca:forcaCelulaEscala(td),td});
    }
  }
  return {tableId:table.id,rows:maxRow-minRow+1,cols:maxCol-minCol+1,entries};
};
var copiarSelecaoEscala=(recortar=false)=>{
  var tds=selecoesOrdenadasEscala();
  var matriz=matrizSelecaoEscala(tds);
  if(!matriz){showMultiActionIndicator("Seleção inválida");setTimeout(()=>hideMultiActionIndicator(),1200);return false;}
  clipboardEscala={...matriz,recortar};
  showMultiActionIndicator((recortar?"Recortado":"Copiado")+` — ${matriz.entries.length} células`);
  if(recortar)matriz.entries.forEach((item)=>item.td.classList.add("s03-cell-cut"));
  return true;
};
var limparSelecaoEditavelEscala=()=>{
  var tds=selecoesOrdenadasEscala();
  if(!tds.length)return false;
  tds.forEach(limparCelulaEscala);
  atualizarDisponibilidadeColuna();
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  salvarTabelasEscalaDados();
  salvarLocalEmergencial();
  limparSelecoesCelulaEscala();
  return true;
};
var colarClipboardEscala=(anchor=null)=>{
  if(!clipboardEscala)return false;
  var destino=anchor&&celulaSelecionavelEscala(anchor)?anchor:selecoesOrdenadasEscala()[0];
  if(!destino)return false;
  var table=destino.closest("table");
  if(!table||table.id!==clipboardEscala.tableId)return false;
  var destMatrix=matrizSelecaoEscala(selecoesOrdenadasEscala());
  if(destMatrix&&selecoesCelulaEscala.size>1&&(destMatrix.rows!==clipboardEscala.rows||destMatrix.cols!==clipboardEscala.cols)){
    showMultiActionIndicator("Destino incompatível");setTimeout(()=>hideMultiActionIndicator(),1200);return false;
  }
  var baseRow=destMatrix&&selecoesCelulaEscala.size>1?Math.min(...selecoesOrdenadasEscala().map((td)=>td.parentElement.sectionRowIndex)):destino.parentElement.sectionRowIndex;
  var baseCol=destMatrix&&selecoesCelulaEscala.size>1?Math.min(...selecoesOrdenadasEscala().map(colunaGridEscala)):colunaGridEscala(destino);
  var destinos=[];
  for(var item of clipboardEscala.entries){
    var td=obterCelulaEscalaPorPosicao(table,baseRow+item.row,baseCol+item.col);
    if(!td||!podeReceberMultiPasteEscala(td,item.forca,{sinalizar:false}))return false;
    if(item.nome&&nomeDuplicadoNaColuna(table,td,item.nome,null))return false;
    destinos.push({td,item});
  }
  if(clipboardEscala.recortar)clipboardEscala.entries.forEach((item)=>limparCelulaEscala(item.td));
  destinos.forEach(({td,item})=>preencherCelulaColuna(td,{nome:item.nome,forca:item.forca}));
  document.querySelectorAll(".s03-cell-cut").forEach((td)=>td.classList.remove("s03-cell-cut"));
  if(clipboardEscala.recortar)clipboardEscala=null;
  atualizarDisponibilidadeColuna();
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  salvarTabelasEscalaDados();
  salvarLocalEmergencial();
  return true;
};
var abrirPopoverRepetirEscala=()=>{
  var matriz=matrizSelecaoEscala(selecoesOrdenadasEscala());
  if(!matriz||matriz.cols!==1){showMultiActionIndicator("Selecione uma coluna origem");setTimeout(()=>hideMultiActionIndicator(),1200);return false;}
  var origem=selecoesOrdenadasEscala()[0];
  var table=origem.closest("table");
  var origemCol=colunaGridEscala(origem);
  var cols=colunasTabelaEscala(table).filter((col)=>col>origemCol);
  if(!cols.length){showMultiActionIndicator("Não há colunas à direita");setTimeout(()=>hideMultiActionIndicator(),1200);return false;}
  document.getElementById("popoverS03Repetir")?.remove();
  var pop=document.createElement("div");
  pop.id="popoverS03Repetir";
  pop.className="s03-repeat-popover";
  pop.innerHTML=`<div class="s03-repeat-title">REPETIR ALOCAÇÃO</div><div class="s03-repeat-origin">Origem: coluna ${origemCol}</div><div class="s03-repeat-list">${cols.map((col)=>`<label><input type="checkbox" value="${col}" checked> Coluna ${col}</label>`).join("")}</div><div class="s03-repeat-actions"><button type="button" data-act="ok">CONFIRMAR</button><button type="button" data-act="cancel">CANCELAR</button></div>`;
  document.body.appendChild(pop);
  var rect=origem.getBoundingClientRect();
  pop.style.left=Math.max(6,Math.min(rect.left,window.innerWidth-230))+"px";
  pop.style.top=Math.max(6,Math.min(rect.bottom+4,window.innerHeight-260))+"px";
  pop.addEventListener("click",(event)=>{
    var act=event.target?.dataset?.act;
    if(act==="cancel"){pop.remove();return;}
    if(act!=="ok")return;
    var selecionadas=Array.from(pop.querySelectorAll("input:checked")).map((inp)=>Number(inp.value));
    selecionadas.forEach((col)=>{
      matriz.entries.forEach((item)=>{
        var td=obterCelulaEscalaPorPosicao(table,origem.parentElement.sectionRowIndex+item.row,col);
        if(td&&podeReceberMultiPasteEscala(td,item.forca,{sinalizar:false})&&(!item.nome||!nomeDuplicadoNaColuna(table,td,item.nome,null)))preencherCelulaColuna(td,{nome:item.nome,forca:item.forca});
      });
    });
    atualizarDisponibilidadeColuna();
    if(typeof window.renderEfetivo==="function")window.renderEfetivo();
    salvarTabelasEscalaDados();
    salvarLocalEmergencial();
    pop.remove();
  });
  return true;
};
var setModoAlocar=(ativo)=>{
  modoAlocarAtivo=Boolean(ativo);
  if(modoAlocarAtivo){
    if(modoEditarEscala)setModoEditarEscala(false);
    setModoDropdownEscala(false);
    limparEstadoColunaEscala();
  }
  limparAcaoCelulaEscala();
  document.body.classList.toggle("s03-alocar-mode",modoAlocarAtivo);
  var btn=document.querySelector(".s03-alocar");
  btn?.classList.toggle("active",modoAlocarAtivo);
  document.querySelectorAll(".s03-tool-edicao .s03-action-btn").forEach((item)=>{
    item.classList.remove("is-disabled");
    item.removeAttribute("aria-disabled");
  });
  if(!modoAlocarAtivo)limparSelecaoAlocar();
  else if(typeof window.renderEfetivo==="function")window.renderEfetivo();
};
var setModoDropdownEscala=(ativo)=>{
  modoDropdownEscala=Boolean(ativo);
  if(modoDropdownEscala){
    if(modoEditarEscala)setModoEditarEscala(false);
    if(modoAlocarAtivo)setModoAlocar(false);
    limparEstadoColunaEscala();
    limparAcaoCelulaEscala();
  }else{
    removerDropdownsEscala();
  }
  document.body.classList.toggle("s03-lista-mode",modoDropdownEscala);
  document.querySelector(".s03-lista")?.classList.toggle("active",modoDropdownEscala);
};
var clicarCelulaEscala=(event)=>{
  if(ignorarClickAcaoEscala){
    event.preventDefault();
    event.stopPropagation();
    ignorarClickAcaoEscala=false;
    return;
  }
  if(ignorarClickColunaEscala){
    event.preventDefault();
    event.stopPropagation();
    ignorarClickColunaEscala=false;
    return;
  }
  var td=event.target.closest("td");
  var action=event.target.closest("[data-s03-cell-action]")?.dataset.s03CellAction;
  var multiSelectKey=event.ctrlKey||event.metaKey;
  if(modoEditarEscala&&!action&&multiSelectKey&&td&&!modoAlocarAtivo&& !acaoCelulaEscala){
    if(celulaSelecionavelEscala(td)){
      event.preventDefault();
      event.stopPropagation();
      toggleSelecaoCelulaEscala(td);
      td.focus({preventScroll:true});
    }
    return;
  }
  if(!modoEditarEscala||!multiSelectKey){
    if(!modoEditarEscala)limparSelecoesCelulaEscala();
  }
  if(modoColunaEscala&&!action){
    var alvo=alvoColunaEscala(event.target);
    if(alvo){
      event.preventDefault();
      acionarColunaEscala(alvo);
      return;
    }
  }
  if(!td){
    if(acaoCelulaEscala)limparAcaoCelulaEscala();
    return;
  }
  if(!modoEditarEscala&&!action){
    event.preventDefault();
    event.stopPropagation();
    abrirDropdownModoLista(event);
    return;
  }
  if(modoAlocarAtivo&&!action){
    selecionarPostoAlocar(td);
    return;
  }
  if(action==="clear"){
    td.innerHTML="";
    delete td.dataset.nomeAlocado;
    delete td.dataset.forca;
    if(modoColunaEscala)atualizarMarcacoesColunaEscala();
    atualizarDisponibilidadeColuna();
    if(typeof window.renderEfetivo==="function")window.renderEfetivo();
    if(acaoCelulaEscala?.origem===td)limparAcaoCelulaEscala();
    return;
  }
  if(action==="move"||action==="copy"){
    prepararAcaoCelulaEscala(td,action);
    return;
  }
  if(!action && !modoAlocarAtivo && !acaoCelulaEscala){
    if(modoEditarEscala){
      event.preventDefault();
      event.stopPropagation();
      selecionarUnicaCelulaEscala(td);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    removerPreviewDropdownsEscala();
    mostrarDropdownCelulaEscala(td,{substituir:celulaOcupadaEscala(td)});
    return;
  }
  if(acaoCelulaEscala&&acaoCelulaEscala.origem!==td){
    if(acaoCelulaEscala.tipo==="multi"){
      aplicarAcaoCelulasEscala(td);
    } else {
      var ok=alocarCelulaEscala(td,acaoCelulaEscala.nome,acaoCelulaEscala.forca,acaoCelulaEscala.origem,acaoCelulaEscala.mover);
      if(acaoCelulaEscala?.mover||!ok)limparAcaoCelulaEscala();
    }
  }
};
var prepararDragBotaoEscala=(event)=>{
  if(iniciarSelecaoEditarEscala(event))return;
  if(modoEditarEscala)return;
  if(iniciarPonteiroColunaEscala(event))return;
  iniciarPonteiroAcaoEscala(event);
};
var postoInativo=(nome)=>{
  var config=postoConfigPorNome(nome);
  return config?config[2]==="INATIVO":false;
};
var setupAlocacaoEscalas=()=>{
  ["tbl-T2","tbl-T3","tbl-T4","tbl-T5"].forEach((id)=>{
    var table=document.getElementById(id);
    if(!table)return;
    if(!table._s03TableEvents){
      table.addEventListener("click",clicarCelulaEscala);
      table.addEventListener("pointerdown",prepararDragBotaoEscala);
      table.addEventListener("dragstart",iniciarDragCelulaEscala);
      table.addEventListener("dragover",setDropOk);
      table.addEventListener("drop",aplicarDropEscala);
      table._s03TableEvents=true;
    }
    // Mapeia local → [células inativas] para achar o centro de cada grupo
    var grupoInativo=new Map();
    table.querySelectorAll("tbody td:not(.posto-cell)").forEach((td)=>{
      td.classList.remove("s03-posto-inativo","s03-posto-inativo-hover");
      if(td.getAttribute("title")==="Posto inativo â€” alocaÃ§Ã£o bloqueada")td.removeAttribute("title");
      var local=localAlocacao(td);
      if(local&&postoInativo(local)){
        td.classList.add("s03-posto-inativo");
        td.setAttribute("title","Posto inativo — alocação bloqueada");
        if(!grupoInativo.has(local))grupoInativo.set(local,[]);
        grupoInativo.get(local).push(td);
        return; // não registra drag/drop
      }
      if(!td._s03CellEvents){
        td.tabIndex=0;
        td.addEventListener("keydown",tecladoAcaoCelulaEscala);
        td.addEventListener("dragstart",iniciarDragCelulaEscala);
        td.addEventListener("dragend",finalizarDragCelulaEscala);
        td.addEventListener("dragenter",()=>{if(tdAvisoForca&&tdAvisoForca!==td)limparAvisoForcaRestrita(tdAvisoForca);});
        td.addEventListener("pointerenter",()=>{
          if(modoEditarEscala){
            removerPreviewDropdownsEscala();
            removerDropdownsEscala();
            return;
          }
          var aberto=document.querySelector(".s03-cell-picker");
          if(aberto&&aberto._s03AnchorTd!==td){
            removerDropdownsEscala();
          }
          removerPreviewDropdownsEscala();
          mostrarPreviewDropdownCelulaEscala(td);
        });
        td.addEventListener("mouseleave",()=>setTimeout(()=>{
          // NOVO: a dropdown flutuante pode ficar afastada da célula, especialmente em colunas FPN.
          // Não fechar ao sair da célula; fecha somente por seleção, ESC ou clique fora.
          if(td.classList.contains("s03-dropdown-open")){
            ocultarPreviewDropdownCelulaEscala(td);
            return;
          }
          if(!dropdownCelulaEscalaEmUso(td)){
            ocultarPreviewDropdownCelulaEscala(td);
          }
        },180));
        td.addEventListener("dragover",setDropOk);
        td.addEventListener("dragleave",limparDrop);
        td.addEventListener("drop",aplicarDropEscala);
        td._s03CellEvents=true;
      }
    });
    grupoInativo.forEach((celulas)=>celulas.forEach((td)=>td.classList.add("s03-posto-inativo-hover")));
  });
};
