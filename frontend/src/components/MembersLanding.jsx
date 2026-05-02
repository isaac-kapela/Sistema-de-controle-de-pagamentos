import React from 'react';

export default function MembersLanding({ onCadastrar, isAdmin, onVerLista, onVerArvore }) {
  return (
    <div style={s.page}>

      {/* Hero */}
      <div style={s.hero}>
        <div style={s.heroInner}>
          <div style={s.tag}>Historico da Equipe</div>
          <h1 style={s.heroTitle}>
            Ajude a Microraptor a construir um historico
            <span style={s.heroHighlight}> 100% completo</span>
          </h1>
          <p style={s.heroSub}>
            Cada membro que passa pela Microraptor deixa uma marca. Queremos preservar essa historia —
            quem somos, de onde viemos e quem fez parte desta equipe ao longo do tempo.
            Leva menos de 5 minutos.
          </p>
          <div style={s.heroBtns}>
            <button style={s.btnPrimary} onClick={onCadastrar}>
              Fazer meu cadastro
            </button>
            <button style={s.btnSecondary} onClick={onVerArvore}>
              Ver arvore da equipe
            </button>
            <button style={s.btnSecondary} onClick={onVerLista}>
              Ver lista de membros
            </button>
          </div>
        </div>

        {/* Decoracao lateral */}
        <div style={s.heroArt}>
          <div style={s.artCircle1} />
          <div style={s.artCircle2} />
          <div style={s.artBar} />
        </div>
      </div>

      {/* Motivos */}
      <div style={s.cards}>
        <Card
          numero="01"
          titulo="Dados de emergencia"
          texto="Informacoes de saude e contatos de emergencia sao essenciais para garantir a seguranca de todos nos eventos e atividades."
        />
        <Card
          numero="02"
          titulo="Memoria institucional"
          texto="Saber quem fez parte da Microraptor em cada periodo e fundamental para manter a identidade e a continuidade da entidade ao longo dos anos."
        />
        <Card
          numero="03"
          titulo="Comunicacao eficiente"
          texto="Com dados atualizados conseguimos entrar em contato com ex-membros, organizar reunioes e manter a rede de alumni ativa."
        />
      </div>

      {/* CTA final */}
      <div style={s.cta}>
        <p style={s.ctaText}>
          Seu cadastro fica seguro e so e acessado pela gestao e capitania da Microraptor.
        </p>
        <button style={s.btnPrimary} onClick={onCadastrar}>
          Quero fazer meu cadastro
        </button>
      </div>

    </div>
  );
}

function Card({ numero, titulo, texto }) {
  return (
    <div style={s.card}>
      <span style={s.cardNum}>{numero}</span>
      <h3 style={s.cardTitle}>{titulo}</h3>
      <p style={s.cardText}>{texto}</p>
    </div>
  );
}

const s = {
  page: {
    maxWidth: 900,
    margin: '0 auto',
    paddingBottom: 60,
  },

  /* Hero */
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 32,
    padding: '56px 0 48px',
    position: 'relative',
    overflow: 'hidden',
  },
  heroInner: {
    flex: 1,
    minWidth: 0,
    zIndex: 1,
  },
  tag: {
    display: 'inline-block',
    background: 'rgba(168,3,3,0.15)',
    color: 'var(--primary)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '4px 12px',
    borderRadius: 20,
    marginBottom: 20,
    border: '1px solid rgba(168,3,3,0.3)',
  },
  heroTitle: {
    fontSize: 'clamp(26px, 4vw, 42px)',
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
    marginBottom: 18,
    color: 'var(--text)',
  },
  heroHighlight: {
    color: 'var(--primary)',
  },
  heroSub: {
    fontSize: 16,
    color: 'var(--text-muted)',
    lineHeight: 1.7,
    maxWidth: 520,
    marginBottom: 32,
  },
  heroBtns: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: 'var(--primary)',
    color: '#fff',
    padding: '13px 28px',
    borderRadius: 'var(--radius)',
    fontSize: 15,
    fontWeight: 700,
    boxShadow: '0 4px 20px rgba(168,3,3,0.4)',
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
    whiteSpace: 'nowrap',
  },
  btnSecondary: {
    background: 'transparent',
    color: 'var(--text-muted)',
    padding: '13px 28px',
    borderRadius: 'var(--radius)',
    fontSize: 15,
    fontWeight: 600,
    border: '1px solid var(--border)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  /* Art decorativa */
  heroArt: {
    position: 'relative',
    width: 220,
    height: 220,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: '50%',
    border: '2px solid rgba(168,3,3,0.2)',
    top: 0,
    left: 10,
  },
  artCircle2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: '50%',
    background: 'rgba(168,3,3,0.07)',
    border: '2px solid rgba(168,3,3,0.15)',
    top: 30,
    left: 40,
  },
  artBar: {
    position: 'absolute',
    width: 60,
    height: 4,
    background: 'var(--primary)',
    borderRadius: 2,
    top: 108,
    left: 80,
    opacity: 0.6,
  },

  /* Cards de motivos */
  cards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16,
    marginBottom: 48,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '24px 22px',
  },
  cardNum: {
    fontSize: 11,
    fontWeight: 800,
    color: 'var(--primary)',
    letterSpacing: '0.1em',
    display: 'block',
    marginBottom: 12,
    opacity: 0.8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 10,
  },
  cardText: {
    fontSize: 13,
    color: 'var(--text-muted)',
    lineHeight: 1.6,
  },

  /* CTA final */
  cta: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '32px 36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    flexWrap: 'wrap',
  },
  ctaText: {
    fontSize: 14,
    color: 'var(--text-muted)',
    maxWidth: 420,
    lineHeight: 1.6,
  },
};
