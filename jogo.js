// =====================================================================
// Quem cabe na Câmara? – O JOGO (telas)
// Fases: capa → a peneira → seu estado → seu perfil → 5 semanas de campanha → apuração
//        → a mesma campanha com outro perfil → a Câmara (e as regras do jogo) → o que fica
// Cada fase mostra "o dado por trás": um resultado da Parte 1, recalculado em jogo-dados.js.
// =====================================================================
(function jogo() {
  const { S, G, T, UF, esc, fmtP, pct, dec, num, reais, retrato, corGrupo, lim, logit, logistica } = J;
  const tela = document.getElementById('tela'), hud = document.getElementById('hud'), topo = document.getElementById('fases');
  const PARADO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!J.DEP.length) { tela.innerHTML = '<div class="jg-cartao"><h2>Faltam dados</h2><p>O jogo precisa do dados.js com a lista de todos os candidatos (célula D.15).</p></div>'; return; }

  const ao = (c, m, f) => c.mulher ? f : m;
  const curto = n => { const p = n.split(' '); return p.length > 2 ? p[0] + ' ' + p[p.length - 1] : n; };
  const titulo = n => n.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, l) => a + l.toUpperCase()).replace(/ (Da|De|Do|Das|Dos|E) /g, s => s.toLowerCase());
  const nomeDe = c => c.ficticio ? 'Você' : titulo(curto(c.nome));
  const RACA = { B: 'branca', N: 'negra (preta ou parda)', O: 'amarela ou indígena' };
  const grupo = c => (c.mulher ? 'Mulher ' : 'Homem ') + (c.raca === 'N' ? (c.mulher ? 'negra' : 'negro') : c.raca === 'B' ? (c.mulher ? 'branca' : 'branco') : (c.mulher ? 'amarela/indígena' : 'amarelo/indígena'));
  const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const sorteia = (l, r = Math.random) => l[Math.floor(r() * l.length)];
  const temFoto = c => !!J.fotoDe(c);
  const comFoto = l => { const f = l.filter(temFoto); return f.length >= Math.min(5, l.length) ? f : l; };
  const rolarTopo = () => window.scrollTo({ top: 0, behavior: PARADO ? 'auto' : 'smooth' });

  // ---------- trilha de fases (topo) ----------
  const FASES = ['A peneira', 'Seu estado', 'Seu perfil', 'A campanha', 'A apuração', 'A Câmara', 'O que fica'];
  function fase(k) {
    topo.hidden = k < 0;
    topo.innerHTML = FASES.map((f, i) => `<li class="${i < k ? 'feito' : i === k ? 'agora' : ''}"><i></i><span>${f}</span></li>`).join('');
    document.body.dataset.fase = k;
  }
  // cartão "o dado por trás disso"
  const dado = (titulo, corpo, fonte) => `<aside class="dado"><p class="dado-chapeu">O dado por trás disso · Parte 1</p><h4>${titulo}</h4>${corpo}${fonte ? `<p class="dado-fonte">${fonte}</p>` : ''}</aside>`;
  function mostrar(html) { tela.innerHTML = `<div class="tela-entra">${html}</div>`; }

  // =================================================================
  // 0. CAPA
  // =================================================================
  function capa() {
    fase(-1); hud.hidden = true;
    mostrar(`
      <section class="capa-jogo">
        <canvas id="chuva" aria-hidden="true"></canvas>
        <div class="capa-txt">
          <p class="jg-chapeu">Eleições 2026 · um jogo com dados reais do TSE</p>
          <h1>Quem cabe na Câmara?</h1>
          <p class="capa-sub">Em 2026, <b>${num(S.n)}</b> pessoas pediram o seu voto. Só <b>${num(S.nEl)}</b> ganharam uma cadeira.
            Entre na disputa com um candidato de verdade e descubra se dá para vencer a peneira.</p>
          <div class="capa-numeros"><div><b>${num(S.n)}</b><span>candidaturas</span></div><div><b>${num(S.nEl)}</b><span>eleitos</span></div>
            <div><b>1 em ${Math.round(S.n / S.nEl)}</b><span>chegou lá</span></div></div>
          <button type="button" class="jg-botao principal" id="b-jogar">Começar o jogo ▶</button>
          <p class="capa-links"><a href="dossie.html">Prefere só os gráficos? Abra o dossiê completo →</a></p>
        </div>
      </section>`);
    chuva();
    document.getElementById('b-jogar').onclick = peneira;
  }
  function chuva() {
    const cv = document.getElementById('chuva'); if (!cv) return;
    const ctx = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.scale(dpr, dpr);
    const n = Math.round(S.n / 10), el = Math.round(S.nEl / 10);
    const p = Array.from({ length: n }, (_, i) => ({ x: Math.random() * W, y: Math.random() * H, v: 0.3 + Math.random() * 1.1, e: i < el }));
    const passo = () => {
      if (!document.body.contains(cv)) return;
      ctx.clearRect(0, 0, W, H);
      p.forEach(d => { d.y += PARADO ? 0 : d.v; if (d.y > H) d.y = -4;
        ctx.fillStyle = d.e ? '#e2620f' : 'rgba(203,196,182,.28)'; ctx.beginPath(); ctx.arc(d.x, d.y, d.e ? 2.6 : 1.8, 0, 7); ctx.fill(); });
      if (!PARADO) requestAnimationFrame(passo);
    };
    passo();
  }

  // =================================================================
  // 1. A PENEIRA (bivariada categórica × categórica)
  // =================================================================
  function peneira() {
    fase(0); hud.hidden = true; rolarTopo();
    mostrar(`
      <div class="jg-tela">
        <p class="jg-chapeu">Fase 1 · A peneira</p>
        <h2>Antes de entrar no jogo, veja quem passou pela peneira em 2026</h2>
        <p class="jg-lead">O ponto cinza é a fatia de cada grupo entre os <b>candidatos</b>. O ponto colorido é a fatia entre os <b>eleitos</b>.
          Homens brancos eram ${pct(S.grupos[3].cand, 0)} de quem tentou e viraram ${pct(S.grupos[3].el, 0)} de quem entrou.</p>
        ${dado('Candidatos → eleitos, todos os cargos', G.halteres(S.grupos) + `
          <div class="dado-numeros"><div><b>${dec(S.vGenero, 3)}</b><span>V de Cramér<br>gênero × eleito</span></div>
          <div><b>${dec(S.vRaca, 3)}</b><span>V de Cramér<br>raça × eleito</span></div><div><b>${dec(S.vSuperior, 3)}</b><span>V de Cramér<br>ensino superior × eleito</span></div></div>
          <p>Cada associação, sozinha, é fraca (V perto de 0,1). Mas elas se <b>somam</b>: é isso que o jogo vai te fazer sentir.</p>`,
          `Tabelas cruzadas e V de Cramér · ${num(S.n)} candidaturas, TSE 2026`)}
        <blockquote class="hipotese">“A eleição de 2026 filtrou o Brasil: os eleitos são mais masculinos, mais brancos, mais escolarizados e muito mais ricos
          do que quem se candidatou, e esse filtro persiste mesmo entre candidatos com o mesmo cargo e o mesmo patrimônio.”<cite>A hipótese deste jogo</cite></blockquote>
        <button type="button" class="jg-botao principal" id="b-seguir">Escolher meu estado →</button>
      </div>`);
    document.getElementById('b-seguir').onclick = estado;
  }

  // =================================================================
  // 2. SEU ESTADO (o mapa do filtro)
  // =================================================================
  const POS = { RR: [1, 0], AP: [3, 0], AM: [1, 1], PA: [2, 1], MA: [3, 1], CE: [4, 1], RN: [5, 1], AC: [0, 2], RO: [1, 2], TO: [2, 2], PI: [3, 2], PE: [4, 2], PB: [5, 2],
    MT: [1, 3], GO: [2, 3], BA: [3, 3], SE: [4, 3], AL: [5, 3], MS: [1, 4], DF: [2, 4], MG: [3, 4], ES: [4, 4], PR: [2, 5], SP: [3, 5], RJ: [4, 5], SC: [2, 6], RS: [2, 7] };
  let ufEscolhida = null, modoMapa = 'dificil';
  function estado() {
    fase(1); hud.hidden = true; rolarTopo();
    mostrar(`
      <div class="jg-tela">
        <p class="jg-chapeu">Fase 2 · Seu estado</p>
        <h2>Onde você vai disputar uma vaga de deputado federal?</h2>
        <p class="jg-lead">Cada estado tem um número fixo de cadeiras. Quanto mais gente disputando cada uma, mais difícil. E o filtro de gênero e raça tem força diferente em cada lugar.</p>
        <div class="mapa-area">
          <div><div class="jg-abas" id="abas-mapa">${[['dificil', 'Candidatos por vaga'], ['mulheres', 'Filtro de gênero'], ['negras', 'Filtro de raça']].map(([k, t]) => `<button type="button" data-k="${k}" class="${k === modoMapa ? 'ativo' : ''}">${t}</button>`).join('')}</div>
            <svg id="mapa" viewBox="0 0 400 520" role="img" aria-label="Mapa do Brasil em quadrados, um por estado"></svg><p class="mapa-leg" id="mapa-leg"></p></div>
          <div class="uf-painel" id="uf-painel"><p class="jg-dica">Toque em um estado para ver como é a disputa lá.</p></div>
        </div>
        <div class="jg-acoes"><button type="button" class="jg-botao principal" id="b-uf" disabled>Escolha um estado</button>
          <button type="button" class="jg-sec" id="b-uf-sorte">Sortear um estado</button></div>
      </div>`);
    desenharMapa();
    document.querySelectorAll('#abas-mapa button').forEach(bt => bt.onclick = () => { modoMapa = bt.dataset.k;
      document.querySelectorAll('#abas-mapa button').forEach(x => x.classList.toggle('ativo', x === bt)); desenharMapa(); });
    document.getElementById('b-uf-sorte').onclick = () => escolherUF(sorteia(Object.keys(UF).filter(u => POS[u] && UF[u].vagas)));
    document.getElementById('b-uf').onclick = () => ufEscolhida && perfil();
    if (ufEscolhida) escolherUF(ufEscolhida);
  }
  const valorUF = u => {
    if (modoMapa === 'dificil') return UF[u] && UF[u].vagas ? UF[u].n / UF[u].vagas : null;
    const d = J.D.ufs && J.D.ufs[u]; return d ? d[modoMapa][0] - d[modoMapa][1] : null;
  };
  function desenharMapa() {
    const svg = document.getElementById('mapa'); if (!svg) return;
    const vals = Object.keys(POS).map(valorUF).filter(v => v != null), mx = Math.max(...vals), mn = Math.min(...vals);
    const cor = v => { if (v == null) return '#2e2b38'; const k = (v - mn) / (mx - mn || 1);
      const a = [58, 52, 72], z = modoMapa === 'dificil' ? [226, 98, 15] : [166, 108, 255]; return `rgb(${a.map((x, i) => Math.round(x + (z[i] - x) * k)).join(',')})`; };
    svg.innerHTML = Object.entries(POS).map(([u, [x, y]]) => { const v = valorUF(u);
      return `<g class="uf ${u === ufEscolhida ? 'sel' : ''}" data-uf="${u}" tabindex="0" role="button" aria-label="${u}"><rect x="${x * 64 + 6}" y="${y * 64 + 6}" width="58" height="58" rx="10" fill="${cor(v)}"/>
        <text x="${x * 64 + 35}" y="${y * 64 + 34}" text-anchor="middle" class="uf-sigla">${u}</text>
        <text x="${x * 64 + 35}" y="${y * 64 + 52}" text-anchor="middle" class="uf-val">${v == null ? '' : modoMapa === 'dificil' ? dec(v, 0) + '/vaga' : (v > 0 ? '−' : '+') + dec(Math.abs(v), 0)}</text></g>`; }).join('');
    svg.querySelectorAll('.uf').forEach(g => { g.onclick = () => escolherUF(g.dataset.uf); g.onkeydown = e => { if (e.key === 'Enter') escolherUF(g.dataset.uf); }; });
    document.getElementById('mapa-leg').textContent = modoMapa === 'dificil' ? 'Candidatos a deputado federal por vaga (quanto mais laranja, mais concorrido).'
      : `Pontos percentuais que ${modoMapa === 'mulheres' ? 'as mulheres' : 'as pessoas negras'} perdem entre candidatos e eleitos (quanto mais roxo, mais forte o filtro).`;
  }
  function escolherUF(u) {
    ufEscolhida = u; desenharMapa();
    const d = UF[u] || {}, f = J.D.ufs && J.D.ufs[u];
    document.getElementById('uf-painel').innerHTML = `
      <h3>${u}</h3><p class="uf-grande">${d.vagas ? `1 vaga para cada <b>${dec(d.n / d.vagas, 0)}</b> candidatos` : 'Sem dados'}</p>
      <ul class="uf-lista"><li><span>Candidatos a deputado federal</span><b>${num(d.n || 0)}</b></li><li><span>Cadeiras na Câmara</span><b>${d.vagas || 0}</b></li>
        ${d.corte && isFinite(d.corte) ? `<li><span>Eleito com menos votos</span><b>${num(d.corte)} votos</b></li>` : ''}
        ${f ? `<li><span>Mulheres: candidatas → eleitas</span><b>${pct(f.mulheres[0], 0)} → ${pct(f.mulheres[1], 0)}</b></li><li><span>Pessoas negras: candidatas → eleitas</span><b>${pct(f.negras[0], 0)} → ${pct(f.negras[1], 0)}</b></li>` : ''}</ul>
      ${f && f.n_el < 30 ? '<p class="jg-dica">Poucos eleitos: os percentuais deste estado variam muito.</p>' : ''}`;
    const bt = document.getElementById('b-uf'); bt.disabled = false; bt.textContent = `Disputar por ${u} →`;
  }

  // =================================================================
  // 3. SEU PERFIL: sortear um candidato real ou jogar como você
  // =================================================================
  const FILTROS = [['Qualquer perfil', () => true], ['Mulher negra', c => c.mulher && c.raca === 'N'], ['Mulher branca', c => c.mulher && c.raca === 'B'],
    ['Homem negro', c => !c.mulher && c.raca === 'N'], ['Homem branco', c => !c.mulher && c.raca === 'B'], ['Já tem mandato', c => c.mandato]];
  let filtro = 0;
  const daUF = () => J.DEP.filter(c => c.uf === ufEscolhida);
  function perfil() {
    fase(2); hud.hidden = true; rolarTopo();
    const amostra = comFoto(daUF()).slice().sort(() => Math.random() - .5).slice(0, 15);
    mostrar(`
      <div class="jg-tela">
        <p class="jg-chapeu">Fase 3 · Seu perfil · ${ufEscolhida}</p>
        <h2>Quem você vai ser nesta eleição?</h2>
        <div class="perfil-grade">
          <div class="perfil-opcao">
            <div class="jg-mosaico" aria-hidden="true">${amostra.map((c, k) => `<div style="--k:${k}">${retrato(c)}</div>`).join('')}</div>
            <h3>Um candidato de verdade</h3><p>Sorteamos alguém que disputou em ${ufEscolhida} em 2026. No fim, você descobre o que aconteceu com essa pessoa.</p>
            <div class="jg-filtros">${FILTROS.map(([n], k) => `<button type="button" data-k="${k}" class="${k === filtro ? 'ativo' : ''}">${n}</button>`).join('')}</div>
            <button type="button" class="jg-botao principal" id="b-sortear">Sortear meu candidato</button>
          </div>
          <form class="perfil-opcao" id="form-eu">
            <h3>Você mesmo(a)</h3><p>Crie um candidato com o seu perfil. O modelo calcula a sua chance do mesmo jeito.</p>
            ${campo('genero', 'Gênero', [['F', 'Mulher'], ['M', 'Homem']])}
            ${campo('raca', 'Cor ou raça', [['N', 'Preta ou parda'], ['B', 'Branca'], ['O', 'Amarela ou indígena']])}
            ${campo('superior', 'Ensino superior completo?', [['1', 'Sim'], ['0', 'Não']])}
            ${campo('pat', 'Patrimônio', [['0', 'Nenhum'], ['30000', 'Até R$ 100 mil'], ['300000', 'R$ 100 mil a 1 mi'], ['3000000', 'R$ 1 a 10 mi'], ['20000000', 'Mais de R$ 10 mi']])}
            ${campo('mandato', 'Já teve mandato político?', [['0', 'Não'], ['1', 'Sim']])}
            <button type="submit" class="jg-botao">Jogar com este perfil</button>
          </form>
        </div>
      </div>`);
    document.querySelectorAll('.jg-filtros button').forEach(bt => bt.onclick = () => { filtro = +bt.dataset.k;
      document.querySelectorAll('.jg-filtros button').forEach(x => x.classList.toggle('ativo', x === bt)); });
    document.querySelectorAll('.campo').forEach(cp => cp.querySelectorAll('button').forEach(bt => bt.onclick = () => {
      cp.querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === bt)); cp.dataset.v = bt.dataset.v; }));
    document.getElementById('b-sortear').onclick = sortear;
    document.getElementById('form-eu').onsubmit = e => { e.preventDefault();
      const v = k => document.querySelector(`.campo[data-k="${k}"]`).dataset.v;
      ficha({ ficticio: true, nome: 'Você', cargo: 'Deputado Federal', uf: ufEscolhida, partido: sorteia(J.partidosOrd.slice(4, 14).length ? J.partidosOrd.slice(4, 14) : J.partidosOrd),
        mulher: v('genero') === 'F', raca: v('raca'), superior: v('superior') === '1', patrimonio: +v('pat'), mandato: v('mandato') === '1', idade: null, eleito: false, votos: null }); };
  }
  const campo = (k, rot, ops) => `<div class="campo" data-k="${k}" data-v="${ops[0][0]}"><span>${rot}</span><div>${ops.map(([v, t], i) => `<button type="button" data-v="${v}" class="${i ? '' : 'ativo'}">${t}</button>`).join('')}</div></div>`;
  function sortear() {
    // sorteio honesto: decide se a pessoa foi eleita na proporção real do grupo, depois escolhe (de preferência com foto)
    let grupoTodo = daUF().filter(FILTROS[filtro][1]); if (!grupoTodo.length) grupoTodo = J.DEP.filter(FILTROS[filtro][1]);
    const ganhou = Math.random() < grupoTodo.filter(c => c.eleito).length / grupoTodo.length;
    const mesmos = grupoTodo.filter(c => c.eleito === ganhou);
    const escolhido = sorteia(comFoto(mesmos.length ? mesmos : grupoTodo)), pool = comFoto(grupoTodo);
    mostrar(`<div class="jg-roleta"><div class="jg-roleta-janela" id="rol">${retrato(sorteia(pool))}</div><p>Sorteando entre ${num(grupoTodo.length)} candidaturas…</p></div>`);
    const jan = document.getElementById('rol'); let n = 0, espera = 50;
    const gira = () => { n++; jan.innerHTML = retrato(n > 16 ? escolhido : sorteia(pool));
      if (n <= 16) { espera *= 1.13; setTimeout(gira, espera); } else setTimeout(() => ficha(escolhido), 600); };
    PARADO ? ficha(escolhido) : gira();
  }

  // ---------- caixa e estado da campanha ----------
  const GA = J.D.gastos;
  const bonusH = GA && GA.mediana_mulheres ? lim(Math.round(Math.log2(GA.mediana_homens / GA.mediana_mulheres)), 0, 2) : 1;
  const bonusB = GA && GA.mediana_negros ? lim(Math.round(Math.log2(GA.mediana_brancos / GA.mediana_negros)), 0, 2) : 1;
  function caixaInicial(c) {
    const it = [['Fundo do partido', 3]];
    if (c.mandato) it.push(['Estrutura de quem já tem mandato', 3]);
    if (c.patrimonio >= 1e6) it.push(['Patrimônio acima de R$ 1 milhão', 2]); else if (c.patrimonio >= 1e5) it.push(['Patrimônio acima de R$ 100 mil', 1]);
    if (!c.mulher && bonusH) it.push(['Ser homem: eles arrecadam mais', bonusH]);
    if (c.raca === 'B' && bonusB) it.push(['Ser branco(a): arrecadam mais', bonusB]);
    return it;
  }
  function novoEstado(c, semente) {
    const r = rng(semente), it = caixaInicial(c), lg = J.base(c);
    const ev = c.mulher && r() < 0.6 ? 'cota' : ['viral', 'falsa', 'debate'][Math.floor(r() * 3)];
    return { c, semente, itens: it, caixa: it.reduce((s, x) => s + x[1], 0), lg, extra: 0, hist: [logistica(lg)], u: r(), u2: r(), evento: ev, escolhas: [], semana: 0 };
  }
  let st = null, rivais = [];

  // =================================================================
  // 3b. A FICHA (univariada: você no meio dos 18.842)
  // =================================================================
  function ficha(c) {
    st = novoEstado(c, Math.floor(Math.random() * 1e9));
    const r = rng(st.semente + 7), outros = daUF().filter(x => x !== c);
    rivais = [];
    for (const l of [comFoto(outros.filter(x => x.eleito)), comFoto(outros.filter(x => x.eleito)), comFoto(outros.filter(x => !x.eleito)), comFoto(outros.filter(x => !x.eleito))]) {
      const cand = l.filter(x => !rivais.includes(x)); if (cand.length) rivais.push(sorteia(cand, r)); }
    rivais.sort((a, z) => J.base(z) - J.base(a));
    rolarTopo(); desenharHud();
    const bins = [0, 1, 1e4, 5e4, 1e5, 3e5, 1e6, 3e6, 1e7, 1e12];
    const rot = ['nenhum', 'até 10 mil', '10–50 mil', '50–100 mil', '100–300 mil', '300 mil–1 mi', '1–3 mi', '3–10 mi', '10 mi+'];
    mostrar(`
      <div class="jg-tela">
        <div class="jg-ficha">
          <div class="jg-santinho">${retrato(c, 'jg-foto-grande')}<div>
            <p class="jg-chapeu">Você é</p><h3>${c.ficticio ? 'Você' : esc(titulo(c.nome))}</h3>
            <p class="jg-sub">${esc(c.partido)} · ${ao(c, 'candidato a deputado', 'candidata a deputada')} federal por ${esc(c.uf)}</p>
            <dl><div><dt>Perfil</dt><dd>${c.mulher ? 'Mulher' : 'Homem'}, ${RACA[c.raca] || '—'}${c.idade ? ', ' + c.idade + ' anos' : ''}</dd></div>
              <div><dt>Escolaridade</dt><dd>${c.superior ? 'Ensino superior completo' : 'Sem ensino superior completo'}</dd></div>
              <div><dt>Patrimônio</dt><dd>${c.patrimonio ? reais(c.patrimonio) : 'Nenhum bem declarado'}</dd></div>
              <div><dt>Mandato</dt><dd>${c.mandato ? 'Já exerce mandato político' : 'Nunca teve mandato'}</dd></div></dl></div></div>
          <div class="jg-partida">
            <p class="jg-chapeu">Seu ponto de partida</p><p class="jg-grande">${fmtP(st.hist[0])}</p>
            <p>É a chance que a <b>regressão logística</b> da Parte 1 dá para alguém com exatamente esse perfil. A média dos candidatos a deputado federal é ${fmtP(S.taxaDep)}.</p>
            <p class="jg-chapeu">Seu caixa: ${st.caixa} moedas</p>
            <ul class="jg-itens">${st.itens.map(([t, v]) => `<li><span>${esc(t)}</span><b>+${v}</b></li>`).join('')}</ul>
          </div>
        </div>
        ${dado('Você no meio de todos os candidatos', G.histograma(J.TODOS.map(x => x.patrimonio || 0), { bins, rotulos: rot, voce: c.patrimonio || 0, rotVoce: 'você' }) + `
          <div class="dado-numeros"><div><b>${reais(S.patMediana)}</b><span>patrimônio mediano<br>dos candidatos</span></div>
            <div><b>${reais(S.patMedia)}</b><span>patrimônio médio<br>(puxado pelos milionários)</span></div>
            <div><b>${dec(S.assimetria, 1)}</b><span>assimetria<br>(0 seria simétrico)</span></div><div><b>${pct(S.semBens, 0)}</b><span>não declararam<br>nenhum bem</span></div></div>
          <p>O candidato típico de 2026: <b>${pct(S.homens, 0)}</b> são homens, <b>${pct(S.brancos, 0)}</b> são brancos, idade mediana de <b>${S.idadeMediana} anos</b>${c.idade ? ` (você tem ${c.idade})` : ''}.
          Com uma cauda tão longa, a média engana: por isso o jogo, como a Parte 1, usa mediana e logaritmo do patrimônio.</p>`, 'Análise univariada · medidas-resumo, dispersão e outliers')}
        <button type="button" class="jg-botao principal" id="b-comecar">Começar a campanha →</button>
      </div>`);
    document.getElementById('b-comecar').onclick = semana;
  }

  // =================================================================
  // HUD: você, medidor de chance, caixa e adversários
  // =================================================================
  const ESC = p => lim((Math.log(Math.max(p, 0.005)) - Math.log(0.005)) / (Math.log(1) - Math.log(0.005)), 0, 1);
  function medidor() {
    const arco = r => `M${130 - r} 130 A${r} ${r} 0 0 1 ${130 + r} 130`;
    const marcas = [0.01, 0.05, 0.1, 0.25, 0.5, 1].map(v => { const a = Math.PI * (1 - ESC(v));
      return `<text x="${130 + 120 * Math.cos(a)}" y="${136 - 120 * Math.sin(a)}" text-anchor="middle">${Math.round(v * 100)}%</text>`; }).join('');
    return `<svg viewBox="-14 0 288 150" class="jg-medidor" aria-hidden="true"><defs><linearGradient id="jg-grad" x1="0" x2="1"><stop offset="0" stop-color="#4a4655"/><stop offset=".55" stop-color="#a66cff"/><stop offset="1" stop-color="#e2620f"/></linearGradient></defs>
      <path d="${arco(100)}" class="jg-trilho"/><path d="${arco(100)}" class="jg-cheio" pathLength="1" id="jg-cheio"/><g id="jg-ponteiro"><line x1="130" y1="130" x2="130" y2="44"/><circle cx="130" cy="130" r="8"/></g>${marcas}</svg>`;
  }
  function moverMedidor(p) { const t = ESC(p), a = document.getElementById('jg-cheio'), b = document.getElementById('jg-ponteiro');
    if (a) a.style.strokeDashoffset = 1 - t; if (b) b.style.transform = `rotate(${-90 + 180 * t}deg)`; }
  function contar(el, de, ate, ms = 900) {
    if (!el) return; if (PARADO) { el.textContent = fmtP(ate); return; }
    const t0 = performance.now(), f = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - (1 - k) ** 3; el.textContent = fmtP(de + (ate - de) * e); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }
  const moedas = n => n > 0 ? Array.from({ length: n }, (_, i) => `<i class="jg-moeda" style="--d:${i * 40}ms"></i>`).join('') : '<span class="jg-zero">caixa vazio</span>';
  function desenharHud(mostrarP) {
    const c = st.c, p = logistica(st.lg), visto = mostrarP ?? p;
    hud.hidden = false;
    hud.innerHTML = `
      <div class="jg-eu">${retrato(c, 'jg-foto-hud')}<div><b>${esc(nomeDe(c))}</b><span>${esc(c.partido)} · ${esc(c.uf)}</span><span class="jg-tag" style="--anel:${corGrupo(c)}">${grupo(c)}</span></div></div>
      <div class="jg-chance">${medidor()}<p><span id="jg-num">${fmtP(visto)}</span><small>chance de se eleger</small></p></div>
      <div class="jg-caixa"><small>Caixa de campanha</small><div class="jg-moedas">${moedas(st.caixa)}</div>
        <div class="jg-pips">${[0, 1, 2, 3, 4].map(k => `<i class="${k < st.semana ? 'feito' : k === st.semana ? 'agora' : ''}"></i>`).join('')}</div>
        <small>${st.semana < 5 ? `Semana ${st.semana + 1} de 5` : 'Fim da campanha'}</small></div>
      <div class="jg-rivais"><small>Seus adversários em ${esc(c.uf)} · ponto de partida de cada um, segundo o modelo</small>
        <div>${[c, ...rivais].map(r => { const pr = r === c ? p : J.chance(r);
          return `<div class="jg-rival ${r === c ? 'voce' : ''}">${retrato(r, 'jg-foto-rival')}<span>${r === c ? 'Você' : esc(nomeDe(r))}</span><i class="jg-barra"><b style="width:${(100 * ESC(pr)).toFixed(1)}%"></b></i><em>${fmtP(pr)}</em></div>`; }).join('')}</div></div>`;
    requestAnimationFrame(() => moverMedidor(visto));
  }

  // =================================================================
  // 4. AS 5 SEMANAS (cada uma com "o dado por trás")
  // =================================================================
  // ilustrações
  const fundo = (a, z) => `<defs><linearGradient id="g${a.slice(1)}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${z}"/></linearGradient>
    <pattern id="pt" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="#fff" opacity=".07"/></pattern></defs><rect width="640" height="240" fill="url(#g${a.slice(1)})"/><rect width="640" height="240" fill="url(#pt)"/>`;
  const multidao = (y, cor) => Array.from({ length: 26 }, (_, i) => { const x = 10 + i * 24 + (i % 2) * 6, h = 16 + (i * 7) % 12;
    return `<circle cx="${x}" cy="${y - h - 9}" r="9" fill="${cor}"/><rect x="${x - 11}" y="${y - h}" width="22" height="${h + 20}" rx="10" fill="${cor}"/>`; }).join('');
  const ILU = {
    partido: () => `${fundo('#2a1a45', '#16141d')}${[[150, '#a66cff', 0], [320, '#e2620f', 1], [490, '#cbc4b6', 2]].map(([x, c, k]) => `<rect x="${x}" y="38" width="5" height="160" rx="2" fill="#f3eee4" opacity=".8"/>
      <path d="M${x + 5} 44 q40 -14 80 0 t80 0 v58 q-40 14 -80 0 t-80 0z" fill="${c}"><animate attributeName="d" dur="${2.4 + k * .4}s" repeatCount="indefinite" values="M${x + 5} 44 q40 -14 80 0 t80 0 v58 q-40 14 -80 0 t-80 0z;M${x + 5} 44 q40 14 80 0 t80 0 v58 q-40 -14 -80 0 t-80 0z;M${x + 5} 44 q40 -14 80 0 t80 0 v58 q-40 14 -80 0 t-80 0z"/></path>`).join('')}<g opacity=".6">${multidao(232, '#0d0b12')}</g>`,
    rua: () => `${fundo('#3a1d0e', '#16141d')}<g fill="#0d0b12" opacity=".8"><rect x="0" y="150" width="70" height="90"/><rect x="74" y="120" width="50" height="120"/><rect x="128" y="160" width="80" height="80"/><rect x="420" y="130" width="60" height="110"/><rect x="484" y="105" width="70" height="135"/><rect x="558" y="150" width="82" height="90"/></g>
      <g transform="translate(150 70)"><path d="M0 40 L70 10 L70 90 L0 60z" fill="#e2620f"/><rect x="-22" y="38" width="24" height="24" rx="5" fill="#f3eee4"/>${[0, 1, 2].map(k => `<path d="M${90 + k * 22} ${18 - k * 8} q${18 + k * 6} 32 0 ${64 + k * 16}" stroke="#f3eee4" stroke-width="5" fill="none" stroke-linecap="round" opacity="${.9 - k * .25}"/>`).join('')}</g>
      <g transform="translate(380 34)"><rect width="104" height="176" rx="18" fill="#f3eee4"/><rect x="8" y="18" width="88" height="140" rx="8" fill="#2a1a45"/>${[0, 1, 2].map(k => `<g transform="translate(${26 + k * 22} ${120 - k * 34})"><path d="M0 6 a6 6 0 0 1 12 0 a6 6 0 0 1 12 0 q0 10 -12 18 q-12 -8 -12 -18z" fill="#a66cff"><animateTransform attributeName="transform" type="translate" values="0 0;0 -12;0 0" dur="${1.6 + k * .3}s" repeatCount="indefinite"/></path></g>`).join('')}</g>`,
    apoio: () => `${fundo('#1c2a3a', '#16141d')}${Array.from({ length: 11 }, (_, i) => `<path d="M${88 + i * 48} 36 l12 26 l12 -26z" fill="${['#a66cff', '#e2620f', '#f3eee4'][i % 3]}"/>`).join('')}<path d="M80 34 H600" stroke="#f3eee4" stroke-width="2" opacity=".5"/>
      <rect x="150" y="160" width="340" height="80" fill="#e2620f"/><rect x="150" y="160" width="340" height="12" fill="#f3eee4" opacity=".8"/>
      <g fill="#f3eee4"><circle cx="270" cy="92" r="20"/><rect x="246" y="114" width="48" height="50" rx="18"/><circle cx="370" cy="92" r="20"/><rect x="346" y="114" width="48" height="50" rx="18"/></g>
      <path d="M290 122 l40 -50 M350 122 l-20 -50" stroke="#f3eee4" stroke-width="12" stroke-linecap="round"/><circle cx="330" cy="68" r="10" fill="#a66cff"/>`,
    viral: () => `${fundo('#2a1a45', '#3a1d0e')}${Array.from({ length: 7 }, (_, i) => `<rect x="${60 + i * 34}" y="${200 - (i + 1) * 20}" width="22" height="${(i + 1) * 20}" rx="4" fill="#a66cff" opacity="${.35 + i * .09}"/>`).join('')}
      <g transform="translate(360 30)"><rect width="110" height="186" rx="18" fill="#f3eee4"/><rect x="8" y="18" width="94" height="150" rx="8" fill="#16141d"/><circle cx="55" cy="93" r="30" fill="#e2620f"/><path d="M47 78 L70 93 L47 108z" fill="#f3eee4"/></g>
      <path d="M520 190 L590 60 M570 56 L594 52 L596 78" stroke="#e2620f" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    falsa: () => `${fundo('#3a1414', '#16141d')}<g transform="translate(150 26) rotate(-6)"><rect width="260" height="190" rx="6" fill="#f3eee4"/><rect x="18" y="18" width="224" height="30" fill="#16141d"/>${Array.from({ length: 6 }, (_, i) => `<rect x="18" y="${64 + i * 18}" width="${i % 3 === 2 ? 140 : 224}" height="8" rx="4" fill="#8f8a99"/>`).join('')}</g>
      <g transform="translate(330 70) rotate(-14)"><rect width="200" height="64" rx="8" fill="none" stroke="#e2620f" stroke-width="7"/><text x="100" y="45" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="36" fill="#e2620f" letter-spacing="4">FALSO</text></g>`,
    debate: () => `${fundo('#16233a', '#16141d')}<rect x="110" y="24" width="420" height="190" rx="14" fill="#0d0b12" stroke="#f3eee4" stroke-width="5"/><rect x="128" y="40" width="96" height="26" rx="13" fill="#e2620f"/>
      <text x="176" y="58" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="13" fill="#f3eee4">AO VIVO</text>
      ${[230, 410].map((x, k) => `<g fill="${k ? '#cbc4b6' : '#a66cff'}"><circle cx="${x}" cy="106" r="20"/><rect x="${x - 26}" y="128" width="52" height="40" rx="16"/></g><rect x="${x - 40}" y="150" width="80" height="50" rx="4" fill="#f3eee4"/>`).join('')}`,
    cota: () => `${fundo('#2a1a45', '#16141d')}<g transform="translate(120 40)">${Array.from({ length: 10 }, (_, i) => `<g transform="translate(${i * 40} ${i < 3 ? 0 : 0})"><circle cx="16" cy="20" r="13" fill="${i < 3 ? '#a66cff' : '#cbc4b6'}"/><rect x="2" y="36" width="28" height="44" rx="12" fill="${i < 3 ? '#a66cff' : '#cbc4b6'}"/></g>`).join('')}
      <rect x="-10" y="100" width="420" height="44" rx="10" fill="#0d0b12"/><text x="200" y="129" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="800" font-size="18" fill="#f3eee4">COTA MÍNIMA: 30% DE MULHERES</text></g>`,
    urna: () => `${fundo('#2a1a45', '#16141d')}<g transform="translate(200 30)"><rect width="240" height="180" rx="14" fill="#cbc4b6"/><rect x="16" y="18" width="120" height="90" rx="6" fill="#f3eee4"/>
      <rect x="28" y="34" width="70" height="10" rx="5" fill="#8f8a99"/><rect x="28" y="54" width="96" height="10" rx="5" fill="#8f8a99"/><rect x="28" y="74" width="50" height="10" rx="5" fill="#a66cff"/>
      ${Array.from({ length: 9 }, (_, i) => `<rect x="${150 + (i % 3) * 26}" y="${20 + Math.floor(i / 3) * 26}" width="20" height="20" rx="4" fill="#16141d"/>`).join('')}<rect x="150" y="104" width="34" height="22" rx="4" fill="#f3eee4"/><rect x="190" y="104" width="38" height="22" rx="4" fill="#e2620f"/></g>
      ${Array.from({ length: 18 }, (_, i) => `<rect x="${40 + (i * 73) % 560}" y="${10 + (i * 41) % 200}" width="8" height="14" rx="2" fill="${['#a66cff', '#e2620f', '#f3eee4'][i % 3]}" transform="rotate(${i * 37} ${44 + (i * 73) % 560} ${17 + (i * 41) % 200})"/>`).join('')}`
  };
  const ilustracao = (t, rot) => `<svg class="jg-ilu" viewBox="0 0 640 240" role="img" aria-label="${esc(rot)}" preserveAspectRatio="xMidYMid slice">${ILU[t]()}</svg>`;

  function rodadas(c, s) {
    const meu = c.partido, top = J.partidosOrd.find(x => x !== meu) || meu, nanico = J.partidosOrd[J.partidosOrd.length - 1] || meu;
    const tx = J.taxaPartido, dTop = lim(logit(tx(top)) - logit(tx(meu)), 0, 1.2) * 0.5, dNan = lim(logit(tx(nanico)) - logit(tx(meu)), -1.2, 0) * 0.5;
    const R = [
      { ilu: 'partido', titulo: 'A escolha do partido', texto: `Você está no <b>${esc(meu)}</b>, onde ${fmtP(tx(meu))} dos candidatos a deputado federal se elegeram. Um partido maior tem mais tempo de TV e mais dinheiro, mas também mais gente disputando a mesma vaga.`,
        opcoes: [{ t: `Ficar no ${meu}`, d: 'Nada muda: você já conhece a casa.', custo: 0, ef: () => [0, `Você fica no ${meu}.`] },
                 { t: `Migrar para o ${top}`, d: `Taxa de eleição de ${fmtP(tx(top))}. Custa caro entrar.`, custo: 2, ef: () => [dTop, `O ${top} te aceita, e a estrutura dele ajuda.`] },
                 { t: `Ir para o ${nanico}`, d: `Lá você seria a estrela e ganha +1 de caixa. Taxa de eleição: ${fmtP(tx(nanico))}.`, custo: -1, ef: () => [dNan, `No ${nanico} sobra espaço, mas faltam votos na legenda.`] }],
        dado: () => dado('Taxa de eleição por partido (deputado federal)', G.barras(J.partidosOrd.slice(0, 8).concat(J.partidosOrd.slice(-2)).filter((x, i, a) => a.indexOf(x) === i)
          .concat(J.partidosOrd.includes(meu) && !J.partidosOrd.slice(0, 8).concat(J.partidosOrd.slice(-2)).includes(meu) ? [meu] : [])
          .map(s => ({ nome: s, v: 100 * tx(s), cor: s === meu ? T.roxo : s === top ? T.laranja : T.base, forte: s === meu, nota: s === meu ? 'seu partido' : '' }))),
          `<p>O partido importa: a taxa vai de ${fmtP(tx(nanico))} a ${fmtP(tx(J.partidosOrd[0]))}. No jogo, metade dessa diferença vira efeito, porque partido grande também traz mais concorrência interna.</p>`, 'Proporção de eleitos entre os candidatos de cada partido com 15 ou mais candidaturas') },
      { ilu: 'rua', titulo: 'Como chegar no eleitor', texto: 'São 45 dias de campanha. Onde você coloca a sua energia (e o seu dinheiro)?',
        opcoes: [{ t: 'Corpo a corpo nos bairros', d: 'Barato, cansativo e lento.', custo: 0, ef: () => [0.15, 'Você bate de porta em porta. Ajuda um pouco.'] },
                 { t: 'Impulsionar nas redes', d: 'Anúncios pagos no celular do eleitor.', custo: 1, ef: () => [0.3, 'Seus vídeos chegam a milhares de pessoas.'] },
                 { t: 'Carreata e santinhos', d: 'A campanha clássica, e a mais cara.', custo: 2, ef: () => [0.45, 'Seu número está em todo poste da cidade.'] }],
        dado: () => GA ? dado('Dinheiro de campanha: quem gasta mais, e o que isso compra', G.barras([
            { nome: 'Eleitos', v: GA.mediana_eleitos, cor: T.laranja }, { nome: 'Não eleitos', v: GA.mediana_nao_eleitos },
            { nome: 'Homens', v: GA.mediana_homens }, { nome: 'Mulheres', v: GA.mediana_mulheres, cor: T.roxo },
            { nome: 'Brancos', v: GA.mediana_brancos }, { nome: 'Negros', v: GA.mediana_negros, cor: T.roxo }], { fmt: v => reais(v) }),
            `<p>Gastar 10 vezes mais multiplica a chance de se eleger por <b>${dec(GA.or_gasto, 1)}</b>. E o dinheiro não chega igual: por isso, no jogo, homens e brancos começam com mais moedas.</p>`, 'Gasto mediano declarado ao TSE (prestação de contas 2026)')
          : dado('Patrimônio: eleitos × não eleitos', G.barras([{ nome: 'Eleitos', v: S.patMedianaEl, cor: T.laranja }, { nome: 'Não eleitos', v: S.patMedianaNao }], { fmt: v => reais(v) }),
            `<p>O eleito mediano declarou <b>${dec(S.patMedianaEl / Math.max(1, S.patMedianaNao), 0)} vezes</b> o patrimônio do não eleito.</p>`, 'Patrimônio mediano declarado') },
      { ilu: 'apoio', titulo: 'O apoio do prefeito', texto: 'Um prefeito popular pode levar milhares de votos. Mas prefeito só apoia quem parece que vai ganhar: quanto maior a sua chance agora, maior a chance de ele topar.',
        opcoes: [{ t: 'Pedir o apoio', d: 'Custa 1 de caixa para a viagem e a negociação.', custo: 1, ef: s2 => s2.u < Math.min(0.9, 0.12 + 2.5 * logistica(s2.lg)) ? [0.6, 'O prefeito sobe no palanque com você!'] : [0, 'O prefeito diz que “vai pensar”. Na prática, apoia outro candidato.'] },
                 { t: 'Seguir sem padrinho', d: 'Você guarda o caixa e a independência.', custo: 0, ef: () => [0, 'Você segue sem padrinho.'] }],
        dado: () => dado('Quem já é forte fica mais forte: o que pesa na chance de se eleger', G.pesos(),
          `<p>Razões de chance da regressão logística, com intervalo de confiança de 95%. <b>Já ter mandato</b> multiplica a chance por ${dec(J.or('C(tem_mandato)[T.Sim]')[0], 1)}, mais do que qualquer outra característica. É a mesma lógica do prefeito: apoio vai para quem já está na frente.</p>`, 'Regressão logística · candidatos ao Legislativo, TSE 2026') },
      null,
      { ilu: 'urna', titulo: 'A reta final', texto: 'Falta uma semana. O que fazer com o que sobrou no caixa?',
        opcoes: [{ t: 'Gastar tudo em propaganda', d: 'Cada moeda que sobrou vira inserção na rádio e na TV.', custo: 'tudo', ef: (s2, g) => [0.15 * g, g ? `Você gasta ${g} moeda(s) na reta final.` : 'Não havia mais nada no caixa.'] },
                 { t: 'Mutirão de voluntários', d: 'Amigos e militantes no último fim de semana.', custo: 0, ef: () => [0.2, 'Os voluntários fazem barulho no último fim de semana.'] }],
        dado: () => dado('No fim, o dinheiro separa quem entra de quem fica', G.barras([{ nome: 'Eleitos', v: S.patMedianaEl, cor: T.laranja }, { nome: 'Todos os candidatos', v: S.patMediana }, { nome: 'Não eleitos', v: S.patMedianaNao }], { fmt: v => reais(v) }),
          `<p>O eleito mediano tem <b>${dec(S.patMedianaEl / Math.max(1, S.patMedianaNao), 0)} vezes</b> o patrimônio do não eleito. Como o patrimônio não segue a curva normal, a Parte 1 usou o teste de <b>Mann-Whitney</b>:
          U = ${num(S.U)}, z = ${dec(S.mwZ, 1)}, p &lt; 0,001. A diferença não é acaso.</p>`, 'Teste de Mann-Whitney · patrimônio de eleitos × não eleitos, todos os cargos') }
    ];
    const laranjasDado = () => dado(c.mulher ? 'Candidaturas que só existem no papel' : 'Enquanto isso, na cota de gênero', G.laranjas(),
      `<p>A lei obriga cada partido a lançar pelo menos 30% de mulheres. Muitas recebem quase nenhum voto: ${J.D.laranjas ? `<b>${dec(J.D.laranjas.Feminino.menos_100 / J.D.laranjas.Masculino.menos_100, 1)} vezes</b> mais que os homens ficaram abaixo de 100 votos` : 'veja o dossiê'}.
      Votação inexpressiva é um dos indícios de candidatura fictícia (TSE, Súmula 73), mas sozinha não prova fraude.</p>`, 'Votos recebidos por gênero · TSE 2026');
    const EV = {
      cota: { ilu: 'cota', titulo: 'Imprevisto: “só precisamos do seu nome”', texto: 'O partido precisa cumprir a cota de 30% de mulheres. Ele te inscreveu, mas avisa: o dinheiro do fundo vai para os “puxadores de voto”.',
        opcoes: [{ t: 'Brigar pela sua parte do fundo', d: 'A lei manda dividir o dinheiro. Custa 1 de caixa em advogado.', custo: 1, ef: () => [0.25, 'Você consegue uma parte do fundo. Pouco, mas é seu.'] },
                 { t: 'Fazer campanha assim mesmo', d: 'Sem dinheiro do partido.', custo: 0, ef: () => [-0.2, 'Sem apoio, sua campanha anda devagar.'] },
                 { t: 'Deixar o nome e não fazer campanha', d: 'Vira uma candidatura só no papel.', custo: 0, ef: () => [-1.2, 'Seu nome fica na urna, mas quase ninguém sabe que você existe.'] }] },
      viral: { ilu: 'viral', titulo: 'Imprevisto: seu vídeo viralizou!', texto: 'Um vídeo seu falando de um problema do bairro passou de 1 milhão de visualizações.',
        opcoes: [{ t: 'Fazer uma live e surfar a onda', d: 'Custa 1 de caixa para a equipe de vídeo.', custo: 1, ef: () => [0.35, 'A live bomba e o seu nome sobe.'] }, { t: 'Seguir o plano', d: 'Deixar o vídeo trabalhar sozinho.', custo: 0, ef: () => [0.15, 'O vídeo ajuda, mas o assunto passa.'] }] },
      falsa: { ilu: 'falsa', titulo: 'Imprevisto: uma notícia falsa', texto: 'Uma mentira sobre você está circulando nos grupos de mensagens.',
        opcoes: [{ t: 'Advogado e direito de resposta', d: 'Caro, mas resolve.', custo: 2, ef: () => [0, 'A Justiça manda tirar a notícia do ar.'] }, { t: 'Responder nas redes', d: 'Mais barato, mas você entra na briga.', custo: 1, ef: () => [-0.1, 'Você responde, mas a mentira já tinha se espalhado.'] },
                 { t: 'Ignorar', d: 'Torcer para o assunto morrer sozinho.', custo: 0, ef: () => [-0.35, 'A mentira cola em parte do eleitorado.'] }] },
      debate: { ilu: 'debate', titulo: 'Imprevisto: convite para debate na TV', texto: 'Uma emissora local chamou candidatos a deputado para um debate ao vivo.',
        opcoes: [{ t: 'Ir, com preparação', d: 'Custa 1 de caixa para o treinamento.', custo: 1, ef: () => [0.3, 'Você vai bem e vira assunto no dia seguinte.'] },
                 { t: 'Ir sem preparação', d: 'Na raça.', custo: 0, ef: s2 => s2.u2 < 0.5 ? [0.2, 'Você se sai bem!'] : [-0.15, 'Você trava numa pergunta e o corte circula.'] }, { t: 'Faltar', d: 'Evita o risco.', custo: 0, ef: () => [-0.1, 'Sua cadeira vazia aparece na TV.'] }] }
    };
    R[3] = Object.assign({ dado: laranjasDado }, EV[s.evento]);
    return R;
  }
  const custoDe = (op, s) => op.custo === 'tudo' ? s.caixa : op.custo;
  function aplicar(s, op) {
    const custo = custoDe(op, s), [delta, msg] = op.ef(s, custo), antes = logistica(s.lg);
    s.caixa -= custo; s.lg += delta; s.extra += delta; s.hist.push(logistica(s.lg));
    return { delta, msg, antes, depois: logistica(s.lg) };
  }

  function semana() {
    fase(3); rolarTopo();
    const r = rodadas(st.c, st)[st.semana];
    desenharHud();
    mostrar(`
      <article class="jg-evento">${ilustracao(r.ilu, r.titulo)}
        <div class="jg-evento-corpo"><p class="jg-chapeu">Fase 4 · A campanha · semana ${st.semana + 1} de 5</p><h3>${r.titulo}</h3><p>${r.texto}</p>
          <div class="jg-opcoes">${r.opcoes.map((op, k) => { const custo = custoDe(op, st), pode = custo <= st.caixa;
            return `<button type="button" class="jg-opcao" data-k="${k}" ${pode ? '' : 'disabled'}><kbd>${k + 1}</kbd><b>${esc(op.t)}</b><span>${esc(op.d)}</span>
              <em class="${custo < 0 ? 'ganha' : ''}">${op.custo === 'tudo' ? `custa ${st.caixa} (tudo)` : custo > 0 ? `custa ${custo}` : custo < 0 ? `+${-custo} de caixa` : 'grátis'}${pode ? '' : ' · sem caixa'}</em></button>`; }).join('')}</div>
          <div id="consequencia"></div></div></article>`);
    document.querySelectorAll('.jg-opcao').forEach(bt => bt.onclick = () => escolher(r, +bt.dataset.k));
  }
  function escolher(r, k) {
    if (document.querySelector('.jg-consequencia')) return;
    st.escolhas.push(k);
    const res = aplicar(st, r.opcoes[k]);
    st.semana++;
    desenharHud(res.antes);
    contar(document.getElementById('jg-num'), res.antes, res.depois);
    setTimeout(() => moverMedidor(res.depois), 60);
    document.querySelectorAll('.jg-opcao').forEach((bt, i) => { bt.disabled = true; bt.classList.toggle('escolhida', i === k); });
    const rel = 100 * (res.depois / res.antes - 1);
    document.getElementById('consequencia').innerHTML = `
      <div class="jg-consequencia"><p class="jg-delta ${rel > 0.5 ? 'sobe' : rel < -0.5 ? 'desce' : ''}">${Math.abs(rel) <= 0.5 ? 'Sua chance não mudou' :
        `${rel > 0 ? '▲ +' : '▼ '}${num(rel)}% na sua chance <small>(de ${fmtP(res.antes)} para ${fmtP(res.depois)})</small>`}</p><p>${esc(res.msg)}</p></div>
      ${r.dado()}
      <button type="button" class="jg-botao principal" id="b-seguir">${st.semana < 5 ? 'Próxima semana →' : 'Abrir as urnas →'}</button>`;
    document.getElementById('b-seguir').onclick = () => st.semana < 5 ? semana() : apuracao();
    document.getElementById('consequencia').scrollIntoView({ behavior: PARADO ? 'auto' : 'smooth', block: 'start' });
  }

  // =================================================================
  // 5. A APURAÇÃO (regressão dos votos + correlação de Spearman)
  // =================================================================
  let resultado = null;
  function apuracao() {
    fase(4); rolarTopo(); desenharHud();
    const c = st.c, pF = logistica(st.lg), eleito = Math.random() < pF;
    const todos = [c, ...rivais].map(r => ({ r, p: r === c ? pF : J.chance(r) })), max = Math.max(...todos.map(x => x.p));
    const vPerfil = J.votosPrevistos(c), vFinal = vPerfil != null ? vPerfil * Math.exp(st.extra) : null;
    resultado = { eleito, pF, vFinal };
    mostrar(`
      <div class="jg-tela jg-apuracao">
        <div class="jg-apu-topo">${ilustracao('urna', 'Urna eletrônica')}<div><p class="jg-chapeu">Fase 5 · A apuração · ${esc(c.uf)}</p><h2>Urnas apuradas: <span id="apu">0%</span></h2></div></div>
        <div class="jg-corrida">${todos.map(({ r }, i) => `<div class="jg-raia ${r === c ? 'voce' : ''}">${retrato(r, 'jg-foto-rival')}<span>${r === c ? 'Você' : esc(nomeDe(r))}</span><i class="jg-barra larga"><b id="raia-${i}"></b></i><em id="raia-p-${i}"></em></div>`).join('')}</div>
        <div id="veredito" hidden></div>
      </div>`);
    const dur = PARADO ? 0 : 3200, t0 = performance.now(), ruido = todos.map(() => Math.random() * 0.4 + 0.8);
    const passo = t => { const k = dur ? Math.min(1, (t - t0) / dur) : 1;
      document.getElementById('apu').textContent = Math.round(100 * k) + '%';
      todos.forEach(({ p }, i) => { const v = p * k * (1 + (1 - k) * (ruido[i] - 1)); document.getElementById('raia-' + i).style.width = (100 * v / max).toFixed(1) + '%'; document.getElementById('raia-p-' + i).textContent = fmtP(Math.max(0, v)); });
      if (k < 1) requestAnimationFrame(passo); else veredito(todos); };
    requestAnimationFrame(passo);
  }
  function veredito(todos) {
    const c = st.c, { eleito, pF, vFinal } = resultado, v = document.getElementById('veredito'), d = UF[c.uf] || {};
    todos.forEach(({ r }, i) => { if (r !== c) document.getElementById('raia-p-' + i).innerHTML += ` <small class="${r.eleito ? 'real-sim' : ''}">${r.eleito ? 'eleito(a) na vida real' : 'não eleito(a)'}</small>`; });
    const B = S.efVotos || {};
    v.hidden = false;
    v.innerHTML = `
      <div class="jg-carimbo ${eleito ? 'sim' : 'nao'}">${eleito ? ao(c, 'ELEITO', 'ELEITA') : ao(c, 'NÃO ELEITO', 'NÃO ELEITA')}</div>
      <p class="jg-grande-txt">Com a sua campanha, a chance terminou em <b>${fmtP(pF)}</b>: em 1.000 eleições, você ganharia cerca de <b>${num(1000 * pF)}</b>.</p>
      ${c.ficticio ? '' : `<p class="jg-real">Na vida real, ${esc(titulo(c.nome))} ${c.eleito ? `<b>foi ${ao(c, 'eleito', 'eleita')}</b>` : `<b>não foi ${ao(c, 'eleito', 'eleita')}</b>`}${c.votos != null ? ` com ${num(c.votos)} votos` : ''}.</p>`}
      ${S.ols ? dado('Quantos votos o seu perfil costuma ter', G.dispersao(J.DEP.filter(x => x.uf === c.uf && x.votos != null && x !== c), c, vFinal) + `
        <div class="dado-numeros"><div><b>${num(vFinal)}</b><span>seus votos estimados<br>(perfil + campanha)</span></div>${d.corte && isFinite(d.corte) ? `<div><b>${num(d.corte)}</b><span>votos do eleito com<br>menos votos em ${c.uf}</span></div>` : ''}
          <div><b>${dec(S.spearman, 2)}</b><span>correlação de Spearman<br>patrimônio × votos</span></div><div><b>${dec(S.ols.r2, 2)}</b><span>R² da regressão<br>(só patrimônio: ${dec(S.olsSimples.r2, 2)})</span></div></div>
        <p>Regressão linear múltipla do log dos votos (deputados federais): mantendo o resto igual, já ter mandato multiplica os votos por <b>${dec(B.mandato, 1)}</b>; patrimônio 10× maior, por <b>${dec(B.patrimonio10, 2)}</b>;
          ser homem, por <b>${dec(B.homem, 2)}</b>; ser negro, por <b>${dec(B.negro, 2)}</b>. Na eleição proporcional os votos do partido também contam, por isso não existe um “corte” exato.</p>`,
        'Regressão linear múltipla e correlação de Spearman · cada ponto é um candidato do seu estado (laranja = eleito)') : ''}
      <button type="button" class="jg-botao principal" id="b-gemeo">E se outra pessoa fizesse exatamente a mesma campanha? →</button>`;
    document.getElementById('b-gemeo').onclick = gemeo;
  }

  // =================================================================
  // 5b. A MESMA CAMPANHA, OUTRO PONTO DE PARTIDA
  // =================================================================
  function gemeo() {
    rolarTopo();
    const c = st.c, priv = !c.mulher && c.raca === 'B', medPat = J.mediana(J.DEP.map(x => x.patrimonio || 0));
    const teste = priv ? (x => x.mulher && x.raca === 'N' && !x.mandato && (x.patrimonio || 0) <= medPat) : (x => !x.mulher && x.raca === 'B' && x.mandato && (x.patrimonio || 0) > medPat);
    const l = J.DEP.filter(x => x.uf === c.uf && x !== c && teste(x)), pool = comFoto(l.length ? l : J.DEP.filter(teste));
    const g = pool.length ? sorteia(pool, rng(st.semente + 3)) : sorteia(J.DEP);
    const outro = novoEstado(g, st.semente); outro.evento = st.evento;
    const notas = []; let semCota = '';
    if (st.evento === 'cota' && !g.mulher) { outro.evento = 'debate'; semCota = `${esc(nomeDe(g))} não passou pelo imprevisto da cota: só candidatas passam por isso. `; }
    if (st.evento !== 'cota' && outro.evento === 'cota') outro.evento = st.evento;
    rodadas(g, outro).forEach((r, k) => { let op = r.opcoes[st.escolhas[k]];
      if (custoDe(op, outro) > outro.caixa) { notas.push(`na semana ${k + 1}, não tinha caixa para “${op.t}”`); op = r.opcoes.find(o => custoDe(o, outro) <= outro.caixa); }
      aplicar(outro, op); });
    const pa = st.hist[st.hist.length - 1], pb = outro.hist[outro.hist.length - 1], razao = pa > pb ? pa / pb : pb / pa, rz = dec(razao, razao < 10 ? 1 : 0);
    hud.hidden = true;
    mostrar(`
      <div class="jg-tela jg-gemeos">
        <p class="jg-chapeu">As mesmas 5 escolhas. Outro ponto de partida.</p>
        <h2>${pb > pa ? `${esc(nomeDe(g))} fez a sua campanha e terminou com ${rz} vezes a sua chance` : `Você terminou com ${rz} vezes a chance de ${esc(nomeDe(g))}, que fez a mesma campanha`}</h2>
        <div class="jg-duelo">
          <div class="voce">${retrato(c, 'jg-foto-grande')}<b>${esc(nomeDe(c))}</b><span>${grupo(c)} · ${c.mandato ? 'com mandato' : 'sem mandato'} · ${c.patrimonio ? reais(c.patrimonio) : 'sem bens'}</span><p class="jg-grande">${fmtP(pa)}</p></div>
          <p class="jg-vs">×${rz}</p>
          <div class="outro">${retrato(g, 'jg-foto-grande')}<b>${esc(nomeDe(g))}</b><span>${grupo(g)} · ${g.mandato ? 'com mandato' : 'sem mandato'} · ${g.patrimonio ? reais(g.patrimonio) : 'sem bens'}</span><p class="jg-grande">${fmtP(pb)}</p></div>
        </div>
        <svg id="linhas" viewBox="0 0 720 300" role="img" aria-label="Chance de cada um ao longo das 5 semanas"></svg>
        <p class="jg-frase">${semCota}${notas.length ? `E ${esc(nomeDe(g))} nem sempre pôde seguir o seu plano: ${notas.join('; ')}. ` : ''}A campanha muda alguns pontos; o ponto de partida decide quase tudo.
          É a hipótese deste trabalho: o filtro <b>persiste</b> mesmo quando a campanha é igual.</p>
        <h3>Por que os pontos de partida são tão diferentes?</h3><div class="jg-fatores">${fatores(c, g)}</div>
        <button type="button" class="jg-botao principal" id="b-camara">Ver a Câmara que saiu desta eleição →</button>
      </div>`);
    linhas(st.hist, outro.hist);
    document.getElementById('b-camara').onclick = camara;
  }
  function fatores(a, g) {
    const ta = J.termos(a), tg = J.termos(g), pn = esc(nomeDe(g)).split(' ')[0];
    return [['mandato', 'Mandato político', c => c.mandato ? 'tem' : 'não tem'], ['patrimonio', 'Patrimônio', c => c.patrimonio ? reais(c.patrimonio) : 'nenhum'],
      ['genero', 'Gênero', c => c.mulher ? 'mulher' : 'homem'], ['raca', 'Raça', c => c.raca === 'N' ? 'negra' : c.raca === 'B' ? 'branca' : 'outra'], ['superior', 'Ensino superior', c => c.superior ? 'completo' : 'não']]
      .map(([k, n, d]) => { const x = Math.exp(tg[k] - ta[k]), cl = x >= 1.05 ? 'outro' : x <= 0.95 ? 'voce' : '';
        const t = Math.abs(x - 1) < 0.05 ? 'empate' : x > 1 ? `×${dec(x, 1)} para ${pn}` : `×${dec(1 / x, 1)} para você`;
        return `<div class="${cl}"><span>${n}</span><small>você: ${d(a)} · ${pn}: ${d(g)}</small><b>${t}</b></div>`; }).join('');
  }
  function linhas(ha, hb) {
    const svg = document.getElementById('linhas'), topoV = Math.max(...ha, ...hb);
    const passo = [0.01, 0.02, 0.05, 0.1, 0.2, 0.25].find(s => s * 4 >= topoV * 1.08) || 0.25, max = passo * 4, X = i => 70 + i * 120, Y = v => 250 - 220 * v / max;
    let h = '';
    for (let k = 0; k <= 4; k++) h += `<line x1="60" x2="690" y1="${Y(max * k / 4)}" y2="${Y(max * k / 4)}" class="grade"/><text x="52" y="${Y(max * k / 4) + 5}" text-anchor="end">${fmtP(max * k / 4)}</text>`;
    ['Início', 'Sem. 1', 'Sem. 2', 'Sem. 3', 'Sem. 4', 'Sem. 5'].forEach((t, i) => h += `<text x="${X(i)}" y="282" text-anchor="middle">${t}</text>`);
    [[ha, 'voce'], [hb, 'outro']].forEach(([hs, cl]) => {
      h += `<path class="jg-linha ${cl}" pathLength="1" d="${hs.map((v, i) => (i ? 'L' : 'M') + X(i) + ' ' + Y(v).toFixed(1)).join(' ')}"/>`;
      h += hs.map((v, i) => `<circle class="jg-ponto ${cl}" cx="${X(i)}" cy="${Y(v).toFixed(1)}" r="${i === hs.length - 1 ? 7 : 4.5}" style="--d:${i * 180}ms"/>`).join('');
      h += `<text class="jg-rot ${cl}" x="${X(hs.length - 1) + 12}" y="${Y(hs[hs.length - 1]) + 5}">${fmtP(hs[hs.length - 1])}</text>`; });
    svg.innerHTML = h; requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.add('desenha')));
  }

  // =================================================================
  // 6. A CÂMARA (hemiciclo com cenários + "mude as regras do jogo")
  // =================================================================
  const TOTAL = 513, FIL = 12, CX = 300, CY = 310, RI = 110, RE = 290;
  const raios = Array.from({ length: FIL }, (_, i) => RI + i * (RE - RI) / (FIL - 1)), somaR = raios.reduce((a, x) => a + x, 0);
  const porFil = raios.map(r => Math.round(TOTAL * r / somaR)); porFil[FIL - 1] += TOTAL - porFil.reduce((a, x) => a + x, 0);
  const CAD = []; raios.forEach((r, f) => { for (let k = 0; k < porFil[f]; k++) { const a = Math.PI - (k / (porFil[f] - 1)) * Math.PI; CAD.push({ x: CX + r * Math.cos(a), y: CY - r * Math.sin(a), a }); } });
  CAD.sort((p, q) => q.a - p.a);
  const rCad = 0.42 * (RE - RI) / (FIL - 1);
  function emCadeiras(pc) {
    const n = Object.keys(pc), br = n.map(k => TOTAL * pc[k] / 100), it = br.map(Math.floor), falta = TOTAL - it.reduce((a, x) => a + x, 0);
    br.map((x, i) => [x - it[i], i]).sort((a, z) => z[0] - a[0]).slice(0, falta).forEach(([, i]) => it[i]++);
    return n.map((k, i) => [k, it[i]]);
  }
  const hemi = id => `<svg id="${id}" viewBox="0 0 600 330" class="hemi" role="img" aria-label="As 513 cadeiras da Câmara dos Deputados">${CAD.map((c, i) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${rCad.toFixed(1)}" data-i="${i}"/>`).join('')}</svg>`;
  function pintar(id, grupos, cores) { const els = document.querySelectorAll(`#${id} circle`); let i = 0;
    grupos.forEach(([g, n]) => { for (let j = 0; j < n && i < els.length; j++) { els[i].style.fill = cores[g]; els[i].dataset.g = g; els[i].style.transitionDelay = (i * 1.5) + 'ms'; i++; } }); }
  const ROT = { Feminino: 'Mulheres', Masculino: 'Homens', Negra: 'Pessoas negras', Branca: 'Pessoas brancas', Outras: 'Indígenas e amarelas' };
  const CORH = { Feminino: '#a66cff', Masculino: '#4a4655', Negra: '#a66cff', Branca: '#4a4655', Outras: '#8f8a99' };
  const CEN = { real: '① A Câmara eleita em 2026', candidatos: '② Sorteada entre os candidatos', sem_filtro: '③ Se o grupo não pesasse no modelo', brasil: '④ Um retrato do Brasil' };
  let dim = 'genero', cen = 'real';
  function camara() {
    fase(5); hud.hidden = true; rolarTopo();
    const H = J.D.hemiciclo, c = st.c;
    mostrar(`
      <div class="jg-tela">
        <p class="jg-chapeu">Fase 6 · A Câmara</p>
        <h2>${resultado.eleito ? `Você conseguiu uma das 513 cadeiras. Veja quem está ao seu lado.` : `Você ficou de fora. Veja quem conseguiu as 513 cadeiras.`}</h2>
        ${H ? `<div class="jg-abas" id="abas-dim"><button type="button" data-k="genero" class="ativo">Gênero</button><button type="button" data-k="raca">Raça</button></div>
        <div class="camara-area"><div>${hemi('hemi1')}<p class="hemi-leg" id="hemi-leg"></p></div>
          <div><div class="cenarios" id="cenarios">${Object.entries(CEN).map(([k, t]) => `<button type="button" data-k="${k}" class="${k === cen ? 'ativo' : ''}">${t}</button>`).join('')}</div><p id="cen-txt" class="jg-dica"></p></div></div>` : ''}
        <section class="regras">
          <p class="jg-chapeu">Agora você muda as regras do jogo</p>
          <h3>Monte a sua Câmara</h3>
          <p>Use o mesmo modelo para tirar (ou diminuir) o peso de cada característica, ou reservar cadeiras. Os candidatos são os reais de 2026; só mudam as regras.</p>
          <div class="sim-atalhos" id="sim-atalhos"></div>
          <div class="sim-grade"><div>${hemi('hemi2')}<div class="sim-leg" id="sim-leg"></div></div>
            <div class="sim-controles">${[['genero', 'Peso de ser homem'], ['raca', 'Peso da raça'], ['patrimonio', 'Peso do patrimônio'], ['mandato', 'Peso de já ter mandato']].map(([k, t]) => `<label>${t} <output id="o-${k}">100%</output><input type="range" id="s-${k}" min="0" max="100" value="100"></label>`).join('')}
              <div class="sim-res"><span>Cadeiras reservadas para mulheres</span><div id="r-m">${[0, .3, .5].map((v, i) => `<button type="button" data-v="${v}" class="${i ? '' : 'ativo'}">${v ? Math.round(v * 100) + '%' : 'nenhuma'}</button>`).join('')}</div></div>
              <div class="sim-res"><span>Cadeiras reservadas para pessoas negras</span><div id="r-n">${[0, .3, .5].map((v, i) => `<button type="button" data-v="${v}" class="${i ? '' : 'ativo'}">${v ? Math.round(v * 100) + '%' : 'nenhuma'}</button>`).join('')}</div></div></div></div>
          <div class="sim-numeros" id="sim-numeros"></div><p class="jg-dica" id="sim-nota"></p>
        </section>
        <button type="button" class="jg-botao principal" id="b-fim">O que fica desta eleição →</button>
      </div>`);
    if (H) {
      const desenha = () => { pintar('hemi1', emCadeiras(H[dim][cen]), CORH);
        const els = [...document.querySelectorAll('#hemi1 circle')]; els.forEach(e => e.classList.remove('minha'));
        if (resultado.eleito) { const chave = dim === 'genero' ? (c.mulher ? 'Feminino' : 'Masculino') : (c.raca === 'N' ? 'Negra' : c.raca === 'B' ? 'Branca' : 'Outras');
          const mesmos = els.filter(e => e.dataset.g === chave); const meu = mesmos[Math.floor(mesmos.length / 2)]; if (meu) meu.classList.add('minha'); }
        document.getElementById('hemi-leg').innerHTML = emCadeiras(H[dim][cen]).map(([g, n]) => `<span style="--cor:${CORH[g]}">${ROT[g]}: <b>${n}</b></span>`).join('') + (resultado.eleito ? '<span class="leg-voce">a sua cadeira</span>' : '');
        const tx = { real: 'As 513 cadeiras como ficaram depois da eleição.', candidatos: 'Se sorteássemos os deputados entre todos os candidatos: a diferença entre ① e ② é o que a votação mudou.',
          sem_filtro: `Os mesmos candidatos, com o mesmo dinheiro e mandato, mas sem o peso de ${dim === 'genero' ? 'ser mulher' : 'ser uma pessoa negra'} que o modelo encontrou.`, brasil: 'Se a Câmara tivesse a proporção da população (Censo 2022).' };
        document.getElementById('cen-txt').textContent = tx[cen]; };
      document.querySelectorAll('#abas-dim button').forEach(bt => bt.onclick = () => { dim = bt.dataset.k; document.querySelectorAll('#abas-dim button').forEach(x => x.classList.toggle('ativo', x === bt)); desenha(); });
      document.querySelectorAll('#cenarios button').forEach(bt => bt.onclick = () => { cen = bt.dataset.k; document.querySelectorAll('#cenarios button').forEach(x => x.classList.toggle('ativo', x === bt)); desenha(); });
      desenha();
    }
    simulador();
    document.getElementById('b-fim').onclick = fim;
  }
  function simulador() {
    const porUF = {}, vagas = {};
    J.DEP.forEach(c => { (porUF[c.uf] = porUF[c.uf] || []).push(c); });
    for (const u in porUF) vagas[u] = porUF[u].filter(c => c.eleito).length;
    const b = k => J.M[k] || 0, regra = { genero: 1, raca: 1, patrimonio: 1, mandato: 1, resM: 0, resN: 0 };
    const G4 = [['mn', 'Mulheres negras', '#a66cff'], ['mo', 'Outras mulheres', '#d9c4ff'], ['hn', 'Homens negros', '#8f8a99'], ['ho', 'Outros homens', '#4a4655']];
    const g4 = c => (c.mulher ? 'm' : 'h') + (c.raca === 'N' ? 'n' : 'o');
    function distribuir(peso, k) { let e = peso.slice();
      for (let v = 0; v < 20; v++) { const liv = e.map((_, i) => i).filter(i => e[i] < 1), ch = e.length - liv.length, s = liv.reduce((a, i) => a + peso[i], 0); if (!s) break;
        liv.forEach(i => e[i] = (k - ch) * peso[i] / s); if (!e.some(x => x > 1)) break; e = e.map(x => Math.min(x, 1)); }
      return e.map(x => Math.min(x, 1)); }
    function reservar(e, l, t, alvo, k) { const ng = e.reduce((s, x, i) => s + (t(l[i]) ? x : 0), 0); if (ng >= alvo || !ng) return e; return e.map((x, i) => t(l[i]) ? x * alvo / ng : x * (k - alvo) / (k - ng)); }
    const reaisEl = J.DEP.filter(c => c.eleito), em513 = n => Math.round(513 * n / reaisEl.length);
    const real = { m: em513(reaisEl.filter(c => c.mulher).length), n: em513(reaisEl.filter(c => c.raca === 'N').length), md: em513(reaisEl.filter(c => c.mandato).length) };
    function simular() {
      const soma = { mn: 0, mo: 0, hn: 0, ho: 0 }; let md = 0, faltou = false;
      for (const u in porUF) { const l = porUF[u], k = vagas[u]; if (!k) continue;
        const ch = l.map(c => logistica(b('Intercept') + b('C(cargo)[T.Deputado Federal]') + regra.genero * (c.mulher ? 0 : b('C(genero)[T.Masculino]'))
          + regra.raca * (c.raca === 'B' ? 0 : b('C(raca)[T.' + (c.raca === 'N' ? 'Negra' : 'Outras') + ']')) + (c.superior ? b('C(superior)[T.Sim]') : 0)
          + regra.mandato * (c.mandato ? b('C(tem_mandato)[T.Sim]') : 0) + regra.patrimonio * b('log_patrimonio') * J.lp(c)));
        let e = distribuir(ch, k);
        for (let v = 0; v < 15; v++) { if (regra.resM) e = reservar(e, l, c => c.mulher, regra.resM * k, k); if (regra.resN) e = reservar(e, l, c => c.raca === 'N', regra.resN * k, k); e = distribuir(e, k); }
        if (regra.resM && e.reduce((s, x, i) => s + (l[i].mulher ? x : 0), 0) < regra.resM * k - 0.5) faltou = true;
        l.forEach((c, i) => { soma[g4(c)] += e[i]; if (c.mandato) md += e[i]; }); }
      const tot = Object.values(soma).reduce((a, x) => a + x, 0), gr = emCadeiras(Object.fromEntries(G4.map(([g]) => [g, 100 * soma[g] / tot]))), n = Object.fromEntries(gr);
      pintar('hemi2', gr, Object.fromEntries(G4.map(([g, , c]) => [g, c])));
      document.getElementById('sim-leg').innerHTML = G4.map(([g, t, c]) => `<span style="--cor:${c}">${t}: <b>${n[g]}</b></span>`).join('');
      const caixa = (t, s, r) => { const d = s - r; return `<div><span>${t}</span><b>${s}</b><small class="${d > 0 ? 'sobe' : d < 0 ? 'desce' : ''}">${d > 0 ? '+' : ''}${d} em relação à real (${r})</small></div>`; };
      document.getElementById('sim-numeros').innerHTML = caixa('Mulheres', n.mn + n.mo, real.m) + caixa('Pessoas negras', n.mn + n.hn, real.n) + caixa('Já tinham mandato', Math.round(513 * md / tot), real.md);
      document.getElementById('sim-nota').textContent = (faltou ? 'Em alguns estados não há candidatas suficientes para cumprir a reserva. ' : '') + 'Simulação com o modelo estatístico, não previsão: com tudo em 100% ela reproduz a Câmara real só aproximadamente.';
    }
    ['genero', 'raca', 'patrimonio', 'mandato'].forEach(k => { const s = document.getElementById('s-' + k); s.oninput = () => { regra[k] = s.value / 100; document.getElementById('o-' + k).textContent = s.value + '%'; simular(); }; });
    [['r-m', 'resM'], ['r-n', 'resN']].forEach(([id, k]) => document.querySelectorAll(`#${id} button`).forEach(bt => bt.onclick = () => { document.querySelectorAll(`#${id} button`).forEach(x => x.classList.toggle('ativo', x === bt)); regra[k] = +bt.dataset.v; simular(); }));
    const AT = [['Como foi em 2026', [100, 100, 100, 100, 0, 0]], ['Sem desvantagem de gênero e raça', [0, 0, 100, 100, 0, 0]], ['Dinheiro não conta', [100, 100, 0, 100, 0, 0]], ['Paridade', [100, 100, 100, 100, .5, .5]]];
    const cx = document.getElementById('sim-atalhos');
    cx.innerHTML = AT.map(([t], i) => `<button type="button" data-i="${i}" class="${i ? '' : 'ativo'}">${t}</button>`).join('');
    cx.querySelectorAll('button').forEach(bt => bt.onclick = () => { cx.querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === bt));
      const v = AT[+bt.dataset.i][1]; ['genero', 'raca', 'patrimonio', 'mandato'].forEach((k, i) => { document.getElementById('s-' + k).value = v[i]; document.getElementById('o-' + k).textContent = v[i] + '%'; regra[k] = v[i] / 100; });
      [['r-m', 'resM', 4], ['r-n', 'resN', 5]].forEach(([id, k, i]) => { regra[k] = v[i]; document.querySelectorAll(`#${id} button`).forEach(x => x.classList.toggle('ativo', +x.dataset.v === v[i])); }); simular(); });
    simular();
  }

  // =================================================================
  // 7. O QUE FICA (série histórica, validação do modelo, limites)
  // =================================================================
  function fim() {
    fase(6); hud.hidden = true; rolarTopo();
    const V = J.D.validacao;
    mostrar(`
      <div class="jg-tela">
        <p class="jg-chapeu">Fase 7 · O que fica</p>
        <h2>O filtro existe, e ele tem um perfil</h2>
        <p class="jg-lead">Homens brancos eram ${pct(S.grupos[3].cand, 0)} dos candidatos e são ${pct(S.grupos[3].el, 0)} dos eleitos. Mulheres negras eram ${pct(S.grupos[2].cand, 0)} e são ${pct(S.grupos[2].el, 0)}.
          E o jogo mostrou o porquê: com a mesma campanha, o ponto de partida decide quase tudo.</p>
        ${dado('O filtro está diminuindo? Devagar.', G.serie(), `<p>A Câmara está ficando um pouco mais parecida com o Brasil, mas, neste ritmo, ainda levaria décadas para chegar lá.</p>`, '2018 e 2022: Agência Câmara · 2026: TSE · população: Censo 2022')}
        ${V ? dado('Por que confiar no modelo do jogo?', `<div class="dado-lado">${G.roc()}<div><p class="dado-grande">AUC ${dec(V.auc, 2)}</p>
          <p>Sorteando um eleito e um não eleito, em <b>${pct(100 * V.auc, 0)}</b> das vezes o modelo dá a maior chance ao eleito (0,5 seria jogar uma moeda).</p></div></div>`, 'Curva ROC da regressão logística') : ''}
        <div class="limites"><h3>O que este jogo não sabe</h3><ul>
          <li><b>Associação não é causa:</b> o modelo não sabe de partido, coligação, campanha nem tempo de TV.</li>
          <li><b>Autodeclaração:</b> raça e patrimônio são o que cada candidato informou ao TSE; ${pct(S.semBens, 0)} não declararam bens.</li>
          <li><b>Mandato aproximado</b> pela ocupação declarada; vices e suplentes não entram.</li>
          <li><b>As semanas são regras de jogo:</b> só o ponto de partida, o efeito do partido e o caixa vêm diretamente dos dados.</li></ul></div>
        <div class="jg-acoes"><button type="button" class="jg-botao principal" id="b-denovo">Jogar de novo com outra pessoa</button>
          <a class="jg-sec" href="dossie.html#ato6">A Presidência →</a><a class="jg-sec" href="dossie.html#placar">O placar dos eleitos →</a><a class="jg-sec" href="dossie.html#busca">Procurar um candidato →</a><a class="jg-sec" href="dossie.html">Dossiê completo →</a></div>
        <p class="creditos">Projeto A2 · Métodos Estatísticos Aplicados às Ciências Sociais · [seu nome] · 2026<br>Dados: TSE (candidaturas, bens, votação, fotos e prestação de contas de 2026) e IBGE (Censo 2022).</p>
      </div>`);
    document.getElementById('b-denovo').onclick = perfil;
  }

  // ---------- teclado (modo apresentação): → ou Enter avança, 1 2 3 escolhem ----------
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea')) return;
    if (/^[1-3]$/.test(e.key)) { const op = document.querySelectorAll('.jg-opcao:not(:disabled)')[+e.key - 1]; if (op && !document.querySelector('.jg-consequencia')) op.click(); }
    if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.target === document.body)) { const bt = [...document.querySelectorAll('.jg-botao.principal')].filter(x => !x.disabled).pop(); if (bt) { e.preventDefault(); bt.click(); } }
  });

  // ---------- fotos: carregam depois da página ----------
  window.addEventListener('load', () => setTimeout(() => {
    ['fotos.js?v=7', 'fotos_jogo.js?v=1'].forEach(src => { const s = document.createElement('script'); s.src = src; s.onload = () => { if (st && !hud.hidden) desenharHud(); }; document.body.appendChild(s); });
  }, 400));

  capa();
})();
