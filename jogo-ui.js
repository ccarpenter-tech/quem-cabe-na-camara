// =====================================================================
// Quem cabe na Câmara? – CAMADA DE JOGO
// Menu, trilha de fases, aberturas de semana, cartas de dado (álbum), conquistas,
// moedas voando, tremor de tela, confete e cenário animado.
// =====================================================================
const UI = (function () {
  const PARADO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  // ---------- memória (fica no navegador; se não der, só nesta sessão) ----------
  const mem = {};
  const ler = (k, padrao) => { try { const v = localStorage.getItem('qcc-' + k); return v ? JSON.parse(v) : (mem[k] ?? padrao); } catch (e) { return mem[k] ?? padrao; } };
  const gravar = (k, v) => { mem[k] = v; try { localStorage.setItem('qcc-' + k, JSON.stringify(v)); } catch (e) { } };

  // ---------- as cartas de dado: cada uma é uma análise do estudo ----------
  const CARTAS = [
    { id: 1, nome: 'A peneira', analise: 'Tabela cruzada e V de Cramér', onde: 'Fase 1', chave: ['Candidatos → eleitos'] },
    { id: 2, nome: 'O filtro por cargo', analise: 'Tabela cruzada por cargo', onde: 'Fase 2', chave: ['O filtro muda de cargo'] },
    { id: 3, nome: 'O mapa da disputa', analise: 'Comparação entre estados', onde: 'Fase 3', chave: ['Candidatos por vaga em cada estado'] },
    { id: 4, nome: 'Você no meio', analise: 'Univariada: histograma, mediana, assimetria', onde: 'Fase 4', chave: ['Você no meio'] },
    { id: 5, nome: 'A força do partido', analise: 'Proporções por partido', onde: 'Semana 1', chave: ['Taxa de eleição por partido'] },
    { id: 6, nome: 'O dinheiro', analise: 'Medianas por grupo', onde: 'Semana 2', chave: ['Dinheiro de campanha', 'Patrimônio: eleitos'] },
    { id: 7, nome: 'O que pesa mais', analise: 'Regressão logística (OR e IC 95%)', onde: 'Semana 3', chave: ['Quem já é forte'] },
    { id: 8, nome: 'Candidaturas fantasmas', analise: 'Proporção por gênero', onde: 'Semana 4', chave: ['Candidaturas que só existem', 'Enquanto isso, na cota'] },
    { id: 9, nome: 'O teste de Mann-Whitney', analise: 'Teste não paramétrico', onde: 'Semana 5', chave: ['No fim, o dinheiro'] },
    { id: 10, nome: 'Os votos', analise: 'Regressão múltipla e Spearman', onde: 'Apuração', chave: ['Quantos votos', 'Como foi a votação'] },
    { id: 11, nome: 'O filtro está diminuindo?', analise: 'Série histórica 2018–2026', onde: 'Fase 8', chave: ['O filtro está diminuindo'] },
    { id: 12, nome: 'Dá para confiar?', analise: 'Curva ROC e AUC', onde: 'Fase 8', chave: ['Por que confiar'] },
    { id: 13, nome: 'A idade de quem se elege', analise: 'Faixas etárias × eleito', onde: 'Semana 2', chave: ['A idade de quem se elege'] },
    { id: 14, nome: 'Votos por grupo', analise: 'Categórica × quantitativa (medianas)', onde: 'Semana 2', chave: ['Votos medianos por grupo'] },
    { id: 15, nome: 'Quem já está dentro', analise: 'Tabela cruzada mandato × eleito', onde: 'Semana 3', chave: ['Quem já está dentro'] },
    { id: 16, nome: 'O diploma pesa?', analise: 'Tabela cruzada escolaridade × eleito', onde: 'Semana 1', chave: ['O diploma pesa?'] }
  ];
  const album = ler('album', {});
  let ganhou = null;                           // o jogo é avisado quando sai carta nova (vira uma dica)              // id → html da carta
  const numero = id => '#' + String(id).padStart(2, '0');

  // recebe o cartão "o dado por trás" e devolve a carta colecionável (e guarda no álbum)
  function carta(titulo, html) {
    const c = CARTAS.find(x => x.chave.some(k => titulo.startsWith(k)));
    if (!c) return html;
    const nova = !album[c.id];
    album[c.id] = html; gravar('album', album);
    if (nova) { if (ganhou) ganhou(c); setTimeout(() => abrirCarta(c.id, true), 700); if (CARTAS.every(x => album[x.id])) setTimeout(() => conquista('album'), 2500); }
    return `<button type="button" class="carta-mini ${nova ? 'nova' : ''}" data-carta="${c.id}" style="--d:${c.id}">
      <span class="cm-num">${numero(c.id)}</span><span class="cm-txt"><small>${nova ? 'Nova carta de dado!' : 'Carta de dado'}</small><b>${esc(c.nome)}</b><em>${esc(c.analise)}</em></span><span class="cm-abrir">Ver carta</span></button>`;
  }
  function abrirCarta(id, nova) {
    const c = CARTAS.find(x => x.id === id); if (!c || !album[id]) return;
    if (nova) vibrar([30, 40, 30]);
    modal(`<div class="carta-grande ${nova ? 'vira' : ''}"><div class="cg-topo"><span>${numero(id)}</span><b>${esc(c.nome)}</b><em>${esc(c.analise)}</em></div>
      ${nova ? '<p class="cg-nova">NOVA CARTA DESBLOQUEADA</p>' : ''}<div class="cg-corpo">${album[id]}</div>
      <button type="button" class="jg-botao" data-fecha>${nova ? 'Guardar no álbum' : 'Fechar'}</button></div>`, 'carta');
  }

  // ---------- conquistas ----------
  const CONQ = [
    ['primeira', 'Primeira campanha', 'Chegue ao dia da eleição'], ['eleito', 'Primeira vitória', 'Seja eleito(a)'], ['zebra', 'Zebra!', 'Vença com menos de 5% de chance inicial'],
    ['urna', 'Registro na urna', 'Registre a sua própria candidatura'], ['corpo', '30 eleitores no corpo a corpo', 'Conquiste 30 eleitores no minigame do corpo a corpo'],
    ['debate', 'Mandou bem no debate', 'Acerte a pergunta do debate'], ['gemeo', 'Olhou no espelho', 'Veja a mesma campanha com outro perfil'],
    ['dica', 'Leitor de dados', 'Use uma carta de dado como dica'], ['cargos', 'Todos os cargos', 'Jogue com os 5 cargos'], ['album', 'Álbum completo', 'Desbloqueie as 16 cartas de dado']
  ];
  const feitas = ler('conquistas', {});
  function conquista(id) {
    if (feitas[id]) return; const c = CONQ.find(x => x[0] === id); if (!c) return;
    feitas[id] = Date.now(); gravar('conquistas', feitas);
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<i class="medalha"></i><div><small>Conquista desbloqueada</small><b>${esc(c[1])}</b></div>`;
    document.body.appendChild(t); vibrar(60);
    setTimeout(() => t.classList.add('sai'), 3200); setTimeout(() => t.remove(), 3800);
  }
  function cargoJogado(k, total) { const l = ler('cargos', []); if (!l.includes(k)) { l.push(k); gravar('cargos', l); } if (l.length >= total) conquista('cargos'); }

  // ---------- janelas (modal) ----------
  function modal(html, tipo = '') {
    fecharModal();
    const m = document.createElement('div'); m.className = 'modal ' + tipo; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
    m.innerHTML = `<div class="modal-fundo" data-fecha></div><div class="modal-caixa">${html}</div>`;
    document.body.appendChild(m); document.body.classList.add('com-modal');
    m.addEventListener('click', e => { if (e.target.closest('[data-fecha]')) fecharModal(); });
    const bt = m.querySelector('.modal-caixa button'); if (bt) setTimeout(() => bt.focus(), 50);
    return m;
  }
  function fecharModal() { document.querySelectorAll('.modal').forEach(m => m.remove()); document.body.classList.remove('com-modal'); }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharModal(); });
  document.addEventListener('click', e => { const b = e.target.closest('.carta-mini'); if (b) abrirCarta(+b.dataset.carta, false); });
  const aberto = () => !!document.querySelector('.modal');

  function telaAlbum() {
    const n = CARTAS.filter(c => album[c.id]).length;
    modal(`<div class="painel-menu"><p class="jg-chapeu">Álbum de dados · ${n} de ${CARTAS.length}</p><h2>Cada carta é uma análise do estudo</h2><p class="jg-dica">Toda carta nova vale uma <b>dica</b> na campanha: use a dica para revelar o efeito escondido das escolhas da semana. Quanto mais cartas no álbum, mais dicas você começa a partida.</p>
      <div class="album">${CARTAS.map(c => album[c.id] ? `<button type="button" class="album-carta" data-ver="${c.id}"><span>${numero(c.id)}</span><b>${esc(c.nome)}</b><em>${esc(c.analise)}</em></button>`
        : `<div class="album-carta trancada"><span>${numero(c.id)}</span><b>?</b><em>Desbloqueie em: ${esc(c.onde)}</em></div>`).join('')}</div>
      <button type="button" class="jg-botao" data-fecha>Fechar</button></div>`, 'menu');
    document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => abrirCarta(+b.dataset.ver, false));
  }
  function telaConquistas() {
    const n = CONQ.filter(c => feitas[c[0]]).length;
    modal(`<div class="painel-menu"><p class="jg-chapeu">Conquistas · ${n} de ${CONQ.length}</p><h2>Medalhas</h2>
      <div class="conquistas">${CONQ.map(([id, t, d]) => `<div class="conq ${feitas[id] ? 'feita' : ''}"><i class="medalha"></i><div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>`).join('')}</div>
      <button type="button" class="jg-botao" data-fecha>Fechar</button></div>`, 'menu');
  }
  function telaComo() {
    modal(`<div class="painel-menu"><p class="jg-chapeu">Como funciona</p><h2>Um jogo feito de estatística</h2>
      <ul class="como">
        <li><b>A sua chance</b> vem da regressão logística do estudo: cargo, gênero, raça, escolaridade, patrimônio e mandato.</li>
        <li><b>Os candidatos são reais</b>: dados do TSE de 2026, com fotos oficiais.</li>
        <li><b>As cartas de dado</b> são as análises do estudo: tabelas cruzadas, V de Cramér, medianas, Mann-Whitney, Spearman, regressões e curva ROC. Cada carta nova vira uma <b>dica</b>: ela revela quanto cada escolha da semana mexe na sua chance.</li><li><b>É difícil, como na vida real:</b> poucos candidatos se elegem, e cada moeda conta.</li>
        <li><b>As semanas de campanha</b> são regras de jogo, iguais para todo mundo. Só o ponto de partida muda.</li>
        <li><b>No teclado:</b> → avança, 1 2 3 escolhem as cartas, A B C D respondem o debate, Esc fecha janelas.</li></ul>
      <button type="button" class="jg-botao" data-fecha>Entendi</button></div>`, 'menu');
  }
  function menu(acoes) {
    modal(`<div class="painel-menu menu-pausa"><p class="jg-chapeu">Pausa</p><h2>Menu</h2>
      <div class="menu-botoes"><button type="button" class="mb" data-fecha>▶ Continuar</button><button type="button" class="mb" id="m-album">Álbum de dados</button>
        <button type="button" class="mb" id="m-conq">Conquistas</button><button type="button" class="mb" id="m-como">Como funciona</button>
        <a class="mb" href="dossie.html">Saber mais sobre o estudo</a><button type="button" class="mb perigo" id="m-reini">Recomeçar do início</button></div></div>`, 'menu');
    document.getElementById('m-album').onclick = telaAlbum; document.getElementById('m-conq').onclick = telaConquistas; document.getElementById('m-como').onclick = telaComo;
    document.getElementById('m-reini').onclick = () => { fecharModal(); acoes.reiniciar(); };
  }

  // ---------- telas de transição: trilha de fases e aberturas ----------
  let fila = Promise.resolve();
  function cortina(html, ms) {
    fila = fila.then(() => new Promise(fim => {
      if (PARADO) return fim();
      const o = document.createElement('div'); o.className = 'cortina'; o.innerHTML = html; document.body.appendChild(o);
      const sai = () => { if (!o.isConnected) return; o.classList.add('sai'); setTimeout(() => { o.remove(); fim(); }, 350); };
      o.onclick = sai; setTimeout(sai, ms);
    }));
    return fila;
  }
  function trilha(k, fases, avatar) {
    const W = 640, pts = fases.map((_, i) => [40 + i * (W - 80) / (fases.length - 1), 90 + Math.sin(i * 1.2) * 34]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' '), de = pts[Math.max(0, k - 1)], ate = pts[k];
    return cortina(`<div class="trilha"><p class="jg-chapeu">Fase ${k + 1} de ${fases.length}</p><h2>${esc(fases[k])}</h2>
      <svg viewBox="0 0 ${W} 180" class="trilha-svg" aria-hidden="true"><path d="${d}" class="t-caminho"/><path d="${d}" class="t-feito" pathLength="1" style="--ate:${k / (fases.length - 1)}"/>
        ${pts.map((p, i) => `<g class="t-no ${i < k ? 'feito' : i === k ? 'agora' : ''}"><circle cx="${p[0]}" cy="${p[1]}" r="${i === k ? 16 : 11}"/><text x="${p[0]}" y="${p[1] + 5}" text-anchor="middle">${i + 1}</text></g>`).join('')}
        <g class="t-avatar" style="--x0:${de[0]}px;--y0:${de[1] - 34}px;--x1:${ate[0]}px;--y1:${ate[1] - 34}px"><circle r="13" cx="0" cy="0"/><text y="4" text-anchor="middle">${esc(avatar || 'EU')}</text><path d="M-6 12 L0 22 L6 12z"/></g></svg>
      <p class="toque">toque para continuar</p></div>`, 1700);
  }
  const abertura = (chapeu, titulo) => cortina(`<div class="abertura"><p class="jg-chapeu">${esc(chapeu)}</p><h2>${esc(titulo)}</h2></div>`, 1150);

  // ---------- efeitos ----------
  function vibrar(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } }
  function treme() { if (PARADO) return; document.body.classList.remove('treme'); void document.body.offsetWidth; document.body.classList.add('treme'); vibrar(120); setTimeout(() => document.body.classList.remove('treme'), 500); }
  function moedas(de, para, n) {
    if (PARADO || !de || !para || n <= 0) return;
    const a = de.getBoundingClientRect(), b = para.getBoundingClientRect();
    for (let i = 0; i < Math.min(n, 8); i++) {
      const m = document.createElement('i'); m.className = 'moeda-voa'; document.body.appendChild(m);
      const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + 20 + i * 10, y1 = b.top + b.height / 2;
      m.animate([{ transform: `translate(${x0}px,${y0}px) scale(1)` }, { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 80}px) scale(1.3)`, offset: .5 }, { transform: `translate(${x1}px,${y1}px) scale(.6)`, opacity: .2 }],
        { duration: 700, delay: i * 70, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).onfinish = () => m.remove();
    }
  }
  function confete() {
    if (PARADO) return;
    const cv = document.createElement('canvas'); cv.className = 'confete'; document.body.appendChild(cv);
    const W = cv.width = innerWidth, H = cv.height = innerHeight, ctx = cv.getContext('2d'), cores = ['#a66cff', '#e2620f', '#f3eee4', '#2fa36b', '#ffd36b'];
    const p = Array.from({ length: 180 }, () => ({ x: W / 2 + (Math.random() - .5) * 200, y: H * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 4, r: Math.random() * 6 + 3, c: cores[Math.floor(Math.random() * 5)], g: Math.random() * 6 }));
    let t = 0; const passo = () => { ctx.clearRect(0, 0, W, H); p.forEach(q => { q.vy += .35; q.x += q.vx; q.y += q.vy; q.vx *= .99; q.g += .2; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.g); ctx.fillStyle = q.c; ctx.fillRect(-q.r, -q.r / 2, q.r * 2, q.r); ctx.restore(); });
      if (++t < 170) requestAnimationFrame(passo); else cv.remove(); };
    passo(); vibrar([40, 30, 40, 30, 120]);
  }
  // carta de escolha arrastável: puxar para cima (ou tocar) joga a carta
  function arrastavel(el, joga) {
    let y0 = null, x0 = 0;
    el.addEventListener('pointerdown', e => { if (e.target.closest('[data-slider]')) return; y0 = e.clientY; x0 = e.clientX; el.setPointerCapture && el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (y0 === null) return; const dy = Math.min(0, e.clientY - y0), dx = e.clientX - x0; el.style.transform = `translate(${dx * .6}px, ${dy}px) rotate(${dx * .06}deg)`; });
    const solta = e => { if (y0 === null) return; const dy = e.clientY - y0, dx = e.clientX - x0; y0 = null; el.style.transform = ''; if (dy < -70 || Math.abs(dx) > 110) { el.dataset.arrastou = '1'; joga(); setTimeout(() => delete el.dataset.arrastou, 50); } };
    el.addEventListener('pointerup', solta); el.addEventListener('pointercancel', () => { y0 = null; el.style.transform = ''; });
  }

  // ---------- cenário animado (cidade ao fundo) ----------
  function cenario() {
    if (document.getElementById('cenario')) return;
    const predios = (n, hMin, hMax, cor, janelas, seed) => { let s = seed, x = 0, out = '';
      const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
      while (x < 1600) { const w = 40 + r() * 70, h = hMin + r() * (hMax - hMin); out += `<rect x="${x}" y="${300 - h}" width="${w}" height="${h}" fill="${cor}"/>`;
        if (janelas) for (let jy = 300 - h + 12; jy < 290; jy += 16) for (let jx = x + 8; jx < x + w - 8; jx += 14) if (r() < .22) out += `<rect x="${jx}" y="${jy}" width="5" height="7" fill="${r() < .5 ? '#e2620f' : '#a66cff'}" opacity="${.35 + r() * .5}"/>`;
        x += w + 4; } return out; };
    const d = document.createElement('div'); d.id = 'cenario'; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = `<div class="ceu"></div><div class="estrelas"></div>
      <svg class="cidade c1" viewBox="0 0 1600 300" preserveAspectRatio="none">${predios(0, 60, 170, '#1a1626', false, 7)}</svg>
      <svg class="cidade c2" viewBox="0 0 1600 300" preserveAspectRatio="none">${predios(0, 30, 120, '#120f1b', true, 21)}</svg>`;
    document.body.prepend(d);
  }

  return { aoGanharCarta: f => { ganhou = f; }, CARTAS, CONQ, carta, abrirCarta, conquista, cargoJogado, modal, fecharModal, aberto, telaAlbum, telaConquistas, telaComo, menu,
    trilha, abertura, treme, moedas, confete, vibrar, arrastavel, cenario, album, feitas };
})();
