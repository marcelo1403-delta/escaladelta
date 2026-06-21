/* Módulo extraído de js/sandbox.js original. Carregue na ordem definida no index.html. */
var responsaveisAtuaisPorPosto=(forca)=>{
  var plantao=plantaoRespAtual()||"ALFA";
  var map=new Map();
  respRows.filter((row)=>row.forca===forca&&row.plantao===plantao&&row.status==="ATIVO").forEach((row)=>{
    map.set(normResp(row.posto),txtResp(row.responsavel));
  });
  return map;
};
var badgeResponsavel=(posto)=>{
  var badges={
    "CHEFE DE PLANTAO":"01",
    "CHEFE ADJUNTO":"02",
    "ARMARIA":"AR",
    "P1":"P1",
    "P2":"P2",
    "VIV. ALFA":"VA",
    "VIV. BRAVO":"VB",
    "VIV. CHARLIE":"VC",
    "VIV. DELTA":"VD",
    "IN/TR/SAU":"IS"
  };
  return badges[normResp(posto)]||"";
};
var atualizarBadgesResponsaveis=()=>{
  var plantao=plantaoRespAtual()||"ALFA";
  var map=new Map();
  respRows.filter((row)=>row.plantao===plantao&&row.status==="ATIVO"&&row.responsavel).forEach((row)=>{
    var badge=badgeResponsavel(row.posto);
    var nome=normResp(row.responsavel);
    if(!badge||!nome)return;
    var badges=map.get(nome)||[];
    if(!badges.includes(badge))badges.push(badge);
    map.set(nome,badges);
  });
  window._badgesResponsaveisEfetivo=map;
};
var linhasGrupoT2=(posto)=>{
  var table=document.getElementById("tbl-T2");
  if(!table)return [];
  var row=Array.from(table.querySelectorAll("tbody tr")).find((tr)=>normResp(tr.querySelector(".posto-cell")?.textContent)===posto);
  if(!row)return [];
  var span=Math.max(1,Number(row.querySelector(".posto-cell")?.rowSpan||1));
  var rows=[];
  var current=row;
  for(var index=0;index<span&&current;index+=1){
    rows.push(current);
    current=current.nextElementSibling;
  }
  return rows;
};
var limparAutoChefeCelula=(td)=>{
  if(!td)return false;
  var tinhaConteudo=Boolean(txtResp(td.textContent)||td.dataset.nomeAlocado||td.dataset.forca||td.dataset.s03AutoChefe);
  td.textContent="";
  delete td.dataset.nomeAlocado;
  delete td.dataset.forca;
  delete td.dataset.s03AutoChefe;
  return tinhaConteudo;
};
var nomeAutoChefeAtual=(td)=>td?.dataset.s03AutoChefe==="1"?txtResp(td.textContent):"";
var preencherLinhaT2=(posto,nome,chefesT2=new Set(),{preservarAtualSemNome=true}={})=>{
  var rows=linhasGrupoT2(posto);
  if(!rows.length)return false;
  var alterou=false;
  rows.forEach((row,rowIndex)=>{
    var cells=Array.from(row.children).filter((td)=>!td.classList.contains("posto-cell"));
    cells.forEach((td)=>{
      var texto=normResp(td.textContent);
      var autoChefe=td.dataset.s03AutoChefe==="1";
      var chefeEmCelulaComum=texto&&chefesT2.has(texto)&&!td.querySelector(".s03-alocado");
      if(rowIndex>0){
        if(autoChefe||chefeEmCelulaComum)alterou=limparAutoChefeCelula(td)||alterou;
        return;
      }
      if(!nome){
        if(autoChefe||chefeEmCelulaComum||(!preservarAtualSemNome&&txtResp(td.textContent)))alterou=limparAutoChefeCelula(td)||alterou;
        return;
      }
      if(txtResp(td.textContent)!==txtResp(nome)){td.textContent=nome;alterou=true;}
      if(td.dataset.s03AutoChefe!=="1"){td.dataset.s03AutoChefe="1";alterou=true;}
      if(td.dataset.nomeAlocado){delete td.dataset.nomeAlocado;alterou=true;}
      if(td.dataset.forca){delete td.dataset.forca;alterou=true;}
    });
  });
  return alterou;
};
var preencherVivencia=(tableId,posto,nome,responsaveisAtuais=new Set(),{preservarAtualSemNome=true}={})=>{
  var table=document.getElementById(tableId);
  var firstRow=table?.querySelector("tbody tr");
  if(!table||!firstRow)return false;
  var start=0;
  var alterou=false;
  Array.from(table.querySelectorAll("thead tr:first-child th")).some((th)=>{
    var span=Number(th.colSpan||1);
    if(normResp(th.textContent)===posto){
      Array.from({length:span},(_,offset)=>firstRow.children[start+offset]).forEach((cell,offset)=>{
        if(!cell)return;
        var texto=normResp(cell.textContent);
        var autoChefe=cell.dataset.s03AutoChefe==="1";
        var chefeEmCelulaComum=texto&&responsaveisAtuais.has(texto)&&!cell.querySelector(".s03-alocado");
        if(offset>0){
          if(autoChefe||chefeEmCelulaComum)alterou=limparAutoChefeCelula(cell)||alterou;
          return;
        }
        if(!nome){
          if(autoChefe||chefeEmCelulaComum||(!preservarAtualSemNome&&txtResp(cell.textContent)))alterou=limparAutoChefeCelula(cell)||alterou;
          return;
        }
        if(txtResp(cell.textContent)!==txtResp(nome)){cell.textContent=nome;alterou=true;}
        if(cell.dataset.s03AutoChefe!=="1"){cell.dataset.s03AutoChefe="1";alterou=true;}
        if(cell.dataset.nomeAlocado){delete cell.dataset.nomeAlocado;alterou=true;}
        if(cell.dataset.forca){delete cell.dataset.forca;alterou=true;}
      });
      Array.from(table.querySelectorAll("tbody tr")).slice(1).forEach((row)=>{
        Array.from({length:span},(_,offset)=>row.children[start+offset]).forEach((cell)=>{
          if(!cell)return;
          var texto=normResp(cell.textContent);
          var chefeEmCelulaComum=texto&&responsaveisAtuais.has(texto)&&!cell.querySelector(".s03-alocado");
          if(cell.dataset.s03AutoChefe==="1"||chefeEmCelulaComum)alterou=limparAutoChefeCelula(cell)||alterou;
        });
      });
      return true;
    }
    start+=span;
    return false;
  });
  return alterou;
};
var limparResponsaveisAntigosT5=(map)=>{
  var table=document.getElementById("tbl-T5");
  var firstRow=table?.querySelector("tbody tr");
  if(!table||!firstRow)return;
  var responsaveis=new Set(Array.from(map.values()).map(normResp).filter(Boolean));
  Array.from(firstRow.children).forEach((cell)=>{
    var nome=normResp(cell.textContent);
    if(!nome||!responsaveis.has(nome)||cell.querySelector(".s03-alocado"))return;
    cell.textContent="";
    delete cell.dataset.nomeAlocado;
    delete cell.dataset.forca;
    delete cell.dataset.s03AutoChefe;
  });
};
var limparResponsaveisViews=()=>{
  document.querySelectorAll(".resp-table tbody").forEach((tbody)=>{tbody.innerHTML="";});
  window._badgesResponsaveisEfetivo=new Map();
  ["P1","P2"].forEach((posto)=>preencherLinhaT2(posto,"",new Set(),{preservarAtualSemNome:false}));
  ["VIV. ALFA","VIV. BRAVO","VIV. CHARLIE","VIV. DELTA","IN/TR/SAU"].forEach((posto)=>preencherVivencia("tbl-T3",posto,"",new Set(),{preservarAtualSemNome:false}));
  limparResponsaveisAntigosT5(new Map());
};
var sincronizarResponsaveisEscalas=()=>{
  if(sincronizandoResponsaveisEscalas)return;
  sincronizandoResponsaveisEscalas=true;
  try{
  garantirHorariosVivencias();
  // T2 e T3 exibem os chefes/responsáveis estruturais da PPF.
  // Antes esta rotina usava a força ativa da tela; ao clicar FPN, o mapa vinha vazio
  // para P1/P2/Vivências e limpava visualmente os responsáveis dessas tabelas.
  var map=responsaveisAtuaisPorPosto("PPF");
  var responsaveisAtuais=new Set(Array.from(map.values()).map(normResp).filter(Boolean));
  var alterou=false;
  ["P1","P2"].forEach((posto)=>{alterou=preencherLinhaT2(posto,map.get(posto)||"",responsaveisAtuais,{preservarAtualSemNome:false})||alterou;});
  ["VIV. ALFA","VIV. BRAVO","VIV. CHARLIE","VIV. DELTA","IN/TR/SAU"].forEach((posto)=>{
    alterou=preencherVivencia("tbl-T3",posto,map.get(normResp(posto))||"",responsaveisAtuais,{preservarAtualSemNome:false})||alterou;
  });
  limparResponsaveisAntigosT5(map);
  if(alterou){
    salvarTabelasEscalaDados();
    salvarLocalEmergencial();
  }
  }finally{
    sincronizandoResponsaveisEscalas=false;
  }
};
var renderResponsaveisViews=()=>{
  var plantao=plantaoRespAtual();
  atualizarBadgesResponsaveis();
  document.querySelectorAll(".force-block").forEach((block)=>{
    var forca=block.classList.contains("force-fpn")?"FPN":"PPF";
    var tbody=block.querySelector(".resp-table tbody");
    if(!tbody)return;
    var rows=respRows.filter((row)=>row.forca===forca&&row.plantao===(plantao||"ALFA")&&row.status==="ATIVO");
    var podeExibirNomes=dataRespValida()&&plantao;
    tbody.innerHTML=rows.map((row)=>{
      var nome=podeExibirNomes?txtResp(row.responsavel):"";
      var nomes=podeExibirNomes?nomesPresentesResponsaveis(row.forca,row.plantao):[];
      var temNome=Boolean(nome);
      var opcoes=nome&&!nomes.map(normResp).includes(normResp(nome))?[nome,...nomes]:nomes;
      var select=podeExibirNomes
        ? `<select class="resp-inline-select${temNome?"":" empty"}"><option value="">-</option>${opcoes.map((item)=>`<option value="${cfgEsc(item)}"${normResp(item)===normResp(nome)?" selected":""}>${cfgEsc(item)}</option>`).join("")}</select>`
        : "-";
      return `<tr data-id="${row.id}" data-forca="${row.forca}"><td class="resp-role">${row.posto}</td><td class="resp-name${temNome?"":" empty"}">${select}</td><td class="resp-actions">${respActionHtml(temNome)}</td></tr>`;
    }).join("");
    tbody.querySelectorAll("tr").forEach((tr)=>{
      var row=respRows.find((item)=>item.id===tr.dataset.id);
      tr.querySelector(".resp-inline-select")?.addEventListener("change",(event)=>{
        event.stopPropagation();
        if(row)row.responsavel=event.currentTarget.value;
        respAcaoPendente=null;
        // Antes: salvarResponsaveisDados({permitirVazio:true}); salvarLocalEmergencial(); renderResponsaveisViews(); renderResponsaveisPostos();
        // Agora também atualiza matriz-dados e agenda autosave da escala em andamento.
        persistirAlteracaoResponsaveis({permitirVazio:true});
      });
      tr.addEventListener("dragover",(event)=>{event.preventDefault();tr.classList.add("resp-drop-hover");});
      tr.addEventListener("dragleave",()=>tr.classList.remove("resp-drop-hover"));
      tr.addEventListener("drop",(event)=>{
        event.preventDefault();
        tr.classList.remove("resp-drop-hover");
        var nome=event.dataTransfer.getData("text/plain");
        var forca=normResp(event.dataTransfer.getData("application/x-forca"));
        aplicarResponsavelNaLinha(row,nome,forca,"",false);
      });
      tr.addEventListener("click",(event)=>{
        if(event.target.closest(".resp-inline-select"))return;
        var action=event.target?.dataset?.respAction;
        if(action==="remove"){if(row){row.responsavel="";/* Antes: salvarResponsaveisDados(); salvarLocalEmergencial(); renderResponsaveisViews(); renderResponsaveisPostos(); */ persistirAlteracaoResponsaveis({permitirVazio:true});}return;}
        if((action==="move"||action==="copy")&&row?.responsavel){
          respAcaoPendente={nome:row.responsavel,forca:row.forca,sourceId:row.id,move:action==="move"};
          document.querySelectorAll(".resp-table tr.is-resp-source").forEach((item)=>item.classList.remove("is-resp-source"));
          tr.classList.add("is-resp-source");
          event.stopPropagation();
          return;
        }
        if(respAcaoPendente)aplicarResponsavelNaLinha(row,respAcaoPendente.nome,respAcaoPendente.forca,respAcaoPendente.sourceId,respAcaoPendente.move,{validarPresenca:false});
      });
    });
  });
  sincronizarResponsaveisEscalas();
  if(modoColunaEscala)atualizarMarcacoesColunaEscala();
  atualizarDisponibilidadeColuna();
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
};
importarResponsaveisDaView();
