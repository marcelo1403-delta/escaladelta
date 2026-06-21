/* Módulo extraído de js/sandbox.js original. Carregue na ordem definida no index.html. */
var abrirPopArquivo=(html)=>{
  var overlay=document.createElement("div");
  overlay.className="s03-clear-popover is-open file-popover";
  overlay.setAttribute("aria-hidden","false");
  overlay.innerHTML=`<div class="s03-clear-box">${html}</div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click",(event)=>{if(event.target===overlay)overlay.remove();});
  return overlay;
};
var aguardarFirebaseSync=(timeoutMs=4000)=>new Promise((resolve)=>{
  if(window.FirebaseSync){resolve(window.FirebaseSync);return;}
  var inicio=Date.now();
  var tick=()=>{
    if(window.FirebaseSync){resolve(window.FirebaseSync);return;}
    if(Date.now()-inicio>=timeoutMs){resolve(null);return;}
    setTimeout(tick,100);
  };
  tick();
});
var FS_DB_NAME="escalaAgentFileHandles";
var FS_STORE_NAME="handles";
var FS_ROTATIVO_KEY="arquivoRotativo";
var FS_DADOS_DIR_KEY="pastaDados";
var arquivoRotativoHandle=null;
var pastaDadosHandle=null;
var suportaFileSystemAccess=()=>typeof window.showSaveFilePicker==="function"&&typeof window.indexedDB==="object";
var abrirDbArquivos=()=>new Promise((resolve,reject)=>{
  var req=indexedDB.open(FS_DB_NAME,1);
  req.onupgradeneeded=()=>req.result.createObjectStore(FS_STORE_NAME);
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
});
var dbGet=(key)=>abrirDbArquivos().then((db)=>new Promise((resolve,reject)=>{
  var tx=db.transaction(FS_STORE_NAME,"readonly");
  var req=tx.objectStore(FS_STORE_NAME).get(key);
  req.onsuccess=()=>resolve(req.result||null);
  req.onerror=()=>reject(req.error);
}));
var dbSet=(key,value)=>abrirDbArquivos().then((db)=>new Promise((resolve,reject)=>{
  var tx=db.transaction(FS_STORE_NAME,"readwrite");
  tx.objectStore(FS_STORE_NAME).put(value,key);
  tx.oncomplete=()=>resolve(true);
  tx.onerror=()=>reject(tx.error);
}));
var dbDel=(key)=>abrirDbArquivos().then((db)=>new Promise((resolve,reject)=>{
  var tx=db.transaction(FS_STORE_NAME,"readwrite");
  tx.objectStore(FS_STORE_NAME).delete(key);
  tx.oncomplete=()=>resolve(true);
  tx.onerror=()=>reject(tx.error);
}));
var permissaoArquivo=(handle)=>handle.queryPermission({mode:"readwrite"}).then((status)=>{
  if(status==="granted")return true;
  return handle.requestPermission({mode:"readwrite"}).then((novo)=>novo==="granted");
});
var escreverJsonHandle=async(handle,estado)=>{
  var writable=await handle.createWritable();
  await writable.write(JSON.stringify(estado,null,2));
  await writable.close();
};
var permissaoDiretorio=(handle)=>handle.queryPermission({mode:"readwrite"}).then((status)=>{
  if(status==="granted")return true;
  return handle.requestPermission({mode:"readwrite"}).then((novo)=>novo==="granted");
});
var obterPastaDados=async({solicitar=false}={})=>{
  if(!suportaFileSystemAccess()||typeof window.showDirectoryPicker!=="function")return null;
  if(!pastaDadosHandle)pastaDadosHandle=await dbGet(FS_DADOS_DIR_KEY).catch(()=>null);
  if(pastaDadosHandle){
    try{
      if(await permissaoDiretorio(pastaDadosHandle))return pastaDadosHandle;
    }catch(err){
      pastaDadosHandle=null;
      await dbDel(FS_DADOS_DIR_KEY).catch(()=>{});
    }
  }
  if(!solicitar)return null;
  var handle=await window.showDirectoryPicker({mode:"readwrite"});
  pastaDadosHandle=handle;
  await dbSet(FS_DADOS_DIR_KEY,handle).catch(()=>{});
  return handle;
};
var obterHandleRotativo=async()=>{
  if(!suportaFileSystemAccess())return null;
  if(!arquivoRotativoHandle)arquivoRotativoHandle=await dbGet(FS_ROTATIVO_KEY).catch(()=>null);
  if(arquivoRotativoHandle){
    try{
      if(await permissaoArquivo(arquivoRotativoHandle))return arquivoRotativoHandle;
    }catch(err){
      arquivoRotativoHandle=null;
      await dbDel(FS_ROTATIVO_KEY).catch(()=>{});
    }
  }
  var pastaDados=await obterPastaDados({solicitar:true}).catch((err)=>{if(err?.name==="AbortError")throw err;return null;});
  var options={
    suggestedName:"escala_atual.json",
    types:[{description:"Arquivo JSON",accept:{"application/json":[".json"]}}]
  };
  if(pastaDados)options.startIn=pastaDados;
  var handle=await window.showSaveFilePicker(options);
  arquivoRotativoHandle=handle;
  await dbSet(FS_ROTATIVO_KEY,handle).catch(()=>{});
  return handle;
};
var limparResumoSecao2=()=>{
  document.querySelectorAll(".force-summary").forEach((summary)=>{
    var day=summary.querySelector(".stat-day");
    var night=summary.querySelector(".stat-night");
    if(day)day.textContent="☀ 00";
    if(night)night.textContent="☾ 00";
    summary.querySelectorAll(".stat-aus,.stat-perm,.stat-extra").forEach((el)=>{el.textContent="00";});
  });
};
var limparPaginaNova=()=>{
  bloquearAutosaveAte=Date.now()+1500;
  clearTimeout(autosaveTimerPagina);
  estadoPaginaRestaurouTabelas=false;
  limparAutosaveEmergencial();
  apagarCachesAntigosRefresh();
  limparEstadoColunaEscala();
  setModoAlocar(false);
  document.getElementById("topoDatePicker").value="";
  document.getElementById("topoDiaSemana").textContent="";
  document.getElementById("topoPlantaoDia").textContent="";
  _dataRespFallback="";
  _plantaoRespFallback="";
  limparResumoSecao2();
  S03_TABLE_IDS.forEach((id)=>restaurarTabelaEscala(id,[]));
  limparResponsaveisViews();
  if(typeof window.renderEfetivo==="function")window.renderEfetivo();
  atualizarDisponibilidadeColuna();
  atualizarBotaoGravarGestao();
};
var abrirPopoverNovaEscala=()=>{
  var pop=abrirPopArquivo(`<div class="s03-clear-title">INICIAR UMA NOVA ESCALA</div><div class="s03-clear-msg">Escolha uma data.</div><div class="s03-clear-actions" style="flex-direction:column;align-items:center;gap:8px"><input id="novaEscalaDataInput" type="date" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px"><div id="novaEscalaPreview" style="min-height:18px;font-size:12px;font-weight:700;color:#1e3a5f"></div><div style="display:flex;gap:8px"><button class="s03-clear-confirm" type="button" data-act="confirmar">CONFIRMAR</button><button class="s03-clear-exit" type="button" data-act="cancelar">CANCELAR</button></div></div>`);
  var input=pop.querySelector("#novaEscalaDataInput");
  var preview=pop.querySelector("#novaEscalaPreview");
  var atualizarPreview=()=>{
    var dataIso=input.value;
    preview.textContent=dataIsoValida(dataIso)?`${diaSemanaGestao(dataIso)} - ${plantaoPorDataGestao(dataIso)}`:"";
    input.style.borderColor=dataIso&&dataIsoValida(dataIso)?"#cbd5e1":input.style.borderColor;
  };
  var popMsgEscalaCriada=()=>{
    var aviso=abrirPopArquivo(`<div class="s03-clear-title">AVISO</div><div class="s03-clear-msg">Escala criada com sucesso!</div><div class="s03-clear-actions"><button class="s03-clear-exit" type="button">FECHAR</button></div>`);
    aviso.querySelector("button")?.addEventListener("click",()=>aviso.remove());
  };
  var confirmar=async()=>{
    var dataIso=input.value;
    if(!dataIsoValida(dataIso)){input.style.borderColor="#dc2626";popMsg("Escolha uma data válida");return;}
    var plantao=plantaoPorDataGestao(dataIso);
    var docId=backupDocIdGestao(dataIso,plantao);
    var legacyId=legacyDocIdGestao(dataIso,plantao);
    var jaExiste=await window.FirebaseSync?.existe?.(docId)||await window.FirebaseSync?.existe?.(legacyId);
    if(jaExiste){popMsg("Já existe uma escala com essa data, escolha uma outra.");return;}
    pop.remove();
    await aplicarBaseMatrizNaNovaEscala(dataIso);
    aplicarViewPadraoEscala();
    popMsgEscalaCriada();
  };
  input.addEventListener("input",atualizarPreview);
  input.addEventListener("keydown",(event)=>{if(event.key==="Enter")confirmar();});
  pop.querySelector("[data-act='confirmar']").addEventListener("click",confirmar);
  pop.querySelector("[data-act='cancelar']").addEventListener("click",()=>pop.remove());
  input.focus();
};
var confirmarNovoPagina=()=>{
  window._escalaAbertaStatus="em_andamento";
  window._modoEdicaoForcado=false;
  window._arquivoAbertoDocId="";
  atualizarModoLeituraEscala();
  if(!estadoEscalaTemDados()){abrirPopoverNovaEscala();return;}
  var pop=abrirPopArquivo(`<div class="s03-clear-title">NOVO</div><div class="s03-clear-msg">Todos os dados na tela serão limpos, deseja prosseguir?</div><div class="s03-clear-actions"><button class="s03-clear-confirm" type="button" data-act="sim">SIM</button><button class="s03-clear-exit" type="button" data-act="nao">NÃO</button></div>`);
  pop.querySelector("[data-act='sim']").addEventListener("click",()=>{pop.remove();abrirPopoverNovaEscala();});
  pop.querySelector("[data-act='nao']").addEventListener("click",()=>pop.remove());
};
var executarGravarPagina=async()=>{
  if(gravacaoEscalaEmAndamento)return;
  gravacaoEscalaEmAndamento=true;
  try{
  var estadoCompleto=coletarEstadoPagina();
  var estado=compactarEstadoParaEscala(estadoCompleto);
  var estadoAutomatico=estadoEscalaPorDataGestao(estado?.topo?.data||"");
  var editandoEncerrada=window._escalaAbertaStatus==="encerrado";
  estado.estado=editandoEncerrada?"encerrado":estadoAutomatico;
  estado.matrizConectada=estado.estado==="em andamento";
  estadoCompleto.estado=estado.estado;
  estadoCompleto.matrizConectada=estado.matrizConectada;
  if(estado.estado==="em andamento"&&!servidoresSnapshotCompleto(estado.servidores)){
    var matrizReparo=await carregarMatrizDados();
    estadoCompleto=completarServidoresSnapshotComMatriz(estadoCompleto,matrizReparo||{});
    estadoCompleto.estado=estado.estado;
    estadoCompleto.matrizConectada=estado.matrizConectada;
    estado=compactarEstadoParaEscala(estadoCompleto);
    estado.estado="em andamento";
    estado.matrizConectada=true;
  }
  var validacaoSnapshot=validarSnapshotAutossuficienteEscala(estado);
  if(!validacaoSnapshot.ok){
    popMsg(`Arquivo de escala incompleto. Falta: ${validacaoSnapshot.faltantes.join(", ")}. A gravacao foi bloqueada para nao criar historico dependente da matriz-dados.`);
    return;
  }
  var estadoRefresh={...estadoCompleto,autosaveLocal:true,autosaveEm:new Date().toISOString(),origemRefreshLocal:true};
  estadoRefresh.refreshSnapshotVersao=4;
  sessionStorage.setItem(STORAGE_REFRESH_SESSION_KEY,JSON.stringify(estadoRefresh));
  apagarCachesAntigosRefresh();
  salvarUltimoGravadoValido(estado);
  if(typeof window.FirebaseSync==="undefined"){
    popMsg("Firebase indisponível. Dados salvos localmente.");
    return;
  }
  var dataIso=estado?.topo?.data||"";
  var plantao=estado?.topo?.plantao||"";
  var abertoMeta=parseBackupDocGestao(window._arquivoAbertoDocId||"");
  var backupId=abertoMeta?.dataIso===dataIso&&abertoMeta?.plantao===normResp(plantao)?abertoMeta.id:backupDocIdGestao(dataIso,plantao);
  if(!backupId){popMsg("Não foi possível gerar o ID do backup. Verifique a data e o plantão.");return;}
  // Se o arquivo for marcado como encerrado, ele vira snapshot encerrado e não atualiza a matriz-dados.
  var status=(estado.estado==='encerrado'?'encerrado':'em_andamento');
  window._escalaAbertaStatus=status;
  window._modoEdicaoForcado=estado.estado!=="encerrado"||editandoEncerrada;
  var backupResult=await window.FirebaseSync.salvar(estado,backupId,{status});
  if(!backupResult.ok){
    popMsg(`❌ Falha ao gravar a escala na nuvem. ${backupResult.msg||'Erro desconhecido.'}`);
    return;
  }
  // atualizar matriz apenas quando não estiver encerrado
  if(estado.estado==='em andamento'){
    var matrizBase=await carregarMatrizDados();
    var matriz=matrizDadosFromEstado(estadoCompleto,matrizBase||{});
    var matrizResult=await window.FirebaseSync.salvar(matriz,MATRIZ_DOC_ID,{status:"em_andamento"});
    window._arquivoAbertoDocId=backupId;
    atualizarModoLeituraEscala();
    if(!matrizResult.ok){
      popMsg(`⚠️ Escala gravada em [${backupId}], mas a atualização da matriz-dados falhou. ${matrizResult.msg||''}`);
      return;
    }
    limparAutosaveEmergencial();
    popMsg(`✅ Arquivo gravado com sucesso na nuvem! ${backupId}`);
  }else{
    // quando encerrado, só gravamos o arquivo de escala e retornamos mensagem
    window._arquivoAbertoDocId=backupId;
    atualizarModoLeituraEscala();
    limparAutosaveEmergencial();
    popMsg(`✅ Arquivo gravado como ENCERRADO na nuvem: ${backupId}`);
  }
  }finally{
    gravacaoEscalaEmAndamento=false;
  }
};

var autosaveNuvemTimerPagina=null;
var autosaveNuvemEmAndamento=false;
var autosaveNuvemPendente=false;
var executarAutosaveNuvemPagina=async()=>{
  if(restaurandoEstadoPagina||Date.now()<bloquearAutosaveAte)return;
  if(!validarDadosParaSalvarSemPopup())return;
  if(typeof window.FirebaseSync==="undefined")return;
  if(autosaveNuvemEmAndamento){
    autosaveNuvemPendente=true;
    return;
  }
  autosaveNuvemEmAndamento=true;
  try{
    var estadoCompleto=coletarEstadoPagina();
    var estado=compactarEstadoParaEscala(estadoCompleto);
    estado.estado=estadoEscalaPorDataGestao(estado?.topo?.data||"");
    estado.matrizConectada=estado.estado==="em andamento";
    var escalaEncerradaAberta=window._escalaAbertaStatus==='encerrado'||estado.estado==='encerrado';
    // Arquivo ENCERRADO é snapshot encerrado: autosave não grava a escala e nunca atualiza matriz-dados.
    if(escalaEncerradaAberta)return;
    var matrizBase=await carregarMatrizDados();
    if(!servidoresSnapshotCompleto(estado.servidores)){
      estadoCompleto=completarServidoresSnapshotComMatriz(estadoCompleto,matrizBase||{});
      estadoCompleto.estado="em andamento";
      estadoCompleto.matrizConectada=true;
      estado=compactarEstadoParaEscala(estadoCompleto);
      estado.estado="em andamento";
      estado.matrizConectada=true;
    }
    var validacaoSnapshot=validarSnapshotAutossuficienteEscala(estado);
    if(!validacaoSnapshot.ok)return;
    var dataIso=estado?.topo?.data||"";
    var plantao=estado?.topo?.plantao||"";
    var abertoMeta=parseBackupDocGestao(window._arquivoAbertoDocId||"");
    var backupId=abertoMeta?.dataIso===dataIso&&abertoMeta?.plantao===normResp(plantao)?abertoMeta.id:backupDocIdGestao(dataIso,plantao);
    if(!backupId)return;
    window._escalaAbertaStatus='em_andamento';
    window._modoEdicaoForcado=true;
    var backupResult=await window.FirebaseSync.salvar(estado,backupId,{status:'em_andamento',autosave:true});
    if(!backupResult?.ok)return;
    var matriz=matrizDadosFromEstado(estadoCompleto,matrizBase||{});
    var matrizResult=await window.FirebaseSync.salvar(matriz,MATRIZ_DOC_ID,{status:'em_andamento',autosave:true});
    if(matrizResult?.ok){
      window._arquivoAbertoDocId=backupId;
      salvarUltimoGravadoValido(estado);
      atualizarModoLeituraEscala();
    }
  }catch(err){
    console.warn('Falha no autosave em nuvem',err);
  }finally{
    autosaveNuvemEmAndamento=false;
    if(autosaveNuvemPendente){
      autosaveNuvemPendente=false;
      agendarAutosaveNuvemPagina(2500);
    }
  }
};
var validarDadosParaSalvarSemPopup=()=>dataIsoValida(document.getElementById("topoDatePicker")?.value||"")&&Boolean(normResp(document.getElementById("topoPlantaoDia")?.textContent||""));
var agendarAutosaveNuvemPagina=(delay=3000)=>{
  if(restaurandoEstadoPagina||Date.now()<bloquearAutosaveAte)return;
  clearTimeout(autosaveNuvemTimerPagina);
  autosaveNuvemTimerPagina=setTimeout(()=>{
    autosaveNuvemTimerPagina=null;
    executarAutosaveNuvemPagina();
  },delay);
};
window.agendarAutosaveNuvemPagina=agendarAutosaveNuvemPagina;
window.executarAutosaveNuvemPagina=executarAutosaveNuvemPagina;

var gravarPagina=()=>{
  if(escalaEncerradaSomenteLeitura()){
    popMsg("Essa escala está encerrada. No menu OUTROS, escolha a opção EDITAR se precisar fazer alguma alteração.");
    return;
  }
  if(!validarDadosParaSalvar())return;
  executarGravarPagina();
};
var executarBackupPagina=async()=>{
  var estado=compactarEstadoParaEscala(coletarEstadoPagina());
  var validacaoSnapshot=validarSnapshotAutossuficienteEscala(estado);
  if(!validacaoSnapshot.ok){
    popMsg(`Backup bloqueado: arquivo de escala incompleto. Falta: ${validacaoSnapshot.faltantes.join(", ")}.`);
    return;
  }
  if(typeof window.FirebaseSync==="undefined"){popMsg("Firebase indisponível.");return;}
  var dataIso=estado?.topo?.data||"";
  var plantao=estado?.topo?.plantao||"";
  var docId=backupDocIdGestao(dataIso,plantao);
  if(!docId){popMsg("Não foi possível gerar o ID do backup. Verifique a data e o plantão.");return;}
  var result=await window.FirebaseSync.salvar(estado,docId);
  if(result.ok) popMsg(`Backup gravado na nuvem: [${docId}]`);
  else popMsg("Falha ao gravar backup na nuvem.");
};
var backupPagina=()=>{
  if(!validarDadosParaSalvar())return;
  executarBackupPagina();
};

// ─── EXPORTAR (download JSON local) ─────────────────────────────────────────
var exportarPagina=async()=>{
  var firebase=await aguardarFirebaseSync();
  if(!firebase){popMsg("Firebase nao disponivel. Recarregue a pagina e tente novamente.");return;}
  var pop=abrirPopArquivo(`
    <div class="gestao-pop abrir">
      <div class="gestao-head">
        <span class="gestao-icon">EXP</span>
        <div class="gestao-title">EXPORTAR ESCALAS</div>
        <button class="gestao-close" type="button" data-act="sair" aria-label="Fechar">X</button>
      </div>
      <div class="gestao-open-gap"></div>
      <div class="gestao-open-body" style="grid-template-columns:1fr">
        <section class="gestao-open-list" aria-label="Lista de Arquivos">
          <div class="gestao-table-wrap">
            <table class="gestao-arquivo-table">
              <thead>
                <tr><th><label style="display:flex;align-items:center;gap:8px"><input id="exportarTodosInput" type="checkbox"><span>ARQUIVOS</span><span id="exportarContadorArquivos" class="gestao-arquivo-count">0</span></label></th></tr>
              </thead>
              <tbody id="exportarListaArquivos">
                <tr><td class="gestao-empty">Carregando...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <div class="s03-clear-actions" style="padding:12px;gap:8px">
        <button class="s03-clear-confirm" type="button" data-act="exportar">EXPORTAR</button>
        <button class="s03-clear-exit" type="button" data-act="sair">SAIR</button>
      </div>
    </div>
  `);
  var listaEl=pop.querySelector("#exportarListaArquivos");
  var contadorEl=pop.querySelector("#exportarContadorArquivos");
  var todosInput=pop.querySelector("#exportarTodosInput");
  var arquivos=[];
  var selecionados=()=>Array.from(listaEl.querySelectorAll(".exportar-arquivo-check:checked")).map((input)=>input.value);
  var atualizarTodos=()=>{
    var checks=Array.from(listaEl.querySelectorAll(".exportar-arquivo-check"));
    var marcados=checks.filter((input)=>input.checked);
    todosInput.checked=Boolean(checks.length)&&marcados.length===checks.length;
    todosInput.indeterminate=Boolean(marcados.length)&&marcados.length<checks.length;
  };
  var renderLista=()=>{
    contadorEl.textContent=String(arquivos.length).padStart(2,"0");
    if(!arquivos.length){
      var erro=firebase.ultimoErroListagem?`<div style="margin-top:4px;color:#92400e">${cfgEsc(firebase.ultimoErroListagem)}</div>`:"";
      listaEl.innerHTML=`<tr><td class="gestao-empty">Nenhuma escala encontrada.${erro}</td></tr>`;
      atualizarTodos();
      return;
    }
    listaEl.innerHTML=arquivos.map((item)=>`<tr class="gestao-arquivo-row"><td title="${cfgEsc(item.label)}"><label style="display:flex;align-items:center;gap:8px;width:100%;cursor:pointer"><input class="exportar-arquivo-check" type="checkbox" value="${cfgEsc(item.id)}"><span>${cfgEsc(item.label)}</span></label></td></tr>`).join("");
    atualizarTodos();
  };
  var carregar=async()=>{
    var lista=await firebase.listarBackups?.()||[];
    arquivos=lista.map((item)=>parseBackupDocGestao(item.id)).filter(Boolean).sort((a,b)=>String(b.dataIso).localeCompare(String(a.dataIso))||String(b.id).localeCompare(String(a.id)));
    renderLista();
  };
  var executar=async()=>{
    var ids=selecionados();
    if(!ids.length){popMsg("Selecione pelo menos um arquivo para exportar.");return;}
    var exportados=[];
    for(var id of ids){
      var result=await firebase.carregar(id);
      if(result?.payload)exportados.push({id,payload:result.payload});
    }
    if(!exportados.length){popMsg("Nenhum arquivo selecionado foi carregado para exportacao.");return;}
    if(exportados.length===1){
      baixarJson(`${exportados[0].id}.json`,exportados[0].payload);
    }else{
      var pacote={
        tipo:"backup-escalas",
        exportadoEm:new Date().toISOString(),
        total:exportados.length,
        documentos:Object.fromEntries(exportados.map((item)=>[item.id,item.payload]))
      };
      baixarJson(`backup-escalas-${new Date().toISOString().slice(0,10)}.json`,pacote);
    }
    popMsg(`${exportados.length} arquivo(s) exportado(s) para o seu computador.`);
  };
  todosInput.addEventListener("change",()=>{
    listaEl.querySelectorAll(".exportar-arquivo-check").forEach((input)=>{input.checked=todosInput.checked;});
    atualizarTodos();
  });
  listaEl.addEventListener("change",(event)=>{
    if(event.target.classList.contains("exportar-arquivo-check"))atualizarTodos();
  });
  pop.querySelector("[data-act='exportar']").addEventListener("click",executar);
  pop.querySelectorAll("[data-act='sair']").forEach((btn)=>btn.addEventListener("click",()=>pop.remove()));
  carregar();
};

// ─── IMPORTAR (ler JSON local) ────────────────────────────────────────────────
var importarPagina=()=>{
  var pop=abrirPopArquivo(`<div class="s03-clear-title">IMPORTAR</div><div class="s03-clear-msg">Selecione um arquivo .json exportado anteriormente.</div><div class="s03-clear-actions" style="padding-bottom:12px;gap:10px"><button class="s03-clear-confirm" style="height:30px;min-height:30px" type="button" data-act="selecionar">SELECIONAR ARQUIVO</button><button class="s03-clear-exit" style="height:30px;min-height:30px" type="button" data-act="sair">SAIR</button></div><input id="importarJsonInput" type="file" accept="application/json,.json" hidden>`);
  pop.querySelector(".s03-clear-box").style.minHeight="145px";
  var input=pop.querySelector("#importarJsonInput");
  pop.querySelector("[data-act='selecionar']").addEventListener("click",()=>input.click());
  input.addEventListener("change",()=>abrirBackupArquivo(input.files?.[0],pop));
  pop.querySelector("[data-act='sair']").addEventListener("click",()=>pop.remove());
};

// ─── VERIFICAR STATUS DO PLANTÃO ATUAL ───────────────────────────────────────
var plantaoEstaAberto=()=>true;

// ─── CREDENCIAL ───────────────────────────────────────────────────────────────
var CREDENCIAL_EDICAO="2009";

// ─── EXCLUIR ─────────────────────────────────────────────────────────────────
var excluirPagina=()=>{
  var dataIso=document.getElementById("topoDatePicker")?.value||"";
  var plantao=normResp(document.getElementById("topoPlantaoDia")?.textContent||"");
  var docId=window.FirebaseSync?.gerarDocId(dataIso,plantao);
  if(!docId){popMsg("Selecione um plantão válido antes de excluir.");return;}
  var pop=abrirPopArquivo(`<div class="s03-clear-title">EXCLUIR PLANTÃO</div><div class="s03-clear-msg">Excluir <strong>${docId}</strong>? O registro será marcado como inativo.<br>Informe a credencial para confirmar.</div><div class="s03-clear-actions" style="flex-direction:column;align-items:center;gap:8px"><input id="excluirCredInput" type="password" placeholder="Credencial" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;width:140px;text-align:center"><div style="display:flex;gap:8px"><button class="s03-clear-confirm" type="button" data-act="confirmar">EXCLUIR</button><button class="s03-clear-exit" type="button" data-act="sair">SAIR</button></div></div>`);
  var input=pop.querySelector("#excluirCredInput");
  input.focus();
  var executar=async()=>{
    if(input.value!==CREDENCIAL_EDICAO){
      input.value="";input.placeholder="Credencial incorreta";input.style.borderColor="#dc2626";return;
    }
    pop.remove();
    var ok=await window.FirebaseSync?.marcarInativo(docId);
    if(ok) popMsg(`Plantão [${docId}] marcado como inativo.`);
    else popMsg("Falha ao excluir. Verifique a conexão.");
  };
  pop.querySelector("[data-act='confirmar']").addEventListener("click",executar);
  input.addEventListener("keydown",(e)=>{if(e.key==="Enter")executar();});
  pop.querySelector("[data-act='sair']").addEventListener("click",()=>pop.remove());
};
var editarEscalaEncerradaPagina=()=>{
  if(window._escalaAbertaStatus!=="encerrado"){popMsg("A opção EDITAR fica disponível apenas quando a escala estiver encerrada.");return;}
  var pop=abrirPopArquivo(`<div class="s03-clear-title">EDITAR ESCALA ENCERRADA</div><div class="s03-clear-msg">Informe a credencial para liberar a edicao deste arquivo. A matriz-dados nao sera atualizada.</div><div class="s03-clear-actions" style="flex-direction:column;align-items:center;gap:8px"><input id="editarCredInput" type="password" placeholder="Credencial" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px;width:140px;text-align:center"><div style="display:flex;gap:8px"><button class="s03-clear-confirm" type="button" data-act="confirmar">EDITAR</button><button class="s03-clear-exit" type="button" data-act="sair">SAIR</button></div></div>`);
  var input=pop.querySelector("#editarCredInput");
  input.focus();
  var executar=()=>{
    if(input.value!==CREDENCIAL_EDICAO){
      input.value="";
      input.placeholder="Credencial incorreta";
      input.style.borderColor="#dc2626";
      return;
    }
    window._modoEdicaoForcado=true;
    pop.remove();
    atualizarModoLeituraEscala();
    popMsg("Edicao liberada para este arquivo encerrado.");
  };
  pop.querySelector("[data-act='confirmar']").addEventListener("click",executar);
  input.addEventListener("keydown",(e)=>{if(e.key==="Enter")executar();});
  pop.querySelector("[data-act='sair']").addEventListener("click",()=>pop.remove());
};
var aplicarEstadoAberto=async(estado,pop,origem="arquivo",docId="")=>{
  try{
    if(!estado||typeof estado!="object")throw new Error("arquivo sem dados de escala");
    var dataIsoInicial=estado?.topo?.data||"";
    var estadoAtual=estadoEscalaPorDataGestao(dataIsoInicial);
    var originalmenteEncerrado=String(estado?.estado||"").toLowerCase()==='encerrado'||estadoAtual==="encerrado";
    if(!originalmenteEncerrado&&!servidoresSnapshotCompleto(estado.servidores)){
      var matrizReparo=await carregarMatrizDados();
      estado=completarServidoresSnapshotComMatriz(estado,matrizReparo||{});
    }
    var validacaoSnapshot=validarSnapshotAutossuficienteEscala(estado);
    if(!validacaoSnapshot.ok)throw new Error(`snapshot incompleto (${validacaoSnapshot.faltantes.join(", ")}). Abertura bloqueada para nao misturar dados historicos com a matriz-dados atual.`);
    estado.snapshotAutossuficiente=true;
    estado.snapshotVersao=Number(estado.snapshotVersao||3);
    estado.estado=originalmenteEncerrado?"encerrado":"em andamento";
    estado.matrizConectada=!originalmenteEncerrado;
    pop?.remove();
    limparPaginaNova();
    estado.origemArquivoUsuario=true;
    restaurandoEstadoPagina=true;
    var ok=aplicarEstadoPagina(estado);
    if(!ok)throw new Error("estado nao aplicado");
    aplicarViewPadraoEscala();
    restaurandoEstadoPagina=false;
    var estadoAplicado=coletarEstadoPagina();
    var estadoCompacto=compactarEstadoParaEscala(estadoAplicado);
    var estadoRefresh={...estadoAplicado,autosaveLocal:true,autosaveEm:new Date().toISOString(),origemRefreshLocal:true};
    estadoRefresh.refreshSnapshotVersao=4;
    sessionStorage.setItem(STORAGE_REFRESH_SESSION_KEY,JSON.stringify(estadoRefresh));
    apagarCachesAntigosRefresh();
    salvarUltimoGravadoValido(estadoCompacto);
    salvarTabelasEscalaDados();
    var dataIso=estadoAplicado?.topo?.data||"";
    window._escalaAbertaStatus=originalmenteEncerrado?'encerrado':'em_andamento';
    window._modoEdicaoForcado=!originalmenteEncerrado;
    window._arquivoAbertoDocId=docId||backupDocIdGestao(dataIso,estadoAplicado?.topo?.plantao||"")||"";
    atualizarModoLeituraEscala();
    return true;
  }catch(err){
    restaurandoEstadoPagina=false;
    console.warn("Falha ao abrir escala",err);
    popMsg(`Não foi possível abrir: ${err?.message||"erro desconhecido"}`);
    return false;
  }
};
var abrirBackupArquivo=(file,pop)=>{
  if(!file)return;
  var reader=new FileReader();
  reader.onload=()=>{
    try{
      var estado=JSON.parse(String(reader.result||""));
      aplicarEstadoAberto(estado,pop,"Backup");
    }catch(err){
      console.warn("Backup inválido",err);
      popMsg(`Backup inválido: ${err?.message||"JSON inválido"}`);
    }
  };
  reader.onerror=()=>{
    console.warn("Falha ao ler backup",reader.error);
    popMsg("Não foi possível ler o arquivo selecionado.");
  };
  reader.readAsText(file);
};
var abrirUltimoGravado=async(pop,inputFallback)=>{
  if(suportaFileSystemAccess()){
    try{
      var handle=arquivoRotativoHandle||await dbGet(FS_ROTATIVO_KEY).catch(()=>null);
      if(handle){
        arquivoRotativoHandle=handle;
        var file=await handle.getFile();
        var estado=JSON.parse(await file.text());
        aplicarEstadoAberto(estado,pop,"Último gravado");
        return;
      }
      if(typeof window.showOpenFilePicker==="function"){
        var [novoHandle]=await window.showOpenFilePicker({
          types:[{description:"Arquivo JSON",accept:{"application/json":[".json"]}}],
          multiple:false
        });
        if(novoHandle){
          arquivoRotativoHandle=novoHandle;
          await dbSet(FS_ROTATIVO_KEY,novoHandle).catch(()=>{});
          var file=await novoHandle.getFile();
          var estado=JSON.parse(await file.text());
          aplicarEstadoAberto(estado,pop,"Último gravado");
          return;
        }
      }
    }catch(err){
      if(err?.name==="AbortError")return;
      console.warn("Falha ao abrir arquivo rotativo",err);
      arquivoRotativoHandle=null;
      await dbDel(FS_ROTATIVO_KEY).catch(()=>{});
      popMsg("Não foi possível acessar o arquivo principal. Use BACKUP ou grave novamente para escolher outro arquivo.");
      return;
    }
  }
  var raw=localStorage.getItem(STORAGE_ULTIMO_GRAVADO_KEY);
  if(raw){
    aplicarEstadoAberto(JSON.parse(raw),pop,"Último gravado");
    return;
  }
  popMsg("Escolha o arquivo principal uma vez para registrar o último gravado.");
  inputFallback?.click();
};
var abrirDaNuvem=async(pop)=>{
  if(typeof window.FirebaseSync==="undefined"){popMsg("Firebase não disponível.");return;}
  pop?.remove();
  // Tenta carregar pelo ID da data atual da navbar
  var dataIso=document.getElementById("topoDatePicker")?.value||"";
  var plantao=normResp(document.getElementById("topoPlantaoDia")?.textContent||"");
  var docId=dataIso&&plantao?window.FirebaseSync.gerarDocId(dataIso,plantao):null;
  if(!docId){
    popMsg("Selecione uma data e plantão na navbar para carregar da nuvem.");
    return;
  }
  var result=await window.FirebaseSync.carregar(docId);
  if(!result){popMsg(`Nenhum registro encontrado para [${docId}].`);return;}
  aplicarEstadoAberto(result.payload,null,`Nuvem [${docId}]`);
};
var prepararEstadoDuplicado=(estadoOrigem,origemMeta,destinoIso)=>{
  var destinoPlantao=plantaoPorDataGestao(destinoIso);
  var estado=cloneGestao(estadoOrigem||{});
  var agora=new Date().toISOString();
  estado.topo={...(estado.topo||{}),data:destinoIso,plantao:destinoPlantao,forca:estado.topo?.forca||forcaAtivaEscala(),filtro:estado.topo?.filtro||"presente"};
  estado.estado="em andamento";
  estado.matrizConectada=true;
  estado.salvoEm=agora;
  estado.snapshotAutossuficiente=true;
  estado.snapshotVersao=Number(estado.snapshotVersao||3);
  estado.snapshotGeradoEm=agora;
  estado.duplicadoDe={docId:origemMeta?.id||"",data:origemMeta?.dataIso||"",plantao:origemMeta?.plantao||"",criadoEm:agora};
  if(Array.isArray(estado.servidores))estado.efetivoView=estado.servidores.filter((s)=>normResp(s.plantao)===destinoPlantao).map((s)=>({...s}));
  if(Array.isArray(estado.responsaveis))estado.responsaveisView=estado.responsaveis.filter((r)=>normResp(r.plantao)===destinoPlantao).map((r)=>({...r}));
  return estado;
};
var aplicarEstadoDuplicadoAberto=async(estado,docId,pop)=>{
  bloquearAutosaveAte=Date.now()+3000;
  limparAutosaveEmergencial();
  apagarCachesAntigosRefresh();
  pop?.remove();
  limparPaginaNova();
  restaurandoEstadoPagina=true;
  var ok=aplicarEstadoPagina(estado);
  aplicarViewPadraoEscala();
  restaurandoEstadoPagina=false;
  if(!ok){popMsg("A escala foi criada, mas nao foi possivel abrir na tela.");return;}
  var estadoAplicado=coletarEstadoPagina();
  var estadoCompacto=compactarEstadoParaEscala(estadoAplicado);
  salvarUltimoGravadoValido(estadoCompacto);
  salvarTabelasEscalaDados();
  sessionStorage.setItem(STORAGE_REFRESH_SESSION_KEY,JSON.stringify({...estadoAplicado,autosaveLocal:true,autosaveEm:new Date().toISOString(),origemRefreshLocal:true,refreshSnapshotVersao:4}));
  window._arquivoAbertoDocId=docId;
  window._escalaAbertaStatus="em_andamento";
  window._modoEdicaoForcado=true;
  atualizarModoLeituraEscala();
};
var abrirPopoverDataDuplicacao=async(origem,result,popOrigem)=>{
  var origemPlantao=origem?.plantao||normResp(result?.payload?.topo?.plantao||"");
  popOrigem?.remove();
  var pop=abrirPopArquivo(`<div class="s03-clear-title">DUPLICAR ESCALA</div><div class="s03-clear-msg">Escolha a data da nova escala.</div><div class="s03-clear-actions" style="flex-direction:column;align-items:center;gap:8px"><input id="duplicarEscalaDataInput" type="date" style="padding:6px 10px;border:1px solid #cbd5e1;border-radius:4px;font-size:13px"><div id="duplicarEscalaPreview" style="min-height:18px;font-size:12px;font-weight:700;color:#1e3a5f"></div><div style="display:flex;gap:8px"><button class="s03-clear-confirm" type="button" data-act="confirmar">CONFIRMAR</button><button class="s03-clear-exit" type="button" data-act="cancelar">CANCELAR</button></div></div>`);
  var input=pop.querySelector("#duplicarEscalaDataInput");
  var preview=pop.querySelector("#duplicarEscalaPreview");
  var atualizarPreview=()=>{
    var dataIso=input.value;
    if(!dataIsoValida(dataIso)){preview.textContent="";return;}
    var destinoPlantao=plantaoPorDataGestao(dataIso);
    preview.textContent=`${diaSemanaGestao(dataIso)} - ${destinoPlantao}`;
    preview.style.color=destinoPlantao===origemPlantao?"#1e3a5f":"#b91c1c";
    input.style.borderColor=destinoPlantao===origemPlantao?"#cbd5e1":"#dc2626";
  };
  var confirmar=async()=>{
    var dataIso=input.value;
    if(!dataIsoValida(dataIso)){input.style.borderColor="#dc2626";popMsg("Escolha uma data valida.");return;}
    var destinoPlantao=plantaoPorDataGestao(dataIso);
    if(destinoPlantao!==origemPlantao){popMsg(`A escala de origem e ${origemPlantao}. Escolha uma data do plantao ${origemPlantao}.`);return;}
    var docId=backupDocIdGestao(dataIso,destinoPlantao);
    var legacyId=legacyDocIdGestao(dataIso,destinoPlantao);
    var jaExiste=await window.FirebaseSync?.existe?.(docId)||await window.FirebaseSync?.existe?.(legacyId);
    if(jaExiste){popMsg("Ja existe uma escala com essa data, escolha outra.");return;}
    var estado=compactarEstadoParaEscala(prepararEstadoDuplicado(result.payload,origem,dataIso));
    estado.estado="em andamento";
    estado.matrizConectada=true;
    var validacao=validarSnapshotAutossuficienteEscala(estado);
    if(!validacao.ok){popMsg(`Duplicacao bloqueada: origem incompleta. Falta: ${validacao.faltantes.join(", ")}.`);return;}
    var gravado=await window.FirebaseSync.salvar(estado,docId,{status:"em_andamento",historico:[{tipo:"duplicado",origem:origem?.id||"",criadoEm:new Date().toISOString()}]});
    if(!gravado?.ok){popMsg(`Falha ao criar a escala duplicada. ${gravado?.msg||""}`);return;}
    await aplicarEstadoDuplicadoAberto(estado,docId,pop);
    popMsg(`Escala duplicada e aberta: ${docId}`);
  };
  input.addEventListener("input",atualizarPreview);
  input.addEventListener("keydown",(event)=>{if(event.key==="Enter")confirmar();});
  pop.querySelector("[data-act='confirmar']").addEventListener("click",confirmar);
  pop.querySelector("[data-act='cancelar']").addEventListener("click",()=>pop.remove());
  input.focus();
};
var duplicarPagina=async()=>{
  var firebase=await aguardarFirebaseSync();
  if(!firebase){popMsg("Firebase nao disponivel. Recarregue a pagina e tente novamente.");return;}
  var anoCorrente=String(new Date().getFullYear());
  var mesCorrente=String(new Date().getMonth()+1).padStart(2,"0");
  var defaultPlantao="DELTA";
  var mesesAno=["01","02","03","04","05","06","07","08","09","10","11","12"];
  var pop=abrirPopArquivo(`
    <div class="gestao-pop abrir">
      <div class="gestao-head">
        <span class="gestao-icon">DUP</span>
        <div class="gestao-title">DUPLICAR UMA ESCALA</div>
        <button class="gestao-close" type="button" data-act="sair" aria-label="Fechar">X</button>
      </div>
      <div class="gestao-open-gap"></div>
      <div class="gestao-open-body">
        <section class="gestao-open-filter" aria-label="Filtros de Arquivos">
          <div class="gestao-open-section-title">FILTROS DE ARQUIVOS</div>
          <label class="gestao-open-field"><span>FILTRO POR DATA</span><input id="duplicarFiltroData" type="date"></label>
          <label class="gestao-open-field">
            <span>FILTRO POR PLANTAO</span>
            <select id="duplicarFiltroPlantao">
              <option value="">TODOS</option>
              <option value="ALFA">ALFA</option>
              <option value="BRAVO">BRAVO</option>
              <option value="CHARLIE">CHARLIE</option>
              <option value="DELTA">DELTA</option>
            </select>
          </label>
          <label class="gestao-open-field"><span>FILTRO POR ANO</span><select id="duplicarFiltroAno"></select></label>
          <label class="gestao-open-field"><span>FILTRO POR MES</span><select id="duplicarFiltroMes"></select></label>
          <button class="gestao-open-clear" type="button" data-act="limpar">LIMPAR FILTROS</button>
        </section>
        <section class="gestao-open-list" aria-label="Lista de Arquivos">
          <div class="gestao-table-wrap">
            <table class="gestao-arquivo-table">
              <thead><tr><th><span>ARQUIVO</span><span id="duplicarContadorArquivos" class="gestao-arquivo-count">0</span></th></tr></thead>
              <tbody id="duplicarListaArquivos"><tr><td class="gestao-empty">Carregando...</td></tr></tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `);
  var filtroData=pop.querySelector("#duplicarFiltroData");
  var filtroPlantao=pop.querySelector("#duplicarFiltroPlantao");
  var filtroAno=pop.querySelector("#duplicarFiltroAno");
  var filtroMes=pop.querySelector("#duplicarFiltroMes");
  var listaEl=pop.querySelector("#duplicarListaArquivos");
  var contadorEl=pop.querySelector("#duplicarContadorArquivos");
  var arquivos=[];
  var montarOpcao=(valor,label=valor)=>`<option value="${cfgEsc(valor)}">${cfgEsc(label)}</option>`;
  var aplicarDefaults=()=>{filtroData.value="";filtroPlantao.value=defaultPlantao;filtroAno.value=anoCorrente;filtroMes.value=mesCorrente;};
  var renderFiltros=()=>{
    var anoAnterior=filtroAno.value;
    var mesAnterior=filtroMes.value;
    var anos=[...new Set(arquivos.map((item)=>item.ano).filter(Boolean))].sort((a,b)=>Number(b)-Number(a));
    if(!anos.includes(anoCorrente))anos.unshift(anoCorrente);
    var anosUnicos=[...new Set(anos)];
    filtroAno.innerHTML=montarOpcao("","TODOS")+anosUnicos.map((ano)=>montarOpcao(ano)).join("");
    filtroAno.value=anoAnterior===""||anosUnicos.includes(anoAnterior)?anoAnterior:anoCorrente;
    filtroMes.innerHTML=montarOpcao("","TODOS")+mesesAno.map((mes)=>montarOpcao(mes,`${mes} - ${mesNomeGestao(mes)}`)).join("");
    filtroMes.value=mesAnterior===""||mesesAno.includes(mesAnterior)?mesAnterior:mesCorrente;
  };
  var arquivosFiltrados=()=>arquivos.filter((item)=>{
    if(filtroData.value&&item.dataIso!==filtroData.value)return false;
    if(filtroPlantao.value&&item.plantao!==filtroPlantao.value)return false;
    if(filtroAno.value&&item.ano!==filtroAno.value)return false;
    if(filtroMes.value&&item.mes!==filtroMes.value)return false;
    return true;
  });
  var renderLista=()=>{
    var rows=arquivosFiltrados().sort((a,b)=>String(b.dataIso).localeCompare(String(a.dataIso))||String(b.id).localeCompare(String(a.id)));
    contadorEl.textContent=String(rows.length).padStart(2,"0");
    if(!rows.length){
      var erro=firebase.ultimoErroListagem?`<div style="margin-top:4px;color:#92400e">${cfgEsc(firebase.ultimoErroListagem)}</div>`:"";
      listaEl.innerHTML=`<tr><td class="gestao-empty">Nenhuma escala encontrada.${erro}</td></tr>`;
      return;
    }
    listaEl.innerHTML=rows.map((item)=>`<tr class="gestao-arquivo-row" data-doc-id="${cfgEsc(item.id)}"><td title="${cfgEsc(item.label)}">${cfgEsc(item.label)}</td></tr>`).join("");
  };
  var carregar=async()=>{
    listaEl.innerHTML=`<tr><td class="gestao-empty">Carregando...</td></tr>`;
    contadorEl.textContent="0";
    var lista=await firebase.listarBackups?.()||[];
    arquivos=lista.map((item)=>parseBackupDocGestao(item.id)).filter(Boolean);
    renderFiltros();
    aplicarDefaults();
    renderLista();
  };
  var escolherOrigem=async(docId)=>{
    var origem=arquivos.find((item)=>item.id===docId)||parseBackupDocGestao(docId);
    var result=await firebase.carregar(docId);
    if(!result?.payload){popMsg("Nao foi possivel carregar a escala selecionada.");return;}
    await abrirPopoverDataDuplicacao(origem,result,pop);
  };
  [filtroData,filtroPlantao,filtroAno,filtroMes].forEach((el)=>el.addEventListener("change",()=>renderLista()));
  listaEl.addEventListener("click",(event)=>{var row=event.target.closest("[data-doc-id]");if(row)escolherOrigem(row.dataset.docId);});
  pop.querySelector("[data-act='limpar']").addEventListener("click",()=>{aplicarDefaults();renderLista();});
  pop.querySelector("[data-act='sair']").addEventListener("click",()=>pop.remove());
  carregar();
};
var abrirPagina=async()=>{
  var firebase=await aguardarFirebaseSync();
  if(!firebase){popMsg("Firebase não disponível. Recarregue a página e tente novamente.");return;}
  var anoCorrente=String(new Date().getFullYear());
  var mesCorrente=String(new Date().getMonth()+1).padStart(2,"0");
  var defaultPlantao="DELTA";
  var mesesAno=["01","02","03","04","05","06","07","08","09","10","11","12"];
  var pop=abrirPopArquivo(`
    <div class="gestao-pop abrir">
      <div class="gestao-head">
        <span class="gestao-icon">↗</span>
        <div class="gestao-title">ABRIR UMA ESCALA</div>
        <button class="gestao-close" type="button" data-act="sair" aria-label="Fechar">×</button>
      </div>
      <div class="gestao-open-gap"></div>
      <div class="gestao-open-body">
        <section class="gestao-open-filter" aria-label="Filtros de Arquivos">
          <div class="gestao-open-section-title">FILTROS DE ARQUIVOS</div>
          <label class="gestao-open-field">
            <span>FILTRO POR DATA</span>
            <input id="abrirFiltroData" type="date">
          </label>
          <label class="gestao-open-field">
            <span>FILTRO POR PLANTÃO</span>
            <select id="abrirFiltroPlantao">
              <option value="">TODOS</option>
              <option value="ALFA">ALFA</option>
              <option value="BRAVO">BRAVO</option>
              <option value="CHARLIE">CHARLIE</option>
              <option value="DELTA">DELTA</option>
            </select>
          </label>
          <label class="gestao-open-field">
            <span>FILTRO POR ANO</span>
            <select id="abrirFiltroAno"></select>
          </label>
          <label class="gestao-open-field">
            <span>FILTRO POR MÊS</span>
            <select id="abrirFiltroMes"></select>
          </label>
          <button class="gestao-open-clear" type="button" data-act="limpar">LIMPAR FILTROS</button>
        </section>
        <section class="gestao-open-list" aria-label="Lista de Arquivos">
          <div class="gestao-table-wrap">
            <table class="gestao-arquivo-table">
              <thead>
                <tr><th><span>ARQUIVO</span><span id="abrirContadorArquivos" class="gestao-arquivo-count">0</span></th></tr>
              </thead>
              <tbody id="abrirListaArquivos">
                <tr><td class="gestao-empty">Carregando...</td></tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `);
  var filtroData=pop.querySelector("#abrirFiltroData");
  var filtroPlantao=pop.querySelector("#abrirFiltroPlantao");
  var filtroAno=pop.querySelector("#abrirFiltroAno");
  var filtroMes=pop.querySelector("#abrirFiltroMes");
  var listaEl=pop.querySelector("#abrirListaArquivos");
  var contadorEl=pop.querySelector("#abrirContadorArquivos");
  var arquivos=[];
  var montarOpcao=(valor,label=valor)=>`<option value="${cfgEsc(valor)}">${cfgEsc(label)}</option>`;
  var aplicarDefaults=()=>{
    filtroData.value="";
    filtroPlantao.value=defaultPlantao;
    filtroAno.value=anoCorrente;
    filtroMes.value=mesCorrente;
  };
  var renderFiltros=()=>{
    var anoAnterior=filtroAno.value;
    var mesAnterior=filtroMes.value;
    var anos=[...new Set(arquivos.map((item)=>item.ano).filter(Boolean))].sort((a,b)=>Number(b)-Number(a));
    if(!anos.includes(anoCorrente))anos.unshift(anoCorrente);
    var anosUnicos=[...new Set(anos)];
    filtroAno.innerHTML=montarOpcao("","TODOS")+anosUnicos.map((ano)=>montarOpcao(ano)).join("");
    filtroAno.value=anoAnterior===""||anosUnicos.includes(anoAnterior)?anoAnterior:anoCorrente;
    filtroMes.innerHTML=montarOpcao("","TODOS")+mesesAno.map((mes)=>montarOpcao(mes,`${mes} - ${mesNomeGestao(mes)}`)).join("");
    filtroMes.value=mesAnterior===""||mesesAno.includes(mesAnterior)?mesAnterior:mesCorrente;
  };
  var arquivosFiltrados=()=>arquivos.filter((item)=>{
    if(filtroData.value&&item.dataIso!==filtroData.value)return false;
    if(filtroPlantao.value&&item.plantao!==filtroPlantao.value)return false;
    if(filtroAno.value&&item.ano!==filtroAno.value)return false;
    if(filtroMes.value&&item.mes!==filtroMes.value)return false;
    return true;
  });
  var renderLista=()=>{
    var rows=arquivosFiltrados().sort((a,b)=>String(b.dataIso).localeCompare(String(a.dataIso))||String(b.id).localeCompare(String(a.id)));
    contadorEl.textContent=String(rows.length).padStart(2,"0");
    if(!rows.length){
      var erro=firebase.ultimoErroListagem?`<div style="margin-top:4px;color:#92400e">${cfgEsc(firebase.ultimoErroListagem)}</div>`:"";
      listaEl.innerHTML=`<tr><td class="gestao-empty">Nenhuma escala encontrada.${erro}</td></tr>`;
      return;
    }
    listaEl.innerHTML=rows.map((item)=>`<tr class="gestao-arquivo-row" data-doc-id="${cfgEsc(item.id)}"><td title="${cfgEsc(item.label)}">${cfgEsc(item.label)}</td></tr>`).join("");
  };
  var atualizar=()=>{
    renderFiltros();
    renderLista();
  };
  var carregar=async()=>{
    listaEl.innerHTML=`<tr><td class="gestao-empty">Carregando...</td></tr>`;
    contadorEl.textContent="0";
    var lista=await firebase.listarBackups?.()||[];
    arquivos=lista.map((item)=>parseBackupDocGestao(item.id)).filter(Boolean);
    renderFiltros();
    aplicarDefaults();
    renderLista();
  };
  var abrirDoc=async(docId)=>{
    var meta=arquivos.find((item)=>item.id===docId);
    var result=await firebase.carregar(docId);
    if(!result?.payload){popMsg("Não foi possível carregar a escala selecionada.");return;}
    var estado=cloneGestao(result.payload);
    if(meta)estado.topo={...(estado.topo||{}),data:meta.dataIso,plantao:meta.plantao};
    aplicarEstadoAberto(estado,pop,meta?.label||docId,docId);
  };
  [filtroData,filtroPlantao,filtroAno,filtroMes].forEach((el)=>el.addEventListener("change",()=>renderLista()));
  listaEl.addEventListener("click",(event)=>{
    var row=event.target.closest("[data-doc-id]");
    if(row)abrirDoc(row.dataset.docId);
  });
  pop.querySelector("[data-act='limpar']").addEventListener("click",()=>{aplicarDefaults();renderLista();});
  pop.querySelector("[data-act='sair']").addEventListener("click",()=>pop.remove());
  carregar();
};
