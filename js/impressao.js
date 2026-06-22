(function(){
  "use strict";

  const overlay = document.getElementById("previa-overlay");
  const frame = document.getElementById("previa-frame");
  const wrap = document.getElementById("previa-frame-wrap");
  const title = document.getElementById("previa-title");
  const sideBtns = Array.from(document.querySelectorAll(".previa-side-btn"));
  const zoomLabel = document.getElementById("previaZoomLabel");
  let modoAtual = "escala";
  let previewZoom = 1;
  const txt = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const normImp = (value) => txt(value).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const esc = (value) => txt(value).replace(/[&<>"]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  }[ch]));

  function cssImpressao(){
    return `
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:#d1d5db;color:#111;font-family:Calibri,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{box-sizing:border-box}
      body{padding:0}
      .imp-page{width:297mm;height:210mm;padding:10mm;break-after:page;page-break-after:always;overflow:hidden;background:#fff;margin:0 auto 12mm;box-shadow:0 8px 28px rgba(15,23,42,.35)}
      .imp-page + .imp-page{break-before:page;page-break-before:always}
      .imp-page:last-child{break-after:auto;page-break-after:auto}
      .imp-escala-section{margin-top:20px}
      .imp-cab{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border:2px solid #1f2937;margin-bottom:4mm}
      .imp-cab-cell{min-height:14mm;padding:2mm 3mm;border-right:1px solid #1f2937;display:flex;flex-direction:column;justify-content:center}
      .imp-cab-cell:last-child{border-right:0;text-align:right}
      .imp-org{font-size:10px;font-weight:700;text-transform:uppercase}
      .imp-title{font-size:16px;font-weight:900;letter-spacing:.8px;text-align:center;text-transform:uppercase}
      .imp-meta{font-size:10px;font-weight:700}
      .imp-top-frames{width:1046px;height:90px;display:grid;grid-template-columns:390px 90px 90px 198px 198px;gap:20px;margin:0 0 10px 0}
      .imp-top-frame{height:90px;background:#fff;overflow:visible}
      .imp-frame-1{border:1px solid #111}
      .imp-frame-1{display:grid;grid-template-columns:120px 270px}
      .imp-list-top-frames{width:718px;height:90px;display:grid;grid-template-columns:378px 85px 85px 125px;gap:15px;margin:0 0 10px 0}
      .imp-list-frame-1{display:grid;grid-template-columns:115px 263px;border:1px solid #111}
      .imp-list-top-frames .imp-mini-card{width:85px}
      .imp-list-chief-box{width:125px;height:90px}
      .imp-list-chief-title{height:25px;border:1px solid #508d60;background:#508d60;color:#fff;font-size:9px;font-weight:900;line-height:24px;text-align:center;text-transform:uppercase}
      .imp-list-chief-gap{height:10px}
      .imp-list-chief-row{height:22.5px;display:grid;grid-template-columns:40px 85px}
      .imp-list-chief-label,.imp-list-chief-value{height:22.5px;border:1px solid #508d60;background:#e4f2e0;color:#508d60;font-size:10px;font-weight:900;line-height:21.5px;text-align:center}
      .imp-list-chief-value{border-left:0;font-size:11px}
      .imp-list-chief-row.ppf .imp-list-chief-label{background:#2457b5;color:#fff;border-color:#2457b5}
      .imp-list-chief-row.ppf .imp-list-chief-value{background:#dfe8f8;color:#2457b5;border-color:#2457b5}
      .imp-list-chief-row.fpn .imp-list-chief-label{background:#8b1a1a;color:#fff;border-color:#8b1a1a}
      .imp-list-chief-row.fpn .imp-list-chief-value{background:#f6dede;color:#8b1a1a;border-color:#8b1a1a}
      .imp-frame-1-cell{height:90px;border:0}
      .imp-brasao-cell{display:flex;align-items:center;justify-content:center}
      .imp-brasao{width:76px;height:76px;object-fit:contain;display:block}
      .imp-org-text{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:12px;font-weight:900;line-height:1.25;text-transform:uppercase}
      .imp-mini-card{width:90px}
      .imp-mini-title{height:25px;border:1px solid #508d60;border-bottom:0;background:#508d60;color:#fff;font-size:12px;font-weight:900;text-align:center;line-height:24px;text-transform:uppercase}
      .imp-mini-body{height:65px;border:1px solid #508d60;background:#e4f2e0;color:#508d60;font-size:13px;font-weight:900;text-align:center;line-height:1.15;display:flex;flex-direction:column;align-items:center;justify-content:center}
      .imp-mini-date-value{font-size:15px;font-weight:900}
      .imp-mini-body-small{height:65px;border:1px solid #508d60;background:#e4f2e0;color:#508d60;font-size:18px;font-weight:900;text-align:center;line-height:64px}
      .imp-mini-weekday{font-size:8px;font-weight:900;margin-top:3px}
      .imp-card-gap{height:5px}
      .imp-info-banner{width:198px;height:20px;border:1px solid #111;font-size:12px;font-weight:900;text-align:center;line-height:19px;text-transform:uppercase}
      .imp-info-row{width:198px;height:20px;display:grid;grid-template-columns:108px 90px}
      .imp-info-row-title,.imp-info-row-body{height:20px;border:1px solid #111;font-size:8.5px;font-weight:900;line-height:19px;text-align:center}
      .imp-info-row-body{border-left:0;font-size:12px}
      .imp-info-table{width:198px;height:40px;border-collapse:separate;border-spacing:0;table-layout:fixed;border:1px solid #111}
      .imp-info-table td{width:99px;height:20px;border:1px solid #111;font-size:10px;line-height:19px;padding:0;text-align:center}
      .imp-info-table .imp-th{font-size:10px;font-weight:900;text-transform:uppercase}
      .imp-info-table tr:last-child td{font-size:13px;font-weight:900}
      .imp-frame-ppf .imp-info-banner,.imp-frame-ppf .imp-info-row-title,.imp-frame-ppf .imp-th{background:#2457b5;color:#fff;border-color:#2457b5}
      .imp-frame-ppf .imp-info-row-body,.imp-frame-ppf .imp-info-table,.imp-frame-ppf .imp-info-table td:not(.imp-th){background:#dfe8f8;color:#2457b5;border-color:#2457b5}
      .imp-frame-fpn .imp-info-banner,.imp-frame-fpn .imp-info-row-title,.imp-frame-fpn .imp-th{background:#8b1a1a;color:#fff;border-color:#8b1a1a}
      .imp-frame-fpn .imp-info-row-body,.imp-frame-fpn .imp-info-table,.imp-frame-fpn .imp-info-table td:not(.imp-th){background:#f6dede;color:#8b1a1a;border-color:#8b1a1a}
      .imp-info-table tr:first-child td{border-top:0}
      .imp-info-table td:first-child{border-left:0}
      .imp-info-table td:last-child{border-right:0}
      .imp-info-table tr:last-child td{border-bottom:0}
      .imp-info-table td+td{border-left:0}
      .imp-info-table tr+tr td{border-top:0}
      .imp-banner{width:1046px;height:20px;display:flex;align-items:center;justify-content:center;margin:0 0 5px 0;background:#2457b5;color:#fff;border:1px solid #1e40af;font-size:12px;font-weight:900;letter-spacing:.8px;text-transform:uppercase}
      .imp-banner-night{background:#15803d;color:#fff;border-color:#166534;margin-top:0}
      .imp-banner-gap{height:10px}
      .imp-row{width:1046px;display:grid;grid-template-columns:542px 1fr;gap:5px;align-items:start;margin-bottom:5px}
      .imp-stack{width:1046px;display:flex;flex-direction:column;align-items:flex-start}
      .imp-stack-gap{height:20px}
      .imp-scale-area{width:1046px;transform-origin:top left}
      .imp-block{break-inside:avoid;margin-bottom:2mm}
      .imp-block-title{height:6mm;display:flex;align-items:center;justify-content:center;background:#e5e7eb;border:1px solid #6b7280;border-bottom:0;font-size:10px;font-weight:900;text-transform:uppercase}
      .imp-grid-table{font-size:9px;font-weight:700}
      .imp-grid-t2{width:542px;margin-bottom:10px}
      .imp-grid-t3{width:469px}
      .imp-grid-t4{width:706px}
      .imp-grid-t5{width:469px}
      .imp-grid-head,.imp-grid-row{display:grid;gap:2px}
      .imp-grid-t2 .imp-grid-head,.imp-grid-t2 .imp-grid-row,.imp-grid-t2-group{grid-template-columns:50px repeat(var(--t2-cols,6),80px)}
      .imp-grid-t3 .imp-grid-head,.imp-grid-t3 .imp-grid-row{grid-template-columns:repeat(var(--viv-cols,5),1fr)}
      .imp-grid-t4 .imp-grid-head,.imp-grid-t4 .imp-grid-row,.imp-grid-t4-group{grid-template-columns:50px repeat(var(--t4-cols,8),80px)}
      .imp-grid-t5 .imp-grid-head,.imp-grid-t5 .imp-grid-row{grid-template-columns:repeat(var(--viv-cols,5),1fr)}
      .imp-grid-night-groups{height:18px;margin-bottom:2px;display:grid;grid-template-columns:50px repeat(var(--t4-cols,8),80px);gap:2px}
      .imp-grid-night-groups .imp-grid-cell{background:#15803d;color:#fff;border-color:#166534;font-size:11px;font-weight:900;text-transform:uppercase}
      .imp-grid-head{height:18px;margin-bottom:2px}
      .imp-grid-posto-head{margin-bottom:2px}
      .imp-grid-row{height:17px;margin-bottom:0}
      .imp-grid-cell{height:100%;display:flex;align-items:center;justify-content:center;border:1px solid #9ca3af;background:#fff;overflow:hidden;white-space:nowrap}
      .imp-grid-head .imp-grid-cell{background:#2457b5;color:#fff;border-color:#1e40af;font-size:11px;font-weight:900;text-transform:uppercase}
      .imp-grid-t4 .imp-grid-head .imp-grid-cell,
      .imp-grid-t5 .imp-grid-head .imp-grid-cell{background:#15803d;color:#fff;border-color:#166534}
      .imp-grid-t5 .imp-grid-cell{border-color:#b8d4b0}
      .imp-grid-posto{background:#f3f4f6;font-size:12px;font-weight:900}
      .imp-grid-cell.imp-grid-highlight{background:#fff7cc;color:#8b6914;font-weight:900;border-left-color:#d6b34d;border-right-color:#d6b34d;border-bottom-color:#d6b34d}
      .imp-zebra-diurno-claro{background:#fffdf7}
      .imp-zebra-diurno-suave{background:#f8fafc}
      .imp-zebra-noturno-claro{background:#fffdf7}
      .imp-zebra-noturno-suave{background:#f2fff7}
      .imp-grid-head .imp-zebra-diurno-claro{background:#2457b5;color:#fff;border-color:#1e40af}
      .imp-grid-head .imp-zebra-diurno-suave{background:#2457b5;color:#fff;border-color:#1e40af}
      .imp-grid-head .imp-zebra-noturno-claro{background:#15803d;color:#fff;border-color:#166534}
      .imp-grid-head .imp-zebra-noturno-suave{background:#15803d;color:#fff;border-color:#166534}
      .imp-grid-t4 .imp-grid-head .imp-grid-cell.imp-zebra-noturno-claro,
      .imp-grid-t5 .imp-grid-head .imp-grid-cell.imp-zebra-noturno-claro,
      .imp-grid-night-groups .imp-grid-cell.imp-zebra-noturno-claro{background:#15803d;color:#fff;border-color:#166534}
      .imp-grid-t4 .imp-grid-head .imp-grid-cell.imp-zebra-noturno-suave,
      .imp-grid-t5 .imp-grid-head .imp-grid-cell.imp-zebra-noturno-suave,
      .imp-grid-night-groups .imp-grid-cell.imp-zebra-noturno-suave{background:#15803d;color:#fff;border-color:#166534}
      .imp-grid-diurno .imp-grid-row .imp-grid-cell.imp-grid-highlight,
      .imp-grid-noturno .imp-grid-row .imp-grid-cell.imp-grid-highlight{background:#fff7cc;color:#8b6914;border-left-color:#d6b34d;border-right-color:#d6b34d;border-bottom-color:#d6b34d}
      .imp-grid-t2-group{display:grid;grid-auto-rows:17px;column-gap:2px;row-gap:0;margin-bottom:2px}
      .imp-grid-t4-group{display:grid;grid-auto-rows:17px;column-gap:2px;row-gap:0;margin-bottom:2px}
      .imp-grid-posto-merge{height:auto;grid-row:span var(--rows);align-self:stretch}
      .imp-grid-time{height:17px}
      .imp-grid-soft-bottom{border-bottom:.05px solid rgba(100,116,139,.08)}
      .imp-grid-soft-top{border-top:.05px solid rgba(100,116,139,.08)}
      .imp-grid-t3{justify-self:start}
      .imp-grid-t5{justify-self:start}
      .imp-grid-t3 .imp-grid-row:not(:last-child) .imp-grid-cell{border-bottom:.05px solid rgba(100,116,139,.08)}
      .imp-grid-t3 .imp-grid-row:not(:first-child) .imp-grid-cell{border-top:.05px solid rgba(100,116,139,.08)}
      .imp-grid-t5 .imp-grid-row + .imp-grid-row .imp-grid-cell{border-top:0}
      .imp-grid-group-gap{height:2px}
      .imp-name-cell{justify-content:flex-start;padding-left:2px;text-align:left}
      .imp-name-cell::before{display:none}
      .imp-name-cell.imp-name-filled::before{content:"";display:block;width:2px;height:2px;margin-right:2px;border-radius:50%;background:#64748b;flex:0 0 2px}
      .imp-grid-cell.imp-grid-highlight{justify-content:center;padding-left:0;text-align:center}
      .imp-grid-cell.imp-grid-highlight::before{display:none}
      table{border-collapse:collapse;table-layout:fixed;width:100%;font-family:Calibri,Arial,sans-serif}
      th,td{border:1px solid #9ca3af;height:5.3mm;padding:0 1.2mm;font-size:9.5px;text-align:center;vertical-align:middle;overflow:hidden;white-space:nowrap}
      th{background:#dbeafe;color:#111827;font-weight:900}
      .turno-noturno th{background:#e5e7eb}
      .posto-cell{background:#f3f4f6;font-weight:900}
      .destaque-linha td,.destaque-linha .posto-cell{background:#fff7cc}
      .t2-table{width:176mm}
      .t3-table{width:84mm}
      .t4-table,.t5-table{width:100%}
      .t4-head-grupos th{background:#d1d5db}
      .imp-lista{width:100%;border:2px solid #1f2937}
      .imp-lista th{height:7mm;background:#1f4e79;color:#fff;font-size:11px}
      .imp-lista td{height:7mm;font-size:11px}
      .imp-lista .nome{text-align:left;font-weight:700}
      .imp-lista .assinatura{width:40mm}
      .imp-list-section-title{width:718px;height:25px;display:flex;align-items:center;padding-left:5px;border:1px solid;font-size:12px;font-weight:900;text-transform:uppercase}
      .imp-list-section-title.ppf{background:#2457b5;color:#fff;border-color:#2457b5}
      .imp-list-section-title.fpn{background:#8b1a1a;color:#fff;border-color:#8b1a1a}
      .imp-list-section-title.resumo{background:#e4f2e0;color:#508d60;border-color:#508d60}
      .imp-list-subtitle{width:718px;height:20px;display:flex;align-items:center;padding-left:5px;border:1px solid;font-size:10px;font-weight:900;text-transform:uppercase}
      .imp-list-subtitle.ppf{background:#dfe8f8;color:#2457b5;border-color:#2457b5}
      .imp-list-subtitle.fpn{background:#f6dede;color:#8b1a1a;border-color:#8b1a1a}
      .imp-list-gap-10{height:10px}
      .imp-list-gap-20{height:20px}
      .imp-list-page{width:210mm;height:297mm;padding:8mm;break-after:page;page-break-after:always;background:#fff;margin:0 auto 12mm;box-shadow:0 8px 28px rgba(15,23,42,.35);overflow:hidden}
      .imp-list-force-section{break-inside:auto;page-break-inside:auto}
      .imp-list-page + .imp-list-page{break-before:page;page-break-before:always}
      .imp-list-page:last-child{break-after:auto;page-break-after:auto}
      .imp-list-top-gap{height:20px}
      .imp-resumo-banner{width:718px;height:25px;display:flex;align-items:center;padding-left:5px;border:1px solid;font-size:12px;font-weight:900;text-transform:uppercase}
      .imp-resumo-banner.ppf{background:#2457b5;color:#fff;border-color:#2457b5}
      .imp-resumo-banner.fpn{background:#8b1a1a;color:#fff;border-color:#8b1a1a}
      .imp-resumo-presenca{width:660px;margin-left:10px;border-collapse:collapse;table-layout:fixed;font-family:Calibri,Arial,sans-serif}
      .imp-resumo-presenca th,.imp-resumo-presenca td{height:20px;border:1px solid #9ca3af;font-size:10px;text-align:center;padding:0 4px;overflow:hidden;white-space:nowrap}
      .imp-resumo-presenca th{font-weight:900;text-transform:uppercase}
      .imp-resumo-presenca.ppf th{background:#2457b5;color:#fff;border-color:#2457b5}
      .imp-resumo-presenca.fpn th{background:#8b1a1a;color:#fff;border-color:#8b1a1a}
      .imp-resumo-presenca td:not(:first-child){font-weight:900;text-align:center}
      .imp-resumo-presenca.ppf tbody tr:nth-child(odd) td{background:#fffdf7}
      .imp-resumo-presenca.ppf tbody tr:nth-child(even) td{background:#f8fafc}
      .imp-resumo-presenca.fpn tbody tr:nth-child(odd) td{background:#fffdf7}
      .imp-resumo-presenca.fpn tbody tr:nth-child(even) td{background:#f6dede}
      .imp-resumo-presenca.ppf td.item{background:#dfe8f8;color:#2457b5}
      .imp-resumo-presenca.fpn td.item{background:#f6dede;color:#8b1a1a}
      .imp-resumo-presenca td.item{padding-left:5px;text-align:left;font-weight:900}
      .imp-resumo-presenca td.group{padding-left:15px;text-align:left;font-weight:900}
      .imp-resumo-presenca td.subitem{padding-left:20px;text-align:left;font-weight:700}
      .imp-resumo-presenca td.bullet::before{content:"";display:inline-block;width:4px;height:4px;margin-right:5px;border-radius:50%;background:#111;vertical-align:middle}
      .imp-resumo-presenca td.vazio{background:#fff}
      .imp-resumo-turno{width:200px;margin-left:10px;border-collapse:collapse;table-layout:fixed;font-family:Calibri,Arial,sans-serif}
      .imp-resumo-turno td{height:20px;border:1px solid #9ca3af;font-size:10px;font-weight:900;text-align:center;padding:0 4px}
      .imp-resumo-turno.ppf td:first-child{background:#dfe8f8;color:#2457b5;border-color:#2457b5}
      .imp-resumo-turno.fpn td:first-child{background:#f6dede;color:#8b1a1a;border-color:#8b1a1a}
      .imp-resumo-turno td:last-child{width:40px}
      .imp-resumo-turno.ppf td{border-color:#2457b5}
      .imp-resumo-turno.fpn td{border-color:#8b1a1a}
      .imp-pres-table{width:718px;border-collapse:collapse;table-layout:fixed;font-family:Calibri,Arial,sans-serif}
      .imp-pres-table th{height:20px;border:1px solid #9ca3af;font-size:10px;font-weight:900;text-align:center;text-transform:uppercase}
      .imp-pres-table td{height:20px;border:1px solid #cbd5e1;font-size:10px;text-align:center;padding:0 3px;overflow:hidden;white-space:nowrap}
      .imp-pres-table th:last-child,.imp-pres-table td:last-child,
      .imp-resumo-presenca th:last-child,.imp-resumo-presenca td:last-child,
      .imp-resumo-turno td:last-child{border-right-width:2px}
      .imp-pres-table td.nome{text-align:left;font-weight:700}
      .imp-pres-table td.obs{text-align:left;padding-left:5px}
      .imp-pres-table.ppf th{background:#2457b5;color:#fff;border-color:#2457b5}
      .imp-pres-table.fpn th{background:#8b1a1a;color:#fff;border-color:#8b1a1a}
      .imp-pres-table tr.ausente td{background:#fee2e2!important;color:#b91c1c;font-weight:800}
      .imp-pres-table tbody tr:nth-child(odd) td{background:#fffdf7}
      .imp-pres-table tbody tr:nth-child(even) td{background:#f8fafc}
      .imp-pres-table.fpn tbody tr:nth-child(even) td{background:#f6dede}
      @page{margin:0}
      @media print{html,body{background:#fff} body{padding:0!important}.imp-page,.imp-list-page{margin:0;box-shadow:none}.imp-pres-table tr,.imp-resumo-presenca tr,.imp-resumo-turno tr{break-inside:avoid;page-break-inside:avoid}}
    `;
  }

  function dataPlantao(){
    const dateInput = document.getElementById("topoDatePicker");
    const dia = txt(document.getElementById("topoDiaSemana")?.textContent);
    const plantao = txt(document.getElementById("topoPlantaoDia")?.textContent) || "PLANTÃO";
    let data = dateInput?.value || "";
    if (data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      const [ano, mes, diaNum] = data.split("-");
      data = `${diaNum}/${mes}/${ano}`;
    }
    return {data: data || "___/___/____", dia, plantao};
  }

  function responsavelView(forca, posto){
    const block = document.querySelector(`.force-block.force-${forca}`);
    const row = Array.from(block?.querySelectorAll(".resp-table tbody tr") || []).find((tr) => normImp(tr.querySelector(".resp-role")?.textContent) === normImp(posto));
    const select = row?.querySelector(".resp-inline-select");
    const nome = select ? txt(select.value) : txt(row?.querySelector(".resp-name")?.textContent);
    return nome && !["-","—","⊘"].includes(nome) ? nome : "";
  }

  function statForca(forca, selector){
    return txt(document.querySelector(`.force-block.force-${forca} ${selector}`)?.textContent).replace(/[^\d]/g,"") || "00";
  }

  function dadosTopoPrint(){
    const dp = dataPlantao();
    return {
      ...dp,
      ppf:{
        chefe:responsavelView("ppf","CHEFE DE PLANTAO"),
        diurno:statForca("ppf",".stat-day"),
        noturno:statForca("ppf",".stat-night")
      },
      fpn:{
        chefe:responsavelView("fpn","CHEFE DE PLANTAO"),
        diurno:statForca("fpn",".stat-day"),
        noturno:statForca("fpn",".stat-night")
      }
    };
  }

  function cabecalho(){
    const dp = dataPlantao();
    return `
      <header class="imp-cab">
        <div class="imp-cab-cell">
          <div class="imp-org">Ministério da Justiça</div>
          <div class="imp-meta">Escala operacional</div>
        </div>
        <div class="imp-title">Escala de Serviço</div>
        <div class="imp-cab-cell">
          <div class="imp-meta">Data: ${esc(dp.data)}</div>
          <div class="imp-meta">${esc(dp.dia || dp.plantao)}</div>
        </div>
      </header>`;
  }

  function topoEscalaServico(){
    const dados = dadosTopoPrint();
    const brasaoSrc = new URL("brasao_republica.png", window.location.href).href;
    return `
      <div class="imp-top-frames">
        <div class="imp-top-frame imp-frame-1">
          <div class="imp-frame-1-cell imp-brasao-cell"><img class="imp-brasao" src="${brasaoSrc}" alt="Brasão da República"></div>
          <div class="imp-frame-1-cell imp-org-text">
            <div>MINISTERIO DA JUSTICA E SEGURANCA PUBLICA</div>
            <div>SECRETARIA NACIONAL DE SERVICOS PENAIS</div>
            <div>PENITENCIARIA FEDERAL DE MOSSORO</div>
            <div>DIVISAO DE SEGURANCA E DISCIPLINA</div>
          </div>
        </div>
        <div class="imp-top-frame imp-frame-2">
          <div class="imp-mini-card">
            <div class="imp-mini-title">DATA</div>
            <div class="imp-mini-body"><div class="imp-mini-date-value">${esc(dados.data)}</div><div class="imp-mini-weekday">${esc(dados.dia)}</div></div>
          </div>
        </div>
        <div class="imp-top-frame imp-frame-2">
          <div class="imp-mini-card">
            <div class="imp-mini-title">PLANTAO</div>
            <div class="imp-mini-body-small">${esc(dados.plantao)}</div>
          </div>
        </div>
        <div class="imp-top-frame imp-frame-3 imp-frame-ppf">
          <div class="imp-info-banner">PPF</div>
          <div class="imp-card-gap"></div>
          <div class="imp-info-row">
            <div class="imp-info-row-title">CHEFE DE PLANTAO</div>
            <div class="imp-info-row-body">${esc(dados.ppf.chefe)}</div>
          </div>
          <div class="imp-card-gap"></div>
          <table class="imp-info-table"><tbody>
            <tr><td class="imp-th">DIURNO</td><td class="imp-th">NOTURNO</td></tr>
            <tr><td>${esc(dados.ppf.diurno)}</td><td>${esc(dados.ppf.noturno)}</td></tr>
          </tbody></table>
        </div>
        <div class="imp-top-frame imp-frame-4 imp-frame-fpn">
          <div class="imp-info-banner">FPN</div>
          <div class="imp-card-gap"></div>
          <div class="imp-info-row">
            <div class="imp-info-row-title">CHEFE DE PLANTAO</div>
            <div class="imp-info-row-body">${esc(dados.fpn.chefe)}</div>
          </div>
          <div class="imp-card-gap"></div>
          <table class="imp-info-table"><tbody>
            <tr><td class="imp-th">DIURNO</td><td class="imp-th">NOTURNO</td></tr>
            <tr><td>${esc(dados.fpn.diurno)}</td><td>${esc(dados.fpn.noturno)}</td></tr>
          </tbody></table>
        </div>
      </div>`;
  }

  function topoListaPresenca(){
    const dados = dadosTopoPrint();
    const brasaoSrc = new URL("brasao_republica.png", window.location.href).href;
    return `
      <div class="imp-list-top-frames">
        <div class="imp-top-frame imp-list-frame-1">
          <div class="imp-frame-1-cell imp-brasao-cell"><img class="imp-brasao" src="${brasaoSrc}" alt="Brasão da República"></div>
          <div class="imp-frame-1-cell imp-org-text">
            <div>MINISTERIO DA JUSTICA E SEGURANCA PUBLICA</div>
            <div>SECRETARIA NACIONAL DE SERVICOS PENAIS</div>
            <div>PENITENCIARIA FEDERAL DE MOSSORO</div>
            <div>DIVISAO DE SEGURANCA E DISCIPLINA</div>
          </div>
        </div>
        <div class="imp-top-frame">
          <div class="imp-mini-card">
            <div class="imp-mini-title">DATA</div>
            <div class="imp-mini-body"><div class="imp-mini-date-value">${esc(dados.data)}</div><div class="imp-mini-weekday">${esc(dados.dia)}</div></div>
          </div>
        </div>
        <div class="imp-top-frame">
          <div class="imp-mini-card">
            <div class="imp-mini-title">PLANTAO</div>
            <div class="imp-mini-body-small">${esc(dados.plantao)}</div>
          </div>
        </div>
        <div class="imp-top-frame imp-list-chief-box">
          <div class="imp-list-chief-title">CHEFE DE PLANTAO</div>
          <div class="imp-list-chief-gap"></div>
          <div class="imp-list-chief-row ppf">
            <div class="imp-list-chief-label">PPF</div>
            <div class="imp-list-chief-value">${esc(dados.ppf.chefe)}</div>
          </div>
          <div class="imp-list-chief-gap"></div>
          <div class="imp-list-chief-row fpn">
            <div class="imp-list-chief-label">FPN</div>
            <div class="imp-list-chief-value">${esc(dados.fpn.chefe)}</div>
          </div>
        </div>
      </div>`;
  }

  function limparCloneTabela(table){
    const clone = table.cloneNode(true);
    clone.querySelectorAll("button").forEach((btn) => {
      const span = document.createElement("span");
      span.textContent = txt(btn.textContent);
      btn.replaceWith(span);
    });
    clone.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
    return clone.outerHTML;
  }

  function blocoTabela(id, titulo){
    const table = document.getElementById(id);
    if (!table) return "";
    return `<section class="imp-block"><div class="imp-block-title">${esc(titulo)}</div>${limparCloneTabela(table)}</section>`;
  }

  function cell(value, extraClass = ""){
    const filledName = txt(value) && /\bimp-name-cell\b/.test(extraClass) ? " imp-name-filled" : "";
    return `<div class="imp-grid-cell ${extraClass}${filledName}">${esc(value)}</div>`;
  }

  function timeCell(value, softBottom, softTop, zebraClass = ""){
    return cell(value, `imp-grid-time ${zebraClass}${softBottom ? " imp-grid-soft-bottom" : ""}${softTop ? " imp-grid-soft-top" : ""}`);
  }

  function zebraDiurno(index){
    return index % 2 === 0 ? "imp-zebra-diurno-claro" : "imp-zebra-diurno-suave";
  }

  function zebraNoturno(index){
    return index % 2 === 0 ? "imp-zebra-noturno-claro" : "imp-zebra-noturno-suave";
  }

  function zebraNoturnoPar(index){
    return Math.floor(index / 2) % 2 === 0 ? "imp-zebra-noturno-claro" : "imp-zebra-noturno-suave";
  }

  function tableMatrix(id){
    const table = document.getElementById(id);
    if (!table) return {head: [], rows: []};
    const head = Array.from(table.querySelectorAll("thead tr:last-child th")).map((th) => txt(th.textContent));
    const rows = Array.from(table.querySelectorAll("tbody tr")).map((tr) => Array.from(tr.children).map((td) => txt(td.querySelector(".s03-alocado-nome")?.textContent || td.dataset.nomeAlocado || td.textContent)));
    return {head, rows};
  }

  function tableHeaderRows(id){
    const table = document.getElementById(id);
    if (!table) return [];
    return Array.from(table.querySelectorAll("thead tr")).map((tr) => Array.from(tr.children).map((th) => ({
      text: txt(th.textContent),
      colspan: Math.max(1, Number(th.getAttribute("colspan")) || 1)
    })));
  }

  function valoresLinhaEscala(row, count){
    const values = Array.isArray(row) ? row.slice(-count) : [];
    return Array.from({length:count}, (_, index) => values[index] || "");
  }

  function horariosVivenciaPrint(tableId, headerRows, totalCols){
    if (headerRows.length > 1) return headerRows[headerRows.length - 1].map((item) => item.text);
    const labels = [tableId === "tbl-T5" ? "07:00-08:00" : "08:00-18:00"];
    return Array.from({length: totalCols}, (_, index) => labels[index % labels.length]);
  }

  function horariosPostosPrint(headerRows, head){
    const lastHeaderRow = headerRows[headerRows.length - 1] || [];
    const labels = lastHeaderRow.length ? lastHeaderRow.map((item) => item.text) : head;
    return labels.filter((value, index) => index !== 0 || normImp(value) !== "POSTO");
  }

  function spanCell(value, span, extraClass = ""){
    return `<div class="imp-grid-cell ${extraClass}" style="grid-column:span ${Math.max(1, Number(span) || 1)}">${esc(value)}</div>`;
  }

  function buildT2Diurno(){
    const {head, rows} = tableMatrix("tbl-T2");
    const headerRows = tableHeaderRows("tbl-T2");
    const horarios = horariosPostosPrint(headerRows, head);
    const slotCount = horarios.length;
    const groups = [
      {label:"P1", rows:5, softUntil:4},
      {label:"P2", rows:3, softUntil:2},
      {label:"T1", rows:1, softUntil:0},
      {label:"T2", rows:1, softUntil:0},
      {label:"T3", rows:1, softUntil:0},
      {label:"T4", rows:1, softUntil:0}
    ];
    let rowIndex = 0;
    const rowHtml = groups.map((group) => {
      let html = `<div class="imp-grid-t2-group" style="--rows:${group.rows}">`;
      html += cell(group.label, "imp-grid-posto imp-grid-posto-merge");
      for (let localRow = 1; localRow <= group.rows; localRow += 1) {
        const source = rows[rowIndex] || [];
        rowIndex += 1;
        const values = valoresLinhaEscala(source, slotCount);
        html += values.map((value, colIndex) => {
          const zebra = zebraDiurno(colIndex);
          const highlight = localRow === 1 && (group.label === "P1" || group.label === "P2") ? " imp-grid-highlight" : "";
          return timeCell(value, localRow <= group.softUntil, localRow > 1, `${zebra}${highlight}${highlight ? "" : " imp-name-cell"}`);
        }).join("");
      }
      html += "</div>";
      return html;
    }).join("");

    const width = 50 + (slotCount * 80) + (slotCount * 2);
    return `<section class="imp-grid-table imp-grid-t2 imp-grid-diurno" style="--t2-cols:${slotCount};width:${width}px">
      <div class="imp-grid-head">${cell("POSTO", "imp-zebra-diurno-claro")}${horarios.map((value, colIndex) => cell(value, zebraDiurno(colIndex))).join("")}</div>
      ${rowHtml}
    </section>`;
  }

  function buildT3Diurno(){
    const {head, rows} = tableMatrix("tbl-T3");
    const headerRows = tableHeaderRows("tbl-T3");
    const postos = headerRows[0]?.length ? headerRows[0] : head.slice(0, 5).map((text) => ({text, colspan:1}));
    const totalCols = postos.reduce((sum, item) => sum + item.colspan, 0) || head.length || 5;
    const horarios = horariosVivenciaPrint("tbl-T3", headerRows, totalCols);
    const rowHtml = rows.map((source, rowIndex) => {
      const values = valoresLinhaEscala(source,totalCols);
      const highlight = rowIndex === 0 ? " imp-grid-highlight" : "";
      return `<div class="imp-grid-row">${values.map((value, colIndex) => cell(value, `${zebraDiurno(colIndex)}${highlight}${highlight ? "" : " imp-name-cell"}`)).join("")}</div>`;
    }).join("");

    return `<section class="imp-grid-table imp-grid-t3 imp-grid-diurno" style="--viv-cols:${totalCols}">
      <div class="imp-grid-head imp-grid-posto-head">${postos.map((item, colIndex) => spanCell(item.text, item.colspan, zebraDiurno(colIndex))).join("")}</div>
      <div class="imp-grid-head">${horarios.map((value, colIndex) => cell(value, zebraDiurno(colIndex))).join("")}</div>
      ${rowHtml}
    </section>`;
  }

  function formatMinutes(value){
    const normalized = value % (24 * 60);
    const h = String(Math.floor(normalized / 60)).padStart(2, "0");
    const m = String(normalized % 60).padStart(2, "0");
    return `${h}:${m}`;
  }

  function nightSlots(){
    const slots = [];
    let total = 20 * 60;
    for (let index = 0; index < 8; index += 1) {
      const start = total;
      const end = total + 90;
      slots.push(`${formatMinutes(start)}-${formatMinutes(end)}`);
      total = end;
    }
    return slots;
  }

  function nightGroupHeaders(slots){
    const groups = [];
    for (let index = 0; index < slots.length; index += 2) {
      const first = slots[index] || "";
      const last = slots[Math.min(index + 1, slots.length - 1)] || first;
      const start = first.split("-")[0] || first;
      const end = last.split("-")[1] || last.split("-")[0] || last;
      groups.push({text:`${start}-${end}`, colspan:Math.min(2, slots.length - index)});
    }
    return groups;
  }

  function buildT4Noturno(){
    const {head, rows} = tableMatrix("tbl-T4");
    const headerRows = tableHeaderRows("tbl-T4");
    const slots = horariosPostosPrint(headerRows, head);
    if (!slots.length) slots.push(...nightSlots());
    const slotCount = slots.length;
    const groupHeaders = headerRows[0]?.filter((item) => normImp(item.text) !== "POSTO") || [];
    const groupLabels = groupHeaders.length ? groupHeaders : nightGroupHeaders(slots.length ? slots : nightSlots());
    const groups = [
      {label:"P1", rows:5, softUntil:4},
      {label:"P2", rows:3, softUntil:2},
      {label:"T1", rows:1, softUntil:0},
      {label:"T2", rows:1, softUntil:0},
      {label:"T3", rows:1, softUntil:0},
      {label:"T4", rows:1, softUntil:0}
    ];
    let rowIndex = 0;
    const rowHtml = groups.map((group) => {
      let html = `<div class="imp-grid-t4-group" style="--rows:${group.rows}">`;
      html += cell(group.label, "imp-grid-posto imp-grid-posto-merge");
      for (let localRow = 1; localRow <= group.rows; localRow += 1) {
        const source = rows[rowIndex] || [];
        rowIndex += 1;
        const values = valoresLinhaEscala(source,slotCount);
        html += values.map((value, colIndex) => {
          const zebra = zebraNoturnoPar(colIndex);
          return timeCell(value, localRow <= group.softUntil, localRow > 1, `${zebra} imp-name-cell`);
        }).join("");
      }
      html += "</div>";
      return html;
    }).join("");

    const width = 50 + (slotCount * 80) + (slotCount * 2);
    return `<section class="imp-grid-table imp-grid-t4 imp-grid-noturno" style="--t4-cols:${slotCount};width:${width}px">
      <div class="imp-grid-night-groups">${cell("", "imp-zebra-noturno-claro")}${groupLabels.map((item, groupIndex) => spanCell(item.text, item.colspan, zebraNoturno(groupIndex))).join("")}</div>
      <div class="imp-grid-head">${cell("POSTO", "imp-zebra-noturno-claro")}${slots.map((value, colIndex) => cell(value, zebraNoturnoPar(colIndex))).join("")}</div>
      ${rowHtml}
    </section>`;
  }

  function buildT5Noturno(){
    const source = tableMatrix("tbl-T5");
    const headerRows = tableHeaderRows("tbl-T5");
    const postos = headerRows[0]?.length ? headerRows[0] : source.head.slice(0, 5).map((text) => ({text, colspan:1}));
    const totalCols = postos.reduce((sum, item) => sum + item.colspan, 0) || source.head.length || 5;
    const headers = horariosVivenciaPrint("tbl-T5", headerRows, totalCols);
    const rows = source.rows.map((row) => {
      return `<div class="imp-grid-row">${valoresLinhaEscala(row,totalCols).map((value, colIndex) => cell(value, `${zebraNoturno(colIndex)} imp-name-cell`)).join("")}</div>`;
    }).join("");

    return `<section class="imp-grid-table imp-grid-t5 imp-grid-noturno" style="--viv-cols:${totalCols}">
      <div class="imp-grid-head imp-grid-posto-head">${postos.map((item, colIndex) => spanCell(item.text, item.colspan, zebraNoturno(colIndex))).join("")}</div>
      <div class="imp-grid-head">${headers.map((value, colIndex) => cell(value, zebraNoturno(colIndex))).join("")}</div>
      ${rows}
    </section>`;
  }

  function buildEscala(){
    return `
      <div class="imp-page">
        ${topoEscalaServico()}
        <div class="imp-escala-section">
          <div class="imp-banner">Escala diurna</div>
          <div class="imp-banner-gap"></div>
          <div class="imp-scale-area">
            <div class="imp-stack">
              ${buildT2Diurno()}
              <div class="imp-stack-gap"></div>
              ${buildT3Diurno()}
            </div>
          </div>
        </div>
      </div>
      <div class="imp-page">
        ${topoEscalaServico()}
        <div class="imp-escala-section">
          <div class="imp-banner imp-banner-night">Escala noturna</div>
          <div class="imp-banner-gap"></div>
          <div class="imp-scale-area">
            ${buildT4Noturno()}
            <div class="imp-stack-gap"></div>
            ${buildT5Noturno()}
          </div>
        </div>
      </div>
    `;
  }

  function linhasEfetivo(){
    return Array.from(document.querySelectorAll("#eftCanonicoBody tr")).map((tr, index) => {
      const cells = tr.children;
      return {
        num: txt(cells[0]?.textContent) || String(index + 1).padStart(2, "0"),
        nome: txt(cells[2]?.textContent),
        obs: txt(cells[5]?.textContent),
        turno: txt(cells[8]?.textContent),
        situacao: txt(cells[1]?.textContent) || "PRES",
        tipo: txt(cells[7]?.textContent) || "fixo"
      };
    }).filter((row) => row.nome);
  }

  function buildListaPresenca(){
    const norm = (value) => txt(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const plantaoAtual = norm(document.getElementById("topoPlantaoDia")?.textContent);
    const servidores = Array.from(document.querySelectorAll("#svTbody tr")).map((tr) => {
      const c = tr.children;
      return {
        id:norm(c[0]?.textContent),
        nome:norm(c[2]?.textContent),
        curto:norm(c[3]?.textContent),
        forca:norm(c[4]?.textContent),
        status:norm(c[5]?.textContent),
        plantao:norm(c[6]?.textContent),
        turno:norm(c[7]?.textContent),
        motPres:norm(c[9]?.textContent),
        jornada:norm(c[10]?.textContent),
        horario:norm(c[11]?.textContent),
        motAus:norm(c[12]?.textContent),
        substituto:norm(c[13]?.textContent),
        plantaoPgto:norm(c[14]?.textContent),
        idPgto:norm(c[15]?.textContent),
        statusPgto:norm(c[16]?.textContent)
      };
    }).filter((row) => row.nome);
    const ativo = (row) => row.status === "ATIVO";
    const valorVazio = (value) => !value || value === "-" || value === "\u2014" || value === "NAO" || value === "N\u00c3O";
    const motivoAusencia = (row) => valorVazio(row.motAus) ? "" : row.motAus;
    const motivoPresenca = (row) => valorVazio(row.motPres) ? "" : row.motPres;
    const normalizarTurnoResumo = (value) => {
      const v = norm(value);
      return v === "24H" ? "h24" : v === "NOTURNO" ? "noturno" : "diurno";
    };
    const turnoKey = (row) => normalizarTurnoResumo(row.turno);
    const jornadaKey = (row) => normalizarTurnoResumo(row.jornada || row.turno);
    const turnos = ["h24","noturno","diurno"];
    const rowValores = (values) => {
      const h24 = Number(values.h24) || 0;
      const noturno = Number(values.noturno) || 0;
      const diurno = Number(values.diurno) || 0;
      return {h24, noturno, diurno, total:h24 + noturno + diurno};
    };
    const contarPorChaveTurno = (rows, getKey = turnoKey) => rowValores(rows.reduce((acc, row) => {
      const key = getKey(row);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}));
    const contarPorTurno = (rows) => contarPorChaveTurno(rows, turnoKey);
    const contarPorJornada = (rows) => contarPorChaveTurno(rows, jornadaKey);
    const fmtNum = (value) => String(Number(value) || 0).padStart(2, "0");
    const porForca = (kind) => servidores.filter((row) => ativo(row) && row.forca === kind.toUpperCase());
    const fixos = (kind, turno) => porForca(kind).filter((row) => row.plantao === plantaoAtual && row.turno === turno);
    const permutasPgto = (kind, statusPgto) => porForca(kind).filter((row) => row.plantao !== plantaoAtual && row.idPgto && row.plantaoPgto === plantaoAtual && (!statusPgto || row.statusPgto === statusPgto));
    const extras = (kind) => porForca(kind).filter((row) => (row.plantao !== plantaoAtual || !row.plantao) && motivoPresenca(row) && !motivoAusencia(row));
    const nomeCurtoPorId = new Map(servidores.map((row) => [row.id, row.curto || row.nome]));
    const parceiroPermuta = (row) => {
      if (!row?.idPgto) return null;
      return servidores.find((item) =>
        item.id !== row.id &&
        item.idPgto === row.idPgto &&
        item.forca === row.forca
      ) || null;
    };

    function sectionTitle(label, kind){
      return `<div class="imp-list-section-title ${kind}">${esc(label)}</div>`;
    }

    function subTitle(label, kind){
      return `<div class="imp-list-subtitle ${kind}">${esc(label)}</div>`;
    }

    function presTable(headers, kind, rowsData, startIndex = 0){
      const isExtraTable = headers.includes("MOTIVO") && headers.includes("TURNO") && !headers.includes("SUBSTITUTO");
      const colgroup = isExtraTable
        ? '<col style="width:25px"><col style="width:233px"><col style="width:85px"><col style="width:135px"><col style="width:85px"><col style="width:155px">'
        : '<col style="width:25px"><col style="width:233px"><col style="width:85px"><col style="width:85px"><col style="width:85px"><col style="width:205px">';
      const rows = rowsData.map((row, index) => {
        const ausente = row.situacao === "AUSENTE";
        const values = headers.map((header) => {
          if (header === "#") return String(startIndex + index + 1).padStart(2, "0");
          if (header === "NOME COMPLETO") return row.nome;
          if (header === "SITUACAO") return row.situacao;
          if (header === "MOTIVO") return row.motivo;
          if (header === "SUBSTITUTO") return row.substituto;
          if (header === "TURNO") return row.turno;
          if (header === "OBS") return row.obs;
          return "";
        });
        return `<tr class="${ausente ? "ausente" : ""}">${values.map((value, colIndex) => `<td class="${headers[colIndex] === "NOME COMPLETO" ? "nome" : headers[colIndex] === "OBS" ? "obs" : ""}">${esc(value)}</td>`).join("")}</tr>`;
      }).join("");

      return `<table class="imp-pres-table ${kind}">
        <colgroup>${colgroup}</colgroup>
        <thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    }

    function mapFixo(row){
      const motivo = motivoAusencia(row);
      const ausente = motivo !== "";
      return {
        nome:row.nome,
        situacao:ausente ? "AUSENTE" : "PRESENTE",
        motivo:ausente ? motivo : "",
        substituto:motivo === "PERMUTA" ? (nomeCurtoPorId.get(row.substituto) || row.substituto) : "",
        turno:row.turno,
        obs:""
      };
    }

    function mapPgto(row){
      const ausente = row.statusPgto === "AUSENTE";
      const parceiro = parceiroPermuta(row);
      return {
        nome:row.nome,
        situacao:ausente ? "AUSENTE" : "PRESENTE",
        motivo:ausente ? row.motAus : "",
        substituto:parceiro ? (parceiro.curto || parceiro.nome || "") : "",
        turno:row.turno,
        obs:""
      };
    }

    function mapExtra(row){
      return {
        nome:row.nome,
        situacao:"PRESENTE",
        motivo:motivoPresenca(row),
        substituto:"",
        turno:row.jornada,
        obs:row.horario
      };
    }

    function resumoValores(kind){
      const base = porForca(kind);
      const noPlantao = base.filter((row) => row.plantao === plantaoAtual);
      const efetivoFixo = contarPorTurno(noPlantao);
      const ausComumRows = noPlantao.filter((row) => {
        const motivo = motivoAusencia(row);
        return motivo && motivo !== "PERMUTA";
      });
      const ausComum = contarPorTurno(ausComumRows);
      const porMotivo = (...motivos) => contarPorTurno(ausComumRows.filter((row) => motivos.includes(motivoAusencia(row))));
      const ausPermuta = contarPorTurno(noPlantao.filter((row) => motivoAusencia(row) === "PERMUTA"));
      const presenteFixo = rowValores(Object.fromEntries(turnos.map((key) => [key, efetivoFixo[key] - ausComum[key] - ausPermuta[key]])));
      const pgtoPermuta = contarPorTurno(permutasPgto(kind, "PRESENTE"));
      const extraRows = extras(kind);
      const outrasExtra = contarPorTurno(extraRows);
      const apoioExtra = contarPorTurno(extraRows.filter((row) => motivoPresenca(row) === "APOIO"));
      const compensacaoExtra = contarPorJornada(extraRows.filter((row) => motivoPresenca(row) === "COMPENSACAO"));
      const totalFora = rowValores(Object.fromEntries(turnos.map((key) => [key, pgtoPermuta[key] + apoioExtra[key] + compensacaoExtra[key]])));
      const faltaPgto = contarPorTurno(permutasPgto(kind, "AUSENTE"));
      const totalGeral = rowValores(Object.fromEntries(turnos.map((key) => [key, presenteFixo[key] + totalFora[key] - faltaPgto[key]])));
      return {
        efetivoFixo, ausComum,
        atestado:porMotivo("ATESTADO", "ATESTADO MEDICO"),
        compensacao:porMotivo("COMPENSACAO"),
        ferias:porMotivo("FERIAS"),
        licenca:porMotivo("LICENCA"),
        missao:porMotivo("MISSAO"),
        outras:porMotivo("OUTROS"),
        ausPermuta, presenteFixo, pgtoPermuta, outrasExtra, apoioExtra, compensacaoExtra,
        totalFora, faltaPgto, totalGeral,
        efetivoDiurno:totalGeral.h24 + totalGeral.diurno,
        efetivoNoturno:totalGeral.h24 + totalGeral.noturno
      };
    }

    function resumoPresencaLinhas(kind){
      const v = resumoValores(kind);
      const todosZero = (values) => !values || (values.h24===0 && values.noturno===0 && values.diurno===0);
      const linhasBase = [
        ["EFETIVO FIXO DO PLANTAO","item",v.efetivoFixo,null],
        ["AUSENCIAS COMUM","group",v.ausComum,null],
        ["ATESTADO MEDICO","subitem bullet",v.atestado,"ocultar"],
        ["COMPENSACAO","subitem bullet",v.compensacao,"ocultar"],
        ["FERIAS","subitem bullet",v.ferias,"ocultar"],
        ["LICENCA","subitem bullet",v.licenca,"ocultar"],
        ["MISSAO","subitem bullet",v.missao,"ocultar"],
        ["OUTROS","subitem bullet",v.outras,"ocultar"],
        ["","vazio",null,null],
        ["AUSENCIAS POR PERMUTA","group",v.ausPermuta,null],
        ["","vazio",null,null],
        ["TOTAL DE PRESENTE DO EFETIVO FIXO","item",v.presenteFixo,null],
        ["","vazio",null,null],
        ["EFETIVO DE FORA DO PLANTAO","item",null,null],
        ["PAGAMENTO DE PERMUTA","group",v.pgtoPermuta,null],
        ["OUTROS PRESENCAS EXTRA","group",v.outrasExtra,null],
        ["APOIO EXTRA","subitem",v.apoioExtra,"ocultar"],
        ["COMPENSACAO","subitem",v.compensacaoExtra,"ocultar"],
        ["TOTAL DO EFETIVO DE FORA DO PLANTAO","group",v.totalFora,null],
        ["","vazio",null,null],
        ["AUSENCIA NO PAGAMENTO DE PERMUTA","item",v.faltaPgto,null],
        ["","vazio",null,null],
        ["TOTAL GERAL DE PRESENTES NO PLANTAO","item",v.totalGeral,null]
      ];
      return linhasBase.filter(([,, values, flag]) =>
        flag !== "ocultar" || !todosZero(values)
      );
    }

    function resumoPresencaTabela(kind, linhas = resumoPresencaLinhas(kind)){
      return `<table class="imp-resumo-presenca ${kind}">
        <colgroup><col style="width:300px"><col style="width:90px"><col style="width:90px"><col style="width:90px"><col style="width:90px"></colgroup>
        <thead><tr><th>ITEM</th><th>24H</th><th>NOTURNO</th><th>DIURNO</th><th>TOTAL</th></tr></thead>
        <tbody>${linhas.map(([label,cls,values])=>`<tr><td class="${cls}">${esc(label)}</td><td>${values?fmtNum(values.h24):""}</td><td>${values?fmtNum(values.noturno):""}</td><td>${values?fmtNum(values.diurno):""}</td><td>${values?fmtNum(values.total):""}</td></tr>`).join("")}</tbody>
      </table>`;
    }

    function resumoTurnoTabela(kind){
      const v = resumoValores(kind);
      return `<table class="imp-resumo-turno ${kind}">
        <tbody>
          <tr><td>EFETIVO DIURNO</td><td>${fmtNum(v.efetivoDiurno)}</td></tr>
          <tr><td>EFETIVO NOTURNO</td><td>${fmtNum(v.efetivoNoturno)}</td></tr>
        </tbody>
      </table>`;
    }

    const headersFixo = ["#","NOME COMPLETO","SITUACAO","MOTIVO","SUBSTITUTO","OBS"];
    const headersPermuta = ["#","NOME COMPLETO","SITUACAO","SUBSTITUTO","TURNO","OBS"];
    const headersExtra = ["#","NOME COMPLETO","SITUACAO","MOTIVO","TURNO","OBS"];
    const dados = (kind) => ({
      fixo24:fixos(kind.toUpperCase(), "24H").map(mapFixo),
      fixoNoturno:fixos(kind.toUpperCase(), "NOTURNO").map(mapFixo),
      pgto:permutasPgto(kind.toUpperCase()).map(mapPgto),
      extra:extras(kind.toUpperCase())
        .slice()
        .sort((a,b)=>String(a.nome||"").localeCompare(String(b.nome||""),"pt-BR",{sensitivity:"base"}))
        .map(mapExtra)
    });
    const ppfDados = dados("ppf");
    const fpnDados = dados("fpn");
    const topoHtml = topoListaPresenca();
    const gap10 = `<div class="imp-list-gap-10"></div>`;
    const gap20 = `<div class="imp-list-gap-20"></div>`;

    const PAGE_CONTENT_H = 1062;
    const HEADER_H = 120;
    const AVAILABLE_H = PAGE_CONTENT_H - HEADER_H;
    const H = {section:25, sub:20, gap10:10, gap20:20, row:20, tableHead:20};
    const pages = [];
    let current = [];
    let used = 0;

    const pageHtml = (items) => `<div class="imp-list-page">${topoHtml}<div class="imp-list-top-gap"></div><div class="imp-list-force-section">${items.join("")}</div></div>`;
    const finishPage = () => {
      if(current.length)pages.push(pageHtml(current));
      current = [];
      used = 0;
    };
    const ensure = (height) => {
      if(current.length && used + height > AVAILABLE_H)finishPage();
    };
    const add = (html, height) => {
      ensure(height);
      current.push(html);
      used += height;
    };
    const addTableSection = (label, headers, kind, rowsData) => {
      let index = 0;
      const minHeader = H.sub + H.gap10 + H.tableHead;
      if(!rowsData.length){
        add(`${subTitle(label, kind)}${gap10}${presTable(headers, kind, [], 0)}${gap10}`, minHeader + H.gap10);
        return;
      }
      while(index < rowsData.length){
        const availableRows = Math.floor((AVAILABLE_H - used - minHeader - H.gap10) / H.row);
        if(availableRows < 1 && current.length){
          finishPage();
          continue;
        }
        const rowsThisPage = Math.max(1, availableRows);
        const chunk = rowsData.slice(index, index + rowsThisPage);
        add(`${subTitle(label, kind)}${gap10}${presTable(headers, kind, chunk, index)}${gap10}`, minHeader + (chunk.length * H.row) + H.gap10);
        index += chunk.length;
      }
    };
    const addResumo = (kind) => {
      ensure(H.gap20 + 25 + H.gap10 + H.tableHead + H.row);
      add(`${gap20}<div class="imp-resumo-banner ${kind}">RESUMO DO PLANTAO</div>${gap10}`, H.gap20 + 25 + H.gap10);
      const linhas = resumoPresencaLinhas(kind);
      let index = 0;
      while(index < linhas.length){
        const availableRows = Math.floor((AVAILABLE_H - used - H.tableHead - H.gap20) / H.row);
        if(availableRows < 1 && current.length){
          finishPage();
          continue;
        }
        const rowsThisPage = Math.max(1, availableRows);
        const chunk = linhas.slice(index, index + rowsThisPage);
        add(resumoPresencaTabela(kind, chunk), H.tableHead + (chunk.length * H.row));
        index += chunk.length;
      }
      add(`${gap20}${resumoTurnoTabela(kind)}`, H.gap20 + (2 * H.row));
    };
    const addForca = (titulo, kind, dadosForca) => {
      finishPage();
      add(`${sectionTitle(titulo, kind)}${gap10}`, H.section + H.gap10);
      addTableSection("PESSOAL FIXO DO PLANTAO - TURNO 24 HORAS", headersFixo, kind, dadosForca.fixo24);
      addTableSection("PESSOAL FIXO DO PLANTAO - TURNO NOTURNO", headersFixo, kind, dadosForca.fixoNoturno);
      addTableSection("PESSOAL PAGAMENTO DE PERMUTA", headersPermuta, kind, dadosForca.pgto);
      addTableSection("PESSOAL PRESENCA EXTRA", headersExtra, kind, dadosForca.extra);
      addResumo(kind);
    };

    addForca("PPF - POLICIA PENAL FEDERAL", "ppf", ppfDados);
    addForca("FPN - FORCA PENITENCIARIA NACIONAL", "fpn", fpnDados);
    finishPage();
    return pages.join("\n");
  }

  function scriptAutoEscalaTabelas(){
    return `
      <script>
      (function(){
        function ajustar(){
          document.querySelectorAll(".imp-page").forEach(function(page){
            var area=page.querySelector(".imp-scale-area");
            if(!area)return;
            area.style.transform="scale(1)";
            area.style.height="auto";
            var areaRect=area.getBoundingClientRect();
            var availableH=page.clientHeight-(areaRect.top-page.getBoundingClientRect().top);
            var contentH=area.scrollHeight;
            if(!availableH||!contentH)return;
            var scaleH=availableH/contentH;
            var scale=Math.min(scaleH,1.18);
            scale=Math.max(0.68,scale);
            area.style.transform="scale("+scale+")";
            area.style.height=(contentH*scale)+"px";
          });
        }
        window.__ajustarEscalaServico=ajustar;
        window.addEventListener("load",function(){setTimeout(ajustar,30);});
        window.addEventListener("beforeprint",ajustar);
      })();
      <\/script>`;
  }

  function renderIframe(){
    if (!frame) return;
    const landscape = modoAtual === "escala";
    const body = landscape ? buildEscala() : buildListaPresenca();
    const page = landscape ? "A4 landscape" : "A4 portrait";
    frame.style.width = landscape ? "297mm" : "210mm";
    frame.style.height = landscape ? "210mm" : "297mm";
    const margin = "0";
    const ajustarAlturaFrame = () => {
      const doc = frame.contentDocument;
      const height = Math.max(doc?.documentElement?.scrollHeight || 0, doc?.body?.scrollHeight || 0);
      if (height) frame.style.height = `${height}px`;
      escalarPreview(landscape);
    };
    frame.onload = () => {
      frame.contentWindow?.__ajustarEscalaServico?.();
      setTimeout(ajustarAlturaFrame, 60);
    };
    frame.srcdoc = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>${cssImpressao()}@page{size:${page};margin:${margin};} body{padding:${margin};}</style></head><body>${body}${landscape ? scriptAutoEscalaTabelas() : ""}</body></html>`;
    setTimeout(() => {
      frame.contentWindow?.__ajustarEscalaServico?.();
      ajustarAlturaFrame();
    }, 80);
  }

  function escalarPreview(landscape){
    if (!frame || !wrap) return;
    const maxW = wrap.clientWidth - 40;
    const frameW = frame.offsetWidth || (landscape ? 1122 : 794);
    const frameH = frame.offsetHeight || (landscape ? 794 : 1122);
    const baseScale = Math.min(1, maxW / frameW);
    const scale = baseScale * previewZoom;
    frame.style.transform = `scale(${scale})`;
    frame.style.transformOrigin = "top center";
    frame.style.marginBottom = `${(frameH * scale) - frameH + 20}px`;
    if(zoomLabel)zoomLabel.textContent = `${Math.round(previewZoom * 100)}%`;
  }

  function setPreviewZoom(value){
    previewZoom = Math.min(2, Math.max(.5, value));
    escalarPreview(modoAtual === "escala");
  }

  function atualizarPreview(){
    if (title) {
      title.textContent = "Prévia de Impressão";
    }
    sideBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.imp === modoAtual));
    renderIframe();
  }

  function abrirPreview(){
    if (!overlay) return;
    overlay.classList.add("active");
    atualizarPreview();
  }

  document.querySelectorAll("#btnPreviewPrint,.print-escala-btn").forEach((btn) => {
    btn.addEventListener("click", abrirPreview);
  });

  sideBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modoAtual = btn.dataset.imp || "escala";
      atualizarPreview();
    });
  });

  document.getElementById("previaZoomMenos")?.addEventListener("click", () => setPreviewZoom(previewZoom - .1));
  document.getElementById("previaZoomMais")?.addEventListener("click", () => setPreviewZoom(previewZoom + .1));
  document.getElementById("previaZoomReset")?.addEventListener("click", () => setPreviewZoom(1));

  document.getElementById("btn-imprimir-cancelar")?.addEventListener("click", () => {
    overlay?.classList.remove("active");
  });

  document.getElementById("btn-imprimir-exec")?.addEventListener("click", () => {
    if (!frame?.srcdoc) return;
    let printFrame = document.getElementById("_print_iframe_imp");
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "_print_iframe_imp";
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
    document.body.appendChild(printFrame);
    }
    printFrame.onload = () => {
      setTimeout(() => {
        printFrame.contentWindow?.__ajustarEscalaServico?.();
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
      }, 80);
    };
    printFrame.srcdoc = frame.srcdoc;
  });

  window.addEventListener("resize", () => {
    if (overlay?.classList.contains("active")) escalarPreview(modoAtual === "escala");
  });
})();
