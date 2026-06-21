/* Módulo extraído de js/sandbox.js original. Carregue na ordem definida no index.html. */
var POSTO_IDX={id:0,nome:1,status:2,chefia:3,visivel:4,diaTab:5,diaVagas:6,diaPpf:7,diaFpn:8,noiteTab:9,noiteVagas:10,noitePpf:11,noiteFpn:12};
var postoRowsDefault=[
["1","CHEFE DE PLANTAO","ATIVO","SIM","SIM","-","-","-","-","-","-","-","-"],
["2","CHEFE ADJUNTO","ATIVO","SIM","SIM","-","-","-","-","-","-","-","-"],
["3","ARMARIA","ATIVO","SIM","SIM","-","-","-","-","-","-","-","-"],
["4","P0","INATIVO","NAO","NAO","-","-","-","-","-","-","-","-"],
["5","P1","ATIVO","SIM","SIM","T2","5","SIM","NAO","T4","5","SIM","NAO"],
["6","P2","ATIVO","SIM","SIM","T2","3","SIM","NAO","T4","3","SIM","NAO"],
["7","T1","ATIVO","NAO","SIM","T2","1","NAO","SIM","T4","1","NAO","SIM"],
["8","T2","ATIVO","NAO","SIM","T2","1","NAO","SIM","T4","1","NAO","SIM"],
["9","T3","ATIVO","NAO","SIM","T2","1","NAO","SIM","T4","1","NAO","SIM"],
["10","T4","ATIVO","NAO","SIM","T2","1","NAO","SIM","T4","1","NAO","SIM"],
["11","VIV. ALFA","INATIVO","SIM","SIM","T3","10","SIM","NAO","T5","2","SIM","NAO"],
["12","VIV. BRAVO","ATIVO","SIM","SIM","T3","10","SIM","NAO","T5","2","SIM","NAO"],
["13","VIV. CHARLIE","ATIVO","SIM","SIM","T3","10","SIM","NAO","T5","2","SIM","NAO"],
["14","VIV. DELTA","ATIVO","SIM","SIM","T3","10","SIM","NAO","T5","2","SIM","NAO"],
["15","IN/TR/SAU","ATIVO","SIM","SIM","T3","10","SIM","NAO","T5","2","SIM","NAO"]
];
var clonarPostoRowsDefault=()=>postoRowsDefault.map((row)=>[...row]);
var postoRows=clonarPostoRowsDefault();
var makeSelect=(options,value)=>`<select>${options.map((option)=>`<option${option===value?" selected":""}>${option}</option>`).join("")}</select>`;
var makeTabSelect=(options,value)=>`<select class="cfg-tab">${options.map((option)=>`<option${option===value?" selected":""}>${option}</option>`).join("")}</select>`;
var makeVagasSelect=(value,tab)=>`<select class="cfg-vagas"${tab==="-"?" disabled":""}>${["-",...Array.from({length:12},(_,i)=>String(i+1))].map((option)=>`<option${option===String(value)?" selected":""}>${option}</option>`).join("")}</select>`;
var makePermSelect=(value,tab)=>`<select class="cfg-permitido"${tab==="-"?" disabled":""}>${["-","SIM","NAO"].map((option)=>`<option${option===value?" selected":""}>${option}</option>`).join("")}</select>`;
var renderConfigPostos=()=>{
  document.getElementById("configPostosBody").innerHTML=postoRows.map((row)=>`<tr data-id="${row[0]}" class="${row[2]==="INATIVO"?"is-inativo":""} ${row[4]==="NAO"?"is-nao-visivel":""}"><td>${row[0].padStart(2,"0")}</td><td>${row[1]}</td><td>${makeSelect(["ATIVO","INATIVO"],row[2])}</td><td>${makeSelect(["SIM","NAO"],row[3])}</td><td>${makeSelect(["SIM","NAO"],row[4])}</td><td class="posto-gap-cell"></td><td>${makeTabSelect(["-","T2","T3"],row[5])}</td><td>${makeVagasSelect(row[6],row[5])}</td><td>${makePermSelect(row[7],row[5])}</td><td>${makePermSelect(row[8],row[5])}</td><td class="posto-gap-cell"></td><td>${makeTabSelect(["-","T4","T5"],row[9])}</td><td>${makeVagasSelect(row[10],row[9])}</td><td>${makePermSelect(row[11],row[9])}</td><td>${makePermSelect(row[12],row[9])}</td></tr>`).join("");
};
renderConfigPostos();
var syncPermissaoPostosRow=(tr)=>{
  var selects=Array.from(tr.querySelectorAll("select"));
  [[3,4,5,6],[7,8,9,10]].forEach(([tabIndex,vagasIndex,ppfIndex,fpnIndex])=>{
    var tab=selects[tabIndex];
    var vagas=selects[vagasIndex];
    var ppf=selects[ppfIndex];
    var fpn=selects[fpnIndex];
    if(!tab||!vagas||!ppf||!fpn)return;
    var off=tab.value==="-";
    [vagas,ppf,fpn].forEach((select)=>{select.disabled=off;});
    if(off){
      vagas.value="-";
      ppf.value="-";
      fpn.value="-";
    }else{
      if(vagas.value==="-")vagas.value="1";
      if(ppf.value==="-")ppf.value="SIM";
      if(fpn.value==="-")fpn.value="NAO";
    }
  });
};
document.getElementById("configPostosBody")?.addEventListener("change",(event)=>{
  var tr=event.target.closest("tr");
  if(!tr)return;
  if(event.target.classList.contains("cfg-tab"))syncPermissaoPostosRow(tr);
});
var tabPostoValida=(value)=>["-","T2","T3","T4","T5"].includes(String(value||""));
var postoRowEmFormatoNovo=(row)=>tabPostoValida(row?.[5]);
var normalizarConfigPostoRow=(saved)=>{
  var base=clonarPostoRowsDefault().find((row)=>row[0]===String(saved?.[0]||""));
  if(!base)return null;
  if(Array.isArray(saved)&&postoRowEmFormatoNovo(saved)){
    var row=[...base];
    for(var index=0;index<row.length;index+=1){
      if(typeof saved[index]!=="undefined")row[index]=String(saved[index]);
    }
    [["diaTab","diaVagas","diaPpf","diaFpn"],["noiteTab","noiteVagas","noitePpf","noiteFpn"]].forEach(([tabKey,vagasKey,ppfKey,fpnKey])=>{
      var tabIndex=POSTO_IDX[tabKey];
      var vagasIndex=POSTO_IDX[vagasKey];
      var ppfIndex=POSTO_IDX[ppfKey];
      var fpnIndex=POSTO_IDX[fpnKey];
      if(row[tabIndex]==="-"){
        row[vagasIndex]="-";
        row[ppfIndex]="-";
        row[fpnIndex]="-";
      }
    });
    return row;
  }
  var row=[...base];
  if(Array.isArray(saved)){
    row[2]=String(saved[2]||row[2]);
    row[3]=String(saved[3]||row[3]);
    row[4]=String(saved[4]||row[4]);
  }
  return row;
};
var aplicarConfigPostosSalva=(lista)=>{
  if(!Array.isArray(lista))return false;
  var alterou=false;
  lista.forEach((saved)=>{
    var normalizada=normalizarConfigPostoRow(saved);
    if(!normalizada)return;
    var row=postoRows.find((item)=>item[0]===normalizada[0]);
    if(row){
      normalizada.forEach((value,index)=>{row[index]=value;});
      alterou=true;
    }
  });
  if(alterou)renderConfigPostos();
  return alterou;
};
var aplicarHorariosMatrizSalva=(matriz)=>{
  var registros=Array.isArray(matriz?.cadastroHorarios?.registros)&&matriz.cadastroHorarios.registros.length
    ? matriz.cadastroHorarios.registros
    : Array.isArray(matriz?.horariosDefault)?matriz.horariosDefault:[];
  if(!registros.length)return false;
  horariosSeq=Number(matriz?.cadastroHorarios?.seq||horariosSeq||1)||1;
  horariosRegistros=registros.map((r)=>({...r,filhos:filhosStringParaObjeto(Array.isArray(r.filhos)?r.filhos:[],r.id||"")}));
  renderConfigHorario(configHorarioAtivo);
  aplicarHorariosAtuais();
  return true;
};
var gravacaoConfigPostosEmAndamento=false;
var tabelaPostoConfigAfetada=(row,noturno=false)=>noturno?row?.[9]:row?.[5];
var configPostoTabelaMudou=(antes,depois,noturno=false)=>{
  var base=noturno?9:5;
  return [base,base+1,base+2,base+3].some((index)=>String(antes?.[index]||"")!==String(depois?.[index]||""));
};
var celulasPostoTabela=(tableId,posto)=>{
  var table=document.getElementById(tableId);
  if(!table)return [];
  return Array.from(table.querySelectorAll("tbody td:not(.posto-cell)")).filter((td)=>{
    if(celulaChefePosto?.(td))return false;
    return normResp(localAlocacao?.(td))===normResp(posto);
  });
};
var celulasAlocadasNoPostoTabela=(tableId,posto)=>celulasPostoTabela(tableId,posto).filter((td)=>Boolean(nomeCelulaEscala?.(td)));
var vagasConfigPosto=(row,noturno=false)=>{
  var valor=noturno?row?.[10]:row?.[6];
  return Math.max(0,Number(valor||0));
};
var forcasRemovidasConfigPosto=(antes,depois,noturno=false)=>{
  var base=noturno?11:7;
  return ["PPF","FPN"].filter((forca,index)=>String(antes?.[base+index]||"") === "SIM" && String(depois?.[base+index]||"") !== "SIM");
};
var forcasAdicionadasConfigPosto=(antes,depois,noturno=false)=>{
  var base=noturno?11:7;
  return ["PPF","FPN"].filter((forca,index)=>String(antes?.[base+index]||"") !== "SIM" && String(depois?.[base+index]||"") === "SIM");
};
var posicaoAlocacaoPostoTabela=(td,tableId,posto)=>celulasPostoTabela(tableId,posto).indexOf(td);
var chefesProtegidosPostoTabela=(tableId,posto)=>Array.from(document.querySelectorAll(`#${tableId} tbody td:not(.posto-cell)`)).filter((td)=>(
  celulaChefePosto?.(td)&&normResp(localAlocacao?.(td))===normResp(posto)
)).length;
var capacidadeEditavelPostoTabela=(tableId,posto,vagas)=>Math.max(0,Number(vagas||0)-chefesProtegidosPostoTabela(tableId,posto));
var confirmarPopoverConfigPostos=(mensagens)=>{
  if(!mensagens.length)return Promise.resolve(true);
  return new Promise((resolve)=>{
    var htmlMensagens=mensagens.map((msg)=>`<p style="margin:0 0 8px">${cfgEsc(msg)}</p>`).join("");
    var pop=abrirPopArquivo(`<div class="s03-clear-title">ALTERAR POSTOS</div><div class="s03-clear-msg">${htmlMensagens}<p style="margin:8px 0 0;font-weight:700">Deseja prosseguir?</p></div><div class="s03-clear-actions"><button class="s03-clear-confirm" type="button" data-act="sim">PROSSEGUIR</button><button class="s03-clear-exit" type="button" data-act="nao">CANCELAR</button></div>`);
    var finalizar=(ok)=>{pop.remove();resolve(ok);};
    pop.querySelector("[data-act='sim']")?.addEventListener("click",()=>finalizar(true));
    pop.querySelector("[data-act='nao']")?.addEventListener("click",()=>finalizar(false));
    pop.addEventListener("click",(event)=>{if(event.target===pop)resolve(false);});
  });
};
var confirmarImpactosConfigPostos=async(antesLista,depoisLista)=>{
  var antesPorId=Object.fromEntries((antesLista||[]).map((row)=>[String(row[0]),row]));
  var postosLinhas=new Set();
  var forcasImpactadas=[];
  for(var depois of depoisLista||[]){
    var antes=antesPorId[String(depois[0])];
    if(!antes)continue;
    var posto=depois[1]||antes[1];
    [false,true].forEach((noturno)=>{
      var tabAntes=tabelaPostoConfigAfetada(antes,noturno);
      var tabDepois=tabelaPostoConfigAfetada(depois,noturno);
      if(tabAntes&&tabAntes!=="-"){
        var tableAntes=`tbl-${tabAntes}`;
        var removeTabela=tabAntes!==tabDepois||String(depois[4])!=="SIM";
        if(removeTabela&&celulasAlocadasNoPostoTabela(tableAntes,posto).length){
          postosLinhas.add(posto);
        }
        if(!removeTabela&&vagasConfigPosto(depois,noturno)<vagasConfigPosto(antes,noturno)){
          var novaCapacidade=capacidadeEditavelPostoTabela(tableAntes,posto,vagasConfigPosto(depois,noturno));
          if(celulasAlocadasNoPostoTabela(tableAntes,posto).some((td)=>posicaoAlocacaoPostoTabela(td,tableAntes,posto)>=novaCapacidade)){
            postosLinhas.add(posto);
          }
        }
      }
      forcasRemovidasConfigPosto(antes,depois,noturno).forEach((forcaSai)=>{
        var tableId=`tbl-${tabDepois}`;
        var forcaChega=forcasAdicionadasConfigPosto(antes,depois,noturno)[0]||"NENHUMA";
        if(tabDepois&&tabDepois!=="-"&&celulasAlocadasNoPostoTabela(tableId,posto).some((td)=>normResp(forcaCelulaEscala?.(td))===forcaSai)){
          forcasImpactadas.push({posto,forcaSai,forcaChega});
        }
      });
    });
  }
  var mensagens=[];
  if(postosLinhas.size){
    var nomes=[...postosLinhas].join(", ");
    mensagens.push(`Existem alocações nas linhas ${nomes} que serão eliminadas.`);
  }
  for(var item of forcasImpactadas){
    mensagens.push(`Existem alocações no posto ${item.posto} que mudará de ${item.forcaSai} para ${item.forcaChega} que serão eliminadas.`);
  }
  return confirmarPopoverConfigPostos(mensagens);
};
var aplicarConfigPostos=async()=>{
  if(gravacaoConfigPostosEmAndamento)return;
  gravacaoConfigPostosEmAndamento=true;
  var postoRowsAntes=postoRows.map((row)=>[...row]);
  document.querySelectorAll("#configPostosBody tr").forEach((tr)=>{
    var row=postoRows.find((item)=>item[0]===tr.dataset.id);
    var selects=Array.from(tr.querySelectorAll("select"));
    if(!row||selects.length<11)return;
    row[2]=selects[0].value;
    row[3]=selects[1].value;
    row[4]=selects[2].value;
    row[5]=selects[3].value;
    row[6]=row[5]==="-"?"-":selects[4].value;
    row[7]=row[5]==="-"?"-":selects[5].value;
    row[8]=row[5]==="-"?"-":selects[6].value;
    if(row[5]!=="-"){
      if(row[6]==="-")row[6]="1";
      if(row[7]==="-")row[7]="SIM";
      if(row[8]==="-")row[8]="NAO";
    }
    row[9]=selects[7].value;
    row[10]=row[9]==="-"?"-":selects[8].value;
    row[11]=row[9]==="-"?"-":selects[9].value;
    row[12]=row[9]==="-"?"-":selects[10].value;
    if(row[9]!=="-"){
      if(row[10]==="-")row[10]="1";
      if(row[11]==="-")row[11]="SIM";
      if(row[12]==="-")row[12]="NAO";
    }
  });
  if(!await confirmarImpactosConfigPostos(postoRowsAntes,postoRows)){
    postoRows=postoRowsAntes;
    renderConfigPostos();
    gravacaoConfigPostosEmAndamento=false;
    return;
  }
  renderConfigPostos();
  var semConfirmarAnterior=typeof aplicarEstruturaSemConfirmar==="undefined"?false:aplicarEstruturaSemConfirmar;
  try{
    aplicarEstruturaSemConfirmar=true;
    if(!aplicarHorariosAtuais()){
      postoRows=postoRowsAntes;
      renderConfigPostos();
      gravacaoConfigPostosEmAndamento=false;
      popMsg("Operacao cancelada.");
      return;
    }
  }finally{
    aplicarEstruturaSemConfirmar=semConfirmarAnterior;
  }
  renderResponsaveisViews();
  renderResponsaveisPostos();
  atualizarDisponibilidadeColuna();
  try{
    var firebase=await aguardarFirebaseSync(4000);
    if(!firebase){
      popMsg("Configuracao dos postos aplicada nesta tela.");
      return;
    }
    var matrizBase=await carregarMatrizDados();
    if(!matrizBase){
      popMsg("Configuracao dos postos aplicada nesta tela.");
      return;
    }
    var matriz={
      ...matrizBase,
      versao:Number(matrizBase?.versao||1),
      tipo:"matriz-dados",
      salvoEm:new Date().toISOString(),
      configPostos:postoRows.map((row)=>[...row])
    };
    var result=await firebase.salvar(matriz,MATRIZ_DOC_ID,{status:"aberto"});
    if(result?.ok){
      popMsg("Configuracao dos postos gravada com sucesso na matriz-dados.");
    }else{
      popMsg(`Falha ao gravar configuracao dos postos na matriz-dados. ${result?.msg||""}`);
    }
  }catch(err){
    console.warn("Falha ao gravar configuracao dos postos",err);
    popMsg("Configuracao dos postos aplicada nesta tela.");
  }finally{
    gravacaoConfigPostosEmAndamento=false;
  }
};
btnConfigEscalas?.addEventListener("click",()=>{popoverConfigEscalas.classList.add("is-open");popoverConfigEscalas.setAttribute("aria-hidden","false");});
popoverConfigEscalas?.querySelectorAll(".config-pop-sair,.config-cancel").forEach((btn)=>btn.addEventListener("click",()=>{popoverConfigEscalas.classList.remove("is-open");popoverConfigEscalas.setAttribute("aria-hidden","true");}));
popoverConfigEscalas?.querySelectorAll(".config-tab").forEach((tab)=>tab.addEventListener("click",()=>{const target=tab.dataset.configTab;popoverConfigEscalas.querySelectorAll(".config-tab").forEach((item)=>item.classList.toggle("active",item===tab));popoverConfigEscalas.querySelectorAll(".config-tab-panel").forEach((panel)=>panel.classList.toggle("active",panel.dataset.configPanel===target));}));
var habilitarArrasteConfigPopover=()=>{
  var pop=popoverConfigEscalas;
  var header=pop?.querySelector(".config-pop-header");
  if(!pop||!header)return;
  var drag=null;
  var clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  var getPos=()=>{
    var x=Number.parseFloat(pop.style.getPropertyValue("--config-pop-x"))||0;
    var y=Number.parseFloat(pop.style.getPropertyValue("--config-pop-y"))||0;
    return {x,y};
  };
  var iniciarPosicaoAtual=()=>{
    var rect=header.getBoundingClientRect();
    pop.classList.add("is-dragged");
    pop.style.setProperty("--config-pop-x",`${Math.max(0,rect.left)}px`);
    pop.style.setProperty("--config-pop-y",`${Math.max(0,rect.top-48)}px`);
  };
  header.addEventListener("pointerdown",(event)=>{
    if(event.target.closest(".config-pop-sair"))return;
    event.preventDefault();
    iniciarPosicaoAtual();
    var pos=getPos();
    drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,x:pos.x,y:pos.y};
    pop.classList.add("is-dragging");
    header.setPointerCapture?.(event.pointerId);
  });
  header.addEventListener("pointermove",(event)=>{
    if(!drag||drag.pointerId!==event.pointerId)return;
    event.preventDefault();
    var width=header.offsetWidth||914;
    var height=header.offsetHeight||36;
    var maxX=Math.max(0,window.innerWidth-width);
    var maxY=Math.max(0,window.innerHeight-height-8-48);
    var x=clamp(drag.x+(event.clientX-drag.startX),0,maxX);
    var y=clamp(drag.y+(event.clientY-drag.startY),0,maxY);
    pop.style.setProperty("--config-pop-x",`${x}px`);
    pop.style.setProperty("--config-pop-y",`${y}px`);
  });
  var finalizar=(event)=>{
    if(!drag||drag.pointerId!==event.pointerId)return;
    header.releasePointerCapture?.(event.pointerId);
    drag=null;
    pop.classList.remove("is-dragging");
  };
  header.addEventListener("pointerup",finalizar);
  header.addEventListener("pointercancel",finalizar);
};
habilitarArrasteConfigPopover();
