import React, { useEffect, useState } from 'react';
import { getMembers } from '../services/api';
import toast from 'react-hot-toast';

const VW = 640;
const VH = 500;
const CX = VW / 2;          // centro horizontal
const CANOPY_CY = 188;      // centro vertical da copa
const CANOPY_RX = 252;      // raio horizontal da copa
const CANOPY_RY = 168;      // raio vertical da copa
const FRUIT_R = 20;         // raio do fruto
const SPACING = 48;         // espaçamento entre frutos

function initials(nome) {
  const parts = nome.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Empacotamento hexagonal dentro da elipse da copa
function packPositions(count) {
  const rx = CANOPY_RX - FRUIT_R - 6;
  const ry = CANOPY_RY - FRUIT_R - 6;
  const positions = [];
  let row = 0;

  for (
    let y = CANOPY_CY - ry;
    y <= CANOPY_CY + ry && positions.length < count;
    y += SPACING * 0.88,
    row++
  ) {
    const dy = (y - CANOPY_CY) / ry;
    const hw = rx * Math.sqrt(Math.max(0, 1 - dy * dy));
    const offsetX = (row % 2) * SPACING * 0.5;
    for (
      let x = CX - hw + offsetX;
      x <= CX + hw && positions.length < count;
      x += SPACING
    ) {
      positions.push([Math.round(x), Math.round(y)]);
    }
  }
  return positions;
}

export default function MemberTree() {
  const [members, setMembers] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMembers()
      .then(setMembers)
      .catch(() => toast.error('Erro ao carregar membros'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
        Carregando a arvore...
      </div>
    );
  }

  const ativos   = members.filter(m => m.tipoMembro === 'membro');
  const exs      = members.filter(m => m.tipoMembro === 'ex-membro');
  const ordered  = [...ativos, ...exs];
  const positions = packPositions(ordered.length);

  const hovMember = hovered ? ordered.find(m => m._id === hovered) : null;
  const hovIdx    = hovMember ? ordered.indexOf(hovMember) : -1;
  const hovPos    = hovIdx >= 0 ? positions[hovIdx] : null;

  return (
    <div style={s.wrap}>
      <h2 style={s.title}>A Arvore da Microraptor</h2>
      <p style={s.sub}>
        Cada fruto representa um membro que faz ou fez parte da nossa historia.
      </p>

      <div style={s.svgWrap}>
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          width="100%"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            {/* Copa */}
            <radialGradient id="canopyGrad" cx="50%" cy="38%" r="65%">
              <stop offset="0%"   stopColor="#173217" />
              <stop offset="100%" stopColor="#0a1a0a" />
            </radialGradient>
            {/* Tronco */}
            <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor="#2e1f12" />
              <stop offset="45%"  stopColor="#4e3220" />
              <stop offset="100%" stopColor="#2e1f12" />
            </linearGradient>
            {/* Fruto ativo */}
            <radialGradient id="fruitRed" cx="38%" cy="35%" r="65%">
              <stop offset="0%"   stopColor="#e03030" />
              <stop offset="100%" stopColor="#7a0202" />
            </radialGradient>
            {/* Fruto ex-membro */}
            <radialGradient id="fruitPurple" cx="38%" cy="35%" r="65%">
              <stop offset="0%"   stopColor="#8b8ef8" />
              <stop offset="100%" stopColor="#3b3e9e" />
            </radialGradient>
            {/* Brilho copa */}
            <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="fruitShadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.5)" />
            </filter>
          </defs>

          {/* Grama / chão */}
          <ellipse cx={CX} cy={VH - 18} rx={120} ry={14}
            fill="rgba(20,50,20,0.5)" />

          {/* Tronco */}
          <path
            d={`M ${CX - 30} ${VH - 22}
                Q ${CX - 22} 410 ${CX - 20} 368
                L ${CX + 20} 368
                Q ${CX + 22} 410 ${CX + 30} ${VH - 22} Z`}
            fill="url(#trunkGrad)"
          />
          {/* Textura do tronco */}
          <path
            d={`M ${CX - 6} 380 Q ${CX} 400 ${CX - 4} 430`}
            fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={3} strokeLinecap="round"
          />
          <path
            d={`M ${CX + 4} 395 Q ${CX + 8} 415 ${CX + 3} 450`}
            fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth={2} strokeLinecap="round"
          />

          {/* Galhos */}
          <path
            d={`M ${CX} 372 Q ${CX - 90} 320 ${CX - 155} 292`}
            fill="none" stroke="#3d2810" strokeWidth={14} strokeLinecap="round"
          />
          <path
            d={`M ${CX} 355 Q ${CX + 80} 305 ${CX + 148} 278`}
            fill="none" stroke="#3d2810" strokeWidth={12} strokeLinecap="round"
          />
          <path
            d={`M ${CX - 60} 345 Q ${CX - 110} 310 ${CX - 130} 280`}
            fill="none" stroke="#352210" strokeWidth={7} strokeLinecap="round"
          />
          <path
            d={`M ${CX + 50} 338 Q ${CX + 90} 308 ${CX + 110} 275`}
            fill="none" stroke="#352210" strokeWidth={6} strokeLinecap="round"
          />
          <path
            d={`M ${CX} 365 Q ${CX - 10} 330 ${CX + 15} 295`}
            fill="none" stroke="#2e1e0c" strokeWidth={5} strokeLinecap="round"
          />

          {/* Copa — camada de fundo (brilho suave) */}
          <ellipse
            cx={CX} cy={CANOPY_CY} rx={CANOPY_RX + 10} ry={CANOPY_RY + 10}
            fill="rgba(18,50,18,0.35)"
          />

          {/* Copa principal */}
          <ellipse
            cx={CX} cy={CANOPY_CY} rx={CANOPY_RX} ry={CANOPY_RY}
            fill="url(#canopyGrad)"
            stroke="rgba(40,100,40,0.45)" strokeWidth={2}
          />

          {/* Anel interno brilhante */}
          <ellipse
            cx={CX} cy={CANOPY_CY - 10} rx={CANOPY_RX - 30} ry={CANOPY_RY - 30}
            fill="none"
            stroke="rgba(60,140,60,0.12)" strokeWidth={8}
          />

          {/* Frutos — primeira passagem (círculos) */}
          {ordered.map((m, i) => {
            const pos = positions[i];
            if (!pos) return null;
            const [x, y] = pos;
            const isEx  = m.tipoMembro === 'ex-membro';
            const isHov = hovered === m._id;
            const r     = isHov ? FRUIT_R + 4 : FRUIT_R;

            return (
              <g
                key={m._id}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(m._id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Halo de hover */}
                {isHov && (
                  <circle
                    cx={x} cy={y} r={r + 7}
                    fill={isEx ? 'rgba(99,102,241,0.3)' : 'rgba(168,3,3,0.3)'}
                  />
                )}
                {/* Fruto */}
                <circle
                  cx={x} cy={y} r={r}
                  fill={isEx ? 'url(#fruitPurple)' : 'url(#fruitRed)'}
                  stroke="rgba(255,255,255,0.18)" strokeWidth={1.5}
                  filter="url(#fruitShadow)"
                />
                {/* Reflexo (brilho no fruto) */}
                <circle
                  cx={x - r * 0.28} cy={y - r * 0.28} r={r * 0.28}
                  fill="rgba(255,255,255,0.18)"
                />
                {/* Iniciais */}
                <text
                  x={x} y={y + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="white" fontSize={9} fontWeight={800}
                  fontFamily="system-ui, -apple-system, sans-serif"
                  style={{ userSelect: 'none', letterSpacing: '0.03em' }}
                >
                  {initials(m.nome)}
                </text>
              </g>
            );
          })}

          {/* Tooltip — segunda passagem, sempre no topo */}
          {hovMember && hovPos && (() => {
            const [x, y] = hovPos;
            const name  = hovMember.nome;
            const area  = hovMember.area || '';
            const label = area ? `${name}  ·  ${area}` : name;
            const w     = Math.max(100, label.length * 6.8 + 24);
            const bx    = Math.min(Math.max(x - w / 2, 4), VW - w - 4);
            const by    = y - FRUIT_R - 44;

            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect
                  x={bx} y={by} width={w} height={30} rx={7}
                  fill="#111" stroke="#333" strokeWidth={1}
                  filter="url(#fruitShadow)"
                />
                <text
                  x={bx + w / 2} y={by + 15}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#f0f0f0" fontSize={11.5} fontWeight={600}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {name}
                  {area && (
                    <tspan fill="#999" fontWeight={400}> · {area}</tspan>
                  )}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legenda */}
      {ordered.length > 0 && (
        <div style={s.legend}>
          <div style={s.legendItem}>
            <span style={{ ...s.dot, background: '#a80303' }} />
            <span>Membro ativo ({ativos.length})</span>
          </div>
          <div style={s.legendItem}>
            <span style={{ ...s.dot, background: '#6366f1' }} />
            <span>Ex-membro ({exs.length})</span>
          </div>
        </div>
      )}

      {ordered.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', marginTop: 16 }}>
          Nenhum membro cadastrado ainda. Seja o primeiro fruto desta arvore.
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
  title: {
    fontSize: 22, fontWeight: 800, color: 'var(--text)',
    marginBottom: 8, textAlign: 'center',
  },
  sub: {
    fontSize: 14, color: 'var(--text-muted)', maxWidth: 460,
    textAlign: 'center', lineHeight: 1.6, marginBottom: 28,
  },
  svgWrap: {
    width: '100%', maxWidth: 640,
  },
  legend: {
    display: 'flex', gap: 28, marginTop: 20, flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legendItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, color: 'var(--text-muted)',
  },
  dot: {
    display: 'inline-block', width: 12, height: 12,
    borderRadius: '50%', flexShrink: 0,
  },
};
