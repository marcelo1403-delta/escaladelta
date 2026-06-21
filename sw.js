// sw.js - Service Worker Escala Plantao
// Estrategia: NETWORK-FIRST para assets do app (sempre busca na rede)
// Cache so e usado como fallback quando estiver offline
// CACHE gerado automaticamente a cada deploy — nunca precisa incrementar manualmente
const CACHE = "escala-plantao-" + new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

const ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/css/impressao.css",
  "/css/modulos/00-base.css",
  "/css/modulos/01-navbar.css",
  "/css/modulos/02-layout-cadastro.css",
  "/css/modulos/03-titulos-paineis.css",
  "/css/modulos/04-secao01-efetivo.css",
  "/css/modulos/05-secao02-resumo.css",
  "/css/modulos/06-escala-interacoes.css",
  "/css/modulos/07-popovers.css",
  "/css/modulos/08-secao03-escala.css",
  "/css/modulos/09-popover-abrir.css",
  "/js/firebase-sync.js",
  "/js/modulos/00-init-abas-turno.js",
  "/js/modulos/01-config-postos.js",
  "/js/modulos/02-config-horarios.js",
  "/js/modulos/03-responsaveis-base.js",
  "/js/modulos/04-escala-interacoes.js",
  "/js/modulos/05-responsaveis-sincronizacao.js",
  "/js/modulos/06-escala-persistencia-historico.js",
  "/js/modulos/07-arquivos-gestao.js",
  "/js/modulos/08-eventos-inicializacao.js",
  "/js/impressao.js",
  "/js/cadastro.js",
  "/brasao_republica.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/matriz-dados.json",
  "/manifest-gestao.webmanifest"
];

// ─── INSTALL: pre-cache todos os assets (forcando reload da rede) ──────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(
        ASSETS.map((asset) =>
          cache.add(new Request(asset, { cache: "reload" }))
        )
      )
    )
  );
  // Assume controle imediamente, sem esperar aba fechar
  self.skipWaiting();
});

// ─── ACTIVATE: apaga TODOS os caches antigos ──────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE)
          .map((key) => {
            console.info("[SW] Deletando cache antigo:", key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // Assume controle de todas as abas abertas
  );
});

// ─── FETCH: NETWORK-FIRST para assets do app ──────────────────────────────
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Deixa Firebase/Google passarem direto (sem interceptar)
  if (
    url.hostname.includes("firebaseapp.com") ||
    url.hostname.includes("firebase.google.com") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    event.request.url.includes("firebasejs")
  ) {
    return; // nao intercepta
  }

  const isAppAsset =
    url.origin === self.location.origin &&
    (event.request.mode === "navigate" ||
      /\.(html|js|css|json|webmanifest|png|jpg|svg|ico)$/i.test(url.pathname) ||
      url.pathname === "/");

  if (!isAppAsset) return;

  // NETWORK-FIRST: tenta rede primeiro, cache so como fallback offline
  event.respondWith(
    fetch(new Request(event.request, { cache: "no-cache" }))
      .then((response) => {
        // Resposta valida: atualiza cache e retorna
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Sem rede: serve do cache (modo offline)
        console.warn("[SW] Offline - servindo do cache:", url.pathname);
        return caches.match(event.request);
      })
  );
});
