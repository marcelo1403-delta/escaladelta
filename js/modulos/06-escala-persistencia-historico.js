/* Módulo extraído de js/sandbox.js original. Carregue na ordem definida no index.html. */
var STORAGE_ESCALA_KEY="escalaAgent:lastSave";
var STORAGE_ULTIMO_GRAVADO_KEY="escalaAgent:ultimoGravadoValido:v1";
var STORAGE_TABELAS_ESCALA_KEY="escalaAgent:tabelasEscala:v2";
var tabelasEscalaSaveTimer=null;
var restaurandoTabelasEscala=false;
var alocacaoRows=[];
var estadoPaginaRestaurouTabelas=false;
var historicoUndoEscala=[];
var historicoRedoEscala=[];
var ultimoHistoricoEscala="";
var aplicandoHistoricoEscala=false;
var HISTORICO_ESCALA_LIMITE=80;
var tabelaCurtaEscala=(tableId)=>String(tableId||"").replace(/^tbl-/,"");
var indiceVagaCelulaEscala=(td)=>{
  var table=td?.closest("table");
  if(!table)return -1;
  var local=normResp(localAlocacao(td));
  var coluna=colunaAlocacao(td);
  var cells=Array.from(table.querySelectorAll("tbody td:not(.posto-cell)")).filter((cell)=>normResp(localAlocacao(cell))===local&&colunaAlocacao(cell)===coluna);
  return cells.indexOf(td);
};
var horarioCelulaEscala=(td)=>{
  var table=td?.closest("table");
  var coluna=colunaAlocacao(td);
  if(!table||coluna<0)return "";
  var lastHeaders=Array.from(table.querySelectorAll("thead tr:last-child th"));
  if(table.id==="tbl-T4")return txtResp(lastHeaders[coluna-1]?.textContent);
  return txtResp(lastHeaders[coluna]?.textContent);
};
var chaveAlocacaoCelula=(td)=>{
  var table=td?.closest("table");
  if(!table)return "";
  return [table.id,normResp(localAlocacao(td)),colunaAlocacao(td),indiceVagaCelulaEscala(td)].join("|");
};
var registroAlocacaoCelula=(td)=>{
  var table=td?.closest("table");
  var nome=nomeCelulaEscala(td);
  if(!table||!nome)return null;
  var coluna=colunaAlocacao(td);
  var posicao=indiceVagaCelulaEscala(td);
  return {
    id:chaveAlocacaoCelula(td),
    tabela:tabelaCurtaEscala(table.id),
    tableId:table.id,
    posto:localAlocacao(td),
    coluna,
    posicao,
    horario:horarioCelulaEscala(td),
    nome,
    forca:td.dataset.forca||forcaCelulaEscala(td),
    autoChefe:td.dataset.s03AutoChefe==="1"
  };
};
var estadoTabelaEscala=(id)=>Array.from(document.querySelectorAll(`#${id} tbody td:not(.posto-cell)`)).map((td)=>({
  row:td.parentElement.sectionRowIndex,
  col:td.cellIndex,
  childIndex:Array.from(td.parentElement.children).indexOf(td),
  local:localAlocacao(td),
  coluna:colunaAlocacao(td),
  vagaIndex:indiceVagaCelulaEscala(td),
  nome:td.dataset.nomeAlocado||nomeCelulaEscala(td),
  forca:td.dataset.forca||forcaCelulaEscala(td),
  autoChefe:td.dataset.s03AutoChefe==="1"
}));
var snapshotTabelasEscala=()=>Object.fromEntries(S03_TABLE_IDS.map((id)=>[id,estadoTabelaEscala(id)]));
var chaveHistoricoEscala=(snapshot)=>JSON.stringify(snapshot||{});
var snapshotHistoricoEscala=()=>compactarTabelasEscala(snapshotTabelasEscala());
var inicializarHistoricoEscala=()=>{ultimoHistoricoEscala=chaveHistoricoEscala(snapshotHistoricoEscala());};
var registrarHistoricoEscala=(snapshot)=>{
  if(aplicandoHistoricoEscala||restaurandoTabelasEscala)return;
  var atual=snapshot||snapshotHistoricoEscala();
  var chaveAtual=chaveHistoricoEscala(atual);
  if(!ultimoHistoricoEscala){
    ultimoHistoricoEscala=chaveAtual;
    return;
  }
  if(chaveAtual===ultimoHistoricoEscala)return;
  historicoUndoEscala.push(JSON.parse(ultimoHistoricoEscala));
  if(historicoUndoEscala.length>HISTORICO_ESCALA_LIMITE)historicoUndoEscala.shift();
  historicoRedoEscala=[];
  ultimoHistoricoEscala=chaveAtual;
};
var aplicarSnapshotHistoricoEscala=(snapshot)=>{
  aplicandoHistoricoEscala=true;
  restaurandoTabelasEscala=true;
  S03_TABLE_IDS.forEach((id)=>restaurarTabelaEscala(id,snapshot?.[id]||[]));
  restaurandoTabelasEscala=false;
  aplicandoHistoricoEscala=false;
  sincronizarAlocacoesDadosDoDom();
  if(modoColunaEscala)atualizarMarcacoesColunaEscala();
  atualizarDisponibilidadeColuna();
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  salvarTabelasEscalaDados();
  salvarLocalEmergencial();
};
var desfazerHistoricoEscala=()=>{
  if(!historicoUndoEscala.length)return false;
  var atual=snapshotHistoricoEscala();
  var anterior=historicoUndoEscala.pop();
  historicoRedoEscala.push(atual);
  if(historicoRedoEscala.length>HISTORICO_ESCALA_LIMITE)historicoRedoEscala.shift();
  aplicarSnapshotHistoricoEscala(anterior);
  ultimoHistoricoEscala=chaveHistoricoEscala(anterior);
  return true;
};
var refazerHistoricoEscala=()=>{
  if(!historicoRedoEscala.length)return false;
  var atual=snapshotHistoricoEscala();
  var proximo=historicoRedoEscala.pop();
  historicoUndoEscala.push(atual);
  if(historicoUndoEscala.length>HISTORICO_ESCALA_LIMITE)historicoUndoEscala.shift();
  aplicarSnapshotHistoricoEscala(proximo);
  ultimoHistoricoEscala=chaveHistoricoEscala(proximo);
  return true;
};
var tabelasEscalaTemNomes=(tabelas)=>tabelas&&typeof tabelas==="object"&&Object.values(tabelas).some((cells)=>Array.isArray(cells)&&cells.some((cell)=>txtResp(cell?.nome)));
var sincronizarAlocacoesDadosDoDom=()=>{
  var rows=[];
  S03_TABLE_IDS.forEach((id)=>{
    document.querySelectorAll(`#${id} tbody td:not(.posto-cell)`).forEach((td)=>{
      var row=registroAlocacaoCelula(td);
      if(row)rows.push(row);
    });
  });
  alocacaoRows=rows;
  return rows;
};
var alocacoesTemNomes=(rows)=>Array.isArray(rows)&&rows.some((row)=>txtResp(row?.nome));
var aplicarAlocacoesDadosNaView=(rows=alocacaoRows)=>{
  restaurandoTabelasEscala=true;
  S03_TABLE_IDS.forEach((id)=>{
    var table=document.getElementById(id);
    table?.querySelectorAll("tbody td:not(.posto-cell)").forEach((td)=>limparCelulaEscala(td));
  });
  rows.forEach((row)=>{
    var table=document.getElementById(row.tableId||`tbl-${row.tabela}`);
    if(!table||!row.nome)return;
    var cells=Array.from(table.querySelectorAll("tbody td:not(.posto-cell)")).filter((td)=>normResp(localAlocacao(td))===normResp(row.posto)&&colunaAlocacao(td)===Number(row.coluna));
    var td=cells[Number(row.posicao)];
    if(!td||td.classList.contains("s03-posto-inativo"))return;
    if(row.autoChefe){
      td.textContent=row.nome;
      td.dataset.s03AutoChefe="1";
      delete td.dataset.nomeAlocado;
      delete td.dataset.forca;
    }else{
      td.innerHTML=htmlAlocado(row.nome);
      td.dataset.nomeAlocado=row.nome;
      td.dataset.forca=row.forca||forcaCelulaEscala(td);
    }
  });
  restaurandoTabelasEscala=false;
};
var salvarTabelasEscalaDados=()=>{
  // ANTIGO COMENTADO LOGICAMENTE:
  // antes este método gravava um cache parcial de T2-T5 em localStorage.
  // Esse cache era restaurado depois do F5 e apagava EFETIVO/INFO/RESPONSÁVEIS.
  // Novo comportamento: não persiste cache parcial; apenas mantém snapshot em memória.
  try{
    var payload={
      versao:3,
      salvoEm:new Date().toISOString(),
      tabelas:compactarTabelasEscala(snapshotTabelasEscala()),
      alocacoes:sincronizarAlocacoesDadosDoDom().map((row)=>({...row}))
    };
    registrarHistoricoEscala(payload.tabelas);
    window._ultimoSnapshotTabelasEscala=payload.tabelas;
    window._alocacaoRows=payload.alocacoes;
  }catch(err){
    console.warn("Nao foi possivel atualizar snapshot local da escala",err);
  }
};const agendarSalvarTabelasEscala=()=>{
  if(restaurandoTabelasEscala||restaurandoEstadoPagina||Date.now()<bloquearAutosaveAte)return;
  clearTimeout(tabelasEscalaSaveTimer);
  tabelasEscalaSaveTimer=setTimeout(()=>{
    tabelasEscalaSaveTimer=null;
    salvarTabelasEscalaDados();
    salvarLocalEmergencial();
  },250);
};
var carregarTabelasEscalaDados=(forcar=false)=>{
  // ANTIGO COMENTADO LOGICAMENTE:
  // não restaurar mais cache parcial de tabelas.
  // A restauração de F5 agora usa um snapshot completo em sessionStorage.
  return false;
};const contarNomesTabelasEscala=(tabelas={})=>Object.values(tabelas||{}).reduce((total,cells)=>total+(Array.isArray(cells)?cells.filter((cell)=>txtResp(cell?.nome)).length:0),0);
var tabelasEscalaCacheMaisNovoQue=(estado)=>{
  // ANTIGO COMENTADO LOGICAMENTE: cache parcial de T2-T5 não deve prevalecer.
  return false;
};const observarTabelasEscala=()=>{
  S03_TABLE_IDS.forEach((id)=>{
    var table=document.getElementById(id);
    var alvo=table?.tBodies?.[0]||table;
    if(!table||!alvo)return;
    if(table._s03PersistObserver&&table._s03PersistTarget===alvo)return;
    table._s03PersistObserver?.disconnect?.();
    table._s03PersistObserver=new MutationObserver(()=>agendarSalvarTabelasEscala());
    table._s03PersistObserver.observe(alvo,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["data-nome-alocado","data-forca","data-s03-auto-chefe"]});
    table._s03PersistTarget=alvo;
  });
};
var horariosEscala=()=>({
  T2:Array.from(document.querySelectorAll("#tbl-T2 thead th")).map((th)=>th.textContent),
  T3:Array.from(document.querySelectorAll("#tbl-T3 thead tr")).map((tr)=>Array.from(tr.children).map((th)=>th.textContent)),
  T4:Array.from(document.querySelectorAll("#tbl-T4 thead tr")).map((tr)=>Array.from(tr.children).map((th)=>th.textContent)),
  T5:Array.from(document.querySelectorAll("#tbl-T5 thead tr")).map((tr)=>Array.from(tr.children).map((th)=>th.textContent))
});
var aplicarHorariosEscala=(horarios={})=>{
  var t2=Array.isArray(horarios.T2)?horarios.T2:[];
  document.querySelectorAll("#tbl-T2 thead th").forEach((th,index)=>{if(t2[index])th.textContent=t2[index];});
  var t4=Array.isArray(horarios.T4)?horarios.T4:[];
  document.querySelectorAll("#tbl-T4 thead tr").forEach((tr,rowIndex)=>{
    var values=Array.isArray(t4[rowIndex])?t4[rowIndex]:[];
    Array.from(tr.children).forEach((th,index)=>{if(values[index])th.textContent=values[index];});
  });
  var t3=Array.isArray(horarios.T3)?horarios.T3:[];
  var t5=Array.isArray(horarios.T5)?horarios.T5:[];
  [["tbl-T3",t3],["tbl-T5",t5]].forEach(([id,rows])=>{
    if(!rows.length)return;
    var table=document.getElementById(id);
    if(!table)return;
    if(table.tHead.rows.length<2)table.tHead.insertRow();
    rows.forEach((values,rowIndex)=>{
      var tr=table.tHead.rows[rowIndex]||table.tHead.insertRow();
      if(!Array.isArray(values))return;
      if(tr.children.length!==values.length){
        tr.innerHTML=values.map((value)=>`<th>${cfgEsc(value)}</th>`).join("");
      }else{
        Array.from(tr.children).forEach((th,index)=>{th.textContent=values[index]||"";});
      }
    });
  });
};
var restaurarTabelaEscala=(id,cells=[])=>{
  var table=document.getElementById(id);
  if(!table)return;
  table.querySelectorAll("tbody td:not(.posto-cell)").forEach((td)=>limparCelulaEscala(td));
  var localizarCelula=(item)=>{
    var local=normResp(item.local);
    var coluna=Number(item.coluna);
    var vagaIndex=Number(item.vagaIndex);
    if(local&&Number.isFinite(coluna)&&Number.isFinite(vagaIndex)&&vagaIndex>=0){
      var matches=Array.from(table.querySelectorAll("tbody td:not(.posto-cell)")).filter((td)=>normResp(localAlocacao(td))===local&&colunaAlocacao(td)===coluna);
      if(matches[vagaIndex])return matches[vagaIndex];
    }
    var tr=table.querySelectorAll("tbody tr")[Number(item.row)];
    var childIndex=Number.isFinite(Number(item.childIndex))?Number(item.childIndex):Number(item.col);
    return tr?.children?.[childIndex]||null;
  };
  cells.forEach((item)=>{
    var td=localizarCelula(item);
    if(!td||td.classList.contains("posto-cell")||td.classList.contains("s03-posto-inativo"))return;
    if(celulaChefePosto(td)&&!item.autoChefe)return;
    if(item.nome){
      if(item.autoChefe){
        td.textContent=item.nome;
        td.dataset.s03AutoChefe="1";
        delete td.dataset.nomeAlocado;
        delete td.dataset.forca;
      }else{
        td.innerHTML=htmlAlocado(item.nome);
        td.dataset.nomeAlocado=item.nome;
        td.dataset.forca=item.forca||forcaCelulaEscala(td);
      }
    }
  });
};

var snapshotDomRefresh=()=>({
  efetivoBody:document.getElementById("eftCanonicoBody")?.innerHTML||"",
  filtroMsg:document.getElementById("efetivoFiltroMsg")?.textContent||"",
  forceSummaries:Array.from(document.querySelectorAll(".force-summary")).map((el)=>el.innerHTML),
  responsaveisTables:Array.from(document.querySelectorAll(".resp-card .resp-table tbody")).map((el)=>el.innerHTML),
  topoDiaSemana:document.getElementById("topoDiaSemana")?.textContent||"",
  topoPlantaoDia:document.getElementById("topoPlantaoDia")?.textContent||""
});
var aplicarDomRefresh=(dom={})=>{
  if(!dom||typeof dom!=="object")return;
  var tbody=document.getElementById("eftCanonicoBody");
  if(tbody&&typeof dom.efetivoBody==="string"&&dom.efetivoBody.trim())tbody.innerHTML=dom.efetivoBody;
  var msg=document.getElementById("efetivoFiltroMsg");
  if(msg&&typeof dom.filtroMsg==="string")msg.textContent=dom.filtroMsg;
  if(Array.isArray(dom.forceSummaries)){
    document.querySelectorAll(".force-summary").forEach((el,index)=>{
      if(typeof dom.forceSummaries[index]==="string"&&dom.forceSummaries[index].trim())el.innerHTML=dom.forceSummaries[index];
    });
  }
  if(Array.isArray(dom.responsaveisTables)){
    document.querySelectorAll(".resp-card .resp-table tbody").forEach((el,index)=>{
      if(typeof dom.responsaveisTables[index]==="string")el.innerHTML=dom.responsaveisTables[index];
    });
  }
  var dia=document.getElementById("topoDiaSemana");
  if(dia&&typeof dom.topoDiaSemana==="string"&&dom.topoDiaSemana)dia.textContent=dom.topoDiaSemana;
  var plantao=document.getElementById("topoPlantaoDia");
  if(plantao&&typeof dom.topoPlantaoDia==="string"&&dom.topoPlantaoDia)plantao.textContent=dom.topoPlantaoDia;
};

var coletarEstadoPagina=()=>{
  var data=document.getElementById("topoDatePicker")?.value||"";
  var plantao=normResp(document.getElementById("topoPlantaoDia")?.textContent||window._nomePlantao||plantaoRespAtual()||"");
  var servidores=typeof window._getServidoresArray==="function"?window._getServidoresArray().map((s)=>({...s})):[];
  var extraRecorrentes=typeof window._getGruposExtraRecorrentes==="function"?window._getGruposExtraRecorrentes().map((g)=>({...g,membros:Array.isArray(g.membros)?[...g.membros]:[]})):[];
  var responsaveis=snapshotResponsaveis();
  var status=estadoEscalaPorDataGestao(data);
  return {
    tipo:"escala",
    versao:2,
    estado:status,
    matrizConectada:status==="em andamento",
    salvoEm:new Date().toISOString(),
    topo:{data,plantao,forca:forcaAtivaEscala(),filtro:window._filtroEfetivoV9||"presente"},
    efetivoView:servidores.filter((s)=>normResp(s.plantao)===plantao).map((s)=>({...s})),
    responsaveisView:responsaveis.filter((r)=>normResp(r.plantao)===plantao).map((r)=>({...r})),
    horariosView:horariosEscala(),
    domView:snapshotDomRefresh(),
    tabelas:snapshotTabelasEscala(),
    horarios:horariosEscala(),
    cadastroHorarios:{
      seq:horariosSeq,
      registros:horariosRegistros.map((r)=>({...r,filhos:r.filhos.map((f)=>({...f}))}))
    },
    configPostos:postoRows.map((row)=>[...row]),
    alocacoes:sincronizarAlocacoesDadosDoDom().map((row)=>({...row})),
    responsaveisVersao:2,
    responsaveis,
    extraRecorrentes,
    servidores
  };
};

var compactarTabelasEscala=(tabelas={})=>Object.fromEntries(Object.entries(tabelas||{}).map(([id,cells])=>[
  id,
  Array.isArray(cells)
    ? cells
        .filter((cell)=>txtResp(cell?.nome)||cell?.autoChefe)
        .map(({html,...cell})=>({...cell}))
    : []
]));
var compactarEstadoParaEscala=(estado={})=>{
  var out=JSON.parse(JSON.stringify(estado||{}));
  out.snapshotAutossuficiente=true;
  out.snapshotVersao=3;
  out.snapshotGeradoEm=out.snapshotGeradoEm||new Date().toISOString();
  // Arquivo de escala guarda a configuração necessária para reabrir T2-T5 com a mesma estrutura visual.
  // As alocações ficam em alocacoes e, como segurança, em tabelas compactadas só com células ocupadas.
  out.tabelas=compactarTabelasEscala(out.tabelas||{});
  // Arquivo de escala deve ser snapshot da aba ESCALA, não cópia integral da matriz.
  if(Array.isArray(out.servidores)){
    var plantao=normResp(out.topo?.plantao||"");
    out.efetivoView=Array.isArray(out.efetivoView)&&out.efetivoView.length?out.efetivoView:out.servidores.filter((s)=>normResp(s.plantao)===plantao).map((s)=>({...s}));
  }
  if(Array.isArray(out.responsaveis)){
    var plantao=normResp(out.topo?.plantao||"");
    out.responsaveisView=Array.isArray(out.responsaveisView)&&out.responsaveisView.length?out.responsaveisView:out.responsaveis.filter((r)=>normResp(r.plantao)===plantao).map((r)=>({...r}));
  }
  delete out.domView;
  return out;
};
var servidoresSnapshotCompleto=(servidores=[])=>{
  if(!Array.isArray(servidores)||!servidores.length)return false;
  var plantoes=new Set(servidores.map((s)=>normResp(s?.plantao)).filter(Boolean));
  return ["ALFA","BRAVO","CHARLIE","DELTA"].every((plantao)=>plantoes.has(plantao));
};
var validarSnapshotAutossuficienteEscala=(estado={})=>{
  var faltantes=[];
  if(estado?.tipo!=="escala")faltantes.push("tipo=escala");
  if(!dataIsoValida(estado?.topo?.data||""))faltantes.push("topo.data");
  if(!normResp(estado?.topo?.plantao||""))faltantes.push("topo.plantao");
  if(!Array.isArray(estado.servidores)||!estado.servidores.length)faltantes.push("servidores");
  else if(!servidoresSnapshotCompleto(estado.servidores))faltantes.push("servidores.todos_os_plantoes");
  if(!Array.isArray(estado.responsaveis)||!estado.responsaveis.length)faltantes.push("responsaveis");
  if(!Array.isArray(estado.configPostos)||!estado.configPostos.length)faltantes.push("configPostos");
  if(!Array.isArray(estado.cadastroHorarios?.registros)||!estado.cadastroHorarios.registros.length)faltantes.push("cadastroHorarios.registros");
  if(!Array.isArray(estado.extraRecorrentes))faltantes.push("extraRecorrentes");
  if(!estado.tabelas||typeof estado.tabelas!=="object")faltantes.push("tabelas");
  if(!Array.isArray(estado.alocacoes))faltantes.push("alocacoes");
  if(!estado.horarios||typeof estado.horarios!=="object")faltantes.push("horarios");
  return {ok:!faltantes.length,faltantes};
};
var completarServidoresSnapshotComMatriz=(estado={},matriz={})=>{
  if(!Array.isArray(matriz?.servidores)||!matriz.servidores.length)return estado;
  var out=cloneGestao(estado);
  var porId=new Map(matriz.servidores.map((s)=>[String(s.id||""),{...s}]).filter(([id])=>id));
  (Array.isArray(out.servidores)?out.servidores:[]).forEach((s)=>{
    var id=String(s.id||"");
    if(!id)return;
    porId.set(id,{...(porId.get(id)||{}),...s});
  });
  out.servidores=Array.from(porId.values());
  var plantao=normResp(out.topo?.plantao||"");
  out.efetivoView=out.servidores.filter((s)=>normResp(s.plantao)===plantao).map((s)=>({...s}));
  return out;
};
var reaplicarSnapshotTabelasEscala=(estado)=>{
  if(!estado||typeof estado!=="object")return false;
  var temTabelas=tabelasEscalaTemNomes(estado.tabelas);
  var temAlocacoes=alocacoesTemNomes(estado.alocacoes);
  if(!temTabelas&&!temAlocacoes)return false;
  var ateAnterior=bloquearAutosaveAte;
  bloquearAutosaveAte=Math.max(bloquearAutosaveAte,Date.now()+1200);
  restaurandoTabelasEscala=true;
  try{
    if(temTabelas){
      S03_TABLE_IDS.forEach((id)=>restaurarTabelaEscala(id,estado.tabelas?.[id]||[]));
      sincronizarAlocacoesDadosDoDom();
    }else if(temAlocacoes){
      alocacaoRows=estado.alocacoes.map((row)=>({...row,id:row.id||[row.tableId||`tbl-${row.tabela}`,normResp(row.posto),row.coluna,row.posicao].join("|")}));
      aplicarAlocacoesDadosNaView(alocacaoRows);
    }
    garantirHorariosVivencias();
    sincronizarResponsaveisEscalas();
    window._ultimoSnapshotTabelasEscala=snapshotTabelasEscala();
    window._alocacaoRows=sincronizarAlocacoesDadosDoDom().map((row)=>({...row}));
    return true;
  }finally{
    restaurandoTabelasEscala=false;
    bloquearAutosaveAte=Math.max(ateAnterior,Date.now()+600);
  }
};
var reaplicarSnapshotTabelasAposRender=(estado)=>{
  if(!estado||(!tabelasEscalaTemNomes(estado.tabelas)&&!alocacoesTemNomes(estado.alocacoes)))return;
  var snapshot=cloneGestao(estado);
  [80,350,900].forEach((delay)=>setTimeout(()=>{
    reaplicarSnapshotTabelasEscala(snapshot);
    salvarTabelasEscalaDados();
  },delay));
};
var aplicarEstadoPagina=(estado)=>{
  if(!estado||typeof estado!=="object")return false;
  var estadoSnapshotTabelas=cloneGestao({tabelas:estado.tabelas||{},alocacoes:estado.alocacoes||[]});
  limparEstadoColunaEscala();
  setModoAlocar(false);
  var date=document.getElementById("topoDatePicker");
  if(date)date.value=estado.topo?.data||"";
  _dataRespFallback=estado.topo?.data||"";
  _plantaoRespFallback=normResp(estado.topo?.plantao||window._nomePlantao||"");
  // Ao abrir qualquer escala, a visualização sempre volta para PPF.
  // O valor salvo em topo.forca não é usado para restaurar a tela, para evitar abrir em FPN por acidente.
  var forca="PPF";
  document.querySelectorAll(".lp-force-btn").forEach((btn)=>btn.classList.toggle("active",normResp(btn.dataset.force)===forca));
  window._forcaAtiva=forca;
  document.body.classList.toggle("force-ppf",forca==="PPF");
  document.body.classList.toggle("force-fpn",forca==="FPN");
  aplicarTurnoEscala("day");
  window._filtroEfetivoV9=estado.topo?.filtro||"presente";
  document.querySelectorAll(".srv-filtro-v9").forEach((btn)=>btn.classList.toggle("active",(btn.dataset.status||"").toLowerCase()===window._filtroEfetivoV9));
  var servidoresEstado=Array.isArray(estado.servidores)?estado.servidores:(Array.isArray(estado.efetivoView)?estado.efetivoView:[]);
  if(typeof window.importCadastroServidores==="function")window.importCadastroServidores(servidoresEstado);
  horariosSeq=Number(estado.cadastroHorarios?.seq||horariosSeq)||horariosSeq;
  horariosRegistros=Array.isArray(estado.cadastroHorarios?.registros)?estado.cadastroHorarios.registros.map((r)=>({...r,filhos:filhosStringParaObjeto(Array.isArray(r.filhos)?r.filhos:[],r.id||"")})):[];
  if(Array.isArray(estado.configPostos)){
    aplicarConfigPostosSalva(estado.configPostos);
  }
  renderConfigHorario(configHorarioAtivo);
  if(horariosRegistros.some((r)=>r.atual))aplicarHorariosAtuais();
  else{
    aplicarHorariosAtuais();
    aplicarHorariosEscala(estado.horarios||{});
  }
  garantirHorariosVivencias();
  var estadoTemTabelas=tabelasEscalaTemNomes(estado.tabelas);
  var estadoTemAlocacoes=alocacoesTemNomes(estado.alocacoes);
  var cacheTabelasMaisNovo=tabelasEscalaCacheMaisNovoQue(estado);
  if(!cacheTabelasMaisNovo)S03_TABLE_IDS.forEach((id)=>restaurarTabelaEscala(id,estado.tabelas?.[id]||[]));
  garantirHorariosVivencias();
  if(!cacheTabelasMaisNovo&&!estadoTemTabelas&&estadoTemAlocacoes){
    alocacaoRows=estado.alocacoes.map((row)=>({...row}));
    aplicarAlocacoesDadosNaView(alocacaoRows);
    salvarTabelasEscalaDados();
  }
  if(cacheTabelasMaisNovo||(!estadoTemTabelas&&!estadoTemAlocacoes))carregarTabelasEscalaDados(true);
  var temSnapshotResponsaveis=Array.isArray(estado.responsaveis);
  var responsaveisEstado=temSnapshotResponsaveis?estado.responsaveis:(Array.isArray(estado.responsaveisView)?estado.responsaveisView:[]);
  if(temSnapshotResponsaveis||((estado?.origemArquivoUsuario||estado?.responsaveisVersao===2)&&listaResponsaveisTemNomes(responsaveisEstado))){
    aplicarResponsaveisSalvos(responsaveisEstado);
    salvarResponsaveisDados();
  }else{
    carregarResponsaveisDados();
  }
  window.atualizarTopoPlantao?.();
  _plantaoRespFallback=normResp(document.getElementById("topoPlantaoDia")?.textContent||window._nomePlantao||_plantaoRespFallback||"");
  if(!estado.snapshotAutossuficiente)removerResponsaveisAusentesPlantaoAtual();
  renderResponsaveisViews();
  renderResponsaveisPostos();
  if(!cacheTabelasMaisNovo&&(estadoTemTabelas||estadoTemAlocacoes))salvarTabelasEscalaDados();
  estadoPaginaRestaurouTabelas=estadoTemTabelas||estadoTemAlocacoes;
  if(cacheTabelasMaisNovo||(!estadoTemTabelas&&!estadoTemAlocacoes))carregarTabelasEscalaDados(true);
  atualizarDisponibilidadeColuna();
  if(estado.origemRefreshLocal&&estado.domView){
    var domSnapshot=cloneGestao(estado.domView);
    aplicarDomRefresh(domSnapshot);
    [120,420,950].forEach((delay)=>setTimeout(()=>aplicarDomRefresh(domSnapshot),delay));
  }
  reaplicarSnapshotTabelasAposRender(estadoSnapshotTabelas);
  atualizarBotaoGravarGestao();
  return true;
};
var autosaveTimerPagina=null;
var restaurandoEstadoPagina=false;
var bloquearAutosaveAte=0;
var sincronizandoResponsaveisEscalas=false;
var gravacaoEscalaEmAndamento=false;
var paginaFoiRecarregada=()=>{
  try{
    var nav=performance.getEntriesByType?.("navigation")?.[0];
    if(nav?.type)return nav.type==="reload";
    return performance?.navigation?.type===1;
  }catch(err){
    return false;
  }
};
var salvarUltimoGravadoValido=(estado)=>localStorage.setItem(STORAGE_ULTIMO_GRAVADO_KEY,JSON.stringify(compactarEstadoParaEscala(estado)));
var salvarLocalEmergencial=()=>{
  if(restaurandoEstadoPagina||Date.now()<bloquearAutosaveAte)return;
  try{
    if(!estadoEscalaTemDados())return;
    var estado=coletarEstadoPagina();
    estado.autosaveLocal=true;
    estado.autosaveEm=new Date().toISOString();
    estado.origemRefreshLocal=true;
    estado.refreshSnapshotVersao=4;
    // Novo: sessionStorage preserva F5, mas some ao fechar a aba/navegador.
    var rawEstado=JSON.stringify(estado);
    sessionStorage.setItem(STORAGE_REFRESH_SESSION_KEY,rawEstado);
    apagarCachesAntigosRefresh();
    if(typeof window.agendarAutosaveNuvemPagina==="function")window.agendarAutosaveNuvemPagina();
  }catch(err){
    console.warn("Nao foi possivel salvar snapshot de refresh",err);
  }
};const agendarAutosavePagina=()=>{
  if(restaurandoEstadoPagina||Date.now()<bloquearAutosaveAte)return;
  clearTimeout(autosaveTimerPagina);
  autosaveTimerPagina=setTimeout(()=>{
    autosaveTimerPagina=null;
    salvarLocalEmergencial();
  },500);
};
var restaurarAutosavePagina=()=>{
  try{
    var raw=sessionStorage.getItem(STORAGE_REFRESH_SESSION_KEY);
    if(!raw)return false;
    var estado=JSON.parse(raw);
    if(!estado||!estado.topo||estado.refreshSnapshotVersao!==4)return false;
    estado.origemRefreshLocal=true;
    restaurandoEstadoPagina=true;
    var ok=aplicarEstadoPagina(estado);
    restaurandoEstadoPagina=false;
    if(ok){
      var restauradoEncerrado=String(estado?.estado||'').toLowerCase()==='encerrado';
      window._arquivoAbertoDocId=backupDocIdGestao(estado.topo?.data||"",estado.topo?.plantao||"")||"";
      window._escalaAbertaStatus=restauradoEncerrado?'encerrado':'em_andamento';
      window._modoEdicaoForcado=!restauradoEncerrado;
      atualizarModoLeituraEscala();
      // mantém o snapshot para outro F5/crash; será substituído no próximo autosave/beforeunload.
      var rawRestaurado=JSON.stringify(estado);
      sessionStorage.setItem(STORAGE_REFRESH_SESSION_KEY,rawRestaurado);
      return true;
    }
  }catch(err){
    console.warn("Snapshot de refresh invalido",err);
  }finally{
    restaurandoEstadoPagina=false;
  }
  return false;
};
var limparAutosaveEmergencial=()=>{
  try{
    sessionStorage.removeItem(STORAGE_REFRESH_SESSION_KEY);
    localStorage.removeItem(STORAGE_REFRESH_LOCAL_KEY);
  }catch(err){}
};
var nomeDataArquivo=()=>document.getElementById("topoDatePicker")?.value||"";
var dataArquivoPt=()=>{
  var value=document.getElementById("topoDatePicker")?.value||"";
  if(/^\d{4}-\d{2}-\d{2}$/.test(value)){
    var [ano,mes,dia]=value.split("-");
    return `${dia}-${mes}-${ano}`;
  }
  return value.replace(/[^\d-]/g,"");
};
var plantaoArquivo=()=>normResp(document.getElementById("topoPlantaoDia")?.textContent||"PLANTAO")||"PLANTAO";
var nomeBackupArquivo=()=>`escala-${dataArquivoPt()}-${plantaoArquivo()}.json`;
var MATRIZ_DOC_ID="matriz-dados";
var BACKUP_DOC_PREFIX="escala-";
var dataIsoValida=(value)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return false;
  var [ano,mes,dia]=value.split("-").map(Number);
  var data=new Date(ano,mes-1,dia);
  return data.getFullYear()===ano&&data.getMonth()===mes-1&&data.getDate()===dia;
};
var dataObjIso=(value)=>{
  if(!dataIsoValida(value))return null;
  var [ano,mes,dia]=value.split("-").map(Number);
  return new Date(ano,mes-1,dia);
};
var serialDataGestao=(data)=>{
  var excelBase=Date.UTC(1899,11,30);
  var utcDia=Date.UTC(data.getFullYear(),data.getMonth(),data.getDate());
  return Math.floor((utcDia-excelBase)/86400000);
};
var plantaoPorDataGestao=(dataIso)=>{
  var data=dataObjIso(dataIso);
  return data?["ALFA","BRAVO","CHARLIE","DELTA"][serialDataGestao(data)%4]:"";
};
var diaSemanaGestao=(dataIso)=>{
  var data=dataObjIso(dataIso);
  return data?["DOMINGO","SEGUNDA-FEIRA","TERCA-FEIRA","QUARTA-FEIRA","QUINTA-FEIRA","SEXTA-FEIRA","SABADO"][data.getDay()]:"";
};
var dataPtGestao=(dataIso)=>{
  if(!dataIsoValida(dataIso))return "";
  var [ano,mes,dia]=dataIso.split("-");
  return `${dia}-${mes}-${ano}`;
};
var backupDocIdGestao=(dataIso,plantao=plantaoPorDataGestao(dataIso))=>{
  var dataPt=dataPtGestao(dataIso);
  var nomePlantao=normResp(plantao);
  return dataPt&&nomePlantao?`${BACKUP_DOC_PREFIX}${dataPt}-${nomePlantao}`:"";
};
var legacyDocIdGestao=(dataIso,plantao=plantaoPorDataGestao(dataIso))=>{
  var dataPt=dataPtGestao(dataIso);
  var nomePlantao=normResp(plantao);
  return dataPt&&nomePlantao?`${dataPt}-${nomePlantao}`:"";
};
var parseBackupDocGestao=(id)=>{
  var match=String(id||"").match(/^(?:escala-)?(\d{2})-(\d{2})-(\d{4})-([A-Z]+)$/i);
  if(!match)return null;
  var [,dia,mes,ano,plantao]=match;
  var dataIso=`${ano}-${mes}-${dia}`;
  if(!dataIsoValida(dataIso))return null;
  var nomePlantao=normResp(plantao);
  return {id,dataIso,dia,mes,ano,plantao:nomePlantao,label:`escala-${dia}-${mes}-${ano}-${nomePlantao}`};
};
var mesNomeGestao=(mes)=>["","JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"][Number(mes)]||mes;
var statusFirebaseParaEstadoGestao=(status)=>String(status||"").toLowerCase()==="encerrado"?"encerrado":"em andamento";
var estadoEscalaPorDataGestao=(dataIso)=>escalaEstaEmAndamento(dataIso)?"em andamento":"encerrado";
var escalaEncerradaSomenteLeitura=()=>window._escalaAbertaStatus==="encerrado"&&!window._modoEdicaoForcado;
var atualizarModoLeituraEscala=()=>{
  var somenteLeitura=escalaEncerradaSomenteLeitura();
  var encerrada=window._escalaAbertaStatus==="encerrado";
  document.body.classList.toggle("escala-somente-leitura",somenteLeitura);
  document.body.classList.toggle("escala-encerrada",encerrada);
  var btnEditar=document.getElementById("btnEditarTop");
  if(btnEditar){
    btnEditar.hidden=false;
    btnEditar.disabled=false;
    btnEditar.setAttribute("aria-disabled",String(!encerrada));
    btnEditar.classList.toggle("is-disabled",!encerrada);
    btnEditar.classList.toggle("is-required",somenteLeitura);
  }
  ["btnExcluirTop"].forEach((id)=>{
    var btn=document.getElementById(id);
    if(!btn)return;
    btn.setAttribute("aria-disabled",String(somenteLeitura));
    btn.classList.toggle("is-disabled",somenteLeitura);
  });
  atualizarBotaoGravarGestao();
};
var bloquearInteracaoLeitura=(event)=>{
  if(!escalaEncerradaSomenteLeitura())return;
  var target=event.target;
  if(target?.closest?.("#btnGravarTop"))return;
  var menuItem=target?.closest?.("#btnExcluirTop");
  if(menuItem){
    event.preventDefault();
    event.stopPropagation();
    if(event.type==="click")popMsg("Essa escala está encerrada. No menu OUTROS, escolha a opção EDITAR se precisar fazer alguma alteração.");
    return;
  }
  if(!target?.closest?.("#escalaWrap,#servidoresPage,.s03-clear-popover,.config-popover"))return;
  if(target.closest(".s03-clear-popover,.config-popover"))return;
  if(target.closest("#btnEditarTop,#btnOutrosTop,#menuOutrosTop,#btnPreviewPrint,.print-escala-btn,.lp-force-btn,.srv-filtro-v9,.s03-tool-turnos .s03-btn,#btnS02Toggle,#btnRecorrentes,#popoverExtraRecorrentes .s01-pop-close,#popoverExtraRecorrentes .s01-exit"))return;
  event.preventDefault();
  event.stopPropagation();
  if(event.type==="click")popMsg("Essa escala está encerrada. No menu OUTROS, escolha a opção EDITAR se precisar fazer alguma alteração.");
};
var setTopoGestao=(dataIso)=>{
  var dataEl=document.getElementById("topoDatePicker");
  var diaEl=document.getElementById("topoDiaSemana");
  var plantaoEl=document.getElementById("topoPlantaoDia");
  var plantao=plantaoPorDataGestao(dataIso);
  if(dataEl)dataEl.value=dataIso||"";
  if(diaEl)diaEl.textContent=diaSemanaGestao(dataIso);
  if(plantaoEl)plantaoEl.textContent=plantao;
  window._nomePlantao=plantao;
  _dataRespFallback=dataIso||"";
  _plantaoRespFallback=plantao;
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  renderResponsaveisViews();
  renderResponsaveisPostos();
  atualizarDisponibilidadeColuna();
  atualizarBotaoGravarGestao();
  atualizarModoLeituraEscala();
};
var validarDadosParaSalvar=()=>{
  if(!dataIsoValida(document.getElementById("topoDatePicker")?.value||"")){popMsg("Escolha uma data válida.");return false;}
  if(!normResp(document.getElementById("topoPlantaoDia")?.textContent)){popMsg("Plantão da navbar vazio. Escolha uma data válida.");return false;}
  return true;
};
var baixarJson=(nome,estado)=>{
  var blob=new Blob([JSON.stringify(estado,null,2)],{type:"application/json"});
  var url=URL.createObjectURL(blob);
  var a=document.createElement("a");
  a.href=url;
  a.download=nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
var cloneGestao=(value)=>JSON.parse(JSON.stringify(value||{}));
var MATRIZ_KEYS_SERVIDOR=["id","matricula","nome","nomecurto","forca","status","plantao","turno","setor","motivoapoio","jornada","horario","motivoausencia","substituto","infoausencia","plantao_pgto_permuta","id_pgto_permuta","status_pgto"];
var normalizarServidorMatriz=(servidor={})=>{
  var out={};
  MATRIZ_KEYS_SERVIDOR.forEach((key)=>{out[key]=servidor?.[key]??"";});
  return out;
};
var matrizDadosFromEstado=(estado={},base={})=>({
  versao:Number(base?.versao||1),
  tipo:"matriz-dados",
  salvoEm:new Date().toISOString(),
  servidores:Array.isArray(estado.servidores)?estado.servidores.map(normalizarServidorMatriz):Array.isArray(base?.servidores)?base.servidores.map(normalizarServidorMatriz):[],
  responsaveisVersao:2,
  responsaveis:Array.isArray(estado.responsaveis)?estado.responsaveis.map((r)=>({...r})):Array.isArray(base?.responsaveis)?base.responsaveis.map((r)=>({...r})):[],
  configPostos:Array.isArray(estado.configPostos)?estado.configPostos.map((row)=>[...row]):Array.isArray(base?.configPostos)?base.configPostos.map((row)=>[...row]):[],
  postosColunas:Array.isArray(base?.postosColunas)?base.postosColunas.map((row)=>Array.isArray(row)?[...row]:({...row})):[],
  cadastroHorarios:{
    seq:Number(estado.cadastroHorarios?.seq||base?.cadastroHorarios?.seq||1),
    registros:Array.isArray(estado.cadastroHorarios?.registros)?estado.cadastroHorarios.registros.map((r)=>({...r,filhos:Array.isArray(r.filhos)?r.filhos.map((f)=>({...f})):[]})):Array.isArray(base?.cadastroHorarios?.registros)?base.cadastroHorarios.registros.map((r)=>({...r,filhos:Array.isArray(r.filhos)?r.filhos.map((f)=>({...f})):[]})):[]
  },
  horariosDefault:Array.isArray(base?.horariosDefault)?base.horariosDefault.map((h)=>({...h,filhos:Array.isArray(h.filhos)?[...h.filhos]:[]})):[],
  extraRecorrentes:Array.isArray(estado.extraRecorrentes)?estado.extraRecorrentes.map((g)=>({...g,membros:Array.isArray(g.membros)?[...g.membros]:[]})):Array.isArray(base?.extraRecorrentes)?base.extraRecorrentes.map((g)=>({...g,membros:Array.isArray(g.membros)?[...g.membros]:[]})):[]
});
var carregarMatrizDados=async()=>{
  if(typeof window.FirebaseSync!=="undefined"){
    var doc=await window.FirebaseSync.carregar(MATRIZ_DOC_ID);
    if(doc?.payload)return doc.payload;
  }
  try{
    var res=await fetch("matriz-dados.json",{cache:"no-store"});
    if(res.ok)return await res.json();
  }catch(err){console.warn("Falha ao carregar matriz-dados.json",err);}
  return null;
};
var estadoEscalaFromMatriz=(matriz,dataIso)=>({
  tipo:"escala",
  versao:2,
  estado:"em andamento",
  matrizConectada:true,
  salvoEm:new Date().toISOString(),
  topo:{data:dataIso,plantao:plantaoPorDataGestao(dataIso),forca:forcaAtivaEscala(),filtro:"presente"},
  tabelas:Object.fromEntries(S03_TABLE_IDS.map((id)=>[id,[]])),
  horarios:{},
  cadastroHorarios:{seq:Number(matriz?.cadastroHorarios?.seq||1),registros:(Array.isArray(matriz?.horariosDefault)&&matriz.horariosDefault.length?matriz.horariosDefault:Array.isArray(matriz?.cadastroHorarios?.registros)?matriz.cadastroHorarios.registros:[]).map((r)=>({...r,atual:true,default:true,filhos:filhosStringParaObjeto(Array.isArray(r.filhos)?r.filhos:[],r.id||"")}))},
  configPostos:cloneGestao(matriz?.configPostos||[]),
  alocacoes:[],
  responsaveisVersao:2,
  responsaveis:cloneGestao(matriz?.responsaveis||[]),
  servidores:cloneGestao(matriz?.servidores||[]),
  extraRecorrentes:cloneGestao(matriz?.extraRecorrentes||[]),
  efetivoView:cloneGestao((matriz?.servidores||[]).filter((s)=>normResp(s.plantao)===plantaoPorDataGestao(dataIso))),
  responsaveisView:cloneGestao((matriz?.responsaveis||[]).filter((r)=>normResp(r.plantao)===plantaoPorDataGestao(dataIso))),
  horariosView:cloneGestao(matriz?.horariosDefault||[])
});
// TESTES: por enquanto todos os arquivos são tratados como "em andamento".
// Depois dos testes, voltar a regra: FirebaseSync.calcularStatus(dataIso)==="em_andamento".
var escalaEstaEmAndamento=(dataIso)=>{
  if(!dataIsoValida(dataIso))return true;
  if(window.FirebaseSync?.calcularStatus)return window.FirebaseSync.calcularStatus(dataIso)==="em_andamento";
  var data=dataObjIso(dataIso);
  var limite=new Date(data.getFullYear(),data.getMonth(),data.getDate());
  limite.setDate(limite.getDate()+1);
  limite.setHours(23,59,59,999);
  return Date.now()<=limite.getTime();
};
var atualizarEscalaEmAndamentoComMatriz=(estado,matriz)=>{
  // Escala aberta e historico de escala nao podem ser reidratados pela matriz-dados futura.
  return estado;
};
var estadoEscalaTemDados=()=>{
  if(dataIsoValida(document.getElementById("topoDatePicker")?.value||""))return true;
  if(normResp(document.getElementById("topoPlantaoDia")?.textContent||""))return true;
  var tabelas=snapshotTabelasEscala();
  if(tabelasEscalaTemNomes(tabelas))return true;
  return alocacoesTemNomes(sincronizarAlocacoesDadosDoDom());
};
var atualizarBotaoGravarGestao=()=>{
  var btn=document.getElementById("btnGravarTop");
  if(!btn)return;
  var bloqueadoPorLeitura=escalaEncerradaSomenteLeitura();
  var pode=!bloqueadoPorLeitura&&dataIsoValida(document.getElementById("topoDatePicker")?.value||"")&&Boolean(normResp(document.getElementById("topoPlantaoDia")?.textContent||""));
  btn.disabled=!pode&&!bloqueadoPorLeitura;
  btn.setAttribute("aria-disabled",String(!pode||bloqueadoPorLeitura));
  btn.title=bloqueadoPorLeitura?"Essa escala está encerrada. No menu OUTROS, escolha a opção EDITAR se precisar fazer alguma alteração.":"";
  btn.classList.toggle("is-disabled",!pode||bloqueadoPorLeitura);
  btn.classList.toggle("is-readonly-blocked",bloqueadoPorLeitura);
};
var aplicarBaseMatrizNaNovaEscala=async(dataIso)=>{
  bloquearAutosaveAte=Date.now()+2000;
  limparAutosaveEmergencial();
  apagarCachesAntigosRefresh();
  var matriz=await carregarMatrizDados();
  if(matriz){
    var estado=estadoEscalaFromMatriz(matriz,dataIso);
    restaurandoEstadoPagina=true;
    aplicarEstadoPagina(estado);
    restaurandoEstadoPagina=false;
  }else{
    limparPaginaNova();
  }
  setTopoGestao(dataIso);
  S03_TABLE_IDS.forEach((id)=>restaurarTabelaEscala(id,[]));
  alocacaoRows=[];
  window._alocacaoRows=alocacaoRows;
  aplicarHorariosAtuais();
  garantirHorariosVivencias();
  salvarLocalEmergencial();
};
