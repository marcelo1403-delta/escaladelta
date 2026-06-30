// Modulo Cadastro: fonte unica em memoria para servidores e integracao com a escala.

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const txt = (value) => String(value || "").trim();
  const norm = (value) => txt(value).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const nomeGrupo = (value) => norm(value);
  const esc = (value) => String(value || "").replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[ch]));
  const dash = (value) => txt(value) || "-";

  const DOM_COLS = [
    "id",
    "matricula",
    "nome",
    "nomecurto",
    "forca",
    "status",
    "plantao",
    "turno",
    "setor",
    "motivoapoio",
    "jornada",
    "horario",
    "motivoausencia",
    "substituto",
    "plantao_pgto_permuta",
    "id_pgto_permuta",
    "status_pgto"
  ];

  let servidores = [];
  let gruposExtraRecorrente = [];
  const EXTRA_GRUPOS_KEY = "escala_extra_grupos_recorrentes";

  function lerDadosIniciais() {
    const tbody = $("svTbody");
    if (!tbody) return [];

    return Array.from(tbody.querySelectorAll("tr")).map((row) => {
      const servidor = {};
      DOM_COLS.forEach((key, index) => {
        servidor[key] = txt(row.children[index]?.textContent);
      });
      servidor.id = txt(row.dataset.id || servidor.id);
      servidor.status = servidor.status || "ATIVO";
      servidor.infoausencia = txt(servidor.infoausencia);
      return servidor;
    });
  }

  function normalizarServidor(s) {
    return {
      id: txt(s.id),
      matricula: txt(s.matricula),
      nome: txt(s.nome).toUpperCase(),
      nomecurto: txt(s.nomecurto || s.nomeCurto).toUpperCase(),
      forca: txt(s.forca).toUpperCase(),
      status: txt(s.status || "ATIVO").toUpperCase(),
      plantao: txt(s.plantao).toUpperCase(),
      turno: txt(s.turno).toUpperCase(),
      setor: txt(s.setor).toUpperCase(),
      motivoapoio: txt(s.motivoapoio).toUpperCase(),
      jornada: txt(s.jornada).toUpperCase(),
      horario: txt(s.horario).toUpperCase(),
      motivoausencia: txt(s.motivoausencia).toUpperCase(),
      substituto: txt(s.substituto).toUpperCase(),
      infoausencia: txt(s.infoausencia).toUpperCase(),
      plantao_pgto_permuta: txt(s.plantao_pgto_permuta).toUpperCase(),
      id_pgto_permuta: txt(s.id_pgto_permuta),
      status_pgto: txt(s.status_pgto).toUpperCase()
    };
  }

  function prepararPermutasIniciais() {
    servidores.forEach((s) => {
      if (norm(s.motivoausencia) !== "PERMUTA" || !s.substituto) return;
      const sub = servidorPorSubstituto(s.substituto);
      if (!sub) return;

      const idExistenteValido = s.id_pgto_permuta && sub.id_pgto_permuta === s.id_pgto_permuta;
      if (sub.id_pgto_permuta && !idExistenteValido) return;

      const idPgto = s.id_pgto_permuta || `PGTO-${s.id}`;
      s.id_pgto_permuta = idPgto;
      sub.motivoapoio = "";
      sub.jornada = "";
      sub.substituto = "";
      sub.status_pgto = "PRESENTE";
      sub.plantao_pgto_permuta = s.plantao || "";
      sub.id_pgto_permuta = idPgto;
    });

    servidores.forEach((origem) => {
      if (norm(origem.motivoausencia) !== "PERMUTA") return;
      const sub = servidorPorSubstituto(origem.substituto);
      const vinculoValido = Boolean(origem.id_pgto_permuta && sub
        && sub.id_pgto_permuta === origem.id_pgto_permuta);
      if (vinculoValido) return;
      if (origem.id_pgto_permuta) limparVinculoPermuta(origem.id_pgto_permuta, origem.id);
      origem.motivoausencia = "";
      origem.substituto = "";
      origem.infoausencia = "";
      limparCamposPgtoPermuta(origem);
    });

    // Um pagamento sem uma origem PERMUTA com o mesmo codigo e um vinculo orfao.
    servidores.forEach((s) => {
      if (!s.id_pgto_permuta || norm(s.motivoausencia) === "PERMUTA") return;
      const temOrigem = servidores.some((origem) => origem.id !== s.id
        && origem.id_pgto_permuta === s.id_pgto_permuta
        && norm(origem.motivoausencia) === "PERMUTA"
        && servidorPorSubstituto(origem.substituto)?.id === s.id);
      if (!temOrigem) limparCamposPgtoPermuta(s);
    });

    servidores.forEach((s) => {
      if (norm(s.motivoausencia) !== "PERMUTA") s.substituto = "";
    });
  }

  function nextId() {
    const maior = servidores.reduce((max, s) => {
      const n = Number.parseInt(s.id, 10);
      return Number.isFinite(n) ? Math.max(max, n) : max;
    }, 0);
    return String(maior + 1).padStart(3, "0");
  }

  function novoIdPgto() {
    return `PGTO-${Date.now().toString(36).toUpperCase()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
  }

  function getVal(id) {
    const el = $(id);
    if (!el) return "";
    if (id === "svId") return txt(el.textContent);
    return txt(el.value);
  }

  function setVal(id, value) {
    const el = $(id);
    if (!el) return;

    if (id === "svId") {
      el.textContent = value || "";
      return;
    }

    if (el.tagName === "SELECT") {
      const optionValue = txt(value);
      if (optionValue && !Array.from(el.options).some((option) => option.value === optionValue || option.textContent === optionValue)) {
        el.add(new Option(optionValue, optionValue));
      }
      el.value = optionValue;
      return;
    }

    el.value = value || "";
  }

  function msg(texto, tipo = "") {
    const el = $("svMsg");
    if (!el) return;
    el.textContent = texto || "";
    el.dataset.tipo = tipo;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.classList.remove("show");
      el.textContent = "";
      el.dataset.tipo = "";
    }, 5000);
  }

  function popover(html) {
    const overlay = document.createElement("div");
    overlay.className = "sv-pop-overlay";
    overlay.innerHTML = `<div class="sv-pop-box">${html}</div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });
    return overlay;
  }

  function pedirCodigoSeguranca(onOk) {
    const overlay = popover(`
      <p class="sv-pop-title">CODIGO DE SEGURANCA</p>
      <p class="sv-pop-text">Digite o codigo para prosseguir.</p>
      <input class="sv-pop-input" id="svPopCodigo" type="password" maxlength="10" autocomplete="off">
      <div class="sv-pop-actions">
        <button class="sv-pop-cancel" id="svPopCancelar" type="button">CANCELAR</button>
        <button class="sv-pop-confirm" id="svPopConfirmar" type="button">CONFIRMAR</button>
      </div>
    `);
    const input = overlay.querySelector("#svPopCodigo");
    const confirmar = () => {
      if (input.value !== "2009") {
        input.value = "";
        input.placeholder = "CODIGO INCORRETO";
        input.classList.add("is-error");
        setTimeout(() => {
          input.placeholder = "";
          input.classList.remove("is-error");
        }, 1400);
        return;
      }
      overlay.remove();
      onOk();
    };

    overlay.querySelector("#svPopCancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#svPopConfirmar").addEventListener("click", confirmar);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") confirmar();
    });
    setTimeout(() => input.focus(), 50);
  }

  function confirmarRemocao(nome, onOk) {
    const overlay = popover(`
      <p class="sv-pop-title">REMOVER REGISTRO</p>
      <p class="sv-pop-text">Confirma a remocao definitiva de <b>${esc(nome)}</b>?</p>
      <div class="sv-pop-actions">
        <button class="sv-pop-cancel" id="svPopCancelar" type="button">CANCELAR</button>
        <button class="sv-pop-confirm danger" id="svPopConfirmar" type="button">REMOVER</button>
      </div>
    `);
    overlay.querySelector("#svPopCancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#svPopConfirmar").addEventListener("click", () => {
      overlay.remove();
      pedirCodigoSeguranca(onOk);
    });
  }

  function vals() {
    const id = getVal("svId");
    const atual = servidores.find((s) => s.id === id) || {};
    return normalizarServidor({
      id,
      forca: getVal("svForca"),
      matricula: getVal("svMatricula"),
      nome: getVal("svNome"),
      nomecurto: getVal("svNomeCurto"),
      status: getVal("svStatus") || "ATIVO",
      plantao: getVal("svPlantao"),
      turno: getVal("svTurno"),
      setor: getVal("svSetor"),
      motivoapoio: getVal("svMotivoApoio"),
      jornada: getVal("svJornada"),
      horario: getVal("svHorario").slice(0, 20),
      motivoausencia: getVal("svMotivoAusencia"),
      substituto: getVal("svSubstituto"),
      infoausencia: getVal("svInfoAusencia").slice(0, 30),
      plantao_pgto_permuta: atual.plantao_pgto_permuta || "",
      id_pgto_permuta: atual.id_pgto_permuta || "",
      status_pgto: getVal("svStatusPgto") || atual.status_pgto || ""
    });
  }

  function badge(forca) {
    const f = norm(forca);
    if (f === "PPF") return '<span class="sv-tag-ppf">PPF</span>';
    if (f === "FPN") return '<span class="sv-tag-fpn">FPN</span>';
    return esc(dash(forca));
  }

  function rowHtml(s) {
    return `<tr data-id="${esc(s.id)}">
      <td class="c-id">${esc(s.id)}</td>
      <td class="c-mat">${esc(dash(s.matricula))}</td>
      <td class="c-nome">${esc(dash(s.nome))}</td>
      <td class="c-curto"><b>${esc(dash(s.nomecurto))}</b></td>
      <td class="c-forca">${badge(s.forca)}</td>
      <td class="c-status">${esc(dash(s.status || "ATIVO"))}</td>
      <td class="c-plantao">${esc(dash(s.plantao))}</td>
      <td class="c-turno">${esc(dash(s.turno))}</td>
      <td class="c-setor">${esc(dash(s.setor))}</td>
      <td class="c-motivo">${esc(dash(s.motivoapoio))}</td>
      <td class="c-jornada">${esc(dash(s.jornada))}</td>
      <td class="c-horario">${esc(dash(s.horario))}</td>
      <td class="c-aus">${esc(dash(s.motivoausencia))}</td>
      <td class="c-sub">${esc(dash(s.substituto))}</td>
      <td class="c-pgto">${esc(dash(s.plantao_pgto_permuta))}</td>
      <td class="c-idpgto">${esc(dash(s.id_pgto_permuta))}</td>
      <td class="c-statuspgto">${esc(dash(s.status_pgto))}</td>
    </tr>`;
  }

  function substitutosElegiveis({ forca, plantao, turno, curId }) {
    const seen = new Set();
    const nomes = [];

    servidores.forEach((s) => {
      const nome = txt(s.nomecurto);
      if (!nome || s.id === curId) return;
      if (forca && norm(s.forca) !== forca) return;
      if (plantao && norm(s.plantao) === plantao) return;
      if (turno && norm(s.turno) !== turno) return;
      if (norm(s.status || "ATIVO") !== "ATIVO") return;
      if (!s.plantao) return;
      if (s.motivoausencia) return;
      if (s.id_pgto_permuta) return;
      if (seen.has(nome)) return;

      seen.add(nome);
      nomes.push(nome);
    });

    return nomes;
  }

  function popularSubstitutos(valorAtual) {
    const sel = $("svSubstituto");
    if (!sel) return;

    sel.replaceChildren(new Option("SUBSTITUTO*", ""));
    sel.options[0].disabled = true;
    sel.options[0].hidden = true;

    substitutosElegiveis({
      forca: norm(getVal("svForca")),
      plantao: norm(getVal("svPlantao")),
      turno: norm(getVal("svTurno")),
      curId: getVal("svId")
    }).forEach((nome) => sel.add(new Option(nome, nome)));

    const valor = txt(valorAtual);
    if (valor && !Array.from(sel.options).some((option) => option.value === valor)) {
      sel.add(new Option(valor, valor));
    }
    sel.value = valor;
  }

  function servidorPorSubstituto(valor) {
    const ref = norm(valor);
    if (!ref) return null;
    return servidores.find((s) => norm(s.id) === ref || norm(s.nomecurto) === ref || norm(s.nome) === ref) || null;
  }

  function permutaOrigemDoPgto(s) {
    if (!s?.id || !s.id_pgto_permuta) return null;
    return servidores.find((origem) => {
      if (origem.id === s.id) return false;
      if (origem.id_pgto_permuta !== s.id_pgto_permuta) return false;
      if (norm(origem.motivoausencia) !== "PERMUTA") return false;
      const substituto = servidorPorSubstituto(origem.substituto);
      return substituto?.id === s.id;
    }) || null;
  }

  function setSectionOpen(n, open) {
    const body = $(`svBody${n}`);
    const btn = $(`svToggle${n}`);
    if (!body || !btn) return;
    body.style.display = open ? "" : "none";
    btn.classList.toggle("sv-open", open);
  }

  function setSectionEnabled(n, enabled) {
    const btn = $(`svToggle${n}`);
    if (btn) btn.disabled = !enabled;
    if (!enabled) setSectionOpen(n, false);
  }

  function setDirty(on) {
    const btn = $("svBtnGravar");
    if (!btn) return;

    if (!getVal("svId")) {
      const v = vals();
      btn.disabled = !(v.forca && v.matricula && v.nome && v.nomecurto);
      return;
    }

    btn.disabled = !on;
  }

  function updateLocks() {
    const id = getVal("svId");
    const hasId = Boolean(id);
    const reg = servidores.find((s) => s.id === id);
    const hasPlantao = Boolean(reg && reg.plantao);
    const isPgtoReg = Boolean(reg && permutaOrigemDoPgto(reg));

    $("svForm")?.classList.toggle("sv-loaded", hasId);
    document.querySelectorAll("#svForm select").forEach((select) => {
      select.classList.toggle("sv-empty", !select.value);
    });

    const statusWrap = $("svStatusWrap");
    if (statusWrap) statusWrap.hidden = !hasId;

    const status = $("svStatus");
    if (status) status.disabled = !hasId;

    ["svPlantao", "svTurno", "svSetor"].forEach((idCampo) => {
      const el = $(idCampo);
      if (el) el.disabled = false;
    });

    const canSec3 = hasId;
    const clear3 = document.querySelector('[data-clear="3"]');
    if (clear3) clear3.disabled = !canSec3;
    ["svMotivoApoio", "svJornada", "svHorario"].forEach((idCampo) => {
      const el = $(idCampo);
      if (!el) return;
      el.disabled = !canSec3;
      if (!canSec3) el.value = "";
    });
    if (grupoDoServidorRecorrente(id)) setCamposPresencaServidorDisabled(true);
    setSectionEnabled(3, canSec3);

    const canSec4 = hasId && hasPlantao;
    const clear4 = document.querySelector('[data-clear="4"]');
    if (clear4) clear4.disabled = !canSec4;
    ["svMotivoAusencia", "svInfoAusencia"].forEach((idCampo) => {
      const el = $(idCampo);
      if (!el) return;
      el.disabled = !canSec4 || (idCampo === "svInfoAusencia" && isPgtoReg);
    });
    setSectionEnabled(4, canSec4);

    const motAus = norm(getVal("svMotivoAusencia"));
    const isPermuta = canSec4 && motAus === "PERMUTA" && !isPgtoReg;
    const subWrap = $("svSubstitutoWrap");
    if (subWrap) subWrap.hidden = !isPermuta;
    const sub = $("svSubstituto");
    if (sub) {
      sub.disabled = !isPermuta;
      if (!isPermuta) setVal("svSubstituto", "");
    }

    const motivo = $("svMotivoAusencia");
    if (motivo) {
      Array.from(motivo.options).forEach((option) => {
        if (norm(option.value) === "PERMUTA") option.disabled = isPgtoReg;
      });
    }

    const btnRm = $("svBtnRemover");
    if (btnRm) btnRm.disabled = !hasId;
    setDirty(hasId);
  }

  function fillForm(s) {
    setVal("svId", s.id);
    setVal("svForca", s.forca);
    setVal("svMatricula", s.matricula);
    setVal("svNome", s.nome);
    setVal("svNomeCurto", s.nomecurto);
    setVal("svStatus", s.status || "ATIVO");
    setVal("svPlantao", s.plantao);
    setVal("svTurno", s.turno);
    setVal("svSetor", s.setor);
    setVal("svMotivoApoio", s.motivoapoio);
    setVal("svJornada", s.jornada);
    setVal("svHorario", s.horario);
    setVal("svMotivoAusencia", s.motivoausencia);
    setVal("svInfoAusencia", s.infoausencia);
    popularSubstitutos(s.substituto);

    setSectionOpen(3, Boolean(s.motivoapoio));
    setSectionOpen(4, Boolean(s.motivoausencia));

    const origemPgto = permutaOrigemDoPgto(s);
    const temPgto = Boolean(s.id && s.id_pgto_permuta && origemPgto);
    const sec5 = $("svSec5");
    if (sec5) sec5.hidden = !temPgto;

    if (temPgto) {
      if ($("svPgtoSubstituindo")) $("svPgtoSubstituindo").textContent = origemPgto.nomecurto || "-";
      if ($("svPgtoPlantao")) $("svPgtoPlantao").textContent = origemPgto.plantao || s.plantao_pgto_permuta || "-";
      setVal("svStatusPgto", s.status_pgto || "PRESENTE");
    } else {
      if ($("svPgtoSubstituindo")) $("svPgtoSubstituindo").textContent = "-";
      if ($("svPgtoPlantao")) $("svPgtoPlantao").textContent = "-";
      setVal("svStatusPgto", "");
    }

    updateLocks();
    renderServidorRecorrenteForm();
    setDirty(false);
  }

  function clearForm() {
    [
      "svId",
      "svMatricula",
      "svNome",
      "svNomeCurto",
      "svStatus",
      "svPlantao",
      "svTurno",
      "svSetor",
      "svMotivoApoio",
      "svJornada",
      "svHorario",
      "svMotivoAusencia",
      "svSubstituto",
      "svInfoAusencia",
      "svStatusPgto"
    ].forEach((id) => setVal(id, ""));

    setVal("svForca", "PPF");
    const sec5 = $("svSec5");
    if (sec5) sec5.hidden = true;
    if ($("svPgtoSubstituindo")) $("svPgtoSubstituindo").textContent = "-";
    if ($("svPgtoPlantao")) $("svPgtoPlantao").textContent = "-";
    document.querySelectorAll("#svTbody tr").forEach((row) => row.classList.remove("sv-row-selected", "is-selected"));
    setSectionOpen(3, false);
    setSectionOpen(4, false);
    updateLocks();
    renderServidorRecorrenteForm();
    setDirty(false);
  }

  function clearSection(n) {
    const map = {
      2: ["svPlantao", "svTurno", "svSetor", "svMotivoApoio", "svJornada", "svHorario", "svMotivoAusencia", "svSubstituto", "svInfoAusencia", "svStatusPgto"],
      3: ["svMotivoApoio", "svJornada", "svHorario"],
      4: ["svMotivoAusencia", "svSubstituto", "svInfoAusencia"]
    };
    (map[n] || []).forEach((id) => setVal(id, ""));
    if (n === 3) {
      if ($("svRecorrente")) $("svRecorrente").checked = false;
      if ($("svRecGrupo")) $("svRecGrupo").value = "";
      alternarCamposGrupoServidor();
    }
    if (n === 2) {
      const sec5 = $("svSec5");
      if (sec5) sec5.hidden = true;
      if ($("svPgtoSubstituindo")) $("svPgtoSubstituindo").textContent = "-";
      if ($("svPgtoPlantao")) $("svPgtoPlantao").textContent = "-";
      setSectionOpen(3, false);
      setSectionOpen(4, false);
    }
    updateLocks();
    renderServidorRecorrenteForm();
    setDirty(true);
  }

  function validate() {
    const v = vals();
    const isInsert = !v.id;
    const fail = (message) => {
      msg(message, "erro");
      return null;
    };

    if (!v.forca) return fail("CAMPO OBRIGATORIO: FORCA");
    if (!v.matricula) return fail("CAMPO OBRIGATORIO: MATRICULA");
    if (!v.nome) return fail("CAMPO OBRIGATORIO: NOME COMPLETO");
    if (!v.nomecurto) return fail("CAMPO OBRIGATORIO: NOME CURTO");
    if (!isInsert && !v.status) return fail("CAMPO OBRIGATORIO: STATUS");

    const outros = servidores.filter((s) => s.id !== v.id);
    if (outros.some((s) => norm(s.matricula) === norm(v.matricula) && v.matricula)) return fail("MATRICULA JA EXISTE NO CADASTRO.");
    if (outros.some((s) => norm(s.nome) === norm(v.nome) && v.nome)) return fail("NOME COMPLETO JA EXISTE NO CADASTRO.");
    if (outros.some((s) => norm(s.nomecurto) === norm(v.nomecurto) && v.nomecurto)) return fail("NOME CURTO JA EXISTE NO CADASTRO.");

    const sec2 = v.plantao || v.turno || v.setor;
    if (sec2 && !v.plantao) return fail("CAMPO OBRIGATORIO: PLANTAO");
    if (sec2 && !v.turno) return fail("CAMPO OBRIGATORIO: TURNO");
    if (sec2 && !v.setor) return fail("CAMPO OBRIGATORIO: SETOR");

    const sec3 = v.motivoapoio || v.jornada || v.horario;
    if (sec3 && !v.motivoapoio) return fail("CAMPO OBRIGATORIO: MOTIVO PRESENCA");
    if (sec3 && !v.jornada) return fail("CAMPO OBRIGATORIO: JORNADA");
    if ($("svRecorrente")?.checked && !$("svRecGrupo")?.value) return fail("CAMPO OBRIGATORIO: GRUPO");

    const sec4 = v.motivoausencia || v.substituto || v.infoausencia;
    if (sec4 && !v.motivoausencia) return fail("CAMPO OBRIGATORIO: MOTIVO AUSENCIA");
    if (sec4 && norm(v.motivoausencia) === "PERMUTA") {
      if (!v.plantao) return fail("CAMPO OBRIGATORIO: PLANTAO");
      if (!v.substituto) return fail("CAMPO OBRIGATORIO: SUBSTITUTO");
      const sub = servidorPorSubstituto(v.substituto);
      if (!sub) return fail("SUBSTITUTO NAO LOCALIZADO.");
      if (!sub.plantao) return fail("SUBSTITUTO SEM PLANTAO.");
      if (sub.id_pgto_permuta && sub.id_pgto_permuta !== v.id_pgto_permuta) return fail("SUBSTITUTO JA VINCULADO A OUTRA PERMUTA.");
    }

    const atual = servidores.find((s) => s.id === v.id);
    const isPgtoReg = Boolean(atual && permutaOrigemDoPgto(atual));
    if (isPgtoReg && norm(v.status_pgto || atual.status_pgto) === "AUSENTE" && !v.motivoausencia) {
      return fail("CAMPO OBRIGATORIO: MOTIVO AUSENCIA");
    }

    return v;
  }

  function limparCamposPgtoPermuta(s) {
    if (!s) return;
    s.plantao_pgto_permuta = "";
    s.id_pgto_permuta = "";
    s.status_pgto = "";
  }

  function limparVinculoPermuta(idPgto, excetoId) {
    if (!idPgto) return;
    servidores.forEach((s) => {
      if (s.id_pgto_permuta === idPgto && s.id !== excetoId) {
        limparCamposPgtoPermuta(s);
      }
    });
  }

  function removerEventoPermuta(idPgto) {
    if (!idPgto) return;
    servidores.forEach((s) => {
      if (s.id_pgto_permuta !== idPgto) return;
      if (norm(s.motivoausencia) === "PERMUTA") {
        s.motivoausencia = "";
        s.substituto = "";
        s.infoausencia = "";
      }
      limparCamposPgtoPermuta(s);
    });
  }

  function aplicarPermuta(v, antigo) {
    const querPermuta = norm(v.motivoausencia) === "PERMUTA" && Boolean(v.substituto);
    const sub = querPermuta ? servidorPorSubstituto(v.substituto) : null;
    if (querPermuta && !sub) {
      msg("SUBSTITUTO NAO LOCALIZADO.", "erro");
      return false;
    }
    if (sub?.id_pgto_permuta && sub.id_pgto_permuta !== antigo?.id_pgto_permuta) {
      msg("SUBSTITUTO JA VINCULADO A OUTRA PERMUTA.", "erro");
      return false;
    }

    if (antigo?.id_pgto_permuta) limparVinculoPermuta(antigo.id_pgto_permuta, v.id);

    const atual = servidores.find((s) => s.id === v.id);
    if (!atual) return false;

    if (!querPermuta) {
      limparCamposPgtoPermuta(atual);
      return true;
    }

    const idPgto = novoIdPgto();
    atual.id_pgto_permuta = idPgto;
    sub.plantao_pgto_permuta = v.plantao || "";
    sub.id_pgto_permuta = idPgto;
    sub.status_pgto = "PRESENTE";
    sub.substituto = "";
    return true;
  }

  function mudouSecao1(antigo, novo) {
    if (!antigo) return false;
    return ["forca", "matricula", "nome", "nomecurto", "status"].some((key) => norm(antigo[key]) !== norm(novo[key]));
  }

  function escalaEncerradaAberta() {
    return window._escalaAbertaStatus === "encerrado" && !window._modoEdicaoForcado;
  }

  function sincronizarAbaEscala() {
    if (escalaEncerradaAberta()) return;
    if (typeof window.sincronizarTudoServidores === "function") {
      window.sincronizarTudoServidores("cadastro");
      return;
    }
    if (typeof window.renderEfetivo === "function") window.renderEfetivo();
    if (typeof window.renderAusentes === "function") window.renderAusentes();
    if (typeof window.renderExtras === "function") window.renderExtras();
    if (typeof window.validarResponsaveisAusentesPlantaoAtual === "function") window.validarResponsaveisAusentesPlantaoAtual();
    if (typeof window.renderResponsaveisPostos === "function") window.renderResponsaveisPostos();
  }

  function concluirSave(v) {
    const isInsert = !v.id;
    let antigo = null;
    let isPgtoReg = false;

    if (!isInsert) {
      antigo = servidores.find((s) => s.id === v.id);
      isPgtoReg = Boolean(antigo && permutaOrigemDoPgto(antigo));
    }

    if (!isInsert && norm(v.status) === "INATIVO") {
      v.plantao = "";
      v.turno = "";
      v.setor = "";
      v.motivoapoio = "";
      v.jornada = "";
      v.horario = "";
      v.motivoausencia = "";
      v.substituto = "";
      v.infoausencia = "";
      v.plantao_pgto_permuta = "";
      v.id_pgto_permuta = "";
      v.status_pgto = "";
    }

    if (isPgtoReg && norm(v.status_pgto || antigo?.status_pgto || "PRESENTE") === "PRESENTE") {
      v.motivoausencia = "";
      v.substituto = "";
      v.infoausencia = "";
      v.status_pgto = "PRESENTE";
    }

    if (isInsert) {
      v.id = nextId();
      v.status = "ATIVO";
      servidores.push(v);
    } else {
      const index = servidores.findIndex((s) => s.id === v.id);
      if (index >= 0) {
        servidores[index] = v;
      } else {
        v.id = nextId();
        v.status = "ATIVO";
        servidores.push(v);
      }
    }

    if (!isPgtoReg) aplicarPermuta(v, antigo);
    if ($("svRecorrente")?.checked) {
      associarServidorAoGrupoRecorrente(v.id, txt($("svRecGrupo")?.value), v.motivoapoio, v.jornada, v.horario);
    }
    renderTable();
    clearForm();
    sincronizarAbaEscala();
    atualizarPopoverRecorrentesAberto();
    if (!escalaEncerradaAberta()) {
      if (typeof window.validarResponsaveisAusentesPlantaoAtual === "function") window.validarResponsaveisAusentesPlantaoAtual();
      if (typeof window.renderResponsaveisViews === "function") window.renderResponsaveisViews();
      if (typeof window.renderResponsaveisPostos === "function") window.renderResponsaveisPostos();
      if (typeof window.removerAlocacoesSemPresenca === "function") {
        window.removerAlocacoesSemPresenca();
        renderEfetivo();
      }
    }
    msg("registro gravado com sucesso!");
  }

  function save() {
    const v = validate();
    if (!v) return;
    const isInsert = !v.id;
    const antigo = isInsert ? null : servidores.find((s) => s.id === v.id);

    if (!isInsert && mudouSecao1(antigo, v)) {
      pedirCodigoSeguranca(() => concluirSave(v));
      return;
    }

    concluirSave(v);
  }

  function remove() {
    const id = getVal("svId");
    if (!id) return;

    const alvo = servidores.find((s) => s.id === id);
    if (!alvo) return;

    confirmarRemocao(alvo.nomecurto || alvo.nome || id, () => {
      if (alvo.id_pgto_permuta) removerEventoPermuta(alvo.id_pgto_permuta);
      servidores = servidores.filter((s) => s.id !== id);
      renderTable();
      clearForm();
      sincronizarAbaEscala();
      if (!escalaEncerradaAberta()) {
        if (typeof window.validarResponsaveisAusentesPlantaoAtual === "function") window.validarResponsaveisAusentesPlantaoAtual();
        if (typeof window.renderResponsaveisViews === "function") window.renderResponsaveisViews();
        if (typeof window.renderResponsaveisPostos === "function") window.renderResponsaveisPostos();
        if (typeof window.removerAlocacoesSemPresenca === "function") {
          window.removerAlocacoesSemPresenca();
          renderEfetivo();
        }
      }
      msg("registro removido com sucesso");
    });
  }

  function filterRows() {
    const q = norm($("svBusca")?.value || "");
    const terms = q.split(";").map((item) => item.trim()).filter(Boolean);
    const fStatus = norm($("svFiltroStatus")?.value);
    const fForca = norm($("svFiltroForca")?.value);
    const fPlantao = norm($("svFiltroPlantao")?.value);
    let visiveis = 0;

    document.querySelectorAll("#svTbody tr").forEach((row) => {
      const s = servidores.find((item) => item.id === row.dataset.id);
      if (!s) {
        row.hidden = true;
        return;
      }

      const okStatus = !fStatus || norm(s.status || "ATIVO") === fStatus;
      const okForca = !fForca || norm(s.forca) === fForca;
      const okPlantao = !fPlantao || norm(s.plantao) === fPlantao;
      const okBusca = !terms.length || terms.every((term) => norm(row.textContent).includes(term));
      const show = okStatus && okForca && okPlantao && okBusca;

      row.hidden = !show;
      row.style.display = show ? "" : "none";
      if (show) visiveis += 1;
    });

    if ($("svCount")) $("svCount").textContent = `${visiveis} de ${servidores.length}`;
  }

  function forcaEfetivoAtiva() {
    const active = document.querySelector(".lp-force-btn.active");
    return norm(active?.dataset.force || window._forcaAtiva || "PPF");
  }

  function filtroEfetivoAtivo() {
    const active = document.querySelector(".srv-filtro-v9.active");
    return norm(active?.dataset.status || window._filtroEfetivoV9 || "presente").toLowerCase();
  }

  function dataTopoValida() {
    const value = txt($("topoDatePicker")?.value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [ano, mes, dia] = value.split("-").map(Number);
    const data = new Date(ano, mes - 1, dia);
    return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
  }

  function plantaoValido(value) {
    return ["ALFA", "BRAVO", "CHARLIE", "DELTA"].includes(norm(value));
  }

  function plantaoEfetivoAtivo() {
    const plantao = norm($("topoPlantaoDia")?.textContent || window._nomePlantao || "");
    return plantaoValido(plantao) ? plantao : "";
  }

  function dateFromInput(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [ano, mes, dia] = value.split("-").map(Number);
    const data = new Date(ano, mes - 1, dia);
    if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
    return data;
  }

  function serialPlanilha(data) {
    const excelBase = Date.UTC(1899, 11, 30);
    const utcDia = Date.UTC(data.getFullYear(), data.getMonth(), data.getDate());
    return Math.floor((utcDia - excelBase) / 86400000);
  }

  function plantaoPorData(data) {
    return ["ALFA", "BRAVO", "CHARLIE", "DELTA"][serialPlanilha(data) % 4];
  }

  function diaSemana(data) {
    return ["DOMINGO", "SEGUNDA-FEIRA", "TERCA-FEIRA", "QUARTA-FEIRA", "QUINTA-FEIRA", "SEXTA-FEIRA", "SABADO"][data.getDay()];
  }

  function atualizarTopoPlantao() {
    const data = dateFromInput($("topoDatePicker")?.value || "");
    const diaEl = $("topoDiaSemana");
    const plantaoEl = $("topoPlantaoDia");

    if (!data) {
      if (diaEl) diaEl.textContent = "";
      if (plantaoEl) plantaoEl.textContent = "";
      window._nomePlantao = "";
      renderEfetivo();
      if (typeof window.renderResponsaveisViews === "function") window.renderResponsaveisViews();
      return;
    }

    const plantao = plantaoPorData(data);
    if (diaEl) diaEl.textContent = diaSemana(data);
    if (plantaoEl) plantaoEl.textContent = plantao;
    window._nomePlantao = plantao;
    renderEfetivo();
    if (typeof window.renderResponsaveisViews === "function") window.renderResponsaveisViews();
  }

  function nomeCurtoServidor(s) {
    return txt(s?.nomecurto || s?.nome || "");
  }

  function nomeCompletoServidor(s) {
    return txt(s?.nome || "");
  }

  function obsJoin(partes) {
    return partes.map(txt).filter(Boolean).join(" | ");
  }

  function origemPermutaDoSubstituto(substituto) {
    if (!substituto?.id_pgto_permuta) return null;
    return servidores.find((origem) => {
      if (origem.id === substituto.id) return false;
      if (origem.id_pgto_permuta !== substituto.id_pgto_permuta) return false;
      if (norm(origem.motivoausencia) !== "PERMUTA") return false;
      const ref = servidorPorSubstituto(origem.substituto);
      return ref?.id === substituto.id || norm(origem.substituto) === norm(substituto.id) || norm(origem.substituto) === norm(substituto.nomecurto) || norm(origem.substituto) === norm(substituto.nome);
    }) || null;
  }

  function montarEfetivo(forca, plantao) {
    const rows = [];
    const ativos = servidores.filter((s) => norm(s.status || "ATIVO") === "ATIVO" && norm(s.forca) === forca);

    ativos.forEach((s) => {
      const mesmoPlantao = norm(s.plantao) === plantao;
      const motivoAusencia = norm(s.motivoausencia);

      if (mesmoPlantao && !motivoAusencia) {
        rows.push({
          id: s.id,
          nome: nomeCurtoServidor(s),
          forca: s.forca,
          turno: s.jornada || s.turno,
          sit: "pres",
          tipo: s.motivoapoio ? "extra" : "fixo",
          obs: s.motivoapoio ? obsJoin([s.motivoapoio, s.turno, s.horario]) : ""
        });
        return;
      }

      if (mesmoPlantao && motivoAusencia === "PERMUTA" && !s.motivoapoio) {
        rows.push({
          id: s.id,
          nome: nomeCurtoServidor(s),
          forca: s.forca,
          turno: s.turno,
          sit: "aus",
          tipo: "folgante",
          obs: obsJoin(["FOLGA PERMUTA", s.substituto])
        });
        return;
      }

      if (mesmoPlantao && motivoAusencia && motivoAusencia !== "PERMUTA" && !s.motivoapoio) {
        rows.push({
          id: s.id,
          nome: nomeCurtoServidor(s),
          forca: s.forca,
          turno: s.jornada || s.turno,
          sit: "aus",
          tipo: "comum",
          obs: s.motivoausencia
        });
      }
    });

    ativos.forEach((s) => {
      if (norm(s.plantao) === plantao) return;
      if (norm(s.motivoausencia)) return;
      if (!s.id_pgto_permuta || norm(s.plantao_pgto_permuta) !== plantao) return;
      const statusPgto = norm(s.status_pgto || "PRESENTE");
      if (statusPgto !== "PRESENTE") return;
      const origem = origemPermutaDoSubstituto(s);

      rows.push({
        id: s.id,
        nome: nomeCurtoServidor(s),
        forca: s.forca,
        turno: s.turno,
        sit: "pres",
        tipo: "permutante",
        obs: obsJoin(["PGTO PERMUTA", nomeCurtoServidor(origem)])
      });
    });

    ativos.forEach((s) => {
      if (norm(s.plantao) === plantao) return;
      if (!norm(s.motivoausencia)) return;
      if (!s.id_pgto_permuta || norm(s.plantao_pgto_permuta) !== plantao) return;
      if (norm(s.status_pgto || "AUSENTE") !== "AUSENTE") return;
      const origem = origemPermutaDoSubstituto(s);

      rows.push({
        id: s.id,
        nome: nomeCurtoServidor(s),
        forca: s.forca,
        turno: s.turno,
        sit: "aus",
        tipo: "permutante",
        obs: obsJoin(["FALTOU!", "PGTO PERMUTA", nomeCurtoServidor(origem)])
      });
    });

    ativos.forEach((s) => {
      if (s.plantao && norm(s.plantao) === plantao) return;
      if (norm(s.motivoausencia)) return;
      if (!s.motivoapoio) return;

      rows.push({
        id: s.id,
        nome: nomeCurtoServidor(s),
        forca: s.forca,
        turno: s.jornada,
        sit: "pres",
        tipo: "extra",
        obs: obsJoin([s.motivoapoio, s.turno, s.horario])
      });
    });

    const ordemSit = { pres: 1, aus: 2 };
    return rows.sort((a, b) => (ordemSit[a.sit] || 9) - (ordemSit[b.sit] || 9) || a.nome.localeCompare(b.nome));
  }

  function atualizarResumoForcas(plantao = plantaoEfetivoAtivo()) {
    document.querySelectorAll(".force-block").forEach((block) => {
      const forca = block.classList.contains("force-fpn") ? "FPN" : "PPF";
      const rows = plantao ? montarEfetivo(forca, plantao) : [];
      const presentes = rows.filter((row) => row.sit === "pres");
      const turno = (row) => norm(row.turno);
      const diurno = presentes.filter((row) => turno(row) === "24H" || turno(row) === "DIURNO").length;
      const noturno = presentes.filter((row) => turno(row) === "24H" || turno(row) === "NOTURNO").length;
      const ausentes = rows.filter((row) => row.sit === "aus" && row.tipo === "comum").length;
      const permutas = rows.filter((row) => row.tipo === "folgante").length;
      const extras = rows.filter((row) => row.tipo === "extra").length;
      const set = (selector, value, prefix = "") => {
        const el = block.querySelector(selector);
        if (el) el.textContent = `${prefix}${String(value).padStart(2, "0")}`;
      };
      set(".stat-day", diurno, "\u2600 ");
      set(".stat-night", noturno, "\u263e ");
      set(".stat-aus", ausentes);
      set(".stat-perm", permutas);
      set(".stat-extra", extras);
    });
  }

  const filtroEfetivoMsgs = {
    presente: "Todos os presentes no plantao",
    ausente: "Ausentes que NAO estao de permuta.",
    permuta: "Ausentes por permuta e faltas no pgto. de permuta.",
    extra: "Presencas extras no plantao (exceto pgto. de permuta).",
    todos: "Todos os presentes e ausentes do plantao."
  };

  function filtrarEfetivoRows(rows, filtro = filtroEfetivoAtivo()) {
    if (filtro === "todos") return rows.filter((row) => row.sit === "pres" || row.sit === "aus");
    if (filtro === "ausente") return rows.filter((row) => row.sit === "aus" && row.tipo === "comum");
    if (filtro === "permuta") return rows.filter((row) => row.sit === "aus" && (row.tipo === "folgante" || row.tipo === "permutante"));
    if (filtro === "extra") return rows.filter((row) => row.sit === "pres" && row.tipo === "extra");
    return rows.filter((row) => row.sit === "pres");
  }

  function nomesAlocadosTabela(ids) {
    const nomes = new Set();
    ids.forEach((id) => {
      document.querySelectorAll(`#${id} tbody td`).forEach((td) => {
        const value = norm(td.querySelector(".s03-alocado-nome")?.textContent || td.dataset.nomeAlocado || td.textContent);
        if (value) nomes.add(value);
      });
    });
    return nomes;
  }

  function alocacoesEfetivo() {
    return {
      diurno: nomesAlocadosTabela(["tbl-T2", "tbl-T3"]),
      noturno: nomesAlocadosTabela(["tbl-T4", "tbl-T5"])
    };
  }

  function turnoIcones(row, alocacoes) {
    const n = norm(row?.nome);
    const sit = norm(row?.sit);
    const turno = norm(row?.turno);
    const diurnoOk = turno === "24H" || turno === "DIURNO";
    const noturnoOk = turno === "24H" || turno === "NOTURNO";
    const diurnoAlocado = sit === "PRES" && diurnoOk && alocacoes.diurno.has(n);
    const noturnoAlocado = sit === "PRES" && noturnoOk && alocacoes.noturno.has(n);
    const sol = diurnoOk
      ? `<span class="turno-icon icon-sol ${diurnoAlocado ? "is-alocado" : "is-outline"}" title="${diurnoAlocado ? "Alocado no diurno" : "Apto ao diurno"}">${diurnoAlocado ? "☀" : "☼"}</span>`
      : '<span class="turno-icon icon-proibido" title="Turno noturno: não aloca no diurno">⊘</span>';
    const lua = noturnoOk
      ? `<span class="turno-icon icon-lua ${noturnoAlocado ? "is-alocado" : "is-outline"}" title="${noturnoAlocado ? "Alocado no noturno" : "Apto ao noturno"}">${noturnoAlocado ? "☾" : "☾"}</span>`
      : '<span class="turno-icon icon-proibido" title="Turno diurno: não aloca no noturno">⊘</span>';
    return {
      d: sit === "PRES" ? sol : "",
      n: sit === "PRES" ? lua : "",
      dClass: sit === "PRES" ? (diurnoAlocado ? " is-dia-alocado" : (diurnoOk ? " is-dia-apto" : " is-dia-bloqueado")) : "",
      nClass: sit === "PRES" ? (noturnoAlocado ? " is-noite-alocado" : (noturnoOk ? " is-noite-apto" : " is-noite-bloqueado")) : ""
    };
  }

  function situacaoCurta(sit) {
    return norm(sit) === "AUS" ? "AUS" : "PRES";
  }

  function situacaoClasse(sit) {
    return `sit-${situacaoCurta(sit).toLowerCase()}`;
  }

  function situacaoBotao(sit) {
    const curta = situacaoCurta(sit);
    return `<button class="sit-btn ${situacaoClasse(sit)}-btn" type="button">${curta}</button>`;
  }

  function badgeResponsavelEfetivo(nome) {
    const badges = window._badgesResponsaveisEfetivo?.get(norm(nome)) || [];
    return (Array.isArray(badges) ? badges : [badges]).filter(Boolean).map((badge) => `<span class="eft-resp-badge">${esc(badge)}</span>`).join("");
  }

  function efetivoRowHtml(row, index, alocacoes) {
    const icones = turnoIcones(row, alocacoes);
    const badge = badgeResponsavelEfetivo(row.nome);
    const alocar = window.s03EstadoAlocarEfetivo?.(row.nome, row.forca) || { ativo: false, disabled: false, selected: false };
    const situacaoClass = row.sit === "aus" ? "is-ausente" : "is-presente";
    const tipoClass = row.tipo === "folgante" ? " is-folgante" : "";
    const alocarDisabled = alocar.disabled || row.sit !== "pres";
    const alocarClass = alocar.ativo ? ` is-alocar-row${alocar.selected && !alocarDisabled ? " is-alocar-selected" : ""}${alocarDisabled ? " s03-efetivo-disabled" : ""}` : "";
    // NOVO: dropdown é o método principal de alocação; arrastar do Efetivo foi desativado.
    const draggable = "";
    return `<tr class="${situacaoClass}${tipoClass}${alocarClass}" data-id="${esc(row.id)}" data-nome="${esc(row.nome)}" data-forca="${esc(row.forca)}" data-sit="${esc(row.sit)}" data-tipo="${esc(row.tipo)}"${draggable}>
      <td class="cn">${String(index + 1).padStart(2, "0")}</td>
      <td class="st ${situacaoClasse(row.sit)}">${situacaoBotao(row.sit)}</td>
      <td class="nm"><span class="eft-nome-text">${esc(row.nome)}</span>${badge}</td>
      <td class="su${icones.dClass}">${icones.d}</td>
      <td class="mo${icones.nClass}">${icones.n}</td>
      <td class="ob">${esc(row.obs)}</td>
      <td class="hidden-logica">${esc(row.id)}</td>
      <td class="hidden-logica">${esc(row.tipo)}</td>
      <td class="hidden-logica">${esc(row.turno)}</td>
    </tr>`;
  }

  function renderEfetivo() {
    const tbody = $("eftCanonicoBody");
    const msgEl = $("efetivoFiltroMsg");
    const clearBtn = $("btnEfetivoLimparFiltro");
    if (!tbody) return;

    const filtro = filtroEfetivoAtivo();
    if (msgEl) msgEl.textContent = filtroEfetivoMsgs[filtro] || "";
    clearBtn?.classList.toggle("is-hidden", filtro === "presente");

    const plantao = plantaoEfetivoAtivo();
    if (!dataTopoValida() || !plantao) {
      tbody.innerHTML = "";
      window._efetivoRows = [];
      window._efetivoAllRows = [];
      atualizarResumoForcas("");
      return;
    }

    atualizarResumoForcas(plantao);
    const forcaAtiva = forcaEfetivoAtiva();
    const allRows = montarEfetivo(forcaAtiva, plantao);
    window._efetivoAllRows = ["PPF", "FPN"].flatMap((forca) => montarEfetivo(forca, plantao));
    const rows = filtrarEfetivoRows(allRows, filtro);
    const alocacoes = alocacoesEfetivo();
    window._efetivoRows = rows;
    tbody.innerHTML = rows.length
      ? rows.map((row, index) => efetivoRowHtml(row, index, alocacoes)).join("")
      : `<tr><td class="cn"></td><td class="st"></td><td class="nm"></td><td class="su"></td><td class="mo"></td><td class="ob"></td><td class="hidden-logica"></td><td class="hidden-logica"></td><td class="hidden-logica"></td></tr>`;
  }

  function fecharPopSecao01(pop) {
    if (!pop) return;
    pop.classList.remove("is-open");
    pop.setAttribute("aria-hidden", "true");
  }

  function popularMotivosPopover(select, config = {}) {
    if (!select) return;
    const disablePermuta = Boolean(config.disablePermuta);
    select.innerHTML = ["", "ATESTADO", "COMPENSACAO", "FERIAS", "LICENCA", "MISSAO", "OUTROS", "PERMUTA"]
      .map((motivo) => `<option value="${motivo}"${motivo ? "" : " disabled hidden"}${motivo === "PERMUTA" && disablePermuta ? " disabled" : ""}>${motivo || "MOTIVO*"}</option>`)
      .join("");
    select.value = config.value || "";
  }

  function popularSubstitutosPopover(select, servidor, valorAtual = "") {
    if (!select || !servidor) return;
    select.replaceChildren(new Option("SUBSTITUTO*", ""));
    select.options[0].disabled = true;
    select.options[0].hidden = true;
    substitutosElegiveis({
      forca: norm(servidor.forca),
      plantao: norm(servidor.plantao),
      turno: norm(servidor.turno),
      curId: servidor.id
    }).forEach((nome) => select.add(new Option(nome, nome)));
    const valor = txt(valorAtual);
    if (valor && !Array.from(select.options).some((option) => option.value === valor)) select.add(new Option(valor, valor));
    select.value = valor;
  }

  function rowEfetivoPorIdTipo(id, sit, tipo) {
    return (window._efetivoRows || []).find((row) => row.id === id && row.sit === sit && row.tipo === tipo) || null;
  }

  function nomeObsRow(row, servidor) {
    const nome = servidor?.nomecurto || servidor?.nome || row?.nome || "";
    return row?.obs ? `${nome}: ${row.obs}` : nome;
  }

  function concluirAcaoEfetivo(pop) {
    renderTable();
    renderEfetivo();
    if (typeof window.validarResponsaveisAusentesPlantaoAtual === "function") window.validarResponsaveisAusentesPlantaoAtual();
    if (typeof window.renderResponsaveisViews === "function") window.renderResponsaveisViews();
    if (typeof window.renderResponsaveisPostos === "function") window.renderResponsaveisPostos();
    if (typeof window.removerAlocacoesSemPresenca === "function") {
      window.removerAlocacoesSemPresenca();
      renderEfetivo();
    }
    if (typeof window.sincronizarResponsaveisEscalas === "function") window.sincronizarResponsaveisEscalas();
    renderEfetivo();
    fecharPopSecao01(pop);
    msg("registro gravado com sucesso!");
  }

  function resetSelectVisibilidade(motivoSelect, substitutoSelect) {
    if (!motivoSelect || !substitutoSelect) return;
    const isPermuta = norm(motivoSelect.value) === "PERMUTA";
    substitutoSelect.classList.toggle("is-hidden", !isPermuta);
    if (!isPermuta) substitutoSelect.value = "";
  }

  function abrirPopPres(row) {
    const servidor = servidores.find((s) => s.id === row.id);
    const pop = $("popoverEfetivoPres");
    if (!servidor || !pop) return;

    pop.dataset.idServidor = servidor.id;
    pop.dataset.tipoEfetivo = row.tipo;
    $("efetivoPresNome").textContent = nomeObsRow(row, servidor);

    const fields = $("efetivoPresFields");
    const motivo = $("efetivoPresMotivo");
    const substituto = $("efetivoPresSubstituto");
    const gravar = $("efetivoPresGravar");
    const remover = $("efetivoPresRemover");
    const isExtra = row.tipo === "extra";

    fields?.classList.toggle("is-hidden", isExtra);
    popularMotivosPopover(motivo, { disablePermuta: row.tipo === "permutante" });
    popularSubstitutosPopover(substituto, servidor);
    substituto?.classList.add("is-hidden");
    if (gravar) gravar.disabled = true;
    if (remover) remover.disabled = !isExtra;

    if (motivo) motivo.onchange = () => {
      resetSelectVisibilidade(motivo, substituto);
      if (gravar) gravar.disabled = !motivo.value;
    };
    if (substituto) substituto.onchange = () => {
      if (gravar) gravar.disabled = !motivo?.value || (norm(motivo.value) === "PERMUTA" && !substituto.value);
    };

    pop.classList.add("is-open");
    pop.setAttribute("aria-hidden", "false");
  }

  function gravarPopPres() {
    const pop = $("popoverEfetivoPres");
    if (!pop?.classList.contains("is-open")) return;
    const servidor = servidores.find((s) => s.id === pop.dataset.idServidor);
    if (!servidor) return;

    const tipo = pop.dataset.tipoEfetivo;
    const motivo = norm($("efetivoPresMotivo")?.value);
    const substituto = txt($("efetivoPresSubstituto")?.value).toUpperCase();
    if (!motivo) return msg("CAMPO OBRIGATORIO: MOTIVO AUSENCIA", "erro");
    if (motivo === "PERMUTA" && !substituto) return msg("CAMPO OBRIGATORIO: SUBSTITUTO", "erro");

    const antigo = { ...servidor };
    servidor.motivoausencia = motivo;
    servidor.infoausencia = "";
    servidor.substituto = motivo === "PERMUTA" ? substituto : "";
    if (tipo === "permutante") {
      servidor.status_pgto = "AUSENTE";
    } else {
      if (!aplicarPermuta(servidor, antigo)) return;
    }
    concluirAcaoEfetivo(pop);
  }

  function removerPresExtra() {
    const pop = $("popoverEfetivoPres");
    const servidor = servidores.find((s) => s.id === pop?.dataset.idServidor);
    if (!servidor || pop.dataset.tipoEfetivo !== "extra") return;
    servidor.motivoapoio = "";
    servidor.jornada = "";
    servidor.horario = "";
    concluirAcaoEfetivo(pop);
  }

  function abrirPopAus(row) {
    const servidor = servidores.find((s) => s.id === row.id);
    const pop = $("popoverEfetivoAus");
    if (!servidor || !pop) return;

    pop.dataset.idServidor = servidor.id;
    pop.dataset.tipoEfetivo = row.tipo;
    pop.dataset.motivoOriginal = servidor.motivoausencia || "";
    pop.dataset.substitutoOriginal = servidor.substituto || "";
    $("efetivoAusNome").textContent = nomeObsRow(row, servidor);

    const motivo = $("efetivoAusMotivo");
    const substituto = $("efetivoAusSubstituto");
    const gravar = $("efetivoAusGravar");
    const isPermutante = row.tipo === "permutante";
    const isFolgante = row.tipo === "folgante";

    popularMotivosPopover(motivo, { value: isPermutante ? servidor.motivoausencia : servidor.motivoausencia });
    popularSubstitutosPopover(substituto, servidor);
    if (isFolgante && servidor.substituto) {
      if (!Array.from(substituto.options).some((option) => option.value === servidor.substituto)) substituto.add(new Option(servidor.substituto, servidor.substituto));
      substituto.value = servidor.substituto;
    }

    motivo.disabled = isPermutante;
    substituto.disabled = isPermutante;
    substituto.classList.toggle("is-hidden", !(isFolgante || isPermutante));
    if (gravar) gravar.disabled = true;

    motivo.onchange = () => {
      if (row.tipo === "folgante") {
        substituto.value = "";
        resetSelectVisibilidade(motivo, substituto);
      } else {
        resetSelectVisibilidade(motivo, substituto);
      }
      if (gravar) gravar.disabled = !motivo.value;
    };
    substituto.onchange = () => {
      if (gravar) gravar.disabled = false;
    };

    pop.classList.add("is-open");
    pop.setAttribute("aria-hidden", "false");
  }

  function gravarPopAus() {
    const pop = $("popoverEfetivoAus");
    if (!pop?.classList.contains("is-open")) return;
    const servidor = servidores.find((s) => s.id === pop.dataset.idServidor);
    if (!servidor) return;

    const motivo = norm($("efetivoAusMotivo")?.value);
    const substituto = txt($("efetivoAusSubstituto")?.value).toUpperCase();
    if (!motivo) return msg("CAMPO OBRIGATORIO: MOTIVO AUSENCIA", "erro");
    if (motivo === "PERMUTA" && !substituto) return msg("CAMPO OBRIGATORIO: SUBSTITUTO", "erro");

    const antigo = { ...servidor };
    servidor.motivoausencia = motivo;
    servidor.substituto = motivo === "PERMUTA" ? substituto : "";
    servidor.infoausencia = "";
    if (!aplicarPermuta(servidor, antigo)) return;
    concluirAcaoEfetivo(pop);
  }

  function removerAusenciaAtual() {
    const pop = $("popoverEfetivoAus");
    const servidor = servidores.find((s) => s.id === pop?.dataset.idServidor);
    if (!servidor) return;
    const tipo = pop.dataset.tipoEfetivo;

    if (tipo === "permutante") {
      servidor.motivoausencia = "";
      servidor.status_pgto = "PRESENTE";
      concluirAcaoEfetivo(pop);
      return;
    }

    if (tipo === "folgante" && servidor.id_pgto_permuta) removerEventoPermuta(servidor.id_pgto_permuta);
    servidor.motivoausencia = "";
    servidor.substituto = "";
    servidor.infoausencia = "";
    servidor.id_pgto_permuta = "";
    servidor.plantao_pgto_permuta = "";
    servidor.status_pgto = "";
    concluirAcaoEfetivo(pop);
  }

  function rowsRemocaoLote() {
    const filtro = filtroEfetivoAtivo();
    const rows = montarEfetivo(forcaEfetivoAtiva(), plantaoEfetivoAtivo());
    if (filtro === "todos") return rows.filter((row) => !(row.sit === "pres" && row.tipo === "fixo"));
    return filtrarEfetivoRows(rows, filtro).filter((row) => !(row.sit === "pres" && row.tipo === "fixo"));
  }

  function abrirPopBulk() {
    const filtro = filtroEfetivoAtivo();
    if (filtro === "presente") return;
    const pop = $("popoverEfetivoBulk");
    const msgEl = $("efetivoBulkMsg");
    const tituloEl = $("efetivoBulkTitulo");
    if (!pop || !msgEl) return;

    const mensagens = {
      ausente: "Todas as ausencias do plantao que nao sao permutas serao removidas.",
      permuta: "Todos do plantao que estao de permuta serao removidas.",
      extra: "Todas as presencas extras do plantao serao removidas.",
      todos: "Todas as ausencias, permutas e presencas extras do plantao serao removidas."
    };
    const titulos = {
      ausente: "REMOVER AUSENCIAS (EXCETO PERMUTAS)",
      permuta: "REMOVER PERMUTAS",
      extra: "REMOVER PRESENCAS EXTRAS",
      todos: "REMOVER TODOS(AUSENTES,PERMUTAS E EXTRAS)"
    };
    pop.dataset.filtro = filtro;
    if (tituloEl) tituloEl.textContent = titulos[filtro] || "REMOVER FILTRO";
    msgEl.textContent = mensagens[filtro] || "";
    pop.classList.add("is-open");
    pop.setAttribute("aria-hidden", "false");
  }

  function limparEventoRow(row) {
    const servidor = servidores.find((s) => s.id === row.id);
    if (!servidor) return;
    if (row.tipo === "extra") {
      servidor.motivoapoio = "";
      servidor.jornada = "";
      servidor.horario = "";
      return;
    }
    if (row.tipo === "folgante" && servidor.id_pgto_permuta) removerEventoPermuta(servidor.id_pgto_permuta);
    if (row.tipo === "permutante") {
      if (servidor.id_pgto_permuta) removerEventoPermuta(servidor.id_pgto_permuta);
      return;
    }
    servidor.motivoausencia = "";
    servidor.substituto = "";
    servidor.infoausencia = "";
    servidor.id_pgto_permuta = "";
    servidor.plantao_pgto_permuta = "";
    servidor.status_pgto = "";
  }

  function removerLoteEfetivo() {
    const pop = $("popoverEfetivoBulk");
    if (!pop?.classList.contains("is-open")) return;
    rowsRemocaoLote().forEach(limparEventoRow);
    concluirAcaoEfetivo(pop);
  }

  function servidoresElegiveisExtra() {
    const forca = forcaEfetivoAtiva();
    const plantao = plantaoEfetivoAtivo();
    return servidores.filter((s) => {
      if (norm(s.status || "ATIVO") !== "ATIVO") return false;
      if (norm(s.forca) !== forca) return false;
      if (norm(s.plantao) && norm(s.plantao) === plantao) return false;
      if (norm(s.motivoausencia)) return false;
      if (norm(s.motivoapoio)) return false;
      return true;
    }).sort((a, b) => nomeCurtoServidor(a).localeCompare(nomeCurtoServidor(b), "pt-BR"));
  }

  function popularNomeExtra(select, valorAtual = "") {
    if (!select) return;
    select.replaceChildren(new Option("NOME*", ""));
    select.options[0].disabled = true;
    select.options[0].hidden = true;
    const elegiveis = servidoresElegiveisExtra();
    elegiveis.forEach((s) => {
      const label = nomeCurtoServidor(s);
      if (label) select.add(new Option(label, s.id));
    });
    const valor = txt(valorAtual);
    if (valor && !elegiveis.some((s) => s.id === valor)) {
      const servidor = servidores.find((s) => s.id === valor);
      if (servidor) select.add(new Option(nomeCurtoServidor(servidor), servidor.id));
    }
    select.value = valor;
  }

  function servidorPorSelectExtra(select) {
    const id = txt(select?.value);
    return id ? servidores.find((s) => s.id === id) : null;
  }

  function gruposDoServidorRecorrente(servidorId) {
    carregarGruposExtra();
    return gruposExtraRecorrente.filter((grupo) => grupo.membros.includes(txt(servidorId)));
  }

  function grupoDoServidorRecorrente(servidorId) {
    return gruposDoServidorRecorrente(servidorId)[0] || null;
  }

  function popularSelectGrupos(select, valorAtual = "") {
    if (!select) return;
    carregarGruposExtra();
    select.replaceChildren(new Option("GRUPO", ""));
    gruposExtraRecorrente
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .forEach((grupo) => select.add(new Option(grupo.nome, grupo.id)));
    select.value = txt(valorAtual);
  }

  function setCamposPresencaServidor(motivo, jornada, horario) {
    setVal("svMotivoApoio", motivo || "");
    setVal("svJornada", jornada || "");
    setVal("svHorario", horario || "");
  }

  function setCamposPresencaServidorDisabled(disabled) {
    ["svMotivoApoio", "svJornada", "svHorario"].forEach((idCampo) => {
      const el = $(idCampo);
      if (el) el.disabled = disabled;
    });
  }

  function alternarCamposGrupoServidor() {
    const ativo = Boolean($("svRecorrente")?.checked);
    document.querySelectorAll(".sv-rec-field").forEach((el) => el.classList.toggle("is-hidden", !ativo));
    if (!ativo) {
      if ($("svRecGrupo")) $("svRecGrupo").value = "";
      alternarEditorGrupoServidor(false);
    }
  }

  function alternarEditorGrupoServidor(abrir) {
    const editor = $("svRecEditor");
    const input = $("svRecNomeGrupo");
    const salvar = $("svRecSalvarGrupo");
    if (!editor) return;
    editor.classList.toggle("is-hidden", !abrir);
    if (input) input.value = "";
    if (salvar) salvar.disabled = true;
    if (abrir) setTimeout(() => input?.focus(), 30);
  }

  function gravarGrupoServidor() {
    const nome = nomeGrupo($("svRecNomeGrupo")?.value);
    if (!nome) return;
    carregarGruposExtra();
    if (gruposExtraRecorrente.some((grupo) => nomeGrupo(grupo.nome) === nome)) {
      msg("nome ja existente", "erro");
      return;
    }
    const grupo = { id: novoIdGrupoExtra(nome), nome, motivo: "", jornada: "", horario: "", membros: [], estados: {} };
    gruposExtraRecorrente.push(grupo);
    salvarGruposExtra();
    popularSelectGrupos($("svRecGrupo"), grupo.id);
    alternarEditorGrupoServidor(false);
  }

  function preencherGrupoServidorNoForm(grupoId) {
    const grupo = grupoExtraPorId(grupoId);
    if (!grupo) return;
    if (grupo.motivo || grupo.jornada || grupo.horario) {
      setCamposPresencaServidor(grupo.motivo, grupo.jornada, grupo.horario);
    }
  }

  function atualizarPopoverRecorrentesAberto() {
    const pop = $("popoverExtraRecorrentes");
    if (!pop?.classList.contains("is-open")) return;
    renderGruposRecorrentes();
    renderMembrosRecorrentes(gruposSelecionadosRecorrentes());
  }

  function removerServidorDosGruposRecorrentes(servidorId) {
    carregarGruposExtra();
    gruposExtraRecorrente.forEach((grupo) => {
      grupo.membros = grupo.membros.filter((id) => id !== txt(servidorId));
      if (grupo.estados) delete grupo.estados[txt(servidorId)];
    });
    salvarGruposExtra();
  }

  function associarServidorAoGrupoRecorrente(servidorId, grupoId, motivo, jornada, horario) {
    carregarGruposExtra();
    gruposExtraRecorrente.forEach((grupo) => {
      if (grupo.id === grupoId) return;
      grupo.membros = grupo.membros.filter((id) => id !== servidorId);
      if (grupo.estados) delete grupo.estados[servidorId];
    });
    const grupo = grupoExtraPorId(grupoId);
    if (!grupo) return null;
    grupo.motivo = norm(motivo);
    grupo.jornada = norm(jornada);
    grupo.horario = txt(horario).toUpperCase();
    if (!grupo.membros.includes(servidorId)) grupo.membros.push(servidorId);
    grupo.estados = grupo.estados || {};
    grupo.estados[servidorId] = Boolean(motivo && jornada);
    salvarGruposExtra();
    return grupo;
  }

  function estadoAtualServidorRecorrente(servidor) {
    return Boolean(servidor?.motivoapoio && servidor?.jornada);
  }

  function estadoMembroRecorrente(grupo, servidorId) {
    if (!grupo || !servidorId) return false;
    if (Object.prototype.hasOwnProperty.call(grupo.estados || {}, servidorId)) return grupo.estados[servidorId] !== false;
    return estadoAtualServidorRecorrente(servidores.find((s) => s.id === servidorId));
  }

  function definirEstadoMembroRecorrente(grupo, servidorId, presente) {
    if (!grupo || !servidorId) return;
    grupo.estados = grupo.estados || {};
    grupo.estados[servidorId] = Boolean(presente);
  }

  function aplicarGrupoRecorrenteEmServidores(grupo) {
    if (!grupo?.motivo || !grupo?.jornada) return;
    grupo.membros.forEach((id) => {
      const servidor = servidores.find((s) => s.id === id);
      if (!servidor) return;
      if (estadoMembroRecorrente(grupo, id)) {
        servidor.motivoapoio = grupo.motivo;
        servidor.jornada = grupo.jornada;
        servidor.horario = grupo.horario || "";
        return;
      }
      servidor.motivoapoio = "";
      servidor.jornada = "";
      servidor.horario = "";
    });
  }

  function aplicarTodosRecorrentesPadraoEmServidores() {
    carregarGruposExtra();
    gruposExtraRecorrente.forEach(aplicarGrupoRecorrenteEmServidores);
  }

  function renderServidorRecorrenteForm() {
    const servidorId = getVal("svId");
    const servidor = servidores.find((s) => s.id === servidorId);
    const grupo = servidorId ? grupoDoServidorRecorrente(servidorId) : null;
    const canSec3 = Boolean(servidorId);
    const control = $("svRecControl");
    const banner = $("svRecBanner");
    const table = $("svRecTable");
    const tbody = $("svRecTbody");

    popularSelectGrupos($("svRecGrupo"), "");
    if ($("svRecorrente")) $("svRecorrente").checked = false;
    alternarCamposGrupoServidor();
    alternarEditorGrupoServidor(false);

    control?.classList.toggle("is-hidden", Boolean(grupo) || !canSec3);
    banner?.classList.toggle("is-hidden", !grupo);
    table?.classList.toggle("is-hidden", !grupo);

    if (!grupo || !servidor || !tbody) {
      if (tbody) tbody.innerHTML = "";
      return;
    }

    const presente = estadoMembroRecorrente(grupo, servidor.id);
    setCamposPresencaServidor(
      presente ? grupo.motivo || servidor.motivoapoio : "",
      presente ? grupo.jornada || servidor.jornada : "",
      presente ? grupo.horario || servidor.horario : ""
    );
    setCamposPresencaServidorDisabled(true);
    tbody.innerHTML = `
      <tr data-servidor-id="${esc(servidor.id)}" data-grupo-id="${esc(grupo.id)}">
        <td><input class="sv-rec-pres" type="checkbox"${presente ? " checked" : ""}></td>
        <td class="hidden-logica">${esc(servidor.id)}</td>
        <td title="${esc(grupo.nome)}">${esc(grupo.nome)}</td>
        <td><div class="sv-rec-actions"><button class="sv-rec-icon sv-rec-edit" type="button" title="Editar">✎</button><span></span><button class="sv-rec-icon sv-rec-remove" type="button" title="Remover">×</button></div></td>
      </tr>
    `;
  }

  function renderServidorRecorrenteEditavel(row) {
    const servidor = servidores.find((s) => s.id === txt(row?.dataset.servidorId));
    const grupo = grupoExtraPorId(row?.dataset.grupoId);
    if (!row || !servidor || !grupo) return;
    row.innerHTML = `
      <td><input class="sv-rec-pres" type="checkbox"${servidor.motivoapoio && servidor.jornada ? " checked" : ""}></td>
      <td class="hidden-logica">${esc(servidor.id)}</td>
      <td><select class="sv-rec-grupo-edit">${gruposExtraRecorrente.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((item) => `<option value="${esc(item.id)}"${item.id === grupo.id ? " selected" : ""}>${esc(item.nome)}</option>`).join("")}</select></td>
      <td><div class="sv-rec-actions"><button class="sv-rec-icon sv-rec-save-edit" type="button" title="Gravar">▣</button><span></span><button class="sv-rec-icon sv-rec-remove" type="button" title="Remover">×</button></div></td>
    `;
  }

  function salvarEdicaoServidorRecorrente(row) {
    const servidorId = txt(row?.dataset.servidorId);
    const grupoDestinoId = txt(row?.querySelector(".sv-rec-grupo-edit")?.value);
    const servidor = servidores.find((s) => s.id === servidorId);
    const destino = grupoExtraPorId(grupoDestinoId);
    if (!servidor || !destino) return;
    associarServidorAoGrupoRecorrente(servidorId, grupoDestinoId, destino.motivo, destino.jornada, destino.horario);
    servidor.motivoapoio = destino.motivo;
    servidor.jornada = destino.jornada;
    servidor.horario = destino.horario || "";
    renderTable();
    fillForm(servidor);
    sincronizarAbaEscala();
    atualizarPopoverRecorrentesAberto();
  }

  function togglePresencaServidorRecorrente(checked) {
    const servidorId = getVal("svId");
    const servidor = servidores.find((s) => s.id === servidorId);
    const grupo = grupoDoServidorRecorrente(servidorId);
    if (!servidor || !grupo) return;
    definirEstadoMembroRecorrente(grupo, servidor.id, checked);
    if (checked) {
      servidor.motivoapoio = grupo.motivo;
      servidor.jornada = grupo.jornada;
      servidor.horario = grupo.horario || "";
    } else {
      servidor.motivoapoio = "";
      servidor.jornada = "";
      servidor.horario = "";
    }
    salvarGruposExtra();
    renderTable();
    fillForm(servidor);
    sincronizarAbaEscala();
    atualizarPopoverRecorrentesAberto();
  }

  function confirmarRemoverServidorRecorrente() {
    const servidorId = getVal("svId");
    const servidor = servidores.find((s) => s.id === servidorId);
    const grupo = grupoDoServidorRecorrente(servidorId);
    if (!servidor || !grupo) return;
    const overlay = popover(`
      <p class="sv-pop-title">REMOVER RECORRENTE</p>
      <p class="sv-pop-text"><b>${esc(nomeCurtoServidor(servidor))}</b> saira do grupo <b>${esc(grupo.nome)}</b> e deixara de ser presenca extra recorrente. Deseja prosseguir?</p>
      <div class="sv-pop-actions">
        <button class="sv-pop-cancel" id="svPopCancelar" type="button">NAO</button>
        <button class="sv-pop-confirm danger" id="svPopConfirmar" type="button">SIM</button>
      </div>
    `);
    overlay.querySelector("#svPopCancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#svPopConfirmar").addEventListener("click", () => {
      overlay.remove();
      removerServidorDosGruposRecorrentes(servidor.id);
      servidor.motivoapoio = "";
      servidor.jornada = "";
      servidor.horario = "";
      renderTable();
      fillForm(servidor);
      sincronizarAbaEscala();
      atualizarPopoverRecorrentesAberto();
    });
  }

  function atualizarNomeCompletoExtra(row) {
    const label = row?.querySelector(".extra-nome-completo");
    const servidor = servidorPorSelectExtra(row?.querySelector(".extraNomeSelect"));
    if (label) label.textContent = servidor ? nomeCompletoServidor(servidor) : "";
  }

  function carregarGruposExtra() {
    try {
      const salvos = JSON.parse(localStorage.getItem(EXTRA_GRUPOS_KEY) || "[]");
      gruposExtraRecorrente = Array.isArray(salvos) ? salvos.map(normalizarGrupoExtra).filter(Boolean) : [];
      sanearMembrosGruposRecorrentes();
    } catch (e) {
      gruposExtraRecorrente = [];
    }
  }

  function normalizarMembroGrupo(ref) {
    const valor = txt(ref);
    if (!valor) return "";
    const servidor = servidores.find((s) => s.id === valor);
    return servidor?.id || valor;
  }

  function salvarGruposExtra() {
    try {
      localStorage.setItem(EXTRA_GRUPOS_KEY, JSON.stringify(gruposExtraRecorrente));
    } catch (e) {}
  }

  function exportarGruposExtraRecorrentes() {
    carregarGruposExtra();
    return gruposExtraRecorrente.map((grupo) => normalizarGrupoExtra(grupo)).filter(Boolean);
  }

  function importarGruposExtraRecorrentes(lista = []) {
    gruposExtraRecorrente = Array.isArray(lista)
      ? lista.map(normalizarGrupoExtra).filter(Boolean)
      : [];
    sanearMembrosGruposRecorrentes();
    salvarGruposExtra();
    aplicarTodosRecorrentesPadraoEmServidores();
    popularGruposExtra();
    popularSelectGrupos($("svRecGrupo"), getVal("svRecGrupo"));
    atualizarPopoverRecorrentesAberto();
  }

  function popularGruposExtra(valorAtual = "") {
    const select = $("extraGrupoSelect");
    if (!select) return;
    select.replaceChildren(new Option("GRUPO", ""));
    gruposExtraRecorrente
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
      .forEach((grupo) => select.add(new Option(grupo.nome, grupo.id)));
    select.value = txt(valorAtual);
  }

  function normalizarGrupoExtra(item) {
    if (!item) return null;
    if (typeof item === "string") {
      const nome = nomeGrupo(item);
      return nome ? { id: novoIdGrupoExtra(nome), nome, motivo: "", jornada: "", horario: "", membros: [], estados: {} } : null;
    }
    const nome = nomeGrupo(item.nome || item.grupo);
    if (!nome) return null;
    const membros = Array.isArray(item.membros)
      ? [...new Set(item.membros.map(normalizarMembroGrupo).filter(Boolean))]
      : [];
    const estadosEntrada = item.estados && typeof item.estados === "object" ? item.estados : {};
    const estados = {};
    membros.forEach((id) => {
      estados[id] = Object.prototype.hasOwnProperty.call(estadosEntrada, id)
        ? estadosEntrada[id] !== false
        : estadoAtualServidorRecorrente(servidores.find((s) => s.id === id));
    });
    return {
      id: txt(item.id) || novoIdGrupoExtra(nome),
      nome,
      motivo: norm(item.motivo),
      jornada: norm(item.jornada),
      horario: txt(item.horario).toUpperCase(),
      membros,
      estados
    };
  }

  function sanearMembrosGruposRecorrentes() {
    const vistos = new Set();
    gruposExtraRecorrente.forEach((grupo) => {
      grupo.membros = grupo.membros.filter((id) => {
        if (!servidores.some((s) => s.id === id) || vistos.has(id)) {
          if (grupo.estados) delete grupo.estados[id];
          return false;
        }
        vistos.add(id);
        return true;
      });
    });
  }

  function novoIdGrupoExtra(nome) {
    return `GRP-${norm(nome).replace(/[^A-Z0-9]+/g, "-") || Date.now().toString(36)}`;
  }

  function grupoExtraPorId(id) {
    return gruposExtraRecorrente.find((grupo) => grupo.id === txt(id)) || null;
  }

  function alternarCamposGrupoExtra() {
    const ativo = Boolean($("extraRecorrente")?.checked);
    document.querySelectorAll(".extra-grupo-field").forEach((el) => el.classList.toggle("is-hidden", !ativo));
    if (!ativo) {
      if ($("extraGrupoSelect")) $("extraGrupoSelect").value = "";
      alternarEditorGrupoExtra(false);
    }
  }

  function alternarEditorGrupoExtra(abrir) {
    const editor = $("extraGrupoEditor");
    const input = $("extraGrupoNome");
    const salvar = $("extraGrupoSalvar");
    if (!editor) return;
    editor.classList.toggle("is-hidden", !abrir);
    if (input) input.value = "";
    if (salvar) salvar.disabled = true;
    if (abrir) setTimeout(() => input?.focus(), 30);
  }

  function preencherGrupoExtraNoPopover(grupoId) {
    const grupo = grupoExtraPorId(grupoId);
    if (!grupo) return;
    if ($("extraMotivo")) $("extraMotivo").value = grupo.motivo || "";
    if ($("extraJornada")) $("extraJornada").value = grupo.jornada || "";
    if ($("extraHorario")) $("extraHorario").value = grupo.horario || "";
    const wrap = $("extraNomesWrap");
    if (wrap) {
      wrap.innerHTML = "";
      (grupo.membros.length ? grupo.membros : [""]).forEach((id, index) => criarLinhaNomeExtra(id, index > 0));
    }
  }

  function gravarGrupoExtra() {
    const input = $("extraGrupoNome");
    const nome = nomeGrupo(input?.value);
    if (!nome) return;
    if (gruposExtraRecorrente.some((grupo) => nomeGrupo(grupo.nome) === nome)) {
      msgExtra("GRUPO JA EXISTE");
      return;
    }
    const grupo = { id: novoIdGrupoExtra(nome), nome, motivo: "", jornada: "", horario: "", membros: [], estados: {} };
    gruposExtraRecorrente.push(grupo);
    salvarGruposExtra();
    popularGruposExtra(grupo.id);
    alternarEditorGrupoExtra(false);
  }

  function aplicarMascaraHorarioExtra(input) {
    const nums = txt(input?.value).replace(/\D/g, "").slice(0, 8);
    const partes = [];
    if (nums.length > 0) partes.push(nums.slice(0, 2));
    if (nums.length > 2) partes[0] += ":" + nums.slice(2, 4);
    if (nums.length > 4) partes.push(nums.slice(4, 6));
    if (nums.length > 6) partes[1] += ":" + nums.slice(6, 8);
    input.value = partes.join(" - ");
  }

  function aplicarMascaraHorarioServidor(input) {
    const nums = txt(input?.value).replace(/\D/g, "").slice(0, 8);
    const partes = [];
    if (nums.length > 0) partes.push(nums.slice(0, 2));
    if (nums.length > 2) partes[0] += ":" + nums.slice(2, 4);
    if (nums.length > 4) partes.push(nums.slice(4, 6));
    if (nums.length > 6) partes[1] += ":" + nums.slice(6, 8);
    input.value = partes.join("-");
  }

  function criarLinhaNomeExtra(valor = "", removivel = true) {
    const wrap = $("extraNomesWrap");
    if (!wrap) return null;
    const row = document.createElement("div");
    row.className = `extra-name-row${removivel ? "" : " is-first"}`;
    row.innerHTML = `
      <select class="extraNomeSelect"><option value="">NOME*</option></select>
      <span></span>
      <button class="s01-square-add extra-add-name" type="button">+</button>
      <span></span>
      <button class="extra-remove-name" type="button">×</button>
      <span></span>
      <span class="extra-nome-completo"></span>
    `;
    wrap.appendChild(row);
    popularNomeExtra(row.querySelector(".extraNomeSelect"), valor);
    atualizarNomeCompletoExtra(row);
    return row;
  }

  function resetLinhasNomeExtra() {
    const wrap = $("extraNomesWrap");
    if (!wrap) return;
    wrap.innerHTML = "";
    criarLinhaNomeExtra("", false);
  }

  function msgExtra(texto, tipo = "erro") {
    const el = $("extraPopMsg");
    if (!el) return msg(texto, tipo);
    el.textContent = texto || "";
    el.dataset.tipo = tipo;
    clearTimeout(el._t);
    if (texto) {
      el._t = setTimeout(() => {
        el.textContent = "";
        el.dataset.tipo = "";
      }, 5000);
    }
  }

  function abrirPopIncluirExtra() {
    const pop = $("popoverIncluirPresencaExtra");
    if (!pop) return;
    const motivo = $("extraMotivo");
    const jornada = $("extraJornada");
    const inputHorario = $("extraHorario");

    if (motivo) {
      motivo.replaceChildren(new Option("MOTIVO*", ""));
      motivo.options[0].disabled = true;
      motivo.options[0].hidden = true;
      ["APOIO", "COMPENSACAO"].forEach((item) => motivo.add(new Option(item, item)));
      motivo.value = "";
    }

    if (jornada) {
      jornada.replaceChildren(new Option("JORNADA*", ""));
      jornada.options[0].disabled = true;
      jornada.options[0].hidden = true;
      ["24H", "DIURNO", "NOTURNO"].forEach((item) => jornada.add(new Option(item, item)));
      jornada.value = "";
    }

    if (inputHorario) inputHorario.value = "";
    carregarGruposExtra();
    popularGruposExtra("");
    $("extraRecorrente") && ($("extraRecorrente").checked = false);
    alternarCamposGrupoExtra();
    alternarEditorGrupoExtra(false);
    msgExtra("", "");
    resetLinhasNomeExtra();
    pop.classList.add("is-open");
    pop.setAttribute("aria-hidden", "false");
  }

  function gravarIncluirExtra() {
    const pop = $("popoverIncluirPresencaExtra");
    if (!pop?.classList.contains("is-open")) return;
    const motivo = norm($("extraMotivo")?.value);
    const jornada = norm($("extraJornada")?.value);
    const horario = txt($("extraHorario")?.value).toUpperCase();
    const selects = Array.from(pop.querySelectorAll(".extraNomeSelect"));
    const ids = selects.map((select) => txt(select.value));
    const recorrente = Boolean($("extraRecorrente")?.checked);
    const grupoId = txt($("extraGrupoSelect")?.value);

    if (!motivo) return msgExtra("CAMPO OBRIGATORIO: MOTIVO PRESENCA");
    if (!jornada) return msgExtra("CAMPO OBRIGATORIO: JORNADA");
    if (!ids.length || ids.some((id) => !id)) return msgExtra("CAMPO OBRIGATORIO: NOME");
    if (new Set(ids).size !== ids.length) return msgExtra("NOME REPETIDO NA LISTA");
    if (recorrente && !grupoId) return msgExtra("CAMPO OBRIGATORIO: GRUPO");

    if (recorrente) {
      const grupo = grupoExtraPorId(grupoId);
      if (!grupo) return msgExtra("GRUPO NAO ENCONTRADO");
      const removidos = grupo.membros.filter((id) => !ids.includes(id));
      removidos.forEach((id) => {
        const servidor = servidores.find((s) => s.id === id);
        if (servidor) {
          servidor.motivoapoio = "";
          servidor.jornada = "";
          servidor.horario = "";
        }
      });
      gruposExtraRecorrente.forEach((outro) => {
        if (outro.id === grupo.id) return;
        outro.membros = outro.membros.filter((id) => !ids.includes(id));
        ids.forEach((id) => { if (outro.estados) delete outro.estados[id]; });
      });
      grupo.motivo = motivo;
      grupo.jornada = jornada;
      grupo.horario = horario;
      grupo.membros = ids.slice();
      grupo.estados = grupo.estados || {};
      Object.keys(grupo.estados).forEach((id) => { if (!ids.includes(id)) delete grupo.estados[id]; });
      ids.forEach((id) => {
        if (!Object.prototype.hasOwnProperty.call(grupo.estados, id)) grupo.estados[id] = true;
      });
      salvarGruposExtra();
    }

    ids.forEach((id) => {
      const servidor = servidores.find((s) => s.id === id);
      if (!servidor) return;
      const grupo = recorrente ? grupoExtraPorId(grupoId) : null;
      if (grupo && !estadoMembroRecorrente(grupo, id)) {
        servidor.motivoapoio = "";
        servidor.jornada = "";
        servidor.horario = "";
        return;
      }
      servidor.motivoapoio = motivo;
      servidor.jornada = jornada;
      servidor.horario = horario;
    });
    concluirAcaoEfetivo(pop);
  }

  function abrirPopExtraRecorrentes() {
    const pop = $("popoverExtraRecorrentes");
    if (!pop) return;
    const somenteLeitura = typeof escalaEncerradaSomenteLeitura === "function" && escalaEncerradaSomenteLeitura();
    carregarGruposExtra();
    if (!somenteLeitura) aplicarTodosRecorrentesPadraoEmServidores();
    renderGruposRecorrentes();
    renderMembrosRecorrentes(gruposSelecionadosRecorrentes());
    pop.classList.toggle("is-readonly", somenteLeitura);
    pop.querySelectorAll("input,select,button").forEach((control) => {
      if (control.closest(".s01-pop-title") || control.classList.contains("s01-exit")) return;
      control.disabled = somenteLeitura;
    });
    pop.classList.add("is-open");
    pop.setAttribute("aria-hidden", "false");
  }

  function gruposSelecionadosRecorrentes() {
    return Array.from(document.querySelectorAll("#recGruposBody .rec-grupo-check:checked"))
      .filter((input) => input.closest("tr")?.dataset.pendingDelete !== "1")
      .map((input) => txt(input.value))
      .filter(Boolean);
  }

  function atualizarCheckTodosGrupos() {
    const checks = Array.from(document.querySelectorAll("#recGruposBody .rec-grupo-check"));
    const master = $("recTodosGrupos");
    if (!master) return;
    master.checked = checks.length > 0 && checks.every((input) => input.checked);
  }

  function renderGruposRecorrentes() {
    const tbody = $("recGruposBody");
    if (!tbody) return;
    const grupos = gruposExtraRecorrente.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    tbody.innerHTML = grupos.length ? grupos.map((grupo) => `
      <tr data-grupo-id="${esc(grupo.id)}">
        <td><input class="rec-grupo-check" type="checkbox" value="${esc(grupo.id)}" checked></td>
        <td title="${esc(grupo.nome)}">${esc(grupo.nome)}</td>
        <td title="${esc(grupo.motivo)}">${esc(grupo.motivo)}</td>
        <td title="${esc(grupo.jornada)}">${esc(grupo.jornada)}</td>
        <td title="${esc(grupo.horario)}">${esc(grupo.horario)}</td>
        <td><div class="rec-row-actions"><button class="rec-icon-btn rec-edit" type="button" title="Editar">✎</button><span></span><button class="rec-icon-btn rec-delete" type="button" title="Remover">×</button></div></td>
      </tr>
    `).join("") : `<tr><td colspan="6">NENHUM GRUPO RECORRENTE</td></tr>`;
    atualizarCheckTodosGrupos();
  }

  function renderGrupoRecorrenteEditavel(row, grupo) {
    if (!row || !grupo) return;
    row.classList.add("is-editing");
    row.innerHTML = `
      <td><input class="rec-grupo-check" type="checkbox" value="${esc(grupo.id)}" checked></td>
      <td><input class="rec-edit-input rec-edit-nome" type="text" value="${esc(grupo.nome)}"></td>
      <td><select class="rec-edit-select rec-edit-motivo">${["APOIO", "COMPENSACAO"].map((item) => `<option value="${item}"${grupo.motivo === item ? " selected" : ""}>${item}</option>`).join("")}</select></td>
      <td><select class="rec-edit-select rec-edit-jornada">${["24H", "DIURNO", "NOTURNO"].map((item) => `<option value="${item}"${grupo.jornada === item ? " selected" : ""}>${item}</option>`).join("")}</select></td>
      <td><input class="rec-edit-input rec-edit-horario" type="text" value="${esc(grupo.horario)}" placeholder="00:00 - 00:00" maxlength="13"></td>
      <td><div class="rec-row-actions"><button class="rec-icon-btn rec-save-edit" type="button" title="Gravar">▣</button><span></span><button class="rec-icon-btn rec-delete" type="button" title="Remover">×</button></div></td>
    `;
    row.querySelector(".rec-edit-nome")?.focus();
  }

  function salvarEdicaoGrupoRecorrente(row) {
    const grupo = grupoExtraPorId(row?.dataset.grupoId);
    if (!grupo) return false;
    const nome = nomeGrupo(row.querySelector(".rec-edit-nome")?.value);
    const motivo = norm(row.querySelector(".rec-edit-motivo")?.value);
    const jornada = norm(row.querySelector(".rec-edit-jornada")?.value);
    const horario = txt(row.querySelector(".rec-edit-horario")?.value).toUpperCase();
    if (!nome) {
      msg("nome do grupo obrigatorio", "erro");
      return false;
    }
    if (gruposExtraRecorrente.some((item) => item.id !== grupo.id && nomeGrupo(item.nome) === nome)) {
      msg("nome ja existente", "erro");
      return false;
    }
    row.dataset.pendingEdit = "1";
    row.dataset.pendingNome = nome;
    row.dataset.pendingMotivo = motivo;
    row.dataset.pendingJornada = jornada;
    row.dataset.pendingHorario = horario;
    row.classList.remove("is-editing");
    row.classList.add("is-pending");
    row.innerHTML = `
      <td><input class="rec-grupo-check" type="checkbox" value="${esc(grupo.id)}" checked></td>
      <td title="${esc(nome)}">${esc(nome)}</td>
      <td title="${esc(motivo)}">${esc(motivo)}</td>
      <td title="${esc(jornada)}">${esc(jornada)}</td>
      <td title="${esc(horario)}">${esc(horario)}</td>
      <td><div class="rec-row-actions"><button class="rec-icon-btn rec-edit" type="button" title="Editar">✎</button><span></span><button class="rec-icon-btn rec-delete" type="button" title="Remover">×</button></div></td>
    `;
    renderMembrosRecorrentes(gruposSelecionadosRecorrentes());
    return true;
  }

  function confirmarRemoverGrupoRecorrente(grupoId) {
    const grupo = grupoExtraPorId(grupoId);
    if (!grupo) return;
    const overlay = popover(`
      <p class="sv-pop-title">REMOVER GRUPO RECORRENTE</p>
      <p class="sv-pop-text">O grupo <b>${esc(grupo.nome)}</b> sera marcado para remocao e todas as pessoas do grupo deixarao de ser recorrentes ao gravar. Deseja continuar?</p>
      <div class="sv-pop-actions">
        <button class="sv-pop-cancel" id="svPopCancelar" type="button">NAO</button>
        <button class="sv-pop-confirm danger" id="svPopConfirmar" type="button">SIM</button>
      </div>
    `);
    overlay.querySelector("#svPopCancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#svPopConfirmar").addEventListener("click", () => {
      overlay.remove();
      marcarRemocaoGrupoRecorrentePendente(grupoId);
    });
  }

  function marcarRemocaoGrupoRecorrentePendente(grupoId) {
    const row = document.querySelector(`#recGruposBody tr[data-grupo-id="${CSS.escape(grupoId)}"]`);
    if (!row) return;
    row.dataset.pendingDelete = "1";
    row.classList.remove("is-editing", "is-pending");
    row.classList.add("is-pending-delete");
    const check = row.querySelector(".rec-grupo-check");
    if (check) check.checked = false;
    atualizarCheckTodosGrupos();
    renderMembrosRecorrentes(gruposSelecionadosRecorrentes());
  }

  function atualizarOpcoesPresencaRecorrente() {
    const checks = Array.from(document.querySelectorAll("#recMembrosBody .rec-pres-check"));
    const todos = $("recTodosPresentes");
    const nenhum = $("recNenhumPresente");
    const total = checks.length;
    const marcados = checks.filter((input) => input.checked).length;
    if (todos) todos.checked = total > 0 && marcados === total;
    if (nenhum) nenhum.checked = total > 0 && marcados === 0;
  }

  function renderMembrosRecorrentes(grupoIds) {
    const tbody = $("recMembrosBody");
    if (!tbody) return;
    const idsSelecionados = Array.isArray(grupoIds) ? grupoIds : [grupoIds].filter(Boolean);
    const grupos = idsSelecionados.map(grupoExtraPorId).filter(Boolean);
    if (!grupos.length) {
      tbody.innerHTML = `<tr><td colspan="5">SELECIONE UM GRUPO</td></tr>`;
      atualizarOpcoesPresencaRecorrente();
      return;
    }
    const membros = grupos.flatMap((grupo) => grupo.membros
      .map((id) => ({ grupo, servidor: servidores.find((s) => s.id === id) }))
      .filter((item) => item.servidor)
    ).sort((a, b) => nomeCurtoServidor(a.servidor).localeCompare(nomeCurtoServidor(b.servidor), "pt-BR"));
    tbody.innerHTML = membros.length ? membros.map(({ grupo, servidor }) => `
      <tr data-servidor-id="${esc(servidor.id)}" data-grupo-id="${esc(grupo.id)}">
        <td><input class="rec-pres-check" type="checkbox"${estadoMembroRecorrente(grupo, servidor.id) ? " checked" : ""}></td>
        <td class="hidden-logica">${esc(servidor.id)}</td>
        <td title="${esc(nomeCompletoServidor(servidor))}">${esc(nomeCurtoServidor(servidor))}</td>
        <td title="${esc(grupo.nome)}">${esc(grupo.nome)}</td>
        <td><div class="rec-mem-actions"><button class="rec-icon-btn rec-mem-edit" type="button" title="Editar">✎</button><span></span><button class="rec-icon-btn rec-mem-delete rec-delete" type="button" title="Remover">×</button></div></td>
      </tr>
    `).join("") : `<tr><td colspan="5">GRUPO SEM NOMES</td></tr>`;
    atualizarOpcoesPresencaRecorrente();
  }

  function renderMembroRecorrenteEditavel(row) {
    if (!row) return;
    const grupoId = txt(row.dataset.grupoId);
    const servidorId = txt(row.dataset.servidorId);
    const servidor = servidores.find((s) => s.id === servidorId);
    const grupo = grupoExtraPorId(grupoId);
    if (!servidor || !grupo) return;
    row.classList.add("is-editing");
    row.innerHTML = `
      <td><input class="rec-pres-check" type="checkbox"${estadoMembroRecorrente(grupo, servidor.id) ? " checked" : ""}></td>
      <td class="hidden-logica">${esc(servidor.id)}</td>
      <td title="${esc(nomeCompletoServidor(servidor))}">${esc(nomeCurtoServidor(servidor))}</td>
      <td><select class="rec-edit-select rec-mem-grupo-select">${gruposExtraRecorrente.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).map((item) => `<option value="${esc(item.id)}"${item.id === grupo.id ? " selected" : ""}>${esc(item.nome)}</option>`).join("")}</select></td>
      <td><div class="rec-mem-actions"><button class="rec-icon-btn rec-save-mem-edit rec-save-edit" type="button" title="Gravar">▣</button><span></span><button class="rec-icon-btn rec-mem-delete rec-delete" type="button" title="Remover">×</button></div></td>
    `;
  }

  function salvarEdicaoMembroRecorrente(row) {
    const servidorId = txt(row?.dataset.servidorId);
    const grupoOrigemId = txt(row?.dataset.grupoId);
    const grupoDestinoId = txt(row?.querySelector(".rec-mem-grupo-select")?.value);
    if (!servidorId || !grupoDestinoId) return false;
    const destino = grupoExtraPorId(grupoDestinoId);
    if (!destino) return false;
    const servidor = servidores.find((s) => s.id === servidorId);
    row.dataset.pendingMoveTo = grupoDestinoId;
    row.classList.remove("is-editing");
    row.classList.add("is-pending");
    row.innerHTML = `
      <td><input class="rec-pres-check" type="checkbox"${estadoMembroRecorrente(destino, servidorId) ? " checked" : ""}></td>
      <td class="hidden-logica">${esc(servidorId)}</td>
      <td title="${esc(nomeCompletoServidor(servidor))}">${esc(nomeCurtoServidor(servidor))}</td>
      <td title="${esc(destino.nome)}">${esc(destino.nome)}</td>
      <td><div class="rec-mem-actions"><button class="rec-icon-btn rec-mem-edit" type="button" title="Editar">✎</button><span></span><button class="rec-icon-btn rec-mem-delete rec-delete" type="button" title="Remover">×</button></div></td>
    `;
    return true;
  }

  function confirmarRemoverMembroRecorrente(grupoId, servidorId) {
    const grupo = grupoExtraPorId(grupoId);
    const servidor = servidores.find((s) => s.id === servidorId);
    if (!grupo || !servidor) return;
    const overlay = popover(`
      <p class="sv-pop-title">REMOVER RECORRENTE</p>
      <p class="sv-pop-text"><b>${esc(nomeCurtoServidor(servidor))}</b> sera marcado para sair do grupo <b>${esc(grupo.nome)}</b> ao gravar. Deseja prosseguir?</p>
      <div class="sv-pop-actions">
        <button class="sv-pop-cancel" id="svPopCancelar" type="button">NAO</button>
        <button class="sv-pop-confirm danger" id="svPopConfirmar" type="button">SIM</button>
      </div>
    `);
    overlay.querySelector("#svPopCancelar").addEventListener("click", () => overlay.remove());
    overlay.querySelector("#svPopConfirmar").addEventListener("click", () => {
      overlay.remove();
      marcarRemocaoMembroRecorrentePendente(grupoId, servidorId);
    });
  }

  function marcarRemocaoMembroRecorrentePendente(grupoId, servidorId) {
    const row = Array.from(document.querySelectorAll("#recMembrosBody tr"))
      .find((item) => item.dataset.grupoId === grupoId && item.dataset.servidorId === servidorId);
    if (!row) return;
    row.dataset.pendingDelete = "1";
    row.classList.remove("is-editing", "is-pending");
    row.classList.add("is-pending-delete");
    const check = row.querySelector(".rec-pres-check");
    if (check) check.checked = false;
    atualizarOpcoesPresencaRecorrente();
  }

  function editarGrupoRecorrente(grupoId) {
    const grupo = grupoExtraPorId(grupoId);
    if (!grupo) return;
    fecharPopSecao01($("popoverExtraRecorrentes"));
    abrirPopIncluirExtra();
    if ($("extraMotivo")) $("extraMotivo").value = grupo.motivo || "";
    if ($("extraJornada")) $("extraJornada").value = grupo.jornada || "";
    if ($("extraHorario")) $("extraHorario").value = grupo.horario || "";
    if ($("extraRecorrente")) $("extraRecorrente").checked = true;
    alternarCamposGrupoExtra();
    popularGruposExtra(grupo.id);
    preencherGrupoExtraNoPopover(grupo.id);
  }

  function removerGrupoRecorrente(grupoId, limparServidores = false) {
    const grupo = grupoExtraPorId(grupoId);
    const servidorFormId = getVal("svId");
    let servidorFormAfetado = false;
    if (limparServidores && grupo) {
      grupo.membros.forEach((id) => {
        const servidor = servidores.find((s) => s.id === id);
        if (!servidor) return;
        if (servidor.id === servidorFormId) servidorFormAfetado = true;
        servidor.motivoapoio = "";
        servidor.jornada = "";
        servidor.horario = "";
      });
    }
    gruposExtraRecorrente = gruposExtraRecorrente.filter((grupo) => grupo.id !== grupoId);
    salvarGruposExtra();
    renderGruposRecorrentes();
    renderMembrosRecorrentes(gruposSelecionadosRecorrentes());
    if (limparServidores) {
      renderTable();
      renderEfetivo();
      if (servidorFormAfetado) {
        const servidorAtual = servidores.find((s) => s.id === servidorFormId);
        if (servidorAtual) fillForm(servidorAtual);
      }
      msg("grupo removido com sucesso", "ok");
    }
  }

  function removerMembroRecorrente(grupoId, servidorId, limparServidor = false) {
    const grupo = grupoExtraPorId(grupoId);
    if (!grupo) return;
    grupo.membros = grupo.membros.filter((id) => id !== servidorId);
    if (grupo.estados) delete grupo.estados[servidorId];
    if (limparServidor) {
      const servidor = servidores.find((s) => s.id === servidorId);
      if (servidor) {
        servidor.motivoapoio = "";
        servidor.jornada = "";
        servidor.horario = "";
      }
    }
    salvarGruposExtra();
    renderGruposRecorrentes();
    renderMembrosRecorrentes(gruposSelecionadosRecorrentes());
    if (limparServidor) {
      renderTable();
      renderEfetivo();
      if (getVal("svId") === servidorId) {
        const servidorAtual = servidores.find((s) => s.id === servidorId);
        if (servidorAtual) fillForm(servidorAtual);
      }
      msg("recorrente removido com sucesso", "ok");
    }
  }

  function setMembrosRecorrentesPresentes(checked) {
    document.querySelectorAll("#recMembrosBody .rec-pres-check").forEach((input) => {
      input.checked = checked;
      input.closest("tr")?.classList.add("is-pending");
    });
    atualizarOpcoesPresencaRecorrente();
  }

  function gravarExtraRecorrentes() {
    const pop = $("popoverExtraRecorrentes");
    if (!pop?.classList.contains("is-open")) return;
    const grupoEditavel = document.querySelector("#recGruposBody tr.is-editing");
    if (grupoEditavel && !salvarEdicaoGrupoRecorrente(grupoEditavel)) return;
    const membroEditavel = document.querySelector("#recMembrosBody tr.is-editing");
    if (membroEditavel && !salvarEdicaoMembroRecorrente(membroEditavel)) return;
    if (!aplicarPendenciasRecorrentes()) return;
    aplicarRecorrentesExibidosEmServidores();
    concluirAcaoEfetivo(pop);
  }

  function aplicarPendenciasRecorrentes() {
    const gruposExcluidos = new Set();

    document.querySelectorAll("#recGruposBody tr[data-pending-delete='1']").forEach((row) => {
      const grupo = grupoExtraPorId(row.dataset.grupoId);
      if (!grupo) return;
      gruposExcluidos.add(grupo.id);
      grupo.membros.forEach((id) => {
        const servidor = servidores.find((s) => s.id === id);
        if (!servidor) return;
        servidor.motivoapoio = "";
        servidor.jornada = "";
        servidor.horario = "";
      });
    });

    for (const row of Array.from(document.querySelectorAll("#recGruposBody tr[data-pending-edit='1']"))) {
      const grupo = grupoExtraPorId(row.dataset.grupoId);
      if (!grupo || gruposExcluidos.has(grupo.id)) continue;
      const nome = nomeGrupo(row.dataset.pendingNome);
      if (!nome) {
        msg("nome do grupo obrigatorio", "erro");
        return false;
      }
      if (gruposExtraRecorrente.some((item) => item.id !== grupo.id && !gruposExcluidos.has(item.id) && nomeGrupo(item.nome) === nome)) {
        msg("nome ja existente", "erro");
        return false;
      }
      grupo.nome = nome;
      grupo.motivo = norm(row.dataset.pendingMotivo);
      grupo.jornada = norm(row.dataset.pendingJornada);
      grupo.horario = txt(row.dataset.pendingHorario).toUpperCase();
      aplicarGrupoRecorrenteEmServidores(grupo);
    }

    document.querySelectorAll("#recMembrosBody tr[data-pending-move-to]").forEach((row) => {
      const servidorId = txt(row.dataset.servidorId);
      const origem = grupoExtraPorId(row.dataset.grupoId);
      const destino = grupoExtraPorId(row.dataset.pendingMoveTo);
      if (!servidorId || !destino || gruposExcluidos.has(destino.id)) return;
      const presente = Boolean(row.querySelector(".rec-pres-check")?.checked);
      gruposExtraRecorrente.forEach((grupo) => {
        if (grupo.id === destino.id) return;
        grupo.membros = grupo.membros.filter((id) => id !== servidorId);
        if (grupo.estados) delete grupo.estados[servidorId];
      });
      if (!destino.membros.includes(servidorId)) destino.membros.push(servidorId);
      definirEstadoMembroRecorrente(destino, servidorId, presente);
      row.dataset.grupoId = destino.id;
    });

    document.querySelectorAll("#recMembrosBody tr[data-pending-delete='1']").forEach((row) => {
      const grupo = grupoExtraPorId(row.dataset.grupoId);
      const servidorId = txt(row.dataset.servidorId);
      if (grupo) grupo.membros = grupo.membros.filter((id) => id !== servidorId);
      if (grupo?.estados) delete grupo.estados[servidorId];
      const servidor = servidores.find((s) => s.id === servidorId);
      if (servidor) {
        servidor.motivoapoio = "";
        servidor.jornada = "";
        servidor.horario = "";
      }
    });

    gruposExtraRecorrente = gruposExtraRecorrente.filter((grupo) => !gruposExcluidos.has(grupo.id));
    salvarGruposExtra();
    return true;
  }

  function aplicarRecorrentesExibidosEmServidores() {
    const rows = Array.from(document.querySelectorAll("#recMembrosBody tr"))
      .filter((row) => row.dataset.pendingDelete !== "1")
      .map((row) => ({
        checked: Boolean(row.querySelector(".rec-pres-check")?.checked),
        grupo: grupoExtraPorId(row.dataset.grupoId),
        servidor: servidores.find((s) => s.id === row.dataset.servidorId)
      }))
      .filter((item) => item.grupo && item.servidor);
    if (!rows.length) return false;
    rows.forEach(({ checked, grupo, servidor }) => {
      definirEstadoMembroRecorrente(grupo, servidor.id, checked);
      if (checked && grupo.motivo && grupo.jornada) {
        servidor.motivoapoio = grupo.motivo;
        servidor.jornada = grupo.jornada;
        servidor.horario = grupo.horario || "";
        return;
      }
      servidor.motivoapoio = "";
      servidor.jornada = "";
      servidor.horario = "";
    });
    salvarGruposExtra();
    renderTable();
    renderEfetivo();
    return true;
  }

  function ativarFiltroEfetivo(status) {
    window._filtroEfetivoV9 = status;
    document.querySelectorAll(".srv-filtro-v9").forEach((btn) => {
      btn.classList.toggle("active", txt(btn.dataset.status).toLowerCase() === status);
    });
  }

  function setupEfetivo() {
    document.body.classList.add("efetivo-ready");
    window._filtroEfetivoV9 = window._filtroEfetivoV9 || "presente";
    document.querySelectorAll(".srv-filtro-v9").forEach((btn) => {
      const ativo = txt(btn.dataset.status || "").toLowerCase() === window._filtroEfetivoV9;
      btn.classList.toggle("active", ativo);
    });

    $("topoDatePicker")?.addEventListener("change", atualizarTopoPlantao);
    $("topoDatePicker")?.addEventListener("input", atualizarTopoPlantao);

    document.querySelectorAll(".lp-force-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".lp-force-btn").forEach((item) => item.classList.remove("active"));
        btn.classList.add("active");
        window._forcaAtiva = norm(btn.dataset.force || "PPF");
        document.body.classList.toggle("force-ppf", window._forcaAtiva === "PPF");
        document.body.classList.toggle("force-fpn", window._forcaAtiva === "FPN");
        renderEfetivo();
      });
    });

    document.querySelectorAll(".srv-filtro-v9").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".srv-filtro-v9").forEach((item) => item.classList.remove("active"));
        btn.classList.add("active");
        window._filtroEfetivoV9 = txt(btn.dataset.status || "presente").toLowerCase();
        renderEfetivo();
      });
    });

    $("eftCanonicoBody")?.addEventListener("click", (event) => {
      const btn = event.target.closest(".sit-btn");
      if (!btn) return;
      const row = btn.closest("tr");
      if (!row) return;
      const efetivoRow = rowEfetivoPorIdTipo(row.dataset.id, row.dataset.sit, row.dataset.tipo);
      if (!efetivoRow) return;
      if (row.dataset.sit === "pres") {
        abrirPopPres(efetivoRow);
        return;
      }
      abrirPopAus(efetivoRow);
    });

    $("btnEfetivoLimparFiltro")?.addEventListener("click", abrirPopBulk);
    $("btnIncluirExtra")?.addEventListener("click", abrirPopIncluirExtra);
    $("btnRecorrentes")?.addEventListener("click", abrirPopExtraRecorrentes);
    $("popoverIncluirPresencaExtra")?.querySelector(".s01-save")?.addEventListener("click", gravarIncluirExtra);
    $("extraHorario")?.addEventListener("input", (event) => aplicarMascaraHorarioExtra(event.target));
    $("extraRecorrente")?.addEventListener("change", alternarCamposGrupoExtra);
    $("extraNomesWrap")?.addEventListener("click", (event) => {
      if (event.target.closest(".extra-add-name")) {
        criarLinhaNomeExtra("", true);
        return;
      }
      if (event.target.closest(".extra-remove-name")) {
        event.target.closest(".extra-name-row")?.remove();
      }
    });
    $("extraNomesWrap")?.addEventListener("change", (event) => {
      const select = event.target.closest(".extraNomeSelect");
      if (select) atualizarNomeCompletoExtra(select.closest(".extra-name-row"));
    });
    $("extraGrupoAdd")?.addEventListener("click", () => alternarEditorGrupoExtra(true));
    $("extraGrupoNome")?.addEventListener("input", (event) => {
      const salvar = $("extraGrupoSalvar");
      if (salvar) salvar.disabled = !txt(event.target.value);
    });
    $("extraGrupoSelect")?.addEventListener("change", (event) => preencherGrupoExtraNoPopover(event.target.value));
    $("extraGrupoSalvar")?.addEventListener("click", gravarGrupoExtra);
    $("recTodosGrupos")?.addEventListener("change", (event) => {
      document.querySelectorAll("#recGruposBody .rec-grupo-check").forEach((input) => {
        if (input.closest("tr")?.dataset.pendingDelete === "1") return;
        input.checked = event.target.checked;
      });
      renderMembrosRecorrentes(gruposSelecionadosRecorrentes());
    });
    $("recGruposBody")?.addEventListener("click", (event) => {
      const row = event.target.closest("tr");
      const grupoId = txt(row?.dataset.grupoId);
      if (!grupoId) return;
      if (event.target.closest(".rec-save-edit")) {
        salvarEdicaoGrupoRecorrente(row);
        return;
      }
      if (event.target.closest(".rec-edit")) {
        renderGrupoRecorrenteEditavel(row, grupoExtraPorId(grupoId));
        return;
      }
      if (event.target.closest(".rec-delete")) {
        confirmarRemoverGrupoRecorrente(grupoId);
        return;
      }
      if (row.dataset.pendingDelete === "1") return;
      if (event.target.closest(".rec-edit-input,.rec-edit-select")) return;
      const check = row.querySelector(".rec-grupo-check");
      if (!event.target.closest(".rec-grupo-check") && check) check.checked = !check.checked;
      atualizarCheckTodosGrupos();
      renderMembrosRecorrentes(gruposSelecionadosRecorrentes());
    });
    $("recMembrosBody")?.addEventListener("click", (event) => {
      const row = event.target.closest("tr");
      const grupoId = txt(row?.dataset.grupoId);
      const servidorId = txt(row?.dataset.servidorId);
      if (!grupoId || !servidorId) return;
      if (event.target.closest(".rec-save-mem-edit")) {
        salvarEdicaoMembroRecorrente(row);
        return;
      }
      if (event.target.closest(".rec-mem-edit")) {
        renderMembroRecorrenteEditavel(row);
        return;
      }
      if (event.target.closest(".rec-mem-delete")) confirmarRemoverMembroRecorrente(grupoId, servidorId);
    });
    $("recMembrosBody")?.addEventListener("change", (event) => {
      if (event.target.closest(".rec-pres-check")) {
        event.target.closest("tr")?.classList.add("is-pending");
        atualizarOpcoesPresencaRecorrente();
      }
    });
    $("recTodosPresentes")?.addEventListener("change", () => setMembrosRecorrentesPresentes(true));
    $("recNenhumPresente")?.addEventListener("change", () => setMembrosRecorrentesPresentes(false));
    $("recGravar")?.addEventListener("click", gravarExtraRecorrentes);
    $("svHorario")?.addEventListener("input", (event) => aplicarMascaraHorarioServidor(event.target));
    $("svRecorrente")?.addEventListener("change", alternarCamposGrupoServidor);
    $("svRecAdd")?.addEventListener("click", () => alternarEditorGrupoServidor(true));
    $("svRecNomeGrupo")?.addEventListener("input", (event) => {
      const salvar = $("svRecSalvarGrupo");
      if (salvar) salvar.disabled = !txt(event.target.value);
    });
    $("svRecSalvarGrupo")?.addEventListener("click", gravarGrupoServidor);
    $("svRecGrupo")?.addEventListener("change", (event) => preencherGrupoServidorNoForm(event.target.value));
    $("svRecTbody")?.addEventListener("click", (event) => {
      const row = event.target.closest("tr");
      if (!row) return;
      if (event.target.closest(".sv-rec-save-edit")) {
        salvarEdicaoServidorRecorrente(row);
        return;
      }
      if (event.target.closest(".sv-rec-edit")) {
        renderServidorRecorrenteEditavel(row);
        return;
      }
      if (event.target.closest(".sv-rec-remove")) {
        confirmarRemoverServidorRecorrente();
      }
    });
    $("svRecTbody")?.addEventListener("change", (event) => {
      if (event.target.closest(".sv-rec-pres")) togglePresencaServidorRecorrente(event.target.checked);
    });
    $("efetivoPresGravar")?.addEventListener("click", gravarPopPres);
    $("efetivoPresRemover")?.addEventListener("click", removerPresExtra);
    $("efetivoAusGravar")?.addEventListener("click", gravarPopAus);
    $("efetivoAusRemover")?.addEventListener("click", removerAusenciaAtual);
    $("efetivoBulkRemover")?.addEventListener("click", removerLoteEfetivo);

    ["popoverEfetivoPres", "popoverEfetivoAus", "popoverEfetivoBulk", "popoverIncluirPresencaExtra", "popoverExtraRecorrentes"].forEach((id) => {
      const pop = $(id);
      pop?.querySelectorAll(".s01-pop-close,.s01-exit").forEach((btn) => {
        btn.addEventListener("click", () => fecharPopSecao01(pop));
      });
    });
  }

  function setupPopoversMoveis() {
    let drag = null;

    document.querySelectorAll(".s01-popover").forEach((pop) => {
      const title = pop.querySelector(".s01-pop-title");
      if (!title) return;

      title.addEventListener("mousedown", (event) => {
        if (event.target.closest("button")) return;
        const rect = pop.getBoundingClientRect();
        pop.style.position = "fixed";
        pop.style.left = `${rect.left}px`;
        pop.style.top = `${rect.top}px`;
        pop.style.zIndex = "9300";
        drag = {
          pop,
          dx: event.clientX - rect.left,
          dy: event.clientY - rect.top
        };
        event.preventDefault();
      });
    });

    document.addEventListener("mousemove", (event) => {
      if (!drag) return;
      const maxLeft = Math.max(0, window.innerWidth - drag.pop.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - drag.pop.offsetHeight);
      const left = Math.min(maxLeft, Math.max(0, event.clientX - drag.dx));
      const top = Math.min(maxTop, Math.max(0, event.clientY - drag.dy));
      drag.pop.style.left = `${left}px`;
      drag.pop.style.top = `${top}px`;
    });

    document.addEventListener("mouseup", () => {
      drag = null;
    });
  }

  function renderTable() {
    const tbody = $("svTbody");
    if (!tbody) return;

    tbody.innerHTML = servidores.map(rowHtml).join("");
    tbody.querySelectorAll("tr").forEach((row) => {
      row.addEventListener("click", () => {
        clearForm();
        tbody.querySelectorAll("tr").forEach((item) => item.classList.remove("sv-row-selected", "is-selected"));
        row.classList.add("sv-row-selected", "is-selected");
        const servidor = servidores.find((s) => s.id === row.dataset.id);
        if (servidor) fillForm(servidor);
      });
    });
    filterRows();
  }

  function setupAbas() {
    const tabEscala = $("tabEscala");
    const tabServidores = $("tabServidores");
    if (!tabEscala || !tabServidores) return;

    tabEscala.addEventListener("click", () => {
      document.body.classList.add("aba-escala-ativa");
      document.body.classList.remove("aba-cadastro-ativa");
      tabEscala.classList.add("active");
      tabServidores.classList.remove("active");
      renderEfetivo();
    });
    tabServidores.addEventListener("click", () => {
      document.body.classList.add("aba-cadastro-ativa");
      document.body.classList.remove("aba-escala-ativa");
      tabServidores.classList.add("active");
      tabEscala.classList.remove("active");
    });
  }

  function init() {
    servidores = lerDadosIniciais().map(normalizarServidor);
    prepararPermutasIniciais();
    aplicarTodosRecorrentesPadraoEmServidores();

    window._getServidoresArray = () => servidores;
    window._getGruposExtraRecorrentes = exportarGruposExtraRecorrentes;
    window.importGruposExtraRecorrentes = importarGruposExtraRecorrentes;
    window.importCadastroServidores = (lista = []) => {
      servidores = Array.isArray(lista) ? lista.map(normalizarServidor) : [];
      prepararPermutasIniciais();
      renderTable();
      clearForm();
      renderEfetivo();
      if (typeof window.validarResponsaveisAusentesPlantaoAtual === "function") window.validarResponsaveisAusentesPlantaoAtual();
      if (typeof window.renderResponsaveisPostos === "function") window.renderResponsaveisPostos();
      if (typeof window.renderResponsaveisViews === "function") window.renderResponsaveisViews();
      if (typeof window.carregarTabelasEscalaDados === "function") window.carregarTabelasEscalaDados();
    };
    window._aplicarPermuta = aplicarPermuta;
    window.renderCadastroServidores = renderTable;
    window.renderEfetivo = renderEfetivo;
    window.atualizarTopoPlantao = atualizarTopoPlantao;

    setupAbas();
    setupEfetivo();
    setupPopoversMoveis();
    renderTable();
    atualizarTopoPlantao();
    clearForm();
    if (typeof window.carregarTabelasEscalaDados === "function") setTimeout(window.carregarTabelasEscalaDados, 0);

    $("svBtnNovo")?.addEventListener("click", () => {
      clearForm();
      $("svMatricula")?.focus();
    });
    $("svBtnGravar")?.addEventListener("click", save);
    $("svBtnRemover")?.addEventListener("click", remove);

    document.querySelectorAll("[data-clear]").forEach((btn) => {
      btn.addEventListener("click", () => clearSection(Number(btn.dataset.clear)));
    });

    document.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const n = Number(btn.dataset.toggle);
        const body = $(`svBody${n}`);
        if (!body) return;
        setSectionOpen(n, body.style.display === "none");
      });
    });

    document.addEventListener("input", (event) => {
      if (["svBusca", "svFiltroStatus", "svFiltroForca", "svFiltroPlantao"].includes(event.target?.id)) filterRows();
    });
    document.addEventListener("change", (event) => {
      if (["svBusca", "svFiltroStatus", "svFiltroForca", "svFiltroPlantao"].includes(event.target?.id)) filterRows();
    });

    $("svBuscaClear")?.addEventListener("click", () => {
      ["svBusca", "svFiltroStatus", "svFiltroForca", "svFiltroPlantao"].forEach((id) => setVal(id, ""));
      filterRows();
      $("svBusca")?.focus();
    });

    [
      "svForca",
      "svPlantao",
      "svTurno",
      "svSetor",
      "svStatus",
      "svMotivoApoio",
      "svJornada",
      "svMotivoAusencia",
      "svSubstituto",
      "svStatusPgto"
    ].forEach((id) => {
      $(id)?.addEventListener("change", () => {
        updateLocks();
        if (["svForca", "svPlantao", "svTurno"].includes(id)) popularSubstitutos(getVal("svSubstituto"));
        setDirty(true);
      });
    });

    ["svMatricula", "svNome", "svNomeCurto", "svHorario", "svInfoAusencia"].forEach((id) => {
      $(id)?.addEventListener("input", () => setDirty(true));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

(function () {
  "use strict";

  const norm = (value) => String(value || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const $ = (id) => document.getElementById(id);
  const idsFiltro = ["svBusca", "svFiltroStatus", "svFiltroForca", "svFiltroPlantao"];

  function filtrarServidoresDom() {
    const tbody = $("svTbody");
    if (!tbody) return;
    const busca = norm($("svBusca")?.value || "");
    const termos = busca.split(";").map((item) => item.trim()).filter(Boolean);
    const status = norm($("svFiltroStatus")?.value || "");
    const forca = norm($("svFiltroForca")?.value || "");
    const plantao = norm($("svFiltroPlantao")?.value || "");
    let visiveis = 0;
    const rows = Array.from(tbody.querySelectorAll("tr"));

    rows.forEach((row) => {
      const cells = row.children;
      const rowStatus = norm(cells[5]?.textContent);
      const rowForca = norm(cells[4]?.textContent);
      const rowPlantao = norm(cells[6]?.textContent);
      const rowText = norm(row.textContent);
      const show = (!status || rowStatus === status)
        && (!forca || rowForca === forca)
        && (!plantao || rowPlantao === plantao)
        && (!termos.length || termos.every((termo) => rowText.includes(termo)));

      row.hidden = !show;
      row.style.display = show ? "" : "none";
      if (show) visiveis += 1;
    });

    const count = $("svCount");
    if (count) count.textContent = `${visiveis} de ${rows.length}`;
  }

  function ligarFiltrosDom() {
    idsFiltro.forEach((id) => {
      const el = $(id);
      if (!el || el.dataset.svDomFilter === "1") return;
      el.dataset.svDomFilter = "1";
      el.addEventListener("input", filtrarServidoresDom);
      el.addEventListener("change", filtrarServidoresDom);
    });
    const clear = $("svBuscaClear");
    if (clear && clear.dataset.svDomFilter !== "1") {
      clear.dataset.svDomFilter = "1";
      clear.addEventListener("click", () => setTimeout(filtrarServidoresDom, 0));
    }
    filtrarServidoresDom();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ligarFiltrosDom);
  } else {
    ligarFiltrosDom();
  }
  window.filtrarServidoresDom = filtrarServidoresDom;
})();
