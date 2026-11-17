// =====================================================================
// Quem cabe na Câmara? – O JOGO (telas)
// Fases: capa → a peneira → seu cargo → seu estado → sua candidatura (sorteio ou registro na urna)
//        → 5 semanas de campanha → dia da eleição (urna) e apuração → a mesma campanha com outro perfil
//        → a Câmara (e as regras do jogo) → o que fica
// Cada fase mostra "o dado por trás": um resultado do estudo, recalculado em jogo-dados.js.
// =====================================================================
(function jogo() {
  const { S, G, T, esc, fmtP, pct, dec, num, reais, retrato, corGrupo, lim, logit, logistica } = J;
  const tela = document.getElementById('tela'), hud = document.getElementById('hud'), topo = document.getElementById('fases');
  const PARADO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!J.TODOS.length) { tela.innerHTML = '<div class="jg-tela"><h2>Faltam dados</h2><p>O jogo precisa do dados.js com a lista de todos os candidatos (célula D.15).</p></div>'; return; }

  const ao = (c, m, f) => c.mulher ? f : m;
  const curto = n => { const p = n.split(' '); return p.length > 2 ? p[0] + ' ' + p[p.length - 1] : n; };
  const titulo = n => n.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, l) => a + l.toUpperCase()).replace(/ (Da|De|Do|Das|Dos|E) /g, s => s.toLowerCase());
  const nomeDe = c => c.ficticio ? c.nome : titulo(curto(c.nome));
  const RACA = { B: 'branca', N: 'negra (preta ou parda)', O: 'amarela ou indígena' };
  const grupo = c => (c.mulher ? 'Mulher ' : 'Homem ') + (c.raca === 'N' ? (c.mulher ? 'negra' : 'negro') : c.raca === 'B' ? (c.mulher ? 'branca' : 'branco') : (c.mulher ? 'amarela/indígena' : 'amarelo/indígena'));
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const sorteia = (l, r = Math.random) => l[Math.floor(r() * l.length)];
  const embaralha = (l, r) => l.map(x => [r(), x]).sort((a, z) => a[0] - z[0]).map(x => x[1]);
  const temFoto = c => !!J.fotoDe(c);
  const comFoto = l => { const f = l.filter(temFoto); return f.length >= Math.min(5, l.length) ? f : l; };
  const rolarTopo = () => window.scrollTo({ top: 0, behavior: PARADO ? 'auto' : 'smooth' });
  const $ = id => document.getElementById(id);

  // ---------- os cargos ----------
  const CARGOS = [
    { k: 'Presidente', nome: ['Presidente da República', 'Presidenta da República'], curto: 'Presidência', nac: true, dig: 2, apoio: 'um governador popular', icone: '★' },
    { k: 'Governador', nome: ['governador', 'governadora'], curto: 'Governo do estado', dig: 2, apoio: 'o prefeito da capital', icone: '◆' },
    { k: 'Senador', nome: ['senador', 'senadora'], curto: 'Senado', dig: 3, apoio: 'o governador', icone: '▲' },
    { k: 'Deputado Federal', nome: ['deputado federal', 'deputada federal'], curto: 'Câmara dos Deputados', dig: 4, apoio: 'um prefeito popular', icone: '●' },
    { k: 'Deputado Estadual', alt: 'Deputado Distrital', nome: ['deputado estadual', 'deputada estadual'], nomeAlt: ['deputado distrital', 'deputada distrital'], curto: 'Assembleia Legislativa', dig: 5, apoio: 'um vereador muito votado', icone: '■' }
  ].filter(d => J.cargoInfo(d.k).n || (d.alt && J.cargoInfo(d.alt).n));
  let cargoDef = CARGOS.find(d => d.k === 'Deputado Federal') || CARGOS[0], ufEscolhida = null;
  const cargoReal = () => cargoDef.alt && ufEscolhida === 'DF' ? cargoDef.alt : cargoDef.k;
  const nomeCargo = (c, d = cargoDef) => { const n = d.alt && c.cargo === d.alt ? d.nomeAlt : d.nome; return c.mulher ? n[1] : n[0]; };
  const info = () => J.cargoInfo(cargoReal());
  const doLugar = () => info().lista.filter(c => cargoDef.nac || c.uf === ufEscolhida);

  // ---------- som (a urna apita) ----------
  let somLigado = true, ac = null;
  function bip(f, t0, d) { if (!somLigado) return; try { ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.value = 0.04;
    o.connect(g); g.connect(ac.destination); o.start(ac.currentTime + t0); o.stop(ac.currentTime + t0 + d); } catch (e) { } }
  const somTecla = () => bip(880, 0, 0.06), somFim = () => { for (let i = 0; i < 4; i++) bip(1050, i * 0.11, 0.07); bip(1050, 0.46, 0.4); };
  const botaoSom = document.createElement('button');
  botaoSom.className = 'botao-som'; botaoSom.type = 'button'; botaoSom.textContent = 'SOM: LIGADO';
  botaoSom.onclick = () => { somLigado = !somLigado; botaoSom.textContent = 'SOM: ' + (somLigado ? 'LIGADO' : 'DESLIGADO'); };
  document.body.appendChild(botaoSom);

  // ---------- trilha de fases ----------
  const FASES = ['A peneira', 'Seu cargo', 'Seu estado', 'Sua candidatura', 'A campanha', 'A eleição', 'O que fica'];
  let faseMax = -1;
  function fase(k) {
    if (k > faseMax) { faseMax = k; if (k >= 0) UI.trilha(k, FASES, st && st.c ? (st.c.ficticio ? 'EU' : J.iniciais(st.c.nome)) : 'EU'); }
    topo.hidden = k < 0;
    topo.innerHTML = FASES.map((f, i) => `<li class="${i < k ? 'feito' : i === k ? 'agora' : ''}"><i></i><span>${f}</span></li>`).join('');
  }
  const dado = (titulo, corpo, fonte) => UI.carta(titulo, `<aside class="dado"><p class="dado-chapeu">O dado por trás disso</p><h4>${titulo}</h4>${corpo}${fonte ? `<p class="dado-fonte">${fonte}</p>` : ''}</aside>`);
  const mostrar = html => { tela.innerHTML = `<div class="tela-entra">${html}</div>`; };

  // =================================================================
  // A URNA (usada para registrar a candidatura e para votar)
  // passos: { tipo: 'opcoes' | 'texto' | 'numero', titulo, campo, opcoes, max, digitos, mostra }
  // =================================================================
  let teclado = null;
  // fotos de todos os candidatos: um arquivo por estado, baixado só quando o estado é escolhido
  const carregadas = {}; let aoFotos = null;
  function carregarFotos(uf) { if (!uf || carregadas[uf]) return; carregadas[uf] = true;
    const s = document.createElement('script'); s.src = `fotos/${uf}.js?v=1`; s.onload = () => { if (aoFotos) aoFotos(); if (st && !hud.hidden) desenharHud(); }; document.body.appendChild(s); }
  function urna(alvo, { cabeca, passos, aoFim }) {
    const resp = {}; let i = 0, sel = null, txt = '', dig = '', ativa = true;
    alvo.innerHTML = `<div class="urna"><div class="urna-tela" id="u-tela" aria-live="polite"></div>
      <div class="urna-teclado"><p class="urna-marca">URNA DO JOGO · 2026</p>
        <div class="teclas">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `<button type="button" class="tecla" data-n="${n}">${n}</button>`).join('')}</div>
        <div class="teclas-acao"><button type="button" class="tecla branco" data-a="branco">BRANCO</button><button type="button" class="tecla corrige" data-a="corrige">CORRIGE</button><button type="button" class="tecla confirma" data-a="confirma">CONFIRMA</button></div></div></div>`;
    const tl = alvo.querySelector('#u-tela');
    function desenha(aviso = '') {
      const p = passos[i]; if (!p) return;
      let corpo = '';
      if (p.tipo === 'opcoes') corpo = `<ol class="u-ops">${p.opcoes.map(([, t], k) => `<li class="${sel === k ? 'sel' : ''}" data-k="${k}"><b>${k + 1}</b> ${esc(t)}</li>`).join('')}</ol>`;
      if (p.tipo === 'texto') corpo = `<input class="u-texto" id="u-texto" maxlength="${p.max || 22}" value="${esc(txt)}" placeholder="digite aqui" autocomplete="off" aria-label="${esc(p.titulo)}">`;
      if (p.tipo === 'numero') { const quem = dig.length === p.digitos && p.mostra ? p.mostra(dig) : '';
        corpo = `<div class="u-num">${Array.from({ length: p.digitos }, (_, k) => `<span class="${k === dig.length ? 'pisca' : ''}">${dig[k] || ''}</span>`).join('')}</div>${quem}`; }
      tl.innerHTML = `<p class="u-cabeca">${esc(cabeca)} <span>${i + 1} de ${passos.length}</span></p><h4>${esc(p.titulo)}</h4>${corpo}
        ${aviso ? `<p class="u-aviso">${esc(aviso)}</p>` : ''}<p class="u-rodape">Aperte a tecla:<br><b class="v">CONFIRMA</b> para CONFIRMAR · <b class="l">CORRIGE</b> para REINICIAR este passo</p>`;
      tl.querySelectorAll('.u-ops li').forEach(li => li.onclick = () => { sel = +li.dataset.k; somTecla(); desenha(); });
      const inp = tl.querySelector('#u-texto');
      if (inp) { inp.oninput = () => { txt = inp.value; }; setTimeout(() => { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }, 50); }
    }
    function tecla(n) { const p = passos[i]; if (!p) return; somTecla();
      if (p.tipo === 'opcoes') { if (n >= 1 && n <= p.opcoes.length) { sel = n - 1; desenha(); } }
      else if (p.tipo === 'numero') { if (dig.length < p.digitos) { dig += n; desenha(); } } }
    function corrige() { somTecla(); sel = null; txt = ''; dig = ''; desenha(); }
    function confirma() {
      const p = passos[i]; if (!p) return;
      if (p.tipo === 'opcoes') { if (sel === null) return desenha('Escolha uma opção pelo número.'); resp[p.campo] = p.opcoes[sel][0]; }
      if (p.tipo === 'texto') { const v = txt.trim(); if (!v) return desenha('Escreva antes de confirmar.'); resp[p.campo] = v.slice(0, p.max || 22); }
      if (p.tipo === 'numero') { if (dig.length < p.digitos) return desenha(`Digite os ${p.digitos} números.`); resp[p.campo] = dig; }
      bip(1050, 0, 0.12); i++; sel = null; txt = ''; dig = '';
      if (i < passos.length) desenha();
      else { ativa = false; somFim(); tl.innerHTML = '<p class="u-fim">FIM</p>'; setTimeout(() => aoFim(resp), PARADO ? 50 : 1300); }
    }
    alvo.querySelectorAll('[data-n]').forEach(b => b.onclick = () => tecla(+b.dataset.n));
    alvo.querySelector('[data-a="corrige"]').onclick = corrige;
    alvo.querySelector('[data-a="confirma"]').onclick = confirma;
    alvo.querySelector('[data-a="branco"]').onclick = () => { somTecla(); desenha('Nesta urna, voto em branco não vale: escolha uma opção.'); };
    teclado = e => {
      if (!ativa || !document.body.contains(tl)) return false;
      const noTexto = e.target && e.target.id === 'u-texto';
      if (e.key === 'Enter') { confirma(); return true; }
      if (noTexto) return false;
      if (/^[0-9]$/.test(e.key)) { tecla(+e.key); return true; }
      if (e.key === 'Backspace') { corrige(); return true; }
      return false;
    };
    desenha();
  }

  // =================================================================
  // 0. CAPA
  // =================================================================
  function capa() {
    fase(-1); faseMax = -1; hud.hidden = true; UI.fecharModal();
    mostrar(`
      <section class="titulo-jogo"><canvas id="chuva" aria-hidden="true"></canvas>
        <div class="tj-centro">
          <p class="jg-chapeu">Eleições 2026 · dados reais do TSE</p>
          <h1 class="logo"><span>Quem cabe</span><span>na Câmara?</span></h1>
          <p class="tj-sub"><b>${num(S.n)}</b> candidaturas · <b>${num(S.nEl)}</b> cargos · 1 chance em ${Math.round(S.n / S.nEl)}</p>
          <button type="button" class="tj-start" id="b-start">TOQUE PARA COMEÇAR</button>
          <div class="tj-menu" id="tj-menu" hidden>
            <button type="button" class="mb grande principal" id="b-jogar">▶ Jogar</button>
            <button type="button" class="mb" id="b-como">Como funciona</button>
          </div>
        </div>
        <a class="tj-estudo" href="dossie.html">Saber mais sobre o estudo →</a>
        <p class="tj-rodape">Projeto A2 · Métodos Estatísticos Aplicados às Ciências Sociais</p></section>`);
    chuva();
    const abre = () => { $('b-start').hidden = true; $('tj-menu').hidden = false; somFim(); $('b-jogar').focus(); };
    $('b-start').onclick = abre;
    $('b-jogar').onclick = peneira; $('b-como').onclick = UI.telaComo;
  }
  function chuva() {
    const cv = $('chuva'); if (!cv) return;
    const ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    const el = Math.round(S.nEl / 10), p = Array.from({ length: Math.round(S.n / 10) }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, v: 0.3 + Math.random() * 1.1, e: i < el }));
    const passo = () => { if (!document.body.contains(cv)) return; ctx.clearRect(0, 0, W, H);
      p.forEach(d => { d.y += PARADO ? 0 : d.v; if (d.y > H) d.y = -4; ctx.fillStyle = d.e ? '#e2620f' : 'rgba(203,196,182,.28)'; ctx.beginPath(); ctx.arc(d.x, d.y, d.e ? 2.6 : 1.8, 0, 7); ctx.fill(); });
      if (!PARADO) requestAnimationFrame(passo); };
    passo();
  }

  // =================================================================
  // 1. A PENEIRA
  // =================================================================
  function peneira() {
    fase(0); hud.hidden = true; rolarTopo();
    mostrar(`<div class="jg-tela">
      <p class="jg-chapeu">Fase 1 · A peneira</p><h2>Antes de entrar no jogo, veja quem passou pela peneira em 2026</h2>
      <p class="jg-lead">O ponto cinza é a fatia de cada grupo entre os <b>candidatos</b>. O ponto colorido é a fatia entre os <b>eleitos</b>.
        Homens brancos eram ${pct(S.grupos[3].cand, 0)} de quem tentou e viraram ${pct(S.grupos[3].el, 0)} de quem entrou.</p>
      ${dado('Candidatos → eleitos, todos os cargos', G.halteres(S.grupos) + `
        <div class="dado-numeros"><div><b>${dec(S.vGenero, 3)}</b><span>V de Cramér<br>gênero × eleito</span></div><div><b>${dec(S.vRaca, 3)}</b><span>V de Cramér<br>raça × eleito</span></div><div><b>${dec(S.vSuperior, 3)}</b><span>V de Cramér<br>ensino superior × eleito</span></div></div>
        <p>Cada associação, sozinha, é fraca (V perto de 0,1). Mas elas se <b>somam</b>: é isso que o jogo vai te fazer sentir.</p>`, `Tabelas cruzadas e V de Cramér · ${num(S.n)} candidaturas, TSE 2026`)}
      <blockquote class="hipotese">“A eleição de 2026 filtrou o Brasil: os eleitos são mais masculinos, mais brancos, mais escolarizados e muito mais ricos do que quem se candidatou, e esse filtro persiste mesmo entre candidatos com o mesmo cargo e o mesmo patrimônio.”<cite>A hipótese deste jogo</cite></blockquote>
      <button type="button" class="jg-botao principal" id="b-seguir">Escolher a minha disputa →</button></div>`);
    $('b-seguir').onclick = cargo;
  }

  // =================================================================
  // 2. SEU CARGO
  // =================================================================
  function cargo() {
    fase(1); hud.hidden = true; rolarTopo();
    const linhas = CARGOS.map(d => { const a = J.cargoInfo(d.k), b2 = d.alt ? J.cargoInfo(d.alt) : null;
      return { d, a, n: a.n + (b2 ? b2.n : 0), e: a.nEl + (b2 ? b2.nEl : 0) }; });
    mostrar(`<div class="jg-tela">
      <p class="jg-chapeu">Fase 2 · Seu cargo</p><h2>Qual cadeira você quer disputar?</h2>
      <p class="jg-lead">Cada cargo tem uma disputa diferente: poucas vagas e muita gente no Executivo, mais vagas no Legislativo. E o filtro também muda de cargo para cargo.</p>
      <div class="cargos">${linhas.map(({ d, n, e }) => `<button type="button" class="cargo ${d === cargoDef ? 'ativo' : ''}" data-k="${d.k}">
        <span class="cargo-ic">${d.icone}</span><b>${d.k === 'Deputado Estadual' ? 'Deputado(a) estadual ou distrital' : d.k === 'Presidente' ? 'Presidente da República' : titulo(d.nome[0])}</b><small>${d.curto}</small>
        <span class="cargo-num"><em>${num(n)}</em> candidatos · <em>${num(e)}</em> eleitos</span><span class="cargo-taxa">1 vaga para cada ${dec(n / Math.max(1, e), 0)}</span></button>`).join('')}</div>
      ${dado('O filtro muda de cargo para cargo', G.halteres(linhas.map(({ d, a }) => ({ nome: d.k === 'Deputado Estadual' ? 'Dep. estadual' : d.k === 'Deputado Federal' ? 'Dep. federal' : d.k, cand: a.mulheres[0], el: a.mulheres[1] }))),
        `<p>Fatia de <b>mulheres</b> entre candidatos e eleitos, por cargo. Onde há poucas candidatas, a peneira parece menor, mas é porque o filtro age antes: na hora de decidir quem se candidata.</p>`, 'Tabelas cruzadas por cargo · TSE 2026')}
      <button type="button" class="jg-botao principal" id="b-cargo">Disputar este cargo →</button></div>`);
    document.querySelectorAll('.cargo').forEach(bt => bt.onclick = () => { cargoDef = CARGOS.find(d => d.k === bt.dataset.k);
      document.querySelectorAll('.cargo').forEach(x => x.classList.toggle('ativo', x === bt)); somTecla(); });
    $('b-cargo').onclick = () => { if (cargoDef.nac) { ufEscolhida = null; perfil(); } else estado(); };
  }

  // =================================================================
  // 3. SEU ESTADO
  // =================================================================
  const POS = { RR: [1, 0], AP: [3, 0], AM: [1, 1], PA: [2, 1], MA: [3, 1], CE: [4, 1], RN: [5, 1], AC: [0, 2], RO: [1, 2], TO: [2, 2], PI: [3, 2], PE: [4, 2], PB: [5, 2],
    MT: [1, 3], GO: [2, 3], BA: [3, 3], SE: [4, 3], AL: [5, 3], MS: [1, 4], DF: [2, 4], MG: [3, 4], ES: [4, 4], PR: [2, 5], SP: [3, 5], RJ: [4, 5], SC: [2, 6], RS: [2, 7] };
  let modoMapa = 'dificil';
  const ufDe = u => { const k = cargoDef.alt && u === 'DF' ? cargoDef.alt : cargoDef.k, l = J.cargoInfo(k).lista.filter(c => cargoDef.nac || c.uf === u), e = l.filter(c => c.eleito);
    return { n: l.length, vagas: e.length, corte: Math.min(...e.map(c => c.votos ?? Infinity)), m: [100 * l.filter(c => c.mulher).length / (l.length || 1), 100 * e.filter(c => c.mulher).length / (e.length || 1)],
      ng: [100 * l.filter(c => c.raca === 'N').length / (l.length || 1), 100 * e.filter(c => c.raca === 'N').length / (e.length || 1)] }; };
  function estado() {
    fase(2); hud.hidden = true; rolarTopo();
    mostrar(`<div class="jg-tela">
      <p class="jg-chapeu">Fase 3 · Seu estado · ${titulo(cargoDef.nome[0])}</p><h2>Onde você vai disputar?</h2>
      <p class="jg-lead">Quanto mais gente disputando cada vaga, mais difícil. E o filtro de gênero e raça tem força diferente em cada lugar.</p>
      <div class="mapa-area"><div><div class="jg-abas" id="abas-mapa">${[['dificil', 'Candidatos por vaga'], ['m', 'Filtro de gênero'], ['ng', 'Filtro de raça']].map(([k, t]) => `<button type="button" data-k="${k}" class="${k === modoMapa ? 'ativo' : ''}">${t}</button>`).join('')}</div>
        <svg id="mapa" viewBox="0 0 400 520" role="img" aria-label="Mapa do Brasil em quadrados"></svg><p class="mapa-leg" id="mapa-leg"></p></div>
        <div class="uf-painel" id="uf-painel"><p class="jg-dica">Toque em um estado para ver como é a disputa lá.</p></div></div>
      ${(() => { const l = Object.keys(POS).map(u => ({ u, d: ufDe(u) })).filter(x => x.d.vagas).sort((a, z) => z.d.n / z.d.vagas - a.d.n / a.d.vagas);
        return l.length ? dado('Candidatos por vaga em cada estado', G.barras(l.slice(0, 10).map(x => ({ nome: x.u, v: x.d.n / x.d.vagas, cor: T.laranja })), { fmt: v => dec(v, 1) + ' por vaga' }),
          `<p>Neste cargo, a disputa mais apertada é em <b>${l[0].u}</b> (${dec(l[0].d.n / l[0].d.vagas, 1)} candidatos por vaga) e a mais folgada em <b>${l[l.length - 1].u}</b> (${dec(l[l.length - 1].d.n / l[l.length - 1].d.vagas, 1)}).</p>`, 'Candidatos e eleitos por estado · TSE 2026') : ''; })()}
      <div class="jg-acoes"><button type="button" class="jg-botao principal" id="b-uf" disabled>Escolha um estado</button><button type="button" class="jg-sec" id="b-uf-sorte">Sortear um estado</button></div></div>`);
    desenharMapa();
    document.querySelectorAll('#abas-mapa button').forEach(bt => bt.onclick = () => { modoMapa = bt.dataset.k; document.querySelectorAll('#abas-mapa button').forEach(x => x.classList.toggle('ativo', x === bt)); desenharMapa(); });
    $('b-uf-sorte').onclick = () => escolherUF(sorteia(Object.keys(POS).filter(u => ufDe(u).vagas)));
    $('b-uf').onclick = () => ufEscolhida && perfil();
    if (ufEscolhida) escolherUF(ufEscolhida);
  }
  const valorUF = u => { const d = ufDe(u); if (!d.vagas) return null; return modoMapa === 'dificil' ? d.n / d.vagas : d[modoMapa][0] - d[modoMapa][1]; };
  function desenharMapa() {
    const svg = $('mapa'); if (!svg) return;
    const vals = Object.keys(POS).map(valorUF).filter(v => v != null), mx = Math.max(...vals), mn = Math.min(...vals);
    const cor = v => { if (v == null) return '#2e2b38'; const k = (v - mn) / (mx - mn || 1), a = [58, 52, 72], z = modoMapa === 'dificil' ? [226, 98, 15] : [166, 108, 255]; return `rgb(${a.map((x, i) => Math.round(x + (z[i] - x) * k)).join(',')})`; };
    svg.innerHTML = Object.entries(POS).map(([u, [x, y]]) => { const v = valorUF(u);
      return `<g class="uf ${u === ufEscolhida ? 'sel' : ''}" data-uf="${u}" tabindex="0" role="button" aria-label="${u}"><rect x="${x * 64 + 6}" y="${y * 64 + 6}" width="58" height="58" rx="10" fill="${cor(v)}"/>
        <text x="${x * 64 + 35}" y="${y * 64 + 34}" text-anchor="middle" class="uf-sigla">${u}</text><text x="${x * 64 + 35}" y="${y * 64 + 52}" text-anchor="middle" class="uf-val">${v == null ? '' : modoMapa === 'dificil' ? dec(v, 0) + '/vaga' : (v > 0 ? '−' : '+') + dec(Math.abs(v), 0)}</text></g>`; }).join('');
    svg.querySelectorAll('.uf').forEach(g => { g.onclick = () => escolherUF(g.dataset.uf); g.onkeydown = e => { if (e.key === 'Enter') escolherUF(g.dataset.uf); }; });
    $('mapa-leg').textContent = modoMapa === 'dificil' ? 'Candidatos por vaga neste cargo (quanto mais laranja, mais concorrido).' : `Pontos percentuais que ${modoMapa === 'm' ? 'as mulheres' : 'as pessoas negras'} perdem entre candidatos e eleitos neste cargo (quanto mais roxo, mais forte o filtro).`;
  }
  function escolherUF(u) {
    ufEscolhida = u; carregarFotos(u); desenharMapa(); somTecla();
    const d = ufDe(u);
    $('uf-painel').innerHTML = `<h3>${u}</h3><p class="uf-grande">${d.vagas ? `${d.vagas === 1 ? '1 vaga' : d.vagas + ' vagas'} para <b>${num(d.n)}</b> candidatos` : 'Sem dados'}</p>
      <ul class="uf-lista"><li><span>Candidatos por vaga</span><b>${d.vagas ? dec(d.n / d.vagas, 1) : '—'}</b></li>${isFinite(d.corte) ? `<li><span>Eleito com menos votos</span><b>${num(d.corte)} votos</b></li>` : ''}
        <li><span>Mulheres: candidatas → eleitas</span><b>${pct(d.m[0], 0)} → ${pct(d.m[1], 0)}</b></li><li><span>Pessoas negras: candidatas → eleitas</span><b>${pct(d.ng[0], 0)} → ${pct(d.ng[1], 0)}</b></li></ul>
      ${d.vagas < 5 ? '<p class="jg-dica">Poucas vagas: os percentuais deste estado mudam muito com uma pessoa a mais ou a menos.</p>' : ''}`;
    const bt = $('b-uf'); bt.disabled = false; bt.textContent = `Disputar em ${u} →`;
  }

  // =================================================================
  // 4. SUA CANDIDATURA: escolher um candidato real ou criar o seu (com avatar) e registrar na urna
  // =================================================================
  const FILTROS = [['Todos', () => true], ['Mulheres negras', c => c.mulher && c.raca === 'N'], ['Mulheres brancas', c => c.mulher && c.raca === 'B'],
    ['Homens negros', c => !c.mulher && c.raca === 'N'], ['Homens brancos', c => !c.mulher && c.raca === 'B'], ['Com mandato', c => c.mandato]];
  let filtro = 0;
  function perfil() {
    if (cargoDef.nac) carregarFotos('BR'); aoFotos = () => { if ($('b-real')) perfil(); };
    fase(3); hud.hidden = true; rolarTopo();
    const amostra = comFoto(doLugar()).slice().sort(() => Math.random() - .5).slice(0, 15);
    mostrar(`<div class="jg-tela">
      <p class="jg-chapeu">Fase 4 · Sua candidatura · ${titulo(cargoDef.nome[0])}${cargoDef.nac ? '' : ' · ' + ufEscolhida}</p><h2>Quem você vai ser nesta eleição?</h2>
      <div class="perfil-grade">
        <div class="perfil-opcao"><div class="jg-mosaico" aria-hidden="true">${amostra.map((c, k) => `<div style="--k:${k}">${retrato(c)}</div>`).join('')}</div>
          <h3>Um candidato de verdade</h3><p>Escolha quem você quer ser entre os ${num(doLugar().length)} que disputaram ${cargoDef.nac ? 'a Presidência' : 'em ' + ufEscolhida} em 2026. No fim, você descobre o que aconteceu com essa pessoa.</p>
          <button type="button" class="jg-botao principal" id="b-real">Escolher um candidato</button></div>
        <div class="perfil-opcao destaque"><div class="avatar-vitrine" aria-hidden="true">${[0, 1, 2, 3].map(i => `<span class="jg-foto jg-avatar">${J.avatarSVG(avatarAleatorio(i * 7 + 3))}</span>`).join('')}</div>
          <h3>Crie o seu candidato</h3><p>Monte o seu avatar, escolha o nome de urna e registre o seu número e o seu perfil na urna. O modelo calcula a sua chance do mesmo jeito.</p>
          <button type="button" class="jg-botao" id="b-criar">Criar o meu candidato</button></div>
      </div></div>`);
    $('b-real').onclick = escolherReal;
    $('b-criar').onclick = criar;
  }

  // ---------- escolher um candidato real (sem sorteio) ----------
  function escolherReal() {
    rolarTopo();
    const base = doLugar().slice().sort((a, z) => a.nome.localeCompare(z.nome, 'pt-BR'));
    let busca = '', mostrando = 36;
    mostrar(`<div class="jg-tela"><p class="jg-chapeu">Fase 4 · Escolha o seu candidato</p><h2>Com quem você quer jogar?</h2>
      <div class="escolha-barra"><input type="search" id="busca-cand" placeholder="Procure pelo nome de urna…" autocomplete="off" aria-label="Procurar candidato">
        <div class="jg-filtros">${FILTROS.map(([n], k) => `<button type="button" data-k="${k}" class="${k === filtro ? 'ativo' : ''}">${n}</button>`).join('')}</div></div>
      <p class="jg-dica" id="cont-cand"></p><div class="grade-cand" id="grade-cand"></div>
      <button type="button" class="jg-sec" id="mais-cand">Mostrar mais</button>
      <button type="button" class="jg-sec" id="volta-perfil">← Voltar</button></div>`);
    const desenha = () => {
      const q = busca.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      const l = base.filter(FILTROS[filtro][1]).filter(c => !q || c.nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(q));
      $('cont-cand').textContent = `${num(l.length)} candidatos${l.length > mostrando ? ` · mostrando ${mostrando}` : ''}`;
      $('grade-cand').innerHTML = l.slice(0, mostrando).map(c => `<button type="button" class="cand" data-i="${c.i}">${retrato(c, 'jg-foto-cand')}
        <b>${esc(titulo(curto(c.nome)))}</b><small>${esc(c.partido)}</small><span class="chip">${grupo(c)}</span><span class="chip">${c.mandato ? 'com mandato' : 'sem mandato'}</span><span class="chip">${c.patrimonio ? reais(c.patrimonio) : 'sem bens'}</span></button>`).join('') || '<p class="jg-dica">Ninguém com esse nome. Tente outro filtro.</p>';
      $('mais-cand').hidden = l.length <= mostrando;
      $('grade-cand').querySelectorAll('.cand').forEach(b => b.onclick = () => { somFim(); ficha(J.TODOS[+b.dataset.i], {}); });
    };
    aoFotos = () => { if ($('grade-cand')) desenha(); };
    $('busca-cand').oninput = e => { busca = e.target.value; mostrando = 36; desenha(); };
    document.querySelectorAll('.jg-filtros button').forEach(bt => bt.onclick = () => { filtro = +bt.dataset.k; mostrando = 36; document.querySelectorAll('.jg-filtros button').forEach(x => x.classList.toggle('ativo', x === bt)); desenha(); });
    $('mais-cand').onclick = () => { mostrando += 36; desenha(); };
    $('volta-perfil').onclick = perfil;
    desenha();
  }

  // ---------- criar o seu candidato: avatar e nome ----------
  const PELES = ['#f6d7c3', '#e9b994', '#c98e63', '#a5683f', '#7a4a2a', '#4e2f1c'];
  const CABELOS = [['curto', 'Curto'], ['longo', 'Longo'], ['coque', 'Coque'], ['crespo', 'Black power'], ['trancas', 'Tranças'], ['careca', 'Careca']];
  const CORES_CAB = ['#1c1410', '#4a2c1a', '#8a5a2b', '#d8b26a', '#b0472a', '#a9a4a0'];
  const ACESS = [['nenhum', 'Nenhum'], ['oculos', 'Óculos'], ['brinco', 'Brincos'], ['ambos', 'Óculos e brincos']];
  const ROUPAS = ['#7b2cbf', '#e2620f', '#1f8a5b', '#2459c4', '#c2185b', '#2b2b33'];
  function avatarAleatorio(sem) { const r = rng(sem || Math.floor(Math.random() * 1e9)), p = l => l[Math.floor(r() * l.length)];
    return { pele: p(PELES), cabelo: p(CABELOS)[0], corCabelo: p(CORES_CAB), acessorio: p(ACESS)[0], roupa: p(ROUPAS) }; }
  let avatar = null, nomeUrna = '', partidoEsc = null;
  function criar() {
    rolarTopo();
    avatar = avatar || avatarAleatorio();
    const partidos = Object.keys(J.PART).sort((x, y) => x.localeCompare(y, 'pt'));
    if (!partidoEsc || !J.PART[partidoEsc]) partidoEsc = J.partidosOrd[Math.floor(Math.random() * J.partidosOrd.length)] || partidos[0];
    const chipPart = s => `<button type="button" data-p="${esc(s)}" class="${s === partidoEsc ? 'ativo' : ''}"><b>${esc(s)}</b> <small>${J.PART[s].n >= 15 ? fmtP(J.taxaPartido(s)) : 'poucos dados'}</small></button>`;
    const linha = (rot, campo, ops, tipo) => `<div class="campo av-campo" data-campo="${campo}"><span>${rot}</span><div>${ops.map(o => { const v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : '';
      return tipo === 'cor' ? `<button type="button" class="amostra ${avatar[campo] === v ? 'ativo' : ''}" data-v="${v}" style="--c:${v}" aria-label="cor ${v}"></button>` : `<button type="button" data-v="${v}" class="${avatar[campo] === v ? 'ativo' : ''}">${t}</button>`; }).join('')}</div></div>`;
    mostrar(`<div class="jg-tela"><p class="jg-chapeu">Fase 4 · Crie o seu candidato</p><h2>Monte o seu avatar</h2>
      <div class="criador"><div class="criador-previa"><span class="jg-foto jg-avatar jg-foto-grande" id="av-previa">${J.avatarSVG(avatar)}</span>
          <button type="button" class="jg-sec" id="av-sorte">Sortear visual</button></div>
        <div class="criador-op">
          <label class="campo"><span>Nome de urna</span><input type="text" id="av-nome" maxlength="22" value="${esc(nomeUrna)}" placeholder="Como você quer aparecer na urna" autocomplete="off"></label>
          ${linha('Tom de pele', 'pele', PELES, 'cor')}${linha('Cabelo', 'cabelo', CABELOS)}${linha('Cor do cabelo', 'corCabelo', CORES_CAB, 'cor')}${linha('Acessórios', 'acessorio', ACESS)}${linha('Cor da roupa', 'roupa', ROUPAS, 'cor')}
          <div class="campo av-partido"><span>Partido <small>(% = quanto o partido elegeu entre seus candidatos a deputado federal)</small></span><div>${partidos.map(chipPart).join('')}</div></div>
        </div></div>
      <p class="jg-dica" id="av-aviso"></p>
      <div class="jg-acoes"><button type="button" class="jg-botao principal" id="av-ok">Ir para a urna →</button><button type="button" class="jg-sec" id="volta-perfil">← Voltar</button></div></div>`);
    const atualiza = () => { $('av-previa').innerHTML = J.avatarSVG(avatar); };
    document.querySelectorAll('.av-campo').forEach(cp => cp.querySelectorAll('button').forEach(b => b.onclick = () => { avatar[cp.dataset.campo] = b.dataset.v; somTecla();
      cp.querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === b)); atualiza(); }));
    document.querySelectorAll('.av-partido button').forEach(b => b.onclick = () => { partidoEsc = b.dataset.p; somTecla();
      document.querySelectorAll('.av-partido button').forEach(x => x.classList.toggle('ativo', x === b)); });
    $('av-sorte').onclick = () => { avatar = avatarAleatorio(); criar(); };
    $('av-nome').oninput = e => { nomeUrna = e.target.value; };
    $('volta-perfil').onclick = perfil;
    $('av-ok').onclick = () => { const n = $('av-nome').value.trim(); if (!n) { $('av-aviso').textContent = 'Escreva o seu nome de urna antes de seguir.'; $('av-nome').focus(); return; } nomeUrna = n; registrar(n, Object.assign({}, avatar), partidoEsc); };
    setTimeout(() => $('av-nome') && $('av-nome').focus(), 100);
  }
  function registrar(nome, av, partido) {
    rolarTopo();
    mostrar(`<div class="jg-tela"><p class="jg-chapeu">Fase 4 · Registro de candidatura</p><h2>Agora registre ${esc(nome)} na urna</h2>
      <p class="jg-lead">Use o teclado da urna (ou o do computador): os números escolhem, <b>CONFIRMA</b> segue, <b>CORRIGE</b> apaga.</p><div id="urna-reg"></div></div>`);
    urna($('urna-reg'), { cabeca: 'REGISTRO · ' + titulo(cargoDef.nome[0]).toUpperCase(), passos: [
      { tipo: 'numero', campo: 'numero', titulo: `Seu número de candidato (${cargoDef.dig} dígitos)`, digitos: cargoDef.dig, mostra: d => `<div class="u-cand"><span class="jg-foto jg-avatar jg-foto-rival">${J.avatarSVG(av)}</span><div><b>${esc(nome)}</b><span>número ${esc(d)}</span></div></div>` },
      { tipo: 'opcoes', campo: 'genero', titulo: 'Gênero', opcoes: [['F', 'Mulher'], ['M', 'Homem']] },
      { tipo: 'opcoes', campo: 'raca', titulo: 'Cor ou raça (autodeclarada)', opcoes: [['N', 'Preta ou parda'], ['B', 'Branca'], ['O', 'Amarela ou indígena']] },
      { tipo: 'opcoes', campo: 'idade', titulo: 'Idade', opcoes: [['24', 'Até 29 anos'], ['37', '30 a 44 anos'], ['52', '45 a 59 anos'], ['66', '60 anos ou mais']] },
      { tipo: 'opcoes', campo: 'superior', titulo: 'Ensino superior completo?', opcoes: [['1', 'Sim'], ['0', 'Não']] },
      { tipo: 'opcoes', campo: 'pat', titulo: 'Patrimônio (soma dos seus bens)', opcoes: [['0', 'Nenhum bem'], ['40000', 'Até R$ 100 mil'], ['350000', 'R$ 100 mil a R$ 1 milhão'], ['3000000', 'R$ 1 a 10 milhões'], ['25000000', 'Mais de R$ 10 milhões']] },
      { tipo: 'opcoes', campo: 'mandato', titulo: 'Você já tem mandato político?', opcoes: [['0', 'Não'], ['1', 'Sim']] }
    ], aoFim: r => { UI.conquista('urna'); ficha({ ficticio: true, nome, avatar: av, cargo: cargoReal(), uf: cargoDef.nac ? null : ufEscolhida, partido, mulher: r.genero === 'F', raca: r.raca,
        superior: r.superior === '1', patrimonio: +r.pat, mandato: r.mandato === '1', idade: +r.idade, eleito: false, votos: null }, { numero: r.numero }); } });
  }

  // ---------- caixa e estado da campanha ----------
  const GA = J.D.gastos;
  const bonusH = GA && GA.mediana_mulheres ? lim(Math.round(Math.log2(GA.mediana_homens / GA.mediana_mulheres)), 0, 2) : 1;
  const bonusB = GA && GA.mediana_negros ? lim(Math.round(Math.log2(GA.mediana_brancos / GA.mediana_negros)), 0, 2) : 1;
  function caixaInicial(c) {
    const it = [['Fundo do partido', 2]];
    if (c.mandato) it.push(['Estrutura de quem já tem mandato', 3]);
    if (c.patrimonio >= 1e6) it.push(['Patrimônio acima de R$ 1 milhão', 2]); else if (c.patrimonio >= 1e5) it.push(['Patrimônio acima de R$ 100 mil', 1]);
    if (!c.mulher && bonusH) it.push(['Ser homem: eles arrecadam mais', bonusH]);
    if (c.raca === 'B' && bonusB) it.push(['Ser branco(a): arrecadam mais', bonusB]);
    return it;
  }
  function novoEstado(c, semente) {
    const r = rng(semente), it = caixaInicial(c), lg = J.base(c);
    const OUTROS = ['viral', 'falsa', 'debate', 'escandalo', 'chuva', 'critica'], ev = c.mulher && r() < 0.45 ? 'cota' : OUTROS[Math.floor(r() * OUTROS.length)];
    return { c, semente, itens: it, caixa: it.reduce((s, x) => s + x[1], 0), lg, extra: 0, hist: [logistica(lg)], u: r(), u2: r(), u3: r(), q: Math.floor(r() * 6), evento: ev,
      cen: [0, 1, 2, 3, 4].map(() => Math.floor(r() * 6)), escolhas: [], semana: 0, cliques: 0, cliques2: 0, cliques3: 0, acertou: false, acertou2: false, acertou3: false, investir: 0,
      dicas: Math.min(3, 1 + Math.floor(UI.CARTAS.filter(x => UI.album[x.id]).length / 4)), usouDica: false };
  }
  let st = null, rivais = [], pers = null, resultado = null;

  // personalização
  const TEMAS = ['Saúde', 'Educação', 'Segurança', 'Emprego', 'Meio ambiente', 'Cultura'];
  const CORES = [['#7b2cbf', 'Roxo'], ['#e2620f', 'Laranja'], ['#1f8a5b', 'Verde'], ['#2459c4', 'Azul'], ['#c2185b', 'Magenta']];
  const SLOGANS = {
    'Saúde': ['Saúde não espera', 'Posto aberto, fila zero', '{n}: cuidar de gente é prioridade', 'Mais médicos no seu bairro', 'Saúde perto de casa', 'Remédio na mão, respeito no coração'],
    'Educação': ['Escola boa é escola pública', 'Educação muda tudo', '{n} pela sala de aula', 'Professor valorizado, futuro garantido', 'Creche para toda criança', 'Aprender é direito de todos'],
    'Segurança': ['Rua segura, gente feliz', 'Paz no bairro', '{n}: segurança com inteligência', 'Iluminação e prevenção', 'Proteger quem mais precisa', 'Andar sem medo'],
    'Emprego': ['Trabalho e renda para todos', 'Emprego já!', '{n}: oportunidade para quem quer trabalhar', 'Primeiro emprego, primeiro passo', 'Apoio a quem empreende', 'Carteira assinada, vida melhor'],
    'Meio ambiente': ['Cuidar do planeta é cuidar de nós', 'Cidade verde, cidade viva', '{n} pelo clima', 'Rio limpo, bairro feliz', 'Energia limpa já', 'Mais árvores, menos calor'],
    'Cultura': ['Cultura é direito', 'Arte em cada esquina', '{n}: a cultura do povo no poder', 'Mais bibliotecas, mais sonhos', 'Festa, memória e identidade', 'Quem cria merece apoio']
  };
  const SIMBOLOS = [['★', 'Estrela'], ['♥', 'Coração'], ['ϟ', 'Raio'], ['❦', 'Folha'], ['➜', 'Seta'], ['◆', 'Diamante']];
  const ESTILOS = ['Clássico', 'Moderno', 'Retrô'];
  const JINGLES = { 'Forró': [[392, .15], [440, .15], [494, .15], [523, .3], [494, .15], [440, .3]], 'Sertanejo': [[330, .3], [392, .3], [440, .3], [392, .6]],
    'Samba': [[523, .12], [587, .12], [523, .12], [659, .24], [587, .12], [523, .24]], 'Funk': [[220, .12], [220, .12], [330, .24], [220, .12], [294, .24]],
    'Rap': [[196, .2], [196, .1], [233, .2], [196, .1], [262, .3]], 'Marchinha': [[523, .2], [523, .2], [659, .2], [784, .4], [659, .2], [523, .4]] };
  function tocarJingle(n) { if (!somLigado) return; let t = 0; (JINGLES[n] || []).forEach(([f, d]) => { bip(f, t, d * 0.9); t += d; }); }
  const slogans = (c, tema) => (SLOGANS[tema] || SLOGANS['Saúde']).map(s => s.replace('{n}', nomeDe(c).split(' ')[0]));

  // "quem se parece com você": eleitos do mesmo cargo com mais características em comum
  const faixaPat = v => !v ? 0 : v < 1e5 ? 1 : v < 1e6 ? 2 : v < 1e7 ? 3 : 4, faixaIdade = v => v == null ? -1 : v < 30 ? 0 : v < 45 ? 1 : v < 60 ? 2 : 3;
  const TRACOS = [['mulher', c => c.mulher ? 'mulher' : 'homem'], ['raca', c => RACA[c.raca] ? RACA[c.raca].split(' ')[0] : '—'], ['superior', c => c.superior ? 'superior completo' : 'sem superior'],
    ['pat', c => ['sem bens', 'até R$ 100 mil', 'R$ 100 mil a 1 mi', 'R$ 1 a 10 mi', '+R$ 10 mi'][faixaPat(c.patrimonio)]], ['mandato', c => c.mandato ? 'com mandato' : 'sem mandato'],
    ['idade', c => c.idade ? ['até 29', '30 a 44', '45 a 59', '60+'][faixaIdade(c.idade)] + ' anos' : '—']];
  const chaveT = (k, c) => k === 'pat' ? faixaPat(c.patrimonio) : k === 'idade' ? faixaIdade(c.idade) : c[k];
  function parecidos(c) {
    const r = rng(c.nome.length * 97 + Math.round(c.patrimonio || 1));
    return info().lista.filter(x => x.eleito && x !== c).map(x => ({ x, iguais: TRACOS.filter(([k]) => chaveT(k, x) === chaveT(k, c)).map(([k]) => k), s: r() + (temFoto(x) ? 0.5 : 0) }))
      .sort((a, z) => z.iguais.length - a.iguais.length || z.s - a.s).slice(0, 3);
  }
  function favorContra(c) {
    const f = [], k = [], bM = J.M['C(tem_mandato)[T.Sim]'] || 0, bH = J.M['C(genero)[T.Masculino]'] || 0, bN = J.M['C(raca)[T.Negra]'] || 0, bS = J.M['C(superior)[T.Sim]'] || 0;
    (c.mandato === (bM > 0) ? f : k).push(c.mandato ? 'já ter mandato' : 'não ter mandato');
    ((!c.mulher) === (bH > 0) ? f : k).push(c.mulher ? 'ser mulher' : 'ser homem');
    ((c.raca === 'B') === (bN < 0) ? f : k).push(c.raca === 'B' ? 'ser branco(a)' : c.raca === 'N' ? 'ser preto(a) ou pardo(a)' : 'ser amarelo(a) ou indígena');
    (c.superior === (bS > 0) ? f : k).push(c.superior ? 'ter ensino superior' : 'não ter ensino superior');
    if (c.patrimonio >= 1e6) f.push('patrimônio acima de R$ 1 milhão'); else if (c.patrimonio < 1e5) k.push(c.patrimonio ? 'patrimônio de até R$ 100 mil' : 'não ter bens declarados');
    return { f, k };
  }

  // =================================================================
  // 4b. A FICHA: chance com intervalo de confiança, quem se parece com você e personalização
  // =================================================================
  function ficha(c, extra) {
    st = novoEstado(c, Math.floor(Math.random() * 1e9));
    const r = rng(st.semente + 7), outros = doLugar().filter(x => x !== c);
    pers = { tema: TEMAS[Math.floor(r() * TEMAS.length)], cor: CORES[0][0], jingle: 'Forró', simbolo: SIMBOLOS[0][0], estilo: 'Clássico',
      numero: extra.numero || J.numeroDe(c) || String(Math.floor(10 ** (cargoDef.dig - 1) + r() * 9 * 10 ** (cargoDef.dig - 1))) };
    pers.slogan = slogans(c, pers.tema)[0];
    rivais = [];
    for (const l of [comFoto(outros.filter(x => x.eleito)), comFoto(outros.filter(x => x.eleito)), comFoto(outros.filter(x => !x.eleito)), comFoto(outros.filter(x => !x.eleito))]) {
      const cand = l.filter(x => !rivais.includes(x)); if (cand.length) rivais.push(sorteia(cand, r)); }
    rivais.sort((a, z) => J.base(z) - J.base(a));
    rolarTopo(); desenharHud();
    const ic = J.chanceIC(c), fc = favorContra(c), par = parecidos(c), inf = info();
    const bins = [0, 1, 1e4, 5e4, 1e5, 3e5, 1e6, 3e6, 1e7, 1e12], rot = ['nenhum', 'até 10 mil', '10–50 mil', '50–100 mil', '100–300 mil', '300 mil–1 mi', '1–3 mi', '3–10 mi', '10 mi+'];
    const E = p => 100 * Math.sqrt(lim(p, 0, 1));
    const regua = ic ? `<div class="regua" aria-hidden="true"><i class="regua-ic" style="left:${E(ic[0])}%;width:${Math.max(1, E(ic[1]) - E(ic[0]))}%"></i><i class="regua-media" style="left:${E(inf.taxa)}%"></i><i class="regua-voce" style="left:${E(st.hist[0])}%"></i></div>
      <p class="regua-leg"><span class="v">● você</span><span class="i">▬ intervalo de 95%</span><span class="m">| média do cargo (${fmtP(inf.taxa)})</span></p>` : '';
    mostrar(`<div class="jg-tela">
      <div class="jg-ficha">
        <div class="jg-santinho" id="santinho" style="--cc:${pers.cor}">${retrato(c, 'jg-foto-grande')}<div>
          <p class="jg-chapeu">${ao(c, 'Candidato', 'Candidata')} a ${nomeCargo(c)}${c.uf ? ' · ' + c.uf : ''}</p><h3>${esc(c.ficticio ? c.nome : titulo(c.nome))}</h3>
          <p class="santinho-num"><i id="s-simb">${pers.simbolo}</i><span>${esc(pers.numero)}</span> ${esc(c.partido)}</p><p class="santinho-slogan" id="s-slogan">“${esc(pers.slogan)}”</p><p class="santinho-tema" id="s-tema">Bandeira: ${esc(pers.tema)}</p>
          <dl><div><dt>Perfil</dt><dd>${c.mulher ? 'Mulher' : 'Homem'}, ${RACA[c.raca] || '—'}${c.idade ? ', ' + c.idade + ' anos' : ''}</dd></div>
            <div><dt>Estudo</dt><dd>${c.superior ? 'Ensino superior completo' : 'Sem ensino superior completo'}</dd></div>
            <div><dt>Patrimônio</dt><dd>${c.patrimonio ? reais(c.patrimonio) : 'Nenhum bem declarado'}</dd></div><div><dt>Mandato</dt><dd>${c.mandato ? 'Já exerce mandato' : 'Nunca teve mandato'}</dd></div></dl></div></div>
        <div class="jg-partida">
          <p class="jg-chapeu">Seu ponto de partida</p><p class="jg-grande">${fmtP(st.hist[0])}</p>
          ${ic ? `<p class="jg-ic">Intervalo de confiança de 95%: entre <b>${fmtP(ic[0])}</b> e <b>${fmtP(ic[1])}</b></p>${regua}` : ''}
          <p>Chance que a <b>regressão logística</b> do estudo dá para esse perfil. São ${num(inf.nEl)} ${inf.nEl === 1 ? 'eleito' : 'eleitos'} para ${num(inf.n)} candidatos neste cargo${J.calibrado(c.cargo) ? ' (este cargo não entrou no modelo: usamos os mesmos pesos, com o nível ajustado à taxa real de eleição)' : ''}.</p>
          <div class="favor-contra"><div><b>A favor</b>${fc.f.map(t => `<span class="chip sim">${t}</span>`).join('') || '<span class="chip">nada</span>'}</div><div><b>Contra</b>${fc.k.map(t => `<span class="chip nao">${t}</span>`).join('') || '<span class="chip">nada</span>'}</div></div>
          <p class="jg-chapeu">Seu caixa: ${st.caixa} moedas</p><ul class="jg-itens">${st.itens.map(([t, v]) => `<li><span>${esc(t)}</span><b>+${v}</b></li>`).join('')}</ul>
        </div></div>
      <section class="personaliza"><p class="jg-chapeu">Personalize a sua campanha</p>
        <div class="campo"><span>Bandeira da campanha (aparece nos eventos)</span><div id="p-tema">${TEMAS.map(t => `<button type="button" data-v="${t}" class="${t === pers.tema ? 'ativo' : ''}">${t}</button>`).join('')}</div></div>
        <div class="campo"><span>Slogan</span><div id="p-slogan"></div></div>
        <div class="campo"><span>Cor da campanha</span><div id="p-cor">${CORES.map(([v, n]) => `<button type="button" data-v="${v}" class="cor ${v === pers.cor ? 'ativo' : ''}" style="--c:${v}"><i></i>${n}</button>`).join('')}</div></div>
        <div class="campo"><span>Símbolo</span><div id="p-simb">${SIMBOLOS.map(([v, n]) => `<button type="button" data-v="${v}" class="${v === pers.simbolo ? 'ativo' : ''}"><b class="simb">${v}</b> ${n}</button>`).join('')}</div></div>
        <div class="campo"><span>Jingle (toque para ouvir)</span><div id="p-jingle">${Object.keys(JINGLES).map(n => `<button type="button" data-v="${n}" class="${n === pers.jingle ? 'ativo' : ''}">♪ ${n}</button>`).join('')}</div></div>
        <div class="campo"><span>Estilo do santinho</span><div id="p-estilo">${ESTILOS.map(n => `<button type="button" data-v="${n}" class="${n === pers.estilo ? 'ativo' : ''}">${n}</button>`).join('')}</div></div></section>
      ${par.length ? `<section class="parecidos"><h3>Quem se parece com você e se elegeu</h3><p class="jg-dica">Entre ${inf.nEl === 1 ? "o único eleito" : "os " + num(inf.nEl) + " eleitos"} para este cargo em 2026, ${inf.nEl === 1 ? "este é quem tem" : "estes têm"} mais características em comum com você (em roxo).</p>
        <div class="parecidos-lista">${par.map(({ x, iguais }) => `<div class="parecido">${retrato(x, 'jg-foto-rival')}<div><b>${esc(titulo(curto(x.nome)))}</b><small>${esc(x.partido)}${x.uf ? ' · ' + x.uf : ''} · ${iguais.length} de ${TRACOS.length} em comum</small>
          <p>${TRACOS.map(([k, f]) => `<span class="chip ${iguais.includes(k) ? 'igual' : ''}">${esc(f(x))}</span>`).join('')}</p></div></div>`).join('')}</div></section>` : ''}
      ${dado('Você no meio de todos os candidatos', G.histograma(J.TODOS.map(x => x.patrimonio || 0), { bins, rotulos: rot, voce: c.patrimonio || 0, rotVoce: 'você' }) + `
        <div class="dado-numeros"><div><b>${reais(S.patMediana)}</b><span>patrimônio mediano<br>dos candidatos</span></div><div><b>${reais(S.patMedia)}</b><span>patrimônio médio<br>(puxado pelos milionários)</span></div>
          <div><b>${dec(S.assimetria, 1)}</b><span>assimetria<br>(0 seria simétrico)</span></div><div><b>${pct(S.semBens, 0)}</b><span>não declararam<br>nenhum bem</span></div></div>
        <p>O candidato típico de 2026: <b>${pct(S.homens, 0)}</b> são homens, <b>${pct(S.brancos, 0)}</b> são brancos, idade mediana de <b>${S.idadeMediana} anos</b>${c.idade ? ` (você tem ${c.idade})` : ''}. Com uma cauda tão longa, a média engana: por isso o jogo usa mediana e logaritmo do patrimônio.</p>`, 'Análise univariada · medidas-resumo, dispersão e outliers')}
      <button type="button" class="jg-botao principal" id="b-comecar">Começar a campanha →</button></div>`);
    const desenhaSlogans = () => { $('p-slogan').innerHTML = slogans(c, pers.tema).map(s => `<button type="button" data-v="${esc(s)}" class="${s === pers.slogan ? 'ativo' : ''}">${esc(s)}</button>`).join('');
      $('p-slogan').querySelectorAll('button').forEach(b => b.onclick = () => { pers.slogan = b.dataset.v; somTecla(); desenhaSlogans(); $('s-slogan').textContent = '“' + pers.slogan + '”'; }); };
    desenhaSlogans();
    $('p-tema').querySelectorAll('button').forEach(b => b.onclick = () => { pers.tema = b.dataset.v; pers.slogan = slogans(c, pers.tema)[0]; somTecla();
      $('p-tema').querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === b)); desenhaSlogans(); $('s-slogan').textContent = '“' + pers.slogan + '”'; $('s-tema').textContent = 'Bandeira: ' + pers.tema; });
    $('p-cor').querySelectorAll('button').forEach(b => b.onclick = () => { pers.cor = b.dataset.v; somTecla(); $('p-cor').querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === b)); $('santinho').style.setProperty('--cc', pers.cor); });
    const grupoBotoes = (id, campo, depois) => $(id).querySelectorAll('button').forEach(b => b.onclick = () => { pers[campo] = b.dataset.v; somTecla();
      $(id).querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === b)); depois && depois(); });
    grupoBotoes('p-simb', 'simbolo', () => { $('s-simb').textContent = pers.simbolo; });
    grupoBotoes('p-jingle', 'jingle', () => tocarJingle(pers.jingle));
    grupoBotoes('p-estilo', 'estilo', () => { $('santinho').dataset.estilo = pers.estilo; });
    $('santinho').dataset.estilo = pers.estilo;
    $('b-comecar').onclick = () => { tocarJingle(pers.jingle); semana(); };
  }

  // =================================================================
  // HUD
  // =================================================================
  const ESC = p => lim((Math.log(Math.max(p, 0.005)) - Math.log(0.005)) / (Math.log(1) - Math.log(0.005)), 0, 1);
  function medidor() {
    const arco = r => `M${130 - r} 130 A${r} ${r} 0 0 1 ${130 + r} 130`;
    const marcas = [0.01, 0.05, 0.1, 0.25, 0.5, 1].map(v => { const a = Math.PI * (1 - ESC(v)); return `<text x="${130 + 120 * Math.cos(a)}" y="${136 - 120 * Math.sin(a)}" text-anchor="middle">${Math.round(v * 100)}%</text>`; }).join('');
    return `<svg viewBox="-14 0 288 150" class="jg-medidor" aria-hidden="true"><defs><linearGradient id="jg-grad" x1="0" x2="1"><stop offset="0" stop-color="#4a4655"/><stop offset=".55" stop-color="#a66cff"/><stop offset="1" stop-color="#e2620f"/></linearGradient></defs>
      <path d="${arco(100)}" class="jg-trilho"/><path d="${arco(100)}" class="jg-cheio" pathLength="1" id="jg-cheio"/><g id="jg-ponteiro"><line x1="130" y1="130" x2="130" y2="44"/><circle cx="130" cy="130" r="8"/></g>${marcas}</svg>`;
  }
  function moverMedidor(p) { const t = ESC(p), a = $('jg-cheio'), b = $('jg-ponteiro'); if (a) a.style.strokeDashoffset = 1 - t; if (b) b.style.transform = `rotate(${-90 + 180 * t}deg)`; }
  function contar(el, de, ate, ms = 900) { if (!el) return; if (PARADO) { el.textContent = fmtP(ate); return; }
    const t0 = performance.now(), f = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3; el.textContent = fmtP(de + (ate - de) * e); if (k < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
  const moedas = n => n > 0 ? Array.from({ length: n }, (_, i) => `<i class="jg-moeda" style="--d:${i * 40}ms"></i>`).join('') : '<span class="jg-zero">caixa vazio</span>';
  function desenharHud(mostrarP) {
    const c = st.c, p = logistica(st.lg), visto = mostrarP ?? p;
    hud.hidden = false;
    hud.innerHTML = `<div class="jg-eu">${retrato(c, 'jg-foto-hud')}<div><b>${esc(nomeDe(c))}</b><span>${esc(c.partido)} · ${nomeCargo(c)}${c.uf ? ' · ' + c.uf : ''}</span><span class="jg-tag" style="--anel:${corGrupo(c)}">${grupo(c)}</span></div></div>
      <div class="jg-chance">${medidor()}<p><span id="jg-num">${fmtP(visto)}</span><small>chance de se eleger</small></p></div>
      <div class="jg-caixa"><small>Caixa de campanha · <span class="hud-dicas">${st.dicas || 0} ${st.dicas === 1 ? 'dica' : 'dicas'}</span></small><div class="jg-moedas">${moedas(st.caixa)}</div><div class="jg-pips">${[0, 1, 2, 3, 4].map(k => `<i class="${k < st.semana ? 'feito' : k === st.semana ? 'agora' : ''}"></i>`).join('')}</div>
        <small>${st.semana < 5 ? `Semana ${st.semana + 1} de 5` : 'Fim da campanha'}</small></div>
      <div class="jg-rivais"><small>Seus adversários ${cargoDef.nac ? 'na disputa' : 'em ' + esc(c.uf || '')} · ponto de partida de cada um, segundo o modelo</small>
        <div>${[c, ...rivais].map(r => { const pr = r === c ? p : J.chance(r);
          return `<div class="jg-rival ${r === c ? 'voce' : ''}">${retrato(r, 'jg-foto-rival')}<span>${r === c ? 'Você' : esc(nomeDe(r))}</span><i class="jg-barra"><b style="width:${(100 * ESC(pr)).toFixed(1)}%"></b></i><em>${fmtP(pr)}</em></div>`; }).join('')}</div></div>`;
    requestAnimationFrame(() => moverMedidor(visto));
  }

  // =================================================================
  // 5. AS 5 SEMANAS
  // =================================================================
  const fundo = (a, z) => `<defs><linearGradient id="g${a.slice(1)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${z}"/></linearGradient>
    <pattern id="pt" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#fff" opacity=".07"/></pattern></defs><rect width="640" height="240" fill="url(#g${a.slice(1)})"/><rect width="640" height="240" fill="url(#pt)"/>`;
  const multidao = (y, cor) => Array.from({ length: 26 }, (_, i) => { const x = 10 + i * 24 + (i % 2) * 6, h = 16 + (i * 7) % 12; return `<circle cx="${x}" cy="${y - h - 9}" r="9" fill="${cor}"/><rect x="${x - 11}" y="${y - h}" width="22" height="${h + 20}" rx="10" fill="${cor}"/>`; }).join('');
  const ILU = {
    partido: () => `${fundo('#2a1a45', '#16141d')}${[[150, '#a66cff', 0], [320, '#e2620f', 1], [490, '#cbc4b6', 2]].map(([x, c, k]) => `<rect x="${x}" y="38" width="5" height="160" rx="2" fill="#f3eee4" opacity=".8"/>
      <path d="M${x + 5} 44 q40 -14 80 0 t80 0 v58 q-40 14 -80 0 t-80 0z" fill="${c}"><animate attributeName="d" dur="${2.4 + k * .4}s" repeatCount="indefinite" values="M${x + 5} 44 q40 -14 80 0 t80 0 v58 q-40 14 -80 0 t-80 0z;M${x + 5} 44 q40 14 80 0 t80 0 v58 q-40 -14 -80 0 t-80 0z;M${x + 5} 44 q40 -14 80 0 t80 0 v58 q-40 14 -80 0 t-80 0z"/></path>`).join('')}<g opacity=".6">${multidao(232, '#0d0b12')}</g>`,
    rua: () => `${fundo('#3a1d0e', '#16141d')}<g fill="#0d0b12" opacity=".8"><rect x="0" y="150" width="70" height="90"/><rect x="74" y="120" width="50" height="120"/><rect x="128" y="160" width="80" height="80"/><rect x="420" y="130" width="60" height="110"/><rect x="484" y="105" width="70" height="135"/><rect x="558" y="150" width="82" height="90"/></g>
      <g transform="translate(150 70)"><path d="M0 40 L70 10 L70 90 L0 60z" fill="#e2620f"/><rect x="-22" y="38" width="24" height="24" rx="5" fill="#f3eee4"/>${[0, 1, 2].map(k => `<path d="M${90 + k * 22} ${18 - k * 8} q${18 + k * 6} 32 0 ${64 + k * 16}" stroke="#f3eee4" stroke-width="5" fill="none" stroke-linecap="round" opacity="${.9 - k * .25}"/>`).join('')}</g>
      <g transform="translate(380 34)"><rect width="104" height="176" rx="18" fill="#f3eee4"/><rect x="8" y="18" width="88" height="140" rx="8" fill="#2a1a45"/>${[0, 1, 2].map(k => `<g transform="translate(${26 + k * 22} ${120 - k * 34})"><path d="M0 6 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 q0 10 -12 18 q-12 -8 -12 -18z" fill="#a66cff"><animateTransform attributeName="transform" type="translate" values="0 0;0 -12;0 0" dur="${1.6 + k * .3}s" repeatCount="indefinite"/></path></g>`).join('')}</g>`,
    apoio: () => `${fundo('#1c2a3a', '#16141d')}${Array.from({ length: 11 }, (_, i) => `<path d="M${88 + i * 48} 36 l12 26 l12 -26z" fill="${['#a66cff', '#e2620f', '#f3eee4'][i % 3]}"/>`).join('')}<path d="M80 34 H600" stroke="#f3eee4" stroke-width="2" opacity=".5"/>
      <rect x="150" y="160" width="340" height="80" fill="#e2620f"/><rect x="150" y="160" width="340" height="12" fill="#f3eee4" opacity=".8"/><g fill="#f3eee4"><circle cx="270" cy="92" r="20"/><rect x="246" y="114" width="48" height="50" rx="18"/><circle cx="370" cy="92" r="20"/><rect x="346" y="114" width="48" height="50" rx="18"/></g>
      <path d="M290 122 l40 -50 M350 122 l-20 -50" stroke="#f3eee4" stroke-width="12" stroke-linecap="round"/><circle cx="330" cy="68" r="10" fill="#a66cff"/>`,
    viral: () => `${fundo('#2a1a45', '#3a1d0e')}${Array.from({ length: 7 }, (_, i) => `<rect x="${60 + i * 34}" y="${200 - (i + 1) * 20}" width="22" height="${(i + 1) * 20}" rx="4" fill="#a66cff" opacity="${.35 + i * .09}"/>`).join('')}
      <g transform="translate(360 30)"><rect width="110" height="186" rx="18" fill="#f3eee4"/><rect x="8" y="18" width="94" height="150" rx="8" fill="#16141d"/><circle cx="55" cy="93" r="30" fill="#e2620f"/><path d="M47 78 L70 93 L47 108z" fill="#f3eee4"/></g><path d="M520 190 L590 60 M570 56 L594 52 L596 78" stroke="#e2620f" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    falsa: () => `${fundo('#3a1414', '#16141d')}<g transform="translate(150 26) rotate(-6)"><rect width="260" height="190" rx="6" fill="#f3eee4"/><rect x="18" y="18" width="224" height="30" fill="#16141d"/>${Array.from({ length: 6 }, (_, i) => `<rect x="18" y="${64 + i * 18}" width="${i % 3 === 2 ? 140 : 224}" height="8" rx="4" fill="#8f8a99"/>`).join('')}</g>
      <g transform="translate(330 70) rotate(-14)"><rect width="200" height="64" rx="8" fill="none" stroke="#e2620f" stroke-width="7"/><text x="100" y="45" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="36" fill="#e2620f" letter-spacing="4">FALSO</text></g>`,
    debate: () => `${fundo('#16233a', '#16141d')}<rect x="110" y="24" width="420" height="190" rx="14" fill="#0d0b12" stroke="#f3eee4" stroke-width="5"/><rect x="128" y="40" width="96" height="26" rx="13" fill="#e2620f"/><text x="176" y="58" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="13" fill="#f3eee4">AO VIVO</text>
      ${[230, 410].map((x, k) => `<g fill="${k ? '#cbc4b6' : '#a66cff'}"><circle cx="${x}" cy="106" r="20"/><rect x="${x - 26}" y="128" width="52" height="40" rx="16"/></g><rect x="${x - 40}" y="150" width="80" height="50" rx="4" fill="#f3eee4"/>`).join('')}`,
    cota: () => `${fundo('#2a1a45', '#16141d')}<g transform="translate(120 40)">${Array.from({ length: 10 }, (_, i) => `<g transform="translate(${i * 40} 0)"><circle cx="16" cy="20" r="13" fill="${i < 3 ? '#a66cff' : '#cbc4b6'}"/><rect x="2" y="36" width="28" height="44" rx="12" fill="${i < 3 ? '#a66cff' : '#cbc4b6'}"/></g>`).join('')}
      <rect x="-10" y="100" width="420" height="44" rx="10" fill="#0d0b12"/><text x="200" y="129" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="18" fill="#f3eee4">COTA MÍNIMA: 30% DE MULHERES</text></g>`,
    urna: () => `${fundo('#2a1a45', '#16141d')}<g transform="translate(200 30)"><rect width="240" height="180" rx="14" fill="#cbc4b6"/><rect x="16" y="18" width="120" height="90" rx="6" fill="#f3eee4"/><rect x="28" y="34" width="70" height="10" rx="5" fill="#8f8a99"/><rect x="28" y="54" width="96" height="10" rx="5" fill="#8f8a99"/><rect x="28" y="74" width="50" height="10" rx="5" fill="#a66cff"/>
      ${Array.from({ length: 9 }, (_, i) => `<rect x="${150 + (i % 3) * 26}" y="${20 + Math.floor(i / 3) * 26}" width="20" height="20" rx="4" fill="#16141d"/>`).join('')}<rect x="150" y="104" width="34" height="22" rx="4" fill="#f3eee4"/><rect x="190" y="104" width="38" height="22" rx="4" fill="#e2620f"/></g>
      ${Array.from({ length: 18 }, (_, i) => `<rect x="${40 + (i * 73) % 560}" y="${10 + (i * 41) % 200}" width="8" height="14" rx="2" fill="${['#a66cff', '#e2620f', '#f3eee4'][i % 3]}" transform="rotate(${i * 37} ${44 + (i * 73) % 560} ${17 + (i * 41) % 200})"/>`).join('')}`
  };
  const ilustracao = (t, rot) => `<svg class="jg-ilu" viewBox="0 0 640 240" role="img" aria-label="${esc(rot)}" preserveAspectRatio="xMidYMid slice">${ILU[t]()}</svg>`;

  // perguntas do debate: todas saem dos dados do estudo
  function perguntaDebate(s, extra = 0) {
    const c = s.c, d = ufDe(c.uf || 'XX'), rz = S.patMedianaEl / Math.max(1, S.patMedianaNao), mEl = S.grupos[0].el, sup = S.grupos[4];
    const P = [
      { q: '“Que fatia dos eleitos de 2026, somando todos os cargos, são mulheres?”', ok: pct(mEl, 0), erradas: [pct(S.grupos[0].cand, 0), '51%', pct(mEl / 2, 0)], exp: `Mulheres foram ${pct(S.grupos[0].cand, 0)} das candidaturas e só ${pct(mEl, 0)} dos eleitos.` },
      { q: '“O patrimônio mediano dos eleitos é quantas vezes o dos não eleitos?”', ok: dec(rz, 0) + ' vezes', erradas: ['2 vezes', dec(rz * 4, 0) + ' vezes', 'É o mesmo'], exp: `O eleito mediano declarou ${reais(S.patMedianaEl)}; o não eleito, ${reais(S.patMedianaNao)}.` },
      { q: '“Segundo os dados, o que mais aumenta a chance de alguém se eleger?”', ok: 'Já ter mandato', erradas: ['Ser homem', 'Ter ensino superior', 'Ter 10 vezes mais patrimônio'], exp: `Já ter mandato multiplica a chance por ${dec(J.or('C(tem_mandato)[T.Sim]')[0], 1)}.` },
      d.vagas ? { q: `“Quantos candidatos disputam cada vaga deste cargo ${cargoDef.nac ? 'no país' : 'em ' + c.uf}?”`, ok: dec(d.n / d.vagas, 0), erradas: [dec(d.n / d.vagas * 3, 0), dec(Math.max(2, d.n / d.vagas / 3), 0), dec(d.n / d.vagas * 10, 0)], exp: `São ${num(d.n)} candidatos para ${d.vagas} ${d.vagas === 1 ? 'vaga' : 'vagas'}.` } : null,
      { q: '“Que fatia dos eleitos tem ensino superior completo?”', ok: pct(sup.el, 0), erradas: [pct(sup.cand, 0), pct(Math.max(5, sup.el - 40), 0), '100%'], exp: `Entre os candidatos eram ${pct(sup.cand, 0)}; entre os eleitos, ${pct(sup.el, 0)}.` },
      { q: '“Quantos candidatos de 2026 não declararam nenhum bem?”', ok: pct(S.semBens, 0), erradas: [pct(S.semBens / 3, 0), pct(Math.min(90, S.semBens * 2), 0), '1%'], exp: `${pct(S.semBens, 0)} das candidaturas declararam patrimônio zero.` }
    ].filter(Boolean);
    const p = P[(s.q + extra * 3) % P.length], r = rng(s.semente + 11 + extra);
    return Object.assign({}, p, { ops: embaralha([...new Set([p.ok, ...p.erradas])], r) });
  }

  // cartas de dado novas (13 a 16)
  const CARGOS_K = () => CARGOS.map(d => [d.k === 'Deputado Estadual' ? 'Dep. estadual' : d.k === 'Deputado Federal' ? 'Dep. federal' : d.k, J.cargoInfo(d.k).lista]);
  const pctG = (l, t) => l.length ? 100 * l.filter(t).length / l.length : 0;
  const cartaDiploma = () => dado('O diploma pesa?', G.halteres(CARGOS_K().map(([n, l]) => ({ nome: n, cand: pctG(l, c => c.superior), el: pctG(l.filter(c => c.eleito), c => c.superior) }))),
    `<p>Fatia com <b>ensino superior completo</b> entre candidatos e eleitos, por cargo. Entre todos os eleitos são ${pct(S.grupos[4].el, 0)}, contra ${pct(S.grupos[4].cand, 0)} dos candidatos. Equipes de campanha costumam repetir esse perfil.</p>`, 'Tabela cruzada escolaridade × eleito · TSE 2026');
  const cartaIdade = () => { const F = [['até 29', 0, 30], ['30–39', 30, 40], ['40–49', 40, 50], ['50–59', 50, 60], ['60+', 60, 200]], el = J.TODOS.filter(c => c.eleito);
    return dado('A idade de quem se elege', G.halteres(F.map(([n, a, z]) => ({ nome: n + ' anos', cand: pctG(J.TODOS, c => c.idade >= a && c.idade < z), el: pctG(el, c => c.idade >= a && c.idade < z) }))),
      `<p>Distribuição da idade entre candidatos e eleitos. A idade mediana de quem se candidata é ${S.idadeMediana} anos; a de quem se elege é ${J.mediana(el.map(c => c.idade))} anos. Jovens se candidatam, mas pouco se elegem.</p>`, 'Faixas etárias × eleito · TSE 2026'); };
  const cartaVotos = () => { const l = info().lista.filter(c => c.votos != null), md = t => J.mediana(l.filter(t).map(c => c.votos)) || 0;
    return dado('Votos medianos por grupo', G.barras([{ nome: 'Homens', v: md(c => !c.mulher) }, { nome: 'Mulheres', v: md(c => c.mulher), cor: T.roxo }, { nome: 'Brancos', v: md(c => c.raca === 'B') }, { nome: 'Negros', v: md(c => c.raca === 'N'), cor: T.roxo },
      { nome: 'Com mandato', v: md(c => c.mandato), cor: T.laranja }, { nome: 'Sem mandato', v: md(c => !c.mandato) }], { fmt: v => num(v) + ' votos' }),
      `<p>Mediana de votos por grupo (${nomeCargo({ mulher: false })}). Variável quantitativa (votos) cruzada com categorias (gênero, raça, mandato): a mediana resiste aos poucos candidatos com votações enormes.</p>`, 'Categórica × quantitativa · TSE 2026'); };
  const cartaMandato = () => dado('Quem já está dentro', G.halteres(CARGOS_K().map(([n, l]) => ({ nome: n, cand: pctG(l, c => c.mandato), el: pctG(l.filter(c => c.eleito), c => c.mandato) }))),
    `<p>Fatia de quem <b>já tinha mandato</b> entre candidatos e eleitos. Poucos candidatos têm mandato, mas eles ocupam boa parte das cadeiras: no modelo, ter mandato multiplica a chance por ${dec(J.or('C(tem_mandato)[T.Sim]')[0], 1)}.</p>`, 'Tabela cruzada mandato × eleito · TSE 2026');

  function rodadas(c, s) {
    const meu = c.partido, top = J.partidosOrd.find(x => x !== meu) || meu, nanico = J.partidosOrd[J.partidosOrd.length - 1] || meu, tx = J.taxaPartido;
    const dTop = lim(logit(tx(top)) - logit(tx(meu)), 0, 1.2) * 0.5, dNan = lim(logit(tx(nanico)) - logit(tx(meu)), -1.2, 0) * 0.5, tema = (pers && pers.tema) || 'o bairro';
    const cartaPartido = () => { const lista = [...new Set(J.partidosOrd.slice(0, 8).concat(J.partidosOrd.slice(-2)).concat(J.partidosOrd.includes(meu) ? [meu] : []))];
      return dado('Taxa de eleição por partido (deputado federal)', G.barras(lista.map(x => ({ nome: x, v: 100 * tx(x), cor: x === meu ? T.roxo : x === top ? T.laranja : T.base, forte: x === meu, nota: x === meu ? 'seu partido' : '' }))),
        `<p>O partido importa: a taxa vai de ${fmtP(tx(nanico))} a ${fmtP(tx(J.partidosOrd[0]))}. No jogo, metade dessa diferença vira efeito, porque partido grande também traz mais concorrência interna.</p>`, 'Proporção de eleitos entre os candidatos a deputado federal de cada partido com 15 ou mais candidaturas'); };
    const cartaDinheiro = () => GA ? dado('Dinheiro de campanha: quem gasta mais, e o que isso compra', G.barras([{ nome: 'Eleitos', v: GA.mediana_eleitos, cor: T.laranja }, { nome: 'Não eleitos', v: GA.mediana_nao_eleitos },
        { nome: 'Homens', v: GA.mediana_homens }, { nome: 'Mulheres', v: GA.mediana_mulheres, cor: T.roxo }, { nome: 'Brancos', v: GA.mediana_brancos }, { nome: 'Negros', v: GA.mediana_negros, cor: T.roxo }], { fmt: v => reais(v) }),
        `<p>Gastar 10 vezes mais multiplica a chance de se eleger por <b>${dec(GA.or_gasto, 1)}</b>. E o dinheiro não chega igual: por isso, no jogo, homens e brancos começam com mais moedas.</p>`, 'Gasto mediano declarado ao TSE (prestação de contas 2026)')
      : dado('Patrimônio: eleitos × não eleitos', G.barras([{ nome: 'Eleitos', v: S.patMedianaEl, cor: T.laranja }, { nome: 'Não eleitos', v: S.patMedianaNao }], { fmt: v => reais(v) }), `<p>O eleito mediano declarou <b>${dec(S.patMedianaEl / Math.max(1, S.patMedianaNao), 0)} vezes</b> o patrimônio do não eleito.</p>`, 'Patrimônio mediano declarado');
    const cartaPesos = () => dado('Quem já é forte fica mais forte: o que pesa na chance de se eleger', G.pesos(), `<p>Razões de chance da regressão logística, com intervalo de confiança de 95%. <b>Já ter mandato</b> multiplica a chance por ${dec(J.or('C(tem_mandato)[T.Sim]')[0], 1)}, mais do que qualquer outra característica.</p>`, 'Regressão logística · candidatos ao Legislativo, TSE 2026');
    const cartaMW = () => dado('No fim, o dinheiro separa quem entra de quem fica', G.barras([{ nome: 'Eleitos', v: S.patMedianaEl, cor: T.laranja }, { nome: 'Todos', v: S.patMediana }, { nome: 'Não eleitos', v: S.patMedianaNao }], { fmt: v => reais(v) }),
      `<p>O eleito mediano tem <b>${dec(S.patMedianaEl / Math.max(1, S.patMedianaNao), 0)} vezes</b> o patrimônio do não eleito. Como o patrimônio não segue a curva normal, o estudo usou o teste de <b>Mann-Whitney</b>: U = ${num(S.U)}, z = ${dec(S.mwZ, 1)}, p &lt; 0,001. A diferença não é acaso.</p>`, 'Teste de Mann-Whitney · patrimônio de eleitos × não eleitos, todos os cargos');
    const laranjas = () => dado(c.mulher ? 'Candidaturas que só existem no papel' : 'Enquanto isso, na cota de gênero', G.laranjas(),
      `<p>A lei obriga cada partido a lançar pelo menos 30% de mulheres. Muitas recebem quase nenhum voto: ${J.D.laranjas ? `<b>${dec(J.D.laranjas.Feminino.menos_100 / J.D.laranjas.Masculino.menos_100, 1)} vezes</b> mais que os homens ficaram abaixo de 100 votos` : 'veja o dossiê'}. Votação inexpressiva é um dos indícios de candidatura fictícia (TSE, Súmula 73), mas sozinha não prova fraude.</p>`, 'Votos recebidos por gênero · TSE 2026');
    const pesquisa = () => { const l = [c, ...rivais].map(x => ({ nome: x === c ? 'Você' : nomeDe(x), v: 100 * (x === c ? logistica(s.lg) : J.chance(x)) })).sort((a, z) => z.v - a.v);
      return `<div class="pesquisa">${l.map(x => `<div class="${x.nome === 'Você' ? 'voce' : ''}"><span>${esc(x.nome)}</span><i style="width:${Math.max(2, 100 * x.v / l[0].v)}%"></i><b>${dec(x.v, 1)}%</b></div>`).join('')}</div>`; };
    const naFrente = () => logistica(s.lg) >= J.mediana(rivais.map(J.chance));

    const POOL = [
      [ // semana 1: montando a campanha
        { ilu: 'partido', titulo: 'A escolha do partido', texto: `Você está no <b>${esc(meu)}</b>, que elegeu ${fmtP(tx(meu))} dos seus candidatos a deputado federal (uma medida da força do partido). Partido grande tem mais tempo de TV e dinheiro, mas também mais gente disputando.`,
          opcoes: [{ t: `Ficar no ${meu}`, d: 'Nada muda: você já conhece a casa.', custo: 0, ef: () => [0, `Você fica no ${meu}.`] },
                   { t: `Migrar para o ${top}`, d: `Taxa de eleição de ${fmtP(tx(top))}. Custa caro entrar.`, custo: 2, ef: () => [dTop, `O ${top} te aceita, e a estrutura dele ajuda.`] },
                   { t: `Ir para o ${nanico}`, d: `Lá você seria a estrela e ganha +1 de caixa. Taxa de eleição: ${fmtP(tx(nanico))}.`, custo: -1, ef: () => [dNan, `No ${nanico} sobra espaço, mas faltam votos na legenda.`] }], dado: cartaPartido },
        { ilu: 'apoio', titulo: 'Quem vai coordenar a sua campanha?', texto: 'Toda campanha precisa de alguém para organizar agenda, equipe e dinheiro. Quem você chama?',
          opcoes: [{ t: 'Uma amiga de confiança', d: 'Grátis e leal, mas nunca fez campanha.', custo: 0, ef: () => [0.1, 'Ela conhece o bairro como ninguém.'] },
                   { t: 'Um marqueteiro famoso', d: 'Profissional e caro.', custo: 2, ef: () => [0.45, 'Seu material fica com cara de campanha grande.'] },
                   { t: 'Uma liderança comunitária', d: 'Custa 1. Pode abrir muitas portas… ou nenhuma.', custo: 1, ef: s2 => s2.u3 < 0.55 ? [0.4, 'Ela traz associações inteiras para a sua campanha.'] : [0.1, 'O apoio fica restrito ao bairro dela.'] }], dado: cartaDiploma },
        { ilu: 'viral', titulo: 'De onde vem o dinheiro?', texto: 'Antes de sair às ruas, é preciso fechar as contas. Como você financia a campanha?',
          opcoes: [{ t: 'Vaquinha virtual', d: 'Ganha +1 de caixa com pequenas doações de quem acredita em você.', custo: -1, ef: () => [0.1, 'Centenas de pequenas doações: dinheiro e engajamento.'] },
                   { t: 'Doação de um empresário', d: 'Ganha +2 de caixa, mas a notícia pode pegar mal.', custo: -2, ef: s2 => s2.u3 < 0.5 ? [-0.2, 'A doação vira manchete e pega mal.'] : [0, 'Ninguém repara na doação.'] },
                   { t: 'Só o fundo do partido', d: 'Nada muda.', custo: 0, ef: () => [0, 'Você segue com o que o partido mandou.'] }], dado: cartaDinheiro }
      ],
      [ // semana 2: indo para a rua
        { ilu: 'rua', titulo: 'Como chegar no eleitor', texto: `São 45 dias de campanha, e a sua bandeira é <b>${esc(tema)}</b>. Onde você coloca a sua energia (e o seu dinheiro)?`,
          opcoes: [{ t: 'Corpo a corpo nos bairros', d: 'Grátis. Você mesmo(a) vai conquistar eleitores, um por um, em 10 segundos: prepare o dedo!', custo: 0, mini: { campo: 'cliques', titulo: 'Corpo a corpo!', txt: 'Toque nos eleitores para entregar o seu santinho.', tempo: 10, conq: true }, ef: s2 => [Math.min(0.35, 0.02 * s2.cliques), `Você conquistou ${s2.cliques} eleitores no corpo a corpo.`] },
                   { t: 'Impulsionar nas redes', d: `Anúncios sobre ${tema.toLowerCase()} no celular do eleitor.`, custo: 1, ef: () => [0.3, 'Seus vídeos chegam a milhares de pessoas.'] },
                   { t: 'Carreata e santinhos', d: 'A campanha clássica, e a mais cara.', custo: 2, ef: () => [0.45, 'Seu número está em todo poste da cidade.'] }], dado: cartaDinheiro },
        { ilu: 'debate', titulo: 'Gravando o programa na TV', texto: 'Você tem alguns segundos no horário eleitoral. Qual o tom do seu programa?',
          opcoes: [{ t: 'Propostas concretas', d: `Custa 1. Explicar o seu plano para ${tema.toLowerCase()}.`, custo: 1, ef: () => [0.3, 'O programa é claro e passa confiança.'] },
                   { t: 'A sua história de vida', d: 'Custa 1. Emociona… se der certo.', custo: 1, ef: s2 => s2.u3 < 0.5 ? [0.45, 'O vídeo emociona e circula nos grupos.'] : [0.15, 'Bonito, mas pouca gente lembra.'] },
                   { t: 'Atacar um adversário', d: 'Grátis e arriscado.', custo: 0, ef: s2 => s2.u3 < 0.3 ? [0.35, 'O ataque acerta em cheio.'] : [-0.25, 'O ataque volta contra você.'] }], dado: cartaVotos },
        { ilu: 'rua', titulo: 'Panfletagem relâmpago na feira', texto: 'Domingo de manhã, a feira está lotada. Você tem 8 segundos antes de a chuva chegar.',
          opcoes: [{ t: 'Panfletar você mesmo(a)', d: 'Grátis. Toque no máximo de pessoas que conseguir em 8 segundos.', custo: 0, mini: { campo: 'cliques2', titulo: 'Panfletagem!', txt: 'Toque nas pessoas para entregar o panfleto.', tempo: 8 }, ef: s2 => [Math.min(0.3, 0.025 * s2.cliques2), `Você entregou ${s2.cliques2} panfletos.`] },
                   { t: 'Mandar a equipe', d: 'Custa 1. Funciona sem você.', custo: 1, ef: () => [0.2, 'A equipe cobre a feira inteira.'] },
                   { t: 'Ficar em casa', d: 'Descansar também é estratégia?', custo: 0, ef: () => [0, 'Seus adversários ocupam a feira.'] }], dado: cartaIdade }
      ],
      [ // semana 3: alianças
        { ilu: 'apoio', titulo: 'Um apoio de peso', texto: `O apoio de ${cargoDef.apoio} pode levar muitos votos. Mas apoio vai para quem parece que vai ganhar: quanto maior a sua chance agora, maior a chance de topar.`,
          opcoes: [{ t: 'Pedir o apoio', d: 'Custa 1 de caixa para a viagem e a negociação.', custo: 1, ef: s2 => s2.u < Math.min(0.9, 0.12 + 2.5 * logistica(s2.lg)) ? [0.6, 'O apoio vem: vocês sobem juntos no palanque!'] : [0, 'A resposta é “vamos pensar”. Na prática, o apoio vai para outro candidato.'] },
                   { t: 'Seguir sem padrinho', d: 'Você guarda o caixa e a independência.', custo: 0, ef: () => [0, 'Você segue sem padrinho.'] }], dado: cartaPesos },
        { ilu: 'apoio', titulo: 'A associação de moradores quer um compromisso', texto: 'A maior associação de moradores da região oferece apoio, mas pede que você assine uma lista de compromissos.',
          opcoes: [{ t: 'Assinar tudo', d: 'Apoio garantido, menos liberdade.', custo: 0, ef: () => [0.3, 'A associação faz campanha por você.'] },
                   { t: 'Negociar ponto a ponto', d: 'Custa 1 em reuniões. Apoio menor, mas sincero.', custo: 1, ef: () => [0.2, 'Vocês fecham um acordo possível.'] },
                   { t: 'Recusar', d: 'Você não quer amarras.', custo: 0, ef: () => [-0.05, 'A associação apoia outro candidato.'] }], dado: cartaMandato },
        { ilu: 'viral', titulo: 'Saiu a primeira pesquisa', texto: `Uma pesquisa mostra como está a disputa (chances segundo o modelo):${pesquisa()}`,
          opcoes: [{ t: 'Divulgar a pesquisa', d: 'Se você estiver bem, isso atrai votos; se não, afasta.', custo: 0, ef: s2 => naFrente() ? [0.25, 'Quem está na frente atrai o voto útil.'] : [-0.1, 'A pesquisa mostra que você está atrás, e o eleitor percebe.'] },
                   { t: 'Ajustar o discurso', d: 'Custa 1 em pesquisa qualitativa.', custo: 1, ef: () => [0.25, 'Você descobre o que o eleitor quer ouvir.'] },
                   { t: 'Ignorar a pesquisa', d: 'Pesquisa não vota.', custo: 0, ef: () => [0, 'Você segue o plano.'] }], dado: cartaMandato }
      ],
      null,
      [ // semana 5: reta final
        { ilu: 'urna', titulo: 'A reta final', texto: 'Falta uma semana. Quanto do que sobrou no caixa você coloca em propaganda?',
          opcoes: [{ t: 'Investir em rádio e TV', d: 'Arraste para escolher quantas moedas investir: cada uma vira inserções na reta final.', custo: 'slider', ef: (s2, g) => [0.15 * g, g ? `Você investe ${g} moeda(s) na reta final.` : 'Você não investe nada.'] },
                   { t: 'Mutirão de voluntários', d: 'Grátis: amigos e militantes no último fim de semana.', custo: 0, ef: () => [0.2, 'Os voluntários fazem barulho no último fim de semana.'] }], dado: cartaMW },
        { ilu: 'debate', titulo: 'O último debate', texto: 'É o debate mais assistido da campanha. A pergunta vai ser sobre os números desta eleição.',
          opcoes: [{ t: 'Encarar o debate', d: 'Grátis. Acertar a resposta vale muito; errar custa caro.', custo: 0, quiz: Object.assign(perguntaDebate(s, 1), { campo: 'acertou2' }), ef: s2 => s2.acertou2 ? [0.35, 'Você fecha a campanha em alta.'] : [-0.15, 'O erro vira meme na véspera da eleição.'] },
                   { t: 'Mandar uma carta aberta', d: 'Custa 1. Seguro e discreto.', custo: 1, ef: () => [0.15, 'A carta circula entre os eleitores mais atentos.'] },
                   { t: 'Faltar', d: 'Evita o risco.', custo: 0, ef: () => [-0.1, 'Sua cadeira vazia vira assunto.'] }], dado: cartaPesos },
        { ilu: 'urna', titulo: 'A tentação da boca de urna', texto: 'Um cabo eleitoral sugere distribuir santinhos na porta das escolas no dia da eleição. Isso é <b>crime eleitoral</b>.',
          opcoes: [{ t: 'Fazer a boca de urna', d: 'Grátis, ilegal e arriscado.', custo: 0, ef: s2 => s2.u3 < 0.6 ? [-0.6, 'Você é flagrado(a): multa e notícia ruim no dia da eleição.'] : [0.1, 'Ninguém viu… dessa vez. Mas continua sendo crime.'] },
                   { t: 'Carreata final permitida', d: 'Custa 2. Barulho dentro da lei, no sábado.', custo: 2, ef: () => [0.35, 'A carreata fecha a campanha com festa.'] },
                   { t: 'Descansar e votar cedo', d: 'Grátis.', custo: 0, ef: () => [0.05, 'Você chega descansado(a) ao grande dia.'] }], dado: cartaMW }
      ]
    ];
    // ---------- mais cenários (o jogo sorteia 1 por semana) ----------
    POOL[0].push(
      { ilu: 'apoio', titulo: 'Quem vai dividir a chapa com você?', texto: 'Uma boa dobradinha pode puxar votos. Quem você chama para fazer campanha junto?',
        opcoes: [{ t: 'Uma celebridade local', d: 'Custa 1. Todo mundo conhece… mas ninguém sabe se vota.', custo: 1, ef: s2 => s2.u3 < 0.45 ? [0.4, 'A celebridade arrasta multidões.'] : [0.05, 'Muita selfie, poucos votos.'] },
                 { t: 'Um político experiente', d: 'Custa 1. Traz a máquina de quem já tem mandato.', custo: 1, ef: () => [0.3, 'A experiência dele abre portas.'] },
                 { t: 'Alguém novo como você', d: 'Grátis. Energia e pouca estrutura.', custo: 0, ef: () => [0.1, 'Vocês fazem uma dupla animada.'] }], dado: cartaMandato },
      { ilu: 'falsa', titulo: 'Problema no registro da candidatura', texto: 'Falta um documento no seu registro na Justiça Eleitoral. Sem ele, a candidatura pode ser barrada.',
        opcoes: [{ t: 'Contratar advogado eleitoral', d: 'Custa 1. Resolve rápido.', custo: 1, ef: () => [0, 'Tudo resolvido em dois dias.'] },
                 { t: 'Resolver sozinho(a)', d: 'Grátis, mas você pode perder prazos.', custo: 0, ef: s2 => s2.u3 < 0.5 ? [-0.35, 'Você perde uma semana correndo atrás de papel.'] : [0, 'Deu certo, por pouco.'] },
                 { t: 'Pedir ajuda ao partido', d: 'Grátis e lento.', custo: 0, ef: () => [-0.1, 'O partido demora, e você perde dias de campanha.'] }], dado: cartaPesos },
      { ilu: 'partido', titulo: 'O seu plano de governo', texto: 'Todo candidato precisa registrar propostas. Como você monta o seu plano?',
        opcoes: [{ t: 'Com especialistas', d: 'Custa 1. Plano sólido e detalhado.', custo: 1, ef: () => [0.25, 'O plano ganha elogios na imprensa.'] },
                 { t: 'Ouvindo o povo em plenárias', d: 'Grátis. Leva tempo, mas aproxima.', custo: 0, ef: () => [0.15, 'As plenárias lotam.'] },
                 { t: 'Copiar o de outro candidato', d: 'Grátis e arriscado.', custo: 0, ef: s2 => s2.u3 < 0.6 ? [-0.45, 'Descobrem o plágio: vira piada.'] : [0.05, 'Ninguém percebe… por enquanto.'] }], dado: cartaIdade });
    POOL[1].push(
      { ilu: 'viral', titulo: 'Convite para um podcast famoso', texto: 'Um podcast com milhões de ouvintes quer entrevistar você por três horas.',
        opcoes: [{ t: 'Ir ao podcast', d: 'Grátis. Três horas ao vivo: dá para brilhar ou tropeçar.', custo: 0, ef: s2 => s2.u3 < 0.5 ? [0.35, 'Os cortes da entrevista viralizam.'] : [-0.25, 'Uma fala sua vira polêmica.'] },
                 { t: 'Impulsionar um corte curto', d: 'Custa 1. Controlado e seguro.', custo: 1, ef: () => [0.2, 'O vídeo curto circula bem.'] },
                 { t: 'Recusar', d: 'Sem risco, sem palco.', custo: 0, ef: () => [0, 'Outro candidato ocupa o seu lugar.'] }], dado: cartaVotos },
      { ilu: 'apoio', titulo: 'O grande comício', texto: 'A equipe quer um comício para mostrar força. Qual o tamanho?',
        opcoes: [{ t: 'Comício com show', d: 'Custa 2. Praça lotada.', custo: 2, ef: () => [0.4, 'A foto da praça cheia roda o estado.'] },
                 { t: 'Comício simples', d: 'Custa 1. Palco, som e discurso.', custo: 1, ef: () => [0.2, 'Um público fiel aparece.'] },
                 { t: 'Roda de conversa no bairro', d: 'Grátis e próximo.', custo: 0, ef: () => [0.1, 'Pouca gente, muita conversa boa.'] }], dado: cartaDinheiro },
      { ilu: 'viral', titulo: 'A guerra dos grupos de mensagens', texto: 'A campanha acontece nos grupos de mensagens. Como você entra nessa?',
        opcoes: [{ t: 'Criar grupos de apoiadores', d: 'Grátis e trabalhoso.', custo: 0, ef: () => [0.15, 'Os grupos crescem aos poucos.'] },
                 { t: 'Disparo oficial pelo partido', d: 'Custa 1. Dentro da lei.', custo: 1, ef: () => [0.25, 'Sua mensagem chega a milhares de celulares.'] },
                 { t: 'Comprar lista de contatos', d: 'Grátis e proibido pela lei eleitoral.', custo: 0, ef: s2 => s2.u3 < 0.6 ? [-0.5, 'Denúncia e multa: o caso vira notícia.'] : [0.1, 'Passou… mas continua sendo ilegal.'] }], dado: cartaIdade });
    POOL[2].push(
      { ilu: 'viral', titulo: 'Um influenciador quer cachê', texto: 'Um influenciador com 2 milhões de seguidores topa gravar com você, mas cobra.',
        opcoes: [{ t: 'Pagar o cachê', d: 'Custa 2. Alcance garantido (e declarado à Justiça Eleitoral).', custo: 2, ef: () => [0.35, 'O vídeo bate recorde de visualizações.'] },
                 { t: 'Propor parceria de graça', d: 'Grátis. Ele pode topar… ou não.', custo: 0, ef: s2 => s2.u3 < 0.35 ? [0.3, 'Ele gosta da causa e topa!'] : [0, 'Ele recusa educadamente.'] },
                 { t: 'Recusar', d: 'Você prefere a rua às redes.', custo: 0, ef: () => [0, 'Nada muda.'] }], dado: cartaVotos },
      { ilu: 'apoio', titulo: 'Um candidato desistiu e quer te apoiar', texto: 'Um adversário saiu da disputa e oferece o apoio dele, com equipe e eleitores.',
        opcoes: [{ t: 'Aceitar e incorporar a equipe', d: 'Custa 1 para acomodar todo mundo.', custo: 1, ef: () => [0.3, 'A equipe dele reforça a sua campanha.'] },
                 { t: 'Aceitar só o apoio público', d: 'Grátis.', custo: 0, ef: () => [0.15, 'O apoio ajuda um pouco.'] },
                 { t: 'Recusar: ele responde a processos', d: 'Grátis. Você ganha fama de correto(a).', custo: 0, ef: () => [0.05, 'A recusa rende elogios discretos.'] }], dado: cartaPesos },
      { ilu: 'debate', titulo: 'Sabatina no maior jornal', texto: 'Jornalistas vão te entrevistar com perguntas sobre os números desta eleição.',
        opcoes: [{ t: 'Encarar a sabatina', d: 'Grátis. Acertar a resposta vale muito.', custo: 0, quiz: Object.assign(perguntaDebate(s, 2), { campo: 'acertou3' }), ef: s2 => s2.acertou3 ? [0.3, 'Você domina os dados e vira manchete positiva.'] : [-0.15, 'A manchete destaca o seu erro.'] },
                 { t: 'Responder por escrito', d: 'Grátis e morno.', custo: 0, ef: () => [0.05, 'Uma nota discreta no jornal.'] },
                 { t: 'Recusar', d: 'Pega mal com a imprensa.', custo: 0, ef: () => [-0.1, '“Candidato foge da sabatina.”'] }], dado: cartaMandato });
    POOL[4].push(
      { ilu: 'viral', titulo: 'A pesquisa da véspera', texto: `A última pesquisa saiu (chances segundo o modelo):${pesquisa()}`,
        opcoes: [{ t: 'Pedir o voto útil', d: 'Funciona se você estiver bem posicionado(a).', custo: 0, ef: () => naFrente() ? [0.3, 'O eleitor indeciso corre para você.'] : [-0.1, 'Ninguém acredita que você vai ganhar.'] },
                 { t: 'Atacar quem lidera', d: 'Grátis e arriscado.', custo: 0, ef: s2 => s2.u3 < 0.3 ? [0.3, 'O ataque balança o líder.'] : [-0.3, 'O ataque soa desesperado.'] },
                 { t: 'Manter o tom', d: 'Grátis.', custo: 0, ef: () => [0.05, 'Você termina como começou.'] }], dado: cartaMW },
      { ilu: 'rua', titulo: 'A caminhada final', texto: 'Sábado, último dia de campanha na rua. Hora de cumprimentar o máximo de gente.',
        opcoes: [{ t: 'Caminhar você mesmo(a)', d: 'Grátis. Toque nas pessoas em 8 segundos.', custo: 0, mini: { campo: 'cliques3', titulo: 'Caminhada!', txt: 'Toque nas pessoas para cumprimentar.', tempo: 8 }, ef: s2 => [Math.min(0.3, 0.025 * s2.cliques3), `Você cumprimentou ${s2.cliques3} pessoas.`] },
                 { t: 'Carro de som pela cidade', d: 'Custa 1.', custo: 1, ef: () => [0.2, 'O seu jingle toca em todos os bairros.'] },
                 { t: 'Ficar no comitê', d: 'Grátis.', custo: 0, ef: () => [0, 'O comitê fica cheio, a rua fica vazia.'] }], dado: cartaIdade },
      { ilu: 'viral', titulo: 'O último apelo nas redes', texto: 'Faltam 24 horas. Que mensagem você deixa para o eleitor?',
        opcoes: [{ t: 'Vídeo com um apoiador famoso', d: 'Custa 2.', custo: 2, ef: () => [0.4, 'O vídeo é compartilhado sem parar.'] },
                 { t: 'Live de encerramento', d: 'Grátis.', custo: 0, ef: () => [0.15, 'Uma live emocionada com os apoiadores.'] },
                 { t: 'Carta escrita à mão', d: 'Grátis. Pode emocionar.', custo: 0, ef: s2 => s2.u3 < 0.5 ? [0.2, 'A foto da carta comove.'] : [0.05, 'Bonito, mas pouca gente vê.'] }], dado: cartaPesos });
    const quiz = Object.assign(perguntaDebate(s), { campo: 'acertou' });
    const EV = {
      cota: { ilu: 'cota', titulo: 'Imprevisto: “só precisamos do seu nome”', texto: 'O partido precisa cumprir a cota de 30% de mulheres. Ele te inscreveu, mas avisa: o dinheiro do fundo vai para os “puxadores de voto”.',
        opcoes: [{ t: 'Brigar pela sua parte do fundo', d: 'A lei manda dividir o dinheiro. Custa 1 de caixa em advogado.', custo: 1, ef: () => [0.25, 'Você consegue uma parte do fundo. Pouco, mas é seu.'] },
                 { t: 'Fazer campanha assim mesmo', d: 'Sem dinheiro do partido.', custo: 0, ef: () => [-0.2, 'Sem apoio, sua campanha anda devagar.'] },
                 { t: 'Deixar o nome e não fazer campanha', d: 'Vira uma candidatura só no papel.', custo: 0, ef: () => [-1.2, 'Seu nome fica na urna, mas quase ninguém sabe que você existe.'] }], dado: laranjas },
      viral: { ilu: 'viral', titulo: 'Imprevisto: seu vídeo viralizou!', texto: `Um vídeo seu sobre ${esc(tema.toLowerCase())} passou de 1 milhão de visualizações.`,
        opcoes: [{ t: 'Fazer uma live e surfar a onda', d: 'Custa 1 de caixa para a equipe de vídeo.', custo: 1, ef: () => [0.35, 'A live bomba e o seu nome sobe.'] }, { t: 'Seguir o plano', d: 'Deixar o vídeo trabalhar sozinho.', custo: 0, ef: () => [0.15, 'O vídeo ajuda, mas o assunto passa.'] }], dado: laranjas },
      falsa: { ilu: 'falsa', titulo: 'Imprevisto: uma notícia falsa', texto: 'Uma mentira sobre você está circulando nos grupos de mensagens.',
        opcoes: [{ t: 'Advogado e direito de resposta', d: 'Caro, mas resolve.', custo: 2, ef: () => [0, 'A Justiça manda tirar a notícia do ar.'] }, { t: 'Responder nas redes', d: 'Mais barato, mas você entra na briga.', custo: 1, ef: () => [-0.1, 'Você responde, mas a mentira já tinha se espalhado.'] },
                 { t: 'Ignorar', d: 'Torcer para o assunto morrer sozinho.', custo: 0, ef: () => [-0.35, 'A mentira cola em parte do eleitorado.'] }], dado: laranjas },
      debate: { ilu: 'debate', titulo: 'Imprevisto: debate ao vivo na TV', texto: 'Uma emissora chamou os candidatos para um debate. Vai cair pergunta sobre os números desta eleição: você sabe a resposta?',
        opcoes: [{ t: 'Ir, com preparação', d: 'Custa 1 de caixa. Acertando, o ganho é maior; errando, você não perde nada.', custo: 1, quiz, ef: s2 => s2.acertou ? [0.4, 'Resposta certeira: o corte do debate viraliza.'] : [0.1, 'Você erra, mas a preparação segura o resto do debate.'] },
                 { t: 'Ir sem preparação', d: 'Grátis, mas um erro pesa.', custo: 0, quiz, ef: s2 => s2.acertou ? [0.25, 'Você acerta e sai do debate maior do que entrou.'] : [-0.15, 'Você erra e o corte circula.'] },
                 { t: 'Faltar', d: 'Evita o risco.', custo: 0, ef: () => [-0.1, 'Sua cadeira vazia aparece na TV.'] }], dado: laranjas }
    };
    Object.assign(EV, {
      escandalo: { ilu: 'falsa', titulo: 'Imprevisto: um aliado é preso', texto: 'Um aliado seu foi preso numa operação policial. A imprensa quer saber o que você acha.',
        opcoes: [{ t: 'Romper publicamente', d: 'Grátis. Corta o mal pela raiz.', custo: 0, ef: () => [0.05, 'Você se distancia a tempo.'] },
                 { t: 'Ficar em silêncio', d: 'Grátis. O silêncio também fala.', custo: 0, ef: () => [-0.2, 'O silêncio vira suspeita.'] },
                 { t: 'Defender o aliado', d: 'Grátis e perigoso.', custo: 0, ef: () => [-0.4, 'A sua imagem afunda junto.'] }], dado: cartaMandato },
      chuva: { ilu: 'rua', titulo: 'Imprevisto: temporal no dia do comício', texto: 'Uma tempestade cai bem na hora do seu maior evento.',
        opcoes: [{ t: 'Remarcar', d: 'Custa 1 para alugar tudo de novo.', custo: 1, ef: () => [0.1, 'O evento remarcado enche.'] },
                 { t: 'Fazer na chuva', d: 'Grátis. Pode virar lenda… ou fiasco.', custo: 0, ef: s2 => s2.u3 < 0.5 ? [0.3, 'A foto discursando na chuva viraliza.'] : [-0.15, 'Pouca gente aparece e a foto é triste.'] },
                 { t: 'Cancelar', d: 'Grátis.', custo: 0, ef: () => [-0.1, 'Você perde o momento.'] }], dado: cartaDinheiro },
      critica: { ilu: 'viral', titulo: 'Imprevisto: um influenciador te critica', texto: 'Um influenciador gravou um vídeo dizendo que a sua proposta não faz sentido.',
        opcoes: [{ t: 'Responder com números', d: 'Grátis. Funciona se você conhecer bem os dados.', custo: 0, ef: s2 => s2.u3 < 0.5 ? [0.25, 'A resposta com dados vira referência.'] : [-0.1, 'A briga só dá mais audiência a ele.'] },
                 { t: 'Pedir direito de resposta', d: 'Custa 1.', custo: 1, ef: () => [0.05, 'O caso esfria.'] },
                 { t: 'Ignorar', d: 'Grátis.', custo: 0, ef: () => [-0.15, 'O vídeo segue circulando.'] }], dado: cartaVotos }
    });
    return [0, 1, 2, 3, 4].map(w => w === 3 ? (EV[s.evento] || EV.viral) : POOL[w][s.cen[w] % POOL[w].length]);
  }
  const FATOR = 0.7;   // dificuldade: as boas escolhas rendem só 70% do efeito
  const custoDe = (op, s) => op.custo === 'tudo' ? s.caixa : op.custo === 'slider' ? Math.min(s.investir, s.caixa) : op.custo;
  function aplicar(s, op) {
    const custo = custoDe(op, s), [d0, msg] = op.ef(s, custo), delta = d0 > 0 ? d0 * FATOR : d0, antes = logistica(s.lg);
    s.caixa -= custo; s.lg += delta; s.extra += delta; s.hist.push(logistica(s.lg));
    return { delta, msg, antes, depois: logistica(s.lg) };
  }

  function semana() {
    fase(4); rolarTopo();
    const r = rodadas(st.c, st)[st.semana];
    UI.abertura(`Semana ${st.semana + 1} de 5`, r.titulo);
    desenharHud();
    mostrar(`<article class="jg-evento">${ilustracao(r.ilu, r.titulo)}
      <div class="jg-evento-corpo"><p class="jg-chapeu">Fase 5 · A campanha · semana ${st.semana + 1} de 5</p><h3>${r.titulo}</h3><p>${r.texto}</p>
        <div class="jg-opcoes">${r.opcoes.map((op, k) => { const custo = op.custo === 'slider' ? 0 : custoDe(op, st), pode = custo <= st.caixa;
          return `<div class="jg-opcao ${pode ? '' : 'trava'}" data-k="${k}" role="button" tabindex="0" aria-disabled="${!pode}"><kbd>${k + 1}</kbd><b>${esc(op.t)}</b><span>${esc(op.d)}</span>
            ${op.custo === 'slider' ? `<span class="slider" data-slider="1"><input type="range" min="0" max="${st.caixa}" value="${st.caixa}" id="sl-inv" aria-label="Moedas para investir"><output id="sl-out">${st.caixa} moeda(s)</output></span>` : ''}
            <em class="${custo < 0 ? 'ganha' : ''}">${op.custo === 'slider' ? 'você escolhe quanto' : custo > 0 ? `custa ${custo}` : custo < 0 ? `+${-custo} de caixa` : 'grátis'}${pode ? '' : ' · sem caixa'}</em></div>`; }).join('')}</div>
        ${st.dicas > 0 ? `<button type="button" class="usar-dica" id="b-dica"><span class="ud-carta">?</span><span><b>Usar uma carta de dado</b><small>Revela quanto cada escolha mexe na sua chance · você tem ${st.dicas} ${st.dicas === 1 ? 'dica' : 'dicas'}</small></span></button>` : `<p class="sem-dica">Sem dicas nesta semana. Ganhe cartas de dado novas para conseguir mais.</p>`}
        <div id="interacao"></div><div id="consequencia"></div></div></article>`);
    if ($('b-dica')) $('b-dica').onclick = () => { if (document.querySelector('.jg-opcoes.feito')) return; st.dicas--; UI.conquista('dica'); somFim();
      document.querySelectorAll('.jg-opcao').forEach((bt, k) => { const op = r.opcoes[k]; bt.insertAdjacentHTML('beforeend', `<p class="previa">${previa(op)}</p>`); });
      $('b-dica').outerHTML = `<p class="sem-dica">Carta usada: os dados revelaram o efeito de cada escolha.</p>`; desenharHud(); };
    const sl = $('sl-inv'); if (sl) sl.oninput = () => { $('sl-out').textContent = sl.value + ' moeda(s)'; };
    document.querySelectorAll('.jg-opcao').forEach(bt => { const go = e => { if (e && e.target.closest('[data-slider]')) return; if (bt.classList.contains('trava') || document.querySelector('.jg-opcoes.feito')) return; escolher(r, +bt.dataset.k); };
      bt.onclick = go; bt.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; UI.arrastavel(bt, () => go()); });
  }
  // o que a carta de dado revela sobre cada escolha
  function previa(op) {
    const txt = d => { const rel = 100 * (logistica(st.lg + d) / logistica(st.lg) - 1); return Math.abs(rel) < 0.5 ? '= não muda a chance' : (rel > 0 ? '▲ +' : '▼ ') + num(rel) + '% na chance'; };
    if (op.mini) return '? depende de quantas pessoas você alcançar';
    if (op.quiz) return '? depende da sua resposta';
    if (op.custo === 'slider') return 'cada moeda: ' + txt(0.15 * FATOR);
    const s2 = Object.assign({}, st), [d] = op.ef(s2, custoDe(op, s2));
    return txt(d > 0 ? d * FATOR : d);
  }
  function escolher(r, k) {
    const op = r.opcoes[k];
    document.querySelector('.jg-opcoes').classList.add('feito'); somTecla();
    document.querySelectorAll('.jg-opcao').forEach((bt, i) => { bt.classList.toggle('escolhida', i === k); bt.classList.toggle('apagada', i !== k); });
    if (op.custo === 'slider') st.investir = +($('sl-inv') ? $('sl-inv').value : 0);
    const segue = () => concluir(r, k);
    if (op.mini) minigame(segue, op.mini); else if (op.quiz) debate(op.quiz, segue); else segue();
  }
  // minigame: 10 segundos para conquistar eleitores tocando neles
  function minigame(fim, cfg) {
    const area = $('interacao'), T0 = cfg.tempo || 10;
    area.innerHTML = `<div class="mini"><div class="mini-topo"><b>${esc(cfg.titulo)}</b> ${esc(cfg.txt)} <span id="mini-t">${T0},0 s</span><span id="mini-n">0 pessoas</span></div><canvas id="mini-c"></canvas>
      <button type="button" class="jg-botao" id="mini-go">Começar (${T0} segundos)</button></div>`;
    area.scrollIntoView({ behavior: PARADO ? 'auto' : 'smooth', block: 'center' });
    const cv = $('mini-c'), ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    const cor = (pers && pers.cor) || '#a66cff';
    const nova = () => ({ x: 20 + Math.random() * (W - 40), y: 24 + Math.random() * (H - 48), vx: (Math.random() - .5) * 2.6, vy: (Math.random() - .5) * 2.6, ok: false, pulso: 0 });
    const pessoas = Array.from({ length: 22 }, nova);
    let rodando = false, t0 = 0, n = 0, vivo = true;
    function desenha() {
      if (!vivo || !document.body.contains(cv)) return;
      ctx.clearRect(0, 0, W, H);
      pessoas.forEach(p => { if (rodando && !p.ok) { p.x += p.vx; p.y += p.vy; if (p.x < 14 || p.x > W - 14) p.vx *= -1; if (p.y < 18 || p.y > H - 18) p.vy *= -1; }
        ctx.fillStyle = p.ok ? cor : '#8f8a99'; ctx.beginPath(); ctx.arc(p.x, p.y - 8, 8, 0, 7); ctx.fill(); ctx.fillRect(p.x - 9, p.y + 2, 18, 16);
        if (p.pulso > 0) { ctx.strokeStyle = cor; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, 26 - p.pulso, 0, 7); ctx.stroke(); p.pulso -= 1; } });
      if (rodando) { const resta = Math.max(0, T0 - (performance.now() - t0) / 1000); $('mini-t').textContent = dec(resta, 1) + ' s'; if (resta <= 0) { rodando = false; acaba(); } }
      requestAnimationFrame(desenha);
    }
    cv.addEventListener('pointerdown', e => { if (!rodando) return; const b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
      const p = pessoas.find(q => !q.ok && Math.hypot(q.x - x, q.y - y) < 24);
      if (p) { p.ok = true; p.pulso = 18; n++; bip(700 + Math.min(n, 30) * 30, 0, 0.05); $('mini-n').textContent = n + (n === 1 ? ' pessoa' : ' pessoas');
        if (pessoas.every(q => q.ok)) pessoas.forEach((q, i) => pessoas[i] = nova()); } });
    function acaba() { st[cfg.campo] = n; somFim(); if (cfg.conq && n >= 30) UI.conquista('corpo'); $('mini-go').remove(); area.querySelector('.mini-topo').innerHTML = `<b>Tempo!</b> Você alcançou <b>${n}</b> ${n === 1 ? 'pessoa' : 'pessoas'}.`; setTimeout(() => { vivo = false; fim(); }, 700); }
    $('mini-go').onclick = () => { $('mini-go').disabled = true; $('mini-go').textContent = 'Valendo!'; rodando = true; t0 = performance.now(); };
    if (PARADO) { st[cfg.campo] = 8; area.querySelector('.mini-topo').innerHTML = '8 pessoas alcançadas.'; $('mini-go').remove(); setTimeout(fim, 300); return; }
    desenha();
  }
  // debate: pergunta sobre os dados do estudo
  function debate(q, fim) {
    const area = $('interacao');
    area.innerHTML = `<div class="quiz"><p class="jg-chapeu">Ao vivo · pergunta para você</p><h4>${esc(q.q)}</h4><div class="quiz-ops">${q.ops.map((o, i) => `<button type="button" data-i="${i}"><kbd>${'ABCD'[i]}</kbd>${esc(o)}</button>`).join('')}</div><p id="quiz-res"></p></div>`;
    area.scrollIntoView({ behavior: PARADO ? 'auto' : 'smooth', block: 'center' });
    area.querySelectorAll('.quiz-ops button').forEach(b => b.onclick = () => {
      const certo = q.ops[+b.dataset.i] === q.ok; st[q.campo || 'acertou'] = certo; if (certo) UI.conquista('debate'); else UI.treme();
      area.querySelectorAll('.quiz-ops button').forEach(x => { x.disabled = true; if (q.ops[+x.dataset.i] === q.ok) x.classList.add('certo'); });
      if (!certo) b.classList.add('errado');
      certo ? somFim() : bip(220, 0, 0.35);
      $('quiz-res').innerHTML = `<b>${certo ? 'Acertou!' : 'Errou.'}</b> ${esc(q.exp)}`;
      setTimeout(fim, 900);
    });
  }
  function concluir(r, k) {
    st.escolhas.push(k);
    const gasto = custoDe(r.opcoes[k], st), daCarta = document.querySelector('.jg-opcao.escolhida');
    const res = aplicar(st, r.opcoes[k]);
    st.semana++;
    desenharHud(res.antes);
    contar($('jg-num'), res.antes, res.depois); setTimeout(() => moverMedidor(res.depois), 60);
    const alvoCaixa = document.querySelector('.jg-caixa'); if (gasto > 0) UI.moedas(daCarta, alvoCaixa, gasto); if (gasto < 0) UI.moedas(alvoCaixa, alvoCaixa, -gasto);
    if (res.depois < res.antes * 0.97) UI.treme(); const nn = $('jg-num'); if (nn) { nn.classList.remove('pop'); void nn.offsetWidth; nn.classList.add(res.depois >= res.antes ? 'pop' : 'pop', res.depois >= res.antes ? 'sobe' : 'desce'); }
    const rel = 100 * (res.depois / res.antes - 1);
    $('consequencia').innerHTML = `<div class="jg-consequencia"><p class="jg-delta ${rel > 0.5 ? 'sobe' : rel < -0.5 ? 'desce' : ''}">${Math.abs(rel) <= 0.5 ? 'Sua chance não mudou' :
        `${rel > 0 ? '▲ +' : '▼ '}${num(rel)}% na sua chance <small>(de ${fmtP(res.antes)} para ${fmtP(res.depois)})</small>`}</p><p>${esc(res.msg)}</p></div>${r.dado()}
      <button type="button" class="jg-botao principal" id="b-seguir">${st.semana < 5 ? 'Próxima semana →' : 'Ir para o dia da eleição →'}</button>`;
    $('b-seguir').onclick = () => st.semana < 5 ? semana() : eleicao();
    $('consequencia').scrollIntoView({ behavior: PARADO ? 'auto' : 'smooth', block: 'start' });
  }

  // =================================================================
  // 6. DIA DA ELEIÇÃO: você vota na urna e acompanha a apuração
  // =================================================================
  function eleicao() {
    fase(5); rolarTopo(); desenharHud();
    const c = st.c;
    mostrar(`<div class="jg-tela"><p class="jg-chapeu">Fase 6 · Dia da eleição</p><h2>Chegou a hora: vote em você</h2>
      <p class="jg-lead">Digite o seu número, <b>${esc(pers.numero)}</b>, confira a sua foto na tela e aperte <b>CONFIRMA</b>.</p><div id="urna-voto"></div></div>`);
    urna($('urna-voto'), { cabeca: 'SEU VOTO PARA ' + titulo(cargoDef.nome[0]).toUpperCase(), passos: [{ tipo: 'numero', campo: 'voto', titulo: 'Número', digitos: pers.numero.length,
      mostra: d => d === pers.numero ? `<div class="u-cand">${retrato(c, 'jg-foto-rival')}<div><b>${esc(nomeDe(c))}</b><span>${esc(c.partido)}</span></div></div>`
        : `<p class="u-aviso">NÚMERO ERRADO · aperte CORRIGE e digite ${esc(pers.numero)}</p>` }],
      aoFim: r => apuracao(r.voto === pers.numero) });
  }
  function apuracao(votouCerto) {
    rolarTopo(); desenharHud();
    const c = st.c, pF = logistica(st.lg), eleito = Math.random() < pF;
    const todos = [c, ...rivais].map(r => ({ r, p: r === c ? pF : J.chance(r) })), max = Math.max(...todos.map(x => x.p));
    const vP = J.votosPrevistos(c), vFinal = vP != null ? vP * Math.exp(st.extra) : null;
    resultado = { eleito, pF, vFinal, votouCerto };
    mostrar(`<div class="jg-tela jg-apuracao">
      <div class="jg-apu-topo">${ilustracao('urna', 'Urna eletrônica')}<div><p class="jg-chapeu">Fase 6 · A apuração · ${cargoDef.nac ? 'Brasil' : esc(c.uf)}</p><h2>Urnas apuradas: <span id="apu">0%</span></h2>${votouCerto ? '' : '<p class="jg-dica">Você digitou um número errado: o seu próprio voto foi nulo!</p>'}</div></div>
      <div class="jg-corrida">${todos.map(({ r }, i) => `<div class="jg-raia ${r === c ? 'voce' : ''}">${retrato(r, 'jg-foto-rival')}<span>${r === c ? 'Você' : esc(nomeDe(r))}</span><i class="jg-barra larga"><b id="raia-${i}"></b></i><em id="raia-p-${i}"></em></div>`).join('')}</div>
      <div id="veredito" hidden></div></div>`);
    const dur = PARADO ? 0 : 3200, t0 = performance.now(), ruido = todos.map(() => Math.random() * 0.4 + 0.8);
    const passo = t => { if (!$('apu')) return; const k = dur ? Math.min(1, (t - t0) / dur) : 1; $('apu').textContent = Math.round(100 * k) + '%';
      todos.forEach(({ p }, i) => { const v = p * k * (1 + (1 - k) * (ruido[i] - 1)); $('raia-' + i).style.width = (100 * v / max).toFixed(1) + '%'; $('raia-p-' + i).textContent = fmtP(Math.max(0, v)); });
      if (k < 1) requestAnimationFrame(passo); else veredito(todos); };
    requestAnimationFrame(passo);
  }
  function veredito(todos) {
    const c = st.c, { eleito, pF, vFinal } = resultado, v = $('veredito'), inf = info(), d = ufDe(c.uf || '');
    todos.forEach(({ r }, i) => { if (r !== c) $('raia-p-' + i).innerHTML += ` <small class="${r.eleito ? 'real-sim' : ''}">${r.eleito ? 'eleito(a) na vida real' : 'não eleito(a)'}</small>`; });
    eleito ? somFim() : bip(220, 0, 0.5);
    const p0 = st.hist[0], ganho = pF / p0, estrelas = eleito ? 3 : ganho >= 1.5 ? 2 : 1, nota = ganho >= 2 ? 'A' : ganho >= 1.5 ? 'B' : ganho >= 1.1 ? 'C' : 'D';
    UI.conquista('primeira'); UI.cargoJogado(cargoDef.k, CARGOS.length);
    if (eleito) { UI.conquista('eleito'); if (p0 < 0.05) UI.conquista('zebra'); setTimeout(UI.confete, 250); } else UI.treme();
    const B = inf.efVotos;
    const cartaoVotos = inf.ols && vFinal != null ? dado('Quantos votos o seu perfil costuma ter', G.dispersao(doLugar().filter(x => x.votos != null && x !== c), c, vFinal) + `
        <div class="dado-numeros"><div><b>${num(vFinal)}</b><span>seus votos estimados<br>(perfil + campanha)</span></div>${isFinite(d.corte) ? `<div><b>${num(d.corte)}</b><span>votos do eleito com<br>menos votos aqui</span></div>` : ''}
          <div><b>${dec(inf.spearman, 2)}</b><span>Spearman<br>patrimônio × votos</span></div><div><b>${dec(inf.ols.r2, 2)}</b><span>R² da regressão<br>dos votos neste cargo</span></div></div>
        <p>Regressão linear múltipla do log dos votos (${nomeCargo({ mulher: false })}): mantendo o resto igual, já ter mandato multiplica os votos por <b>${dec(B.mandato, 1)}</b>; patrimônio 10× maior, por <b>${dec(B.patrimonio10, 2)}</b>; ser homem, por <b>${dec(B.homem, 2)}</b>; ser negro, por <b>${dec(B.negro, 2)}</b>.${cargoDef.k.startsWith('Deputado') ? ' Na eleição proporcional os votos do partido também contam, por isso não existe um “corte” exato.' : ''}</p>`,
        'Regressão linear múltipla e correlação de Spearman · cada ponto é um candidato (laranja = eleito)')
      : dado('Como foi a votação de verdade', G.barras(inf.lista.filter(x => x.pct != null).sort((a, z) => z.pct - a.pct).slice(0, 10).map(x => ({ nome: titulo(curto(x.nome)), v: x.pct, cor: x.eleito ? T.laranja : x.mulher ? T.roxo : T.base }))),
        '<p>Percentual dos votos válidos no 1º turno. Com tão poucas candidaturas, não dá para ajustar uma regressão só deste cargo: o jogo usa o modelo geral.</p>', 'TSE 2026');
    v.hidden = false;
    v.innerHTML = `<div class="jg-carimbo ${eleito ? 'sim' : 'nao'}">${eleito ? ao(c, 'ELEITO', 'ELEITA') : ao(c, 'NÃO ELEITO', 'NÃO ELEITA')}</div>
      <div class="placar-final"><div class="estrelas-fim" aria-label="${estrelas} de 3 estrelas">${[1, 2, 3].map(i => `<i class="${i <= estrelas ? 'on' : ''}" style="--d:${i * 220}ms">★</i>`).join('')}</div>
        <div class="nota-fim"><small>Nota da campanha</small><b>${nota}</b><span>chance ×${dec(ganho, 1)} desde o início</span></div></div>
      <p class="jg-grande-txt">Com a sua campanha, a chance terminou em <b>${fmtP(pF)}</b>: em 1.000 eleições, você ganharia cerca de <b>${num(1000 * pF)}</b>.</p>
      ${c.ficticio ? '' : `<p class="jg-real">Na vida real, ${esc(titulo(c.nome))} ${c.eleito ? `<b>foi ${ao(c, 'eleito', 'eleita')}</b>` : `<b>não foi ${ao(c, 'eleito', 'eleita')}</b>`}${c.votos != null ? ` com ${num(c.votos)} votos` : ''}${c.pct != null && !cargoDef.k.startsWith('Deputado') ? ` (${pct(c.pct)} dos válidos)` : ''}.</p>`}
      <div class="jg-acoes centro"><button type="button" class="jg-sec" id="b-baixar">Baixar o meu santinho</button><button type="button" class="jg-sec" id="b-denovo-r">Jogar de novo</button></div>
      ${cartaoVotos}<button type="button" class="jg-botao principal" id="b-gemeo">Ver o gêmeo: outra pessoa, a mesma campanha →</button>`;
    $('b-baixar').onclick = baixarSantinho; $('b-denovo-r').onclick = cargo;
    $('b-gemeo').onclick = gemeo;
  }

  // ---------- santinho para baixar (imagem) ----------
  function baixarSantinho() {
    const c = st.c, W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d'), cor = pers.cor, fundoS = { 'Clássico': '#f5f0e6', 'Moderno': '#16141d', 'Retrô': '#f1dfa8' }[pers.estilo] || '#f5f0e6', tinta = pers.estilo === 'Moderno' ? '#f3eee4' : '#16141d';
    x.fillStyle = fundoS; x.fillRect(0, 0, W, H); x.fillStyle = cor; x.fillRect(0, 0, W, 300); x.fillRect(0, H - 120, W, 120);
    const texto = (t, px, py, f, cl, al = 'left') => { x.font = f; x.fillStyle = cl; x.textAlign = al; x.fillText(t, px, py, W - 160); };
    texto('ELEIÇÕES 2026 · QUEM CABE NA CÂMARA?', 80, 110, '700 34px Inter, Arial, sans-serif', '#ffffff');
    texto((ao(c, 'Candidato a ', 'Candidata a ') + nomeCargo(c) + (c.uf ? ' · ' + c.uf : '')).toUpperCase(), 80, 170, '600 30px Inter, Arial, sans-serif', '#ffffff');
    const fecha = () => {
      texto(nomeDe(c), 80, 900, '900 84px Georgia, serif', tinta);
      texto('“' + pers.slogan + '”', 80, 970, 'italic 40px Georgia, serif', pers.estilo === 'Moderno' ? '#cfc6dc' : '#4a4453');
      texto(pers.simbolo + ' ' + pers.numero, 80, 1110, '900 150px Inter, Arial, sans-serif', cor);
      texto(c.partido + ' · bandeira: ' + pers.tema, 600, 1100, '700 36px Inter, Arial, sans-serif', tinta);
      texto(pers.simbolo, W - 140, 250, '900 120px Inter, Arial, sans-serif', '#ffffff');
      texto(`Chance final no jogo: ${fmtP(logistica(st.lg))} · ${resultado && resultado.eleito ? ao(c, 'ELEITO', 'ELEITA') : ao(c, 'NÃO ELEITO', 'NÃO ELEITA')}`, W / 2, H - 50, '700 32px Inter, Arial, sans-serif', '#ffffff', 'center');
      const a = document.createElement('a'); a.download = 'meu-santinho.png'; a.href = cv.toDataURL('image/png'); document.body.appendChild(a); a.click(); a.remove();
    };
    x.fillStyle = '#e8dfcf'; x.fillRect(80, 340, 360, 460);
    const src = c.avatar ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(J.avatarSVG(c.avatar)) : J.fotoDe(c);
    if (src) { const im = new Image(); im.onload = () => { x.drawImage(im, 80, 340, 360, 460); fecha(); }; im.onerror = fecha; im.src = src; }
    else { texto(c.ficticio ? (c.nome.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'EU') : J.iniciais(c.nome), 260, 620, '900 140px Inter, Arial, sans-serif', cor, 'center'); fecha(); }
  }

  // =================================================================
  // 6b. A MESMA CAMPANHA, OUTRO PONTO DE PARTIDA
  // =================================================================
  function gemeo() {
    rolarTopo(); UI.conquista('gemeo');
    const c = st.c, priv = !c.mulher && c.raca === 'B', lista = info().lista, medPat = J.mediana(lista.map(x => x.patrimonio || 0));
    const teste = priv ? (x => x.mulher && x.raca === 'N' && !x.mandato && (x.patrimonio || 0) <= medPat) : (x => !x.mulher && x.raca === 'B' && x.mandato && (x.patrimonio || 0) > medPat);
    const t2 = priv ? (x => x.mulher && x.raca === 'N') : (x => !x.mulher && x.raca === 'B');
    const opc = [doLugar().filter(x => x !== c && teste(x)), lista.filter(x => x !== c && teste(x)), doLugar().filter(x => x !== c && t2(x)), lista.filter(x => x !== c && t2(x)), J.DEP.filter(teste)].find(l => l.length) || J.DEP;
    const g = sorteia(comFoto(opc), rng(st.semente + 3)), outro = novoEstado(g, st.semente);
    Object.assign(outro, { evento: st.evento, cen: st.cen, u3: st.u3, cliques: st.cliques, cliques2: st.cliques2, cliques3: st.cliques3, acertou: st.acertou, acertou2: st.acertou2, acertou3: st.acertou3, investir: st.investir, q: st.q });
    let semCota = '';
    if (st.evento === 'cota' && !g.mulher) { outro.evento = 'debate'; outro.acertou = true; semCota = `${esc(nomeDe(g))} não passou pelo imprevisto da cota: só candidatas passam por isso. `; }
    const notas = [];
    rodadas(g, outro).forEach((r, k) => { let op = r.opcoes[st.escolhas[k]];
      if (op.custo !== 'slider' && custoDe(op, outro) > outro.caixa) { notas.push(`na semana ${k + 1}, não tinha caixa para “${op.t}”`); op = r.opcoes.find(o => custoDe(o, outro) <= outro.caixa); }
      aplicar(outro, op); });
    const pa = st.hist[st.hist.length - 1], pb = outro.hist[outro.hist.length - 1], razao = pa > pb ? pa / pb : pb / pa, rz = dec(razao, razao < 10 ? 1 : 0);
    hud.hidden = true;
    mostrar(`<div class="jg-tela jg-gemeos"><p class="jg-chapeu">As mesmas 5 escolhas. Outro ponto de partida.</p>
      <h2>${pb > pa ? `${esc(nomeDe(g))} fez a sua campanha e terminou com ${rz} vezes a sua chance` : `Você terminou com ${rz} vezes a chance de ${esc(nomeDe(g))}, que fez a mesma campanha`}</h2>
      <div class="jg-duelo"><div class="voce">${retrato(c, 'jg-foto-grande')}<b>${esc(nomeDe(c))}</b><span>${grupo(c)} · ${c.mandato ? 'com mandato' : 'sem mandato'} · ${c.patrimonio ? reais(c.patrimonio) : 'sem bens'}</span><p class="jg-grande">${fmtP(pa)}</p></div>
        <p class="jg-vs">×${rz}</p><div class="outro">${retrato(g, 'jg-foto-grande')}<b>${esc(nomeDe(g))}</b><span>${grupo(g)} · ${g.mandato ? 'com mandato' : 'sem mandato'} · ${g.patrimonio ? reais(g.patrimonio) : 'sem bens'}</span><p class="jg-grande">${fmtP(pb)}</p></div></div>
      <svg id="linhas" viewBox="0 0 720 300" role="img" aria-label="Chance de cada um ao longo das 5 semanas"></svg>
      <p class="jg-frase">${semCota}${notas.length ? `E ${esc(nomeDe(g))} nem sempre pôde seguir o seu plano: ${notas.join('; ')}. ` : ''}Mesmo número de eleitores no corpo a corpo, mesma resposta no debate, mesmas escolhas. A campanha muda alguns pontos; o ponto de partida decide quase tudo.
        É a hipótese deste trabalho: o filtro <b>persiste</b> mesmo quando a campanha é igual.</p>
      <h3>Por que os pontos de partida são tão diferentes?</h3><div class="jg-fatores">${fatores(c, g)}</div>
      <button type="button" class="jg-botao principal" id="b-camara">O que fica desta eleição →</button></div>`);
    linhas(st.hist, outro.hist);
    $('b-camara').onclick = fim;
  }
  function fatores(a, g) {
    const ta = J.termos(a), tg = J.termos(g), pn = esc(nomeDe(g)).split(' ')[0];
    return [['mandato', 'Mandato político', c => c.mandato ? 'tem' : 'não tem'], ['patrimonio', 'Patrimônio', c => c.patrimonio ? reais(c.patrimonio) : 'nenhum'],
      ['genero', 'Gênero', c => c.mulher ? 'mulher' : 'homem'], ['raca', 'Raça', c => c.raca === 'N' ? 'negra' : c.raca === 'B' ? 'branca' : 'outra'], ['superior', 'Ensino superior', c => c.superior ? 'completo' : 'não']]
      .map(([k, n, d]) => { const x = Math.exp(tg[k] - ta[k]), cl = x >= 1.05 ? 'outro' : x <= 0.95 ? 'voce' : '', t = Math.abs(x - 1) < 0.05 ? 'empate' : x > 1 ? `×${dec(x, 1)} para ${pn}` : `×${dec(1 / x, 1)} para você`;
        return `<div class="${cl}"><span>${n}</span><small>você: ${d(a)} · ${pn}: ${d(g)}</small><b>${t}</b></div>`; }).join('');
  }
  function linhas(ha, hb) {
    const svg = $('linhas'), tv = Math.max(...ha, ...hb), passo = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25].find(s => s * 4 >= tv * 1.08) || 0.25, max = passo * 4, X = i => 70 + i * 120, Y = v => 250 - 220 * v / max;
    let h = '';
    for (let k = 0; k <= 4; k++) h += `<line x1="60" x2="690" y1="${Y(max * k / 4)}" y2="${Y(max * k / 4)}" class="grade"/><text x="52" y="${Y(max * k / 4) + 5}" text-anchor="end">${fmtP(max * k / 4)}</text>`;
    ['Início', 'Sem. 1', 'Sem. 2', 'Sem. 3', 'Sem. 4', 'Sem. 5'].forEach((t, i) => h += `<text x="${X(i)}" y="282" text-anchor="middle">${t}</text>`);
    [[ha, 'voce'], [hb, 'outro']].forEach(([hs, cl]) => { h += `<path class="jg-linha ${cl}" pathLength="1" d="${hs.map((v, i) => (i ? 'L' : 'M') + X(i) + ' ' + Y(v).toFixed(1)).join(' ')}"/>`;
      h += hs.map((v, i) => `<circle class="jg-ponto ${cl}" cx="${X(i)}" cy="${Y(v).toFixed(1)}" r="${i === hs.length - 1 ? 7 : 4.5}" style="--d:${i * 180}ms"/>`).join('');
      h += `<text class="jg-rot ${cl}" x="${X(hs.length - 1) + 12}" y="${Y(hs[hs.length - 1]) + 5}">${fmtP(hs[hs.length - 1])}</text>`; });
    svg.innerHTML = h; requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('desenha')));
  }

  // =================================================================
  // 7. A CÂMARA
  // =================================================================
  const TOTAL = 513, FIL = 12, CX = 300, CY = 310, RI = 110, RE = 290;
  const raios = Array.from({ length: FIL }, (_, i) => RI + i * (RE - RI) / (FIL - 1)), somaR = raios.reduce((a, x) => a + x, 0);
  const porFil = raios.map(r => Math.round(TOTAL * r / somaR)); porFil[FIL - 1] += TOTAL - porFil.reduce((a, x) => a + x, 0);
  const CAD = []; raios.forEach((r, f) => { for (let k = 0; k < porFil[f]; k++) { const a = Math.PI - (k / (porFil[f] - 1)) * Math.PI; CAD.push({ x: CX + r * Math.cos(a), y: CY - r * Math.sin(a), a }); } });
  CAD.sort((p, q) => q.a - p.a);
  const rCad = 0.42 * (RE - RI) / (FIL - 1);
  function emCadeiras(pc) { const n = Object.keys(pc), br = n.map(k => TOTAL * pc[k] / 100), it = br.map(Math.floor), falta = TOTAL - it.reduce((a, x) => a + x, 0);
    br.map((x, i) => [x - it[i], i]).sort((a, z) => z[0] - a[0]).slice(0, falta).forEach(([, i]) => it[i]++); return n.map((k, i) => [k, it[i]]); }
  const hemi = id => `<svg id="${id}" viewBox="0 0 600 330" class="hemi" role="img" aria-label="As 513 cadeiras da Câmara dos Deputados">${CAD.map((c, i) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${rCad.toFixed(1)}" data-i="${i}"/>`).join('')}</svg>`;
  function pintar(id, grupos, cores) { const els = document.querySelectorAll(`#${id} circle`); let i = 0;
    grupos.forEach(([g, n]) => { for (let j = 0; j < n && i < els.length; j++) { els[i].style.fill = cores[g]; els[i].dataset.g = g; els[i].style.transitionDelay = (i * 1.5) + 'ms'; i++; } }); }
  const ROT = { Feminino: 'Mulheres', Masculino: 'Homens', Negra: 'Pessoas negras', Branca: 'Pessoas brancas', Outras: 'Indígenas e amarelas' };
  const CORH = { Feminino: '#a66cff', Masculino: '#4a4655', Negra: '#a66cff', Branca: '#4a4655', Outras: '#8f8a99' };
  const CEN = { real: '① A Câmara eleita em 2026', candidatos: '② Sorteada entre os candidatos', sem_filtro: '③ Se o grupo não pesasse no modelo', brasil: '④ Um retrato do Brasil' };
  let dim = 'genero', cen = 'real';
  function camara() {
    fase(6); hud.hidden = true; rolarTopo();
    const H = J.D.hemiciclo, c = st.c, naCamara = c.cargo === 'Deputado Federal' && resultado.eleito;
    mostrar(`<div class="jg-tela"><p class="jg-chapeu">Fase 7 · A Câmara</p>
      <h2>${naCamara ? 'Você conseguiu uma das 513 cadeiras. Veja quem está ao seu lado.' : c.cargo === 'Deputado Federal' ? 'Você ficou de fora. Veja quem conseguiu as 513 cadeiras.' : 'Seja qual for o cargo, a Câmara dos Deputados é o retrato mais claro do filtro.'}</h2>
      ${H ? `<div class="jg-abas" id="abas-dim"><button type="button" data-k="genero" class="ativo">Gênero</button><button type="button" data-k="raca">Raça</button></div>
      <div class="camara-area"><div>${hemi('hemi1')}<p class="hemi-leg" id="hemi-leg"></p></div><div><div class="cenarios" id="cenarios">${Object.entries(CEN).map(([k, t]) => `<button type="button" data-k="${k}" class="${k === cen ? 'ativo' : ''}">${t}</button>`).join('')}</div><p id="cen-txt" class="jg-dica"></p></div></div>` : ''}
      <section class="regras"><p class="jg-chapeu">Agora você muda as regras do jogo</p><h3>Monte a sua Câmara</h3>
        <p>Use o mesmo modelo para tirar (ou diminuir) o peso de cada característica, ou reservar cadeiras. Os candidatos são os reais de 2026; só mudam as regras.</p>
        <div class="sim-atalhos" id="sim-atalhos"></div>
        <div class="sim-grade"><div>${hemi('hemi2')}<div class="sim-leg" id="sim-leg"></div></div>
          <div class="sim-controles">${[['genero', 'Peso de ser homem'], ['raca', 'Peso da raça'], ['patrimonio', 'Peso do patrimônio'], ['mandato', 'Peso de já ter mandato']].map(([k, t]) => `<label>${t} <output id="o-${k}">100%</output><input type="range" id="s-${k}" min="0" max="100" value="100"></label>`).join('')}
            <div class="sim-res"><span>Cadeiras reservadas para mulheres</span><div id="r-m">${[0, .3, .5].map((v, i) => `<button type="button" data-v="${v}" class="${i ? '' : 'ativo'}">${v ? Math.round(v * 100) + '%' : 'nenhuma'}</button>`).join('')}</div></div>
            <div class="sim-res"><span>Cadeiras reservadas para pessoas negras</span><div id="r-n">${[0, .3, .5].map((v, i) => `<button type="button" data-v="${v}" class="${i ? '' : 'ativo'}">${v ? Math.round(v * 100) + '%' : 'nenhuma'}</button>`).join('')}</div></div></div></div>
        <div class="sim-numeros" id="sim-numeros"></div><p class="jg-dica" id="sim-nota"></p></section>
      <button type="button" class="jg-botao principal" id="b-fim">O que fica desta eleição →</button></div>`);
    if (H) {
      const desenha = () => { pintar('hemi1', emCadeiras(H[dim][cen]), CORH);
        const els = [...document.querySelectorAll('#hemi1 circle')]; els.forEach(e => e.classList.remove('minha'));
        if (naCamara) { const ch = dim === 'genero' ? (c.mulher ? 'Feminino' : 'Masculino') : (c.raca === 'N' ? 'Negra' : c.raca === 'B' ? 'Branca' : 'Outras'), m = els.filter(e => e.dataset.g === ch), meu = m[Math.floor(m.length / 2)]; if (meu) meu.classList.add('minha'); }
        $('hemi-leg').innerHTML = emCadeiras(H[dim][cen]).map(([g, n]) => `<span style="--cor:${CORH[g]}">${ROT[g]}: <b>${n}</b></span>`).join('') + (naCamara ? '<span class="leg-voce">a sua cadeira</span>' : '');
        const tx = { real: 'As 513 cadeiras como ficaram depois da eleição.', candidatos: 'Se sorteássemos os deputados entre todos os candidatos: a diferença entre ① e ② é o que a votação mudou.',
          sem_filtro: `Os mesmos candidatos, com o mesmo dinheiro e mandato, mas sem o peso de ${dim === 'genero' ? 'ser mulher' : 'ser uma pessoa negra'} que o modelo encontrou.`, brasil: 'Se a Câmara tivesse a proporção da população (Censo 2022).' };
        $('cen-txt').textContent = tx[cen]; };
      document.querySelectorAll('#abas-dim button').forEach(bt => bt.onclick = () => { dim = bt.dataset.k; document.querySelectorAll('#abas-dim button').forEach(x => x.classList.toggle('ativo', x === bt)); desenha(); });
      document.querySelectorAll('#cenarios button').forEach(bt => bt.onclick = () => { cen = bt.dataset.k; document.querySelectorAll('#cenarios button').forEach(x => x.classList.toggle('ativo', x === bt)); desenha(); });
      desenha();
    }
    simulador(); $('b-fim').onclick = fim;
  }
  function simulador() {
    const porUF = {}, vagas = {};
    J.DEP.forEach(c => { (porUF[c.uf] = porUF[c.uf] || []).push(c); });
    for (const u in porUF) vagas[u] = porUF[u].filter(c => c.eleito).length;
    const b = k => J.M[k] || 0, regra = { genero: 1, raca: 1, patrimonio: 1, mandato: 1, resM: 0, resN: 0 };
    const G4 = [['mn', 'Mulheres negras', '#a66cff'], ['mo', 'Outras mulheres', '#d9c4ff'], ['hn', 'Homens negros', '#8f8a99'], ['ho', 'Outros homens', '#4a4655']], g4 = c => (c.mulher ? 'm' : 'h') + (c.raca === 'N' ? 'n' : 'o');
    function distribuir(peso, k) { let e = peso.slice(); for (let v = 0; v < 20; v++) { const liv = e.map((_, i) => i).filter(i => e[i] < 1), ch = e.length - liv.length, s = liv.reduce((a, i) => a + peso[i], 0); if (!s) break;
      liv.forEach(i => e[i] = (k - ch) * peso[i] / s); if (!e.some(x => x > 1)) break; e = e.map(x => Math.min(x, 1)); } return e.map(x => Math.min(x, 1)); }
    function reservar(e, l, t, alvo, k) { const ng = e.reduce((s, x, i) => s + (t(l[i]) ? x : 0), 0); if (ng >= alvo || !ng) return e; return e.map((x, i) => t(l[i]) ? x * alvo / ng : x * (k - alvo) / (k - ng)); }
    const re = J.DEP.filter(c => c.eleito), em = n => Math.round(513 * n / re.length), real = { m: em(re.filter(c => c.mulher).length), n: em(re.filter(c => c.raca === 'N').length), md: em(re.filter(c => c.mandato).length) };
    let mexeu = false;
    function simular() {
      if (mexeu) UI.conquista('regras'); mexeu = true;
      const soma = { mn: 0, mo: 0, hn: 0, ho: 0 }; let md = 0, faltou = false;
      for (const u in porUF) { const l = porUF[u], k = vagas[u]; if (!k) continue;
        const ch = l.map(c => logistica(b('Intercept') + b('C(cargo)[T.Deputado Federal]') + regra.genero * (c.mulher ? 0 : b('C(genero)[T.Masculino]')) + regra.raca * (c.raca === 'B' ? 0 : b('C(raca)[T.' + (c.raca === 'N' ? 'Negra' : 'Outras') + ']'))
          + (c.superior ? b('C(superior)[T.Sim]') : 0) + regra.mandato * (c.mandato ? b('C(tem_mandato)[T.Sim]') : 0) + regra.patrimonio * b('log_patrimonio') * J.lp(c)));
        let e = distribuir(ch, k);
        for (let v = 0; v < 15; v++) { if (regra.resM) e = reservar(e, l, c => c.mulher, regra.resM * k, k); if (regra.resN) e = reservar(e, l, c => c.raca === 'N', regra.resN * k, k); e = distribuir(e, k); }
        if (regra.resM && e.reduce((s, x, i) => s + (l[i].mulher ? x : 0), 0) < regra.resM * k - 0.5) faltou = true;
        l.forEach((c, i) => { soma[g4(c)] += e[i]; if (c.mandato) md += e[i]; }); }
      const tot = Object.values(soma).reduce((a, x) => a + x, 0), gr = emCadeiras(Object.fromEntries(G4.map(([g]) => [g, 100 * soma[g] / tot]))), n = Object.fromEntries(gr);
      pintar('hemi2', gr, Object.fromEntries(G4.map(([g, , c]) => [g, c])));
      $('sim-leg').innerHTML = G4.map(([g, t, c]) => `<span style="--cor:${c}">${t}: <b>${n[g]}</b></span>`).join('');
      const cx = (t, s, r) => { const d = s - r; return `<div><span>${t}</span><b>${s}</b><small class="${d > 0 ? 'sobe' : d < 0 ? 'desce' : ''}">${d > 0 ? '+' : ''}${d} em relação à real (${r})</small></div>`; };
      $('sim-numeros').innerHTML = cx('Mulheres', n.mn + n.mo, real.m) + cx('Pessoas negras', n.mn + n.hn, real.n) + cx('Já tinham mandato', Math.round(513 * md / tot), real.md);
      $('sim-nota').textContent = (faltou ? 'Em alguns estados não há candidatas suficientes para cumprir a reserva. ' : '') + 'Simulação com o modelo estatístico, não previsão: com tudo em 100% ela reproduz a Câmara real só aproximadamente.';
    }
    ['genero', 'raca', 'patrimonio', 'mandato'].forEach(k => { const s = $('s-' + k); s.oninput = () => { regra[k] = s.value / 100; $('o-' + k).textContent = s.value + '%'; simular(); }; });
    [['r-m', 'resM'], ['r-n', 'resN']].forEach(([id, k]) => document.querySelectorAll(`#${id} button`).forEach(bt => bt.onclick = () => { document.querySelectorAll(`#${id} button`).forEach(x => x.classList.toggle('ativo', x === bt)); regra[k] = +bt.dataset.v; simular(); }));
    const AT = [['Como foi em 2026', [100, 100, 100, 100, 0, 0]], ['Sem desvantagem de gênero e raça', [0, 0, 100, 100, 0, 0]], ['Dinheiro não conta', [100, 100, 0, 100, 0, 0]], ['Paridade', [100, 100, 100, 100, .5, .5]]];
    const cx = $('sim-atalhos'); cx.innerHTML = AT.map(([t], i) => `<button type="button" data-i="${i}" class="${i ? '' : 'ativo'}">${t}</button>`).join('');
    cx.querySelectorAll('button').forEach(bt => bt.onclick = () => { cx.querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === bt)); const v = AT[+bt.dataset.i][1];
      ['genero', 'raca', 'patrimonio', 'mandato'].forEach((k, i) => { $('s-' + k).value = v[i]; $('o-' + k).textContent = v[i] + '%'; regra[k] = v[i] / 100; });
      [['r-m', 'resM', 4], ['r-n', 'resN', 5]].forEach(([id, k, i]) => { regra[k] = v[i]; document.querySelectorAll(`#${id} button`).forEach(x => x.classList.toggle('ativo', +x.dataset.v === v[i])); }); simular(); });
    simular();
  }

  // =================================================================
  // 8. O QUE FICA
  // =================================================================
  function fim() {
    fase(6); hud.hidden = true; rolarTopo();
    const V = J.D.validacao;
    mostrar(`<div class="jg-tela"><p class="jg-chapeu">Fase 7 · O que fica</p><h2>O filtro existe, e ele tem um perfil</h2>
      <p class="jg-lead">Homens brancos eram ${pct(S.grupos[3].cand, 0)} dos candidatos e são ${pct(S.grupos[3].el, 0)} dos eleitos. Mulheres negras eram ${pct(S.grupos[2].cand, 0)} e são ${pct(S.grupos[2].el, 0)}.
        E o jogo mostrou o porquê: com a mesma campanha, o ponto de partida decide quase tudo.</p>
      ${dado('O filtro está diminuindo? Devagar.', G.serie(), '<p>A Câmara está ficando um pouco mais parecida com o Brasil, mas, neste ritmo, ainda levaria décadas para chegar lá.</p>', '2018 e 2022: Agência Câmara · 2026: TSE · população: Censo 2022')}
      ${V ? dado('Por que confiar no modelo do jogo?', `<div class="dado-lado">${G.roc()}<div><p class="dado-grande">AUC ${dec(V.auc, 2)}</p><p>Sorteando um eleito e um não eleito, em <b>${pct(100 * V.auc, 0)}</b> das vezes o modelo dá a maior chance ao eleito (0,5 seria jogar uma moeda).</p></div></div>`, 'Curva ROC da regressão logística') : ''}
      <div class="limites"><h3>O que este jogo não sabe</h3><ul>
        <li><b>Associação não é causa:</b> o modelo não sabe de coligação, campanha real nem tempo de TV.</li>
        <li><b>Autodeclaração:</b> raça e patrimônio são o que cada candidato informou ao TSE; ${pct(S.semBens, 0)} não declararam bens.</li>
        <li><b>Mandato aproximado</b> pela ocupação declarada; vices e suplentes não entram.</li>
        <li><b>Governador e Presidente</b> não entraram no modelo: o jogo usa os mesmos pesos, com o nível ajustado à taxa real de eleição de cada cargo.</li>
        <li><b>As semanas são regras de jogo:</b> só o ponto de partida, o efeito do partido, o caixa e as perguntas do debate vêm diretamente dos dados.</li></ul></div>
      <div class="jg-acoes"><button type="button" class="jg-botao principal" id="b-denovo">Jogar de novo</button><button type="button" class="jg-sec" id="b-baixar2">Baixar o meu santinho</button>
        <a class="jg-sec" href="dossie.html#ato5">Ver a Câmara e mudar as regras →</a><a class="jg-sec" href="dossie.html">Saber mais sobre o estudo →</a></div>
      <p class="creditos">Projeto A2 · Métodos Estatísticos Aplicados às Ciências Sociais · Carolina Carpenter · 2026<br>Dados: TSE (candidaturas, bens, votação, fotos e prestação de contas de 2026) e IBGE (Censo 2022).</p></div>`);
    $('b-denovo').onclick = cargo; $('b-baixar2').onclick = baixarSantinho;
  }

  // ---------- teclado: → avança, 1 2 3 escolhem, A B C D respondem; na urna, os números vão para a urna ----------
  document.addEventListener('keydown', e => {
    if (UI.aberto() || document.querySelector('.cortina')) return;
    if (teclado && teclado(e)) { e.preventDefault(); return; }
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (/^[1-3]$/.test(e.key)) { const op = document.querySelectorAll('.jg-opcoes:not(.feito) .jg-opcao:not(.trava)')[+e.key - 1]; if (op) op.click(); }
    if (/^[a-dA-D]$/.test(e.key)) { const b = document.querySelectorAll('.quiz-ops button:not(:disabled)')['abcd'.indexOf(e.key.toLowerCase())]; if (b) b.click(); }
    if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.target === document.body)) { const bt = [...document.querySelectorAll('.jg-botao.principal')].filter(x => !x.disabled).pop(); if (bt) { e.preventDefault(); bt.click(); } }
  });

  // ---------- fotos: carregam depois da página ----------
  window.addEventListener('load', () => setTimeout(() => {
    ['fotos.js?v=7', 'fotos_jogo.js?v=1', 'fotos/numeros.js?v=1'].forEach(src => { const s = document.createElement('script'); s.src = src; s.onload = () => { if (st && !hud.hidden) desenharHud(); }; document.body.appendChild(s); });
  }, 400));

  const botaoMenu = document.createElement('button');
  botaoMenu.className = 'botao-menu'; botaoMenu.type = 'button'; botaoMenu.innerHTML = '<i></i><i></i><i></i><span>MENU</span>'; botaoMenu.setAttribute('aria-label', 'Menu');
  botaoMenu.onclick = () => UI.menu({ reiniciar: capa });
  document.body.appendChild(botaoMenu);
  UI.aoGanharCarta(() => { if (st && st.semana < 5) { st.dicas++; const h = document.querySelector('.hud-dicas'); if (h) h.textContent = st.dicas + (st.dicas === 1 ? ' dica' : ' dicas'); } });
  UI.cenario();
  capa();
})();
