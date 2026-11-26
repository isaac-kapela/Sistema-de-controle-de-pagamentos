import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  sendMicrosabedoriaChat,
  getMicrosabedoriaSessions,
  getMicrosabedoriaSession,
  deleteMicrosabedoriaSession,
  getMicrosabedoriaSyncStatus,
  getMicrosabedoriaSettings,
  updateMicrosabedoriaSettings,
  testMicrosabedoriaConnection,
  syncMicrosabedoria,
  getMicrosabedoriaDocuments,
  deleteMicrosabedoriaDocument,
  reindexMicrosabedoriaDocument,
} from '../services/api';

const AREAS = [
  'Todas',
  'Gestão',
  'Aerodinâmica',
  'Estruturas',
  'Cargas',
  'Estabilidade',
  'Elétrica',
  'Material Didático',
  'Geral',
];

const QUICK_QUESTIONS = [
  { area: 'Gestão', text: 'Como funciona o processo de solicitação de transporte para competições?' },
  { area: 'Gestão', text: 'Quais são os procedimentos para solicitar auxílio financeiro ou reembolso?' },
  { area: 'Gestão', text: 'Como funciona o processo seletivo da equipe?' },
  { area: 'Aerodinâmica', text: 'Qual o perfil aerodinâmico e metodologia de cálculo de sustentação utilizada pela equipe?' },
  { area: 'Estruturas', text: 'Quais materiais e critérios de dimensionamento estrutural são adotados para a asa e fuselagem?' },
  { area: 'Cargas', text: 'Como é calculada a envoltória de cargas e fatores de carga limite da aeronave?' },
  { area: 'Estabilidade', text: 'Como é determinada a margem estática e a estabilidade longitudinal da aeronave?' },
  { area: 'Elétrica', text: 'Quais são os critérios de escolha do motor elétrico, bateria e ESC para o trem de força?' },
];

export default function MicrosabedoriaPage() {
  const { isAdmin } = useAuth();

  // Estados do Chat
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedArea, setSelectedArea] = useState('Todas');
  const [previewSnippet, setPreviewSnippet] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Estados de Status e Painel Admin
  const [syncStatus, setSyncStatus] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminTab, setAdminTab] = useState('settings'); // 'settings' | 'documents'

  // Estados das Configurações
  const [settings, setSettings] = useState({
    driveFolderUrl: '',
    serviceAccountJson: '',
    googleApiKey: '',
    geminiApiKey: '',
    autoSyncEnabled: true,
    syncIntervalHours: 24,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResults, setTestResults] = useState(null);

  // Estados dos Documentos
  const [documents, setDocuments] = useState([]);
  const [docSearch, setDocSearch] = useState('');
  const [docStatusFilter, setDocStatusFilter] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);

  // Carrega status e histórico de conversas ao montar
  useEffect(() => {
    loadSessions();
    loadSyncStatus();

    const interval = setInterval(() => {
      loadSyncStatus();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Rola suavemente para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadSessions = async () => {
    try {
      const data = await getMicrosabedoriaSessions();
      setSessions(data.sessions || []);
    } catch (err) {
      console.warn('Erro ao carregar sessões:', err.message);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const data = await getMicrosabedoriaSyncStatus();
      setSyncStatus(data);
    } catch (err) {
      console.warn('Erro ao carregar status de sincronização:', err.message);
    }
  };

  const handleSelectSession = async (sessionId) => {
    try {
      setLoading(true);
      const data = await getMicrosabedoriaSession(sessionId);
      setCurrentSessionId(sessionId);
      setMessages(data.session?.messages || []);
    } catch (err) {
      toast.error('Erro ao carregar conversa.');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInputMessage('');
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta conversa?')) return;
    try {
      await deleteMicrosabedoriaSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
      toast.success('Conversa removida.');
    } catch (err) {
      toast.error('Erro ao excluir conversa.');
    }
  };

  const handleSendMessage = async (textToSend = null, areaOverride = null) => {
    const text = textToSend || inputMessage;
    if (!text || !text.trim() || loading) return;

    const areaToUse = areaOverride || (selectedArea !== 'Todas' ? selectedArea : undefined);

    const userMsg = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const data = await sendMicrosabedoriaChat({
        message: text.trim(),
        sessionId: currentSessionId,
        area: areaToUse,
      });

      setCurrentSessionId(data.sessionId);
      setMessages(data.messages || []);
      loadSessions();
      loadSyncStatus();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Erro ao consultar a Microsabedoria.';
      toast.error(errorMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Não foi possível obter resposta: ${errorMsg}`,
          sources: [],
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Resposta copiada para a área de transferência.');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Abrir Modal de Administração
  const handleOpenAdminModal = async () => {
    setShowAdminModal(true);
    setTestResults(null);
    try {
      const settingData = await getMicrosabedoriaSettings();
      setSettings({
        driveFolderUrl: settingData.driveFolderUrl || '',
        serviceAccountJson: settingData.serviceAccountJson || '',
        googleApiKey: settingData.googleApiKey || '',
        geminiApiKey: settingData.geminiApiKey || '',
        autoSyncEnabled: settingData.autoSyncEnabled ?? true,
        syncIntervalHours: settingData.syncIntervalHours || 24,
      });
      loadDocuments();
    } catch (err) {
      toast.error('Erro ao carregar configurações administrativas.');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await updateMicrosabedoriaSettings(settings);
      toast.success('Configurações salvas com sucesso!');
      loadSyncStatus();
    } catch (err) {
      toast.error('Erro ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResults(null);
    try {
      const res = await testMicrosabedoriaConnection(settings);
      setTestResults(res.results);
      if (res.results.drive.ok && res.results.gemini.ok) {
        toast.success('Google Drive e Gemini API conectados com sucesso!');
      } else if (res.results.drive.ok) {
        toast.success('Google Drive acessado com sucesso!');
      } else {
        toast.error('Falha nos testes de conexão.');
      }
    } catch (err) {
      toast.error('Erro ao testar conexões.');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTriggerSync = async (force = false) => {
    setSyncingNow(true);
    try {
      await syncMicrosabedoria({ force });
      toast.success('Sincronização iniciada em segundo plano!');
      setTimeout(loadSyncStatus, 1500);
      setTimeout(loadDocuments, 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao iniciar sincronização.');
    } finally {
      setSyncingNow(false);
    }
  };

  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      const data = await getMicrosabedoriaDocuments({
        search: docSearch,
        status: docStatusFilter,
        limit: 100,
      });
      setDocuments(data.documents || []);
    } catch (err) {
      console.warn('Erro ao carregar documentos:', err.message);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleDeleteDocument = async (id, name) => {
    if (!window.confirm(`Remover "${name}" da base de conhecimento?`)) return;
    try {
      await deleteMicrosabedoriaDocument(id);
      toast.success('Documento removido.');
      loadDocuments();
      loadSyncStatus();
    } catch (err) {
      toast.error('Erro ao remover documento.');
    }
  };

  const handleReindexDocument = async (id) => {
    try {
      toast.loading('Reindexando documento...', { id: 'reindex' });
      await reindexMicrosabedoriaDocument(id);
      toast.success('Documento reindexado!', { id: 'reindex' });
      loadDocuments();
      loadSyncStatus();
    } catch (err) {
      toast.error('Erro ao reindexar.', { id: 'reindex' });
    }
  };

  return (
    <div style={styles.container}>
      {/* Sidebar de Conversas */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <button onClick={handleNewChat} style={styles.newChatBtn}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nova Conversa
          </button>
        </div>

        {/* Status da Base */}
        <div style={styles.knowledgeBadge}>
          <div style={styles.badgeRow}>
            <span style={styles.statusDot(syncStatus?.syncStatus)} />
            <span style={styles.badgeTitle}>
              {syncStatus?.totalDocuments || 0} Docs Indexados
            </span>
          </div>
          <div style={styles.badgeSub}>
            {syncStatus?.totalChunks || 0} trechos semânticos
          </div>
          {isAdmin && (
            <button onClick={handleOpenAdminModal} style={styles.adminSettingsBtn}>
              Painel da Base (Admin)
            </button>
          )}
        </div>

        {/* Lista de Sessões */}
        <div style={styles.sessionList}>
          <div style={styles.sessionSectionTitle}>Histórico de Conversas</div>
          {sessions.length === 0 ? (
            <div style={styles.emptySessions}>Nenhuma conversa recente</div>
          ) : (
            sessions.map((sess) => (
              <div
                key={sess.sessionId}
                onClick={() => handleSelectSession(sess.sessionId)}
                style={{
                  ...styles.sessionItem,
                  ...(currentSessionId === sess.sessionId ? styles.sessionItemActive : {}),
                }}
              >
                <div style={styles.sessionItemTitle} title={sess.title}>
                  {sess.title}
                </div>
                <button
                  onClick={(e) => handleDeleteSession(e, sess.sessionId)}
                  style={styles.deleteSessionBtn}
                  title="Excluir conversa"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Área Principal do Chat */}
      <main style={styles.chatArea}>
        {/* Header do Chat */}
        <header style={styles.chatHeader}>
          <div>
            <h2 style={styles.chatTitle}>Microsabedoria</h2>
            <p style={styles.chatSubtitle}>
              Memória Institucional e Central de Conhecimento da Equipe Microraptor UFJF
            </p>
          </div>
          {isAdmin && (
            <button onClick={handleOpenAdminModal} style={styles.topAdminBtn}>
              Base de Conhecimento
            </button>
          )}
        </header>

        {/* Barra de Filtro por Área Temática */}
        <div style={styles.areaFilterBar}>
          <span style={styles.areaFilterLabel}>Área:</span>
          <div style={styles.areaPillsContainer}>
            {AREAS.map((area) => (
              <button
                key={area}
                onClick={() => setSelectedArea(area)}
                style={{
                  ...styles.areaPill,
                  ...(selectedArea === area ? styles.areaPillActive : {}),
                }}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Mensagens */}
        <div style={styles.messagesContainer}>
          {messages.length === 0 ? (
            <div style={styles.welcomeContainer}>
              <h3 style={styles.welcomeTitle}>Central de Conhecimento Inteligente</h3>
              <p style={styles.welcomeText}>
                Faça perguntas em linguagem natural para consultar manuais, histórico, relatórios técnicos,
                regulamentos da SAE Brasil e documentos do Google Drive da Microraptor.
              </p>

              <div style={styles.quickQuestionsGrid}>
                {QUICK_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (q.area && q.area !== 'Todas') {
                        setSelectedArea(q.area);
                      }
                      handleSendMessage(q.text, q.area);
                    }}
                    style={styles.quickQuestionCard}
                  >
                    <span style={styles.quickQuestionAreaBadge}>{q.area}</span>
                    <span style={styles.quickQuestionText}>{q.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  ...styles.messageRow,
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    ...styles.messageBubble,
                    ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble),
                  }}
                >
                  {/* Cabeçalho do Balão */}
                  <div style={styles.bubbleHeader}>
                    <span style={styles.bubbleAuthor}>
                      {msg.role === 'user' ? 'Você' : 'Microsabedoria'}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={styles.bubbleTime}>
                        {msg.timestamp
                          ? new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => handleCopyText(msg.content)}
                          style={styles.copyBtn}
                          title="Copiar resposta"
                        >
                          Copiar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Conteúdo da Mensagem com Markdown */}
                  <div className="markdown-content" style={styles.markdownWrapper}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Fontes Citadas */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={styles.sourcesContainer}>
                      <div style={styles.sourcesTitle}>
                        Documentos do Google Drive consultados:
                      </div>
                      <div style={styles.sourcesList}>
                        {msg.sources.map((src, sIdx) => (
                          <div key={sIdx} style={styles.sourceCard}>
                            <div style={styles.sourceTop}>
                              <strong style={styles.sourceDocName}>{src.documentName}</strong>
                              {src.area && (
                                <span style={styles.sourceAreaBadge}>{src.area}</span>
                              )}
                            </div>
                            <div style={styles.sourcePath}>
                              Pasta: {src.folderPath || '/'}
                            </div>
                            <div style={styles.sourceActionsRow}>
                              {src.text && (
                                <button
                                  onClick={() => setPreviewSnippet(src)}
                                  style={styles.viewSnippetBtn}
                                >
                                  Ver Trecho
                                </button>
                              )}
                              {src.driveUrl && (
                                <a
                                  href={src.driveUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={styles.sourceDriveLink}
                                >
                                  Abrir no Drive ↗
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading Indicator */}
          {loading && (
            <div style={{ ...styles.messageRow, justifyContent: 'flex-start' }}>
              <div style={{ ...styles.messageBubble, ...styles.assistantBubble }}>
                <div style={styles.loadingContainer}>
                  <div style={styles.loadingSpinner} />
                  <span style={styles.loadingText}>
                    Consultando documentos do Google Drive e gerando resposta...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={styles.inputContainer}>
          <div style={styles.inputWrapper}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte sobre regulamentos, processos, históricos, relatórios..."
              rows={1}
              style={styles.chatInput}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || !inputMessage.trim()}
              style={{
                ...styles.sendBtn,
                opacity: loading || !inputMessage.trim() ? 0.5 : 1,
                cursor: loading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Enviar
            </button>
          </div>
          <div style={styles.inputHelp}>
            Pressione <strong>Enter</strong> para enviar, <strong>Shift + Enter</strong> para quebra de linha.
          </div>
        </div>
      </main>

      {/* Modal Administrativo da Base de Conhecimento */}
      {showAdminModal && (
        <div style={styles.modalOverlay} onClick={() => setShowAdminModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>Painel da Base de Conhecimento - Microsabedoria</h3>
                <p style={styles.modalSubtitle}>
                  Configuração de integração com o Google Drive e LLM (Gemini)
                </p>
              </div>
              <button onClick={() => setShowAdminModal(false)} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>

            {/* Abas do Modal */}
            <div style={styles.modalTabs}>
              <button
                onClick={() => setAdminTab('settings')}
                style={{
                  ...styles.modalTabBtn,
                  ...(adminTab === 'settings' ? styles.modalTabBtnActive : {}),
                }}
              >
                Configurações & Conexão
              </button>
              <button
                onClick={() => {
                  setAdminTab('documents');
                  loadDocuments();
                }}
                style={{
                  ...styles.modalTabBtn,
                  ...(adminTab === 'documents' ? styles.modalTabBtnActive : {}),
                }}
              >
                Documentos Catalogados ({documents.length})
              </button>
            </div>

            {/* Conteúdo: Aba Configurações */}
            {adminTab === 'settings' && (
              <div style={styles.modalBody}>
                {/* Métricas Gerais */}
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.statNum}>{syncStatus?.totalDocuments || 0}</div>
                    <div style={styles.statLabel}>Documentos Indexados</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statNum}>{syncStatus?.totalChunks || 0}</div>
                    <div style={styles.statLabel}>Trechos Vetorizados</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statNum}>
                      {syncStatus?.lastSyncAt
                        ? new Date(syncStatus.lastSyncAt).toLocaleDateString('pt-BR')
                        : 'Nunca'}
                    </div>
                    <div style={styles.statLabel}>Última Sincronização</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statNum}>{syncStatus?.errorDocumentsCount || 0}</div>
                    <div style={styles.statLabel}>Arquivos com Erro</div>
                  </div>
                </div>

                {/* Sincronização em Andamento */}
                {syncStatus?.syncStatus === 'syncing' && (
                  <div style={styles.syncingBanner}>
                    <div style={styles.loadingSpinner} />
                    <div>
                      <strong>Sincronização em andamento com o Google Drive...</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {syncStatus?.syncProgress?.currentFile || 'Processando arquivos...'}
                        {syncStatus?.syncProgress?.totalFiles > 0 &&
                          ` (${syncStatus.syncProgress.processedFiles}/${syncStatus.syncProgress.totalFiles})`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Formulário de Configurações */}
                <form onSubmit={handleSaveSettings} style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Link ou ID da Pasta do Google Drive <span style={{ color: 'var(--primary)' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://drive.google.com/drive/folders/1ABC..."
                      value={settings.driveFolderUrl}
                      onChange={(e) => setSettings({ ...settings, driveFolderUrl: e.target.value })}
                      style={styles.input}
                      required
                    />
                    <span style={styles.helperText}>
                      Forneça o link da pasta do Google Drive contendo manuais, relatórios e documentos.
                    </span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Chave da API do Google Gemini (GEMINI_API_KEY)
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={settings.geminiApiKey}
                      onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                      style={styles.input}
                    />
                    <span style={styles.helperText}>
                      Necessária para geração de embeddings semânticos e respostas com RAG.
                    </span>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Service Account JSON (Opcional - para pastas privadas restritas)
                    </label>
                    <textarea
                      placeholder='{"type": "service_account", "project_id": "...", ...}'
                      value={settings.serviceAccountJson}
                      onChange={(e) => setSettings({ ...settings, serviceAccountJson: e.target.value })}
                      rows={3}
                      style={{ ...styles.input, fontFamily: 'monospace', fontSize: 12 }}
                    />
                    <span style={styles.helperText}>
                      Cole aqui o JSON da Conta de Serviço Google caso a pasta não seja acessível publicamente.
                    </span>
                  </div>

                  <div style={styles.row}>
                    <div style={{ ...styles.formGroup, flex: 1 }}>
                      <label style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={settings.autoSyncEnabled}
                          onChange={(e) =>
                            setSettings({ ...settings, autoSyncEnabled: e.target.checked })
                          }
                          style={{ marginRight: 8 }}
                        />
                        Sincronização Automática Diária (às 03:00)
                      </label>
                    </div>
                  </div>

                  {/* Resultados dos Testes */}
                  {testResults && (
                    <div style={styles.testResultsBox}>
                      <div style={styles.testResultRow}>
                        <span>Google Drive:</span>
                        <strong style={{ color: testResults.drive.ok ? 'var(--success)' : 'var(--danger)' }}>
                          {testResults.drive.message}
                        </strong>
                      </div>
                      <div style={styles.testResultRow}>
                        <span>Google Gemini LLM:</span>
                        <strong style={{ color: testResults.gemini.ok ? 'var(--success)' : 'var(--danger)' }}>
                          {testResults.gemini.message}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div style={styles.modalActions}>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      style={styles.testBtn}
                    >
                      {testingConnection ? 'Testando Conexão...' : 'Testar Conexão'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTriggerSync(false)}
                      disabled={syncingNow || syncStatus?.syncStatus === 'syncing'}
                      style={styles.syncBtn}
                    >
                      Sincronizar Agora
                    </button>

                    <button
                      type="submit"
                      disabled={savingSettings}
                      style={styles.saveBtn}
                    >
                      {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Conteúdo: Aba Documentos Catalogados */}
            {adminTab === 'documents' && (
              <div style={styles.modalBody}>
                {/* Barra de Filtros */}
                <div style={styles.docFiltersRow}>
                  <input
                    type="text"
                    placeholder="Buscar por nome do arquivo ou pasta..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    style={{ ...styles.input, flex: 2 }}
                  />
                  <select
                    value={docStatusFilter}
                    onChange={(e) => setDocStatusFilter(e.target.value)}
                    style={{ ...styles.input, flex: 1 }}
                  >
                    <option value="">Todos os status</option>
                    <option value="indexed">Indexados</option>
                    <option value="processing">Processando</option>
                    <option value="error">Erros</option>
                  </select>
                  <button onClick={loadDocuments} style={styles.refreshDocsBtn}>
                    Filtrar
                  </button>
                </div>

                {/* Tabela de Documentos */}
                <div style={styles.docsTableWrapper}>
                  {loadingDocs ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      Carregando documentos...
                    </div>
                  ) : documents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      Nenhum documento encontrado na base de conhecimento.
                    </div>
                  ) : (
                    <table style={styles.docsTable}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Nome do Arquivo</th>
                          <th style={styles.th}>Pasta no Drive</th>
                          <th style={styles.th}>Área</th>
                          <th style={styles.th}>Tipo</th>
                          <th style={styles.th}>Trechos</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents.map((doc) => (
                          <tr key={doc._id} style={styles.tr}>
                            <td style={styles.td}>
                              <div style={{ fontWeight: 600 }}>{doc.name}</div>
                              {doc.errorMessage && (
                                <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 2 }}>
                                  {doc.errorMessage}
                                </div>
                              )}
                            </td>
                            <td style={styles.td}>{doc.folderPath || '/'}</td>
                            <td style={styles.td}>
                              <span style={styles.areaBadge(doc.area)}>{doc.area || 'Geral'}</span>
                            </td>
                            <td style={styles.td}>
                              <span style={styles.extBadge}>{doc.fileExtension?.toUpperCase() || 'ARQ'}</span>
                            </td>
                            <td style={styles.td}>{doc.chunkCount || 0} chunks</td>
                            <td style={styles.td}>
                              <span style={styles.statusBadge(doc.status)}>
                                {doc.status === 'indexed'
                                  ? 'Indexado'
                                  : doc.status === 'error'
                                  ? 'Erro'
                                  : 'Processando'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <div style={styles.tableActions}>
                                {doc.driveUrl && (
                                  <a
                                    href={doc.driveUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={styles.actionLink}
                                    title="Abrir no Google Drive"
                                  >
                                    Drive ↗
                                  </a>
                                )}
                                <button
                                  onClick={() => handleReindexDocument(doc._id)}
                                  style={styles.reindexBtn}
                                  title="Reindexar"
                                >
                                  Reindexar
                                </button>
                                <button
                                  onClick={() => handleDeleteDocument(doc._id, doc.name)}
                                  style={styles.deleteDocBtn}
                                  title="Remover da base"
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Pré-visualização de Trecho (Snippet) */}
      {previewSnippet && (
        <div style={styles.modalOverlay} onClick={() => setPreviewSnippet(null)}>
          <div style={{ ...styles.modalContent, maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <h3 style={styles.modalTitle}>{previewSnippet.documentName}</h3>
                <p style={styles.modalSubtitle}>
                  Pasta: {previewSnippet.folderPath || '/'} {previewSnippet.area && `• Área: ${previewSnippet.area}`}
                </p>
              </div>
              <button onClick={() => setPreviewSnippet(null)} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.snippetBox}>
                <div style={styles.snippetLabel}>Trecho Semântico Recuperado da Base:</div>
                <div style={styles.snippetText}>{previewSnippet.text}</div>
              </div>
              {previewSnippet.driveUrl && (
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <a
                    href={previewSnippet.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.driveDirectBtn}
                  >
                    Abrir Documento Completo no Google Drive ↗
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: 'calc(100vh - 110px)',
    background: 'var(--bg)',
    color: 'var(--text)',
    overflow: 'hidden',
  },
  sidebar: {
    width: 280,
    background: 'var(--bg-card)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    padding: 16,
    flexShrink: 0,
  },
  sidebarHeader: {
    marginBottom: 16,
  },
  newChatBtn: {
    width: '100%',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 'var(--radius)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'background 0.2s',
  },
  knowledgeBadge: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 12,
    marginBottom: 16,
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: (status) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: status === 'syncing' ? '#eab308' : status === 'error' ? '#ef4444' : '#22c55e',
    display: 'inline-block',
  }),
  badgeTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
  },
  badgeSub: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
    marginLeft: 16,
  },
  adminSettingsBtn: {
    marginTop: 10,
    width: '100%',
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: 12,
    padding: '6px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'center',
  },
  sessionList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sessionSectionTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    fontWeight: 700,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  emptySessions: {
    fontSize: 12,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '8px 0',
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background 0.15s',
    background: 'transparent',
  },
  sessionItemActive: {
    background: 'var(--bg-card2)',
    borderLeft: '3px solid var(--primary)',
  },
  sessionItemTitle: {
    fontSize: 13,
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  deleteSessionBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 12,
    padding: '2px 6px',
    cursor: 'pointer',
    opacity: 0.7,
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  chatHeader: {
    padding: '14px 24px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-card)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  areaFilterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 24px',
    background: 'var(--bg-card2)',
    borderBottom: '1px solid var(--border)',
    overflowX: 'auto',
  },
  areaFilterLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 4,
    flexShrink: 0,
  },
  areaPillsContainer: {
    display: 'flex',
    gap: 6,
    flexWrap: 'nowrap',
  },
  areaPill: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  areaPillActive: {
    background: 'var(--primary)',
    borderColor: 'var(--primary)',
    color: '#ffffff',
    fontWeight: 700,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0,
  },
  chatSubtitle: {
    fontSize: 12,
    color: 'var(--text-muted)',
    margin: 0,
    marginTop: 2,
  },
  topAdminBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '6px 12px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    cursor: 'pointer',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px clamp(16px, 5vw, 64px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  welcomeContainer: {
    textAlign: 'center',
    maxWidth: 700,
    margin: 'auto',
    padding: '32px 16px',
  },
  welcomeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 8,
    color: 'var(--text)',
  },
  welcomeText: {
    fontSize: 14,
    color: 'var(--text-muted)',
    marginBottom: 28,
    lineHeight: 1.6,
  },
  quickQuestionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
    textAlign: 'left',
  },
  quickQuestionCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '12px 14px',
    color: 'var(--text)',
    fontSize: 13,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    transition: 'border-color 0.2s, transform 0.15s',
    lineHeight: 1.4,
  },
  quickQuestionAreaBadge: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    color: 'var(--primary)',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  quickQuestionText: {
    color: 'var(--text)',
    fontSize: 12,
  },
  quickQuestionIcon: {
    fontSize: 16,
    flexShrink: 0,
  },
  messageRow: {
    display: 'flex',
    width: '100%',
  },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 12,
    padding: '16px 20px',
    lineHeight: 1.6,
    fontSize: 14,
  },
  userBubble: {
    background: 'var(--primary)',
    color: '#ffffff',
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderBottomLeftRadius: 2,
  },
  bubbleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    paddingBottom: 4,
  },
  bubbleAuthor: {
    fontSize: 12,
    fontWeight: 700,
    opacity: 0.9,
  },
  bubbleTime: {
    fontSize: 11,
    opacity: 0.7,
  },
  copyBtn: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  markdownWrapper: {
    wordBreak: 'break-word',
  },
  sourcesContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: '1px solid var(--border)',
  },
  sourcesTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-muted)',
    marginBottom: 8,
  },
  sourcesList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  sourceCard: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 12,
    maxWidth: 340,
    flex: '1 1 240px',
  },
  sourceTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 4,
  },
  sourceAreaBadge: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--primary)',
    padding: '1px 5px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  sourceDocIcon: {
    fontSize: 14,
  },
  sourceDocName: {
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: 12,
  },
  sourcePath: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginBottom: 6,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sourceActionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  viewSnippetBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 4,
    padding: '2px 8px',
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: 500,
  },
  sourceDriveLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontSize: 11,
    fontWeight: 600,
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  loadingSpinner: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderTopColor: 'var(--primary)',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: 13,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  inputContainer: {
    padding: '16px 24px',
    background: 'var(--bg-card)',
    borderTop: '1px solid var(--border)',
  },
  inputWrapper: {
    display: 'flex',
    gap: 12,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
  },
  chatInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text)',
    fontSize: 14,
    resize: 'none',
    outline: 'none',
    lineHeight: 1.5,
  },
  sendBtn: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    alignSelf: 'flex-end',
  },
  inputHelp: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 6,
    textAlign: 'center',
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modalContent: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    maxWidth: 900,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
  modalHeader: {
    padding: '16px 24px',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'var(--text-muted)',
    margin: 0,
    marginTop: 2,
  },
  modalCloseBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: 18,
    cursor: 'pointer',
  },
  modalTabs: {
    display: 'flex',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-card2)',
    padding: '0 24px',
  },
  modalTabBtn: {
    padding: '12px 18px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    color: 'var(--text-muted)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  modalTabBtnActive: {
    color: 'var(--text)',
    borderBottomColor: 'var(--primary)',
  },
  modalBody: {
    padding: 24,
    overflowY: 'auto',
    flex: 1,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 14,
    textAlign: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: 700,
    color: 'var(--text)',
  },
  statLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  syncingBanner: {
    background: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid #eab308',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text)',
  },
  input: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '10px 12px',
    color: 'var(--text)',
    fontSize: 13,
  },
  helperText: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  row: {
    display: 'flex',
    gap: 16,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 13,
    color: 'var(--text)',
    cursor: 'pointer',
  },
  testResultsBox: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: 13,
  },
  testResultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  testBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '10px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  syncBtn: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--primary)',
    color: 'var(--primary)',
    padding: '10px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveBtn: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Documentos Tab Styles
  docFiltersRow: {
    display: 'flex',
    gap: 12,
    marginBottom: 16,
  },
  refreshDocsBtn: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '8px 16px',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  docsTableWrapper: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflowX: 'auto',
  },
  docsTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: 13,
  },
  th: {
    padding: '10px 14px',
    background: 'var(--bg-card2)',
    borderBottom: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: 12,
  },
  tr: {
    borderBottom: '1px solid var(--border)',
  },
  td: {
    padding: '10px 14px',
    verticalAlign: 'middle',
  },
  extBadge: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  statusBadge: (status) => ({
    padding: '3px 8px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    background:
      status === 'indexed'
        ? 'rgba(34, 197, 94, 0.15)'
        : status === 'error'
        ? 'rgba(239, 68, 68, 0.15)'
        : 'rgba(234, 179, 8, 0.15)',
    color:
      status === 'indexed'
        ? 'var(--success)'
        : status === 'error'
        ? 'var(--danger)'
        : '#eab308',
  }),
  tableActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  actionLink: {
    color: '#38bdf8',
    textDecoration: 'none',
    fontSize: 12,
    fontWeight: 600,
  },
  reindexBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
  },
  deleteDocBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
  },
  areaBadge: (area) => ({
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    color: 'var(--primary)',
  }),
  snippetBox: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: 16,
  },
  snippetLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  snippetText: {
    fontSize: 13,
    lineHeight: 1.6,
    color: 'var(--text)',
    whiteSpace: 'pre-wrap',
    maxHeight: '50vh',
    overflowY: 'auto',
  },
  driveDirectBtn: {
    display: 'inline-block',
    background: 'var(--primary)',
    color: '#fff',
    textDecoration: 'none',
    padding: '8px 16px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },
};
