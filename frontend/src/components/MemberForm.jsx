import React, { useState, useEffect } from 'react';
import { createMember, updateMember } from '../services/api';
import toast from 'react-hot-toast';

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

const BLOOD_TYPES = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];

const AREAS = [
  'Aerodinamica',
  'Aeroelasticidade',
  'Cargas',
  'Desempenho',
  'Eletrica',
  'Estabilidade e Controle',
  'Gestao e Design',
  'Plantas',
  'Estruturas e Ensaios Estruturais',
];

const EMPTY = {
  tipoMembro: 'membro',
  area: '',
  nome: '', cpf: '', email: '', sexo: '', dataNascimento: '',
  tipoSanguineo: '', cidadeNatal: '',
  endereco: '', bairro: '', cidade: '', uf: '', cep: '',
  nomePai: '', nomeMae: '',
  numeroMatricula: '', ingressoFaculdade: '', previsaoFormatura: '', curso: '',
  entradaMicro: '', saidaMicro: '',
  rg: '', orgaoExpedidor: '', dataEmissaoRG: '',
  numeroCelular: '', telefoneFixo: '',
  alergias: '', problemasSaude: '', temPlanoSaude: false, nomePlanoSaude: '',
  trabalhando: false, empresa: '',
};

function dateToInput(val) {
  if (!val) return '';
  return new Date(val).toISOString().split('T')[0];
}

export default function MemberForm({ onClose, onSaved, member }) {
  const isEdit = Boolean(member);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setForm({
        ...EMPTY,
        ...member,
        dataNascimento: dateToInput(member.dataNascimento),
        dataEmissaoRG: dateToInput(member.dataEmissaoRG),
      });
    }
  }, [member]);

  const isMembro = form.tipoMembro === 'membro';

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Campos obrigatorios apenas para membros atuais
  const REQUIRED_FIELDS = [
    { key: 'area',              label: 'Area de atuacao' },
    { key: 'nome',              label: 'Nome' },
    { key: 'cpf',               label: 'CPF' },
    { key: 'email',             label: 'E-mail' },
    { key: 'sexo',              label: 'Sexo' },
    { key: 'dataNascimento',    label: 'Data de Nascimento' },
    { key: 'tipoSanguineo',     label: 'Tipo Sanguineo' },
    { key: 'cidadeNatal',       label: 'Cidade Natal' },
    { key: 'endereco',          label: 'Endereco' },
    { key: 'bairro',            label: 'Bairro' },
    { key: 'cidade',            label: 'Cidade' },
    { key: 'uf',                label: 'UF' },
    { key: 'cep',               label: 'CEP' },
    { key: 'nomePai',           label: 'Nome do Pai' },
    { key: 'nomeMae',           label: 'Nome da Mae' },
    { key: 'numeroMatricula',   label: 'Numero de Matricula' },
    { key: 'ingressoFaculdade', label: 'Ingresso na Faculdade' },
    { key: 'previsaoFormatura', label: 'Previsao de Formatura' },
    { key: 'curso',             label: 'Curso' },
    { key: 'entradaMicro',      label: 'Entrou na Microraptor (Mês/Ano)' },
    { key: 'rg',                label: 'RG' },
    { key: 'orgaoExpedidor',    label: 'Orgao Expedidor' },
    { key: 'dataEmissaoRG',     label: 'Data de Emissao do RG' },
    { key: 'numeroCelular',     label: 'Numero de Celular' },
  ];

  // Retorna true se o campo esta vazio
  function isEmpty(key) {
    const val = form[key];
    return val === '' || val === null || val === undefined;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error('Nome e obrigatorio');
    if (!form.cpf.trim()) return toast.error('CPF e obrigatorio');

    if (isMembro) {
      for (const f of REQUIRED_FIELDS) {
        if (isEmpty(f.key)) {
          return toast.error(`${f.label} e obrigatorio para membros atuais`);
        }
      }
    } else {
      if (isEmpty('entradaMicro')) return toast.error('Entrou na Microraptor (Mês/Ano) e obrigatorio');
      if (isEmpty('saidaMicro'))  return toast.error('Saiu da Microraptor (Mês/Ano) e obrigatorio');
    }

    setLoading(true);
    try {
      if (isEdit) {
        await updateMember(member._id, form);
        toast.success('Membro atualizado!');
      } else {
        await createMember(form);
        toast.success('Cadastro enviado! Obrigado.');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao salvar membro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>{isEdit ? 'Editar Membro' : 'Cadastro de Membro'}</h2>
          <button onClick={onClose} style={s.closeBtn}>x</button>
        </div>

        <form onSubmit={handleSubmit} style={s.body}>

          {/* ─── Tipo de Membro ─── */}
          <div style={s.tipoSection}>
            <p style={s.tipoLabel}>Você:</p>
            <div style={s.tipoOptions}>
              <button
                type="button"
                onClick={() => set('tipoMembro', 'membro')}
                style={{ ...s.tipoBtn, ...(form.tipoMembro === 'membro' ? s.tipoBtnActive : {}) }}
              >
                <span style={s.tipoBtnLabel}>Faz parte da equipe</span>
                <span style={s.tipoBtnSub}>Ainda participa ativamente da Microraptor</span>
              </button>
              <button
                type="button"
                onClick={() => set('tipoMembro', 'ex-membro')}
                style={{ ...s.tipoBtn, ...(form.tipoMembro === 'ex-membro' ? s.tipoBtnExActive : {}) }}
              >
                <span style={s.tipoBtnLabel}>Ja fez parte da equipe</span>
                <span style={s.tipoBtnSub}>Fez parte da Microraptor em algum momento</span>
              </button>
            </div>
          </div>

          {/* ─── Area ─── */}
          <div style={s.tipoSection}>
            <p style={s.tipoLabel}>
              Area de atuacao na Microraptor
              {isMembro && <span style={s.asterisk}> *</span>}
            </p>
            <select
              style={{ ...s.input, maxWidth: 360, borderColor: isMembro && !form.area ? 'rgba(168,3,3,0.5)' : undefined }}
              value={form.area}
              onChange={(e) => set('area', e.target.value)}
            >
              <option value="">Selecione a area</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {isMembro && (
            <p style={s.requiredNote}>* Todos os campos marcados sao obrigatorios para membros atuais.</p>
          )}

          {/* ─── Dados Pessoais ─── */}
          <Section title="Dados Pessoais">
            <Field label="Nome" req>
              <input style={s.input} value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Nome completo" />
            </Field>
            <Field label="CPF" req>
              <input style={s.input} value={form.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" />
            </Field>
            <Field label="E-mail" req={isMembro}>
              <input style={s.input} type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@exemplo.com" />
            </Field>
            <Field label="Sexo" req={isMembro}>
              <select style={s.input} value={form.sexo} onChange={(e) => set('sexo', e.target.value)}>
                <option value="">Selecione</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </Field>
            <Field label="Data de Nascimento" req={isMembro}>
              <input style={s.input} type="date" value={form.dataNascimento} onChange={(e) => set('dataNascimento', e.target.value)} />
            </Field>
            <Field label="Tipo Sanguineo" req={isMembro}>
              <select style={s.input} value={form.tipoSanguineo} onChange={(e) => set('tipoSanguineo', e.target.value)}>
                <option value="">Selecione</option>
                {BLOOD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Cidade Natal" req={isMembro}>
              <input style={s.input} value={form.cidadeNatal} onChange={(e) => set('cidadeNatal', e.target.value)} placeholder="Cidade natal" />
            </Field>
          </Section>

          {/* ─── Endereco ─── */}
          <Section title="Endereco">
            <Field label="Endereco" req={isMembro}>
              <input style={s.input} value={form.endereco} onChange={(e) => set('endereco', e.target.value)} placeholder="Rua, numero, complemento" />
            </Field>
            <Field label="Bairro" req={isMembro}>
              <input style={s.input} value={form.bairro} onChange={(e) => set('bairro', e.target.value)} placeholder="Bairro" />
            </Field>
            <Field label="Cidade" req={isMembro}>
              <input style={s.input} value={form.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="Cidade" />
            </Field>
            <Field label="UF" req={isMembro}>
              <select style={s.input} value={form.uf} onChange={(e) => set('uf', e.target.value)}>
                <option value="">Selecione</option>
                {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </Field>
            <Field label="CEP" req={isMembro}>
              <input style={s.input} value={form.cep} onChange={(e) => set('cep', e.target.value)} placeholder="00000-000" />
            </Field>
          </Section>

          {/* ─── Familia — apenas membro atual ─── */}
          {isMembro && (
            <Section title="Familia">
              <Field label="Nome do Pai" req>
                <input style={s.input} value={form.nomePai} onChange={(e) => set('nomePai', e.target.value)} placeholder="Nome completo do pai" />
              </Field>
              <Field label="Nome da Mae" req>
                <input style={s.input} value={form.nomeMae} onChange={(e) => set('nomeMae', e.target.value)} placeholder="Nome completo da mae" />
              </Field>
            </Section>
          )}

          {/* ─── Academico — membro atual ─── */}
          {isMembro && (
            <Section title="Academico">
              <Field label="Numero de Matricula" req>
                <input style={s.input} value={form.numeroMatricula} onChange={(e) => set('numeroMatricula', e.target.value)} placeholder="Matricula" />
              </Field>
              <Field label="Ingresso na Faculdade (Mês/Ano)" req>
                <input style={s.input} value={form.ingressoFaculdade} onChange={(e) => set('ingressoFaculdade', e.target.value)} placeholder="Ex: 08/2021" />
              </Field>
              <Field label="Previsao de Formatura (Mês/Ano)" req>
                <input style={s.input} value={form.previsaoFormatura} onChange={(e) => set('previsaoFormatura', e.target.value)} placeholder="Ex: 06/2025" />
              </Field>
              <Field label="Curso" req>
                <input style={s.input} value={form.curso} onChange={(e) => set('curso', e.target.value)} placeholder="Nome do curso" />
              </Field>
              <Field label="Entrou na Microraptor (Mês/Ano)" req>
                <input style={s.input} value={form.entradaMicro} onChange={(e) => set('entradaMicro', e.target.value)} placeholder="Ex: 03/2022" />
              </Field>
            </Section>
          )}

          {/* ─── Historico na Micro — ex-membro ─── */}
          {!isMembro && (
            <Section title="Historico na Microraptor">
              <Field label="Curso">
                <input style={s.input} value={form.curso} onChange={(e) => set('curso', e.target.value)} placeholder="Nome do curso" />
              </Field>
              <Field label="Entrou na Microraptor (Mês/Ano)" req>
                <input style={s.input} value={form.entradaMicro} onChange={(e) => set('entradaMicro', e.target.value)} placeholder="Ex: 08/2019" />
              </Field>
              <Field label="Saiu da Microraptor (Mês/Ano)" req>
                <input style={s.input} value={form.saidaMicro} onChange={(e) => set('saidaMicro', e.target.value)} placeholder="Ex: 03/2022" />
              </Field>
            </Section>
          )}

          {/* ─── Documentos — apenas membro atual ─── */}
          {isMembro && (
            <Section title="Documentos">
              <Field label="RG" req>
                <input style={s.input} value={form.rg} onChange={(e) => set('rg', e.target.value)} placeholder="Numero do RG" />
              </Field>
              <Field label="Orgao Expedidor" req>
                <input style={s.input} value={form.orgaoExpedidor} onChange={(e) => set('orgaoExpedidor', e.target.value)} placeholder="SSP/MG" />
              </Field>
              <Field label="Data de Emissao" req>
                <input style={s.input} type="date" value={form.dataEmissaoRG} onChange={(e) => set('dataEmissaoRG', e.target.value)} />
              </Field>
            </Section>
          )}

          {/* ─── Contatos ─── */}
          <Section title="Contatos">
            <Field label="Numero de Celular" req={isMembro}>
              <input style={s.input} value={form.numeroCelular} onChange={(e) => set('numeroCelular', e.target.value)} placeholder="(00) 90000-0000" />
            </Field>
            <Field label="Telefone Fixo">
              <input style={s.input} value={form.telefoneFixo} onChange={(e) => set('telefoneFixo', e.target.value)} placeholder="(00) 0000-0000" />
            </Field>
          </Section>

          {/* ─── Emprego — apenas ex-membro ─── */}
          {!isMembro && (
            <Section title="Situacao Profissional">
              <Field label="Esta trabalhando?" inline>
                <input type="checkbox" checked={form.trabalhando} onChange={(e) => set('trabalhando', e.target.checked)} style={s.checkbox} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{form.trabalhando ? 'Sim' : 'Nao'}</span>
              </Field>
              {form.trabalhando && (
                <Field label="Em qual empresa?">
                  <input style={s.input} value={form.empresa} onChange={(e) => set('empresa', e.target.value)} placeholder="Nome da empresa" />
                </Field>
              )}
            </Section>
          )}

          {/* ─── Saude — apenas membro atual ─── */}
          {isMembro && (
            <Section title="Saude">
              <Field label="Alergias (alimentar, pele, remedio)">
                <textarea style={{ ...s.input, ...s.textarea }} value={form.alergias} onChange={(e) => set('alergias', e.target.value)} placeholder="Descreva alergias conhecidas" />
              </Field>
              <Field label="Problemas de Saude">
                <textarea style={{ ...s.input, ...s.textarea }} value={form.problemasSaude} onChange={(e) => set('problemasSaude', e.target.value)} placeholder="Descreva problemas de saude" />
              </Field>
              <Field label="Tem plano de saude?" inline>
                <input type="checkbox" checked={form.temPlanoSaude} onChange={(e) => set('temPlanoSaude', e.target.checked)} style={s.checkbox} />
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{form.temPlanoSaude ? 'Sim' : 'Nao'}</span>
              </Field>
              {form.temPlanoSaude && (
                <Field label="Nome do Plano de Saude">
                  <input style={s.input} value={form.nomePlanoSaude} onChange={(e) => set('nomePlanoSaude', e.target.value)} placeholder="Nome do plano" />
                </Field>
              )}
            </Section>
          )}

          <div style={s.footer}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ ...s.saveBtn, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alteracoes' : 'Enviar Cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <div style={s.sectionTitle}>{title}</div>
      <div style={s.grid}>{children}</div>
    </div>
  );
}

function Field({ label, children, inline, req }) {
  return (
    <div style={inline ? s.fieldInline : s.field}>
      <label style={s.label}>
        {label}
        {req && <span style={s.asterisk}> *</span>}
      </label>
      <div style={inline ? s.inlineRow : undefined}>{children}</div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    zIndex: 1000, padding: '16px',
    overflowY: 'auto',
  },
  modal: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    maxWidth: 720,
    marginTop: 16,
    marginBottom: 16,
    boxShadow: 'var(--shadow)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0,
    background: 'var(--bg-card)',
    zIndex: 1,
    borderRadius: 'var(--radius) var(--radius) 0 0',
  },
  title: { fontSize: 18, fontWeight: 700 },
  closeBtn: {
    background: 'transparent', color: 'var(--text-muted)',
    fontSize: 18, padding: '4px 8px', borderRadius: 6,
  },
  body: { padding: '0 24px 24px', overflowY: 'auto' },
  tipoSection: { marginTop: 24 },
  tipoLabel: { fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center' },
  asterisk: { color: 'var(--primary)', fontWeight: 700, marginLeft: 2 },
  requiredNote: { fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' },
  tipoOptions: { display: 'flex', gap: 12 },
  tipoBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 6, padding: '20px 16px',
    background: 'var(--bg-card2)',
    border: '2px solid var(--border)',
    borderRadius: 'var(--radius)', cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  },
  tipoBtnActive: {
    borderColor: 'var(--primary)',
    background: 'rgba(168,3,3,0.08)',
  },
  tipoBtnExActive: {
    borderColor: '#6366f1',
    background: 'rgba(99,102,241,0.08)',
  },
  tipoBtnLabel: { fontSize: 15, fontWeight: 700, color: 'var(--text)' },
  tipoBtnSub: { fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 12, fontWeight: 700, color: 'var(--primary)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: '1px solid var(--border)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px 20px',
  },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldInline: { display: 'flex', flexDirection: 'column', gap: 5 },
  inlineRow: { display: 'flex', alignItems: 'center', gap: 10, height: 40 },
  label: { fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 },
  input: {
    background: 'var(--bg-card2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 14,
    width: '100%',
  },
  textarea: { height: 80, resize: 'vertical', fontFamily: 'inherit' },
  checkbox: { width: 18, height: 18, accentColor: 'var(--primary)', cursor: 'pointer' },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: 10,
    marginTop: 28, paddingTop: 20,
    borderTop: '1px solid var(--border)',
  },
  cancelBtn: {
    background: 'transparent', color: 'var(--text-muted)',
    border: '1px solid var(--border)', padding: '10px 20px',
    borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 500,
  },
  saveBtn: {
    background: 'var(--primary)', color: '#fff',
    padding: '10px 24px', borderRadius: 'var(--radius)',
    fontSize: 14, fontWeight: 600,
    boxShadow: '0 2px 8px rgba(168,3,3,0.4)',
  },
};
