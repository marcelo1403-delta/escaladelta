/* Módulo extraído de js/sandbox.js original. Carregue na ordem definida no index.html. */
var popoverResponsaveisPosto=document.getElementById("popoverResponsaveisPosto");
var respFiltroForca=document.getElementById("respFiltroForca");
var respFiltroPlantao=document.getElementById("respFiltroPlantao");
var respBusca=document.getElementById("respBusca");
var respPostosBody=document.getElementById("respPostosBody");
var plantoesResp=["ALFA","BRAVO","CHARLIE","DELTA"];
var txtResp=(value)=>String(value||"").replace(/\s+/g," ").trim();
var normResp=(value)=>txtResp(value).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
var STORAGE_RESP_KEY="escalaAgent:responsaveisPosto:v2";
var _plantaoRespFallback="";
var _dataRespFallback="";
var respRows=[];
postoRows.forEach((posto)=>{
  if(posto[2]!=="ATIVO"||posto[3]!=="SIM")return;
  var forcasResponsavel=(()=>{
    var forcas=[];
    if(posto[7]==="SIM"||posto[11]==="SIM")forcas.push("PPF");
    if(posto[8]==="SIM"||posto[12]==="SIM")forcas.push("FPN");
    if(!forcas.length&&normResp(posto[1])==="CHEFE DE PLANTAO")return ["PPF","FPN"];
    if(!forcas.length&&["CHEFE ADJUNTO","ARMARIA"].includes(normResp(posto[1])))return ["PPF"];
    return forcas;
  })();
  forcasResponsavel.forEach((forca)=>{
    plantoesResp.forEach((plantao)=>{
      respRows.push({id:String(respRows.length+1).padStart(3,"0"),forca,plantao,posto:posto[1],responsavel:"",status:"ATIVO"});
    });
  });
});
var plantaoRespAtual=()=>{
  var plantaoNavbar=normResp(document.getElementById("topoPlantaoDia")?.textContent);
  return plantoesResp.includes(plantaoNavbar)?plantaoNavbar:_plantaoRespFallback;
};
var dataRespValida=()=>/^\d{4}-\d{2}-\d{2}$/.test(document.getElementById("topoDatePicker")?.value||_dataRespFallback||"");
var nomeVazioResp=(value)=>!txtResp(value)||["-","—","⊘"].includes(txtResp(value));
var chaveResp=(row)=>`${normResp(row.forca)}|${normResp(row.plantao)}|${normResp(row.posto)}`;
var snapshotResponsaveis=()=>respRows.map((row)=>({...row}));
var listaResponsaveisTemNomes=(lista)=>Array.isArray(lista)&&lista.some((row)=>txtResp(row?.responsavel));
var payloadResponsaveis=(rows=snapshotResponsaveis())=>({versao:2,salvoEm:new Date().toISOString(),rows});
var aplicarResponsaveisSalvos=(lista)=>{
  if(!Array.isArray(lista))return false;
  var savedMap=new Map();
  lista.forEach((item)=>{
    var key=chaveResp(item);
    if(key)savedMap.set(key,item);
  });
  if(!savedMap.size)return false;
  respRows.forEach((row)=>{
    var saved=savedMap.get(chaveResp(row));
    row.responsavel=saved?saved.responsavel||"":"";
  });
  return true;
};
var salvarResponsaveisDados=({permitirVazio=false}={})=>{
  try{
    var snapshot=snapshotResponsaveis();
    if(!permitirVazio&&!listaResponsaveisTemNomes(snapshot)){
      var atual=JSON.parse(localStorage.getItem(STORAGE_RESP_KEY)||"null");
      if(listaResponsaveisTemNomes(atual?.rows))return;
    }
    localStorage.setItem(STORAGE_RESP_KEY,JSON.stringify(payloadResponsaveis(snapshot)));
  }catch(err){
    console.warn("Nao foi possivel salvar responsaveis de posto",err);
  }
};
var responsaveisPodeAtualizarMatriz=()=>window._escalaAbertaStatus!=="encerrado";
var salvarResponsaveisNaMatrizTimer=null;
var salvarResponsaveisNaMatrizEmAndamento=false;
var salvarResponsaveisNaMatrizPendente=false;
var executarSalvarResponsaveisNaMatriz=async()=>{
  if(!responsaveisPodeAtualizarMatriz())return;
  if(typeof window.FirebaseSync==="undefined")return;
  if(typeof carregarMatrizDados!=="function")return;
  if(salvarResponsaveisNaMatrizEmAndamento){
    salvarResponsaveisNaMatrizPendente=true;
    return;
  }
  salvarResponsaveisNaMatrizEmAndamento=true;
  try{
    var matrizBase=await carregarMatrizDados();
    if(!matrizBase)return;
    var matriz={
      ...matrizBase,
      versao:Number(matrizBase?.versao||1),
      tipo:"matriz-dados",
      salvoEm:new Date().toISOString(),
      responsaveisVersao:2,
      responsaveis:snapshotResponsaveis().map((row)=>({...row}))
    };
    var result=await window.FirebaseSync.salvar(matriz,MATRIZ_DOC_ID,{status:"em_andamento",autosave:true,origem:"responsaveis-posto"});
    if(!result?.ok)console.warn("Falha ao atualizar responsaveis na matriz-dados",result?.msg||result);
  }catch(err){
    console.warn("Falha ao atualizar responsaveis na matriz-dados",err);
  }finally{
    salvarResponsaveisNaMatrizEmAndamento=false;
    if(salvarResponsaveisNaMatrizPendente){
      salvarResponsaveisNaMatrizPendente=false;
      agendarSalvarResponsaveisNaMatriz(1200);
    }
  }
};
var agendarSalvarResponsaveisNaMatriz=(delay=1200)=>{
  if(!responsaveisPodeAtualizarMatriz())return;
  clearTimeout(salvarResponsaveisNaMatrizTimer);
  salvarResponsaveisNaMatrizTimer=setTimeout(()=>{
    salvarResponsaveisNaMatrizTimer=null;
    executarSalvarResponsaveisNaMatriz();
  },delay);
};
var persistirAlteracaoResponsaveis=({permitirVazio=true,atualizarViews=true,atualizarCadastro=true}={})=>{
  salvarResponsaveisDados({permitirVazio});
  salvarLocalEmergencial();
  if(responsaveisPodeAtualizarMatriz()){
    agendarSalvarResponsaveisNaMatriz();
    if(typeof window.agendarAutosaveNuvemPagina==="function")window.agendarAutosaveNuvemPagina(1800);
  }
  if(atualizarViews)renderResponsaveisViews();
  if(atualizarCadastro)renderResponsaveisPostos();
};
window.persistirAlteracaoResponsaveis=persistirAlteracaoResponsaveis;
var carregarResponsaveisDados=()=>{
  try{
    var payload=JSON.parse(localStorage.getItem(STORAGE_RESP_KEY)||"null");
    if(payload?.versao!==2)return false;
    return aplicarResponsaveisSalvos(payload.rows);
  }catch(err){
    console.warn("Responsaveis de posto salvos invalidos",err);
    return false;
  }
};
var importarResponsaveisDaView=()=>{
  if(carregarResponsaveisDados())return;
};
var servidoresResp=()=>typeof window._getServidoresArray==="function"?window._getServidoresArray():[];
var nomesPresentesResponsaveis=(forca,plantao)=>{
  var nomes=[];
  servidoresResp().forEach((s)=>{
    if(normResp(s.status||"ATIVO")!=="ATIVO")return;
    if(normResp(s.forca)!==forca)return;
    if(normResp(s.motivoausencia))return;
    var nome=txtResp(s.nomecurto||s.nome);
    if(!nome)return;
    var plantaoServidor=normResp(s.plantao);
    var presenteFixo=plantaoServidor===plantao;
    var presentePermutante=plantaoServidor!==plantao&&txtResp(s.id_pgto_permuta)&&normResp(s.plantao_pgto_permuta)===plantao&&normResp(s.status_pgto||"PRESENTE")==="PRESENTE";
    var presenteExtra=plantaoServidor!==plantao&&txtResp(s.motivoapoio);
    if(presenteFixo||presentePermutante||presenteExtra)nomes.push(nome);
  });
  return [...new Set(nomes)].sort((a,b)=>a.localeCompare(b));
};
var responsavelAusenteNoPlantaoAtual=(row)=>{
  if(!row?.responsavel||typeof window._getServidoresArray!=="function")return false;
  var plantao=plantaoRespAtual();
  if(!servidoresResp().length||!dataRespValida()||!plantao)return false;
  if(row.plantao!==plantao)return false;
  return !nomesPresentesResponsaveis(row.forca,row.plantao).map(normResp).includes(normResp(row.responsavel));
};
var removerResponsaveisAusentesPlantaoAtual=()=>{
  var alterou=false;
  respRows.forEach((row)=>{
    if(!responsavelAusenteNoPlantaoAtual(row))return;
    row.responsavel="";
    alterou=true;
  });
  if(alterou)queueMicrotask(()=>{try{/* Antes: salvarResponsaveisDados({permitirVazio:true}); salvarLocalEmergencial(); */ persistirAlteracaoResponsaveis({permitirVazio:true});}catch(err){}});
  return alterou;
};
var validarResponsaveisAusentesPlantaoAtual=()=>{
  return removerResponsaveisAusentesPlantaoAtual();
};
var respSelect=(valor,row)=>{
  var nomes=nomesPresentesResponsaveis(row.forca,row.plantao);
  var opcoes=valor&&!nomes.map(normResp).includes(normResp(valor))?[valor,...nomes]:nomes;
  return `<select class="resp-responsavel-select"><option value="">-</option>${opcoes.map((nome)=>`<option value="${cfgEsc(nome)}"${normResp(nome)===normResp(valor)?" selected":""}>${cfgEsc(nome)}</option>`).join("")}</select>`;
};
var renderResponsaveisPostos=()=>{
  if(!respPostosBody)return;
  var filtroForca=normResp(respFiltroForca?.value||"PPF");
  var filtroPlantao=normResp(respFiltroPlantao?.value||"TODOS");
  var busca=normResp(respBusca?.value||"");
  var rows=respRows.filter((row)=>{
    if(filtroForca!=="TODOS"&&row.forca!==filtroForca)return false;
    if(filtroPlantao!=="TODOS"&&row.plantao!==filtroPlantao)return false;
    if(busca&&!normResp(`${row.id} ${row.forca} ${row.plantao} ${row.posto} ${row.responsavel} ${row.status}`).includes(busca))return false;
    return true;
  });
  respPostosBody.innerHTML=rows.map((row)=>`<tr data-id="${row.id}"><td>${row.id}</td><td>${row.forca}</td><td>${row.plantao}</td><td>${row.posto}</td><td>${respSelect(row.responsavel,row)}</td><td>${row.status}</td></tr>`).join("");
  respPostosBody.querySelectorAll(".resp-responsavel-select").forEach((select)=>{
    select.addEventListener("change",()=>{
      var row=respRows.find((item)=>item.id===select.closest("tr")?.dataset.id);
      if(row)row.responsavel=select.value;
      // Antes: salvarResponsaveisDados(); salvarLocalEmergencial(); renderResponsaveisViews();
      // Agora também atualiza matriz-dados e agenda autosave da escala em andamento.
      persistirAlteracaoResponsaveis({permitirVazio:true,atualizarCadastro:false});
    });
  });
  renderResponsaveisViews();
};
var respAcaoPendente=null;
var respActionHtml=(hasName)=>hasName?'<button class="resp-action-btn" data-resp-action="remove" type="button">×</button><button class="resp-action-btn" data-resp-action="move" type="button">↔</button><button class="resp-action-btn" data-resp-action="copy" type="button">⇆</button>':"";
var aplicarResponsavelNaLinha=(targetRow,nome,forca,sourceId,move,{validarPresenca=true}={})=>{
  if(!targetRow||!nome)return;
  if(targetRow.forca!==forca)return;
  if(validarPresenca&&!nomesPresentesResponsaveis(targetRow.forca,targetRow.plantao).map(normResp).includes(normResp(nome)))return;
  targetRow.responsavel=nome;
  if(move&&sourceId&&sourceId!==targetRow.id){
    var source=respRows.find((row)=>row.id===sourceId);
    if(source)source.responsavel="";
  }
  respAcaoPendente=null;
  // Antes: salvarResponsaveisDados(); salvarLocalEmergencial(); renderResponsaveisViews(); renderResponsaveisPostos();
  // Agora também atualiza matriz-dados e agenda autosave da escala em andamento.
  persistirAlteracaoResponsaveis({permitirVazio:true});
};
var postoConfigPorNome=(posto)=>postoRows.find((row)=>normResp(row[1])===normResp(posto));
var configPostoParaTabela=(posto,tableId)=>{
  var row=postoConfigPorNome(posto);
  if(!row||row[4]!=="SIM")return null;
  var noturno=tableId==="tbl-T4"||tableId==="tbl-T5";
  var tab=row[noturno?POSTO_IDX.noiteTab:POSTO_IDX.diaTab];
  if(tab!==String(tableId||"").replace(/^tbl-/,""))return null;
  return {
    row,
    tab,
    vagas:Number(row[noturno?POSTO_IDX.noiteVagas:POSTO_IDX.diaVagas]||0),
    ppf:row[noturno?POSTO_IDX.noitePpf:POSTO_IDX.diaPpf],
    fpn:row[noturno?POSTO_IDX.noiteFpn:POSTO_IDX.diaFpn]
  };
};
var vagasPosto=(posto,noturno=false,tableId="")=>{
  var id=tableId||(noturno?"tbl-T4":"tbl-T2");
  var config=configPostoParaTabela(posto,id);
  return Math.max(0,Number(config?.vagas||0));
};
var turnoTabela=(tableId)=>(tableId==="tbl-T4"||tableId==="tbl-T5")?"noturno":"diurno";
var localAlocacao=(td)=>{
  var table=td?.closest("table");
  if(!table)return "";
  if(table.id==="tbl-T2"||table.id==="tbl-T4"){
    var row=td.closest("tr");
    while(row&&!row.querySelector(".posto-cell"))row=row.previousElementSibling;
    return txtResp(row?.querySelector(".posto-cell")?.textContent);
  }
  if(table.id==="tbl-T3"||table.id==="tbl-T5"){
    var index=td.cellIndex;
    var acc=0;
    var topHeaders=Array.from(table.querySelectorAll("thead tr:first-child th"));
    for(var th of topHeaders){
      var span=Number(th.colSpan||1);
      if(index>=acc&&index<acc+span)return txtResp(th.textContent);
      acc+=span;
    }
  }
  var index=td.cellIndex;
  return txtResp(table.querySelectorAll("thead tr:last-child th")[index]?.textContent||table.querySelectorAll("thead th")[index]?.textContent);
};
var forcaPessoaEscalaPorNome=(nome)=>{
  var alvo=normResp(nome);
  if(!alvo)return "";
  var rows=Array.isArray(window._efetivoAllRows)?window._efetivoAllRows:(Array.isArray(window._efetivoRows)?window._efetivoRows:[]);
  var row=rows.find((item)=>normResp(item?.nome)===alvo||normResp(item?.nomecurto)===alvo||normResp(item?.nomeCurto)===alvo);
  return normResp(row?.forca);
};
var forcaCelulaEscala=(td)=>{
  var forca=normResp(td?.dataset?.forca);
  if(forca)return forca;
  var nome=nomeCelulaEscala(td);
  var forcaPorNome=forcaPessoaEscalaPorNome(nome);
  if(forcaPorNome)return forcaPorNome;
  var local=localAlocacao(td);
  var forcaLocal=forcaDoLocal(td?.closest("table")?.id,local);
  if(forcaLocal==="PPF"||forcaLocal==="FPN")return forcaLocal;
  return forcaAtivaEscala();
};
var colunaAlocacao=(td)=>{
  var table=td?.closest("table");
  if(!table)return -1;
  if(table.id==="tbl-T2"||table.id==="tbl-T4")return td.closest("tr")?.querySelector(".posto-cell")?td.cellIndex:td.cellIndex+1;
  return td.cellIndex;
};
var forcaPermitidaNoLocal=(tableId,local,forca)=>{
  var config=configPostoParaTabela(local,tableId);
  if(!config)return false;
  return forca==="FPN"?config.fpn==="SIM":config.ppf==="SIM";
};
var forcaDoLocal=(tableId,local)=>{
  var config=configPostoParaTabela(local,tableId);
  if(!config)return "";
  var ppf=config.ppf==="SIM";
  var fpn=config.fpn==="SIM";
  if(ppf&&fpn)return "PPF/FPN";
  if(ppf)return "PPF";
  if(fpn)return "FPN";
  return "";
};
var textoCelulaSemControlesEscala=(td)=>{
  if(!td)return "";
  var clone=td.cloneNode(true);
  clone.querySelectorAll(".s03-cell-select,.s03-cell-picker").forEach((el)=>el.remove());
  return clone.textContent;
};
var nomeCelulaEscala=(td)=>txtResp(td?.querySelector(".s03-alocado-nome")?.textContent||td?.dataset?.nomeAlocado||textoCelulaSemControlesEscala(td));
var celulaChefePosto=(td)=>{
  var tr=td?.closest("tr");
  var table=td?.closest("table");
  if(!tr||!table)return false;
  if(table.id==="tbl-T2")return tr.classList.contains("destaque-linha");
  if(table.id==="tbl-T3"){
    if(tr.parentElement?.tagName!=="TBODY"||tr.sectionRowIndex!==0)return false;
    var start=0;
    for(var th of Array.from(table.querySelectorAll("thead tr:first-child th"))){
      if(td.cellIndex===start)return true;
      start+=Number(th.colSpan||1);
    }
  }
  return false;
};
var celulaOcupadaEscala=(td)=>Boolean(nomeCelulaEscala(td));
var escResp=(value)=>txtResp(value).replace(/[&<>"]/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
var htmlAlocado=(nome)=>`<div class="s03-alocado"><span class="s03-alocado-nome">${escResp(nome)}</span><span class="s03-alocado-actions"><button type="button" data-s03-cell-action="clear" title="Limpar">⌫</button><button type="button" data-s03-cell-action="move" title="Mover">✥</button><button type="button" data-s03-cell-action="copy" title="Copiar">⧉</button></span></div>`;
var forcaAtivaEscala=()=>document.body.classList.contains("force-fpn")?"FPN":"PPF";
var bloquearDrop=(td)=>{
  td.classList.add("s03-drop-blocked");
  setTimeout(()=>td.classList.remove("s03-drop-blocked"),700);
};
var avisarForcaRestrita=(td,forca)=>{
  if(tdAvisoForca&&tdAvisoForca!==td)limparAvisoForcaRestrita(tdAvisoForca);
  tdAvisoForca=td;
  // Só captura o original se ainda não estiver em modo aviso,
  // evitando sobrescrever _s03WarnOriginal com o próprio texto de aviso
  // nas re-entradas rápidas do dragover sobre a mesma célula.
  if(!td.classList.contains("s03-force-warning")){
    td._s03WarnOriginal=td.innerHTML;
  }
  td.classList.add("s03-drop-blocked","s03-force-warning");
  td.textContent=forca?`AQUI ${forca}`:"FORCA RESTRITA";
  clearTimeout(td._s03WarnTimer);
  td._s03WarnTimer=setTimeout(()=>{
    if(tdAvisoForca===td)tdAvisoForca=null;
    limparAvisoForcaRestrita(td);
  },900);
};
var estadoDragEscala=(event)=>{
  var nome=txtResp(event.dataTransfer?.getData("text/plain"));
  var forca=normResp(event.dataTransfer?.getData("application/x-forca"));
  return {nome:nome||dragAtualEscala?.nome||"",forca:forca||dragAtualEscala?.forca||""};
};
var tdEventoEscala=(event)=>{
  var current=event.currentTarget;
  if(current?.tagName==="TD")return current;
  return event.target?.closest?.("td");
};
var nomeDuplicadoNaColuna=(table,td,nome,ignorar=null)=>{
  var coluna=colunaAlocacao(td);
  return Array.from(table.querySelectorAll("tbody td")).some((cell)=>{
    if(cell===td||cell===ignorar||cell.classList.contains("posto-cell"))return false;
    return colunaAlocacao(cell)===coluna&&normResp(nomeCelulaEscala(cell))===normResp(nome);
  });
};
