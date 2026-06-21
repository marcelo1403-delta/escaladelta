// firebase-sync.js — Integração Firebase Firestore
// Escala Plantão — PFP Mossoró

(function () {
  "use strict";

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDGF-MaOE4QTnEC-aRlmlKDjqrT3JmMIAg",
    authDomain: "escala-delta-76391.firebaseapp.com",
    projectId: "escala-delta-76391",
    storageBucket: "escala-delta-76391.firebasestorage.app",
    messagingSenderId: "914685827458",
    appId: "1:914685827458:web:d419bdb12fd6b315a3d79b"
  };

  const COLECAO = "escalas";
  const TIMEOUT_MS = 10000;

  let _db = null;
  let _inicializado = false;
  let _salvando = false;
  let _ultimoErroListagem = "";
  const LOCAL_STORE_KEY = "escalaAgent:firebaseLocal:v1";

  function modoLocalAtivo() {
    const params = new URLSearchParams(location.search || "");
    if (params.get("local") === "1" || params.get("offline") === "1" || params.get("firebase") === "0") return true;
    const host = location.hostname || "";
    return location.protocol === "file:" || host === "localhost" || host === "127.0.0.1" || host === "::1";
  }

  function localStoreLer() {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORE_KEY) || '{"docs":{}}');
    } catch (err) {
      return { docs: {} };
    }
  }

  function localStoreGravar(store) {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(store || { docs: {} }));
  }

  function localDocData(payload, docId, opcoes = {}) {
    return {
      _payload: JSON.stringify(payload),
      _salvoEm: new Date().toISOString(),
      _docId: docId,
      _status: opcoes.status || calcularStatus(payload?.topo?.data),
      _versao: 2,
      _historico: opcoes.historico || []
    };
  }

  // ─── INDICADOR VISUAL ───────────────────────────────────────────────────────
  function criarIndicador() {
    if (document.getElementById("fb-sync-indicator")) return;
    const el = document.createElement("div");
    el.id = "fb-sync-indicator";
    el.style.cssText = [
      "position:fixed","bottom:10px","right:10px","z-index:99999",
      "padding:4px 10px","border-radius:6px","font-size:11px",
      "font-weight:700","font-family:Calibri,Arial,sans-serif",
      "pointer-events:none","transition:opacity .4s",
      "opacity:0","background:#1e3a5f","color:#fff"
    ].join(";");
    document.body.appendChild(el);
  }

  function mostrarStatus(msg, cor, duracaoMs) {
    const el = document.getElementById("fb-sync-indicator");
    if (!el) return;
    const cores = {
      azul:    { bg: "#1e3a5f", fg: "#fff" },
      verde:   { bg: "#166534", fg: "#fff" },
      laranja: { bg: "#92400e", fg: "#fff" },
      vermelho:{ bg: "#7f1d1d", fg: "#fff" },
      cinza:   { bg: "#374151", fg: "#fff" }
    };
    const c = cores[cor] || cores.azul;
    el.style.background = c.bg;
    el.style.color = c.fg;
    el.textContent = msg;
    el.style.opacity = "1";
    if (duracaoMs) {
      clearTimeout(el._timer);
      el._timer = setTimeout(() => { el.style.opacity = "0"; }, duracaoMs);
    }
  }

  // ─── INICIALIZAÇÃO ──────────────────────────────────────────────────────────
  async function inicializar() {
    if (_inicializado) return _db;
    if (modoLocalAtivo()) {
      _db = { local: true };
      _inicializado = true;
      window._fbFSLocal = true;
      console.info("[Firebase] Modo local ativo. Firestore real desativado.");
      return _db;
    }
    try {
      const { initializeApp, getApps } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
      );
      const { getFirestore, doc, setDoc, getDoc, getDocs,
              collection, deleteDoc, serverTimestamp } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
      );
      const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
      _db = getFirestore(app);
      _inicializado = true;
      window._fbFS = { doc, setDoc, getDoc, getDocs, collection,
                       deleteDoc, serverTimestamp, db: _db };
      console.info("[Firebase] Firestore inicializado.");
      return _db;
    } catch (err) {
      console.warn("[Firebase] Falha ao inicializar:", err);
      return null;
    }
  }

  // ─── GERAR ID DO DOCUMENTO ──────────────────────────────────────────────────
  // Formato: dd-mm-aaaa-PLANTAO  ex: 25-05-2026-DELTA
  function gerarDocId(dataIso, plantao) {
    if (!dataIso || !plantao) return null;
    const [aaaa, mm, dd] = dataIso.split("-");
    if (!aaaa || !mm || !dd) return null;
    return `${dd}-${mm}-${aaaa}-${plantao.toUpperCase()}`;
  }

  // ─── VERIFICAR STATUS DO PLANTÃO ─────────────────────────────────────────────
  // EM ANDAMENTO: data atual <= data navbar + 1 dia
  // ENCERRADO: data atual > data navbar + 1 dia
  function calcularStatus(dataIso) {
    // TESTES: bloqueio de vencidos temporariamente desativado.
    // Regra original: em andamento até data da navbar + 1 dia; depois encerrado.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso || "")) return "em_andamento";
    const [ano, mes, dia] = dataIso.split("-").map(Number);
    const limite = new Date(ano, mes - 1, dia);
    limite.setDate(limite.getDate() + 1);
    limite.setHours(23, 59, 59, 999);
    const hoje = new Date();
    return hoje.getTime() <= limite.getTime() ? "em_andamento" : "encerrado";
  }

  // ─── SALVAR DOCUMENTO ───────────────────────────────────────────────────────
  async function salvar(payload, docId, opcoes = {}) {
    if (_salvando) return { ok: false, msg: "Gravação em andamento." };
    _salvando = true;
    mostrarStatus("☁ Salvando...", "azul");
    try {
      await inicializar();
      if (modoLocalAtivo()) {
        const store = localStoreLer();
        store.docs = store.docs || {};
        store.docs[docId] = localDocData(payload, docId, opcoes);
        localStoreGravar(store);
        mostrarStatus("LOCAL salvo", "laranja", 3000);
        return { ok: true, local: true };
      }
      if (!_db || !window._fbFS) throw new Error("Firestore indisponível");
      const { doc, setDoc, serverTimestamp, db } = window._fbFS;

      const status = opcoes.status || calcularStatus(payload?.topo?.data);
      const docData = {
        _payload:     JSON.stringify(payload),
        _salvoEm:     serverTimestamp(),
        _docId:       docId,
        _status:      status,
        _versao:      2,
        _historico:   opcoes.historico || []
      };

      await Promise.race([
        setDoc(doc(db, COLECAO, docId), docData),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS))
      ]);

      mostrarStatus("☁ Salvo ✓", "verde", 3000);
      return { ok: true };
    } catch (err) {
      console.warn("[Firebase] Falha ao salvar:", err);
      mostrarStatus("☁ Falha ao salvar", "vermelho", 4000);
      return { ok: false, msg: err.message };
    } finally {
      _salvando = false;
    }
  }

  // ─── CARREGAR DOCUMENTO ─────────────────────────────────────────────────────
  async function carregar(docId) {
    mostrarStatus("☁ Carregando...", "azul");
    try {
      await inicializar();
      if (modoLocalAtivo()) {
        const data = localStoreLer().docs?.[docId];
        if (!data || data._status === "inativo") {
          mostrarStatus("LOCAL nao encontrado", "cinza", 3000);
          return null;
        }
        const payload = data._payload ? JSON.parse(data._payload) : null;
        if (!payload) { mostrarStatus("LOCAL invalido", "vermelho", 3000); return null; }
        mostrarStatus("LOCAL carregado", "laranja", 3000);
        return { payload, status: data._status, historico: data._historico || [], docId, local: true };
      }
      if (!_db || !window._fbFS) throw new Error("Firestore indisponível");
      const { doc, getDoc, db } = window._fbFS;

      const snap = await Promise.race([
        getDoc(doc(db, COLECAO, docId)),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMEOUT_MS))
      ]);

      if (!snap.exists()) {
        mostrarStatus("☁ Não encontrado", "cinza", 3000);
        return null;
      }
      const data = snap.data();
      if (data._status === "inativo") {
        mostrarStatus("☁ Plantão inativo", "cinza", 3000);
        return null;
      }
      const payload = data._payload ? JSON.parse(data._payload) : null;
      if (!payload) { mostrarStatus("☁ Dados inválidos", "vermelho", 3000); return null; }

      mostrarStatus("☁ Carregado ✓", "verde", 3000);
      return { payload, status: data._status, historico: data._historico || [], docId };
    } catch (err) {
      console.warn("[Firebase] Falha ao carregar:", err);
      mostrarStatus("☁ Falha ao carregar", "vermelho", 4000);
      return null;
    }
  }

  // ─── VERIFICAR SE DOCUMENTO EXISTE ──────────────────────────────────────────
  async function existe(docId) {
    try {
      await inicializar();
      if (modoLocalAtivo()) {
        const data = localStoreLer().docs?.[docId];
        return Boolean(data) && data._status !== "inativo";
      }
      if (!_db || !window._fbFS) return false;
      const { doc, getDoc, db } = window._fbFS;
      const snap = await getDoc(doc(db, COLECAO, docId));
      return snap.exists() && snap.data()?._status !== "inativo";
    } catch (err) {
      return false;
    }
  }

  // ─── LISTAR PLANTÕES ────────────────────────────────────────────────────────
  async function listar(filtroPlantao) {
    try {
      await inicializar();
      if (modoLocalAtivo()) {
        _ultimoErroListagem = "";
        return Object.entries(localStoreLer().docs || {})
          .map(([id, data]) => ({ id, status: data._status, salvoEm: data._salvoEm ? new Date(data._salvoEm) : null }))
          .filter(item => item.status !== "inativo")
          .filter(item => !filtroPlantao || item.id.endsWith("-" + filtroPlantao.toUpperCase()))
          .sort((a, b) => (b.salvoEm || 0) - (a.salvoEm || 0));
      }
      if (!_db || !window._fbFS) return [];
      const { collection, getDocs, db } = window._fbFS;
      const snap = await getDocs(collection(db, COLECAO));
      _ultimoErroListagem = "";
      return snap.docs
        .map(d => ({ id: d.id, status: d.data()._status, salvoEm: d.data()._salvoEm?.toDate?.() || null }))
        .filter(item => item.status !== "inativo")
        .filter(item => !filtroPlantao || item.id.endsWith("-" + filtroPlantao.toUpperCase()))
        .sort((a, b) => (b.salvoEm || 0) - (a.salvoEm || 0));
    } catch (err) {
      _ultimoErroListagem = err?.message || String(err || "erro desconhecido");
      console.warn("[Firebase] Falha ao listar:", err);
      return [];
    }
  }

  async function listarBackups(filtros = {}) {
    const todos = await listar(filtros.plantao || "");
    const ano = String(filtros.ano || "").trim();
    const mes = filtros.mes ? String(filtros.mes).padStart(2, "0") : "";
    return todos
      .filter(item => /^escala-\d{2}-\d{2}-\d{4}-[A-Z]+$/i.test(item.id) || /^\d{2}-\d{2}-\d{4}-[A-Z]+$/i.test(item.id))
      .filter(item => !ano || item.id.includes(`-${ano}-`))
      .filter(item => !mes || item.id.includes(`-${mes}-`));
  }

  // ─── MARCAR COMO INATIVO (exclusão lógica) ──────────────────────────────────
  async function marcarInativo(docId) {
    try {
      await inicializar();
      if (modoLocalAtivo()) {
        const store = localStoreLer();
        if (!store.docs?.[docId]) return false;
        store.docs[docId]._status = "inativo";
        store.docs[docId]._inativadoEm = new Date().toISOString();
        localStoreGravar(store);
        return true;
      }
      if (!_db || !window._fbFS) return false;
      const { doc, setDoc, serverTimestamp, db } = window._fbFS;
      const snap = await window._fbFS.getDoc(window._fbFS.doc(db, COLECAO, docId));
      if (!snap.exists()) return false;
      const atual = snap.data();
      await setDoc(window._fbFS.doc(db, COLECAO, docId), {
        ...atual,
        _status: "inativo",
        _inativadoEm: serverTimestamp()
      });
      return true;
    } catch (err) {
      console.warn("[Firebase] Falha ao inativar:", err);
      return false;
    }
  }

  // ─── API PÚBLICA ─────────────────────────────────────────────────────────────
  window.FirebaseSync = {
    inicializar,
    salvar,
    carregar,
    existe,
    listar,
    listarBackups,
    marcarInativo,
    gerarDocId,
    calcularStatus,
    mostrarStatus,
    COLECAO,
    modoLocal: modoLocalAtivo,
    get ultimoErroListagem() { return _ultimoErroListagem; },
    get inicializado() { return _inicializado; }
  };

  document.addEventListener("DOMContentLoaded", () => {
    criarIndicador();
    inicializar().then(db => {
      if (modoLocalAtivo()) {
        mostrarStatus("LOCAL sem Firebase", "laranja", 5000);
        return;
      }
      if (db) mostrarStatus("☁ Firebase conectado", "verde", 3000);
      else mostrarStatus("☁ Offline", "cinza", 3000);
    });
  });

})();
