import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getFinancialSummary,
  getFinancialMeta,
  adjustFinancialBalance,
  getFinancialMovements,
  createFinancialMovement,
  updateFinancialMovement,
  cancelFinancialMovement,
  getPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  payFinancialPurchase,
  updatePurchaseDelivery,
  cancelPurchase,
} from '../services/api';
import { exportFinancialToExcel, exportMovementsToCSV } from '../services/exportFinancial';
import FinancialSummaryCards from '../components/financial/FinancialSummaryCards';
import FinancialChart from '../components/financial/FinancialChart';
import MovementsTable from '../components/financial/MovementsTable';
import PurchasesList from '../components/financial/PurchasesList';
import NewMovementModal from '../components/financial/NewMovementModal';
import EditMovementModal from '../components/financial/EditMovementModal';
import PurchaseDetailModal from '../components/financial/PurchaseDetailModal';
import EditPurchaseModal from '../components/financial/EditPurchaseModal';
import ConfirmDeliveryModal from '../components/financial/ConfirmDeliveryModal';
import CancelConfirmModal from '../components/financial/CancelConfirmModal';
import AdjustBalanceModal from '../components/financial/AdjustBalanceModal';
import PayPurchaseModal from '../components/financial/PayPurchaseModal';
import toast from 'react-hot-toast';

const MONTH_NAMES = [
  'Todos os meses',
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function CashFlowPage() {
  const { isAdmin } = useAuth();

  // Seção ativa
  const [activeTab, setActiveTab] = useState('visao_geral'); // 'visao_geral' | 'movimentacoes' | 'compras'

  // Dados principais
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [movements, setMovements] = useState([]);
  const [purchases, setPurchases] = useState([]);

  // Loadings
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Filtros de Movimentações
  const [movSearch, setMovSearch] = useState('');
  const [movTipo, setMovTipo] = useState('todos');
  const [movCat, setMovCat] = useState('todas');
  const [movResp, setMovResp] = useState('todos');
  const [movStatus, setMovStatus] = useState('ativo');
  const [movMonth, setMovMonth] = useState('');
  const [movYear, setMovYear] = useState(new Date().getFullYear().toString());

  // Filtros de Compras
  const [purchSearch, setPurchSearch] = useState('');
  const [purchQuickFilter, setPurchQuickFilter] = useState('');
  const [purchCat, setPurchCat] = useState('todas');
  const [purchComprador, setPurchComprador] = useState('todos');
  const [purchStatusPay, setPurchStatusPay] = useState('todos');
  const [purchStatusDel, setPurchStatusDel] = useState('todos');
  const [purchStatusReg, setPurchStatusReg] = useState('ativo');

  // Modais
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [payingPurchase, setPayingPurchase] = useState(null);
  const [editingMovement, setEditingMovement] = useState(null);
  const [cancelingMovement, setCancelingMovement] = useState(null);
  const [viewingPurchase, setViewingPurchase] = useState(null);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [confirmingDelivery, setConfirmingDelivery] = useState(null);
  const [cancelingPurchase, setCancelingPurchase] = useState(null);

  // Carrega resumo financeiro
  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await getFinancialSummary({ year: movYear });
      setSummary(data);
    } catch {
      toast.error('Erro ao carregar indicadores financeiros.');
    } finally {
      setLoadingSummary(false);
    }
  }, [movYear]);

  // Carrega metadados (categorias, pessoas, formas de pagamento)
  const loadMeta = useCallback(async () => {
    try {
      const data = await getFinancialMeta();
      setMeta(data);
    } catch (err) {
      console.error('Erro ao carregar metadados:', err);
    }
  }, []);

  // Carrega movimentações de caixa
  const loadMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const params = {};
      if (movSearch) params.search = movSearch;
      if (movTipo !== 'todos') params.tipo = movTipo;
      if (movCat !== 'todas') params.categoria = movCat;
      if (movResp !== 'todos') params.responsavel = movResp;
      if (movStatus) params.status = movStatus;
      if (movMonth) params.month = movMonth;
      if (movYear) params.year = movYear;

      const data = await getFinancialMovements(params);
      setMovements(data);
    } catch {
      toast.error('Erro ao carregar movimentações de caixa.');
    } finally {
      setLoadingMovements(false);
    }
  }, [movSearch, movTipo, movCat, movResp, movStatus, movMonth, movYear]);

  // Carrega compras
  const loadPurchases = useCallback(async () => {
    setLoadingPurchases(true);
    try {
      const params = {};
      if (purchSearch) params.search = purchSearch;
      if (purchQuickFilter) params.quickFilter = purchQuickFilter;
      if (purchCat !== 'todas') params.categoria = purchCat;
      if (purchComprador !== 'todos') params.comprador = purchComprador;
      if (purchStatusPay !== 'todos') params.statusPagamento = purchStatusPay;
      if (purchStatusDel !== 'todos') params.statusEntrega = purchStatusDel;
      if (purchStatusReg) params.status = purchStatusReg;

      const data = await getPurchases(params);
      setPurchases(data);
    } catch {
      toast.error('Erro ao carregar lista de compras.');
    } finally {
      setLoadingPurchases(false);
    }
  }, [
    purchSearch,
    purchQuickFilter,
    purchCat,
    purchComprador,
    purchStatusPay,
    purchStatusDel,
    purchStatusReg,
  ]);

  // Efeitos iniciais
  useEffect(() => {
    loadSummary();
    loadMeta();
  }, [loadSummary, loadMeta]);

  useEffect(() => {
    if (activeTab === 'visao_geral' || activeTab === 'movimentacoes') {
      loadMovements();
    }
  }, [activeTab, loadMovements]);

  useEffect(() => {
    if (activeTab === 'visao_geral' || activeTab === 'compras') {
      loadPurchases();
    }
  }, [activeTab, loadPurchases]);

  // Handlers de criação
  const handleCreateMovement = async (data) => {
    await createFinancialMovement(data);
    loadSummary();
    loadMovements();
  };

  const handleCreatePurchase = async (data) => {
    await createPurchase(data);
    loadSummary();
    loadPurchases();
    loadMovements();
  };

  const handleAdjustBalance = async (data) => {
    await adjustFinancialBalance(data);
    loadSummary();
    loadMovements();
  };

  const handlePayPurchase = async (id, data) => {
    await payFinancialPurchase(id, data);
    loadSummary();
    loadPurchases();
    loadMovements();
  };

  // Handlers de edição / atualização
  const handleUpdateMovement = async (id, data) => {
    await updateFinancialMovement(id, data);
    loadSummary();
    loadMovements();
  };

  const handleCancelMovement = async (id, data) => {
    await cancelFinancialMovement(id, data);
    loadSummary();
    loadMovements();
  };

  const handleViewPurchaseDetails = async (p) => {
    try {
      const full = await getPurchaseById(p._id);
      setViewingPurchase(full);
    } catch {
      setViewingPurchase(p);
    }
  };

  const handleUpdatePurchase = async (id, data) => {
    await updatePurchase(id, data);
    loadSummary();
    loadPurchases();
    loadMovements();
  };

  const handleConfirmDelivery = async (id, data) => {
    await updatePurchaseDelivery(id, data);
    loadSummary();
    loadPurchases();
  };

  const handleCancelPurchase = async (id, data) => {
    await cancelPurchase(id, data);
    loadSummary();
    loadPurchases();
    loadMovements();
  };

  // Exportações
  const handleExportExcel = () => {
    try {
      exportFinancialToExcel({
        summary,
        movements,
        purchases,
        year: movYear,
        month: movMonth ? MONTH_NAMES[parseInt(movMonth, 10)] : null,
      });
      toast.success('Relatório Excel gerado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar planilha Excel.');
    }
  };

  const handleExportCSV = () => {
    try {
      exportMovementsToCSV(movements, `movimentacoes_microraptor_${movYear}.csv`);
      toast.success('Arquivo CSV exportado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao exportar arquivo CSV.');
    }
  };

  // Anos disponíveis para filtro
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div style={s.pageWrapper}>
      {/* Topo / Header da Página */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.title}>Fluxo de Caixa e Controle Financeiro</h2>
          <span style={s.subtitle}>
            Gestão financeira, histórico de movimentações e controle de compras da equipe Microraptor
          </span>
        </div>

        <div style={s.headerBtnRow}>
          <button style={s.btnOutline} onClick={handleExportExcel} title="Exportar para planilha Excel">
            Exportar Excel
          </button>
          <button style={s.btnOutline} onClick={handleExportCSV} title="Exportar movimentações para CSV">
            Exportar CSV
          </button>
          <button
            style={s.btnSecondary}
            onClick={() => setShowAdjustModal(true)}
            title="Ajustar saldo real do caixa"
          >
            Atualizar Caixa
          </button>
          <button
            style={s.btnPrimary}
            onClick={() => setShowNewModal(true)}
          >
            + Nova Movimentação / Compra
          </button>
        </div>
      </div>

      {/* Indicadores Financeiros no Topo (Summary Cards) */}
      <FinancialSummaryCards
        summary={summary}
        loading={loadingSummary}
        onAdjustBalance={() => setShowAdjustModal(true)}
      />

      {/* Navegação entre Seções / Abas */}
      <div style={s.navTabs}>
        <button
          onClick={() => setActiveTab('visao_geral')}
          style={{
            ...s.navTabBtn,
            ...(activeTab === 'visao_geral' ? s.navTabBtnActive : {}),
          }}
        >
          Visão Geral & Gráficos
        </button>
        <button
          onClick={() => setActiveTab('movimentacoes')}
          style={{
            ...s.navTabBtn,
            ...(activeTab === 'movimentacoes' ? s.navTabBtnActive : {}),
          }}
        >
          Histórico de Movimentações ({movements.length})
        </button>
        <button
          onClick={() => setActiveTab('compras')}
          style={{
            ...s.navTabBtn,
            ...(activeTab === 'compras' ? s.navTabBtnActive : {}),
          }}
        >
          Controle de Compras & Entregas ({purchases.length})
        </button>
      </div>

      {/* CONTEÚDO: ABA 1 - VISÃO GERAL & GRÁFICOS */}
      {activeTab === 'visao_geral' && (
        <div style={s.tabContent}>
          <FinancialChart summary={summary} />

          {/* Atalhos para Compras Críticas e Movimentações Recentes */}
          <div style={s.recentGrid}>
            {/* Movimentações Recentes */}
            <div style={s.sectionCard}>
              <div style={s.sectionCardHeader}>
                <h3 style={s.sectionCardTitle}>Últimas Movimentações</h3>
                <button
                  style={s.btnLink}
                  onClick={() => setActiveTab('movimentacoes')}
                >
                  Ver todas &rarr;
                </button>
              </div>
              <MovementsTable
                movements={movements.slice(0, 5)}
                loading={loadingMovements}
                isAdmin={true}
                onEdit={(m) => setEditingMovement(m)}
                onCancel={(m) => setCancelingMovement(m)}
                onViewDetails={(m) => {}}
              />
            </div>

            {/* Compras Recentes / Acompanhamento */}
            <div style={s.sectionCard}>
              <div style={s.sectionCardHeader}>
                <h3 style={s.sectionCardTitle}>Compras Recentes & Entregas</h3>
                <button
                  style={s.btnLink}
                  onClick={() => setActiveTab('compras')}
                >
                  Ver todas &rarr;
                </button>
              </div>
              <PurchasesList
                purchases={purchases.slice(0, 5)}
                loading={loadingPurchases}
                isAdmin={true}
                quickFilter=""
                onQuickFilterChange={(qf) => {
                  setPurchQuickFilter(qf);
                  setActiveTab('compras');
                }}
                onViewDetails={handleViewPurchaseDetails}
                onEdit={(p) => setEditingPurchase(p)}
                onPayPurchase={(p) => setPayingPurchase(p)}
                onConfirmDelivery={(p) => setConfirmingDelivery(p)}
                onCancel={(p) => setCancelingPurchase(p)}
              />
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO: ABA 2 - MOVIMENTAÇÕES DE CAIXA */}
      {activeTab === 'movimentacoes' && (
        <div style={s.tabContent}>
          {/* Barra de Filtros de Movimentações */}
          <div style={s.filterCard}>
            <div style={s.filterGrid}>
              <div style={s.fieldCol}>
                <label style={s.fLabel}>Buscar movimentação</label>
                <input
                  style={s.fInput}
                  placeholder="Descrição, observação..."
                  value={movSearch}
                  onChange={(e) => setMovSearch(e.target.value)}
                />
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Tipo</label>
                <select
                  style={s.fInput}
                  value={movTipo}
                  onChange={(e) => setMovTipo(e.target.value)}
                >
                  <option value="todos">Todos os tipos</option>
                  <option value="entrada">Entradas (+)</option>
                  <option value="saida">Saídas (-)</option>
                </select>
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Categoria</label>
                <select
                  style={s.fInput}
                  value={movCat}
                  onChange={(e) => setMovCat(e.target.value)}
                >
                  <option value="todas">Todas as categorias</option>
                  <optgroup label="Entradas">
                    {(meta?.categoriasEntrada || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Saídas">
                    {(meta?.categoriasSaida || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Responsável</label>
                <select
                  style={s.fInput}
                  value={movResp}
                  onChange={(e) => setMovResp(e.target.value)}
                >
                  <option value="todos">Todos os responsáveis</option>
                  {(meta?.responsaveis || []).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Mês</label>
                <select
                  style={s.fInput}
                  value={movMonth}
                  onChange={(e) => setMovMonth(e.target.value)}
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={idx} value={idx === 0 ? '' : idx.toString()}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Ano</label>
                <select
                  style={s.fInput}
                  value={movYear}
                  onChange={(e) => setMovYear(e.target.value)}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y.toString()}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Status</label>
                <select
                  style={s.fInput}
                  value={movStatus}
                  onChange={(e) => setMovStatus(e.target.value)}
                >
                  <option value="ativo">Ativas</option>
                  <option value="cancelado">Canceladas</option>
                  <option value="todos">Todas</option>
                </select>
              </div>
            </div>

            {(movSearch || movTipo !== 'todos' || movCat !== 'todas' || movResp !== 'todos' || movMonth || movStatus !== 'ativo') && (
              <div style={s.clearRow}>
                <button
                  style={s.btnClearFilter}
                  onClick={() => {
                    setMovSearch('');
                    setMovTipo('todos');
                    setMovCat('todas');
                    setMovResp('todos');
                    setMovMonth('');
                    setMovStatus('ativo');
                  }}
                >
                  ✕ Limpar filtros
                </button>
              </div>
            )}
          </div>

          {/* Tabela de Movimentações */}
          <div style={s.tableCard}>
            <MovementsTable
              movements={movements}
              loading={loadingMovements}
              isAdmin={true}
              onEdit={(m) => setEditingMovement(m)}
              onCancel={(m) => setCancelingMovement(m)}
            />
          </div>
        </div>
      )}

      {/* CONTEÚDO: ABA 3 - CONTROLE DE COMPRAS */}
      {activeTab === 'compras' && (
        <div style={s.tabContent}>
          {/* Barra de Filtros de Compras */}
          <div style={s.filterCard}>
            <div style={s.filterGrid}>
              <div style={s.fieldCol}>
                <label style={s.fLabel}>Buscar compra</label>
                <input
                  style={s.fInput}
                  placeholder="Produto, fornecedor, rastreio..."
                  value={purchSearch}
                  onChange={(e) => setPurchSearch(e.target.value)}
                />
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Categoria</label>
                <select
                  style={s.fInput}
                  value={purchCat}
                  onChange={(e) => setPurchCat(e.target.value)}
                >
                  <option value="todas">Todas as categorias</option>
                  {(meta?.categoriasCompra || []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Comprador</label>
                <select
                  style={s.fInput}
                  value={purchComprador}
                  onChange={(e) => setPurchComprador(e.target.value)}
                >
                  <option value="todos">Todos os compradores</option>
                  {(meta?.responsaveis || []).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Status Pagamento</label>
                <select
                  style={s.fInput}
                  value={purchStatusPay}
                  onChange={(e) => setPurchStatusPay(e.target.value)}
                >
                  <option value="todos">Todos os status</option>
                  <option value="pago">Pago</option>
                  <option value="parcial">Parcialmente pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Status Entrega</label>
                <select
                  style={s.fInput}
                  value={purchStatusDel}
                  onChange={(e) => setPurchStatusDel(e.target.value)}
                >
                  <option value="todos">Todos os status</option>
                  <option value="aguardando_envio">Aguardando envio</option>
                  <option value="enviado">Enviado</option>
                  <option value="em_transporte">Em transporte</option>
                  <option value="entregue">Entregue / Recebido</option>
                </select>
              </div>

              <div style={s.fieldCol}>
                <label style={s.fLabel}>Status Registro</label>
                <select
                  style={s.fInput}
                  value={purchStatusReg}
                  onChange={(e) => setPurchStatusReg(e.target.value)}
                >
                  <option value="ativo">Ativas</option>
                  <option value="cancelado">Canceladas</option>
                  <option value="todos">Todas</option>
                </select>
              </div>
            </div>

            {(purchSearch || purchCat !== 'todas' || purchComprador !== 'todos' || purchStatusPay !== 'todos' || purchStatusDel !== 'todos' || purchStatusReg !== 'ativo' || purchQuickFilter) && (
              <div style={s.clearRow}>
                <button
                  style={s.btnClearFilter}
                  onClick={() => {
                    setPurchSearch('');
                    setPurchQuickFilter('');
                    setPurchCat('todas');
                    setPurchComprador('todos');
                    setPurchStatusPay('todos');
                    setPurchStatusDel('todos');
                    setPurchStatusReg('ativo');
                  }}
                >
                  ✕ Limpar filtros
                </button>
              </div>
            )}
          </div>

          {/* Lista & Tabela de Compras com Subfiltros Rápidos */}
          <div style={s.tableCard}>
            <PurchasesList
              purchases={purchases}
              loading={loadingPurchases}
              isAdmin={true}
              quickFilter={purchQuickFilter}
              onQuickFilterChange={(qf) => setPurchQuickFilter(qf)}
              onViewDetails={handleViewPurchaseDetails}
              onEdit={(p) => setEditingPurchase(p)}
              onPayPurchase={(p) => setPayingPurchase(p)}
              onConfirmDelivery={(p) => setConfirmingDelivery(p)}
              onCancel={(p) => setCancelingPurchase(p)}
            />
          </div>
        </div>
      )}

      {/* MODAIS */}

      {/* Modal Ajustar Saldo de Caixa */}
      {showAdjustModal && (
        <AdjustBalanceModal
          currentBalance={summary?.saldoAtual || 0}
          responsaveis={meta?.responsaveis || []}
          onClose={() => setShowAdjustModal(false)}
          onSubmit={handleAdjustBalance}
        />
      )}

      {/* Modal Registrar Pagamento de Compra */}
      {payingPurchase && (
        <PayPurchaseModal
          purchase={payingPurchase}
          formasPagamento={meta?.formasPagamento || []}
          responsaveis={meta?.responsaveis || []}
          onClose={() => setPayingPurchase(null)}
          onSubmit={handlePayPurchase}
        />
      )}

      {/* Modal Novo Lançamento (Entrada / Saída / Compra) */}
      {showNewModal && (
        <NewMovementModal
          meta={meta}
          onClose={() => setShowNewModal(false)}
          onCreateMovement={handleCreateMovement}
          onCreatePurchase={handleCreatePurchase}
        />
      )}

      {/* Modal Editar Movimentação */}
      {editingMovement && (
        <EditMovementModal
          movement={editingMovement}
          meta={meta}
          onClose={() => setEditingMovement(null)}
          onUpdate={handleUpdateMovement}
        />
      )}

      {/* Modal Cancelar Movimentação */}
      {cancelingMovement && (
        <CancelConfirmModal
          item={cancelingMovement}
          type="movimentacao"
          meta={meta}
          onClose={() => setCancelingMovement(null)}
          onConfirm={handleCancelMovement}
        />
      )}

      {/* Modal Detalhes e Auditoria de Compra */}
      {viewingPurchase && (
        <PurchaseDetailModal
          purchase={viewingPurchase}
          isAdmin={true}
          onClose={() => setViewingPurchase(null)}
          onEdit={(p) => setEditingPurchase(p)}
          onConfirmDelivery={(p) => setConfirmingDelivery(p)}
        />
      )}

      {/* Modal Editar Compra */}
      {editingPurchase && (
        <EditPurchaseModal
          purchase={editingPurchase}
          meta={meta}
          onClose={() => setEditingPurchase(null)}
          onUpdate={handleUpdatePurchase}
        />
      )}

      {/* Modal Confirmar Entrega de Material */}
      {confirmingDelivery && (
        <ConfirmDeliveryModal
          purchase={confirmingDelivery}
          meta={meta}
          onClose={() => setConfirmingDelivery(null)}
          onConfirm={handleConfirmDelivery}
        />
      )}

      {/* Modal Cancelar Compra */}
      {cancelingPurchase && (
        <CancelConfirmModal
          item={cancelingPurchase}
          type="compra"
          meta={meta}
          onClose={() => setCancelingPurchase(null)}
          onConfirm={handleCancelPurchase}
        />
      )}
    </div>
  );
}

const s = {
  pageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 4,
  },
  title: {
    fontSize: 'clamp(20px, 3vw, 24px)',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: 'var(--text)',
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--text-muted)',
    marginTop: 2,
    display: 'block',
  },
  headerBtnRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    padding: '9px 18px',
    borderRadius: 'var(--radius)',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(168,3,3,0.35)',
  },
  btnSecondary: {
    background: 'var(--bg-card)',
    color: 'var(--text)',
    border: '1px solid #38bdf8',
    padding: '8px 14px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnOutline: {
    background: 'var(--bg-card)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    padding: '8px 14px',
    borderRadius: 'var(--radius)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  navTabs: {
    display: 'flex',
    gap: 8,
    borderBottom: '1px solid var(--border)',
    paddingBottom: 2,
    overflowX: 'auto',
    scrollbarWidth: 'none',
  },
  navTabBtn: {
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  navTabBtnActive: {
    color: 'var(--text)',
    borderBottom: '2px solid var(--primary)',
  },
  tabContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  recentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(450px, 100%), 1fr))',
    gap: 16,
  },
  sectionCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '18px 20px',
    boxShadow: 'var(--shadow)',
  },
  sectionCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text)',
  },
  btnLink: {
    background: 'transparent',
    border: 'none',
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  filterCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '14px 18px',
    boxShadow: 'var(--shadow)',
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))',
    gap: 12,
  },
  fieldCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  fLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  fInput: {
    background: 'var(--bg-card2, #1f1f1f)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 8,
    padding: '8px 10px',
    fontSize: 13,
  },
  clearRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  btnClearFilter: {
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  tableCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    boxShadow: 'var(--shadow)',
    overflow: 'hidden',
  },
};
