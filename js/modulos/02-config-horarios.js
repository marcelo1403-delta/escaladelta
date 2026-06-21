/* Módulo extraído de js/sandbox.js original. Carregue na ordem definida no index.html. */
var cfgEsc=(value)=>String(value??"").replace(/[&<>"]/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
var configHorarioDefs={
  "postos-diurno":{titulo:"HORÁRIOS - POSTOS EXTERNOS - DIURNO",tableId:"tbl-T2",inicio:"08:00",fim:"20:00",colunas:6,grupos:6,intervalos:["08:00-10:00","10:00-12:00","12:00-14:00","14:00-16:00","16:00-18:00","18:00-20:00"]},
  "postos-noturno":{titulo:"HORÁRIOS - POSTOS EXTERNOS - NOTURNO",tableId:"tbl-T4",inicio:"20:00",fim:"08:00",colunas:8,grupos:4,intervalos:["20:00-21:30","21:30-23:00","23:00-00:30","00:30-02:00","02:00-03:30","03:30-05:00","05:00-06:30","06:30-08:00"]},
  "vivencias-diurno":{titulo:"HORÁRIOS - VIVÊNCIAS - DIURNO",tableId:"tbl-T3",inicio:"08:00",fim:"18:00",colunas:1,grupos:1,intervalos:["08:00-18:00"]},
  "vivencias-noturno":{titulo:"HORÁRIOS - VIVÊNCIAS - NOTURNO",tableId:"tbl-T5",inicio:"07:00",fim:"08:00",colunas:1,grupos:1,intervalos:["07:00-08:00"]}
};
var configHorarioAtivo="postos-diurno";
var horarioPanel=()=>popoverConfigEscalas?.querySelector("[data-config-panel='horarios']");
var horContexto=()=>configHorarioDefs[configHorarioAtivo];
var horariosRegistros=[];
var horariosSeq=1;
var minHora=(value)=>{const [h,m]=String(value||"").split(":").map(Number);return ((h||0)*60)+(m||0);};
var horaMin=(value)=>`${String(Math.floor((value%(24*60))/(60))).padStart(2,"0")}:${String(value%60).padStart(2,"0")}`;
var duracaoTurno=(ini,fim)=>{const a=minHora(ini);let b=minHora(fim);if(b<=a)b+=24*60;return b-a;};
var maskHora=(value)=>{
  var digits=String(value||"").replace(/\D/g,"").slice(0,4);
  var raw=digits.length>2?`${digits.slice(0,2)}:${digits.slice(2)}`:digits;
  if(digits.length<4)return raw;
  var h=Math.min(23,Number(digits.slice(0,2))||0);
  var m=Math.min(59,Number(digits.slice(2,4))||0);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
};
var aplicarMascaraHora=(input)=>{
  if(!input)return;
  input.value=maskHora(input.value);
};
var horaValida=(value)=>/^\d{2}:\d{2}$/.test(String(value||""))&&Number(value.slice(0,2))<24&&Number(value.slice(3,5))<60;
var horDefault=(key)=>{
  var def=configHorarioDefs[key];
  return {id:"",setor:def.titulo.includes("POSTOS")?"POSTOS EXTERNOS":"VIVENCIAS",turno:def.titulo.includes("NOTURNO")?"NOTURNO":"DIURNO",inicio:def.inicio,fim:def.fim,colunas:def.colunas,grupos:def.grupos,filhos:[]};
};
var horDefaultComFilhos=(key)=>{
  var base=horDefault(key);
  return {...base,filhos:gerarFilhosCalculados(base)};
};
var setHorFormEnabled=(enabled)=>{
  horarioPanel()?.querySelectorAll("#horInicio,#horFim,#horColunas,#horGrupos,#horFilhosBody input,#horFilhosBody select").forEach((el)=>{el.disabled=!enabled;});
  document.getElementById("horGravar").disabled=!enabled;
};
var popularHorSelects=()=>{
  var ctx=horContexto();
  var max=ctx.titulo.includes("VIVÊNCIAS - DIURNO")?2:ctx.titulo.includes("VIVÊNCIAS - NOTURNO")?1:12;
  ["horColunas","horGrupos"].forEach((id)=>{
    var el=document.getElementById(id);
    if(el)el.innerHTML=Array.from({length:max},(_,i)=>`<option>${i+1}</option>`).join("");
  });
};
var lerHorForm=()=>{
  var filhos=Array.from(document.querySelectorAll("#horFilhosBody tr")).map((tr,index)=>({
    id:String(index+1).padStart(2,"0"),
    idMae:document.getElementById("horId")?.value||"",
    grupo:tr.querySelector("select")?.value||"",
    inicio:tr.querySelectorAll("input")[0]?.value||"",
    fim:tr.querySelectorAll("input")[1]?.value||""
  }));
  var base=horDefault(configHorarioAtivo);
  return {...base,id:document.getElementById("horId")?.value||"",inicio:document.getElementById("horInicio")?.value||"",fim:document.getElementById("horFim")?.value||"",colunas:Number(document.getElementById("horColunas")?.value||0),grupos:Number(document.getElementById("horGrupos")?.value||0),filhos};
};
var gerarFilhosCalculados=(registro)=>{
  var total=Number(registro.colunas)||0;
  var grupos=Number(registro.grupos)||1;
  var intervalo=Math.round(duracaoTurno(registro.inicio,registro.fim)/(total||1));
  var inicio=minHora(registro.inicio);
  return Array.from({length:total},(_,index)=>{
    var ini=horaMin(inicio%(24*60));
    var fim=horaMin((inicio+intervalo)%(24*60));
    inicio+=intervalo;
    return {id:String(index+1).padStart(2,"0"),idMae:registro.id||"",grupo:String(Math.min(grupos,Math.floor(index/(Math.ceil(total/grupos)||1))+1)),inicio:ini,fim};
  });
};
var filhosStringParaObjeto=(filhos=[],idMae="")=>filhos.map((f,index)=>{
  if(f&&typeof f==="object")return f;
  var str=String(f||"");
  var mid=str.indexOf("-",3);
  var inicio=mid>0?str.slice(0,mid):str;
  var fim=mid>0?str.slice(mid+1):"";
  return {id:String(index+1).padStart(2,"0"),idMae,grupo:"1",inicio,fim};
});
// Complementa cadastroHorarios do estado com defaults da matriz para slots sem registro atual.
// Garante que T2-T5 nunca fiquem sem horário ao carregar escala existente.
var complementarHorariosComMatriz=(estado,matriz)=>{
  if(!matriz?.horariosDefault?.length)return estado;
  var registros=Array.isArray(estado?.cadastroHorarios?.registros)?estado.cadastroHorarios.registros:[];
  var SLOTS=[
    {setor:"POSTOS EXTERNOS",turno:"DIURNO"},
    {setor:"POSTOS EXTERNOS",turno:"NOTURNO"},
    {setor:"VIVENCIAS",turno:"DIURNO"},
    {setor:"VIVENCIAS",turno:"NOTURNO"}
  ];
  var complementos=[];
  SLOTS.forEach((slot)=>{
    var temAtual=registros.some((r)=>r.atual&&normResp(r.setor)===slot.setor&&normResp(r.turno)===slot.turno);
    if(temAtual)return;
    var def=matriz.horariosDefault.find((h)=>normResp(h.setor)===slot.setor&&normResp(h.turno)===slot.turno);
    if(!def)return;
    complementos.push({...def,atual:true,default:true,filhos:filhosStringParaObjeto(Array.isArray(def.filhos)?def.filhos:[],def.id||"")});
  });
  if(!complementos.length)return estado;
  return {...estado,cadastroHorarios:{seq:Number(estado?.cadastroHorarios?.seq||1),registros:[...registros,...complementos]}};
};
var renderHorFilhos=(registro,enabled=false,usarFilhosExistentes=false)=>{
  var tbody=document.getElementById("horFilhosBody");
  if(!tbody)return;
  var total=Number(registro.colunas)||0;
  var grupos=Number(registro.grupos)||1;
  var intervalo=Math.round(duracaoTurno(registro.inicio,registro.fim)/(total||1));
  document.getElementById("horRendicao").textContent=`Intervalo de rendição: ${horaMin(intervalo)}`;
  var calculados=gerarFilhosCalculados(registro);
  tbody.innerHTML=Array.from({length:total},(_,index)=>{
    var filho=usarFilhosExistentes&&registro.filhos?.[index]?registro.filhos[index]:calculados[index];
    var ini=filho.inicio;
    var fim=filho.fim;
    var grupoDefault=filho.grupo;
    var options=Array.from({length:grupos},(_,i)=>`<option${String(filho.grupo||grupoDefault)===String(i+1)?" selected":""}>${i+1}</option>`).join("");
    var grupoIndex=Math.max(0,Number(filho.grupo||grupoDefault||1)-1);
    var zebra=grupoIndex%2===0?"hor-grupo-a":"hor-grupo-b";
    return `<tr class="${zebra}" data-grupo="${cfgEsc(filho.grupo||grupoDefault||"")}"><td>${String(index+1).padStart(2,"0")}</td><td><select ${enabled?"":"disabled"}>${options}</select></td><td><input class="hor-time-input" type="text" maxlength="5" inputmode="numeric" value="${cfgEsc(ini)}" ${enabled?"":"disabled"}></td><td><input class="hor-time-input" type="text" maxlength="5" inputmode="numeric" value="${cfgEsc(fim)}" ${enabled?"":"disabled"}></td></tr>`;
  }).join("");
};
var atualizarZebraHorFilhos=()=>{
  document.querySelectorAll("#horFilhosBody tr").forEach((tr)=>{
    var grupo=Number(tr.querySelector("select")?.value||1);
    tr.dataset.grupo=String(grupo||"");
    tr.classList.toggle("hor-grupo-a",(Math.max(1,grupo)-1)%2===0);
    tr.classList.toggle("hor-grupo-b",(Math.max(1,grupo)-1)%2!==0);
  });
};
var preencherHorForm=(registro,enabled=false)=>{
  popularHorSelects();
  document.getElementById("horId").value=registro.id||"";
  document.getElementById("horInicio").value=registro.inicio||"";
  document.getElementById("horFim").value=registro.fim||"";
  document.getElementById("horColunas").value=String(registro.colunas||1);
  document.getElementById("horGrupos").value=String(registro.grupos||1);
  renderHorFilhos(registro,enabled,Boolean(registro.id));
  setHorFormEnabled(enabled);
  document.getElementById("horRemover").disabled=!(enabled&&registro.id);
};
var limparHorForm=()=>{
  var base=horDefault(configHorarioAtivo);
  popularHorSelects();
  document.getElementById("horId").value="";
  document.getElementById("horInicio").value="";
  document.getElementById("horInicio").placeholder=base.inicio;
  document.getElementById("horFim").value="";
  document.getElementById("horFim").placeholder=base.fim;
  document.getElementById("horColunas").value=String(base.colunas);
  document.getElementById("horGrupos").value=String(base.grupos);
  document.getElementById("horRendicao").textContent="Intervalo de rendição: -";
  document.getElementById("horFilhosBody").innerHTML="";
  setHorFormEnabled(false);
  document.getElementById("horRemover").disabled=true;
};
var registrosContexto=()=>{const base=horDefault(configHorarioAtivo);return horariosRegistros.filter((r)=>r.setor===base.setor&&r.turno===base.turno);};
var horarioAtualContexto=()=>registrosContexto().find((r)=>r.atual)||registrosContexto()[0]||null;
var marcarHorMaeSelecionada=(id)=>{
  document.querySelectorAll("#horMaeBody tr").forEach((row)=>row.classList.toggle("is-selected",Boolean(id)&&row.dataset.id===id));
};
var renderHorMae=()=>{
  var tbody=document.getElementById("horMaeBody");
  if(!tbody)return;
  tbody.innerHTML=registrosContexto().map((r)=>`<tr data-id="${r.id}"><td><input type="radio" name="horAtual-${r.setor}-${r.turno}" ${r.atual?"checked":""}></td><td>${r.id}</td><td>${r.setor}</td><td>${r.turno}</td><td>${r.grupos}</td><td>${r.inicio}</td><td>${r.fim}</td></tr>`).join("");
};
var ultimoBloqueioEstruturaEscala="";
var aplicarEstruturaSemConfirmar=false;
var aplicarHorariosAtuais=()=>{
  ultimoBloqueioEstruturaEscala="";
  for(var key of ["postos-diurno","postos-noturno","vivencias-diurno","vivencias-noturno"]){
    var base=horDefault(key);
    var atual=horariosRegistros.find((r)=>r.atual&&r.setor===base.setor&&r.turno===base.turno);
    if(!aplicarHorarioAtual(atual||horDefaultComFilhos(key),{dryRun:true}))return false;
  }
  aplicarEstruturaSemConfirmar=true;
  try{
    for(var key of ["postos-diurno","postos-noturno","vivencias-diurno","vivencias-noturno"]){
      var base=horDefault(key);
      var atual=horariosRegistros.find((r)=>r.atual&&r.setor===base.setor&&r.turno===base.turno);
      if(!aplicarHorarioAtual(atual||horDefaultComFilhos(key)))return false;
    }
  }finally{
    aplicarEstruturaSemConfirmar=false;
  }
  return true;
};
var keyHorarioRegistro=(registro)=>{
  var setor=normResp(registro.setor);
  var turno=normResp(registro.turno);
  if(setor==="POSTOS EXTERNOS"&&turno==="DIURNO")return "postos-diurno";
  if(setor==="POSTOS EXTERNOS"&&turno==="NOTURNO")return "postos-noturno";
  if(setor==="VIVENCIAS"&&turno==="DIURNO")return "vivencias-diurno";
  if(setor==="VIVENCIAS"&&turno==="NOTURNO")return "vivencias-noturno";
  return configHorarioAtivo;
};
var labelsHorarioRegistro=(registro)=>registro.filhos.map((f)=>f.fim?`${f.inicio}-${f.fim}`:f.inicio);
var horarioVivenciaPadrao=(tableId)=>tableId==="tbl-T5"?"07:00-08:00":"08:00-18:00";
var garantirLinhaHorariosVivencias=(tableId,labels=[])=>{
  var table=document.getElementById(tableId);
  if(!table?.tHead)return;
  var postos=Array.from(table.tHead.rows[0]?.children||[]);
  if(!postos.length)return;
  var total=Array.from(postos).reduce((sum,th)=>sum+Math.max(1,Number(th.colSpan||1)),0);
  var valores=Array.from({length:total},(_,index)=>labels[index]||labels[index%Math.max(1,labels.length)]||horarioVivenciaPadrao(tableId));
  var row=table.tHead.rows[1];
  if(!row)row=table.tHead.insertRow(1);
  if(row.children.length!==total){
    row.innerHTML=valores.map((label,index)=>`<th class="${index%2===0?"s03-zebra-a":"s03-zebra-b"}">${cfgEsc(label)}</th>`).join("");
  }else{
    Array.from(row.children).forEach((th,index)=>{th.textContent=valores[index]||"";});
  }
};
var garantirHorariosVivencias=()=>{
  garantirLinhaHorariosVivencias("tbl-T3");
  garantirLinhaHorariosVivencias("tbl-T5");
};
var gruposHorarioRegistro=(registro)=>{
  var grupos=[];
  registro.filhos.forEach((filho,index)=>{
    var grupo=String(filho.grupo||"1");
    var label=filho.fim?`${filho.inicio}-${filho.fim}`:filho.inicio;
    var atual=grupos[grupos.length-1];
    if(!atual||atual.grupo!==grupo){
      atual={grupo,indices:[],inicio:filho.inicio,fim:filho.fim,label};
      grupos.push(atual);
    }
    atual.indices.push(index);
    atual.fim=filho.fim;
    atual.label=`${atual.inicio}-${atual.fim}`;
  });
  return grupos;
};
var limparTabelaHtml=(table)=>{
  table.querySelectorAll("tbody td:not(.posto-cell)").forEach((td)=>{
    td.className=td.className.replace(/\bs03-\S+/g,"").trim();
    limparCelulaEscala(td);
  });
};
var snapshotVivencias=(table)=>{
  var map=new Map();
  if(!table)return map;
  table.querySelectorAll("tbody td").forEach((td)=>{
    var local=localAlocacao(td);
    if(!local)return;
    var row=td.parentElement.sectionRowIndex;
    var offset=offsetVivenciaLocal(td);
    if(offset<0)return;
    if(!map.has(local))map.set(local,new Map());
    var rowMap=map.get(local);
    if(!rowMap.has(row))rowMap.set(row,new Map());
    var offsetMap=rowMap.get(row);
    var nome=nomeCelulaEscala(td);
    if(td.dataset.s03AutoChefe==="1")return;
    if(nome&&!offsetMap.has(offset))offsetMap.set(offset,{nome,forca:td.dataset.forca||forcaCelulaEscala(td),html:td.innerHTML});
  });
  return map;
};
var snapshotPostosExternos=(table)=>{
  var map=new Map();
  if(!table)return map;
  table.querySelectorAll("tbody td:not(.posto-cell)").forEach((td)=>{
    var local=localAlocacao(td);
    var coluna=colunaAlocacao(td);
    var nome=nomeCelulaEscala(td);
    if(!local||coluna<0||!nome||td.dataset.s03AutoChefe==="1")return;
    var chave=`${normResp(local)}|${coluna}`;
    if(!map.has(chave))map.set(chave,[]);
    var pos=Array.from(table.querySelectorAll("tbody td:not(.posto-cell)")).filter((cell)=>(
      !celulaChefePosto(cell)&&normResp(localAlocacao(cell))===normResp(local)&&colunaAlocacao(cell)===coluna
    )).indexOf(td);
    map.get(chave)[pos]={nome,forca:td.dataset.forca||forcaCelulaEscala(td),html:td.innerHTML};
  });
  return map;
};
var restaurarSnapshotPostosExternos=(table,snapshot)=>{
  if(!table||!snapshot)return;
  var usados=new Map();
  table.querySelectorAll("tbody td:not(.posto-cell)").forEach((td)=>{
    var local=localAlocacao(td);
    var coluna=colunaAlocacao(td);
    if(!local||coluna<0||td.classList.contains("s03-posto-inativo")||celulaChefePosto(td))return;
    var chave=`${normResp(local)}|${coluna}`;
    var index=usados.get(chave)||0;
    var item=snapshot.get(chave)?.[index];
    usados.set(chave,index+1);
    if(!item)return;
    if(!forcaPermitidaNoLocal(table.id,local,item.forca))return;
    td.innerHTML=item.html||htmlAlocado(item.nome);
    td.dataset.nomeAlocado=item.nome;
    td.dataset.forca=item.forca;
  });
};
var nomesUnicosLista=(lista)=>[...new Set(lista.map((item)=>String(item||"").trim()).filter(Boolean))].join(", ");
var confirmarEliminacaoHorarios=(colunas)=>{
  var nomes=nomesUnicosLista(colunas);
  return !nomes||aplicarEstruturaSemConfirmar||window.confirm(`Existem alocações na colunas [${nomes}] que serão eliminadas, deseja prosseguir?`);
};
var colunasPostosExternosEliminadas=(table,colCount)=>{
  var colunas=[];
  var labels=Array.from(table.querySelectorAll("thead tr:last-child th")).map((th)=>th.textContent.trim());
  table.querySelectorAll("tbody td:not(.posto-cell)").forEach((td)=>{
    if(celulaChefePosto(td))return;
    var nome=nomeCelulaEscala(td);
    if(!nome)return;
    var coluna=colunaAlocacao(td);
    if(coluna<1||coluna>colCount)colunas.push(labels[coluna-1]||`COLUNA ${coluna}`);
  });
  return colunas;
};
var offsetVivenciaLocal=(td)=>{
  var table=td?.closest("table");
  var local=normResp(localAlocacao(td));
  var acc=0;
  for(var th of Array.from(table?.querySelectorAll("thead tr:first-child th")||[])){
    var span=Number(th.colSpan||1);
    if(normResp(th.textContent)===local)return td.cellIndex-acc;
    acc+=span;
  }
  return -1;
};
var colunasVivenciasEliminadas=(table,postos,perPosto)=>{
  var ativos=new Set(postos.map(normResp));
  var colunas=[];
  table.querySelectorAll("tbody td").forEach((td)=>{
    if(celulaChefePosto(td))return;
    var nome=nomeCelulaEscala(td);
    if(!nome)return;
    var local=normResp(localAlocacao(td));
    var offset=offsetVivenciaLocal(td);
    if(!ativos.has(local)||offset<0||offset>=perPosto)colunas.push(`${local} ${offset>=0?offset+1:""}`.trim());
  });
  return colunas;
};
var restaurarSnapshotVivencias=(table,snapshot)=>{
  table.querySelectorAll("tbody td").forEach((td)=>{
    var local=localAlocacao(td);
    var row=td.parentElement.sectionRowIndex;
    var offset=offsetVivenciaLocal(td);
    var item=snapshot.get(local)?.get(row)?.get(offset);
    if(item){
      if(!forcaPermitidaNoLocal(table.id,local,item.forca))return;
      td.innerHTML=item.html||htmlAlocado(item.nome);
      td.dataset.nomeAlocado=item.nome;
      td.dataset.forca=item.forca;
    }
  });
};
var rebuildPostosExternos=(registro,noturno=false,{dryRun=false}={})=>{
  var table=document.getElementById(noturno?"tbl-T4":"tbl-T2");
  if(!table)return;
  var snapshot=snapshotPostosExternos(table);
  var labels=labelsHorarioRegistro(registro);
  var colCount=labels.length;
  var grupos=gruposHorarioRegistro(registro);
  var zebraByCol=[];
  grupos.forEach((grupo,groupIndex)=>grupo.indices.forEach((index)=>{zebraByCol[index]=groupIndex%2===0?"s03-zebra-a":"s03-zebra-b";}));
  var rowCells=()=>Array.from({length:colCount},(_,index)=>`<td class="${zebraByCol[index]||"s03-zebra-a"}"></td>`).join("");
  var tableId=noturno?"tbl-T4":"tbl-T2";
  var groups=[
    {label:"P1",rows:vagasPosto("P1",noturno,tableId),chefe:!noturno},
    {label:"P2",rows:vagasPosto("P2",noturno,tableId),chefe:!noturno},
    {label:"T1",rows:vagasPosto("T1",noturno,tableId)},
    {label:"T2",rows:vagasPosto("T2",noturno,tableId)},
    {label:"T3",rows:vagasPosto("T3",noturno,tableId)},
    {label:"T4",rows:vagasPosto("T4",noturno,tableId)}
  ].filter((group)=>group.rows>0);
  var colunasEliminadas=colunasPostosExternosEliminadas(table,colCount);
  if(colunasEliminadas.length&&!confirmarEliminacaoHorarios(colunasEliminadas))return false;
  if(dryRun)return true;
  table.querySelector("colgroup").innerHTML=`<col class="${noturno?"t4":"t2"}-col-posto"/>${Array.from({length:colCount},(_,i)=>`<col class="${noturno?`t4-zebra-${zebraByCol[i]==="s03-zebra-b"?"b":"a"}`:"t2-col-slot"} ${zebraByCol[i]||"s03-zebra-a"}"/>`).join("")}`;
  if(noturno){
    table.querySelector("thead").innerHTML=`<tr class="t4-head-grupos"><th class="t4-th-posto" rowspan="2">POSTO</th>${grupos.map((g,index)=>`<th class="${index%2===0?"s03-zebra-a":"s03-zebra-b"}" colspan="${g.indices.length}">${cfgEsc(g.label)}</th>`).join("")}</tr><tr class="t4-head-slots">${labels.map((label,index)=>`<th class="${zebraByCol[index]||"s03-zebra-a"}">${cfgEsc(label)}</th>`).join("")}</tr>`;
  }else{
    table.querySelector("thead").innerHTML=`<tr class="t2-head-grupos"><th class="t2-th-posto" rowspan="2">POSTO</th><th class="s03-zebra-a" colspan="${colCount}">${cfgEsc(`${registro.inicio}-${registro.fim}`)}</th></tr><tr class="t2-head-slots">${labels.map((label,index)=>`<th class="${zebraByCol[index]||"s03-zebra-a"}">${cfgEsc(label)}</th>`).join("")}</tr>`;
  }
  table.querySelector("tbody").innerHTML=groups.map((group)=>{
    var postoIndex=["T1","T2","T3","T4"].indexOf(group.label);
    var postoClass=postoIndex>=0?` posto-faixa posto-${group.label.toLowerCase()} posto-faixa-${postoIndex%2===0?"a":"b"}`:"";
    var first=`<tr class="grupo-start${group.chefe?" destaque-linha":""}${postoClass}"><td class="posto-cell"${group.rows>1?` rowspan="${group.rows}"`:""}>${group.label}</td>${rowCells()}</tr>`;
    return first+Array.from({length:group.rows-1},()=>`<tr${postoClass?` class="${postoClass.trim()}"`:""}>${rowCells()}</tr>`).join("");
  }).join("");
  restaurarSnapshotPostosExternos(table,snapshot);
  return true;
};
var rebuildVivencias=(registro,noturno=false,{dryRun=false}={})=>{
  var table=document.getElementById(noturno?"tbl-T5":"tbl-T3");
  if(!table)return;
  var snapshot=snapshotVivencias(table);
  var tableId=noturno?"tbl-T5":"tbl-T3";
  var postos=["VIV. ALFA","VIV. BRAVO","VIV. CHARLIE","VIV. DELTA","IN/TR/SAU"].filter((posto)=>vagasPosto(posto,noturno,tableId)>0);
  if(!postos.length){
    var colunasEliminadas=colunasVivenciasEliminadas(table,[],1);
    if(colunasEliminadas.length&&!confirmarEliminacaoHorarios(colunasEliminadas))return false;
    if(dryRun)return true;
    table.querySelector("tbody").innerHTML="";
    return true;
  }
  var labels=labelsHorarioRegistro(registro);
  var perPosto=Math.max(1,Math.min(2,Number(registro.colunas)||1));
  var total=postos.length*perPosto;
  var colunasEliminadas=colunasVivenciasEliminadas(table,postos,perPosto);
  if(colunasEliminadas.length&&!confirmarEliminacaoHorarios(colunasEliminadas))return false;
  if(dryRun)return true;
  var zebraByCol=Array.from({length:total},(_,index)=>Math.floor(index/perPosto)%2===0?"s03-zebra-a":"s03-zebra-b");
  table.querySelector("colgroup").innerHTML=Array.from({length:total},(_,index)=>`<col class="${zebraByCol[index]}"/>`).join("");
  table.querySelector("thead").innerHTML=`<tr>${postos.map((posto,index)=>`<th class="${index%2===0?"s03-zebra-a":"s03-zebra-b"}" colspan="${perPosto}">${cfgEsc(posto)}</th>`).join("")}</tr><tr>${postos.map((_,postoIndex)=>labels.slice(0,perPosto).map((label,offset)=>`<th class="${zebraByCol[(postoIndex*perPosto)+offset]}">${cfgEsc(label||"")}</th>`).join("")).join("")}</tr>`;
  var row=()=>`<tr>${Array.from({length:total},()=>"<td></td>").join("")}</tr>`;
  var rows=Math.max(...postos.map((posto)=>vagasPosto(posto,noturno,tableId)));
  table.querySelector("tbody").innerHTML=Array.from({length:rows},(_,index)=>`<tr${index===0?' class="destaque-linha"':""}>${Array.from({length:total},(_,col)=>{
    var posto=postos[Math.floor(col/perPosto)];
    var inativa=index>=vagasPosto(posto,noturno,tableId);
    return `<td class="${zebraByCol[col]}${inativa?" s03-posto-inativo":""}"></td>`;
  }).join("")}</tr>`).join("");
  garantirLinhaHorariosVivencias(table.id,postos.flatMap(()=>labels.slice(0,perPosto)));
  restaurarSnapshotVivencias(table,snapshot);
  return true;
};
var renderConfigHorario=(key=configHorarioAtivo)=>{
  var panel=horarioPanel();
  var def=configHorarioDefs[key];
  if(!panel||!def)return;
  configHorarioAtivo=key;
  panel.querySelectorAll(".config-menu-link").forEach((btn)=>btn.classList.toggle("active",btn.dataset.horarioConfig===key));
  panel.querySelector(".config-content-banner").textContent=def.titulo;
  limparHorForm();
  renderHorMae();
  var atual=horarioAtualContexto();
  if(atual){
    preencherHorForm(atual,true);
    marcarHorMaeSelecionada(atual.id);
  }
};
var aplicarHorarioAtual=(registro,{dryRun=false}={})=>{
  var def=configHorarioDefs[keyHorarioRegistro(registro)];
  var ok=true;
  if(def.tableId==="tbl-T2")ok=rebuildPostosExternos(registro,false,{dryRun});
  else if(def.tableId==="tbl-T4")ok=rebuildPostosExternos(registro,true,{dryRun});
  else if(def.tableId==="tbl-T3")ok=rebuildVivencias(registro,false,{dryRun});
  else if(def.tableId==="tbl-T5")ok=rebuildVivencias(registro,true,{dryRun});
  if(ok===false)return false;
  if(dryRun)return true;
  def.inicio=registro.inicio;
  def.fim=registro.fim;
  def.colunas=Number(registro.colunas)||def.colunas;
  def.grupos=Number(registro.grupos)||def.grupos;
  def.intervalos=labelsHorarioRegistro(registro);
  renderResponsaveisViews();
  if(modoColunaEscala)atualizarMarcacoesColunaEscala();
  if(typeof setupAlocacaoEscalas==="function")setupAlocacaoEscalas();
  observarTabelasEscala();
  if(typeof atualizarDisponibilidadeColuna==="function")atualizarDisponibilidadeColuna();
  return true;
};
var popMsg=(msg)=>{const p=abrirPopArquivo(`<div class="s03-clear-title">AVISO</div><div class="s03-clear-msg">${cfgEsc(msg)}</div><div class="s03-clear-actions"><button class="s03-clear-exit" type="button">SAIR</button></div>`);p.querySelector("button").addEventListener("click",()=>p.remove());};
var pedirCodigoPopover=(onOk)=>{
  var p=abrirPopArquivo(`<div class="s03-clear-title">CÓDIGO DE SEGURANÇA</div><div class="s03-clear-msg"><input id="horCodigoSeg" type="password" maxlength="10" style="width:160px;height:24px;text-align:center"></div><div class="s03-clear-actions"><button class="s03-clear-confirm" type="button">CONFIRMAR</button><button class="s03-clear-exit" type="button">SAIR</button></div>`);
  var input=p.querySelector("#horCodigoSeg");
  var confirmar=()=>{if(input.value==="2009"){p.remove();onOk();}else{input.value="";input.placeholder="CODIGO INCORRETO";}};
  p.querySelector(".s03-clear-confirm").addEventListener("click",confirmar);
  p.querySelector(".s03-clear-exit").addEventListener("click",()=>p.remove());
  input.addEventListener("keydown",(event)=>{if(event.key==="Enter")confirmar();});
  setTimeout(()=>input.focus(),30);
};
var cloneHorarioMatriz=(registro)=>({
  ...registro,
  filhos:Array.isArray(registro.filhos)?registro.filhos.map((filho)=>typeof filho==="object"?{...filho}:filho):[]
});
var salvarHorariosMatrizDados=async()=>{
  var firebase=await aguardarFirebaseSync(4000);
  if(!firebase)return {ok:false,msg:""};
  var matrizBase=await carregarMatrizDados();
  if(!matrizBase)return {ok:false,msg:""};
  var registros=horariosRegistros.map(cloneHorarioMatriz);
  var matriz={
    ...matrizBase,
    versao:Number(matrizBase?.versao||1),
    tipo:"matriz-dados",
    salvoEm:new Date().toISOString(),
    cadastroHorarios:{
      seq:horariosSeq,
      registros
    },
    horariosDefault:registros.filter((registro)=>registro.atual).map(cloneHorarioMatriz)
  };
  try{
    var result=await firebase.salvar(matriz,MATRIZ_DOC_ID,{status:"aberto"});
    return result?.ok?{ok:true}:{ok:false,msg:""};
  }catch(err){
    console.warn("Falha ao gravar horarios na matriz-dados",err);
    return {ok:false,msg:""};
  }
};
var gravarHorario=async()=>{
  var r=lerHorForm();
  if(!horaValida(r.inicio)){popMsg("Preencha o campo Início do turno com um horário válido (HH:MM).");return;}
  if(!horaValida(r.fim)){popMsg("Preencha o campo Fim do turno com um horário válido (HH:MM).");return;}
  if(!r.colunas||r.colunas<1){popMsg("Selecione o Nº de colunas.");return;}
  if(!r.grupos||r.grupos<1){popMsg("Selecione o Nº de grupos.");return;}
  if(r.grupos>r.colunas){popMsg(`Nº de grupos (${r.grupos}) não pode ser maior que Nº de colunas (${r.colunas}).`);return;}
  if(!r.filhos.length){popMsg("A tabela de intervalos está vazia. Ajuste as colunas para gerar os intervalos.");return;}
  for(var [index,filho] of r.filhos.entries()){
    if(!filho.grupo){popMsg(`O campo GRUPO linha ${String(index+1).padStart(2,"0")} está vazio, preencha para prosseguir.`);return;}
    if(!horaValida(filho.inicio)){popMsg(`O campo H. INICIO linha ${String(index+1).padStart(2,"0")} está vazio, preencha para prosseguir.`);return;}
    if(!horaValida(filho.fim)){popMsg(`O campo H.FIM linha ${String(index+1).padStart(2,"0")} está vazio, preencha para prosseguir.`);return;}
  }
  if(horariosRegistros.some((item)=>item.id!==r.id&&item.setor===r.setor&&item.turno===r.turno&&item.inicio===r.inicio&&item.fim===r.fim&&item.colunas===r.colunas&&item.grupos===r.grupos&&JSON.stringify(item.filhos)===JSON.stringify(r.filhos))){
    popMsg("Esse horario já existe!");
    return;
  }
  var novo=!r.id;
  var anteriores=horariosRegistros.map((item)=>({...item,filhos:Array.isArray(item.filhos)?item.filhos.map((filho)=>({...filho})):[]}));
  var seqAnterior=horariosSeq;
  if(novo)r.id=String(horariosSeq++).padStart(3,"0");
  var index=horariosRegistros.findIndex((item)=>item.id===r.id);
  if(index>=0)r.atual=Boolean(horariosRegistros[index].atual);
  else r.atual=!registrosContexto().some((item)=>item.atual);
  if(index>=0)horariosRegistros[index]=r;else horariosRegistros.push(r);
  if(!aplicarHorariosAtuais()){
    horariosRegistros=anteriores;
    horariosSeq=seqAnterior;
    popMsg("Operacao cancelada.");
    return;
  }
  renderConfigHorario(configHorarioAtivo);
  var result=await salvarHorariosMatrizDados();
  if(result.ok)popMsg(`Horario ${novo?"criado":"alterado"} com sucesso e gravado na matriz-dados.`);
  else popMsg(`Horario ${novo?"criado":"alterado"} nesta tela.`);
};
var removerHorario=()=>{
  var id=document.getElementById("horId")?.value;
  if(!id)return;
  var p=abrirPopArquivo(`<div class="s03-clear-title">REMOVER</div><div class="s03-clear-msg">Confirma a exclusao desse horário?</div><div class="s03-clear-actions"><button class="s03-clear-confirm" type="button">CONFIRMAR</button><button class="s03-clear-exit" type="button">SAIR</button></div>`);
  p.querySelector(".s03-clear-confirm").addEventListener("click",()=>{
    p.remove();
    pedirCodigoPopover(async()=>{
      var anteriores=horariosRegistros.map((item)=>({...item,filhos:Array.isArray(item.filhos)?item.filhos.map((filho)=>({...filho})):[]}));
      horariosRegistros=horariosRegistros.filter((item)=>item.id!==id);
      if(!aplicarHorariosAtuais()){
        horariosRegistros=anteriores;
        popMsg("Operacao cancelada.");
        return;
      }
      renderConfigHorario(configHorarioAtivo);
      var result=await salvarHorariosMatrizDados();
      if(result.ok)popMsg("Horario excluido com sucesso e matriz-dados atualizada.");
      else popMsg("Horario excluido nesta tela.");
    });
  });
  p.querySelector(".s03-clear-exit").addEventListener("click",()=>p.remove());
};
popoverConfigEscalas?.querySelectorAll("[data-horario-config]").forEach((btn)=>btn.addEventListener("click",()=>renderConfigHorario(btn.dataset.horarioConfig)));
document.getElementById("horNovo")?.addEventListener("click",()=>preencherHorForm(horDefaultComFilhos(configHorarioAtivo),true));
document.getElementById("horGravar")?.addEventListener("click",gravarHorario);
document.getElementById("horRemover")?.addEventListener("click",removerHorario);
popoverConfigEscalas?.querySelector("[data-config-panel='postos'] .config-save")?.addEventListener("click",aplicarConfigPostos);
["horInicio","horFim","horColunas","horGrupos"].forEach((id)=>{
  var el=document.getElementById(id);
  el?.addEventListener("input",()=>{
    if(id==="horInicio"||id==="horFim")aplicarMascaraHora(el);
    renderHorFilhos({...lerHorForm(),filhos:[]},true,false);
  });
  el?.addEventListener("change",()=>{
    if(id==="horInicio"||id==="horFim")aplicarMascaraHora(el);
    renderHorFilhos({...lerHorForm(),filhos:[]},true,false);
  });
});
document.getElementById("horFilhosBody")?.addEventListener("input",(event)=>{
  if(event.target.matches(".hor-time-input"))aplicarMascaraHora(event.target);
});
document.getElementById("horFilhosBody")?.addEventListener("change",(event)=>{
  if(event.target.matches(".hor-time-input"))aplicarMascaraHora(event.target);
  if(event.target.matches("select"))atualizarZebraHorFilhos();
});
document.getElementById("horMaeBody")?.addEventListener("click",(event)=>{
  var tr=event.target.closest("tr");
  if(!tr)return;
  var r=horariosRegistros.find((item)=>item.id===tr.dataset.id);
  if(!r)return;
  if(event.target.type==="radio"){
    var anteriores=horariosRegistros.map((item)=>({...item,filhos:Array.isArray(item.filhos)?item.filhos.map((filho)=>({...filho})):[]}));
    registrosContexto().forEach((item)=>{item.atual=item.id===r.id;});
    if(!aplicarHorarioAtual(r)){
      horariosRegistros=anteriores;
      renderHorMae();
      popMsg("Operacao cancelada.");
      return;
    }
    renderHorMae();
    preencherHorForm(r,true);
    marcarHorMaeSelecionada(r.id);
    return;
  }
  document.querySelectorAll("#horMaeBody tr").forEach((row)=>row.classList.toggle("is-selected",row===tr));
  preencherHorForm(r,true);
});
renderConfigHorario();
