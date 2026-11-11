// =====================================================================
// Quem cabe na Câmara? (versão 2) – gráficos e interatividade
// Os dados vêm do arquivo dados.js (variável DADOS), gerado no Colab.
// =====================================================================

// ---------- 0. Funções de apoio ----------
const COR = { eleito: '#e2620f', destaque: '#7b2cbf', base: '#cbc4b6', escuro: '#77717d' };
const SEM_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const pct = (x, casas = 1) => x.toLocaleString('pt-BR', { maximumFractionDigits: casas }) + '%';
const num = (x) => Math.round(x).toLocaleString('pt-BR');
const escreve = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };
const logistica = (x) => 1 / (1 + Math.exp(-x));

// cria um elemento SVG com atributos e o coloca dentro de "pai"
function svgEl(tag, atributos, pai) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const a in atributos) el.setAttribute(a, atributos[a]);
  if (pai) pai.appendChild(el);
  return el;
}

// monta uma tabela "Ver os números" (acessibilidade)
function tabela(id, cabecalho, linhas) {
  document.getElementById(id).innerHTML =
    '<table><tr>' + cabecalho.map(c => `<th>${c}</th>`).join('') + '</tr>' +
    linhas.map(l => '<tr>' + l.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</table>';
}

// avisa quando um elemento aparece na tela (usado em vários atos)
function quandoAparecer(el, funcao, margem = '-20% 0px') {
  const obs = new IntersectionObserver(entradas => {
    entradas.forEach(e => { if (e.isIntersecting) { funcao(); obs.disconnect(); } });
  }, { rootMargin: margem });
  obs.observe(el);
}

// =====================================================================
// 1. Transformar o texto do funil em uma lista de candidatos
//    Cada candidato tem 5 letras: eleito | gênero | raça | faixa de patrimônio | mandato
// =====================================================================
const candidatos = [];
for (let i = 0; i < DADOS.funil.length; i += 5) {
  const c = DADOS.funil.slice(i, i + 5);
  candidatos.push({
    eleito: c[0] === '1',
    mulher: c[1] === 'F',
    raca: c[2],                 // B = branca, N = negra, O = outras
    patrimonio: Number(c[3]),   // 0 a 4 (índice de DADOS.faixas_pat)
    mandato: c[4] === '1'
  });
}
const eleitos = candidatos.filter(c => c.eleito);
const naoEleitos = candidatos.filter(c => !c.eleito);

function proporcoes(teste) {
  return [100 * candidatos.filter(teste).length / candidatos.length,
          100 * eleitos.filter(teste).length / eleitos.length];
}

const GRUPOS = {
  2: { nome: 'Mulheres', teste: c => c.mulher },
  3: { nome: 'Pessoas negras', teste: c => c.raca === 'N' },
  4: { nome: 'Mulheres negras', teste: c => c.mulher && c.raca === 'N' },
  5: { nome: 'Patrimônio acima de R$ 1 milhão', teste: c => c.patrimonio >= 3 },
  6: { nome: 'Já tinha mandato', teste: c => c.mandato }
};

escreve('p0-cand', num(candidatos.length));
escreve('p1-eleitos', num(eleitos.length));
escreve('p1-taxa', pct(100 * eleitos.length / candidatos.length));
escreve('p1-um-em', Math.round(candidatos.length / eleitos.length));
for (const passo in GRUPOS) {
  const [cand, el] = proporcoes(GRUPOS[passo].teste);
  escreve('p' + passo + '-cand', pct(cand));
  escreve('p' + passo + '-el', pct(el));
}

// =====================================================================
// 2. Barra de progresso, menu lateral e contadores animados
// =====================================================================
const barra = document.getElementById('progresso');
window.addEventListener('scroll', () => {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  barra.style.width = (100 * window.scrollY / total) + '%';
});

const linksMenu = document.querySelectorAll('#menu a');
const obsMenu = new IntersectionObserver(entradas => {
  entradas.forEach(e => {
    if (e.isIntersecting) {
      linksMenu.forEach(a => a.classList.toggle('ativo', a.getAttribute('href') === '#' + e.target.id));
    }
  });
}, { rootMargin: '-50% 0px -50% 0px' });
document.querySelectorAll('section.ato').forEach(s => obsMenu.observe(s));

// números que "sobem" de 0 até o valor quando aparecem na tela
document.querySelectorAll('.conta').forEach(el => {
  const alvo = DADOS[el.dataset.valor];
  quandoAparecer(el, () => {
    const inicio = performance.now(), duracao = SEM_MOVIMENTO ? 0 : 1800;
    function passo(agora) {
      const k = duracao ? Math.min(1, (agora - inicio) / duracao) : 1;
      el.textContent = num(alvo * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }, '0px');
});

// =====================================================================
// 3. CAPA – "chuva" de pontos: 1 ponto = 10 candidatos; os laranja são eleitos
// =====================================================================
const chuva = document.getElementById('chuva');
const cc = chuva.getContext('2d');
let gotas = [], chuvaAtiva = true;

function prepararChuva() {
  chuva.width = chuva.offsetWidth * devicePixelRatio;
  chuva.height = chuva.offsetHeight * devicePixelRatio;
  const n = Math.round(candidatos.length / 10);
  const taxa = eleitos.length / candidatos.length;
  gotas = Array.from({ length: n }, (_, i) => ({
    x: Math.random() * chuva.width, y: Math.random() * chuva.height,
    v: (0.3 + Math.random() * 0.7) * devicePixelRatio,
    eleito: i < n * taxa
  }));
}
function desenharChuva() {
  cc.clearRect(0, 0, chuva.width, chuva.height);
  const r = 2.2 * devicePixelRatio;
  for (const g of gotas) {
    if (!SEM_MOVIMENTO) { g.y += g.v; if (g.y > chuva.height) g.y = -5; }
    cc.fillStyle = g.eleito ? COR.eleito : 'rgba(255,255,255,.13)';
    cc.beginPath(); cc.arc(g.x, g.y, g.eleito ? r * 1.4 : r, 0, 2 * Math.PI); cc.fill();
  }
  if (chuvaAtiva && !SEM_MOVIMENTO) requestAnimationFrame(desenharChuva);
}
prepararChuva();
desenharChuva();
window.addEventListener('resize', prepararChuva);
new IntersectionObserver(e => {           // pausa a animação quando a capa sai da tela
  const antes = chuvaAtiva;
  chuvaAtiva = e[0].isIntersecting;
  if (chuvaAtiva && !antes) desenharChuva();
}).observe(chuva);

// =====================================================================
// 4. ATO 1 – O FUNIL: os pontos se movem de um bloco para o outro
// =====================================================================
const canvas = document.getElementById('funil');
const ctx = canvas.getContext('2d');
const LARGURA = 900, ALTURA = 620, TOPO = 50, ALT_BLOCO = 560;
canvas.width = LARGURA * devicePixelRatio;
canvas.height = ALTURA * devicePixelRatio;
ctx.scale(devicePixelRatio, devicePixelRatio);

// o mesmo tamanho de ponto nos dois blocos, para que as áreas sejam comparáveis
const PASSO_PT = Math.sqrt(620 * ALT_BLOCO / candidatos.length);
const LADO_PT = PASSO_PT * 0.82;   // pontos quadrados: ocupam mais área e ficam bem mais visíveis

function arrumar(lista, x0, largura) {
  const colunas = Math.floor(largura / PASSO_PT);
  lista.forEach((c, i) => {
    c.tx = x0 + (i % colunas) * PASSO_PT + PASSO_PT / 2;
    c.ty = TOPO + Math.floor(i / colunas) * PASSO_PT + PASSO_PT / 2;
  });
}

let titulos = [];
function definirAlvos(passo) {
  const grupo = GRUPOS[passo];
  const ordena = lista => grupo ? [...lista].sort((a, b) => grupo.teste(b) - grupo.teste(a)) : lista;
  if (passo === 0) {
    arrumar(candidatos, 0, 620);
    candidatos.forEach(c => c.cor = COR.escuro);
    titulos = [['Todas as candidaturas (' + num(candidatos.length) + ')', 0]];
  } else {
    arrumar(ordena(naoEleitos), 0, 620);
    arrumar(ordena(eleitos), 660, 240);
    candidatos.forEach(c => {
      c.cor = grupo ? (grupo.teste(c) ? COR.destaque : COR.base) : (c.eleito ? COR.eleito : COR.base);
    });
    titulos = [['Não eleitos (' + num(naoEleitos.length) + ')', 0], ['Eleitos (' + num(eleitos.length) + ')', 660]];
  }
  const legenda = passo === 0 ? [] : grupo ? [[grupo.nome, COR.destaque], ['Demais', COR.base]]
                                           : [['Eleito', COR.eleito], ['Não eleito', COR.base]];
  document.getElementById('legenda-funil').innerHTML = legenda
    .map(([nome, cor]) => `<span style="--cor:${cor}">${nome}</span>`).join('');
}

function desenharFunil() {
  ctx.clearRect(0, 0, LARGURA, ALTURA);
  ctx.fillStyle = '#16141d';
  ctx.font = '700 18px Inter, Arial, sans-serif';
  titulos.forEach(([texto, x]) => ctx.fillText(texto, x, 30));
  // um único "caminho" por cor: bem mais rápido do que desenhar ponto a ponto
  const caminhos = {};
  for (const c of candidatos) {
    const p = caminhos[c.cor] || (caminhos[c.cor] = new Path2D());
    p.rect(c.x - LADO_PT / 2, c.y - LADO_PT / 2, LADO_PT, LADO_PT);
  }
  for (const cor in caminhos) { ctx.fillStyle = cor; ctx.fill(caminhos[cor]); }
}

let animacao = null;
function irParaPasso(passo) {
  definirAlvos(passo);
  candidatos.forEach(c => { c.x0 = c.x; c.y0 = c.y; c.atraso = Math.random() * 350; });
  const inicio = performance.now(), duracao = SEM_MOVIMENTO ? 0 : 750;
  cancelAnimationFrame(animacao);
  function quadro(agora) {
    let terminou = true;
    for (const c of candidatos) {
      let k = duracao ? (agora - inicio - c.atraso) / duracao : 1;
      k = Math.max(0, Math.min(1, k));
      if (k < 1) terminou = false;
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // suaviza o movimento
      c.x = c.x0 + (c.tx - c.x0) * e;
      c.y = c.y0 + (c.ty - c.y0) * e;
    }
    desenharFunil();
    if (!terminou) animacao = requestAnimationFrame(quadro);
  }
  animacao = requestAnimationFrame(quadro);
}

// posição inicial e observação dos passos
definirAlvos(0);
candidatos.forEach(c => { c.x = c.tx; c.y = c.ty; });
desenharFunil();
const obsPassos = new IntersectionObserver(entradas => {
  entradas.forEach(e => {
    if (e.isIntersecting) {
      document.querySelectorAll('.passo').forEach(p => p.classList.remove('ativo'));
      e.target.classList.add('ativo');
      irParaPasso(Number(e.target.dataset.passo));
    }
  });
}, { rootMargin: '-45% 0px -45% 0px' });
document.querySelectorAll('.passo').forEach(p => obsPassos.observe(p));

// =====================================================================
// 5. ATO 2 – CANDIDATURAS FANTASMAS (votos por gênero, ideia C)
// =====================================================================
const L = DADOS.laranjas;
escreve('lar-mulheres', pct(L.Feminino.menos_100));
escreve('lar-homens', pct(L.Masculino.menos_100));
const vezes = L.Feminino.menos_100 / L.Masculino.menos_100;
escreve('lar-nota', `Uma candidata teve ${vezes.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ` +
  `vezes mais chance do que um candidato de ficar abaixo de 100 votos. Votação inexpressiva é um ` +
  `dos indícios de candidatura fictícia listados pelo TSE (Súmula 73), mas sozinha não prova fraude.`);

const svgL = document.getElementById('laranjas');
const BASE_Y = 250, LARG_FAIXA = 700 / L.faixas.length;
// tamanho dos pontos ajustado para que a coluna mais alta caiba no gráfico
const maiorColuna = Math.max(...L.Feminino.dist, ...L.Masculino.dist);
const ESP = Math.min(11, 200 / Math.ceil(maiorColuna / 3)), RAIO = ESP * 0.4;
// moldura da "zona" de menos de 100 votos (as duas primeiras faixas)
svgEl('rect', { x: 34, y: 10, width: 2 * LARG_FAIXA - 8, height: BASE_Y + 6 - 10, rx: 10, class: 'zona' }, svgL);
svgEl('text', { x: 46, y: 32, class: 'zona-txt' }, svgL).textContent = 'MENOS DE 100 VOTOS';
let ordemPonto = 0;
L.faixas.forEach((faixa, i) => {
  const cx = 30 + LARG_FAIXA * i + LARG_FAIXA / 2;
  [['Feminino', cx - 4 - 3 * ESP, 'p-mulher'], ['Masculino', cx + 4, 'p-homem']].forEach(([g, x0, classe]) => {
    const n = Math.round(L[g].dist[i]);              // 1 ponto = 1% do grupo
    for (let k = 0; k < n; k++) {
      const p = svgEl('circle', { cx: x0 + (k % 3) * ESP + ESP / 2, cy: BASE_Y - Math.floor(k / 3) * ESP - ESP / 2,
                                  r: RAIO, class: classe + ' aparece' }, svgL);
      p.style.transitionDelay = (ordemPonto++ * 4) + 'ms';
    }
    svgEl('text', { x: x0 + 1.5 * ESP, y: BASE_Y - Math.ceil(n / 3) * ESP - 8, 'text-anchor': 'middle' }, svgL)
      .textContent = pct(L[g].dist[i], 0);
  });
  svgEl('text', { x: cx, y: BASE_Y + 24, 'text-anchor': 'middle' }, svgL).textContent = faixa;
});
svgEl('text', { x: 380, y: BASE_Y + 50, 'text-anchor': 'middle' }, svgL).textContent = 'votos recebidos →';
quandoAparecer(svgL, () => svgL.classList.add('visivel'));
tabela('tab-laranjas', ['Faixa de votos', 'Mulheres', 'Homens'],
  L.faixas.map((f, i) => [f, pct(L.Feminino.dist[i]), pct(L.Masculino.dist[i])]));

// =====================================================================
// 6. ATO 3 – O MAPA DO FILTRO (mapa em quadrados, ideia D)
// =====================================================================
const POSICAO = { RR: [1, 0], AP: [3, 0],
  AM: [1, 1], PA: [2, 1], MA: [3, 1], CE: [4, 1], RN: [5, 1],
  AC: [0, 2], RO: [1, 2], TO: [2, 2], PI: [3, 2], PE: [4, 2], PB: [5, 2],
  MT: [1, 3], GO: [2, 3], BA: [3, 3], SE: [4, 3], AL: [5, 3],
  MS: [1, 4], DF: [2, 4], MG: [3, 4], ES: [4, 4],
  PR: [2, 5], SP: [3, 5], RJ: [4, 5], SC: [2, 6], RS: [2, 7] };
const NOME_GRUPO = { mulheres: 'Mulheres', negras: 'Pessoas negras' };
let grupoMapa = 'mulheres', ufSelecionada = null;

// mistura duas cores hexadecimais (k de 0 a 1)
function misturar(c1, c2, k) {
  const a = c1.match(/\w\w/g).map(h => parseInt(h, 16)), b = c2.match(/\w\w/g).map(h => parseInt(h, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
function corMapa(perda) {
  if (perda === null) return '#e6e0d4';
  if (perda < 0) return '#f6c39b';                         // o grupo ganhou espaço
  return misturar('#efe6f8', '#3f1078', Math.min(perda / 30, 1));
}
const perdaUF = uf => DADOS.ufs[uf] ? DADOS.ufs[uf][grupoMapa][0] - DADOS.ufs[uf][grupoMapa][1] : null;

const svgM = document.getElementById('mapa');
const quadrados = {};
for (const uf in POSICAO) {
  const [col, lin] = POSICAO[uf];
  const g = svgEl('g', {}, svgM);
  quadrados[uf] = {
    rect: svgEl('rect', { x: col * 78 + 4, y: lin * 76 + 4, width: 72, height: 70, rx: 8 }, g),
    sigla: svgEl('text', { x: col * 78 + 40, y: lin * 76 + 34, 'font-weight': 800, 'font-size': 16 }, g),
    valor: svgEl('text', { x: col * 78 + 40, y: lin * 76 + 54, 'font-size': 12 }, g)
  };
  quadrados[uf].sigla.textContent = uf;
  quadrados[uf].rect.addEventListener('mouseenter', () => mostrarUF(uf));
  quadrados[uf].rect.addEventListener('click', () => mostrarUF(uf));
}

function desenharMapa() {
  for (const uf in quadrados) {
    const p = perdaUF(uf), q = quadrados[uf];
    q.rect.setAttribute('fill', corMapa(p));
    const escuro = p !== null && p > 15;
    q.sigla.setAttribute('fill', escuro ? 'white' : '#16141d');
    q.valor.setAttribute('fill', escuro ? 'white' : '#16141d');
    q.valor.textContent = p === null ? '—' : (p > 0 ? '−' : '+') + Math.abs(p).toFixed(0) + ' pp';
  }
  document.getElementById('legenda-mapa').innerHTML =
    `<span>0 pp</span><i style="background:linear-gradient(90deg,#efe6f8,#3f1078)"></i>` +
    `<span>30 pp ou mais de perda</span><i style="width:14px;background:#f6c39b"></i><span>ganhou espaço</span>`;
  const comDados = Object.keys(DADOS.ufs).filter(uf => POSICAO[uf]);
  const pior = comDados.sort((a, b) => perdaUF(b) - perdaUF(a))[0];
  mostrarUF(ufSelecionada || pior);
  tabela('tab-mapa', ['UF', 'Candidatos', 'Eleitos', '% candidatos', '% eleitos', 'Diferença (pp)'],
    comDados.map(uf => { const d = DADOS.ufs[uf], [c, e] = d[grupoMapa];
      return [uf, d.n_cand, d.n_el, pct(c), pct(e), (e - c).toFixed(1)]; }));
}

function mostrarUF(uf) {
  ufSelecionada = uf;
  for (const u in quadrados) quadrados[u].rect.classList.toggle('sel', u === uf);
  const d = DADOS.ufs[uf], painel = document.getElementById('painel-uf');
  if (!d) { painel.innerHTML = `<h3>${uf}</h3><p>Sem dados para este estado.</p>`; return; }
  const [c, e] = d[grupoMapa];
  painel.innerHTML = `<h3>${uf}</h3>
    <p>${NOME_GRUPO[grupoMapa]} eram <b>${pct(c)}</b> dos candidatos a deputado e são
       <b>${pct(e)}</b> dos eleitos.</p>
    <div class="barra-par">Candidatos<div style="width:${c}%;background:var(--base)"></div>
      Eleitos<div style="width:${e}%;background:var(--eleito)"></div></div>
    <p class="nota">${num(d.n_cand)} candidatos, ${num(d.n_el)} eleitos.
       ${d.n_el < 30 ? 'Poucos eleitos: os percentuais deste estado variam muito.' : ''}</p>`;
}

document.querySelectorAll('#botoes-mapa button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#botoes-mapa button').forEach(x => x.classList.remove('ativo'));
  b.classList.add('ativo');
  grupoMapa = b.dataset.grupo;
  desenharMapa();
}));
desenharMapa();

// =====================================================================
// 7. ATO 4 – O QUE PESA MAIS (razões de chances + intervalo de confiança, ideia B)
// =====================================================================
const M = DADOS.modelo, IC = DADOS.ic;
const or = k => [Math.exp(M[k]), Math.exp(IC[k][0]), Math.exp(IC[k][1])];
const orInv = k => [Math.exp(-M[k]), Math.exp(-IC[k][1]), Math.exp(-IC[k][0])];   // inverte o grupo
const pesos = [
  ['Já ter mandato político', ...or('C(tem_mandato)[T.Sim]')],
  ['Patrimônio 10 vezes maior', ...or('log_patrimonio')],
  ['Ser homem (em vez de mulher)', ...or('C(genero)[T.Masculino]')],
  ['Ser branco (em vez de negro)', ...orInv('C(raca)[T.Negra]')],
  ['Ter ensino superior completo', ...or('C(superior)[T.Sim]')]
].sort((a, b) => b[1] - a[1]);

const svgP = document.getElementById('pesos');
const minX = Math.min(0.8, ...pesos.map(p => p[2])) / 1.15, maxX = Math.max(...pesos.map(p => p[3])) * 1.3;
const xP = v => 260 + (Math.log(v) - Math.log(minX)) / (Math.log(maxX) - Math.log(minX)) * 470;
const eixoX = svgEl('g', { class: 'eixo-x' }, svgP);
[0.25, 0.5, 1, 2, 4, 8, 16, 32].filter(v => v >= minX && v <= maxX).forEach(v => {
  svgEl('line', { x1: xP(v), x2: xP(v), y1: 20, y2: 300, class: v === 1 ? 'um' : 'grade' }, eixoX);
  svgEl('text', { x: xP(v), y: 320, 'text-anchor': 'middle' }, eixoX).textContent = '×' + v.toLocaleString('pt-BR');
});
pesos.forEach(([nome, est, lo, hi], i) => {
  const y = 50 + i * 56;
  const g = svgEl('g', { class: 'aparece' }, svgP);
  g.style.transitionDelay = (i * 150) + 'ms';
  svgEl('text', { x: 0, y: y + 5 }, g).textContent = nome;
  svgEl('line', { x1: xP(lo), x2: xP(hi), y1: y, y2: y, class: 'ic' }, g);
  svgEl('circle', { cx: xP(est), cy: y, r: 9 }, g);
  svgEl('text', { x: xP(hi) + 10, y: y + 5, 'font-weight': 800 }, g)
    .textContent = '× ' + est.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
});
quandoAparecer(svgP, () => svgP.classList.add('visivel'));

// =====================================================================
// 8. ATO 5 – A CÂMARA POSSÍVEL (hemiciclo com cenário "sem filtro", ideia A)
// =====================================================================
const svgH = document.getElementById('hemiciclo');
const TOTAL = 513, FILEIRAS = 12, CX = 300, CY = 310, R_INT = 110, R_EXT = 290;
const raios = Array.from({ length: FILEIRAS }, (_, i) => R_INT + i * (R_EXT - R_INT) / (FILEIRAS - 1));
const somaRaios = raios.reduce((a, b) => a + b, 0);
const porFileira = raios.map(r => Math.round(TOTAL * r / somaRaios));
porFileira[FILEIRAS - 1] += TOTAL - porFileira.reduce((a, b) => a + b, 0);

const cadeiras = [];
raios.forEach((r, f) => {
  const n = porFileira[f];
  for (let k = 0; k < n; k++) {
    const angulo = Math.PI - (k / (n - 1)) * Math.PI;
    cadeiras.push({ x: CX + r * Math.cos(angulo), y: CY - r * Math.sin(angulo), angulo });
  }
});
cadeiras.sort((a, b) => b.angulo - a.angulo);
const raioCadeira = 0.42 * (R_EXT - R_INT) / (FILEIRAS - 1);
const dica = document.getElementById('dica');
cadeiras.forEach((c, i) => {
  c.el = svgEl('circle', { cx: c.x.toFixed(1), cy: c.y.toFixed(1), r: raioCadeira.toFixed(1) }, svgH);
  c.el.addEventListener('mousemove', ev => {
    dica.hidden = false;
    dica.textContent = `Cadeira ${i + 1} de 513 · ${ROTULO[c.grupo]}`;
    dica.style.left = (ev.clientX + 14) + 'px';
    dica.style.top = (ev.clientY + 14) + 'px';
  });
  c.el.addEventListener('mouseleave', () => dica.hidden = true);
});

function emCadeiras(percentuais) {
  const nomes = Object.keys(percentuais);
  const brutos = nomes.map(n => TOTAL * percentuais[n] / 100);
  const inteiros = brutos.map(Math.floor);
  const faltam = TOTAL - inteiros.reduce((a, b) => a + b, 0);
  const ordem = brutos.map((b, i) => [b - inteiros[i], i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; j < faltam; j++) inteiros[ordem[j][1]]++;
  return nomes.map((n, i) => [n, inteiros[i]]);
}

const ROTULO = { Feminino: 'Mulheres', Masculino: 'Homens',
                 Negra: 'Pessoas negras', Branca: 'Pessoas brancas', Outras: 'Indígenas e amarelas' };
const COR_HEMI = { Feminino: COR.destaque, Masculino: COR.base,
                   Negra: COR.destaque, Branca: COR.base, Outras: COR.escuro };
const TEXTO_CENARIO = { real: 'na Câmara eleita em 2026',
                        candidatos: 'se os deputados fossem sorteados entre os candidatos',
                        sem_filtro: 'sem o peso do grupo (modelo)',
                        brasil: 'se a Câmara fosse um retrato do Brasil' };
const GRUPO_TXT = { genero: ['ser mulher', 'mulheres'], raca: ['ser uma pessoa negra', 'pessoas negras'] };
// uma frase que explica, em linguagem simples, o cenário escolhido
function explicarCenario() {
  const [traco, grupo] = GRUPO_TXT[dimensao];
  const frases = {
    real: `<b>① A Câmara real:</b> as 513 cadeiras como ficaram depois da eleição de 2026.`,
    candidatos: `<b>② Sorteada entre os candidatos:</b> e se, em vez de votar, sorteássemos os 513 deputados ` +
      `entre todas as pessoas que se candidataram? A Câmara teria a mesma proporção de ${grupo} que havia nas ` +
      `candidaturas. A diferença entre ① e ② é o que a votação mudou.`,
    sem_filtro: `<b>③ Se ${traco} não pesasse:</b> os mesmos candidatos, cada um com o seu patrimônio, ` +
      `escolaridade e mandato, mas sem a desvantagem de ${traco} que o modelo estatístico do Ato 04 encontrou. ` +
      `Mostra quanto da diferença não se explica por dinheiro nem por experiência.`,
    brasil: `<b>④ Um retrato do Brasil:</b> se a Câmara tivesse a mesma proporção de ${grupo} que a população ` +
      `brasileira (Censo 2022). É a referência de uma representação perfeitamente proporcional.`
  };
  document.getElementById('cenario-explica').innerHTML = frases[cenario];
  document.getElementById('botao-sem-filtro').textContent = `③ Se ${traco} não pesasse`;
}
const OUTRAS = { genero: 'patrimônio, escolaridade, mandato e raça',
                 raca: 'patrimônio, escolaridade, mandato e gênero' };
let dimensao = 'genero', cenario = 'real';

function desenharHemiciclo() {
  const grupos = emCadeiras(DADOS.hemiciclo[dimensao][cenario]);
  let i = 0;
  grupos.forEach(([nome, n]) => {
    for (let k = 0; k < n; k++) { cadeiras[i].grupo = nome; cadeiras[i++].el.setAttribute('fill', COR_HEMI[nome]); }
  });
  const [principal, nPrincipal] = grupos[0];
  escreve('hemi-numero', nPrincipal);
  const texto = cenario === 'sem_filtro' ? `se ${dimensao === 'genero' ? 'o gênero' : 'a raça'} não pesasse`
                                         : TEXTO_CENARIO[cenario];
  escreve('hemi-texto', `cadeiras de ${ROTULO[principal].toLowerCase()} ${texto}`);
  document.getElementById('legenda-hemi').innerHTML = grupos
    .map(([nome, n]) => `<span style="--cor:${COR_HEMI[nome]}">${ROTULO[nome]}: ${n}</span>`).join('');
  explicarDiferenca(principal);
  explicarCenario();
}

// decomposição: quanto da diferença o modelo explica pelas outras características
function explicarDiferenca(principal) {
  const assentos = c => emCadeiras(DADOS.hemiciclo[dimensao][c])[0][1];
  const C = assentos('candidatos'), R = assentos('real'), S = assentos('sem_filtro');
  const total = C - R;
  const recursos = Math.max(0, Math.min(total, C - S));   // parte explicada pelas outras características
  const resto = total - recursos;                           // parte que sobra: o "filtro"
  const caixa = document.getElementById('decomp'), nome = ROTULO[principal].toLowerCase();
  if (total <= 0) {
    caixa.innerHTML = `<p>Nestes dados, a Câmara real (①) tem tantas cadeiras de ${nome} quanto a
      sorteada entre os candidatos (②): não há diferença a explicar.</p>`;
    return;
  }
  const pr = 100 * recursos / total;
  caixa.innerHTML = `<h3>De onde vem a diferença?</h3>
    <p>Sorteada entre os candidatos (②), a Câmara teria <b>${C}</b> cadeiras de ${nome}. Na Câmara
      real (①) são <b>${R}</b>: a votação "tirou" <b>${total}</b> cadeiras. Por quê?</p>
    <div class="decomp-barra">
      <div style="width:${pr}%;background:var(--base);color:#16141d">${recursos || ""}</div>
      <div style="width:${100 - pr}%;background:var(--destaque)">${resto || ""}</div></div>
    <p class="nota"><b>Cinza:</b> cadeiras perdidas porque, em média, esse grupo tinha menos
      patrimônio, escolaridade ou mandato (diferença entre ② e ③).
      <b style="color:var(--destaque)">Roxo:</b> cadeiras perdidas mesmo comparando candidatos iguais
      nessas características: o peso do próprio grupo (diferença entre ③ e ①).</p>`;
  tabela('tab-hemi', ['Cenário', ...Object.keys(DADOS.hemiciclo[dimensao].real).map(k => ROTULO[k])],
    Object.keys(TEXTO_CENARIO).map(c => [TEXTO_CENARIO[c], ...emCadeiras(DADOS.hemiciclo[dimensao][c]).map(g => g[1])]));
}

function ligarBotoes(idGrupo, aoClicar) {
  document.querySelectorAll('#' + idGrupo + ' button').forEach(botao => {
    botao.addEventListener('click', () => {
      document.querySelectorAll('#' + idGrupo + ' button').forEach(b => b.classList.remove('ativo'));
      botao.classList.add('ativo');
      aoClicar(botao.dataset);
      desenharHemiciclo();
    });
  });
}
ligarBotoes('botoes-dimensao', d => dimensao = d.dimensao);
ligarBotoes('botoes-cenario', d => cenario = d.cenario);
desenharHemiciclo();

// =====================================================================
// 9. ATO 6 – A PRESIDÊNCIA (um cartão por candidatura)
// =====================================================================
const MOSTRAR_NOMES = true;      // mude para false para esconder nomes e partidos
const P = DADOS.presidente || [];
const vencedor = P.find(c => c.eleito);
const nomePres = c => MOSTRAR_NOMES ? `${c.nome} (${c.partido})` : `Candidatura ${P.indexOf(c) + 1}`;
const reais = v => v >= 1e6 ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi'
                 : v >= 1e3 ? 'R$ ' + Math.round(v / 1e3).toLocaleString('pt-BR') + ' mil'
                 : v > 0 ? 'R$ ' + Math.round(v).toLocaleString('pt-BR') : 'Nenhum bem';
const TRACOS = {
  genero: { Feminino: 'Mulher', Masculino: 'Homem' },
  raca: { Branca: 'Branca', Negra: 'Preta ou parda', Outras: 'Indígena ou amarela' },
  superior: { Sim: 'Com ensino superior', Não: 'Sem ensino superior' },
  tem_mandato: { Sim: 'Já tinha mandato', Não: 'Sem mandato' }
};

if (P.length) {
  const conta = teste => P.filter(teste).length;
  const patrimonios = P.map(c => c.patrimonio).sort((a, b) => a - b);
  const mediana = patrimonios[Math.floor((patrimonios.length - 1) / 2)];
  document.getElementById('pres-resumo').innerHTML = [
    `<b>${P.length}</b> candidaturas`,
    `<b>${conta(c => c.genero === 'Feminino')}</b> mulheres`,
    `<b>${conta(c => c.raca === 'Negra')}</b> pessoas negras`,
    `<b>${conta(c => c.superior === 'Sim')}</b> com ensino superior`,
    `<b>${conta(c => c.tem_mandato === 'Sim')}</b> com mandato`,
    `patrimônio mediano: <b>${reais(mediana)}</b>`
  ].map(t => `<span>${t}</span>`).join('');

  const maxVotos = Math.max(...P.map(c => c.pct_votos));
  document.getElementById('pres-cartoes').innerHTML = P.map((c, i) => `
    <div class="cartao ${c.eleito ? 'venceu' : ''}">
      ${c.eleito ? `<span class="selo">${c.genero === 'Feminino' ? 'ELEITA' : 'ELEITO'}</span>` : ''}
      <span class="posicao">${i + 1}º em votos</span>
      <h3>${MOSTRAR_NOMES ? c.nome + ' <span class="partido">' + c.partido + '</span>' : 'Candidatura ' + (i + 1)}</h3>
      <div class="votos"><i style="width:${100 * c.pct_votos / maxVotos}%"></i></div>
      ${pct(c.pct_votos)} dos votos no 1º turno
      <ul>
        <li>${TRACOS.genero[c.genero] || c.genero}</li>
        <li>${TRACOS.raca[c.raca] || c.raca}</li>
        <li>${c.faixa_etaria === '70+' ? '70 anos ou mais' : c.faixa_etaria.replace('–', ' a ') + ' anos'}</li>
        <li>${TRACOS.superior[c.superior]}</li>
        <li>${reais(c.patrimonio)}</li>
        <li>${TRACOS.tem_mandato[c.tem_mandato]}</li>
      </ul>
    </div>`).join('');
} else {
  document.getElementById('pres-cartoes').innerHTML =
    '<p>Sem dados da Presidência: rode a célula extra do Colab (D.11) e baixe o dados.js de novo.</p>';
}

// =====================================================================
// 10. ATO 7 – O TESTE NA URNA (com intervalo de confiança e resultado compartilhável)
// =====================================================================
const ROT_PAT = ['Nenhum bem', 'Até R$ 100 mil', 'De R$ 100 mil a R$ 1 milhão',
                 'De R$ 1 a 10 milhões', 'Mais de R$ 10 milhões'];
const idades = Object.keys(DADOS.eixos['Deputado Estadual'].faixa_etaria).sort();
const CARGOS = [['Deputado Estadual', 'Deputado(a) estadual'], ['Deputado Federal', 'Deputado(a) federal'],
                ['Senador', 'Senador(a)'], ['Deputado Distrital', 'Deputado(a) distrital (DF)']];
if (P.length) CARGOS.push(['Presidente', 'Presidente da República']);
const PERGUNTAS = [
  { campo: 'cargo', titulo: 'A qual cargo você se candidataria?', opcoes: CARGOS },
  { campo: 'genero', titulo: 'Gênero', opcoes: [['Feminino', 'Mulher'], ['Masculino', 'Homem']] },
  { campo: 'raca', titulo: 'Cor/raça',
    opcoes: [['Branca', 'Branca'], ['Negra', 'Preta ou parda'], ['Outras', 'Indígena ou amarela']] },
  { campo: 'faixa_etaria', titulo: 'Idade',
    opcoes: idades.map(v => [v, v === '70+' ? '70 ou mais' : v.replace('–', ' a ')]) },
  { campo: 'superior', titulo: 'Você tem ensino superior completo?', opcoes: [['Sim', 'Sim'], ['Não', 'Não']] },
  { campo: 'faixa_patrimonio', titulo: 'Patrimônio (soma dos seus bens)',
    opcoes: DADOS.faixas_pat.map((v, i) => [v, ROT_PAT[i]]) },
  { campo: 'tem_mandato', titulo: 'Você já tem mandato político?', opcoes: [['Não', 'Não'], ['Sim', 'Sim']] }
];
let atual = 0, escolha = null, respostas = {}, somLigado = true, audio = null;

// --- som da urna (Web Audio) ---
function bip(freq, inicio, duracao) {
  if (!somLigado) return;
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  const o = audio.createOscillator(), g = audio.createGain();
  o.type = 'square'; o.frequency.value = freq; g.gain.value = 0.05;
  o.connect(g); g.connect(audio.destination);
  o.start(audio.currentTime + inicio); o.stop(audio.currentTime + inicio + duracao);
}
const somFim = () => { for (let i = 0; i < 4; i++) bip(1050, i * 0.11, 0.07); bip(1050, 0.46, 0.4); };

// --- tela da urna ---
const tela = document.getElementById('tela');
function desenharTela(aviso = '') {
  if (atual >= PERGUNTAS.length) { tela.innerHTML = '<p class="tela-fim">FIM</p>'; return; }
  const p = PERGUNTAS[atual];
  tela.innerHTML = `<p class="tela-topo">Pergunta ${atual + 1} de ${PERGUNTAS.length}</p>
    <p class="tela-pergunta">${p.titulo}</p>
    ${p.opcoes.map(([v, rot], i) => `<button type="button" class="opcao ${escolha === i ? 'marcada' : ''}"
       data-i="${i}"><span class="n">${i + 1}</span>${rot}</button>`).join('')}
    <p class="tela-rodape">${aviso || 'Aperte o número da opção e depois CONFIRMA. CORRIGE volta.'}</p>`;
  tela.querySelectorAll('.opcao').forEach(b => b.addEventListener('click', () => escolher(Number(b.dataset.i))));
}
function escolher(i) {
  if (atual >= PERGUNTAS.length || i >= PERGUNTAS[atual].opcoes.length) return;
  escolha = i; bip(880, 0, 0.05); desenharTela();
}
function confirmar() {
  if (atual >= PERGUNTAS.length) return;
  if (escolha === null) { desenharTela('Escolha uma opção antes de confirmar.'); return; }
  const p = PERGUNTAS[atual];
  respostas[p.campo] = p.opcoes[escolha][0];
  atual++; escolha = null;
  desenharTela();
  if (atual === PERGUNTAS.length) { somFim(); setTimeout(() => mostrarResultado(respostas, true), 900); }
  else bip(1200, 0, 0.06);
}
function corrigir() {
  if (escolha !== null) { escolha = null; }
  else if (atual > 0 && atual < PERGUNTAS.length) { atual--; }
  bip(500, 0, 0.08); desenharTela();
}

// teclado numérico da urna
const teclas = document.getElementById('teclas');
[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach(d => {
  const t = document.createElement('button');
  t.type = 'button'; t.className = 'tecla' + (d === 0 ? ' zero' : ''); t.textContent = d;
  t.addEventListener('click', () => escolher(d - 1));
  teclas.appendChild(t);
});
document.getElementById('t-confirma').addEventListener('click', confirmar);
document.getElementById('t-corrige').addEventListener('click', corrigir);
document.getElementById('t-som').addEventListener('click', e => {
  somLigado = !somLigado; e.target.textContent = somLigado ? 'SOM' : 'MUDO';
});
// também funciona com o teclado do computador, quando a urna está na tela
let urnaNaTela = false;
new IntersectionObserver(e => urnaNaTela = e[0].isIntersecting).observe(tela);
document.addEventListener('keydown', e => {
  if (!urnaNaTela) return;
  if (/^[1-9]$/.test(e.key)) escolher(Number(e.key) - 1);
  if (e.key === 'Enter') { e.preventDefault(); confirmar(); }
  if (e.key === 'Backspace') corrigir();
});

// --- chance pelo modelo, com intervalo de confiança de 95% ---
function chanceComIC(r) {
  const v = { 'Intercept': 1, 'log_patrimonio': DADOS.log_pat_faixa[r.faixa_patrimonio] || 0 };
  v['C(cargo)[T.' + r.cargo + ']'] = 1;              // Deputado Distrital é a referência
  if (r.tem_mandato === 'Sim') v['C(tem_mandato)[T.Sim]'] = 1;
  if (r.genero === 'Masculino') v['C(genero)[T.Masculino]'] = 1;
  if (r.raca !== 'Branca') v['C(raca)[T.' + r.raca + ']'] = 1;
  if (r.superior === 'Sim') v['C(superior)[T.Sim]'] = 1;
  let x = 0, variancia = 0;
  for (const a in v) {
    if (!(a in M)) continue;
    x += v[a] * M[a];
    for (const b in v) if (b in M) variancia += v[a] * v[b] * DADOS.cov[a][b];
  }
  const ep = Math.sqrt(variancia);                     // erro-padrão na escala logit
  return [logistica(x), logistica(x - 1.96 * ep), logistica(x + 1.96 * ep)];
}

const NOMES_EIXOS = { genero: 'Gênero', raca: 'Cor/raça', faixa_etaria: 'Idade',
                      superior: 'Ensino superior', faixa_patrimonio: 'Patrimônio',
                      tem_mandato: 'Já tem mandato' };
const rotuloDe = (campo, valor) => PERGUNTAS.find(p => p.campo === campo).opcoes.find(o => o[0] === valor)[1];
let ultimo = null;

// --- eleitos de 2026, para "quem se parece com você" ---
const ELEITOS = DADOS.eleitos ? DADOS.eleitos.linhas.map(l =>
  Object.fromEntries(DADOS.eleitos.campos.map((campo, i) => [campo, l[i]]))) : [];

// sorteio que dá sempre o mesmo resultado para as mesmas respostas
// (assim o link compartilhado mostra as mesmas pessoas)
function sorteador(texto) {
  let s = 0;
  for (const ch of texto) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function maisParecidos(r, grupo, quantos = 3) {
  const eixos = Object.keys(NOMES_EIXOS), aleatorio = sorteador(JSON.stringify(r));
  return grupo.map(c => ({ c, iguais: eixos.filter(e => c[e] === r[e]), sorte: aleatorio() }))
    .sort((a, b) => b.iguais.length - a.iguais.length || a.sorte - b.sorte)
    .slice(0, quantos);
}
const traco = (campo, valor) =>
  campo === 'faixa_etaria' ? (valor === '70+' ? '70 anos ou mais' : valor.replace('–', ' a ') + ' anos')
  : campo === 'faixa_patrimonio' ? (ROT_PAT[DADOS.faixas_pat.indexOf(valor)] || valor)
  : (TRACOS[campo] && TRACOS[campo][valor]) || valor;
const nomeCurto = c => !MOSTRAR_NOMES ? (c.uf ? 'Eleito(a) de ' + c.uf : nomePres(c))
                       : `${c.nome} (${c.partido}${c.uf ? '-' + c.uf : ''})`;

function mostrarParecidos(r) {
  const presidente = r.cargo === 'Presidente';
  const grupo = presidente ? P : ELEITOS.filter(c => c.cargo === r.cargo);
  const caixa = document.getElementById('res-parecidos');
  if (!grupo.length) {
    escreve('parecidos-explica', '');
    caixa.innerHTML = '<p>Rode a célula extra do Colab (D.14) e baixe o dados.js de novo para ver quem se parece com você.</p>';
    return [];
  }
  const lista = maisParecidos(r, grupo), total = Object.keys(NOMES_EIXOS).length;
  escreve('parecidos-explica', (presidente
    ? 'As candidaturas à Presidência com o perfil mais parecido com o seu.'
    : `Entre os ${num(grupo.length)} eleitos para ${rotuloDe('cargo', r.cargo).toLowerCase()} em 2026, estes são os que mais se parecem com você.`)
    + ' Em destaque, o que vocês têm em comum.'
    + (lista[0].iguais.length < total ? ' Ninguém tem exatamente o seu perfil.' : ''));
  caixa.innerHTML = lista.map(({ c, iguais }) => `
    <div class="cartao">
      ${presidente && c.eleito ? `<span class="selo">${c.genero === 'Feminino' ? 'ELEITA' : 'ELEITO'}</span>` : ''}
      <span class="posicao">${iguais.length} de ${total} características iguais</span>
      <h3>${MOSTRAR_NOMES ? `${c.nome} <span class="partido">${c.partido}${c.uf ? ' · ' + c.uf : ''}</span>` : nomeCurto(c)}</h3>
      <ul>${Object.keys(NOMES_EIXOS).map(e =>
        `<li class="${iguais.includes(e) ? 'igual' : ''}">${traco(e, c[e])}</li>`).join('')}</ul>
    </div>`).join('');
  return lista.map(x => x.c);
}

// o que pesa a favor e contra, pelas respostas, segundo os coeficientes do modelo
function favorContra(r) {
  const favor = [], contra = [];
  const lado = (ajuda, texto) => (ajuda ? favor : contra).push(texto);
  const bM = M['C(tem_mandato)[T.Sim]'], bH = M['C(genero)[T.Masculino]'], bS = M['C(superior)[T.Sim]'];
  if (r.tem_mandato === 'Sim') lado(bM > 0, 'já ter mandato'); else lado(bM < 0, 'não ter mandato');
  if (r.genero === 'Masculino') lado(bH > 0, 'ser homem'); else lado(bH < 0, 'ser mulher');
  if (r.raca === 'Branca') lado((M['C(raca)[T.Negra]'] || 0) < 0, 'ser branco(a)');
  else lado((M['C(raca)[T.' + r.raca + ']'] || 0) > 0,
            r.raca === 'Negra' ? 'ser preto(a) ou pardo(a)' : 'ser indígena ou amarelo(a)');
  if (r.superior === 'Sim') lado(bS > 0, 'ter ensino superior'); else lado(bS < 0, 'não ter ensino superior');
  const iPat = DADOS.faixas_pat.indexOf(r.faixa_patrimonio);
  if (iPat >= 3) lado(M['log_patrimonio'] > 0, 'patrimônio acima de R$ 1 milhão');
  else if (iPat <= 1) lado(M['log_patrimonio'] < 0, iPat === 0 ? 'não ter bens declarados' : 'patrimônio de até R$ 100 mil');
  return { favor, contra };
}

// resultado para deputados e senador: chance estimada pela regressão logística
function resultadoModelo(r) {
  const info = DADOS.eixos[r.cargo];
  const [chance, lo, hi] = chanceComIC(r);
  const pct2 = v => pct(v, v < 1 ? 2 : 1);           // mais casas decimais para chances muito pequenas
  const razao = (100 * chance) / info.taxa;
  let rotulo = 'No meio do caminho';
  if (razao >= 1.5) rotulo = 'O perfil da Câmara';
  if (razao <= 0.5) rotulo = 'A exceção';
  return {
    rotulo, grande: pct2(100 * chance), legenda: 'de chance de se eleger',
    ic: `Intervalo de confiança de 95%: de ${pct2(100 * lo)} a ${pct2(100 * hi)}`,
    icCurto: `IC 95%: ${pct2(100 * lo)} a ${pct2(100 * hi)}`,
    nota: 'A chance é estimada por uma regressão logística com os candidatos ao Legislativo de 2026. ' +
          'Ela mostra o que aconteceu com perfis parecidos, não prevê o futuro de ninguém. ' +
          'A idade aparece nos eixos, mas não entra no cálculo.',
    frase: `Em 2026, 1 em cada ${Math.round(100 / info.taxa)} candidatos a ${r.cargo.toLowerCase()} se elegeu. ` +
           `Com o seu perfil, foi cerca de 1 em cada ${Math.max(1, Math.round(1 / chance))}.`,
    explica: 'Barra cinza: % de pessoas como você entre os <b>candidatos</b>. Barra laranja: entre os <b>eleitos</b>.',
    regua: [chance, lo, hi, info.taxa / 100],
    linhas: Object.keys(NOMES_EIXOS).map(eixo => {
      const [cand, el] = (info[eixo] && info[eixo][r[eixo]]) || [0, 0];
      return [NOMES_EIXOS[eixo], rotuloDe(eixo, r[eixo]), cand, el, pct(cand) + ' dos candidatos', pct(el) + ' dos eleitos'];
    })
  };
}

// resultado para presidente: poucos casos, então comparamos o perfil com o de cada candidatura
function resultadoPresidente(r) {
  const eixos = Object.keys(NOMES_EIXOS);
  const emComum = c => eixos.filter(e => c[e] === r[e]).length;
  const k = vencedor ? emComum(vencedor) : 0;
  const parecida = maisParecidos(r, P, 1)[0].c;
  let rotulo = 'No meio do caminho';
  if (k >= 5) rotulo = 'O perfil de quem venceu';
  if (k <= 2) rotulo = 'A exceção';
  return {
    rotulo, grande: `${k} de ${eixos.length}`, legenda: 'características em comum com quem venceu',
    ic: `Com só ${P.length} candidaturas, nenhum modelo estatístico consegue estimar uma chance: ` +
        `o intervalo de confiança seria enorme. Por isso, aqui comparamos perfis.`,
    icCurto: `Só ${P.length} candidaturas: em vez de uma chance, comparamos perfis.`,
    nota: 'Comparação com as candidaturas à Presidência de 2026, nas seis características do teste. ' +
          'Ter o mesmo perfil de quem venceu não quer dizer que você venceria.',
    frase: `Em 2026, ${P.length} pessoas disputaram a Presidência e uma venceu. A candidatura mais ` +
           `parecida com você foi a de ${nomePres(parecida)}, com ${emComum(parecida)} de ${eixos.length} características iguais.`,
    explica: 'Barra cinza: quantas candidaturas à Presidência tinham a sua característica. ' +
             'Barra laranja: se <b>quem venceu</b> também tinha.',
    regua: null,
    linhas: eixos.map(eixo => {
      const n = P.filter(c => c[eixo] === r[eixo]).length;
      const tem = vencedor && vencedor[eixo] === r[eixo];
      return [NOMES_EIXOS[eixo], rotuloDe(eixo, r[eixo]), 100 * n / P.length, tem ? 100 : 0,
              `${n} de ${P.length} candidaturas`, tem ? 'quem venceu também' : 'quem venceu, não'];
    })
  };
}

function mostrarResultado(r, rolar) {
  const res = r.cargo === 'Presidente' ? resultadoPresidente(r) : resultadoModelo(r);
  escreve('res-rotulo', res.rotulo);
  document.getElementById('res-chance').innerHTML =
    `${res.grande} <span class="legenda-grande">${res.legenda}</span>`;
  escreve('res-nota', res.nota);
  escreve('res-ic', res.ic);
  escreve('res-frase', res.frase);
  document.getElementById('res-explica').innerHTML = res.explica;
  const svgR = document.getElementById('regua');
  svgR.style.display = res.regua ? 'block' : 'none';
  if (res.regua) desenharRegua(...res.regua);

  document.getElementById('res-eixos').innerHTML = res.linhas.map(([nome, valor, w1, w2, t1, t2]) => `
    <div class="eixo"><span><b>${nome}</b><br>${valor}</span>
      <div class="barras">
        <div class="b-cand" style="width:${0.75 * w1}%"><span>${t1}</span></div>
        <div class="b-eleito" style="width:${0.75 * w2}%"><span>${t2}</span></div>
      </div></div>`).join('');

  const fc = r.cargo === 'Presidente' ? null : favorContra(r);
  const itens = l => l.length ? l.map(t => `<li>${t}</li>`).join('') : '<li>nenhuma das suas características</li>';
  document.getElementById('res-favor').innerHTML = fc ? `
    <div class="favor"><h4>A seu favor</h4><ul>${itens(fc.favor)}</ul></div>
    <div class="contra"><h4>Contra você</h4><ul>${itens(fc.contra)}</ul></div>` : '';
  const parecidos = mostrarParecidos(r);

  ultimo = { r, ...res, parecido: parecidos[0] };
  history.replaceState(null, '', '?' + new URLSearchParams(r).toString() + '#ato7');   // link compartilhável
  const caixa = document.getElementById('resultado');
  caixa.hidden = false;
  if (rolar) caixa.scrollIntoView({ behavior: SEM_MOVIMENTO ? 'auto' : 'smooth' });
}

// régua: sua chance (ponto e faixa do IC) comparada com a média do cargo
function desenharRegua(chance, lo, hi, media) {
  const svgR = document.getElementById('regua');
  svgR.innerHTML = '';
  const max = Math.min(1, Math.max(hi, media) * 1.25), x = v => 20 + 660 * v / max;
  svgEl('line', { x1: 20, x2: 680, y1: 50, y2: 50, stroke: '#cbc4b6', 'stroke-width': 2 }, svgR);
  [0, max / 2, max].forEach(v => svgEl('text', { x: x(v), y: 80, 'text-anchor': 'middle' }, svgR).textContent = pct(100 * v, 0));
  svgEl('rect', { x: x(lo), y: 40, width: Math.max(2, x(hi) - x(lo)), height: 20, rx: 10, fill: '#e2620f', opacity: .25 }, svgR);
  svgEl('line', { x1: x(media), x2: x(media), y1: 30, y2: 70, stroke: '#16141d', 'stroke-width': 2, 'stroke-dasharray': '3 3' }, svgR);
  svgEl('text', { x: x(media), y: 22, 'text-anchor': 'middle' }, svgR).textContent = 'média do cargo';
  svgEl('circle', { cx: x(chance), cy: 50, r: 9, fill: '#e2620f', stroke: 'white', 'stroke-width': 3 }, svgR);
}

// --- baixar o resultado como imagem (formato de stories) ---
document.getElementById('b-baixar').addEventListener('click', async () => {
  await document.fonts.ready;
  const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350;
  const c = cv.getContext('2d'), u = ultimo;
  c.fillStyle = '#16141d'; c.fillRect(0, 0, 1080, 1350);
  for (let i = 0; i < 220; i++) {                        // pontinhos decorativos
    c.fillStyle = i < 20 ? '#e2620f' : 'rgba(255,255,255,.08)';
    c.beginPath(); c.arc((i * 137) % 1080, (i * 71) % 300 + 20, 5, 0, 7); c.fill();
  }
  c.fillStyle = '#e2620f'; c.font = '600 30px Inter, Arial';
  c.fillText('QUEM CABE NA CÂMARA? · ELEIÇÕES 2026', 80, 400);
  c.fillStyle = 'white'; c.font = '900 64px Fraunces, Georgia';
  c.fillText(u.rotulo, 80, 480);
  c.fillStyle = '#e2620f'; c.font = '900 180px Fraunces, Georgia';
  c.fillText(u.grande, 70, 670);
  c.fillStyle = '#f3eee4'; c.font = '400 32px Inter, Arial';
  c.fillText(u.legenda, 80, 730);
  c.fillStyle = '#a9a3b0'; c.font = '400 26px Inter, Arial';
  c.fillText('Cargo: ' + rotuloDe('cargo', u.r.cargo), 80, 778);
  c.fillText(u.icCurto, 80, 815);
  u.linhas.forEach(([nome, valor, w1, w2], i) => {
    const y = 880 + i * 56;
    c.fillStyle = '#f3eee4'; c.font = '600 24px Inter, Arial'; c.fillText(nome + ': ' + valor, 80, y);
    c.fillStyle = '#4a4655'; c.fillRect(560, y - 30, 4.4 * w1, 14);
    c.fillStyle = '#e2620f'; c.fillRect(560, y - 12, 4.4 * w2, 14);
  });
  if (u.parecido) {
    c.fillStyle = '#e2620f'; c.font = '600 24px Inter, Arial';
    c.fillText('Quem mais se parece com você: ' + nomeCurto(u.parecido), 80, 1228);
  }
  c.fillStyle = '#a9a3b0'; c.font = '400 22px Inter, Arial';
  c.fillText(u.r.cargo === 'Presidente' ? 'Barras: cinza = candidaturas com o seu perfil · laranja = quem venceu'
                                        : 'Barras: cinza = % entre candidatos · laranja = % entre eleitos', 80, 1270);
  c.fillText(location.host ? location.host + location.pathname : 'Projeto A2', 80, 1306);
  const a = document.createElement('a');
  a.download = 'meu-resultado-camara.png'; a.href = cv.toDataURL('image/png'); a.click();
});

// --- copiar link / compartilhar ---
document.getElementById('b-link').addEventListener('click', async e => {
  const botao = e.target;
  try {
    if (navigator.share) await navigator.share({ title: 'Quem cabe na Câmara?', url: location.href });
    else { await navigator.clipboard.writeText(location.href); botao.textContent = 'Link copiado!'; }
  } catch { botao.textContent = 'Copie o endereço na barra do navegador'; }
  setTimeout(() => botao.textContent = 'Copiar link do resultado', 2500);
});

document.getElementById('b-refazer').addEventListener('click', () => {
  atual = 0; escolha = null; respostas = {};
  document.getElementById('resultado').hidden = true;
  history.replaceState(null, '', location.pathname + '#ato7');
  desenharTela();
  tela.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// --- se o link já tem respostas (?cargo=...&genero=...), mostra o resultado direto ---
const daUrl = Object.fromEntries(new URLSearchParams(location.search));
if (PERGUNTAS.every(p => p.opcoes.some(o => o[0] === daUrl[p.campo]))) {
  respostas = daUrl; atual = PERGUNTAS.length;
  mostrarResultado(respostas, false);
}
desenharTela();

// =====================================================================
// 11. TODOS OS CANDIDATOS + LETREIROS DE APURAÇÃO
// =====================================================================
const TODOS = (DADOS.todos || []).map((l, i) => ({
  i, nome: l[0], cargo: DADOS.cargos[l[1]], uf: l[2], partido: l[3], ocupacao: l[4],
  eleito: l[5] === 1, mulher: l[6] === 1, raca: l[7], idade: l[8], superior: l[9] === 1,
  patrimonio: l[10], mandato: l[11] === 1, votos: l[12], pct: l[13], votos2: l[14], pct2: l[15]
}));
const mediana = lista => {
  const v = lista.filter(x => x !== null && x !== undefined).sort((a, b) => a - b);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
};
const prop = (lista, teste) => lista.length ? 100 * lista.filter(teste).length / lista.length : 0;
const NOME_CARGO = { 'Presidente': 'Presidente', 'Governador': 'Governador(a)', 'Senador': 'Senador(a)',
  'Deputado Federal': 'Deputado(a) federal', 'Deputado Estadual': 'Deputado(a) estadual',
  'Deputado Distrital': 'Deputado(a) distrital' };

// letreiros: frases com os números da base, repetidas para a faixa correr sem emenda
(function letreiros() {
  const [mc, me] = proporcoes(c => c.mulher), [nc, ne] = proporcoes(c => c.raca === 'N');
  const frases = [
    `${num(candidatos.length)} candidaturas`, `${num(eleitos.length)} eleitos`,
    `mulheres: ${pct(mc)} das candidaturas → ${pct(me)} dos eleitos`,
    `pessoas negras: ${pct(nc)} → ${pct(ne)}`,
    `1 eleito para cada ${Math.round(candidatos.length / eleitos.length)} candidaturas`,
    `apuração encerrada · eleições 2026`
  ];
  const texto = frases.join('   ●   ') + '   ●   ';
  document.querySelectorAll('.letreiro-faixa').forEach(f => f.textContent = texto + texto);
})();

// =====================================================================
// 12. ATO 7 – O PLACAR DOS ELEITOS (painel de apuração + rankings)
// =====================================================================
const CARGOS_PLACAR = ['Todos', ...DADOS.cargos.slice().reverse()];   // do Presidente ao Distrital
let placarCargo = 'Todos', placarUF = 'BR', placarAba = 'votos';

const ABAS = {
  votos:      { nome: 'Mais votados',       valor: c => c.votos,      texto: c => num(c.votos) + ' votos' },
  patrimonio: { nome: 'Maior patrimônio',   valor: c => c.patrimonio, texto: c => reais(c.patrimonio) },
  jovens:     { nome: 'Mais jovens',        valor: c => -(c.idade ?? 999), texto: c => c.idade + ' anos' },
  velhos:     { nome: 'Mais velhos',        valor: c => c.idade ?? -1, texto: c => c.idade + ' anos' },
  partidos:   { nome: 'Eleitos por partido' }
};

if (TODOS.length) {
  const caixaCargos = document.getElementById('placar-cargos');
  caixaCargos.innerHTML = CARGOS_PLACAR.map(c =>
    `<button data-cargo="${c}" class="${c === placarCargo ? 'ativo' : ''}">${c === 'Todos' ? 'Todos os cargos' : NOME_CARGO[c]}</button>`).join('');
  caixaCargos.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    caixaCargos.querySelectorAll('button').forEach(x => x.classList.remove('ativo'));
    b.classList.add('ativo'); placarCargo = b.dataset.cargo; desenharPlacar();
  }));
  const ufs = [...new Set(TODOS.map(c => c.uf))].filter(u => u !== 'BR').sort();
  const sel = document.getElementById('placar-uf');
  sel.innerHTML = '<option value="BR">Brasil inteiro</option>' + ufs.map(u => `<option>${u}</option>`).join('');
  sel.addEventListener('change', () => { placarUF = sel.value; desenharPlacar(); });
  const caixaAbas = document.getElementById('placar-abas');
  caixaAbas.innerHTML = Object.entries(ABAS).map(([k, a]) =>
    `<button data-aba="${k}" class="${k === placarAba ? 'ativo' : ''}">${a.nome}</button>`).join('');
  caixaAbas.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    caixaAbas.querySelectorAll('button').forEach(x => x.classList.remove('ativo'));
    b.classList.add('ativo'); placarAba = b.dataset.aba; desenharPlacar();
  }));
  desenharPlacar();
}

function desenharPlacar() {
  const filtro = c => (placarCargo === 'Todos' || c.cargo === placarCargo) && (placarUF === 'BR' || c.uf === placarUF);
  const cand = TODOS.filter(filtro), el = cand.filter(c => c.eleito);
  const painel = document.getElementById('placar-painel');
  if (!el.length) {
    painel.innerHTML = '<div><span>Eleitos</span><b>0</b><small>Nenhum eleito com esse filtro</small></div>';
    document.getElementById('placar-ranking').innerHTML = '';
    escreve('placar-nota', 'Dica: presidente não tem estado; escolha "Brasil inteiro".');
    return;
  }
  const blocos = [
    ['Eleitos', num(el.length), `de ${num(cand.length)} candidaturas`],
    ['Mulheres', pct(prop(el, c => c.mulher)), `entre candidatos: ${pct(prop(cand, c => c.mulher))}`],
    ['Pessoas negras', pct(prop(el, c => c.raca === 'N')), `entre candidatos: ${pct(prop(cand, c => c.raca === 'N'))}`],
    ['Idade mediana', (mediana(el.map(c => c.idade)) ?? '–') + ' anos', `candidatos: ${mediana(cand.map(c => c.idade)) ?? '–'} anos`],
    ['Patrimônio mediano', reais(mediana(el.map(c => c.patrimonio))), `candidatos: ${reais(mediana(cand.map(c => c.patrimonio)))}`],
    ['Já tinham mandato', pct(prop(el, c => c.mandato)), `entre candidatos: ${pct(prop(cand, c => c.mandato))}`]
  ];
  painel.innerHTML = blocos.map(([t, v, s]) => `<div><span>${t}</span><b>${v}</b><small>${s}</small></div>`).join('');

  const lista = document.getElementById('placar-ranking');
  if (placarAba === 'partidos') {
    const contagem = {};
    el.forEach(c => contagem[c.partido] = (contagem[c.partido] || 0) + 1);
    const top = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 10), max = top[0][1];
    lista.innerHTML = top.map(([p, n], i) => `<li><span class="pos">${i + 1}</span><div>
      <b>${p}</b> <span class="valor">${n} eleito${n > 1 ? 's' : ''}</span>
      <div class="barra" style="width:${100 * n / max}%"></div></div></li>`).join('');
  } else {
    const aba = ABAS[placarAba];
    const top = el.filter(c => aba.valor(c) !== null).sort((a, b) => aba.valor(b) - aba.valor(a)).slice(0, 10);
    const max = Math.max(...top.map(c => Math.abs(placarAba === 'jovens' ? c.idade : aba.valor(c)) || 1));
    lista.innerHTML = top.map((c, i) => `<li><span class="pos">${i + 1}</span><div>
      <button class="nome" data-i="${c.i}">${MOSTRAR_NOMES ? c.nome : 'Eleito(a) de ' + c.uf}</button>
      <span class="meta">${c.partido} · ${c.uf} · ${NOME_CARGO[c.cargo]}</span> <span class="valor">${aba.texto(c)}</span>
      <div class="barra" style="width:${100 * Math.abs(placarAba === 'jovens' ? c.idade : aba.valor(c)) / max}%"></div></div></li>`).join('');
    lista.querySelectorAll('.nome').forEach(b => b.addEventListener('click', () => {
      mostrarSantinho(TODOS[Number(b.dataset.i)]);
      document.getElementById('busca').scrollIntoView({ behavior: SEM_MOVIMENTO ? 'auto' : 'smooth' });
    }));
  }
  escreve('placar-nota', placarAba === 'votos' && placarCargo === 'Todos'
    ? 'Com "Todos os cargos", os mais votados são de disputas nacionais ou estaduais, que têm mais eleitores. Escolha um cargo para comparar iguais.'
    : 'Patrimônio e cor/raça autodeclarados ao TSE. Votos do 1º turno.');
}

// =====================================================================
// 13. ATO 8 – A BUSCA E O "SANTINHO"
// =====================================================================
const semAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
TODOS.forEach(c => c.chave = semAcento(c.nome));
if (TODOS.length) escreve('busca-explica', `Digite o nome de urna. Estão aqui as ${num(TODOS.length)} candidaturas ` +
  'que foram para a urna em 2026, eleitas ou não.');

// posição de cada candidato na sua disputa (mesmo cargo e mesmo estado), pelos votos do 1º turno
const disputas = {};
TODOS.forEach(c => (disputas[c.cargo + '|' + c.uf] = disputas[c.cargo + '|' + c.uf] || []).push(c));
Object.values(disputas).forEach(l => l.sort((a, b) => b.votos - a.votos).forEach((c, k) => c.posicao = k + 1));

const campo = document.getElementById('busca-campo'), sugestoes = document.getElementById('busca-sugestoes');
let achados = [], marcado = 0;

function buscar() {
  const q = semAcento(campo.value.trim());
  if (q.length < 2) { sugestoes.innerHTML = ''; achados = []; return; }
  const comeca = TODOS.filter(c => c.chave.startsWith(q)), contem = TODOS.filter(c => !c.chave.startsWith(q) && c.chave.includes(q));
  achados = [...comeca, ...contem].sort((a, b) => (b.chave.startsWith(q) - a.chave.startsWith(q)) || b.eleito - a.eleito || b.votos - a.votos).slice(0, 8);
  marcado = 0;
  sugestoes.innerHTML = achados.length ? achados.map((c, k) => `<li role="option" data-k="${k}" class="${k === 0 ? 'ativo' : ''}">
      <b>${c.nome}</b><small>${NOME_CARGO[c.cargo]} · ${c.uf} · ${c.partido}</small>${c.eleito ? '<span class="tag">ELEITO</span>' : ''}</li>`).join('')
    : '<li>Nenhuma candidatura com esse nome.</li>';
  sugestoes.querySelectorAll('li[data-k]').forEach(li => li.addEventListener('click', () => escolherBusca(Number(li.dataset.k))));
}
function escolherBusca(k) {
  if (!achados[k]) return;
  campo.value = achados[k].nome; sugestoes.innerHTML = '';
  mostrarSantinho(achados[k]);
}
if (campo) {
  campo.addEventListener('input', buscar);
  campo.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      marcado = (marcado + (e.key === 'ArrowDown' ? 1 : -1) + achados.length) % Math.max(achados.length, 1);
      sugestoes.querySelectorAll('li[data-k]').forEach((li, k) => li.classList.toggle('ativo', k === marcado));
    }
    if (e.key === 'Enter') { e.preventDefault(); escolherBusca(marcado); }
    if (e.key === 'Escape') sugestoes.innerHTML = '';
  });
  document.addEventListener('click', e => { if (!e.target.closest('.busca-caixa')) sugestoes.innerHTML = ''; });
  document.getElementById('busca-sorte').addEventListener('click', () => {
    const el = TODOS.filter(c => c.eleito);
    if (el.length) mostrarSantinho(el[Math.floor(Math.random() * el.length)]);
  });
}

function mostrarSantinho(c) {
  const area = document.getElementById('santinho');
  const disputa = disputas[c.cargo + '|' + c.uf];
  const segundo = c.votos2 !== null && c.votos2 !== undefined;
  const fem = c.mulher;
  const [carimbo, corC] = c.eleito ? [fem ? 'ELEITA' : 'ELEITO', '#e2620f']
                        : segundo ? ['2º TURNO', '#7b2cbf'] : [fem ? 'NÃO ELEITA' : 'NÃO ELEITO', '#6d6873'];
  const colegas = TODOS.filter(x => x.eleito && x.cargo === c.cargo);
  const medPat = mediana(colegas.map(x => x.patrimonio)), medIdade = mediana(colegas.map(x => x.idade));
  const vezes = medPat > 0 && c.patrimonio > 0 ? c.patrimonio / medPat : null;
  area.innerHTML = `
    <div class="santinho" style="--cor-s:${c.eleito ? '#e2620f' : '#77717d'}">
      <div class="santinho-topo">${NOME_CARGO[c.cargo]} · ${c.uf === 'BR' ? 'Brasil' : c.uf}</div>
      <span class="carimbo" style="--cor-c:${corC}">${carimbo}</span>
      <div class="santinho-corpo">
        <h3>${c.nome}</h3>
        <p class="partido-uf">${c.partido}</p>
        <p class="ocup">${c.ocupacao}</p>
        <div class="numeros">
          <div><span>Votos (1º turno)</span><b>${num(c.votos)}</b></div>
          <div><span>% da disputa</span><b>${pct(c.pct)}</b></div>
          ${segundo ? `<div><span>Votos (2º turno)</span><b>${num(c.votos2)}</b></div>
                       <div><span>% no 2º turno</span><b>${pct(c.pct2)}</b></div>` : ''}
        </div>
        <ul>
          <li>${fem ? 'Mulher' : 'Homem'}</li>
          <li>${TRACOS.raca[{ B: 'Branca', N: 'Negra', O: 'Outras' }[c.raca]]}</li>
          <li>${c.idade !== null ? c.idade + ' anos' : 'idade não informada'}</li>
          <li>${c.superior ? 'Com ensino superior' : 'Sem ensino superior'}</li>
          <li>Patrimônio: ${reais(c.patrimonio)}</li>
          <li>${c.mandato ? 'Já tinha mandato' : 'Sem mandato'}</li>
        </ul>
      </div>
    </div>
    <div class="comparacao">
      <h3>Na disputa</h3>
      <p class="linha-comp"><b>${c.posicao}º</b> mais votado(a) entre <b>${num(disputa.length)}</b> candidaturas a
        ${NOME_CARGO[c.cargo].toLowerCase()} ${c.uf === 'BR' ? 'no Brasil' : 'em ' + c.uf}.</p>
      <p class="linha-comp">Patrimônio: ${vezes === null ? 'sem bens declarados, ou sem base de comparação'
        : `<b>${vezes.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×</b> o patrimônio mediano dos eleitos para esse cargo (${reais(medPat)})`}.</p>
      <p class="linha-comp">Idade: ${c.idade ?? '–'} anos; a mediana dos eleitos para esse cargo é <b>${medIdade ?? '–'}</b>.</p>
      <p class="nota">Dados declarados ao TSE. A posição considera os votos do 1º turno.</p>
    </div>`;
}

// =====================================================================
// 14. ATO 6 – O 2º TURNO DA PRESIDÊNCIA (o "duelo")
// =====================================================================
const finalistas = TODOS.filter(c => c.cargo === 'Presidente' && c.votos2 !== null && c.votos2 !== undefined)
  .sort((a, b) => b.votos2 - a.votos2);
const caixaDuelo = document.getElementById('duelo');
if (finalistas.length === 2 && caixaDuelo) {
  const [v, p] = finalistas;
  caixaDuelo.innerHTML = `<h3>O 2º turno</h3>
    <p class="explica">A disputa final entre as duas candidaturas mais votadas no 1º turno.</p>
    <div class="duelo-nomes">
      <div><b>${MOSTRAR_NOMES ? v.nome : 'Candidatura vencedora'}</b>${v.partido} · ${num(v.votos2)} votos</div>
      <div><b>${MOSTRAR_NOMES ? p.nome : 'Segunda colocada'}</b>${p.partido} · ${num(p.votos2)} votos</div>
    </div>
    <div class="duelo-barra"><div class="vence">${pct(v.pct2)}</div><div class="perde">${pct(p.pct2)}</div></div>
    <p class="nota">Linha tracejada: metade dos votos. No 1º turno: ${v.nome} teve ${pct(v.pct)} e ${p.nome}, ${pct(p.pct)}.</p>`;
  quandoAparecer(caixaDuelo, () => {
    caixaDuelo.querySelector('.vence').style.width = v.pct2 + '%';
    caixaDuelo.querySelector('.perde').style.width = p.pct2 + '%';
  });
} else if (caixaDuelo && TODOS.length && P.length) {
  caixaDuelo.innerHTML = `<p class="explica"><b>Sem 2º turno:</b> a Presidência foi decidida no 1º turno.</p>`;
}
// marca o resultado do 2º turno nos cartões dos finalistas
finalistas.forEach(f => {
  const k = P.findIndex(c => c.nome === f.nome);
  const cartao = document.querySelectorAll('#pres-cartoes .cartao')[k];
  if (cartao) cartao.querySelector('ul').insertAdjacentHTML('beforebegin',
    `<div class="votos"><i style="width:${f.pct2}%"></i></div>${pct(f.pct2)} no 2º turno`);
});

// =====================================================================
// 15. ATO 02 – A COTA PARTIDO POR PARTIDO (dispersão)
// =====================================================================
(function cotaPorPartido() {
  const svg = document.getElementById('cota-partidos');
  if (!svg || !TODOS.length) return;
  const deps = TODOS.filter(c => c.cargo.startsWith('Deputado'));
  const partidos = {};
  deps.forEach(c => {
    const p = partidos[c.partido] = partidos[c.partido] || { cand: 0, mulheres: 0, el: 0, el_mulheres: 0, fantasmas: 0 };
    p.cand++; if (c.mulher) { p.mulheres++; if (c.votos < 100) p.fantasmas++; }
    if (c.eleito) { p.el++; if (c.mulher) p.el_mulheres++; }
  });
  const lista = Object.entries(partidos).filter(([, p]) => p.el >= 5)       // só partidos com 5+ eleitos
    .map(([sigla, p]) => ({ sigla, ...p, x: 100 * p.mulheres / p.cand, y: 100 * p.el_mulheres / p.el }));
  if (!lista.length) return;
  const X0 = 60, X1 = 740, Y0 = 400, Y1 = 20, maxX = 50, maxY = Math.max(50, ...lista.map(p => p.y)) ;
  const xs = v => X0 + (X1 - X0) * v / maxX, ys = v => Y0 - (Y0 - Y1) * v / maxY;
  [0, 10, 20, 30, 40, 50].forEach(v => {
    svgEl('line', { x1: xs(v), x2: xs(v), y1: Y1, y2: Y0, class: 'grade' }, svg);
    svgEl('text', { x: xs(v), y: Y0 + 18, 'text-anchor': 'middle' }, svg).textContent = v + '%';
  });
  for (let v = 0; v <= maxY; v += 10) {
    svgEl('line', { x1: X0, x2: X1, y1: ys(v), y2: ys(v), class: 'grade' }, svg);
    svgEl('text', { x: X0 - 8, y: ys(v) + 4, 'text-anchor': 'end' }, svg).textContent = v + '%';
  }
  svgEl('line', { x1: xs(30), x2: xs(30), y1: Y1, y2: Y0, class: 'guia' }, svg);
  svgEl('text', { x: xs(30) + 6, y: Y1 + 12, class: 'rotulo-forte' }, svg).textContent = 'mínimo legal: 30%';
  svgEl('line', { x1: xs(0), y1: ys(0), x2: xs(Math.min(maxX, maxY)), y2: ys(Math.min(maxX, maxY)), class: 'guia' }, svg);
  svgEl('text', { x: xs(42), y: ys(44) - 6, 'text-anchor': 'middle' }, svg).textContent = 'elegeu na mesma proporção';
  svgEl('text', { x: (X0 + X1) / 2, y: Y0 + 38, 'text-anchor': 'middle' }, svg).textContent = '% de mulheres entre as candidaturas a deputado →';
  svgEl('text', { x: 14, y: (Y0 + Y1) / 2, 'text-anchor': 'middle', transform: `rotate(-90 14 ${(Y0 + Y1) / 2})` }, svg)
    .textContent = '% de mulheres entre os eleitos →';
  const maxEl = Math.max(...lista.map(p => p.el));
  lista.sort((a, b) => b.el - a.el).forEach(p => {
    const c = svgEl('circle', { cx: xs(p.x), cy: ys(p.y), r: 5 + 18 * Math.sqrt(p.el / maxEl) }, svg);
    svgEl('title', {}, c).textContent = `${p.sigla}: ${pct(p.x)} de candidatas, ${pct(p.y)} das cadeiras do partido ` +
      `(${p.el_mulheres} de ${p.el}). ${p.fantasmas} candidatas com menos de 100 votos.`;
    if (p.el >= maxEl / 4) svgEl('text', { x: xs(p.x), y: ys(p.y) - 8 - 18 * Math.sqrt(p.el / maxEl), 'text-anchor': 'middle', class: 'sigla' }, svg).textContent = p.sigla;
  });
  const abaixo = lista.filter(p => p.y < p.x).length;
  escreve('cota-nota', `${abaixo} dos ${lista.length} partidos com 5 ou mais deputados eleitos ficaram abaixo da diagonal: ` +
    'elegeram uma proporção de mulheres menor do que a que lançaram. Inclui deputados federais, estaduais e distritais.');
})();

// =====================================================================
// 16. ATO 04 – GASTOS DE CAMPANHA E VALIDAÇÃO DO MODELO
// =====================================================================
(function gastosDeCampanha() {
  const G = DADOS.gastos, svg = document.getElementById('gastos');
  if (!G || !svg) return;                       // sem a célula de gastos, o bloco fica escondido
  document.getElementById('gastos-bloco').hidden = false;
  const valores = G.fatores.flatMap(f => [f[1], f[2]]);
  const mn = Math.min(0.4, ...valores) / 1.2, mx = Math.max(...valores) * 1.3;
  const x = v => 280 + (Math.log(v) - Math.log(mn)) / (Math.log(mx) - Math.log(mn)) * 450;
  [0.25, 0.5, 1, 2, 4, 8, 16].filter(v => v >= mn && v <= mx).forEach(v => {
    svgEl('line', { x1: x(v), x2: x(v), y1: 10, y2: 240, class: v === 1 ? 'guia' : 'grade' }, svg);
    svgEl('text', { x: x(v), y: 262, 'text-anchor': 'middle' }, svg).textContent = '×' + v.toLocaleString('pt-BR');
  });
  G.fatores.forEach(([nome, sem, com], i) => {
    const y = 40 + i * 56;
    svgEl('text', { x: 0, y: y + 5, class: 'rotulo-forte' }, svg).textContent = nome;
    svgEl('line', { x1: x(sem), x2: x(com), y1: y, y2: y, class: 'liga' }, svg);
    svgEl('circle', { cx: x(sem), cy: y, r: 8, class: 'sem' }, svg);
    svgEl('circle', { cx: x(com), cy: y, r: 8, class: 'com' }, svg);
    svgEl('text', { x: Math.max(x(sem), x(com)) + 14, y: y + 5 }, svg).textContent =
      `×${sem.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} → ×${com.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;
  });
  document.getElementById('gastos-painel').innerHTML = [
    ['Gasto 10× maior', '× ' + G.or_gasto.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), 'na chance de se eleger'],
    ['Gasto mediano', reais(G.mediana_eleitos), `eleitos · não eleitos: ${reais(G.mediana_nao_eleitos)}`],
    ['Mulheres x homens', reais(G.mediana_mulheres), `mediana delas · deles: ${reais(G.mediana_homens)}`],
    ['Negros x brancos', reais(G.mediana_negros), `mediana · brancos: ${reais(G.mediana_brancos)}`]
  ].map(([t, v, s]) => `<div><span>${t}</span><b>${v}</b><small>${s}</small></div>`).join('');
})();

(function validacao() {
  const V = DADOS.validacao, svg = document.getElementById('roc');
  if (!V || !svg) return;
  const S = 300, O = 50, xr = v => O + v * S, yr = v => O + S - v * S;
  for (let v = 0; v <= 1.001; v += 0.25) {
    svgEl('line', { x1: xr(v), x2: xr(v), y1: yr(0), y2: yr(1), class: 'grade' }, svg);
    svgEl('line', { x1: xr(0), x2: xr(1), y1: yr(v), y2: yr(v), class: 'grade' }, svg);
    svgEl('text', { x: xr(v), y: yr(0) + 16, 'text-anchor': 'middle' }, svg).textContent = Math.round(100 * v) + '%';
    svgEl('text', { x: xr(0) - 6, y: yr(v) + 4, 'text-anchor': 'end' }, svg).textContent = Math.round(100 * v) + '%';
  }
  svgEl('line', { x1: xr(0), y1: yr(0), x2: xr(1), y2: yr(1), class: 'guia' }, svg);
  svgEl('text', { x: xr(0.62), y: yr(0.5), transform: `rotate(-45 ${xr(0.62)} ${yr(0.5)})`, 'text-anchor': 'middle' }, svg)
    .textContent = 'chute (moeda)';
  const d = V.roc.map(([f, t], i) => (i ? 'L' : 'M') + xr(f).toFixed(1) + ' ' + yr(t).toFixed(1)).join(' ');
  svgEl('path', { d: d + ` L${xr(1)} ${yr(0)} L${xr(0)} ${yr(0)} Z`, class: 'area' }, svg);
  svgEl('path', { d, class: 'curva' }, svg);
  svgEl('text', { x: xr(0.5), y: yr(0) + 36, 'text-anchor': 'middle' }, svg).textContent = 'não eleitos que o modelo daria como eleitos';
  svgEl('text', { x: 12, y: yr(0.5), 'text-anchor': 'middle', transform: `rotate(-90 12 ${yr(0.5)})` }, svg)
    .textContent = 'eleitos que o modelo acerta';
  const auc = V.auc.toLocaleString('pt-BR');
  document.getElementById('validacao-texto').innerHTML = `
    <p class="numero-grande">AUC = ${auc}</p>
    <p>A <b>curva ROC</b> mostra o quanto o modelo separa eleitos de não eleitos. A área sob a curva (AUC) vai de
      0,5 (igual a jogar uma moeda) a 1 (separação perfeita). Na prática: sorteando um eleito e um não eleito,
      em <b>${pct(100 * V.auc, 0)}</b> das vezes o modelo dá chance maior ao eleito.</p>
    <p>Usando um corte de ${pct(V.corte)} de chance, o modelo acerta <b>${pct(V.acerto)}</b> dos casos:
      reconhece <b>${pct(V.sensibilidade)}</b> dos eleitos e <b>${pct(V.especificidade)}</b> dos não eleitos.</p>
    <p class="nota">Por que não olhar só a taxa de acerto? Como só cerca de 1 em cada 10 se elege, quem
      "chutasse" que ninguém se elege acertaria ${pct(V.chute)} sem saber nada. A AUC não cai nessa armadilha.</p>`;
  document.getElementById('metodo-extra').textContent = `Validação: a regressão logística tem AUC de ${auc}. ` +
    (DADOS.gastos ? 'Os gastos de campanha vêm das despesas contratadas declaradas ao TSE na prestação de contas de 2026.' : '');
})();

// =====================================================================
// 17. ATO 05 – SÉRIE HISTÓRICA: O FILTRO ESTÁ DIMINUINDO?
// =====================================================================
(function serieHistorica() {
  const svg = document.getElementById('serie');
  if (!svg) return;
  // 2018 e 2022: Agência Câmara (77 e 91 deputadas; 123 e 134 deputados pretos e pardos, em 513 cadeiras)
  const anos = [2018, 2022, 2026];
  const series = [
    { nome: 'Mulheres', cor: '#7b2cbf', valores: [15.0, 17.7, DADOS.hemiciclo.genero.real.Feminino], pop: 51.5 },
    { nome: 'Pessoas negras', cor: '#e2620f', valores: [24.0, 26.1, DADOS.hemiciclo.raca.real.Negra], pop: 55.5 }
  ];
  const X0 = 80, X1 = 560, Y0 = 290, Y1 = 20, maxY = 60;
  const xs = i => X0 + (X1 - X0) * i / (anos.length - 1), ys = v => Y0 - (Y0 - Y1) * v / maxY;
  [0, 20, 40, 60].forEach(v => {
    svgEl('line', { x1: X0 - 20, x2: 740, y1: ys(v), y2: ys(v), class: 'grade' }, svg);
    svgEl('text', { x: X0 - 26, y: ys(v) + 4, 'text-anchor': 'end' }, svg).textContent = v + '%';
  });
  anos.forEach((a, i) => svgEl('text', { x: xs(i), y: Y0 + 22, 'text-anchor': 'middle', class: 'rotulo-forte' }, svg).textContent = a);
  series.forEach(s => {
    svgEl('line', { x1: X0 - 20, x2: 740, y1: ys(s.pop), y2: ys(s.pop), class: 'guia', style: `stroke:${s.cor}` }, svg);
    svgEl('text', { x: 740, y: ys(s.pop) - 6, 'text-anchor': 'end', style: `fill:${s.cor}` }, svg)
      .textContent = `${s.nome} na população: ${pct(s.pop)}`;
    svgEl('path', { d: s.valores.map((v, i) => (i ? 'L' : 'M') + xs(i) + ' ' + ys(v)).join(' '), class: 'linha', style: `stroke:${s.cor}` }, svg);
    s.valores.forEach((v, i) => {
      svgEl('circle', { cx: xs(i), cy: ys(v), r: 7, class: 'ponto', style: `fill:${s.cor}` }, svg);
      svgEl('text', { x: xs(i), y: ys(v) - 14, 'text-anchor': 'middle', class: 'valor', style: `fill:${s.cor}` }, svg).textContent = pct(v);
    });
    svgEl('text', { x: X1 + 16, y: ys(s.valores[2]) + 5, class: 'rotulo-forte', style: `fill:${s.cor}` }, svg).textContent = s.nome;
  });
})();

// =====================================================================
// 18. MODO APRESENTAÇÃO: → e ← pulam de ato em ato (e de passo em passo no funil)
// =====================================================================
(function modoApresentacao() {
  const alvos = [...document.querySelectorAll('header.capa, #ato1 .cabeca-ato, .passo, section.ato:not(#ato1), footer')];
  const destino = el => {
    const r = el.getBoundingClientRect(), topo = r.top + window.scrollY;
    return el.classList.contains('passo') ? topo + r.height / 2 - window.innerHeight / 2 : topo;
  };
  const dica = document.getElementById('dica-apresentacao');
  let tempoDica = null;
  document.addEventListener('keydown', e => {
    if (e.target.closest('input, select, textarea')) return;          // não atrapalha a busca
    const frente = e.key === 'ArrowRight' || e.key === 'PageDown';
    const tras = e.key === 'ArrowLeft' || e.key === 'PageUp';
    if (!frente && !tras) return;
    e.preventDefault();
    const agora = window.scrollY, posicoes = alvos.map(destino);
    const i = frente ? posicoes.findIndex(p => p > agora + 10)
                     : posicoes.map((p, k) => [p, k]).filter(([p]) => p < agora - 10).map(([, k]) => k).pop();
    if (i === undefined || i < 0) return;
    window.scrollTo({ top: posicoes[i], behavior: SEM_MOVIMENTO ? 'auto' : 'smooth' });
    dica.hidden = false; clearTimeout(tempoDica);
    tempoDica = setTimeout(() => dica.hidden = true, 2500);
  });
})();

// =====================================================================
// 19. FOTOS DOS CANDIDATOS (miniaturas do TSE, carregadas depois da página)
// =====================================================================
const chaveFoto = c => `${c.nome}|${c.uf || 'BR'}|${c.cargo || 'Presidente'}`;
const iniciais = n => n.split(' ').filter(p => p.length > 2 || n.split(' ').length === 1).map(p => p[0]).slice(0, 2).join('').toUpperCase();
function htmlFoto(c, classe) {
  const src = window.FOTOS && window.FOTOS[chaveFoto(c)];
  return src ? `<img class="foto ${classe}" src="${src}" alt="Foto de ${c.nome}">`
             : `<span class="foto sem-foto ${classe}" aria-hidden="true">${iniciais(c.nome)}</span>`;
}
// coloca (ou troca) a foto no começo de um elemento
function porFoto(el, c, classe) {
  if (!el || !c) return;
  const antiga = el.querySelector(':scope > .foto');
  if (antiga) antiga.remove();
  el.insertAdjacentHTML('afterbegin', htmlFoto(c, classe));
}

// santinho da busca
const santinhoOriginal = mostrarSantinho;
mostrarSantinho = function (c) {
  santinhoOriginal(c);
  porFoto(document.querySelector('#santinho .santinho-corpo'), c, 'foto-santinho');
};
// rankings do placar
const placarOriginal = desenharPlacar;
desenharPlacar = function () {
  placarOriginal();
  document.querySelectorAll('#placar-ranking .nome').forEach(b => porFoto(b.parentElement, TODOS[Number(b.dataset.i)], 'foto-mini'));
};
// "quem se parece com você"
const parecidosOriginal = mostrarParecidos;
mostrarParecidos = function (r) {
  const lista = parecidosOriginal(r);
  document.querySelectorAll('#res-parecidos .cartao').forEach((el, k) => porFoto(el, lista[k], 'foto-cartao'));
  return lista;
};

// coloca as fotos em tudo o que já está na tela
function colocarFotos() {
  document.querySelectorAll('#pres-cartoes .cartao').forEach((el, k) => porFoto(el, P[k], 'foto-cartao'));
  document.querySelectorAll('#duelo .duelo-nomes > div').forEach((el, k) => porFoto(el, finalistas[k], 'foto-duelo'));
  if (TODOS.length) desenharPlacar();
  const corpo = document.querySelector('#santinho .santinho-corpo h3');
  if (corpo) { const c = TODOS.find(x => x.nome === corpo.textContent); if (c) mostrarSantinho(c); }
  if (ultimo && !document.getElementById('resultado').hidden) mostrarParecidos(ultimo.r);
}
colocarFotos();                                   // primeiro com as iniciais

// o arquivo de fotos é grande: só carrega depois que a página abriu
window.addEventListener('load', () => setTimeout(() => {
  const s = document.createElement('script');
  s.src = 'fotos.js?v=7';
  s.onload = colocarFotos;                        // quando chegar, troca as iniciais pelas fotos
  document.body.appendChild(s);                   // se não existir fotos.js, ficam as iniciais
}, 800));

// =====================================================================
// 20. ATO 05 – "MONTE A SUA CÂMARA" (simulador de regras com o modelo)
// =====================================================================
(function simulador() {
  const svg = document.getElementById('sim-hemiciclo');
  if (!svg || !TODOS.length) return;
  const deps = TODOS.filter(c => c.cargo === 'Deputado Federal');
  const porUF = {};
  deps.forEach(c => { c.logpat = Math.log10((c.patrimonio || 0) + 1); (porUF[c.uf] = porUF[c.uf] || []).push(c); });
  const vagas = {};
  for (const uf in porUF) vagas[uf] = porUF[uf].filter(c => c.eleito).length;
  const b = k => M[k] || 0;
  const regra = { genero: 1, raca: 1, patrimonio: 1, mandato: 1, resM: 0, resN: 0 };

  // as mesmas posições das 513 cadeiras do hemiciclo de cima
  const assentos = cadeiras.map(c => svgEl('circle', { cx: c.x.toFixed(1), cy: c.y.toFixed(1), r: raioCadeira.toFixed(1) }, svg));
  const GRUPOS4 = [['mn', 'Mulheres negras', '#5a1a99'], ['mo', 'Outras mulheres', '#b78cf0'],
                   ['hn', 'Homens negros', '#77717d'], ['ho', 'Outros homens', '#cbc4b6']];
  const grupo4 = c => (c.mulher ? 'm' : 'h') + (c.raca === 'N' ? 'n' : 'o');

  // distribui k vagas proporcionalmente às chances, sem ninguém passar de 1 vaga
  function distribuir(peso, k) {
    let e = peso.slice();
    for (let volta = 0; volta < 20; volta++) {
      const livres = e.map((_, i) => i).filter(i => e[i] < 1);
      const cheias = e.length - livres.length;
      const soma = livres.reduce((s, i) => s + peso[i], 0);
      if (!soma) break;
      livres.forEach(i => e[i] = (k - cheias) * peso[i] / soma);
      if (!e.some(x => x > 1)) break;
      e = e.map(x => Math.min(x, 1));
    }
    return e.map(x => Math.min(x, 1));
  }
  // garante que um grupo tenha pelo menos "alvo" vagas (reserva de cadeiras)
  function reservar(e, lista, teste, alvo, k) {
    const noGrupo = e.reduce((s, x, i) => s + (teste(lista[i]) ? x : 0), 0);
    if (noGrupo >= alvo || noGrupo === 0) return e;
    return e.map((x, i) => teste(lista[i]) ? x * alvo / noGrupo : x * (k - alvo) / (k - noGrupo));
  }

  function simular() {
    const soma = { mn: 0, mo: 0, hn: 0, ho: 0 };
    let comMandato = 0, faltou = false;
    for (const uf in porUF) {
      const lista = porUF[uf], k = vagas[uf];
      if (!k) continue;
      const chance = lista.map(c => logistica(b('Intercept') + b('C(cargo)[T.Deputado Federal]')
        + regra.genero * (c.mulher ? 0 : b('C(genero)[T.Masculino]'))
        + regra.raca * (c.raca === 'B' ? 0 : b('C(raca)[T.' + (c.raca === 'N' ? 'Negra' : 'Outras') + ']'))
        + (c.superior ? b('C(superior)[T.Sim]') : 0)
        + regra.mandato * (c.mandato ? b('C(tem_mandato)[T.Sim]') : 0)
        + regra.patrimonio * b('log_patrimonio') * c.logpat));
      let e = distribuir(chance, k);
      for (let volta = 0; volta < 15; volta++) {
        if (regra.resM) e = reservar(e, lista, c => c.mulher, regra.resM * k, k);
        if (regra.resN) e = reservar(e, lista, c => c.raca === 'N', regra.resN * k, k);
        e = distribuir(e, k);
      }
      const mulheres = e.reduce((s, x, i) => s + (lista[i].mulher ? x : 0), 0);
      if (regra.resM && mulheres < regra.resM * k - 0.5) faltou = true;
      lista.forEach((c, i) => { soma[grupo4(c)] += e[i]; if (c.mandato) comMandato += e[i]; });
    }
    const total = Object.values(soma).reduce((a, x) => a + x, 0);
    const grupos = emCadeiras(Object.fromEntries(GRUPOS4.map(([g]) => [g, 100 * soma[g] / total])));
    let i = 0;
    grupos.forEach(([g, n]) => { const cor = GRUPOS4.find(x => x[0] === g)[2]; for (let j = 0; j < n; j++) assentos[i++].setAttribute('fill', cor); });
    const n = Object.fromEntries(grupos);
    document.getElementById('sim-legenda').innerHTML = GRUPOS4.map(([g, nome, cor]) => `<span style="--cor:${cor}">${nome}: ${n[g]}</span>`).join('');

    // comparação com a Câmara real
    const reais = deps.filter(c => c.eleito), em513 = n => Math.round(513 * n / reais.length);
    const real = { mulheres: em513(reais.filter(c => c.mulher).length), negras: em513(reais.filter(c => c.raca === 'N').length),
                   mandato: em513(reais.filter(c => c.mandato).length) };
    const sim = { mulheres: n.mn + n.mo, negras: n.mn + n.hn, mandato: Math.round(513 * comMandato / total) };
    const caixa = (titulo, s, r) => {
      const d = s - r, classe = d > 0 ? 'sobe' : d < 0 ? 'desce' : '';
      return `<div><span>${titulo}</span><b>${s}</b><small class="${classe}">${d > 0 ? '+' : ''}${d} em relação à real (${r})</small></div>`;
    };
    document.getElementById('sim-numeros').innerHTML = caixa('Mulheres', sim.mulheres, real.mulheres) +
      caixa('Pessoas negras', sim.negras, real.negras) + caixa('Já tinham mandato', sim.mandato, real.mandato);
    document.getElementById('sim-nota').textContent = (faltou ? 'Atenção: em alguns estados não há candidatas suficientes para cumprir a reserva escolhida. ' : '') +
      'É uma simulação com o modelo estatístico, não uma previsão: o modelo não sabe de campanha, partido nem votos, ' +
      'e com tudo em 100% ele reproduz a Câmara real só aproximadamente.';
  }

  // controles deslizantes
  ['genero', 'raca', 'patrimonio', 'mandato'].forEach(nome => {
    const s = document.getElementById('s-' + nome);
    s.addEventListener('input', () => { regra[nome] = s.value / 100; escreve('o-' + nome, s.value + '%'); simular(); });
  });
  // botões de reserva de cadeiras
  [['r-mulheres', 'resM'], ['r-negras', 'resN']].forEach(([id, chave]) => {
    document.querySelectorAll('#' + id + ' button').forEach(bt => bt.addEventListener('click', () => {
      document.querySelectorAll('#' + id + ' button').forEach(x => x.classList.toggle('ativo', x === bt));
      regra[chave] = Number(bt.dataset.v); simular();
    }));
  });
  // atalhos com cenários prontos
  const ATALHOS = [
    ['Como foi em 2026', { genero: 100, raca: 100, patrimonio: 100, mandato: 100, resM: 0, resN: 0 }],
    ['Sem desvantagem de gênero e raça', { genero: 0, raca: 0, patrimonio: 100, mandato: 100, resM: 0, resN: 0 }],
    ['Dinheiro não conta', { genero: 100, raca: 100, patrimonio: 0, mandato: 100, resM: 0, resN: 0 }],
    ['30% das cadeiras para mulheres', { genero: 100, raca: 100, patrimonio: 100, mandato: 100, resM: 0.3, resN: 0 }],
    ['Paridade', { genero: 100, raca: 100, patrimonio: 100, mandato: 100, resM: 0.5, resN: 0.5 }]
  ];
  const caixaAtalhos = document.getElementById('sim-atalhos');
  caixaAtalhos.innerHTML = ATALHOS.map(([nome], k) => `<button data-k="${k}" class="${k === 0 ? 'ativo' : ''}">${nome}</button>`).join('');
  caixaAtalhos.querySelectorAll('button').forEach(bt => bt.addEventListener('click', () => {
    caixaAtalhos.querySelectorAll('button').forEach(x => x.classList.toggle('ativo', x === bt));
    const v = ATALHOS[Number(bt.dataset.k)][1];
    ['genero', 'raca', 'patrimonio', 'mandato'].forEach(nome => {
      document.getElementById('s-' + nome).value = v[nome]; escreve('o-' + nome, v[nome] + '%'); regra[nome] = v[nome] / 100;
    });
    [['r-mulheres', 'resM'], ['r-negras', 'resN']].forEach(([id, chave]) => {
      regra[chave] = v[chave];
      document.querySelectorAll('#' + id + ' button').forEach(x => x.classList.toggle('ativo', Number(x.dataset.v) === v[chave]));
    });
    simular();
  }));
  simular();
})();

// =====================================================================
// 21. APP NO CELULAR (PWA): funciona offline e pode ser instalado
// =====================================================================
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js');
}
(function botaoInstalar() {
  const botao = document.getElementById('instalar');
  if (!botao) return;
  let pedido = null;
  window.addEventListener('beforeinstallprompt', e => {        // Android e Chrome no computador
    e.preventDefault(); pedido = e; botao.hidden = false;
  });
  botao.addEventListener('click', async () => {
    if (!pedido) return;
    pedido.prompt(); await pedido.userChoice; pedido = null; botao.hidden = true;
  });
  const iphone = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const instalado = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (iphone && !instalado) document.getElementById('dica-ios').hidden = false;   // no iPhone, só pelo Safari
})();
