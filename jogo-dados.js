// =====================================================================
// Quem cabe na Câmara? – O JOGO
// Parte 1: os dados e as estatísticas da Parte 1, recalculadas no navegador a partir do dados.js
// (assim cada número do jogo sai da mesma base usada no Colab).
// =====================================================================
const J = (function () {
  const D = (typeof DADOS !== 'undefined' ? DADOS : window.DADOS) || {};
  const M = D.modelo || {}, IC = D.ic || {};
  const b = k => M[k] || 0;

  // ---------- formatação ----------
  const num = x => Math.round(x).toLocaleString('pt-BR');
  const dec = (x, c = 1) => x.toLocaleString('pt-BR', { maximumFractionDigits: c, minimumFractionDigits: 0 });
  const pct = (x, c = 1) => dec(x, c) + '%';                           // x já em %
  const fmtP = p => { const v = 100 * p; return dec(v, v < 1 ? 2 : v < 10 ? 1 : 0) + '%'; };   // p de 0 a 1
  const reais = v => !v ? 'nenhum bem' : v >= 1e6 ? 'R$ ' + dec(v / 1e6, 1) + ' mi' : v >= 1e3 ? 'R$ ' + num(v / 1e3) + ' mil' : 'R$ ' + num(v);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const logistica = x => 1 / (1 + Math.exp(-x));
  const logit = p => Math.log(p / (1 - p));
  const lim = (v, a, z) => Math.max(a, Math.min(z, v));
  const mediana = l => { const v = l.filter(x => x != null).sort((a, z) => a - z); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };

  // ---------- os candidatos (mesmo formato do grafico.js) ----------
  const TODOS = (D.todos || []).map((l, i) => ({
    i, nome: l[0], cargo: D.cargos[l[1]], uf: l[2], partido: l[3], ocupacao: l[4],
    eleito: l[5] === 1, mulher: l[6] === 1, raca: l[7], idade: l[8], superior: l[9] === 1,
    patrimonio: l[10] || 0, mandato: l[11] === 1, votos: l[12], pct: l[13]
  }));
  const DEP = TODOS.filter(c => c.cargo === 'Deputado Federal');
  const lp = c => Math.log10((c.patrimonio || 0) + 1);

  // ---------- fotos ----------
  const chaveFoto = c => `${c.nome}|${c.uf || 'BR'}|${c.cargo || 'Presidente'}`;
  const iniciais = n => n.split(' ').filter(p => p.length > 2 || n.split(' ').length === 1).map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const fotoDe = c => { if (!c || c.ficticio) return null; const k = chaveFoto(c); return (window.FOTOS && window.FOTOS[k]) || (window.FOTOS_JOGO && window.FOTOS_JOGO[k]); };
  const corGrupo = c => c.mulher ? (c.raca === 'N' ? '#a66cff' : '#cfb3ff') : (c.raca === 'N' ? '#8f8a99' : '#d9d2c4');
  function retrato(c, classe = '') {
    const src = fotoDe(c);
    return src ? `<img class="jg-foto ${classe}" src="${src}" alt="Foto de ${esc(c.nome)}" style="--anel:${corGrupo(c)}">`
      : `<span class="jg-foto jg-sem ${classe}" style="--anel:${corGrupo(c)}" aria-hidden="true">${c.ficticio ? 'EU' : esc(iniciais(c.nome))}</span>`;
  }

  // ---------- o modelo logístico (Parte 1) ----------
  function termos(c) {
    return {
      mandato: c.mandato ? b('C(tem_mandato)[T.Sim]') : 0,
      patrimonio: b('log_patrimonio') * lp(c),
      genero: c.mulher ? 0 : b('C(genero)[T.Masculino]'),
      raca: c.raca === 'B' ? 0 : b('C(raca)[T.' + (c.raca === 'N' ? 'Negra' : 'Outras') + ']'),
      superior: c.superior ? b('C(superior)[T.Sim]') : 0
    };
  }
  const base = c => { const t = termos(c); return b('Intercept') + b('C(cargo)[T.Deputado Federal]') + t.mandato + t.patrimonio + t.genero + t.raca + t.superior; };
  const chance = c => logistica(base(c));
  const or = k => [Math.exp(b(k)), IC[k] ? Math.exp(IC[k][0]) : null, IC[k] ? Math.exp(IC[k][1]) : null];

  // ---------- estatísticas da Parte 1 ----------
  const S = {};
  S.n = TODOS.length; S.nEl = TODOS.filter(c => c.eleito).length;
  S.nDep = DEP.length; S.nDepEl = DEP.filter(c => c.eleito).length;
  S.taxaDep = S.nDepEl / Math.max(1, S.nDep);
  const prop = (lista, t) => lista.length ? 100 * lista.filter(t).length / lista.length : 0;
  const ELE = TODOS.filter(c => c.eleito);
  S.grupos = [
    ['Mulheres', c => c.mulher], ['Pessoas negras', c => c.raca === 'N'], ['Mulheres negras', c => c.mulher && c.raca === 'N'],
    ['Homens brancos', c => !c.mulher && c.raca === 'B'], ['Ensino superior', c => c.superior], ['Já tinham mandato', c => c.mandato]
  ].map(([nome, t]) => ({ nome, t, cand: prop(TODOS, t), el: prop(ELE, t) }));

  // univariada: patrimônio e idade
  const pats = TODOS.map(c => c.patrimonio || 0);
  S.patMediana = mediana(pats);
  S.patMedianaEl = mediana(ELE.map(c => c.patrimonio || 0));
  S.patMedianaNao = mediana(TODOS.filter(c => !c.eleito).map(c => c.patrimonio || 0));
  S.semBens = 100 * pats.filter(v => !v).length / Math.max(1, pats.length);
  (function assimetria() {
    const n = pats.length, m = pats.reduce((a, x) => a + x, 0) / n;
    let m2 = 0, m3 = 0; pats.forEach(x => { const d = x - m; m2 += d * d; m3 += d * d * d; });
    m2 /= n; m3 /= n; S.assimetria = m2 ? m3 / Math.pow(m2, 1.5) : 0; S.patMedia = m;
  })();
  S.idadeMediana = mediana(TODOS.map(c => c.idade));
  S.homens = prop(TODOS, c => !c.mulher); S.brancos = prop(TODOS, c => c.raca === 'B');

  // bivariada categórica × categórica: V de Cramér com "ser eleito"
  function cramer(chaveDe) {
    const tab = {}; let n = 0;
    TODOS.forEach(c => { const k = chaveDe(c); if (k == null) return; tab[k] = tab[k] || [0, 0]; tab[k][c.eleito ? 1 : 0]++; n++; });
    const linhas = Object.values(tab), col = [0, 1].map(j => linhas.reduce((s, l) => s + l[j], 0));
    let x2 = 0;
    linhas.forEach(l => { const tl = l[0] + l[1]; [0, 1].forEach(j => { const e = tl * col[j] / n; if (e) x2 += (l[j] - e) ** 2 / e; }); });
    return Math.sqrt(x2 / (n * Math.min(linhas.length - 1, 1)));
  }
  S.vGenero = cramer(c => c.mulher ? 'F' : 'M');
  S.vRaca = cramer(c => c.raca);
  S.vSuperior = cramer(c => c.superior ? 1 : 0);

  // bivariada quantitativa × quantitativa: Spearman patrimônio × votos (deputados federais)
  function postos(v) {
    const ord = v.map((x, i) => [x, i]).sort((a, z) => a[0] - z[0]), r = new Array(v.length);
    for (let i = 0; i < ord.length;) { let j = i; while (j + 1 < ord.length && ord[j + 1][0] === ord[i][0]) j++;
      const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[ord[k][1]] = m; i = j + 1; }
    return r;
  }
  function pearson(x, y) {
    const n = x.length, mx = x.reduce((a, v) => a + v, 0) / n, my = y.reduce((a, v) => a + v, 0) / n;
    let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { const a = x[i] - mx, c = y[i] - my; sxy += a * c; sxx += a * a; syy += c * c; }
    return sxy / Math.sqrt(sxx * syy);
  }
  const comVotos = DEP.filter(c => c.votos != null);
  S.spearman = comVotos.length > 10 ? pearson(postos(comVotos.map(c => c.patrimonio || 0)), postos(comVotos.map(c => c.votos))) : null;

  // categórica × quantitativa: Mann-Whitney (patrimônio de eleitos × não eleitos, todos os cargos)
  (function mannWhitney() {
    const r = postos(pats), n1 = S.nEl, n2 = S.n - S.nEl;
    let soma = 0; TODOS.forEach((c, i) => { if (c.eleito) soma += r[i]; });
    S.U = soma - n1 * (n1 + 1) / 2;
    const z = (S.U - n1 * n2 / 2) / Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
    S.mwZ = z;
  })();

  // regressão linear múltipla dos votos (log10), deputados federais – mínimos quadrados
  function mqo(linhas, y) {
    const k = linhas[0].length, A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
    linhas.forEach((x, n) => { for (let i = 0; i < k; i++) { for (let j = 0; j < k; j++) A[i][j] += x[i] * x[j]; A[i][k] += x[i] * y[n]; } });
    for (let i = 0; i < k; i++) {                       // eliminação de Gauss
      let p = i; for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]];
      if (Math.abs(A[i][i]) < 1e-12) continue;
      for (let r = 0; r < k; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c <= k; c++) A[r][c] -= f * A[i][c]; }
    }
    const beta = A.map((l, i) => Math.abs(l[i]) < 1e-12 ? 0 : l[k] / l[i]);
    const my = y.reduce((a, v) => a + v, 0) / y.length;
    let sr = 0, st = 0; linhas.forEach((x, n) => { const e = y[n] - x.reduce((s, v, i) => s + v * beta[i], 0); sr += e * e; st += (y[n] - my) ** 2; });
    return { beta, r2: 1 - sr / st, dp: Math.sqrt(sr / Math.max(1, y.length - k)) };
  }
  const xVotos = c => [1, c.mandato ? 1 : 0, lp(c), c.mulher ? 0 : 1, c.raca === 'N' ? 1 : 0, c.raca === 'O' ? 1 : 0, c.superior ? 1 : 0];
  if (comVotos.length > 30) {
    S.ols = mqo(comVotos.map(xVotos), comVotos.map(c => Math.log10(c.votos + 1)));
    S.olsSimples = mqo(comVotos.map(c => [1, lp(c)]), comVotos.map(c => Math.log10(c.votos + 1)));
    const B = S.ols.beta;
    S.efVotos = { mandato: 10 ** B[1], patrimonio10: 10 ** B[2], homem: 10 ** B[3], negro: 10 ** B[4], superior: 10 ** B[6] };
  }
  const votosPrevistos = c => S.ols ? 10 ** xVotos(c).reduce((s, v, i) => s + v * S.ols.beta[i], 0) : null;

  // estados: vagas e candidatos a deputado federal
  const UF = {};
  DEP.forEach(c => { const u = UF[c.uf] = UF[c.uf] || { n: 0, vagas: 0, corte: Infinity }; u.n++; if (c.eleito) { u.vagas++; if (c.votos != null) u.corte = Math.min(u.corte, c.votos); } });
  // partidos
  const PART = {};
  DEP.forEach(c => { const p = PART[c.partido] = PART[c.partido] || { n: 0, e: 0, m: 0, me: 0 }; p.n++; if (c.eleito) p.e++; if (c.mulher) { p.m++; if (c.eleito) p.me++; } });
  const taxaPartido = s => { const p = PART[s]; return p && p.n >= 15 ? (p.e + 1) / (p.n + 2) : S.taxaDep; };
  const partidosOrd = Object.keys(PART).filter(s => PART[s].n >= 15).sort((x, y) => taxaPartido(y) - taxaPartido(x));

  // ---------- gráficos (SVG em texto, para os cartões "o dado por trás") ----------
  const T = { tinta: '#16141d', suave: '#6d6873', linha: '#ddd5c6', base: '#cbc4b6', roxo: '#7b2cbf', laranja: '#e2620f' };
  const G = {};

  // halteres: candidatos → eleitos
  G.halteres = grupos => {
    const W = 760, linha = 46, H = grupos.length * linha + 40, X = v => 230 + v / 100 * 470;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="g-svg" role="img" aria-label="Fatia de cada grupo entre candidatos e eleitos">`;
    [0, 25, 50, 75, 100].forEach(v => s += `<line x1="${X(v)}" x2="${X(v)}" y1="10" y2="${H - 24}" stroke="${T.linha}"/><text x="${X(v)}" y="${H - 6}" text-anchor="middle" class="g-eixo">${v}%</text>`);
    grupos.forEach((g, i) => {
      const y = 30 + i * linha, sobe = g.el > g.cand;
      s += `<text x="0" y="${y + 5}" class="g-rot">${esc(g.nome)}</text>
        <line x1="${X(g.cand)}" x2="${X(g.el)}" y1="${y}" y2="${y}" stroke="${sobe ? T.laranja : T.roxo}" stroke-width="5" class="g-anima"/>
        <circle cx="${X(g.cand)}" cy="${y}" r="8" fill="${T.base}"/><circle cx="${X(g.el)}" cy="${y}" r="10" fill="${sobe ? T.laranja : T.roxo}"/>
        <text x="${X(Math.max(g.cand, g.el)) + 16}" y="${y + 5}" class="g-val">${pct(g.cand, 0)} → ${pct(g.el, 0)}</text>`;
    });
    return s + '</svg>';
  };

  // histograma com marcador "você"
  G.histograma = (valores, { bins, rotulos, voce, rotVoce, cor = T.base, destaque = T.roxo }) => {
    const cont = new Array(bins.length - 1).fill(0);
    valores.forEach(v => { for (let i = 0; i < bins.length - 1; i++) if (v >= bins[i] && (v < bins[i + 1] || i === bins.length - 2)) { cont[i]++; break; } });
    const max = Math.max(...cont), W = 760, H = 230, larg = 700 / cont.length;
    let iv = -1; if (voce != null) for (let i = 0; i < bins.length - 1; i++) if (voce >= bins[i] && (voce < bins[i + 1] || i === bins.length - 2)) iv = i;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="g-svg" role="img" aria-label="Distribuição">`;
    cont.forEach((n, i) => { const h = 160 * n / max;
      s += `<rect x="${40 + i * larg + 2}" y="${180 - h}" width="${larg - 4}" height="${h}" rx="3" fill="${i === iv ? destaque : cor}" class="g-barra" style="--d:${i * 30}ms"/>`;
      if (rotulos[i]) s += `<text x="${40 + i * larg + larg / 2}" y="200" text-anchor="middle" class="g-eixo">${rotulos[i]}</text>`; });
    if (iv >= 0) { const x = 40 + iv * larg + larg / 2, h = 160 * cont[iv] / max;
      s += `<path d="M${x} ${180 - h - 8} l-8 -12 h16z" fill="${destaque}"/><text x="${x}" y="${180 - h - 26}" text-anchor="middle" class="g-voce">${esc(rotVoce || 'você')}</text>`; }
    return s + `<line x1="40" x2="740" y1="180" y2="180" stroke="${T.tinta}"/></svg>`;
  };

  // barras horizontais (ex.: taxa de eleição por partido)
  G.barras = (itens, { max, fmt = v => pct(v, 0) } = {}) => {
    const W = 760, linha = 30, H = itens.length * linha + 10, m = max || Math.max(...itens.map(x => x.v)) * 1.1;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="g-svg" role="img" aria-label="Barras">`;
    itens.forEach((it, i) => { const y = 6 + i * linha, w = 480 * it.v / m;
      s += `<text x="150" y="${y + 17}" text-anchor="end" class="g-rot ${it.forte ? 'forte' : ''}">${esc(it.nome)}</text>
        <rect x="162" y="${y + 3}" width="${Math.max(2, w)}" height="20" rx="4" fill="${it.cor || T.base}" class="g-barra-h" style="--d:${i * 40}ms"/>
        <text x="${170 + w}" y="${y + 18}" class="g-val">${fmt(it.v)}${it.nota ? ' · ' + esc(it.nota) : ''}</text>`; });
    return s + '</svg>';
  };

  // razões de chance com intervalo de confiança (escala log)
  G.pesos = () => {
    const itens = [['Já ter mandato', 'C(tem_mandato)[T.Sim]', 1], ['Patrimônio 10× maior', 'log_patrimonio', 1], ['Ensino superior', 'C(superior)[T.Sim]', 1],
      ['Ser homem', 'C(genero)[T.Masculino]', 1], ['Ser branco (vs. negro)', 'C(raca)[T.Negra]', -1]]
      .map(([n, k, s]) => { const [e, lo, hi] = or(k); return s > 0 ? [n, e, lo, hi] : [n, 1 / e, hi ? 1 / hi : null, lo ? 1 / lo : null]; })
      .sort((a, z) => z[1] - a[1]);
    const mn = 0.7, mx = Math.max(...itens.map(x => x[3] || x[1])) * 1.25, X = v => 220 + (Math.log(v) - Math.log(mn)) / (Math.log(mx) - Math.log(mn)) * 470;
    let s = `<svg viewBox="0 0 760 ${itens.length * 46 + 50}" class="g-svg" role="img" aria-label="O que pesa mais na chance de se eleger">`;
    [1, 2, 4, 8, 16].filter(v => v <= mx).forEach(v => s += `<line x1="${X(v)}" x2="${X(v)}" y1="8" y2="${itens.length * 46 + 16}" stroke="${v === 1 ? T.tinta : T.linha}" ${v === 1 ? 'stroke-dasharray="4 4"' : ''}/><text x="${X(v)}" y="${itens.length * 46 + 36}" text-anchor="middle" class="g-eixo">×${v}</text>`);
    itens.forEach(([n, e, lo, hi], i) => { const y = 26 + i * 46;
      s += `<text x="0" y="${y + 5}" class="g-rot">${n}</text>${lo ? `<line x1="${X(lo)}" x2="${X(hi)}" y1="${y}" y2="${y}" stroke="${T.roxo}" stroke-width="4" stroke-linecap="round" opacity=".45"/>` : ''}
        <circle cx="${X(e)}" cy="${y}" r="9" fill="${T.roxo}"/><text x="${X(hi || e) + 14}" y="${y + 5}" class="g-val">×${dec(e, 1)}</text>`; });
    return s + '</svg>';
  };

  // dispersão patrimônio × votos (log × log), com você
  G.dispersao = (lista, voce, votosVoce) => {
    const W = 760, H = 380, X = v => 60 + lim(Math.log10(v + 1), 0, 9) / 9 * 670, Y = v => 340 - lim(Math.log10(v + 1), 0, 6.5) / 6.5 * 320;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="g-svg" role="img" aria-label="Patrimônio e votos dos candidatos do estado">`;
    [[0, '0'], [3, 'R$ 1 mil'], [5, 'R$ 100 mil'], [6, 'R$ 1 mi'], [7, 'R$ 10 mi'], [8, 'R$ 100 mi']].forEach(([e, t]) => s += `<line x1="${X(10 ** e - 1)}" x2="${X(10 ** e - 1)}" y1="20" y2="340" stroke="${T.linha}"/><text x="${X(10 ** e - 1)}" y="362" text-anchor="middle" class="g-eixo">${t}</text>`);
    [[1, '10'], [2, '100'], [3, '1 mil'], [4, '10 mil'], [5, '100 mil'], [6, '1 mi']].forEach(([e, t]) => s += `<line x1="60" x2="730" y1="${Y(10 ** e)}" y2="${Y(10 ** e)}" stroke="${T.linha}"/><text x="52" y="${Y(10 ** e) + 4}" text-anchor="end" class="g-eixo">${t}</text>`);
    lista.filter(c => !c.eleito).forEach(c => s += `<circle cx="${X(c.patrimonio).toFixed(1)}" cy="${Y(c.votos || 0).toFixed(1)}" r="3.2" fill="${T.base}" opacity=".8"/>`);
    lista.filter(c => c.eleito).forEach(c => s += `<circle cx="${X(c.patrimonio).toFixed(1)}" cy="${Y(c.votos || 0).toFixed(1)}" r="4" fill="${T.laranja}"/>`);
    if (voce && votosVoce != null) { const x = X(voce.patrimonio), y = Y(votosVoce);
      s += `<circle cx="${x}" cy="${y}" r="16" fill="none" stroke="${T.roxo}" stroke-width="3" class="g-pulsa"/><circle cx="${x}" cy="${y}" r="8" fill="${T.roxo}"/>
        <text x="${x + (x > 600 ? -22 : 22)}" y="${y - 14}" ${x > 600 ? 'text-anchor="end"' : ''} class="g-voce">você (estimativa)</text>`; }
    return s + `<text x="395" y="378" text-anchor="middle" class="g-eixo">patrimônio declarado →</text></svg>`;
  };

  // linhas da série histórica
  G.serie = () => {
    const anos = [2018, 2022, 2026], hm = D.hemiciclo || {};
    const series = [['Mulheres', T.roxo, [15.0, 17.7, hm.genero ? hm.genero.real.Feminino : null], 51.5], ['Pessoas negras', T.laranja, [24.0, 26.1, hm.raca ? hm.raca.real.Negra : null], 55.5]];
    const X = i => 90 + i * 240, Y = v => 260 - v / 60 * 240;
    let s = `<svg viewBox="0 0 760 290" class="g-svg" role="img" aria-label="Mulheres e pessoas negras na Câmara, 2018 a 2026">`;
    [0, 20, 40, 60].forEach(v => s += `<line x1="60" x2="740" y1="${Y(v)}" y2="${Y(v)}" stroke="${T.linha}"/><text x="52" y="${Y(v) + 4}" text-anchor="end" class="g-eixo">${v}%</text>`);
    anos.forEach((a, i) => s += `<text x="${X(i)}" y="284" text-anchor="middle" class="g-rot">${a}</text>`);
    series.forEach(([n, cor, v, pop]) => { const ok = v.filter(x => x != null);
      s += `<line x1="60" x2="740" y1="${Y(pop)}" y2="${Y(pop)}" stroke="${cor}" stroke-dasharray="6 5" opacity=".7"/><text x="740" y="${Y(pop) - 6}" text-anchor="end" class="g-eixo" style="fill:${cor}">${n} no Brasil: ${pct(pop)}</text>
        <path d="${ok.map((x, i) => (i ? 'L' : 'M') + X(i) + ' ' + Y(x)).join(' ')}" fill="none" stroke="${cor}" stroke-width="4" class="g-anima"/>
        ${ok.map((x, i) => `<circle cx="${X(i)}" cy="${Y(x)}" r="7" fill="${cor}"/><text x="${X(i)}" y="${n === 'Mulheres' ? Y(x) + 28 : Y(x) - 14}" text-anchor="middle" class="g-val" style="fill:${cor}">${pct(x)}</text>`).join('')}
        <text x="${X(ok.length - 1) + 18}" y="${Y(ok[ok.length - 1]) + 5}" class="g-rot" style="fill:${cor}">${n}</text>`; });
    return s + '</svg>';
  };

  // curva ROC (validação do modelo)
  G.roc = () => {
    const V = D.validacao; if (!V) return '';
    const X = v => 40 + v * 220, Y = v => 240 - v * 220, d = V.roc.map(([f, t], i) => (i ? 'L' : 'M') + X(f).toFixed(1) + ' ' + Y(t).toFixed(1)).join(' ');
    return `<svg viewBox="0 0 280 270" class="g-svg g-roc" role="img" aria-label="Curva ROC do modelo"><rect x="40" y="20" width="220" height="220" fill="none" stroke="${T.linha}"/>
      <line x1="${X(0)}" y1="${Y(0)}" x2="${X(1)}" y2="${Y(1)}" stroke="${T.suave}" stroke-dasharray="4 4"/>
      <path d="${d} L${X(1)} ${Y(0)} L${X(0)} ${Y(0)}Z" fill="${T.roxo}" opacity=".15"/><path d="${d}" fill="none" stroke="${T.roxo}" stroke-width="4"/>
      <text x="150" y="262" text-anchor="middle" class="g-eixo">falsos positivos</text></svg>`;
  };

  // pontos de votação: "candidaturas fantasmas"
  G.laranjas = () => {
    const L = D.laranjas; if (!L) return '';
    const itens = [{ nome: 'Mulheres', v: L.Feminino.menos_100, cor: T.roxo, forte: true }, { nome: 'Homens', v: L.Masculino.menos_100, cor: T.base }];
    return G.barras(itens, { max: Math.max(itens[0].v, itens[1].v) * 1.35, fmt: v => pct(v) + ' com menos de 100 votos' });
  };

  return { D, M, IC, TODOS, DEP, S, UF, PART, taxaPartido, partidosOrd, termos, base, chance, or, votosPrevistos, lp,
    num, dec, pct, fmtP, reais, esc, logistica, logit, lim, mediana, chaveFoto, iniciais, fotoDe, retrato, corGrupo, G, T };
})();
