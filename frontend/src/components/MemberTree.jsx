import React, { useEffect, useState, useMemo } from 'react';
import { getMembers } from '../services/api';
import toast from 'react-hot-toast';

const VH           = 590;
const TRUNK_TOP_Y  = 372;
const CANOPY_BASE_Y = 182;
const FRUIT_R      = 20;
const MINI_SPACING = 43;

function initials(nome) {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function miniCanopyR(count) {
  if (count <= 1)  return 30;
  if (count <= 3)  return 50;
  if (count <= 6)  return 68;
  if (count <= 10) return 88;
  if (count <= 15) return 108;
  return 128;
}

function packInCircle(count, R) {
  const r = R - FRUIT_R - 5;
  if (r <= 0) return [[0, 0]];
  const positions = [];
  let row = 0;
  for (
    let y = -r;
    y <= r && positions.length < count;
    y += MINI_SPACING * 0.88, row++
  ) {
    const hw = Math.sqrt(Math.max(0, r * r - y * y));
    const offsetX = (row % 2) * MINI_SPACING * 0.5;
    for (
      let x = -hw + offsetX;
      x <= hw && positions.length < count;
      x += MINI_SPACING
    ) {
      positions.push([Math.round(x), Math.round(y)]);
    }
  }
  return positions;
}

// Buracos de luz dentro da copa — posições determinísticas por grupo
function sparkleDots(gi, cr) {
  return Array.from({ length: 6 }, (_, si) => {
    const angle = (gi * 2.399 + si * 1.047) % (Math.PI * 2);
    const dist  = cr * (0.22 + (si % 3) * 0.12);
    return [Math.cos(angle) * dist, Math.sin(angle) * dist, 1.4 + (si % 2) * 0.9];
  });
}

export default function MemberTree({ onMemberClick }) {
  const [members, setMembers] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMembers()
      .then(setMembers)
      .catch(() => toast.error('Erro ao carregar membros'))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const map = {};
    for (const m of members) {
      const key = m.area?.trim() || 'Geral';
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return Object.entries(map)
      .map(([area, mems]) => ({ area, mems }))
      .sort((a, b) => {
        const da = b.mems.filter(m => m.tipoMembro === 'membro').length
                 - a.mems.filter(m => m.tipoMembro === 'membro').length;
        return da !== 0 ? da : a.area.localeCompare(b.area);
      });
  }, [members]);

  const N  = groups.length || 1;
  const VW = Math.max(680, N * 172 + 80);
  const CX = VW / 2;

  const groupData = useMemo(() => {
    if (!groups.length) return [];
    const spread = Math.min(VW - 140, N * 172);
    return groups.map((g, i) => {
      const cx   = N === 1 ? CX : CX - spread / 2 + 86 + i * (spread - 172) / (N - 1);
      const dist = Math.abs(cx - CX) / (VW / 2);
      const cy   = CANOPY_BASE_Y + dist * 58;
      const cr   = miniCanopyR(g.mems.length);
      const pos  = packInCircle(g.mems.length, cr);
      return { ...g, cx, cy, cr, pos };
    });
  }, [groups, VW, CX, N]);

  const hovMember = hovered ? members.find(m => m._id === hovered) : null;
  const hovData   = useMemo(() => {
    if (!hovMember) return null;
    for (const g of groupData) {
      const mi = g.mems.findIndex(m => m._id === hovMember._id);
      if (mi >= 0 && g.pos[mi]) {
        return { fx: g.cx + g.pos[mi][0], fy: g.cy + g.pos[mi][1] };
      }
    }
    return null;
  }, [hovMember, groupData]);

  if (loading) {
    return (
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
        <span style={{ color: 'var(--text-muted)', marginTop: 14 }}>Carregando a árvore...</span>
      </div>
    );
  }

  const ativos = members.filter(m => m.tipoMembro === 'membro').length;
  const exs    = members.filter(m => m.tipoMembro === 'ex-membro').length;

  return (
    <div style={s.wrap}>
      <h2 style={s.title}>A Árvore da Microraptor</h2>
      <p style={s.sub}>
        Cada galho é uma área · cada fruto é um membro da nossa história
      </p>

      <div style={s.svgWrap}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* Fundo */}
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="rgba(6,14,6,0.55)" />
              <stop offset="100%" stopColor="rgba(10,22,6,0.30)" />
            </linearGradient>
            {/* Tronco */}
            <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#2a1c0f" />
              <stop offset="40%"  stopColor="#56381f" />
              <stop offset="100%" stopColor="#2a1c0f" />
            </linearGradient>
            {/* Copa */}
            <radialGradient id="canopyGrad" cx="42%" cy="28%" r="75%">
              <stop offset="0%"   stopColor="#266026" />
              <stop offset="50%"  stopColor="#153415" />
              <stop offset="100%" stopColor="#060e06" />
            </radialGradient>
            <radialGradient id="canopySheen" cx="38%" cy="20%" r="52%">
              <stop offset="0%"   stopColor="rgba(100,220,100,0.28)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
            {/* Frutos */}
            <radialGradient id="fruitRed" cx="34%" cy="28%" r="65%">
              <stop offset="0%"   stopColor="#ff6060" />
              <stop offset="45%"  stopColor="#d42020" />
              <stop offset="100%" stopColor="#7a0202" />
            </radialGradient>
            <radialGradient id="fruitPurple" cx="34%" cy="28%" r="65%">
              <stop offset="0%"   stopColor="#c0c3ff" />
              <stop offset="45%"  stopColor="#8285f8" />
              <stop offset="100%" stopColor="#3b3e9e" />
            </radialGradient>
            {/* Filtros */}
            <filter id="fruitShadow" x="-35%" y="-35%" width="170%" height="170%">
              <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor="rgba(0,0,0,0.6)" />
            </filter>
            <filter id="fruitGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="canopyGlow" x="-14%" y="-14%" width="128%" height="128%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="labelGlow" x="-20%" y="-30%" width="140%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="rgba(40,160,40,0.35)" />
            </filter>
          </defs>

          {/* ── Fundo emoldurado ── */}
          <rect x={6} y={6} width={VW - 12} height={VH - 12} rx={22}
            fill="url(#bgGrad)"
            stroke="rgba(40,90,40,0.18)" strokeWidth={1}
          />

          {/* ── Chão ── */}
          <ellipse cx={CX} cy={VH - 14} rx={VW * 0.44} ry={30}
            fill="rgba(16,42,12,0.6)" />
          {/* Grama */}
          {Array.from({ length: 26 }, (_, i) => {
            const bx = CX - VW * 0.4 + i * (VW * 0.8 / 25);
            const by = VH - 30;
            const h1 = 14 + (i % 3) * 5;
            const h2 = 12 + (i % 4) * 4;
            return (
              <g key={i}>
                <path d={`M ${bx} ${by} Q ${bx-5} ${by-h1+3} ${bx-2} ${by-h1}`}
                  stroke={i % 2 === 0 ? '#2e6620' : '#235218'}
                  strokeWidth={i % 3 === 0 ? 2.2 : 1.8}
                  fill="none" strokeLinecap="round" />
                <path d={`M ${bx+7} ${by} Q ${bx+13} ${by-h2+2} ${bx+9} ${by-h2}`}
                  stroke={i % 2 === 0 ? '#1e4a12' : '#285e1c'}
                  strokeWidth={1.5} fill="none" strokeLinecap="round" />
              </g>
            );
          })}

          {/* ── Raízes ── */}
          {[
            [CX-28, VH-38, CX-125, VH-13, '#4e3018', 10],
            [CX-22, VH-32, CX-88,  VH-6,  '#3a2515',  6],
            [CX+28, VH-38, CX+125, VH-13, '#4e3018', 10],
            [CX+22, VH-32, CX+88,  VH-6,  '#3a2515',  6],
            [CX,    VH-36, CX-32,  VH,    '#3d2810',   4],
            [CX+10, VH-36, CX+36,  VH,    '#3d2810',   3],
          ].map(([x1, y1, x2, y2, col, sw], ri) => (
            <path key={ri}
              d={`M ${x1} ${y1} Q ${(x1+x2)/2} ${(y1+y2)/2-6} ${x2} ${y2}`}
              fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round"
            />
          ))}

          {/* ── Tronco ── */}
          <path
            d={`M ${CX-34} ${VH-38}
                Q ${CX-25} 420 ${CX-21} ${TRUNK_TOP_Y}
                L ${CX+21} ${TRUNK_TOP_Y}
                Q ${CX+25} 420 ${CX+34} ${VH-38} Z`}
            fill="url(#trunkGrad)"
          />
          {/* Highlight lateral esquerdo (efeito 3D) */}
          <path d={`M ${CX-20} ${VH-44} Q ${CX-17} 425 ${CX-15} ${TRUNK_TOP_Y+6}`}
            fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={5} strokeLinecap="round" />
          {/* Veios do tronco */}
          <path d={`M ${CX-10} 390 Q ${CX+2} 418 ${CX-6} 456`}
            fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={3} strokeLinecap="round" />
          <path d={`M ${CX+6}  406 Q ${CX+12} 432 ${CX+5}  468`}
            fill="none" stroke="rgba(0,0,0,0.16)" strokeWidth={2} strokeLinecap="round" />
          <path d={`M ${CX-14} 430 Q ${CX-8} 448 ${CX-11} 472`}
            fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={2} strokeLinecap="round" />

          {/* ── Galhos + copas + frutos ── */}
          {groupData.map(({ area, mems, cx, cy, cr, pos }, gi) => {
            const dist  = Math.abs(cx - CX) / (VW / 2);
            const bw    = Math.max(5, Math.round(15 - dist * 10));
            const cpx   = CX + (cx - CX) * 0.36;
            const cpy   = TRUNK_TOP_Y - 58 - dist * 42;
            const pillW = Math.max(56, area.length * 7.8 + 22);
            const sparks = sparkleDots(gi, cr);

            return (
              <g key={area}>
                {/* Galho principal */}
                <path
                  d={`M ${CX} ${TRUNK_TOP_Y} Q ${cpx} ${cpy} ${cx} ${cy + cr}`}
                  fill="none" stroke="#3d2810" strokeWidth={bw} strokeLinecap="round"
                />
                {/* Galho secundário */}
                <path
                  d={`M ${CX} ${TRUNK_TOP_Y} Q ${cpx-14} ${cpy+26} ${cx - cr*0.52} ${cy + cr*0.62}`}
                  fill="none" stroke="#2e1e0c"
                  strokeWidth={Math.max(2, Math.round(bw * 0.42))}
                  strokeLinecap="round"
                />
                {/* Nó de junção galho↔copa */}
                <circle cx={cx} cy={cy + cr - 2} r={bw * 0.75}
                  fill="#3d2810" stroke="rgba(255,255,255,0.07)" strokeWidth={1.5}
                />

                {/* Halo externo */}
                <ellipse cx={cx} cy={cy} rx={cr + 16} ry={cr + 14}
                  fill="rgba(6,18,6,0.45)" filter="url(#canopyGlow)" />

                {/* Copa base */}
                <ellipse cx={cx} cy={cy} rx={cr} ry={cr}
                  fill="url(#canopyGrad)"
                  stroke="rgba(60,140,60,0.55)" strokeWidth={1.5}
                />

                {/* Reflex no topo */}
                <ellipse cx={cx} cy={cy} rx={cr} ry={cr}
                  fill="url(#canopySheen)" />

                {/* Manchas orgânicas de folhagem na borda */}
                {Array.from({ length: 8 }, (_, bi) => {
                  const angle  = (gi * 1.618 + bi * (Math.PI * 2 / 8)) % (Math.PI * 2);
                  const bumpR  = cr * (0.20 + (bi % 3) * 0.07);
                  const bumpX  = cx + Math.cos(angle) * cr * 0.87;
                  const bumpY  = cy + Math.sin(angle) * cr * 0.87;
                  return (
                    <circle key={bi} cx={bumpX} cy={bumpY} r={bumpR}
                      fill={bi % 2 === 0 ? 'rgba(20,58,20,0.62)' : 'rgba(28,72,28,0.48)'} />
                  );
                })}

                {/* Brilhos de luz internos (fireflies) */}
                {sparks.map(([sx, sy, sr], si) => (
                  <circle key={si}
                    cx={cx + sx} cy={cy + sy} r={sr}
                    fill={`rgba(180,255,180,${0.10 + si * 0.03})`}
                  />
                ))}

                {/* Anel interno suave */}
                <ellipse cx={cx} cy={cy - cr * 0.1} rx={cr * 0.6} ry={cr * 0.55}
                  fill="none" stroke="rgba(80,180,80,0.08)" strokeWidth={cr * 0.18} />

                {/* Label da área — pílula */}
                <g filter="url(#labelGlow)">
                  <rect
                    x={cx - pillW / 2} y={cy + cr + 10}
                    width={pillW} height={20} rx={10}
                    fill="rgba(18,50,18,0.92)"
                    stroke="rgba(70,150,70,0.45)" strokeWidth={1}
                  />
                  <text
                    x={cx} y={cy + cr + 20}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(175,235,175,0.95)" fontSize={10.5} fontWeight={700}
                    fontFamily="system-ui, -apple-system, sans-serif"
                    style={{ userSelect: 'none', letterSpacing: '0.06em', textTransform: 'uppercase' }}
                  >
                    {area}
                  </text>
                </g>

                {/* Frutos */}
                {mems.map((m, mi) => {
                  if (!pos[mi]) return null;
                  const [dx, dy] = pos[mi];
                  const fx    = cx + dx;
                  const fy    = cy + dy;
                  const isEx  = m.tipoMembro === 'ex-membro';
                  const isHov = hovered === m._id;
                  const r     = isHov ? FRUIT_R + 4 : FRUIT_R;

                  return (
                    <g
                      key={m._id}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() => setHovered(m._id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => onMemberClick && onMemberClick(m)}
                    >
                      {/* Halo hover */}
                      {isHov && (
                        <circle cx={fx} cy={fy} r={r + 10}
                          fill={isEx ? 'rgba(99,102,241,0.20)' : 'rgba(220,20,20,0.18)'} />
                      )}
                      {/* Caule */}
                      <path
                        d={`M ${fx} ${fy - r} Q ${fx+3} ${fy-r-6} ${fx+1} ${fy-r-11}`}
                        fill="none" stroke="#2a6018" strokeWidth={1.5} strokeLinecap="round"
                      />
                      {/* Fruto */}
                      <circle
                        cx={fx} cy={fy} r={r}
                        fill={isEx ? 'url(#fruitPurple)' : 'url(#fruitRed)'}
                        stroke="rgba(255,255,255,0.25)" strokeWidth={1.5}
                        filter={isHov ? 'url(#fruitGlow)' : 'url(#fruitShadow)'}
                      />
                      {/* Brilho principal */}
                      <circle cx={fx - r*0.28} cy={fy - r*0.30} r={r*0.32}
                        fill="rgba(255,255,255,0.22)" />
                      {/* Brilho secundário (ponto de luz) */}
                      <circle cx={fx - r*0.10} cy={fy - r*0.46} r={r*0.13}
                        fill="rgba(255,255,255,0.42)" />
                      {/* Iniciais */}
                      <text
                        x={fx} y={fy + 1}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="white" fontSize={isHov ? 10 : 9} fontWeight={800}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        style={{ userSelect: 'none', letterSpacing: '0.03em' }}
                      >
                        {initials(m.nome)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* ── Tooltip (sempre no topo) ── */}
          {hovMember && hovData && (() => {
            const { fx, fy } = hovData;
            const name   = hovMember.nome;
            const area   = hovMember.area || '';
            const label  = area ? `${name}  ·  ${area}` : name;
            const w      = Math.max(120, label.length * 6.8 + 28);
            const h      = 46;
            const bx     = Math.min(Math.max(fx - w / 2, 8), VW - w - 8);
            const by     = fy - FRUIT_R - 62;
            const tipX   = Math.min(Math.max(fx, bx + 12), bx + w - 12);

            return (
              <g style={{ pointerEvents: 'none' }}>
                {/* Seta */}
                <polygon
                  points={`${tipX-7},${by+h} ${tipX+7},${by+h} ${tipX},${by+h+9}`}
                  fill="#13132a"
                />
                {/* Caixa */}
                <rect x={bx} y={by} width={w} height={h} rx={9}
                  fill="#13132a" stroke="#38385e" strokeWidth={1}
                  filter="url(#fruitShadow)"
                />
                {/* Nome */}
                <text x={bx + w/2} y={by + 17}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#f2f2f2" fontSize={12} fontWeight={700}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {name}
                  {area && <tspan fill="#888" fontWeight={400}> · {area}</tspan>}
                </text>
                {/* Dica de clique */}
                <text x={bx + w/2} y={by + 34}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="rgba(120,120,180,0.75)" fontSize={9.5} fontWeight={500}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  clique para ver detalhes
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legenda */}
      {members.length > 0 && (
        <div style={s.legend}>
          <div style={s.legendItem}>
            <span style={{ ...s.dot, background: 'radial-gradient(circle at 34% 28%, #ff6060, #7a0202)' }} />
            <span>Membro ativo ({ativos})</span>
          </div>
          <div style={s.legendItem}>
            <span style={{ ...s.dot, background: 'radial-gradient(circle at 34% 28%, #c0c3ff, #3b3e9e)' }} />
            <span>Ex-membro ({exs})</span>
          </div>
        </div>
      )}

      {members.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginTop: 16 }}>
          Nenhum membro cadastrado ainda. Seja o primeiro fruto desta árvore.
        </p>
      )}
    </div>
  );
}

const s = {
  wrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    paddingBottom: 40,
  },
  loadingWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: 80,
  },
  spinner: {
    width: 32, height: 32,
    border: '3px solid rgba(40,120,40,0.25)',
    borderTop: '3px solid rgba(40,180,40,0.8)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  title: {
    fontSize: 22, fontWeight: 800, color: 'var(--text)',
    marginBottom: 8, textAlign: 'center',
  },
  sub: {
    fontSize: 14, color: 'var(--text-muted)', maxWidth: 480,
    textAlign: 'center', lineHeight: 1.6, marginBottom: 28,
  },
  svgWrap: {
    width: '100%', maxWidth: 740,
    overflowX: 'auto',
  },
  legend: {
    display: 'flex', gap: 28, marginTop: 22, flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, color: 'var(--text-muted)',
  },
  dot: {
    display: 'inline-block', width: 13, height: 13,
    borderRadius: '50%', flexShrink: 0,
  },
};
