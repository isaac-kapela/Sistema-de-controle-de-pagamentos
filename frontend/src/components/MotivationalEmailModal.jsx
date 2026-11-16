import React, { useState, useEffect } from 'react';
import {
  getMotivationalInfo,
  sendMotivationalAll,
  sendMotivationalTest,
} from '../services/api';
import toast from 'react-hot-toast';

export default function MotivationalEmailModal({ onClose }) {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customQuote, setCustomQuote] = useState('');
  const [customAuthor, setCustomAuthor] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [activeTab, setActiveTab] = useState('catalogo'); // 'catalogo' | 'custom'

  useEffect(() => {
    loadInfo();
  }, []);

  const loadInfo = async () => {
    setLoading(true);
    try {
      const data = await getMotivationalInfo();
      setInfo(data);
      if (data.currentWeekMessage) {
        setSelectedQuoteId(data.currentWeekMessage.id);
        setCustomTitle(data.currentWeekMessage.title);
        setCustomQuote(data.currentWeekMessage.quote);
        setCustomAuthor(data.currentWeekMessage.author);
        setCustomBody(data.currentWeekMessage.body);
      }
    } catch {
      toast.error('Erro ao carregar informações de mensagens motivacionais.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMessage = (msg) => {
    setSelectedQuoteId(msg.id);
    setCustomTitle(msg.title);
    setCustomQuote(msg.quote);
    setCustomAuthor(msg.author);
    setCustomBody(msg.body);
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast.error('Informe um e-mail válido para o teste.');
      return;
    }
    setSendingTest(true);
    try {
      const res = await sendMotivationalTest({
        email: testEmail,
        customTitle,
        customQuote,
        customAuthor,
        customBody,
      });
      toast.success(res.message);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar e-mail de teste.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendAll = async () => {
    const confirmMsg = `Deseja enviar esta mensagem motivacional para todos os ${info?.activeMembersCount || ''} membros ativos agora?`;
    if (!window.confirm(confirmMsg)) return;

    setSendingAll(true);
    try {
      const res = await sendMotivationalAll({
        customTitle,
        customQuote,
        customAuthor,
        customBody,
      });
      toast.success(res.message);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao disparar mensagens motivacionais.');
    } finally {
      setSendingAll(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        {/* Cabeçalho */}
        <div style={s.header}>
          <div>
            <h2 style={s.title}>Mensagens Motivacionais Semanais</h2>
            <p style={s.subtitle}>
              Envio programado a cada 7 dias para todos os membros ativos da equipe Microraptor
            </p>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Informações de Agendamento */}
        <div style={s.infoBanner}>
          <div style={s.infoItem}>
            <span style={s.infoLabel}>Frequência Automática:</span>
            <span style={s.infoVal}>A cada 7 dias (Toda segunda-feira às 09:00 BRT)</span>
          </div>
          <div style={s.infoItem}>
            <span style={s.infoLabel}>Membros Ativos com E-mail:</span>
            <span style={s.infoValHighlight}>{info?.activeMembersCount ?? '—'} membros</span>
          </div>
        </div>

        {loading ? (
          <div style={s.centerLoading}>
            <div style={s.spinner} />
            <span style={{ color: 'var(--text-muted)' }}>Carregando dados...</span>
          </div>
        ) : (
          <>
            {/* Abas */}
            <div style={s.tabNav}>
              <button
                style={{ ...s.tabBtn, ...(activeTab === 'catalogo' ? s.tabBtnActive : {}) }}
                onClick={() => setActiveTab('catalogo')}
              >
                Catálogo de Mensagens da Equipe
              </button>
              <button
                style={{ ...s.tabBtn, ...(activeTab === 'custom' ? s.tabBtnActive : {}) }}
                onClick={() => setActiveTab('custom')}
              >
                Personalizar Mensagem / Prévia
              </button>
            </div>

            {/* Conteúdo Aba 1: Catálogo */}
            {activeTab === 'catalogo' && (
              <div style={s.catalogContainer}>
                <p style={s.sectionNote}>
                  O sistema alterna automaticamente entre as mensagens a cada semana. Você também pode escolher uma abaixo para prévia ou disparo manual:
                </p>
                <div style={s.cardsGrid}>
                  {(info?.allMessages || []).map((msg) => {
                    const isSelected = selectedQuoteId === msg.id;
                    const isCurrentWeek = info?.currentWeekMessage?.id === msg.id;
                    return (
                      <div
                        key={msg.id}
                        style={{
                          ...s.card,
                          ...(isSelected ? s.cardSelected : {}),
                        }}
                        onClick={() => handleSelectMessage(msg)}
                      >
                        <div style={s.cardHeader}>
                          <span style={s.cardTitle}>{msg.title}</span>
                          {isCurrentWeek && (
                            <span style={s.currentBadge}>Mensagem da Semana</span>
                          )}
                        </div>
                        <p style={s.cardQuote}>"{msg.quote}"</p>
                        <span style={s.cardAuthor}>— {msg.author}</span>
                        <p style={s.cardBody}>{msg.body}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conteúdo Aba 2: Edição & Prévia */}
            {activeTab === 'custom' && (
              <div style={s.formContainer}>
                <div style={s.formGrid}>
                  <div style={s.fieldGroup}>
                    <label style={s.label}>Título do E-mail</label>
                    <input
                      style={s.input}
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="Ex: Superação & Engenharia"
                    />
                  </div>

                  <div style={s.fieldGroup}>
                    <label style={s.label}>Autor / Assinatura da Citação</label>
                    <input
                      style={s.input}
                      value={customAuthor}
                      onChange={(e) => setCustomAuthor(e.target.value)}
                      placeholder="Ex: Equipe Microraptor"
                    />
                  </div>

                  <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}>
                    <label style={s.label}>Citação em Destaque (Frase Principal)</label>
                    <textarea
                      style={{ ...s.input, minHeight: 65, resize: 'vertical' }}
                      value={customQuote}
                      onChange={(e) => setCustomQuote(e.target.value)}
                      placeholder="Digite a reflexão inspiradora..."
                    />
                  </div>

                  <div style={{ ...s.fieldGroup, gridColumn: '1 / -1' }}>
                    <label style={s.label}>Mensagem Complementar / Orientação para a Semana</label>
                    <textarea
                      style={{ ...s.input, minHeight: 85, resize: 'vertical' }}
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      placeholder="Orientações e mensagem de ânimo para os membros..."
                    />
                  </div>
                </div>

                {/* Prévia Visual */}
                <div style={s.previewBox}>
                  <div style={s.previewHeader}>
                    <span style={s.previewTitle}>{customTitle || 'Título da Mensagem'}</span>
                  </div>
                  <div style={s.previewBody}>
                    <p style={{ margin: '0 0 10px', fontSize: 13, color: '#9ca3af' }}>
                      Olá, <strong>[Nome do Membro]</strong>!
                    </p>
                    <div style={s.previewQuoteBox}>
                      <div style={s.previewQuoteText}>"{customQuote || 'Citação...'}"</div>
                      <div style={s.previewQuoteAuthor}>— {customAuthor || 'Autor'}</div>
                    </div>
                    <p style={{ margin: '0', fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>
                      {customBody}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Seção de Teste de E-mail */}
            <div style={s.testSection}>
              <div style={s.testLeft}>
                <label style={s.testLabel}>Enviar e-mail de teste para:</label>
                <input
                  style={s.testInput}
                  type="email"
                  placeholder="seu-email@gmail.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <button
                style={s.btnTest}
                onClick={handleSendTest}
                disabled={sendingTest}
              >
                {sendingTest ? 'Enviando teste...' : 'Enviar Teste'}
              </button>
            </div>
          </>
        )}

        {/* Rodapé de Ações */}
        <div style={s.footer}>
          <button style={s.btnCancel} onClick={onClose}>
            Fechar
          </button>
          <button
            style={s.btnSendAll}
            onClick={handleSendAll}
            disabled={sendingAll || loading}
          >
            {sendingAll ? 'Disparando e-mails...' : 'Disparar Agora para Todos os Membros Ativos'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1100,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    backgroundColor: '#141414',
    border: '1px solid #2e2e2e',
    borderRadius: 12,
    width: '100%',
    maxWidth: 780,
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '20px 24px 16px',
    borderBottom: '1px solid #2e2e2e',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 13,
    color: '#9ca3af',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#9ca3af',
    fontSize: 18,
    cursor: 'pointer',
    padding: '4px 8px',
  },
  infoBanner: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #2e2e2e',
    fontSize: 13,
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    color: '#9ca3af',
  },
  infoVal: {
    color: '#f5f5f5',
    fontWeight: 600,
  },
  infoValHighlight: {
    color: '#22c55e',
    fontWeight: 700,
  },
  centerLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 0',
    gap: 12,
  },
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid #333',
    borderTop: '3px solid #a80303',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  tabNav: {
    display: 'flex',
    borderBottom: '1px solid #2e2e2e',
    padding: '0 24px',
    gap: 8,
  },
  tabBtn: {
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabBtnActive: {
    color: '#ffffff',
    borderBottomColor: '#a80303',
  },
  catalogContainer: {
    padding: '16px 24px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionNote: {
    margin: 0,
    fontSize: 12,
    color: '#9ca3af',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 12,
  },
  card: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #2e2e2e',
    borderRadius: 8,
    padding: 14,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background-color 0.15s',
  },
  cardSelected: {
    borderColor: '#a80303',
    backgroundColor: '#1f1515',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#f5f5f5',
  },
  currentBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 6px',
    borderRadius: 4,
    backgroundColor: 'rgba(34,197,94,0.15)',
    color: '#22c55e',
    border: '1px solid rgba(34,197,94,0.3)',
  },
  cardQuote: {
    margin: '0 0 6px',
    fontSize: 13,
    fontStyle: 'italic',
    color: '#e5e7eb',
    lineHeight: 1.4,
  },
  cardAuthor: {
    display: 'block',
    fontSize: 12,
    color: '#ef4444',
    fontWeight: 600,
    marginBottom: 8,
    textAlign: 'right',
  },
  cardBody: {
    margin: 0,
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 1.4,
  },
  formContainer: {
    padding: '16px 24px',
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#9ca3af',
  },
  input: {
    backgroundColor: '#1f1f1f',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '8px 12px',
    color: '#f5f5f5',
    fontSize: 13,
    outline: 'none',
  },
  previewBox: {
    backgroundColor: '#111',
    border: '1px solid #2e2e2e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewHeader: {
    backgroundColor: '#a80303',
    padding: '10px 16px',
    color: '#fff',
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  previewBody: {
    padding: 16,
  },
  previewQuoteBox: {
    backgroundColor: '#181818',
    borderLeft: '3px solid #a80303',
    padding: '10px 14px',
    marginBottom: 12,
  },
  previewQuoteText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#f3f4f6',
    lineHeight: 1.4,
  },
  previewQuoteAuthor: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: 700,
    textAlign: 'right',
    marginTop: 4,
  },
  testSection: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 24px',
    backgroundColor: '#181818',
    borderTop: '1px solid #2e2e2e',
  },
  testLeft: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  testLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  testInput: {
    backgroundColor: '#141414',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '7px 12px',
    color: '#f5f5f5',
    fontSize: 13,
    outline: 'none',
  },
  btnTest: {
    backgroundColor: '#262626',
    color: '#e5e7eb',
    border: '1px solid #3e3e3e',
    borderRadius: 6,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    padding: '16px 24px',
    borderTop: '1px solid #2e2e2e',
    backgroundColor: '#141414',
  },
  btnCancel: {
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: '1px solid #333',
    borderRadius: 6,
    padding: '9px 18px',
    fontSize: 13,
    cursor: 'pointer',
  },
  btnSendAll: {
    backgroundColor: '#a80303',
    color: '#ffffff',
    border: 'none',
    borderRadius: 6,
    padding: '9px 20px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
