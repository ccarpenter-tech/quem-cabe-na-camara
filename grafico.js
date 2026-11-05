// =====================================================================
// Quem cabe na Câmara? – gráficos e interatividade
// Os dados vêm do arquivo dados.js (variável DADOS), gerado no Colab.
// =====================================================================

const COR = { eleito: '#d95f02', destaque: '#7b2cbf', base: '#cfcfcf', escuro: '#8a8a8a' };

// ---------- funções de apoio ----------
const pct = (x, casas = 1) => x.toLocaleString('pt-BR', { maximumFractionDigits: casas }) + '%';
const num = (x) => Math.round(x).toLocaleString('pt-BR');
const escreve = (id, texto) => { const el = document.getElementById(id); if (el) el.textContent = texto; };

// =====================================================================
// 0. Transformar o texto do funil em uma lista de candidatos
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

// % de um grupo entre candidatos e entre eleitos
function proporcoes(teste) {
  return [100 * candidatos.filter(teste).length / candidatos.length,
          100 * eleitos.filter(teste).length / eleitos.length];
}

// =====================================================================
// CAPA e textos do ato 1 (os números vêm direto dos dados)
// =====================================================================
const GRUPOS = {
  2: { nome: 'Mulheres', teste: c => c.mulher },
  3: { nome: 'Pessoas negras', teste: c => c.raca === 'N' },
  4: { nome: 'Mulheres negras', teste: c => c.mulher && c.raca === 'N' },
  5: { nome: 'Patrimônio acima de R$ 1 milhão', teste: c => c.patrimonio >= 3 },
  6: { nome: 'Já tinha mandato', teste: c => c.mandato }
};

escreve('n-cand', num(candidatos.length));
escreve('n-eleitos', num(eleitos.length));
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
// ATO 1 – O FUNIL (desenhado em canvas, porque são milhares de pontos)
// =====================================================================
const canvas = document.getElementById('funil');
const ctx = canvas.getContext('2d');
const LARGURA = 900, ALTURA = 470;
const escala = window.devicePixelRatio || 1;
canvas.width = LARGURA * escala;
canvas.height = ALTURA * escala;
ctx.scale(escala, escala);

// desenha uma grade de pontos (um "waffle") dentro de um retângulo
function grade(lista, x0, largura, corDe, titulo) {
  const colunas = Math.ceil(Math.sqrt(lista.length * 1.3));
  const passo = largura / colunas;
  const raio = Math.max(passo * 0.42, 0.8);
  ctx.fillStyle = '#1f1f1f';
  ctx.font = 'bold 15px Helvetica, Arial, sans-serif';
  ctx.fillText(titulo, x0, 22);
  lista.forEach((c, i) => {
    const col = i % colunas, lin = Math.floor(i / colunas);
    ctx.fillStyle = corDe(c);
    ctx.beginPath();
    ctx.arc(x0 + col * passo + passo / 2, 40 + lin * passo + passo / 2, raio, 0, 2 * Math.PI);
    ctx.fill();
  });
}

function desenharFunil(passo) {
  ctx.clearRect(0, 0, LARGURA, ALTURA);
  const grupo = GRUPOS[passo];
  // ordena para que o grupo em destaque fique junto, no começo da grade
  const ordena = lista => grupo
    ? [...lista].sort((a, b) => grupo.teste(b) - grupo.teste(a))
    : [...lista].sort((a, b) => b.eleito - a.eleito);

  let corCand, corEleito, legenda;
  if (passo === 0) {
    corCand = () => COR.escuro;
    legenda = [];
  } else if (passo === 1) {
    corCand = c => c.eleito ? COR.eleito : COR.base;
    corEleito = () => COR.eleito;
    legenda = [['Eleito', COR.eleito], ['Não eleito', COR.base]];
  } else {
    corCand = corEleito = c => grupo.teste(c) ? COR.destaque : COR.base;
    legenda = [[grupo.nome, COR.destaque], ['Demais', COR.base]];
  }

  grade(ordena(candidatos), 0, 540, corCand, 'Candidatos (' + num(candidatos.length) + ')');
  if (passo > 0) grade(ordena(eleitos), 600, 300, corEleito, 'Eleitos (' + num(eleitos.length) + ')');

  document.getElementById('legenda-funil').innerHTML = legenda
    .map(([nome, cor]) => `<span style="--cor:${cor}">${nome}</span>`).join('');
}

// observa os passos: quando um passo chega ao meio da tela, o gráfico muda
const observador = new IntersectionObserver(entradas => {
  entradas.forEach(e => {
    if (e.isIntersecting) {
      document.querySelectorAll('.passo').forEach(p => p.classList.remove('ativo'));
      e.target.classList.add('ativo');
      desenharFunil(Number(e.target.dataset.passo));
    }
  });
}, { rootMargin: '-45% 0px -45% 0px' });
document.querySelectorAll('.passo').forEach(p => observador.observe(p));
desenharFunil(0);

// =====================================================================
// ATO 2 – O HEMICICLO (513 cadeiras em SVG)
// =====================================================================
const svg = document.getElementById('hemiciclo');
const TOTAL = 513, FILEIRAS = 12, CX = 300, CY = 310, R_INT = 110, R_EXT = 290;

// 1) calcula a posição de cada cadeira: fileiras de fora têm mais cadeiras
const raios = Array.from({ length: FILEIRAS }, (_, i) => R_INT + i * (R_EXT - R_INT) / (FILEIRAS - 1));
const somaRaios = raios.reduce((a, b) => a + b, 0);
let porFileira = raios.map(r => Math.round(TOTAL * r / somaRaios));
porFileira[FILEIRAS - 1] += TOTAL - porFileira.reduce((a, b) => a + b, 0);   // ajuste para dar 513

const cadeiras = [];
raios.forEach((r, f) => {
  const n = porFileira[f];
  for (let k = 0; k < n; k++) {
    const angulo = Math.PI - (k / (n - 1)) * Math.PI;   // da esquerda (π) para a direita (0)
    cadeiras.push({ x: CX + r * Math.cos(angulo), y: CY - r * Math.sin(angulo), angulo });
  }
});
cadeiras.sort((a, b) => b.angulo - a.angulo);   // ordem da esquerda para a direita

const raioCadeira = 0.42 * (R_EXT - R_INT) / (FILEIRAS - 1);
cadeiras.forEach(c => {
  c.el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.el.setAttribute('cx', c.x.toFixed(1));
  c.el.setAttribute('cy', c.y.toFixed(1));
  c.el.setAttribute('r', raioCadeira.toFixed(1));
  svg.appendChild(c.el);
});

// 2) transforma porcentagens em número de cadeiras (método dos maiores restos)
function emCadeiras(percentuais) {
  const nomes = Object.keys(percentuais);
  const brutos = nomes.map(n => TOTAL * percentuais[n] / 100);
  const inteiros = brutos.map(Math.floor);
  let faltam = TOTAL - inteiros.reduce((a, b) => a + b, 0);
  const ordem = brutos.map((b, i) => [b - inteiros[i], i]).sort((a, b) => b[0] - a[0]);
  for (let j = 0; j < faltam; j++) inteiros[ordem[j][1]]++;
  return nomes.map((n, i) => [n, inteiros[i]]);
}

const ROTULO = { Feminino: 'Mulheres', Masculino: 'Homens',
                 Negra: 'Pessoas negras', Branca: 'Pessoas brancas', Outras: 'Indígenas e amarelas' };
const COR_HEMI = { Feminino: COR.destaque, Masculino: COR.base,
                   Negra: COR.destaque, Branca: COR.base, Outras: COR.escuro };
const TEXTO_CENARIO = { real: 'na Câmara eleita em 2026',
                        candidatos: 'se a Câmara tivesse o perfil dos candidatos',
                        brasil: 'se a Câmara tivesse o perfil da população (Censo 2022)' };

let dimensao = 'genero', cenario = 'real';

function desenharHemiciclo() {
  const grupos = emCadeiras(DADOS.hemiciclo[dimensao][cenario]);
  let i = 0;
  grupos.forEach(([nome, n]) => {
    for (let k = 0; k < n; k++) cadeiras[i++].el.setAttribute('fill', COR_HEMI[nome]);
  });
  const [principal, nPrincipal] = grupos[0];   // Feminino ou Negra vem primeiro
  escreve('hemi-numero', `${nPrincipal} cadeiras de ${ROTULO[principal].toLowerCase()} ${TEXTO_CENARIO[cenario]}`);
  document.getElementById('legenda-hemi').innerHTML = grupos
    .map(([nome, n]) => `<span style="--cor:${COR_HEMI[nome]}">${ROTULO[nome]}: ${n}</span>`).join('');
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
// ATO 3 – O QUE PESA MAIS (razões de chances do modelo)
// =====================================================================
const M = DADOS.modelo;
const pesos = [
  ['Já ter mandato político', Math.exp(M['C(tem_mandato)[T.Sim]'])],
  ['Patrimônio 10 vezes maior', Math.exp(M['log_patrimonio'])],
  ['Ser homem (em vez de mulher)', Math.exp(M['C(genero)[T.Masculino]'])],
  ['Ser branco (em vez de negro)', Math.exp(-M['C(raca)[T.Negra]'])],
  ['Ter ensino superior completo', Math.exp(M['C(superior)[T.Sim]'])]
].sort((a, b) => b[1] - a[1]);
const maiorPeso = pesos[0][1];
document.getElementById('barras-peso').innerHTML = pesos.map(([nome, valor]) => `
  <div class="linha-peso">
    <span>${nome}</span>
    <div class="barra-peso" style="width:${(100 * valor / maiorPeso).toFixed(1)}%">
      × ${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</div>
  </div>`).join('');

// =====================================================================
// ATO 4 – O TESTE "VOCÊ CABERIA NA CÂMARA?"
// =====================================================================
const NOMES_EIXOS = { genero: 'Gênero', raca: 'Cor/raça', faixa_etaria: 'Idade',
                      superior: 'Ensino superior', faixa_patrimonio: 'Patrimônio',
                      tem_mandato: 'Já tem mandato' };

function chanceDoModelo(r) {
  let x = M['Intercept'];
  x += M['C(cargo)[T.' + r.cargo + ']'] || 0;          // Deputado Distrital é a referência
  if (r.tem_mandato === 'Sim') x += M['C(tem_mandato)[T.Sim]'];
  if (r.genero === 'Masculino') x += M['C(genero)[T.Masculino]'];
  if (r.raca !== 'Branca') x += M['C(raca)[T.' + r.raca + ']'];
  if (r.superior === 'Sim') x += M['C(superior)[T.Sim]'];
  x += M['log_patrimonio'] * (DADOS.log_pat_faixa[r.faixa_patrimonio] || 0);
  return 1 / (1 + Math.exp(-x));                        // fórmula da regressão logística
}

document.getElementById('teste').addEventListener('submit', evento => {
  evento.preventDefault();
  const r = Object.fromEntries(new FormData(evento.target));
  const info = DADOS.eixos[r.cargo];
  const chance = chanceDoModelo(r);
  const razao = (100 * chance) / info.taxa;

  let rotulo = 'No meio do caminho';
  if (razao >= 1.5) rotulo = 'O perfil da Câmara';
  if (razao <= 0.5) rotulo = 'A exceção';

  escreve('res-rotulo', rotulo);
  escreve('res-chance', pct(100 * chance) + ' de chance de se eleger');
  escreve('res-frase',
    `Em 2026, 1 em cada ${Math.round(100 / info.taxa)} candidatos a ${r.cargo.toLowerCase()} se elegeu. ` +
    `Com o seu perfil, foi cerca de 1 em cada ${Math.max(1, Math.round(1 / chance))}.`);

  document.getElementById('res-eixos').innerHTML = Object.keys(NOMES_EIXOS).map(eixo => {
    const [cand, el] = (info[eixo] && info[eixo][r[eixo]]) || [0, 0];
    return `<div class="eixo">
      <span><b>${NOMES_EIXOS[eixo]}</b><br>${r[eixo]}</span>
      <div class="barras">
        <div class="b-cand" style="width:${cand}%"><span>${pct(cand)} dos candidatos</span></div>
        <div class="b-eleito" style="width:${el}%"><span>${pct(el)} dos eleitos</span></div>
      </div></div>`;
  }).join('');

  const caixa = document.getElementById('resultado');
  caixa.hidden = false;
  caixa.scrollIntoView({ behavior: 'smooth' });
});