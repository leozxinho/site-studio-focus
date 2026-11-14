// ==========================================
// TOAST HELPER
// ==========================================

function mostrarToast(mensagem, tipo = 'sucesso') {
    let toast = document.getElementById('toast-global');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-global';
        toast.className = 'fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl text-white text-sm font-bold shadow-2xl transition-all duration-300 opacity-0 translate-y-4 pointer-events-none';
        document.body.appendChild(toast);
    }
    toast.textContent = mensagem;
    toast.className = `fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-xl text-white text-sm font-bold shadow-2xl transition-all duration-300 opacity-0 translate-y-4 pointer-events-none ${tipo === 'erro' ? 'bg-red-600' : 'bg-green-600'}`;

    // Trigger animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-y-4');
        });
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-4');
    }, 3000);
}

// ==========================================
// CACHE SIMPLES COM TTL
// ==========================================
const _sfCache = {};

function cacheSet(key, data, ttlMs = 60000) {
    _sfCache[key] = { data, expires: Date.now() + ttlMs };
}

function cacheGet(key) {
    const entry = _sfCache[key];
    if (entry && Date.now() < entry.expires) return entry.data;
    delete _sfCache[key];
    return null;
}

function cacheInvalidate(...keys) {
    keys.forEach(k => delete _sfCache[k]);
}

function cacheInvalidateAll() {
    Object.keys(_sfCache).forEach(k => delete _sfCache[k]);
}

// ==========================================
// Authentication Logic
// ==========================================
// Só quem tem app_metadata.role = 'admin' (definido via SQL) entra no painel.
// As policies do banco aplicam a mesma regra (public.is_admin()).
function isAdminSession(session) {
    return session?.user?.app_metadata?.role === 'admin';
}

async function checkAuth() {
    const db = getSupabase();
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/admin/');
    if (!db) {
        if (!isLoginPage) window.location.href = 'index.html';
        return false;
    }
    let { data: { session } } = await db.auth.getSession();
    if (session && !isAdminSession(session)) {
        await db.auth.signOut();
        session = null;
    }
    if (!session && !isLoginPage) {
        window.location.href = 'index.html';
        return false;
    }
    if (session && isLoginPage) {
        window.location.href = 'dashboard.html';
        return false;
    }
    return true;
}

async function login(email, password) {
    const db = getSupabase();
    if (!db) return 'Conexão indisponível.';
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) return 'E-mail ou senha incorretos.';
    if (!isAdminSession(data?.session)) {
        await db.auth.signOut();
        return 'Este usuário não tem permissão de administrador.';
    }
    window.location.href = 'dashboard.html';
    return null;
}

async function logout() {
    const db = getSupabase();
    if (db) await db.auth.signOut();
    ['studioFocusAdminLoggedIn', 'studioFocusAdminSession', 'studioFocusAdminCredentials']
        .forEach(k => localStorage.removeItem(k));
    cacheInvalidateAll();
    window.location.href = 'index.html';
}

function initTheme() {
    const saved = localStorage.getItem('sf-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    _atualizarIconeTema(saved);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sf-theme', next);
    _atualizarIconeTema(next);
}

function _atualizarIconeTema(theme) {
    const icon = document.getElementById('theme-icon');
    const label = document.getElementById('theme-label');
    if (icon) icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
    if (label) label.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
    if (window.lucide) lucide.createIcons();
}

// Navigation Logic for Dashboard
function setupNavigation() {
    const navButtons = document.querySelectorAll('[data-section]');
    const sections = document.querySelectorAll('.dashboard-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.getAttribute('data-section');

            // Update active button
            navButtons.forEach(b => b.classList.remove('active', 'bg-pu', 'text-white'));
            btn.classList.add('active', 'bg-pu', 'text-white');

            // Show selected section with fade animation
            sections.forEach(s => s.classList.add('hidden'));
            const activeSection = document.getElementById(sectionId);
            if (activeSection) {
                activeSection.classList.remove('hidden');
                // Reaplica animação resetando a classe
                activeSection.style.animation = 'none';
                requestAnimationFrame(() => { activeSection.style.animation = ''; });
            }

            // Close mobile menu if open
            const sidebar = document.getElementById('sidebar');
            if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
                toggleSidebar();
            }
        });
    });
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.toggle('-translate-x-full');
    }
    if (overlay) {
        overlay.classList.toggle('hidden');
    }
}

// Initialize on load
// ── Visibilidade de valores sensíveis ────────────────────────────────────────
const _CAMPOS_VISIBILIDADE = ['stat-total-alunos', 'stat-receita-mensal', 'despesas-pagas', 'despesas-pendentes'];

async function salvarVisibilidadeDB(id, estado) {
    const db = getSupabase();
    if (!db) return;
    await db.from('configuracoes_admin').upsert({ chave: 'vis_' + id, valor: estado }, { onConflict: 'chave' });
}

function _aplicarEstadoVisibilidade(id, estado) {
    const el = document.getElementById(id);
    const btn = document.querySelector(`[onclick*="'${id}'"]`);
    if (!el || !btn) return;
    if (estado === 'hidden' && el.dataset.hidden !== 'true') {
        el.dataset.valor = el.textContent;
        el.textContent = '••••••';
        el.dataset.hidden = 'true';
        btn.innerHTML = '<i data-lucide="eye-off" class="w-4 h-4"></i>';
        if (window.lucide) lucide.createIcons({ nodes: [btn] });
    } else if (estado === 'visible' && el.dataset.hidden === 'true') {
        el.textContent = el.dataset.valor || '';
        el.dataset.hidden = 'false';
        btn.innerHTML = '<i data-lucide="eye" class="w-4 h-4"></i>';
        if (window.lucide) lucide.createIcons({ nodes: [btn] });
    }
}

async function initVisibilidade() {
    // Aplica do localStorage imediatamente (sem latência de rede)
    _CAMPOS_VISIBILIDADE.forEach(id => {
        const estado = localStorage.getItem('sf-vis-' + id);
        if (estado) _aplicarEstadoVisibilidade(id, estado);
    });
    // Sincroniza do banco e sobrescreve caso haja diferença (cross-device)
    const db = getSupabase();
    if (!db) return;
    const { data } = await db
        .from('configuracoes_admin')
        .select('chave, valor')
        .in('chave', _CAMPOS_VISIBILIDADE.map(id => 'vis_' + id));
    if (!data) return;
    data.forEach(({ chave, valor }) => {
        const id = chave.replace(/^vis_/, '');
        localStorage.setItem('sf-vis-' + id, valor);
        _aplicarEstadoVisibilidade(id, valor);
    });
}

async function initAdmin() {
    const ok = await checkAuth();
    if (!ok) return;
    initTheme();

    // Redireciona automaticamente se a sessão expirar
    const db = getSupabase();
    if (db) {
        db.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') window.location.href = 'index.html';
        });
    }

    if (document.getElementById('dashboard-content')) {
        setupNavigation();

        // Usa hash para deep-link (ex: voltar da ficha-avaliacao), depois limpa o hash
        // para que o próximo carregamento fresh sempre abra no dashboard
        const hashSection = location.hash.replace('#', '');
        history.replaceState(null, '', location.pathname);
        navegarPara(hashSection || 'visao-geral');

        setupFormAluno();
        setupFormPagamento();
        setupFormDespesa();
        setupFormTreino();
        fetchAlunos();
        setupFiltroPagamentos();
        setupFiltroDespesas();
        fetchPagamentos();
        fetchDespesas();
        fetchTreinos();
        // Inicializa o filtro de mês com o mês atual antes de carregar os stats
        const hoje = new Date();
        const inputMes = document.getElementById('filtro-mes-visao-geral');
        if (inputMes) inputMes.value = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
        fetchOverviewStats();
        initVisibilidade();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}


// ==========================================
// AUTOCOMPLETE DE EXERCÍCIOS
// ==========================================

let masterExercisesDb = [];
let customExercisesDb = [];

async function carregarExerciciosPersonalizados() {
    const db = getSupabase();
    if (!db) return;
    const { data } = await db.from('exercicios_personalizados').select('*').order('created_at', { ascending: false });
    customExercisesDb = data || [];
}

async function excluirExercicioPersonalizado(id) {
    const db = getSupabase();
    if (!db) return;
    await db.from('exercicios_personalizados').delete().eq('id', id);
    customExercisesDb = customExercisesDb.filter(e => e.id !== id);
    renderizarBibliotecaGrid();
}

// Pastas dos exercícios são em minúsculas; IDs/caminhos antigos podem ter maiúsculas.
// Só mexe em caminhos relativos (".../exercises/<Id>/..."), nunca em URLs externas.
function exImg(path) {
    if (!path || /^(?:[a-z]+:)?\/\//i.test(path) || path.startsWith('data:')) return path;
    return path.replace(/((?:^|\/)exercises\/)([^/]+)/, (m, a, b) => a + b.toLowerCase());
}

async function carregarExerciciosDb() {
    if (masterExercisesDb.length > 0) return;
    try {
        const r = await fetch('exercises/exercises_db.json');
        if (r.ok) masterExercisesDb = await r.json();
    } catch(e) { /* silencioso */ }
}

function renderSugestoes(input, dropdown) {
    const termo = input.value.trim().toLowerCase();
    if (!termo || masterExercisesDb.length === 0) {
        dropdown.classList.add('hidden');
        return;
    }

    const resultados = masterExercisesDb.filter(ex =>
        (ex.namePt || ex.name || '').toLowerCase().includes(termo) ||
        (ex.name || '').toLowerCase().includes(termo) ||
        (ex.primaryMuscles || []).join(' ').toLowerCase().includes(termo)
    ).slice(0, 8);

    if (resultados.length === 0) { dropdown.classList.add('hidden'); return; }

    dropdown.innerHTML = '';
    resultados.forEach(ex => {
        const thumbUrl = exImg(ex.animacao ? ('../' + ex.animacao) : ('exercises/' + ex.id + '/0.jpg'));

        const item = document.createElement('div');
        item.className = 'flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-s3 transition-colors border-b border-bd/30 last:border-0';
        item.innerHTML = `
            <img src="${thumbUrl}" alt="${ex.namePt || ex.name}"
                 onerror="this.onerror=null;this.src='${exImg('exercises/' + ex.id + '/0.jpg')}'"
                 class="w-10 h-10 object-cover rounded flex-shrink-0 bg-s3">
            <div class="min-w-0 flex-1">
                <p class="text-tx text-xs font-semibold truncate">${ex.namePt || ex.name}</p>
                <p class="text-mt text-[10px] truncate uppercase">${(ex.primaryMuscles || []).join(', ')}</p>
            </div>
        `;

        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            input.value = ex.namePt || ex.name;
            const row = input.closest('.exercicio-row');
            if (row) {
                const animInput = row.querySelector('.ex-animacao');
                if (animInput) {
                    animInput.value = exImg(ex.animacao ? ('admin/' + ex.animacao.replace(/^admin\//, '')) : ('admin/exercises/' + ex.id + '/anim.webp'));
                }
            }
            salvarInputsDoDiaAtivo();
            dropdown.classList.add('hidden');
        });

        dropdown.appendChild(item);
    });

    dropdown.classList.remove('hidden');
}

// --- Supabase Integration ---
var SUPABASE_URL = 'https://dvjjproexhetqlazftln.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2ampwcm9leGhldHFsYXpmdGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzEwNzUsImV4cCI6MjA5NDI0NzA3NX0._Y22KalUdIzT6TzalVR2haBsUvXeeyBeC_cpwPOTKNk';

var supabaseClient = null;
function fimDoMes(mesRef) {
    const [ano, mes] = mesRef.split('-').map(Number);
    const ultimo = new Date(ano, mes, 0).getDate();
    return `${mesRef}-${String(ultimo).padStart(2, '0')}`;
}

function getSupabase() {
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabaseClient;
}

// --- Alunos CRUD ---

let _todosAlunos = [];
let _alunosComTreino = new Set();
let _termoBuscaAluno = '';
let _paginaAlunos = 1;
const _ALUNOS_POR_PAG = 25;

function filtrarAlunosBusca(termo) {
    _termoBuscaAluno = (termo || '').toLowerCase().trim();
    _paginaAlunos = 1;
    _renderizarTabelaAlunos(_todosAlunos);
}

function _aplicarFiltrosAlunos(alunos) {
    const statusFiltro = (document.getElementById('filtro-aluno-status') || {}).value || '';
    const planoFiltro = (document.getElementById('filtro-aluno-plano') || {}).value || '';
    return alunos.filter(a => {
        const nomeMatch = !_termoBuscaAluno || (a.nome || '').toLowerCase().includes(_termoBuscaAluno) || (a.telefone || '').includes(_termoBuscaAluno) || (a.cpf || '').includes(_termoBuscaAluno);
        const statusMatch = !statusFiltro || a.status === statusFiltro;
        const planoMatch = !planoFiltro || (a.plano || '').includes(planoFiltro);
        return nomeMatch && statusMatch && planoMatch;
    });
}

function mudarPaginaAlunos(delta) {
    _paginaAlunos += delta;
    _renderizarTabelaAlunos(_todosAlunos);
}

function _atualizarPaginacaoAlunos(total, totalPags) {
    const container = document.getElementById('alunos-paginacao');
    const info = document.getElementById('alunos-pag-info');
    const pages = document.getElementById('alunos-pag-pages');
    const prev = document.getElementById('alunos-pag-prev');
    const next = document.getElementById('alunos-pag-next');
    if (!container) return;
    if (total <= _ALUNOS_POR_PAG) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    const inicio = (_paginaAlunos - 1) * _ALUNOS_POR_PAG + 1;
    const fim = Math.min(_paginaAlunos * _ALUNOS_POR_PAG, total);
    if (info) info.textContent = `${inicio}–${fim} de ${total} alunos`;
    if (pages) pages.textContent = `Página ${_paginaAlunos} de ${totalPags}`;
    if (prev) prev.disabled = _paginaAlunos <= 1;
    if (next) next.disabled = _paginaAlunos >= totalPags;
}

function _mostrarSkeletonTabela(tbody, colunas, linhas = 5) {
    tbody.innerHTML = Array.from({ length: linhas }).map(() =>
        `<tr class="skeleton-row border-b border-bd/30">${
            Array.from({ length: colunas }).map(() =>
                `<td class="py-4"><div class="skeleton-cell" style="width:${60 + Math.random()*30|0}%"></div></td>`
            ).join('')
        }</tr>`
    ).join('');
}

async function fetchAlunos(forceRefresh = false) {
    const tbody = document.getElementById('lista-alunos-tbody');
    const db = getSupabase();
    if (!tbody || !db) return;

    const CACHE_KEY = 'alunos_list';
    let alunos = forceRefresh ? null : cacheGet(CACHE_KEY);

    if (!alunos) {
        _mostrarSkeletonTabela(tbody, 6);
        try {
            const { data, error } = await db
                .from('alunos')
                .select('id, nome, cpf, telefone, endereco, valor_plano, plano, status, created_at, data_nascimento, pagamentos(status, vencimento)')
                .order('nome', { ascending: true });

            if (error) throw error;
            alunos = data || [];
            cacheSet(CACHE_KEY, alunos, 45000);

            // Busca alunos que já têm treino
            const { data: treinosData } = await db.from('treinos').select('aluno_id');
            _alunosComTreino = new Set((treinosData || []).map(t => t.aluno_id).filter(Boolean));
        } catch (error) {
            console.error('Erro ao buscar alunos:', error);
            tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-red-400">Erro ao carregar alunos. Verifique suas credenciais do Supabase.</td></tr>';
            return;
        }
    }

    _todosAlunos = alunos;

    if (document.getElementById('stat-total-alunos')) {
        const ativos = alunos.filter(a => a.status === 'ATIVO').length;
        setStat('stat-total-alunos', ativos);
    }

    _renderizarTabelaAlunos(alunos);
}

function _renderizarTabelaAlunos(alunos) {
    const tbody = document.getElementById('lista-alunos-tbody');
    if (!tbody) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const lista = _aplicarFiltrosAlunos(alunos);

    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-mt">${_termoBuscaAluno ? 'Nenhum aluno encontrado para "' + _termoBuscaAluno + '".' : 'Nenhum aluno cadastrado.'}</td></tr>`;
        _atualizarPaginacaoAlunos(0, 0);
        return;
    }

    const totalPags = Math.ceil(lista.length / _ALUNOS_POR_PAG);
    _paginaAlunos = Math.max(1, Math.min(_paginaAlunos, totalPags));
    const inicio = (_paginaAlunos - 1) * _ALUNOS_POR_PAG;
    const paginada = lista.slice(inicio, inicio + _ALUNOS_POR_PAG);

    _atualizarPaginacaoAlunos(lista.length, totalPags);

    tbody.innerHTML = '';
    paginada.forEach(aluno => {
        const iniciais = aluno.nome.substring(0, 2).toUpperCase();

        const pagamentos = aluno.pagamentos || [];
        const inadimplente = pagamentos.some(p =>
            p.status !== 'PAGO' && new Date(p.vencimento + 'T00:00:00') < hoje
        );
        const emDia = !inadimplente && pagamentos.some(p => p.status === 'PAGO');
        const pendente = !inadimplente && pagamentos.some(p => p.status === 'PENDENTE');

        let finBadge = '';
        if (inadimplente) {
            finBadge = `<span class="text-[10px] font-bold bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">Inadimplente</span>`;
        } else if (emDia) {
            finBadge = `<span class="text-[10px] font-bold bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">Em dia</span>`;
        } else if (pendente) {
            finBadge = `<span class="text-[10px] font-bold bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full">Pendente</span>`;
        }

        const semTreino = !_alunosComTreino.has(aluno.id);
        const semTreinoBadge = semTreino ? `<span class="text-[10px] font-bold bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full">Sem treino</span>` : '';

        const hoje7 = new Date(); hoje7.setDate(hoje7.getDate() + 7);
        const vencendoBreve = (aluno.pagamentos || []).some(p =>
            p.status !== 'PAGO' && new Date(p.vencimento + 'T00:00:00') <= hoje7 && new Date(p.vencimento + 'T00:00:00') >= hoje
        );
        const renovacaoBadge = vencendoBreve ? `<span class="text-[10px] font-bold bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full">Vence em breve</span>` : '';

        const statusActive = aluno.status === 'ATIVO'
            ? `<span class="text-[10px] font-bold bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">Ativo</span>`
            : aluno.status === 'INATIVO'
                ? `<span class="text-[10px] font-bold bg-gray-500/15 text-gray-400 px-2 py-0.5 rounded-full">Inativo</span>`
                : `<span class="text-[10px] font-bold bg-yellow-500/15 text-yellow-400 px-2 py-0.5 rounded-full">Pendente</span>`;

        const tr = document.createElement('tr');
        tr.className = 'border-b border-bd/30 hover:bg-s2/30 transition-colors' + (inadimplente ? ' border-l-2 border-l-red-500' : '');
        tr.innerHTML = `
            <td class="px-4 py-3.5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 ${inadimplente ? 'bg-red-500/20 text-red-400' : 'bg-pu/20 text-pu'} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">${iniciais}</div>
                    <div>
                        <div class="font-medium text-sm">${aluno.nome}</div>
                        <div class="text-[10px] text-mt">${aluno.telefone || aluno.cpf || ''}</div>
                        ${aluno.data_nascimento ? `<div class="text-[10px] text-mt/70">${new Date(aluno.data_nascimento + 'T00:00:00').toLocaleDateString('pt-BR')}</div>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-4 py-3.5">
                <div class="text-sm">${aluno.plano || 'Sem plano'}</div>
                <div class="text-[10px] text-mt">Desde: ${aluno.created_at ? new Date(aluno.created_at).toLocaleDateString('pt-BR') : '-'}</div>
            </td>
            <td class="px-4 py-3.5">
                <div class="flex items-center gap-1.5 flex-wrap">
                    ${finBadge}
                    ${statusActive}
                    ${semTreinoBadge}${renovacaoBadge}
                </div>
            </td>
            <td class="px-4 py-3.5 hidden lg:table-cell text-sm text-mt">${aluno.telefone || '-'}</td>
            <td class="px-4 py-3.5 text-right">
                <button onclick='enviarTreinoPorWhatsApp("${aluno.id}", ${JSON.stringify(aluno.nome)}, "${aluno.telefone || ''}")' class="p-1.5 text-emerald-400 hover:text-emerald-300 transition-colors" title="Enviar treino no WhatsApp">
                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                </button>
                <button onclick='editarAluno(${JSON.stringify(aluno).replace(/'/g, "&#39;")})' class="p-1.5 text-mt hover:text-pu transition-colors" title="Editar">
                    <i data-lucide="edit-2" class="w-4 h-4"></i>
                </button>
                <button onclick="inativarAluno('${aluno.id}')" class="p-1.5 text-mt hover:text-red-500 transition-colors" title="Desativar Aluno">
                    <i data-lucide="user-minus" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
}

function abrirModalAluno() {
    document.getElementById('form-aluno').reset();
    document.getElementById('aluno-id').value = '';
    document.getElementById('modal-titulo').innerText = 'Novo Aluno';
    // Limpar campo de busca de aluno se existir
    const buscaAluno = document.getElementById('busca-aluno');
    if (buscaAluno) buscaAluno.value = '';
    _termoBuscaAluno = '';
    document.getElementById('modal-aluno').classList.remove('hidden');
    document.getElementById('modal-aluno').classList.add('flex');
}

function fecharModalAluno() {
    document.getElementById('modal-aluno').classList.add('hidden');
    document.getElementById('modal-aluno').classList.remove('flex');
}

function editarAluno(aluno) {
    document.getElementById('aluno-id').value = aluno.id;
    document.getElementById('aluno-nome').value = aluno.nome;
    document.getElementById('aluno-cpf').value = aluno.cpf || '';
    document.getElementById('aluno-telefone').value = aluno.telefone || '';
    document.getElementById('aluno-endereco').value = aluno.endereco || '';
    document.getElementById('aluno-plano').value = aluno.plano || 'Plano Mensal';
    document.getElementById('aluno-status').value = aluno.status || 'ATIVO';
    document.getElementById('aluno-nascimento').value = aluno.data_nascimento || '';

    const valEl = document.getElementById('aluno-valor-plano');
    const diaEl = document.getElementById('aluno-dia-vencimento');
    if (valEl) valEl.value = aluno.valor_plano || '';
    if (diaEl) diaEl.value = 10;

    document.getElementById('modal-titulo').innerText = 'Editar Aluno';
    document.getElementById('modal-aluno').classList.remove('hidden');
    document.getElementById('modal-aluno').classList.add('flex');
}

async function inativarAluno(id) {
    confirmarAcao(
        'Deseja realmente desativar este aluno? Ele não aparecerá mais nas listas ativas, mas seu histórico será preservado.',
        async () => {
            const db = getSupabase();
            if (!db) return;
            try {
                const { error } = await db.from('alunos').update({ status: 'INATIVO' }).eq('id', id);
                if (error) throw error;
                cacheInvalidate('alunos_list');
                fetchAlunos(true);
                fetchOverviewStats();
                fetchAtividadesRecentes();
            } catch (error) {
                console.error('Erro ao inativar:', error);
                mostrarToast('Erro ao desativar o aluno.', 'erro');
            }
        },
        { icone: 'user-minus', btnLabel: 'Desativar' }
    );
}

async function exportarAlunosInativos() {
    await exportarTodosAlunos();
}

async function exportarTodosAlunos() {
    const db = getSupabase();
    if (!db) return;

    try {
        mostrarToast('Gerando exportação...', 'info');

        const { data: alunos, error } = await db
            .from('alunos')
            .select('nome, cpf, telefone, endereco, plano, valor_plano, status, data_nascimento, created_at, pagamentos(status, vencimento)')
            .order('nome', { ascending: true });

        if (error) throw error;

        if (!alunos || alunos.length === 0) {
            alert('Não há alunos para exportar.');
            return;
        }

        // Helper: formata data brasileira
        const fmtData = (val) => {
            if (!val) return '';
            try { return new Date(val + (val.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR'); }
            catch { return val; }
        };

        // Helper: pega último pagamento (maior vencimento)
        const ultimoPag = (pagamentos) => {
            if (!pagamentos || pagamentos.length === 0) return { status: '', vencimento: '' };
            const sorted = [...pagamentos].sort((a, b) => (b.vencimento || '').localeCompare(a.vencimento || ''));
            return sorted[0];
        };

        // Helper: escapa campo CSV (evita quebra de linha e vírgulas)
        const esc = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

        const cabecalho = [
            'Nome', 'CPF', 'Telefone', 'Endereço', 'Plano',
            'Valor Plano (R$)', 'Status', 'Data de Nascimento',
            'Data de Cadastro', 'Status Último Pagamento', 'Vencimento Último Pagamento'
        ].map(esc).join(',') + '\n';

        const corpo = alunos.map(a => {
            const pag = ultimoPag(a.pagamentos);
            return [
                a.nome,
                a.cpf,
                a.telefone,
                a.endereco,
                a.plano,
                a.valor_plano != null ? String(a.valor_plano).replace('.', ',') : '',
                a.status,
                fmtData(a.data_nascimento),
                fmtData(a.created_at),
                pag.status,
                fmtData(pag.vencimento)
            ].map(esc).join(',');
        }).join('\n');

        // BOM para o Excel reconhecer UTF-8 corretamente
        const BOM = '\uFEFF';
        const csvBlob = new Blob([BOM + cabecalho + corpo], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(csvBlob);
        const link = document.createElement('a');
        const dataHoje = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        link.setAttribute('href', url);
        link.setAttribute('download', `alunos_studio_focus_${dataHoje}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        mostrarToast(`${alunos.length} alunos exportados com sucesso!`);

    } catch (error) {
        console.error('Erro ao exportar:', error);
        alert('Erro ao gerar arquivo de exportação.');
    }
}

async function gerarPagamentosIniciais(alunoId, alunoNome, plano, valorPlano, diaVencimento) {
    if (!valorPlano || parseFloat(valorPlano) <= 0) return;
    const db = getSupabase();
    if (!db) return;

    const hoje = new Date();
    const diaVenc = Math.min(parseInt(diaVencimento) || 10, 28);
    const pagamentos = [];

    for (let i = 0; i <= 1; i++) {
        const ano = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1).getFullYear();
        const mes  = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1).getMonth();
        const dataVenc = new Date(ano, mes, diaVenc);
        const mesRef = ano + '-' + String(mes + 1).padStart(2, '0');
        const vencimento = dataVenc.toISOString().split('T')[0];

        pagamentos.push({
            aluno_id: alunoId,
            vencimento,
            valor: parseFloat(valorPlano),
            mes_referencia: mesRef,
            status: 'PENDENTE',
            observacao: 'Gerado automaticamente no cadastro'
        });
    }

    try {
        // ignoreDuplicates: não sobrescreve se já existir registro para aluno+mês
        const { error } = await db
            .from('pagamentos')
            .upsert(pagamentos, { onConflict: 'aluno_id,mes_referencia', ignoreDuplicates: true });
        if (error) throw error;
        cacheInvalidate('pagamentos_list');
        mostrarToast('Pagamentos automáticos gerados!');
    } catch (e) {
        console.warn('Não foi possível gerar pagamentos automáticos:', e);
    }
}

function setupFormAluno() {
    const form = document.getElementById('form-aluno');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSalvar = document.getElementById('btn-salvar-aluno');
        const originalText = btnSalvar.innerHTML;
        btnSalvar.innerHTML = 'Salvando...';
        btnSalvar.disabled = true;

        const id = document.getElementById('aluno-id').value;
        const valorPlano = document.getElementById('aluno-valor-plano')?.value || '';
        const diaVencimento = document.getElementById('aluno-dia-vencimento')?.value || '10';
        const plano = document.getElementById('aluno-plano').value;
        const nome = document.getElementById('aluno-nome').value;

        const nascimentoVal = document.getElementById('aluno-nascimento').value;
        const dados = {
            nome,
            cpf: document.getElementById('aluno-cpf').value,
            telefone: document.getElementById('aluno-telefone').value,
            endereco: document.getElementById('aluno-endereco').value,
            valor_plano: valorPlano ? parseFloat(valorPlano) : null,
            plano,
            status: document.getElementById('aluno-status').value,
            data_nascimento: nascimentoVal || null,
        };
        // O valor_plano agora é gravado direto na tabela alunos

        const db = getSupabase();
        if (!db) {
            alert('Supabase não inicializado. Verifique sua conexão com a internet ou adblockers.');
            btnSalvar.innerHTML = originalText;
            btnSalvar.disabled = false;
            return;
        }

        try {
            if (id) {
                const { error } = await db.from('alunos').update(dados).eq('id', id);
                if (error) throw error;
            } else {
                const { data: novoAluno, error } = await db.from('alunos').insert([dados]).select('id').single();
                if (error) throw error;

                // Gera pagamentos automáticos para novo aluno
                if (novoAluno && valorPlano) {
                    await gerarPagamentosIniciais(novoAluno.id, nome, plano, valorPlano, diaVencimento);
                }
            }

            cacheInvalidate('alunos_list');
            fecharModalAluno();
            fetchAlunos(true);
            fetchOverviewStats();
            fetchAtividadesRecentes();
            mostrarToast(id ? 'Aluno atualizado!' : 'Aluno cadastrado com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            // Tenta salvar sem os campos opcionais se houver erro de coluna
            if (!id && (error.message || '').includes('column')) {
                const dadosSemOpcional = { nome: dados.nome, cpf: dados.cpf, telefone: dados.telefone, endereco: dados.endereco, plano: dados.plano, status: dados.status };
                try {
                    const { data: novoAluno2, error: e2 } = await db.from('alunos').insert([dadosSemOpcional]).select('id').single();
                    if (!e2 && novoAluno2 && valorPlano) {
                        await gerarPagamentosIniciais(novoAluno2.id, nome, plano, valorPlano, diaVencimento);
                    }
                    cacheInvalidate('alunos_list');
                    fecharModalAluno();
                    fetchAlunos(true);
                    fetchOverviewStats();
                    mostrarToast('Aluno cadastrado!');
                } catch (e3) {
                    alert('Erro ao salvar os dados do aluno. Verifique o console.');
                }
            } else {
                alert('Erro ao salvar os dados do aluno. Verifique o console.');
            }
        } finally {
            btnSalvar.innerHTML = originalText;
            btnSalvar.disabled = false;
        }
    });
}

// --- Pagamentos CRUD ---

let filtroStatusAtual = null;

async function fetchPagamentos(statusFilter = null) {
    const tbody = document.getElementById('lista-pagamentos-tbody');
    const db = getSupabase();
    if (!tbody || !db) return;

    if (statusFilter !== null) filtroStatusAtual = statusFilter;

    const btnLimpar = document.getElementById('btn-limpar-filtros-pag');
    if (btnLimpar) {
        filtroStatusAtual ? btnLimpar.classList.remove('hidden') : btnLimpar.classList.add('hidden');
    }

    _mostrarSkeletonTabela(tbody, 6);

    try {
        const filtroMes = document.getElementById('filtro-mes-pagamento');
        const mesAtivo = filtroMes ? filtroMes.value : '';

        let query = db
            .from('pagamentos')
            .select('id, aluno_id, vencimento, valor, status, mes_referencia, observacao, created_at, alunos(nome, plano, telefone)')
            .order('vencimento', { ascending: true });

        if (mesAtivo) {
            query = query.eq('mes_referencia', mesAtivo);
        }

        const { data: todosPagamentos, error } = await query;
        if (error) throw error;

        // Busca inadimplentes de meses anteriores (VENCIDO ou PENDENTE vencido)
        let inadimplentesPrev = [];
        if (mesAtivo) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const { data: prevData } = await db
                .from('pagamentos')
                .select('id, aluno_id, vencimento, valor, status, mes_referencia, observacao, created_at, alunos(nome, plano, telefone)')
                .neq('mes_referencia', mesAtivo)
                .neq('status', 'PAGO')
                .lt('vencimento', hoje.toISOString().split('T')[0])
                .order('vencimento', { ascending: true });

            inadimplentesPrev = (prevData || []);
        }

        // Atualiza cards de resumo
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        let pagos = 0, pendentes = 0, vencidos = 0;

        (todosPagamentos || []).forEach(p => {
            if (p.status === 'PAGO') pagos++;
            else if (p.status === 'VENCIDO' || (p.status === 'PENDENTE' && new Date(p.vencimento + 'T00:00:00') < hoje)) vencidos++;
            else pendentes++;
        });

        const elPagos = document.getElementById('pagamentos-pagos');
        const elPendentes = document.getElementById('pagamentos-pendentes');
        const elVencidos = document.getElementById('pagamentos-vencidos');
        if (elPagos) elPagos.textContent = pagos;
        if (elPendentes) elPendentes.textContent = pendentes;
        if (elVencidos) elVencidos.textContent = vencidos + inadimplentesPrev.length;

        // Aplica filtro de status (client-side)
        const pagamentos = filtroStatusAtual
            ? (todosPagamentos || []).filter(p => {
                const sv = (p.status === 'PENDENTE' && new Date(p.vencimento + 'T00:00:00') < hoje) ? 'VENCIDO' : p.status;
                return sv === filtroStatusAtual;
            })
            : (todosPagamentos || []);

        tbody.innerHTML = '';

        // Inadimplentes de meses anteriores aparecem no topo com destaque
        if (inadimplentesPrev.length > 0 && !filtroStatusAtual) {
            const dividerTr = document.createElement('tr');
            dividerTr.innerHTML = `<td colspan="6" class="py-2 px-2 text-xs font-bold text-red-400 bg-red-500/5 uppercase tracking-widest">
                ⚠ Inadimplentes de meses anteriores
            </td>`;
            tbody.appendChild(dividerTr);

            inadimplentesPrev.forEach(pag => _renderizarLinhaPagamento(pag, tbody, hoje, true));

            const divEnd = document.createElement('tr');
            divEnd.innerHTML = `<td colspan="6" class="py-2"></td>`;
            tbody.appendChild(divEnd);
        }

        if (!pagamentos || pagamentos.length === 0) {
            const emptyTr = document.createElement('tr');
            emptyTr.innerHTML = '<td colspan="6" class="py-8 text-center text-mt">Nenhum pagamento encontrado para este mês.</td>';
            tbody.appendChild(emptyTr);
        } else {
            pagamentos.forEach(pag => _renderizarLinhaPagamento(pag, tbody, hoje, false));
        }

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error('Erro ao buscar pagamentos:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-red-400">Erro ao carregar pagamentos. Verifique o console.</td></tr>';
    }
}

function _renderizarLinhaPagamento(pag, tbody, hoje, isInadimplentePrev) {
    const nomeAluno = pag.alunos ? pag.alunos.nome : 'Aluno removido';
    const planoAluno = pag.alunos ? pag.alunos.plano : '-';
    const vencimento = new Date(pag.vencimento + 'T00:00:00');
    const vencimentoStr = vencimento.toLocaleDateString('pt-BR');

    let statusAtual = pag.status;
    if (statusAtual === 'PENDENTE' && vencimento < hoje) statusAtual = 'VENCIDO';

    const statusColor = statusAtual === 'PAGO' ? 'green' : (statusAtual === 'PENDENTE' ? 'yellow' : 'red');
    const statusIcon  = statusAtual === 'PAGO' ? '✓' : (statusAtual === 'PENDENTE' ? '⏳' : '⚠');
    const valorStr    = parseFloat(pag.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const diasParaVencimento = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
    const precisaCobrar = (statusAtual !== 'PAGO') && (diasParaVencimento <= 2);

    const mesRefLabel = pag.mes_referencia
        ? ' <span class="ml-1 text-[9px] font-bold bg-s2 px-1.5 py-0.5 rounded text-mt">' + pag.mes_referencia + '</span>'
        : '';

    const tr = document.createElement('tr');
    tr.className = 'border-b border-bd/50' + (isInadimplentePrev ? ' tr-inadimplente-anterior' : '');
    tr.innerHTML = `
        <td class="py-4">
            <span class="font-medium">${nomeAluno}</span>${isInadimplentePrev ? mesRefLabel : ''}
        </td>
        <td class="py-4 text-mt">${planoAluno}</td>
        <td class="py-4">${vencimentoStr}</td>
        <td class="py-4 font-medium">${valorStr}</td>
        <td class="py-4">
            <span class="bg-${statusColor}-500/10 text-${statusColor}-500 px-2 py-1 rounded text-[10px] font-bold">
                ${statusIcon} ${statusAtual}
            </span>
        </td>
        <td class="py-4 text-right">
            ${precisaCobrar ? `<button onclick='enviarCobrancaWhatsApp(${JSON.stringify(pag).replace(/'/g, "&apos;")})' class="p-2 text-red-400 hover:scale-110 transition-transform" title="Enviar Cobrança WhatsApp"><i data-lucide="message-circle" class="w-4 h-4"></i></button>` : ''}
            ${statusAtual !== 'PAGO' ? `<button onclick="abrirModalConfirmarPagamento('${pag.id}', '${(nomeAluno).replace(/'/g, "\\'")}' )" class="p-2 text-mt hover:text-green-500 transition-colors" title="Confirmar Pagamento"><i data-lucide="check" class="w-4 h-4"></i></button>` : ''}
            <button onclick='editarPagamento(${JSON.stringify(pag).replace(/'/g, "&apos;")})' class="p-2 text-mt hover:text-pu transition-colors" title="Editar"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
            <button onclick="excluirPagamento('${pag.id}')" class="p-2 text-mt hover:text-red-500 transition-colors" title="Excluir"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </td>
    `;
    tbody.appendChild(tr);
}

// --- Confirmação de Pagamento ---

function abrirModalConfirmarPagamento(id, nomeAluno) {
    document.getElementById('confirmar-pag-id').value = id;
    const nomeEl = document.getElementById('confirmar-pag-aluno-nome');
    if (nomeEl) nomeEl.textContent = nomeAluno || '';

    // Pré-preencher com data de hoje
    const hoje = new Date().toISOString().split('T')[0];
    document.getElementById('confirmar-pag-data').value = hoje;
    document.getElementById('confirmar-pag-forma').value = '';
    document.getElementById('confirmar-pag-obs').value = '';

    const modal = document.getElementById('modal-confirmar-pagamento');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (window.lucide) window.lucide.createIcons();
    }
}

function fecharModalConfirmarPagamento() {
    const modal = document.getElementById('modal-confirmar-pagamento');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function salvarConfirmacaoPagamento() {
    const id = document.getElementById('confirmar-pag-id').value;
    const dataPagamento = document.getElementById('confirmar-pag-data').value;
    const formaPagamento = document.getElementById('confirmar-pag-forma').value;
    const obs = document.getElementById('confirmar-pag-obs').value;

    if (!dataPagamento) { mostrarToast('Informe a data do pagamento.', 'erro'); return; }
    if (!formaPagamento) { mostrarToast('Selecione a forma de pagamento.', 'erro'); return; }

    const db = getSupabase();
    if (!db) return;

    const obsCompleta = [
        `Pago em: ${new Date(dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}`,
        `Via: ${formaPagamento}`,
        obs ? `Obs: ${obs}` : null
    ].filter(Boolean).join(' | ');

    try {
        const { error } = await db
            .from('pagamentos')
            .update({ status: 'PAGO', observacao: obsCompleta })
            .eq('id', id);
        if (error) throw error;

        fecharModalConfirmarPagamento();
        cacheInvalidate('pagamentos_list');
        fetchPagamentos();
        fetchOverviewStats();
        fetchAtividadesRecentes();
        mostrarToast('Pagamento confirmado!');
    } catch (error) {
        console.error('Erro ao confirmar pagamento:', error);
        mostrarToast('Erro ao confirmar pagamento.', 'erro');
    }
}

// ==========================================
// COMBOBOX PESQUISÁVEL (Searchable Select)
// ==========================================

const _ssData = {}; // dados por prefixo

function ssInit(prefix, alunos) {
    _ssData[prefix] = alunos;
    ssRender(prefix, alunos);
}

function ssRender(prefix, lista) {
    const dropdown = document.getElementById(prefix + '-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = '';

    if (!lista || lista.length === 0) {
        dropdown.innerHTML = '<div class="px-4 py-3 text-sm text-mt text-center">Nenhum aluno encontrado</div>';
        return;
    }

    const MAX = 150;
    lista.slice(0, MAX).forEach(a => {
        const div = document.createElement('div');
        div.className = 'px-4 py-2.5 text-sm text-tx hover:bg-s2 cursor-pointer border-b border-bd/30 last:border-0 transition-colors';
        div.textContent = a.nome;
        div.addEventListener('mousedown', e => {
            e.preventDefault();
            ssSelect(prefix, a.id, a.nome);
        });
        dropdown.appendChild(div);
    });

    if (lista.length > MAX) {
        const info = document.createElement('div');
        info.className = 'px-4 py-2 text-xs text-mt text-center sticky bottom-0 bg-s1 border-t border-bd';
        info.textContent = `Mostrando ${MAX} de ${lista.length} - continue digitando para refinar`;
        dropdown.appendChild(info);
    }
}

function ssInput(prefix, valor) {
    const todos = _ssData[prefix] || [];
    const v = (valor || '').toLowerCase().trim();
    const filtrado = v ? todos.filter(a => a.nome.toLowerCase().includes(v)) : todos;
    ssRender(prefix, filtrado);
    ssOpen(prefix);
    // Limpa seleção anterior ao digitar
    const hidden = document.getElementById(prefix + '-id');
    if (hidden) hidden.value = '';
}

function ssOpen(prefix) {
    const d = document.getElementById(prefix + '-dropdown');
    if (d) {
        d.classList.remove('hidden');
    }
}

function ssClose(prefix) {
    const d = document.getElementById(prefix + '-dropdown');
    if (d) d.classList.add('hidden');
}

function ssSelect(prefix, id, nome) {
    const hidden = document.getElementById(prefix + '-id');
    const search = document.getElementById(prefix + '-search');
    if (hidden) hidden.value = id;
    if (search) search.value = nome;
    ssClose(prefix);
}

function ssClear(prefix) {
    const hidden = document.getElementById(prefix + '-id');
    const search = document.getElementById(prefix + '-search');
    if (hidden) hidden.value = '';
    if (search) search.value = '';
    ssClose(prefix);
}

// Fecha ao clicar fora de qualquer combobox
document.addEventListener('click', e => {
    ['pagamento-aluno', 'treino-aluno', 'pdv-aluno', 'ag-aluno'].forEach(prefix => {
        const wrapper = document.getElementById(prefix + '-wrapper');
        if (wrapper && !wrapper.contains(e.target)) ssClose(prefix);
    });
});

async function carregarAlunosNoSelect(prefix = 'pagamento-aluno') {
    const db = getSupabase();
    if (!db) return;

    try {
        let alunos = cacheGet('alunos_ativos_select');
        if (!alunos) {
            const { data, error } = await db
                .from('alunos')
                .select('id, nome')
                .eq('status', 'ATIVO')
                .order('nome', { ascending: true });
            if (error) throw error;
            alunos = data || [];
            cacheSet('alunos_ativos_select', alunos, 60000);
        }
        ssInit(prefix, alunos);
    } catch (error) {
        console.error('Erro ao carregar alunos para select:', error);
    }
}

function abrirModalPagamento() {
    document.getElementById('form-pagamento').reset();
    document.getElementById('pagamento-id').value = '';
    document.getElementById('modal-titulo-pagamento').innerText = 'Registrar Pagamento';

    const hoje = new Date();
    const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    document.getElementById('pagamento-referencia').value = mesAtual;
    document.getElementById('pagamento-vencimento').value = mesAtual + '-10';

    ssClear('pagamento-aluno');
    carregarAlunosNoSelect('pagamento-aluno');
    document.getElementById('modal-pagamento').classList.remove('hidden');
    document.getElementById('modal-pagamento').classList.add('flex');
}

function fecharModalPagamento() {
    document.getElementById('modal-pagamento').classList.add('hidden');
    document.getElementById('modal-pagamento').classList.remove('flex');
    ssClear('pagamento-aluno');
}

function editarPagamento(pag) {
    document.getElementById('pagamento-id').value = pag.id;
    document.getElementById('pagamento-vencimento').value = pag.vencimento;
    document.getElementById('pagamento-valor').value = pag.valor;
    document.getElementById('pagamento-referencia').value = pag.mes_referencia;
    document.getElementById('pagamento-status').value = pag.status;
    document.getElementById('pagamento-obs').value = pag.observacao || '';

    document.getElementById('modal-titulo-pagamento').innerText = 'Editar Pagamento';

    carregarAlunosNoSelect('pagamento-aluno').then(() => {
        // Seleciona o aluno correto no combobox
        const nomeAluno = pag.alunos ? pag.alunos.nome : '';
        ssSelect('pagamento-aluno', pag.aluno_id, nomeAluno);
    });

    document.getElementById('modal-pagamento').classList.remove('hidden');
    document.getElementById('modal-pagamento').classList.add('flex');
}

async function excluirPagamento(id) {
    confirmarAcao('Tem certeza que deseja excluir este registro de pagamento?', async () => {
        const db = getSupabase();
        if (!db) return;
        try {
            const { error } = await db.from('pagamentos').delete().eq('id', id);
            if (error) throw error;
            cacheInvalidate('pagamentos_list');
            fetchPagamentos();
            fetchOverviewStats();
            fetchAtividadesRecentes();
        } catch (error) {
            console.error('Erro ao excluir pagamento:', error);
            mostrarToast('Erro ao excluir o pagamento.', 'erro');
        }
    });
}

function setupFormPagamento() {
    const form = document.getElementById('form-pagamento');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSalvar = document.getElementById('btn-salvar-pagamento');
        const originalText = btnSalvar.innerText;
        btnSalvar.innerText = 'Salvando...';
        btnSalvar.disabled = true;

        const id = document.getElementById('pagamento-id').value;
        const dados = {
            aluno_id: document.getElementById('pagamento-aluno-id').value,
            vencimento: document.getElementById('pagamento-vencimento').value,
            valor: parseFloat(document.getElementById('pagamento-valor').value),
            mes_referencia: document.getElementById('pagamento-referencia').value,
            status: document.getElementById('pagamento-status').value,
            observacao: document.getElementById('pagamento-obs').value || null
        };

        const db = getSupabase();
        if (!db) {
            alert('Supabase não inicializado.');
            btnSalvar.innerText = originalText;
            btnSalvar.disabled = false;
            return;
        }

        try {
            if (id) {
                const { error } = await db
                    .from('pagamentos')
                    .update(dados)
                    .eq('id', id);
                if (error) throw error;
            } else {
                // Verifica duplicata antes de inserir
                const { data: existente } = await db
                    .from('pagamentos')
                    .select('id')
                    .eq('aluno_id', dados.aluno_id)
                    .eq('mes_referencia', dados.mes_referencia)
                    .maybeSingle();

                if (existente) {
                    mostrarToast('Já existe um pagamento para este aluno neste mês.', 'erro');
                    btnSalvar.innerText = originalText;
                    btnSalvar.disabled = false;
                    return;
                }

                const { error } = await db
                    .from('pagamentos')
                    .insert([dados]);
                if (error) throw error;
            }

            fecharModalPagamento();
            fetchPagamentos();
            fetchOverviewStats();
            fetchAtividadesRecentes();
        } catch (error) {
            console.error('Erro ao salvar pagamento:', error);
            // Constraint do banco violada (fallback caso a verificação falhe por race condition)
            if (error.code === '23505') {
                mostrarToast('Já existe um pagamento para este aluno neste mês.', 'erro');
            } else {
                mostrarToast('Erro ao salvar pagamento.', 'erro');
            }
        } finally {
            btnSalvar.innerText = originalText;
            btnSalvar.disabled = false;
        }
    });
}

function setupFiltroPagamentos() {
    const filtro = document.getElementById('filtro-mes-pagamento');
    if (!filtro) return;

    // Padrão: mês atual
    const hoje = new Date();
    filtro.value = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');

    filtro.addEventListener('change', () => {
        filtroStatusAtual = null;
        cacheInvalidate('pagamentos_list');
        fetchPagamentos();
        fetchOverviewStats();
    });
}

function filtrarPorStatusPagamento(status) {
    fetchPagamentos(status);
}

function limparFiltrosPagamento() {
    filtroStatusAtual = null;
    fetchPagamentos();
}

// --- Despesas CRUD ---
let filtroStatusDespesaAtual = null;

async function fetchDespesas(statusFilter = null) {
    const tbody = document.getElementById('lista-despesas-tbody');
    const db = getSupabase();
    if (!tbody || !db) return;

    if (statusFilter !== null) filtroStatusDespesaAtual = statusFilter;

    _mostrarSkeletonTabela(tbody, 5);

    try {
        const filtroMes = document.getElementById('filtro-mes-despesa');
        let query = db
            .from('despesas')
            .select('*')
            .order('vencimento', { ascending: true });

        if (filtroMes && filtroMes.value) {
            const ano = filtroMes.value.split('-')[0];
            const mes = filtroMes.value.split('-')[1];
            query = query.gte('vencimento', `${ano}-${mes}-01`)
                         .lte('vencimento', fimDoMes(`${ano}-${mes}`));
        }

        if (filtroStatusDespesaAtual) {
            query = query.eq('status', filtroStatusDespesaAtual);
            document.getElementById('btn-limpar-filtros-despesa').classList.remove('hidden');
        } else {
            document.getElementById('btn-limpar-filtros-despesa').classList.add('hidden');
        }

        const { data: despesas, error } = await query;
        if (error) throw error;

        let pagas = 0, pendentes = 0;
        
        if (!despesas || despesas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-mt">Nenhuma despesa registrada.</td></tr>';
            setStat('despesas-pagas', 'R$ 0,00');
            setStat('despesas-pendentes', 'R$ 0,00');
            return;
        }

        tbody.innerHTML = '';
        despesas.forEach(d => {
            if (d.status === 'PAGO') pagas += parseFloat(d.valor);
            else pendentes += parseFloat(d.valor);

            const vencimento = new Date(d.vencimento + 'T00:00:00');
            const vencimentoStr = vencimento.toLocaleDateString('pt-BR');
            const statusColor = d.status === 'PAGO' ? 'green' : 'yellow';
            const statusIcon = d.status === 'PAGO' ? '✓' : '⏳';
            const valorStr = parseFloat(d.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const tr = document.createElement('tr');
            tr.className = 'border-b border-bd/50';
            tr.innerHTML = `
                <td class="py-4 font-medium">${d.descricao}</td>
                <td class="py-4">${vencimentoStr}</td>
                <td class="py-4 font-bold text-red-400">${valorStr}</td>
                <td class="py-4">
                    <span class="bg-${statusColor}-500/10 text-${statusColor}-500 px-2 py-1 rounded text-[10px] font-bold">
                        ${statusIcon} ${d.status}
                    </span>
                </td>
                <td class="py-4 text-right">
                    ${d.status !== 'PAGO' ? `<button onclick="marcarDespesaComoPaga('${d.id}')" class="p-2 text-mt hover:text-green-500 transition-colors" title="Marcar como Paga"><i data-lucide="check" class="w-4 h-4"></i></button>` : ''}
                    <button onclick='editarDespesa(${JSON.stringify(d).replace(/'/g, "&apos;")})' class="p-2 text-mt hover:text-pu transition-colors" title="Editar"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button onclick="excluirDespesa('${d.id}')" class="p-2 text-mt hover:text-red-500 transition-colors" title="Excluir"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        setStat('despesas-pagas', pagas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        setStat('despesas-pendentes', pendentes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error('Erro ao buscar despesas:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-red-400">Erro ao carregar. Tabela "despesas" existe no Supabase?</td></tr>';
    }
}

function abrirModalDespesa() {
    document.getElementById('form-despesa').reset();
    document.getElementById('despesa-id').value = '';
    document.getElementById('modal-titulo-despesa').innerText = 'Nova Despesa';
    
    const hoje = new Date();
    document.getElementById('despesa-vencimento').value = hoje.toISOString().split('T')[0];

    document.getElementById('modal-despesa').classList.remove('hidden');
    document.getElementById('modal-despesa').classList.add('flex');
}

function fecharModalDespesa() {
    document.getElementById('modal-despesa').classList.add('hidden');
    document.getElementById('modal-despesa').classList.remove('flex');
}

function editarDespesa(d) {
    document.getElementById('despesa-id').value = d.id;
    document.getElementById('despesa-descricao').value = d.descricao;
    document.getElementById('despesa-vencimento').value = d.vencimento;
    document.getElementById('despesa-valor').value = d.valor;
    document.getElementById('despesa-status').value = d.status;

    document.getElementById('modal-titulo-despesa').innerText = 'Editar Despesa';
    document.getElementById('modal-despesa').classList.remove('hidden');
    document.getElementById('modal-despesa').classList.add('flex');
}

async function marcarDespesaComoPaga(id) {
    const db = getSupabase();
    if (!db) return;
    try {
        const { error } = await db.from('despesas').update({ status: 'PAGO' }).eq('id', id);
        if (error) throw error;
        fetchDespesas();
        fetchOverviewStats();
    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao marcar despesa como paga.');
    }
}

async function excluirDespesa(id) {
    confirmarAcao('Deseja realmente excluir esta despesa?', async () => {
        const db = getSupabase();
        if (!db) return;
        try {
            const { error } = await db.from('despesas').delete().eq('id', id);
            if (error) throw error;
            cacheInvalidate('despesas_list');
            fetchDespesas();
            fetchOverviewStats();
        } catch (error) {
            console.error('Erro:', error);
            mostrarToast('Erro ao excluir a despesa.', 'erro');
        }
    });
}

function setupFormDespesa() {
    const form = document.getElementById('form-despesa');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSalvar = document.getElementById('btn-salvar-despesa');
        const originalText = btnSalvar.innerText;
        btnSalvar.innerText = 'Salvando...';
        btnSalvar.disabled = true;

        const id = document.getElementById('despesa-id').value;
        const dados = {
            descricao: document.getElementById('despesa-descricao').value,
            vencimento: document.getElementById('despesa-vencimento').value,
            valor: parseFloat(document.getElementById('despesa-valor').value),
            status: document.getElementById('despesa-status').value
        };

        const db = getSupabase();
        if (!db) return;

        try {
            if (id) {
                const { error } = await db.from('despesas').update(dados).eq('id', id);
                if (error) throw error;
            } else {
                const { error } = await db.from('despesas').insert([dados]);
                if (error) throw error;
            }
            fecharModalDespesa();
            fetchDespesas();
            fetchOverviewStats();
        } catch (error) {
            console.error('Erro ao salvar despesa:', error);
            alert('Erro ao salvar despesa. Certifique-se de que a tabela existe no Supabase.');
        } finally {
            btnSalvar.innerText = originalText;
            btnSalvar.disabled = false;
        }
    });
}

function setupFiltroDespesas() {
    const filtro = document.getElementById('filtro-mes-despesa');
    if (!filtro) return;
    const hoje = new Date();
    filtro.value = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    filtro.addEventListener('change', () => fetchDespesas());
}

function filtrarPorStatusDespesa(status) {
    fetchDespesas(status);
}

function limparFiltrosDespesa() {
    filtroStatusDespesaAtual = null;
    fetchDespesas();
}

// --- Visão Geral & Atividades ---

let _chartJsLoaded = false;
function carregarChartJs() {
    if (_chartJsLoaded || typeof Chart !== 'undefined') { _chartJsLoaded = true; return Promise.resolve(); }
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        s.onload = () => { _chartJsLoaded = true; resolve(); };
        s.onerror = reject;
        document.head.appendChild(s);
    });
}

function _getMesRefVisaoGeral() {
    const hoje = new Date();
    const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    const input = document.getElementById('filtro-mes-visao-geral');
    if (input) {
        if (!input.value) input.value = mesAtual;
        return input.value;
    }
    return mesAtual;
}

function resetarMesVisaoGeral() {
    const hoje = new Date();
    const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    const input = document.getElementById('filtro-mes-visao-geral');
    if (input) input.value = mesAtual;
    const btn = document.getElementById('btn-reset-mes-visao');
    if (btn) btn.classList.add('hidden');
    fetchOverviewStats();
}

async function fetchOverviewStats() {
    const db = getSupabase();
    if (!db) return;

    try {
        await carregarChartJs();

        // Resolve mês selecionado
        const mesRef = _getMesRefVisaoGeral();
        const [anoRef, mRef] = mesRef.split('-').map(Number);
        const hoje = new Date();
        const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');

        // Mostrar/ocultar botão de reset
        const btnReset = document.getElementById('btn-reset-mes-visao');
        if (btnReset) btnReset.classList.toggle('hidden', mesRef === mesAtual);

        // 1. Total de Alunos Ativos
        const { count: totalAtivos } = await db
            .from('alunos')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'ATIVO');

        if (document.getElementById('stat-total-alunos')) {
            setStat('stat-total-alunos', totalAtivos || 0);
            const sub = document.getElementById('stat-total-alunos-sub');
            if (sub) sub.textContent = `${totalAtivos || 0} alunos ativos cadastrados`;
        }

        const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const labelMes = document.getElementById('mes-atual-label');
        if (labelMes) labelMes.textContent = meses[mRef - 1] + " " + anoRef;

        // 1b. Novos alunos no mês
        const primeiroDiaMes = mesRef + '-01';
        const ultimoDiaMes = fimDoMes(mesRef);
        const { count: novosAlunos } = await db
            .from('alunos')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', primeiroDiaMes)
            .lte('created_at', ultimoDiaMes);
        const elNovos = document.getElementById('stat-novos-alunos');
        if (elNovos) setStat('stat-novos-alunos', novosAlunos || 0);

        // 1c. Inadimplentes
        const { data: pagInadimplentes } = await db
            .from('pagamentos')
            .select('valor')
            .eq('mes_referencia', mesRef)
            .eq('status', 'VENCIDO');
        const totalInadimplente = (pagInadimplentes || []).reduce((s, p) => s + parseFloat(p.valor || 0), 0);
        const elInadimpl = document.getElementById('stat-inadimplentes');
        if (elInadimpl) setStat('stat-inadimplentes', totalInadimplente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        const subInadimpl = document.getElementById('stat-inadimplentes-sub');
        if (subInadimpl) subInadimpl.textContent = `${(pagInadimplentes || []).length} pagamentos vencidos`;

        // 1d. Alunos sem treino
        const { data: treinosList } = await db.from('treinos').select('aluno_id');
        const comTreino = new Set((treinosList || []).map(t => t.aluno_id));
        const { data: alunosAtivos } = await db.from('alunos').select('id').eq('status', 'ATIVO');
        const semTreinoCount = (alunosAtivos || []).filter(a => !comTreino.has(a.id)).length;
        const elSemTreino = document.getElementById('stat-sem-treino');
        if (elSemTreino) setStat('stat-sem-treino', semTreinoCount);
        const subSemTreino = document.getElementById('stat-sem-treino-sub');
        if (subSemTreino) subSemTreino.textContent = semTreinoCount === 1 ? '1 aluno ativo' : `${semTreinoCount} alunos ativos`;

        // 1e. Renovações próximas (7 dias)
        const hojeRenov = new Date(); hojeRenov.setHours(0,0,0,0);
        const em7 = new Date(hojeRenov); em7.setDate(hojeRenov.getDate() + 7);
        const em7Str = em7.toISOString().split('T')[0];
        const { count: renovCount } = await db.from('pagamentos')
            .select('*', { count: 'exact', head: true })
            .neq('status', 'PAGO')
            .gte('vencimento', hojeRenov.toISOString().split('T')[0])
            .lte('vencimento', em7Str);
        const elRenov = document.getElementById('stat-renovacoes');
        if (elRenov) setStat('stat-renovacoes', renovCount || 0);
        const subRenov = document.getElementById('stat-renovacoes-sub');
        if (subRenov) subRenov.textContent = 'vencem em 7 dias';

        // 2. Receita do mês selecionado
        const { data: pagamentosMes } = await db
            .from('pagamentos')
            .select('valor')
            .eq('mes_referencia', mesRef)
            .eq('status', 'PAGO');

        const totalReceita = (pagamentosMes || []).reduce((acc, p) => acc + parseFloat(p.valor), 0);
        const elReceita = document.getElementById('stat-receita-mensal');
        if (elReceita) {
            setStat('stat-receita-mensal', totalReceita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
        }

        // 2b. Alertas inteligentes
        _renderizarAlertasInteligentes(pagamentosMes || [], pagInadimplentes || [], novosAlunos || 0);
        renderAniversariantes();

        // 3. Gráficos - janela de 6 meses terminando no mês selecionado
        const [{ data: todosAlunos }, { data: todasDespesas }, { data: todosPagamentos }] = await Promise.all([
            db.from('alunos').select('created_at').eq('status', 'ATIVO'),
            db.from('despesas').select('vencimento, valor, status').eq('status', 'PAGO'),
            db.from('pagamentos').select('mes_referencia, valor').eq('status', 'PAGO'),
        ]);
        renderGrowthChart(todosAlunos || [], mesRef);
        renderFinancialChart(todosPagamentos || [], todasDespesas || [], mesRef);

        // 4. Alertas - todos os pendentes do mês selecionado
        const { data: pagamentosPendentes } = await db
            .from('pagamentos')
            .select('*, alunos(nome, telefone)')
            .eq('mes_referencia', mesRef)
            .neq('status', 'PAGO');

        const containerAlertas = document.getElementById('container-alertas-cobranca');
        const listaAlertas = document.getElementById('lista-alertas-cobranca');
        const tituloAlertas = document.getElementById('titulo-alertas-cobranca');

        if (containerAlertas && listaAlertas) {
            const alertas = pagamentosPendentes || [];
            const hj = new Date(); hj.setHours(0, 0, 0, 0);

            if (alertas.length > 0) {
                containerAlertas.classList.remove('hidden');
                if (tituloAlertas) {
                    tituloAlertas.textContent = `Pendentes - ${meses[mRef - 1]} ${anoRef} (${alertas.length})`;
                }
                listaAlertas.innerHTML = '';
                alertas.forEach(p => {
                    const dv = new Date(p.vencimento + 'T00:00:00');
                    const dif = Math.ceil((dv - hj) / (1000 * 60 * 60 * 24));
                    let tag, cor;
                    if (dif < 0)       { tag = 'ATRASADO';         cor = 'red'; }
                    else if (dif === 0) { tag = 'VENCE HOJE';       cor = 'orange'; }
                    else               { tag = `VENCE EM ${dif}d`;  cor = 'pu'; }

                    const div = document.createElement('div');
                    div.className = 'bg-s2 border border-bd p-4 rounded-xl flex flex-col justify-between';
                    div.innerHTML = `
                        <div>
                            <div class="flex justify-between items-start mb-2">
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-${cor}-500/20 text-${cor}-500">${tag}</span>
                                <span class="text-tx font-bold text-sm">R$ ${p.valor}</span>
                            </div>
                            <h4 class="text-tx font-medium text-sm mb-1">${p.alunos ? p.alunos.nome : 'Cliente'}</h4>
                        </div>
                        <button onclick='enviarCobrancaWhatsApp(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="mt-3 w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all">
                            <i data-lucide="message-circle" class="w-4 h-4"></i>
                            NOTIFICAR WHATSAPP
                        </button>
                    `;
                    listaAlertas.appendChild(div);
                });
                if (window.lucide) window.lucide.createIcons();
            } else {
                containerAlertas.classList.add('hidden');
            }
        }

        fetchComparativoMensal();
        fetchAtividadesRecentes(mesRef);

    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
    }
}

let growthChart = null;
function renderGrowthChart(alunos, mesRef) {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;

    const mesesLabel = [];
    const dadosGrafico = [];
    const [anoBase, mBase] = (mesRef || _getMesRefVisaoGeral()).split('-').map(Number);

    for (let i = 5; i >= 0; i--) {
        const d = new Date(anoBase, mBase - 1 - i, 1);
        const mesAno = d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();
        mesesLabel.push(mesAno);

        // Conta quantos alunos ativos existiam até aquele mês
        const count = alunos.filter(a => {
            const dataMatricula = new Date(a.created_at);
            return dataMatricula <= new Date(d.getFullYear(), d.getMonth() + 1, 0);
        }).length;
        dadosGrafico.push(count);
    }

    if (growthChart) growthChart.destroy();

    growthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mesesLabel,
            datasets: [{
                label: 'Alunos Ativos',
                data: dadosGrafico,
                borderColor: '#0066ff',
                backgroundColor: 'rgba(0, 102, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0066ff',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#8899a6', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8899a6', font: { size: 10 } }
                }
            }
        }
    });
}

let financeChart = null;
function renderFinancialChart(pagamentos, despesas, mesRef) {
    const ctx = document.getElementById('expensesChart');
    if (!ctx) return;

    const mesesLabel = [];
    const dadosReceita = [];
    const dadosDespesas = [];
    const [anoBase, mBase] = (mesRef || _getMesRefVisaoGeral()).split('-').map(Number);

    for (let i = 5; i >= 0; i--) {
        const d = new Date(anoBase, mBase - 1 - i, 1);
        mesesLabel.push(d.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase());

        const mesRef = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        dadosReceita.push(
            pagamentos.filter(p => p.mes_referencia === mesRef)
                      .reduce((acc, p) => acc + parseFloat(p.valor), 0)
        );
        dadosDespesas.push(
            despesas.filter(dep => {
                const dt = new Date(dep.vencimento + 'T00:00:00');
                return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth();
            }).reduce((acc, dep) => acc + parseFloat(dep.valor), 0)
        );
    }

    if (financeChart) financeChart.destroy();

    financeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: mesesLabel,
            datasets: [
                {
                    label: 'Receita (R$)',
                    data: dadosReceita,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 4
                },
                {
                    label: 'Despesas (R$)',
                    data: dadosDespesas,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ef4444',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ' + ctx.parsed.y.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#8899a6',
                        font: { size: 10 },
                        callback: v => v >= 1000 ? 'R$' + (v / 1000).toFixed(1) + 'k' : 'R$' + v
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8899a6', font: { size: 10 } }
                }
            }
        }
    });
}

function enviarCobrancaWhatsApp(pag) {
    console.log('Dados do pagamento para cobrança:', pag);
    
    // Tenta pegar o aluno de várias formas possíveis (join ou objeto aninhado)
    const aluno = pag.alunos || pag.aluno || {};
    const nome = aluno.nome || 'Cliente';
    const telefone = aluno.telefone || '';
    
    if (!telefone) {
        console.error('Telefone não encontrado para o aluno:', aluno);
        alert('Erro: Este aluno não possui telefone cadastrado.');
        return;
    }

    const valor = parseFloat(pag.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const vencimentoRaw = pag.vencimento || '';
    const vencimentoFormatado = vencimentoRaw ? new Date(vencimentoRaw + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVenc = vencimentoRaw ? new Date(vencimentoRaw + 'T00:00:00') : new Date();
    
    let mensagem = "";
    if (dataVenc > hoje) {
        mensagem = `Olá, ${nome}. Passando para lembrar que sua mensalidade no Studio Focus no valor de ${valor} vence em breve (dia ${vencimentoFormatado}). Caso já tenha realizado o pagamento, desconsidere esta mensagem. Bons treinos.`;
    } else if (dataVenc.getTime() === hoje.getTime()) {
        mensagem = `Olá, ${nome}. Tudo bem? Hoje é o dia do vencimento da sua mensalidade no Studio Focus (${valor}). Caso precise da chave PIX ou suporte, estamos à disposição. Um abraço.`;
    } else {
        mensagem = `Olá, ${nome}. Notamos que sua mensalidade no Studio Focus no valor de ${valor} (vencida em ${vencimentoFormatado}) ainda não consta em nosso sistema. Poderia nos enviar o comprovante ou nos avisar se houver algum problema? Obrigado.`;
    }

    const telLimpo = telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${telLimpo}?text=${encodeURIComponent(mensagem)}`;
    
    console.log('Abrindo WhatsApp URL:', url);
    window.open(url, '_blank');
}

// --- WhatsApp em Massa ---

function abrirModalWhatsAppMassa() {
    document.getElementById('massa-mensagem').value = '';
    const listaContainer = document.getElementById('massa-lista-container');
    const lista = document.getElementById('massa-lista');
    if (listaContainer) listaContainer.classList.add('hidden');
    if (lista) lista.innerHTML = '';

    const modal = document.getElementById('modal-whatsapp-massa');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        if (window.lucide) window.lucide.createIcons();
    }
}

function fecharModalWhatsAppMassa() {
    const modal = document.getElementById('modal-whatsapp-massa');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function gerarLinksWhatsAppMassa() {
    const mensagemTemplate = document.getElementById('massa-mensagem').value.trim();
    if (!mensagemTemplate) {
        mostrarToast('Digite uma mensagem antes de gerar os links.', 'erro');
        return;
    }

    const db = getSupabase();
    if (!db) return;

    const btn = document.getElementById('btn-gerar-links-massa');
    if (btn) { btn.disabled = true; btn.textContent = 'Carregando...'; }

    try {
        const { data: alunos, error } = await db
            .from('alunos')
            .select('id, nome, telefone')
            .eq('status', 'ATIVO')
            .order('nome');

        if (error) throw error;

        const lista = document.getElementById('massa-lista');
        const listaContainer = document.getElementById('massa-lista-container');
        lista.innerHTML = '';

        const semTelefone = [];
        (alunos || []).forEach(aluno => {
            const mensagem = mensagemTemplate.replace(/{nome}/gi, aluno.nome);
            if (!aluno.telefone) {
                semTelefone.push(aluno.nome);
                const div = document.createElement('div');
                div.className = 'flex items-center gap-3 p-3 bg-s2 rounded-xl opacity-40';
                div.innerHTML = `<span class="text-xs text-red-400 font-bold flex-shrink-0">SEM TEL</span><span class="text-sm text-mt">${aluno.nome}</span>`;
                lista.appendChild(div);
                return;
            }

            const telLimpo = aluno.telefone.replace(/\D/g, '');
            const url = `https://wa.me/55${telLimpo}?text=${encodeURIComponent(mensagem)}`;

            const div = document.createElement('div');
            div.className = 'flex items-center gap-3 p-3 bg-s2 rounded-xl hover:bg-s3 transition-colors';
            div.innerHTML = `
                <div class="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-400">${aluno.nome.substring(0,2).toUpperCase()}</div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-tx truncate">${aluno.nome}</p>
                    <p class="text-xs text-mt">${aluno.telefone}</p>
                </div>
                <a href="${url}" target="_blank" rel="noopener" class="flex-shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                    Enviar
                </a>
            `;
            lista.appendChild(div);
        });

        if (semTelefone.length > 0) {
            const aviso = document.createElement('p');
            aviso.className = 'text-xs text-yellow-400 mt-2';
            aviso.textContent = `⚠ ${semTelefone.length} aluno(s) sem telefone cadastrado foram marcados como indisponíveis.`;
            lista.appendChild(aviso);
        }

        listaContainer.classList.remove('hidden');
        mostrarToast(`Links gerados para ${(alunos || []).filter(a => a.telefone).length} alunos!`);

    } catch (e) {
        console.error('Erro ao gerar links em massa:', e);
        mostrarToast('Erro ao carregar alunos ativos.', 'erro');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="send" class="w-4 h-4"></i> Gerar Links';
            if (window.lucide) window.lucide.createIcons({ nodes: [btn] });
        }
    }
}

// --- Comparativo Mensal ---

async function fetchComparativoMensal() {
    const db = getSupabase();
    if (!db) return;

    const mesAtual = _getMesRefVisaoGeral();
    const [anoAtual, mAtual] = mesAtual.split('-').map(Number);
    const prevDate = new Date(anoAtual, mAtual - 2, 1); // mês anterior ao selecionado
    const mesPrev = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');

    function setComparativo(idVal, idLabel, valorAtual, valorPrev, prefix = '') {
        const elVal = document.getElementById(idVal);
        const elLabel = document.getElementById(idLabel);
        if (!elVal || !elLabel) return;

        if (valorPrev === 0 && valorAtual === 0) {
            elVal.textContent = '-';
            elVal.className = 'text-2xl font-bebas tracking-wider comparativo-neutro';
            elLabel.textContent = 'Sem dados anteriores';
            return;
        }

        const diff = valorAtual - valorPrev;
        const pct  = valorPrev !== 0 ? ((diff / Math.abs(valorPrev)) * 100).toFixed(1) : null;
        const sinal = diff >= 0 ? '+' : '';

        if (pct !== null) {
            elVal.textContent = sinal + pct + '%';
        } else {
            elVal.textContent = diff >= 0 ? '+' + valorAtual : String(valorAtual);
        }

        elVal.className = 'text-2xl font-bebas tracking-wider ' + (diff > 0 ? 'comparativo-positivo' : diff < 0 ? 'comparativo-negativo' : 'comparativo-neutro');
        elLabel.textContent = `${prefix}${valorAtual} vs ${valorPrev} (mês anterior)`;
    }

    try {
        // Receita
        const [{ data: recAtual }, { data: recPrev }] = await Promise.all([
            db.from('pagamentos').select('valor').eq('mes_referencia', mesAtual).eq('status', 'PAGO'),
            db.from('pagamentos').select('valor').eq('mes_referencia', mesPrev).eq('status', 'PAGO'),
        ]);
        const recAtualTotal = (recAtual || []).reduce((s, p) => s + parseFloat(p.valor), 0);
        const recPrevTotal  = (recPrev  || []).reduce((s, p) => s + parseFloat(p.valor), 0);
        setComparativo('comp-receita', 'comp-receita-valor', recAtualTotal, recPrevTotal,
            'R$ ');

        // Formatar label de receita diferente (valor em BRL)
        const elLabel = document.getElementById('comp-receita-valor');
        if (elLabel) {
            const fmtAt = recAtualTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const fmtPv = recPrevTotal.toLocaleString('pt-BR',  { style: 'currency', currency: 'BRL' });
            elLabel.textContent = `${fmtAt} vs ${fmtPv} (mês ant.)`;
        }

        // Alunos ativos (snapshot aproximado pelo created_at)
        const [{ count: alunosAtual }, { count: alunosPrev }] = await Promise.all([
            db.from('alunos').select('*', { count: 'exact', head: true }).eq('status', 'ATIVO'),
            db.from('alunos').select('*', { count: 'exact', head: true }).eq('status', 'ATIVO')
                .lt('created_at', prevDate.toISOString()),
        ]);
        setComparativo('comp-alunos', 'comp-alunos-valor', alunosAtual || 0, alunosPrev || 0, '');

        // Despesas
        const [{ data: despAtual }, { data: despPrev }] = await Promise.all([
            db.from('despesas').select('valor').gte('vencimento', mesAtual + '-01').lte('vencimento', fimDoMes(mesAtual)).eq('status', 'PAGO'),
            db.from('despesas').select('valor').gte('vencimento', mesPrev + '-01').lte('vencimento', fimDoMes(mesPrev)).eq('status', 'PAGO'),
        ]);
        const despAtualTotal = (despAtual || []).reduce((s, d) => s + parseFloat(d.valor), 0);
        const despPrevTotal  = (despPrev  || []).reduce((s, d) => s + parseFloat(d.valor), 0);
        setComparativo('comp-despesas', 'comp-despesas-valor', despAtualTotal, despPrevTotal, 'R$ ');

        const elLabelDesp = document.getElementById('comp-despesas-valor');
        if (elLabelDesp) {
            const fmtAt = despAtualTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const fmtPv = despPrevTotal.toLocaleString('pt-BR',  { style: 'currency', currency: 'BRL' });
            elLabelDesp.textContent = `${fmtAt} vs ${fmtPv} (mês ant.)`;
        }

    } catch (e) {
        console.error('Erro no comparativo mensal:', e);
    }
}

async function fetchAtividadesRecentes(mesRef) {
    const tbody = document.getElementById('lista-atividades-tbody');
    const db = getSupabase();
    if (!tbody || !db) return;

    const mes = mesRef || _getMesRefVisaoGeral();
    const [ano, m] = mes.split('-').map(Number);
    const mesStr    = `${ano}-${String(m).padStart(2, '0')}`;
    const inicioMes = mesStr + '-01';
    const fimMes    = fimDoMes(mesStr);

    try {
        const [{ data: novosAlunos }, { data: novosPagos }] = await Promise.all([
            db.from('alunos')
                .select('nome, created_at')
                .gte('created_at', inicioMes)
                .lte('created_at', fimMes + 'T23:59:59')
                .order('created_at', { ascending: false })
                .limit(10),
            db.from('pagamentos')
                .select('valor, status, created_at, alunos(nome)')
                .eq('mes_referencia', mes)
                .eq('status', 'PAGO')
                .order('created_at', { ascending: false })
                .limit(10),
        ]);

        let atividades = [];
        
        (novosAlunos || []).forEach(a => {
            atividades.push({
                tipo: 'Novo Aluno',
                icon: 'user-plus',
                color: 'pu',
                desc: `<b>${a.nome}</b> realizou a matrícula.`,
                data: new Date(a.created_at)
            });
        });

        (novosPagos || []).forEach(p => {
            atividades.push({
                tipo: 'Pagamento',
                icon: 'check-circle',
                color: 'green',
                desc: `Recebido <b>${p.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b> de <b>${p.alunos.nome}</b>.`,
                data: new Date(p.created_at)
            });
        });

        // Ordenar por data
        atividades.sort((a, b) => b.data - a.data);

        if (atividades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-mt">Nenhuma atividade recente.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        atividades.slice(0, 5).forEach(act => {
            const dataStr = act.data.toLocaleDateString('pt-BR') + ' ' + act.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const tr = document.createElement('tr');
            tr.className = 'border-b border-bd/50';
            tr.innerHTML = `
                <td class="py-4">
                    <span class="flex items-center gap-2 text-${act.color}-500 font-bold text-[10px] uppercase">
                        <i data-lucide="${act.icon}" class="w-3 h-3"></i> ${act.tipo}
                    </span>
                </td>
                <td class="py-4 text-tx">${act.desc}</td>
                <td class="py-4 text-mt text-xs">${dataStr}</td>
            `;
            tbody.appendChild(tr);
        });

        if (window.lucide) window.lucide.createIcons();

    } catch (error) {
        console.error('Erro ao buscar atividades:', error);
        tbody.innerHTML = '<tr><td colspan="3" class="py-8 text-center text-red-400">Erro ao carregar atividades.</td></tr>';
    }
}

// --- Treinos CRUD & Lógica ---

const EXERCICIOS_SUGERIDOS = [
    "Supino Reto com Barra", "Supino Inclinado com Halteres", "Crucifixo Reto", "Pek Deck / Voador",
    "Puxada na Polia (Costas)", "Remada Curvada com Barra", "Remada Unilateral com Haltere", "Puxada Triângulo",
    "Elevação Lateral", "Desenvolvimento com Halteres", "Elevação Frontal", "Crucifixo Invertido",
    "Agachamento Livre com Barra", "Leg Press 45", "Cadeira Extensora", "Mesa Flexora", "Cadeira Flexora", "Elevação Pélvica",
    "Rosca Direta com Barra", "Rosca Alternada com Halteres", "Rosca Martelo", "Rosca Concentrada",
    "Tríceps Pulley", "Tríceps Testa", "Tríceps Corda", "Mergulho nas Paralelas",
    "Abdominal Supra", "Abdominal Infra", "Prancha Isométrica", "Abdominal Oblíquo"
];

let treinoModalState = {
    exerciciosPorDia: {
        seg: [],
        ter: [],
        qua: [],
        qui: [],
        sex: [],
        sab: []
    },
    diaAtivo: 'seg'
};

var LISTA_TREINOS_CACHE = [];

async function fetchTreinos() {
    const tbody = document.getElementById('lista-treinos-tbody');
    const db = getSupabase();
    if (!tbody || !db) return;

    try {
        const { data: treinos, error } = await db
            .from('treinos')
            .select('id, usuario, tem_senha, updated_at, aluno_id, alunos(nome, telefone)')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        LISTA_TREINOS_CACHE = treinos || [];

        if (treinos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-mt">Nenhum treino personalizado cadastrado.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        treinos.forEach(tr => {
            const dataFormatada = new Date(tr.updated_at).toLocaleDateString('pt-BR') + ' ' + new Date(tr.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const alunoNome = tr.alunos ? tr.alunos.nome : 'Aluno Excluído';

            const credStatus = tr.tem_senha
                ? `<span class="text-[10px] font-bold bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full">Configurado</span>`
                : `<span class="text-[10px] font-bold bg-s3 text-mt px-2 py-0.5 rounded-full">Sem acesso</span>`;

            const row = document.createElement('tr');
            row.className = 'border-b border-bd/50';
            row.innerHTML = `
                <td class="py-4 font-medium text-tx">${alunoNome}</td>
                <td class="py-4 text-mt font-mono text-xs">${tr.usuario || '—'}</td>
                <td class="py-4">${credStatus}</td>
                <td class="py-4 text-mt text-xs">${dataFormatada}</td>
                <td class="py-4 text-right">
                    <button onclick="gerarLinkAcesso('${tr.id}', '${tr.aluno_id}', '${(tr.alunos?.nome || '').replace(/'/g,"\\'")}', '${tr.alunos?.telefone || ''}')"
                        class="p-2 text-emerald-400 hover:text-emerald-300 transition-colors" title="Enviar link de acesso por WhatsApp">
                        <i data-lucide="link" class="w-4 h-4"></i>
                    </button>
                    <button onclick="editarTreino('${tr.id}')" class="p-2 text-mt hover:text-pu transition-colors" title="Editar Treino">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="excluirTreino('${tr.id}')" class="p-2 text-mt hover:text-red-500 transition-colors" title="Excluir Treino">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error('Erro ao buscar treinos:', err);
        const detalhe = String(err?.message || err).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-red-400">Erro ao carregar os treinos personalizados.<br><span class="text-xs opacity-75">' + detalhe + '</span></td></tr>';
    }
}

async function carregarSelectAlunos() {
    await carregarAlunosNoSelect('treino-aluno');
}

function fecharModalTreino() {
    document.getElementById('modal-treino').classList.add('hidden');
    document.getElementById('modal-treino').classList.remove('flex');
    ssClear('treino-aluno');
    const searchEl = document.getElementById('treino-aluno-search');
    if (searchEl) searchEl.disabled = false;
}

async function abrirModalTreino() {
    document.getElementById('form-treino').reset();
    document.getElementById('treino-id').value = '';
    document.getElementById('modal-titulo-treino').innerText = 'Montar Treino Personalizado';
    ssClear('treino-aluno');

    // Carregar alunos ativos
    await carregarSelectAlunos();

    // Resetar estado do builder
    treinoModalState = {
        exerciciosPorDia: { seg: [], ter: [], qua: [], qui: [], sex: [], sab: [] },
        diaAtivo: 'seg'
    };

    // Abre tela com Segunda-feira ativa
    selecionarDiaMontagem('seg');

    document.getElementById('modal-treino').classList.remove('hidden');
    document.getElementById('modal-treino').classList.add('flex');
}

async function editarTreino(id) {
    const tr = LISTA_TREINOS_CACHE.find(t => t.id === id);
    if (!tr) return;

    document.getElementById('modal-titulo-treino').innerText = 'Editar Treino Personalizado';
    document.getElementById('treino-id').value = tr.id;
    
    // Carregar alunos e selecionar o correto
    await carregarSelectAlunos();
    const nomeAluno = tr.alunos ? tr.alunos.nome : '';
    ssSelect('treino-aluno', tr.aluno_id, nomeAluno);
    // Bloquear edição de aluno em treino existente
    const searchEl = document.getElementById('treino-aluno-search');
    if (searchEl) searchEl.disabled = true;
    
    // Buscar os exercícios completos no banco
    const db = getSupabase();
    if (db) {
        try {
            const { data, error } = await db
                .from('treinos')
                .select('exercicios')
                .eq('id', tr.id)
                .single();
            
            if (!error && data) {
                const exs = data.exercicios || {};
                treinoModalState.exerciciosPorDia = {
                    seg: exs.seg || [],
                    ter: exs.ter || [],
                    qua: exs.qua || [],
                    qui: exs.qui || [],
                    sex: exs.sex || [],
                    sab: exs.sab || []
                };
            }
        } catch(e) {
            console.error(e);
        }
    }

    selecionarDiaMontagem('seg');

    document.getElementById('modal-treino').classList.remove('hidden');
    document.getElementById('modal-treino').classList.add('flex');
}

function selecionarDiaMontagem(dia) {
    treinoModalState.diaAtivo = dia;

    document.querySelectorAll('.tab-montar').forEach(btn => {
        const bDia = btn.id.replace('tab-montar-', '');
        if (bDia === dia) {
            btn.classList.add('bg-pu', 'border-pu', 'text-white');
            btn.classList.remove('bg-s2', 'text-mt', 'border-bd');
        } else {
            btn.classList.remove('bg-pu', 'border-pu', 'text-white');
            btn.classList.add('bg-s2', 'text-mt', 'border-bd');
        }
    });

    const nomesDias = { seg:'Segunda-feira', ter:'Terça-feira', qua:'Quarta-feira', qui:'Quinta-feira', sex:'Sexta-feira', sab:'Sábado' };
    const titulo = document.getElementById('titulo-dia-montagem');
    if (titulo) titulo.innerText = nomesDias[dia];

    renderLinhasDoDiaAtivo();
    atualizarBadgesDias();
}

function salvarInputsDoDiaAtivo() {
    // Estado gerenciado diretamente via adicionarExercicioDaBiblioteca / removerCardExercicio / confirmarEdicaoExercicio
}

function renderLinhasDoDiaAtivo() {
    const container = document.getElementById('lista-exercicios-dia');
    if (!container) return;
    container.innerHTML = '';

    const exs = treinoModalState.exerciciosPorDia[treinoModalState.diaAtivo] || [];

    if (exs.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center">
                <div class="w-14 h-14 bg-s3/50 rounded-2xl flex items-center justify-center mb-3 border border-bd/40">
                    <i data-lucide="dumbbell" class="w-7 h-7 text-mt/50"></i>
                </div>
                <p class="text-mt text-sm font-medium">Nenhum exercício adicionado</p>
                <p class="text-mt/60 text-xs mt-1">Clique em "Adicionar Exercício" para começar</p>
            </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    exs.forEach((ex, idx) => {
        const card = criarCardExercicio(ex, idx);
        container.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
}

function adicionarLinhaExercicio() {
    abrirBibliotecaExercicios();
}

// --- Helpers de card ---
function criarCardExercicio(ex, idx) {
    const div = document.createElement('div');
    div.className = 'ex-card-enter group relative flex items-stretch bg-s2/60 border border-bd/40 hover:border-pu/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-pu/10 hover:-translate-y-0.5';
    div.setAttribute('data-idx', idx);

    let imgSrc = exImg(ex.animacao
        ? ('../' + ex.animacao)
        : (ex.exerciseId ? `../admin/exercises/${ex.exerciseId}/anim.webp` : null));
    const imgHtml = imgSrc
        ? `<img src="${imgSrc}" alt="${ex.nome}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center text-pu/50\\'><svg xmlns=\\'http://www.w3.org/2000/svg\\' class=\\'w-8 h-8\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\'><path d=\\'M6.5 6.5h11M6.5 17.5h11M2 12h4m12 0h4\\'></path></svg></div>'">`
        : `<div class="w-full h-full flex items-center justify-center text-pu/50"><svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6.5 6.5h11M6.5 17.5h11M2 12h4m12 0h4"></path></svg></div>`;

    div.innerHTML = `
        <!-- Painel de animação -->
        <div class="w-20 flex-shrink-0 bg-gradient-to-b from-pu/20 via-s3/40 to-s3/60 relative overflow-hidden">
            <div class="absolute inset-0 bg-pu/5 group-hover:bg-pu/10 transition-colors"></div>
            <div class="relative z-10 w-full h-full">${imgHtml}</div>
        </div>

        <!-- Conteúdo -->
        <div class="flex-1 px-4 py-3 min-w-0">
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                    <span class="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-pu/15 text-pu2 mb-1">${ex.grupo || 'Geral'}</span>
                    <h4 class="text-tx font-bold text-sm leading-snug truncate">${ex.nome || 'Exercício'}</h4>
                </div>
                <!-- Botões (visíveis no hover) -->
                <div class="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-0.5">
                    <button type="button" onclick="abrirEditarExercicio(${idx})" class="w-7 h-7 bg-s3 hover:bg-pu/20 border border-bd hover:border-pu/40 rounded-lg flex items-center justify-center text-mt hover:text-pu2 transition-all" title="Editar">
                        <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    </button>
                    <button type="button" onclick="removerCardExercicio(${idx})" class="w-7 h-7 bg-s3 hover:bg-red-500/20 border border-bd hover:border-red-500/40 rounded-lg flex items-center justify-center text-mt hover:text-red-400 transition-all" title="Remover">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 mt-2.5">
                ${(() => {
                    const s = ex.series != null && ex.series !== '' ? String(ex.series) : '';
                    const r = ex.repeticoes != null && ex.repeticoes !== '' ? String(ex.repeticoes) : '';
                    const label = s && r ? `${s} × ${r}` : (s || r ? (s + r) : null);
                    return label ? `<span class="flex items-center gap-1 bg-pu/10 border border-pu/20 rounded-lg px-2.5 py-1 text-pu2 text-xs font-bold"><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>${label}</span>` : '';
                })()}
                ${ex.carga ? `<span class="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1 text-emerald-400 text-xs font-bold"><svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5h11M6.5 17.5h11M2 12h4m12 0h4"/></svg>${ex.carga}</span>` : ''}
            </div>
            ${ex.obs ? `<p class="mt-2 text-[11px] text-mt/70 italic leading-relaxed line-clamp-2">${ex.obs}</p>` : ''}
        </div>
    `;
    return div;
}

function removerCardExercicio(idx) {
    treinoModalState.exerciciosPorDia[treinoModalState.diaAtivo].splice(idx, 1);
    renderLinhasDoDiaAtivo();
    atualizarBadgesDias();
}

function atualizarBadgesDias() {
    const dias = ['seg','ter','qua','qui','sex','sab'];
    dias.forEach(d => {
        const cnt = (treinoModalState.exerciciosPorDia[d] || []).length;
        const badge = document.getElementById('cnt-' + d);
        if (badge) {
            badge.textContent = cnt;
            cnt > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');
        }
    });
}

// --- Biblioteca de Exercícios ---
let libCatAtiva = 'todos';
let libBuscaTermo = '';
const CAT_MAP = {
    chest: 'Peito', 'middle back': 'Costas', lats: 'Costas', 'lower back': 'Costas',
    traps: 'Costas', shoulders: 'Ombros', biceps: 'Bíceps', triceps: 'Tríceps',
    quadriceps: 'Pernas', hamstrings: 'Pernas', calves: 'Pernas', glutes: 'Glúteos',
    abdominals: 'Abdômen', neck: 'Pescoço', abductors: 'Abdutores', adductors: 'Adutores',
    forearms: 'Antebraços'
};

function abrirBibliotecaExercicios() {
    const modal = document.getElementById('modal-biblioteca');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    const label = document.getElementById('lib-dia-label');
    const nomesDias = { seg:'Segunda-feira', ter:'Terça-feira', qua:'Quarta-feira', qui:'Quinta-feira', sex:'Sexta-feira', sab:'Sábado' };
    if (label) label.textContent = 'Adicionando para: ' + (nomesDias[treinoModalState.diaAtivo] || '');
    const busca = document.getElementById('lib-busca');
    if (busca) { busca.value = ''; libBuscaTermo = ''; }
    libCatAtiva = 'todos';
    document.querySelectorAll('.lib-cat-btn').forEach(b => {
        const isTodos = b.getAttribute('data-libcat') === 'todos';
        b.classList.toggle('bg-pu', isTodos);
        b.classList.toggle('text-white', isTodos);
        b.classList.toggle('border-pu', isTodos);
        b.classList.toggle('text-mt', !isTodos);
        b.classList.toggle('border-bd', !isTodos);
        b.classList.remove('bg-pu/0');
    });
    Promise.all([carregarExerciciosDb(), carregarExerciciosPersonalizados()]).then(() => renderizarBibliotecaGrid());
    if (window.lucide) window.lucide.createIcons();
}

function fecharBibliotecaExercicios() {
    const modal = document.getElementById('modal-biblioteca');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function filtrarBibliotecaCat(cat) {
    libCatAtiva = cat;
    libBuscaTermo = '';
    const busca = document.getElementById('lib-busca');
    if (busca) busca.value = '';
    document.querySelectorAll('.lib-cat-btn').forEach(b => {
        const isAtivo = b.getAttribute('data-libcat') === cat;
        b.classList.toggle('bg-pu', isAtivo);
        b.classList.toggle('text-white', isAtivo);
        b.classList.toggle('border-pu', isAtivo);
        b.classList.toggle('text-mt', !isAtivo);
        b.classList.toggle('border-bd', !isAtivo);
    });
    renderizarBibliotecaGrid();
}

function filtrarBibliotecaBusca(termo) {
    libBuscaTermo = termo.toLowerCase().trim();
    renderizarBibliotecaGrid();
}

function renderizarBibliotecaGrid() {
    const grid = document.getElementById('lib-grid');
    const info = document.getElementById('lib-mais-info');
    if (!grid) return;

    // Aba de exercícios personalizados
    if (libCatAtiva === 'personalizados') {
        let lista = customExercisesDb;
        if (libBuscaTermo) {
            lista = lista.filter(ex => ex.nome.toLowerCase().includes(libBuscaTermo) || (ex.grupo || '').toLowerCase().includes(libBuscaTermo));
        }
        if (info) info.classList.add('hidden');
        if (lista.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center py-16 text-mt"><i data-lucide="dumbbell" class="w-8 h-8 mx-auto mb-3 opacity-40"></i><p class="text-sm">Nenhum exercício personalizado cadastrado</p><p class="text-xs mt-1 opacity-60">Use "Cadastrar personalizado" para criar</p></div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }
        grid.innerHTML = '';
        lista.forEach(ex => {
            const card = document.createElement('div');
            card.className = 'ex-lib-card bg-s2 border border-pu/20 hover:border-pu/60 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-pu/10 hover:-translate-y-0.5 flex flex-col group';
            card.innerHTML = `
                <div class="h-24 overflow-hidden bg-pu/10 relative flex items-center justify-center">
                    <i data-lucide="dumbbell" class="w-10 h-10 text-pu/40"></i>
                    <div class="absolute inset-0 bg-gradient-to-t from-s2/80 to-transparent"></div>
                </div>
                <div class="p-3 flex flex-col flex-1">
                    <span class="text-[10px] text-pu2 font-bold uppercase tracking-wider">${ex.grupo || 'Geral'}</span>
                    <h4 class="text-tx text-xs font-bold mt-0.5 leading-snug flex-1 line-clamp-2">${ex.nome}</h4>
                    <div class="flex gap-1.5 mt-2.5">
                        <button type="button" onclick="adicionarExercicioCustomDaBiblioteca('${ex.id}')"
                            class="flex-1 bg-pu/20 hover:bg-pu text-pu2 hover:text-white border border-pu/30 hover:border-pu py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 flex items-center justify-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Usar
                        </button>
                        <button type="button" onclick="excluirExercicioPersonalizado('${ex.id}')"
                            class="w-8 bg-red-500/10 hover:bg-red-500/30 border border-red-500/20 hover:border-red-500/50 text-red-400 py-1.5 rounded-xl text-[11px] transition-all flex items-center justify-center">
                            <i data-lucide="trash-2" class="w-3 h-3"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    // Biblioteca padrão
    let lista = masterExercisesDb;
    if (libCatAtiva !== 'todos') {
        lista = lista.filter(ex =>
            (ex.primaryMuscles || []).some(m => m.toLowerCase().includes(libCatAtiva)) ||
            (ex.category || '').toLowerCase().includes(libCatAtiva)
        );
    }
    if (libBuscaTermo) {
        lista = lista.filter(ex =>
            (ex.namePt || ex.name || '').toLowerCase().includes(libBuscaTermo) ||
            (ex.name || '').toLowerCase().includes(libBuscaTermo) ||
            (ex.primaryMuscles || []).join(' ').toLowerCase().includes(libBuscaTermo)
        );
    }

    const LIMITE = 48;
    const render = lista.slice(0, LIMITE);

    if (render.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-16 text-mt"><i data-lucide="search-x" class="w-8 h-8 mx-auto mb-3 opacity-40"></i><p class="text-sm">Nenhum exercício encontrado</p></div>`;
        if (window.lucide) window.lucide.createIcons();
        if (info) info.classList.add('hidden');
        return;
    }

    grid.innerHTML = '';
    render.forEach(ex => {
        const muscPT = CAT_MAP[( ex.primaryMuscles || [''] )[0].toLowerCase()] || (ex.primaryMuscles || [''])[0];
        const imgUrl = exImg(ex.animacao ? ('../' + ex.animacao) : ('exercises/' + ex.id + '/0.jpg'));
        const card = document.createElement('div');
        card.className = 'ex-lib-card bg-s2 border border-bd/50 hover:border-pu/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-pu/10 hover:-translate-y-0.5 flex flex-col group';
        card.innerHTML = `
            <div class="h-36 overflow-hidden bg-s3/40 relative">
                <img src="${imgUrl}" alt="${ex.namePt || ex.name}" loading="lazy" class="ex-lib-img w-full h-full object-cover" onerror="this.parentElement.classList.add('skeleton-shine');this.remove()">
                <div class="absolute inset-0 bg-gradient-to-t from-s2/80 to-transparent"></div>
            </div>
            <div class="p-3 flex flex-col flex-1">
                <span class="text-[10px] text-pu2 font-bold uppercase tracking-wider">${muscPT}</span>
                <h4 class="text-tx text-xs font-bold mt-0.5 leading-snug flex-1 line-clamp-2">${ex.namePt || ex.name}</h4>
                ${ex.equipment ? `<p class="text-mt/60 text-[10px] mt-1 truncate">${ex.equipment}</p>` : ''}
                <button type="button" onclick="adicionarExercicioDaBiblioteca('${ex.id}')"
                    class="mt-2.5 w-full bg-pu/20 hover:bg-pu text-pu2 hover:text-white border border-pu/30 hover:border-pu py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 flex items-center justify-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Adicionar
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    if (info) {
        if (lista.length > LIMITE) {
            info.textContent = `Mostrando ${LIMITE} de ${lista.length}. Use a busca para refinar.`;
            info.classList.remove('hidden');
        } else {
            info.classList.add('hidden');
        }
    }
}

function adicionarExercicioCustomDaBiblioteca(id) {
    const ex = customExercisesDb.find(e => e.id === id);
    if (!ex) return;
    const diaAtual = treinoModalState.exerciciosPorDia[treinoModalState.diaAtivo] || [];
    if (diaAtual.some(e => e.nome === ex.nome && !e.exerciseId)) {
        mostrarToast('Este exercício já está neste dia.', 'erro');
        return;
    }
    treinoModalState.exerciciosPorDia[treinoModalState.diaAtivo].push({
        nome: ex.nome,
        grupo: ex.grupo || 'Geral',
        series: 3,
        repeticoes: 12,
        carga: '',
        obs: '',
        exerciseId: '',
    });
    renderLinhasDoDiaAtivo();
    atualizarBadgesDias();
    fecharBibliotecaExercicios();
    mostrarToast('Exercício adicionado!');
}

function adicionarExercicioDaBiblioteca(exId) {
    const ex = masterExercisesDb.find(e => e.id === exId);
    if (!ex) return;

    const diaAtual = treinoModalState.exerciciosPorDia[treinoModalState.diaAtivo] || [];
    const jaExiste = diaAtual.some(e => e.exerciseId === exId);
    if (jaExiste) {
        mostrarToast('Este exercício já está neste dia.', 'erro');
        return;
    }

    const muscPT = CAT_MAP[(ex.primaryMuscles || [''])[0].toLowerCase()] || (ex.primaryMuscles || [''])[0] || 'Geral';

    const novoEx = {
        nome: ex.namePt || ex.name,
        grupo: muscPT,
        series: 3,
        repeticoes: 12,
        carga: '',
        obs: '',
        exerciseId: ex.id || '',
    };

    treinoModalState.exerciciosPorDia[treinoModalState.diaAtivo].push(novoEx);
    renderLinhasDoDiaAtivo();
    atualizarBadgesDias();
    fecharBibliotecaExercicios();
    mostrarToast('Exercício adicionado!');
}

// --- Exercício Personalizado ---
function adicionarExercicioPersonalizado() {
    fecharBibliotecaExercicios();
    const titulo = document.getElementById('editar-ex-titulo');
    if (titulo) titulo.textContent = 'Novo Exercício';
    document.getElementById('editar-ex-idx').value = -1;
    document.getElementById('editar-ex-nome').value = '';
    document.getElementById('editar-ex-grupo').value = '';
    document.getElementById('editar-ex-series').value = 3;
    document.getElementById('editar-ex-reps').value = 12;
    document.getElementById('editar-ex-carga').value = '';
    document.getElementById('editar-ex-obs').value = '';
    const modal = document.getElementById('modal-editar-ex');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) window.lucide.createIcons();
}

// --- Editar Exercício ---
function abrirEditarExercicio(idx) {
    const ex = treinoModalState.exerciciosPorDia[treinoModalState.diaAtivo][idx];
    if (!ex) return;
    const titulo = document.getElementById('editar-ex-titulo');
    if (titulo) titulo.textContent = 'Editar Exercício';
    document.getElementById('editar-ex-idx').value = idx;
    document.getElementById('editar-ex-nome').value = ex.nome || '';
    document.getElementById('editar-ex-grupo').value = ex.grupo || '';

    // Backward compat: old "3x12" combined string → split into separate fields
    let series = ex.series != null ? String(ex.series) : '';
    let repeticoes = ex.repeticoes != null ? String(ex.repeticoes) : '';
    if (!repeticoes && /^\d+[xX]\d+$/.test(series)) {
        const parts = series.split(/[xX]/);
        series = parts[0];
        repeticoes = parts[1];
    }
    document.getElementById('editar-ex-series').value = series;
    document.getElementById('editar-ex-reps').value = repeticoes;

    document.getElementById('editar-ex-carga').value = ex.carga || '';
    document.getElementById('editar-ex-obs').value = ex.obs || '';
    const modal = document.getElementById('modal-editar-ex');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) window.lucide.createIcons();
}

function fecharEditarExercicio() {
    const modal = document.getElementById('modal-editar-ex');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function confirmarEdicaoExercicio() {
    const idx = parseInt(document.getElementById('editar-ex-idx').value);
    const dia = treinoModalState.diaAtivo;

    const nome = document.getElementById('editar-ex-nome').value.trim();
    if (!nome) { mostrarToast('Informe o nome do exercício.', 'erro'); return; }

    if (idx === -1) {
        const grupo = document.getElementById('editar-ex-grupo').value.trim();
        // Novo exercício personalizado
        if (!treinoModalState.exerciciosPorDia[dia]) treinoModalState.exerciciosPorDia[dia] = [];
        treinoModalState.exerciciosPorDia[dia].push({
            nome,
            grupo,
            series:     document.getElementById('editar-ex-series').value.trim(),
            repeticoes: document.getElementById('editar-ex-reps').value.trim(),
            carga:      document.getElementById('editar-ex-carga').value.trim(),
            obs:        document.getElementById('editar-ex-obs').value.trim(),
            exerciseId: '',
        });
        fecharEditarExercicio();
        renderLinhasDoDiaAtivo();
        atualizarBadgesDias();
        mostrarToast('Exercício adicionado!');
        // Salva no banco para reutilização futura
        const db = getSupabase();
        if (db) {
            db.from('exercicios_personalizados').insert([{ nome, grupo }]).then(({ data, error }) => {
                if (!error && data?.[0]) customExercisesDb.unshift(data[0]);
            });
        }
    } else {
        if (isNaN(idx) || !treinoModalState.exerciciosPorDia[dia][idx]) return;
        const existing = treinoModalState.exerciciosPorDia[dia][idx];
        existing.nome       = nome;
        existing.grupo      = document.getElementById('editar-ex-grupo').value.trim();
        existing.series     = document.getElementById('editar-ex-series').value.trim();
        existing.repeticoes = document.getElementById('editar-ex-reps').value.trim();
        existing.carga      = document.getElementById('editar-ex-carga').value.trim();
        existing.obs        = document.getElementById('editar-ex-obs').value.trim();
        fecharEditarExercicio();
        renderLinhasDoDiaAtivo();
        mostrarToast('Exercício atualizado!');
    }
}

function setupFormTreino() {
    // Adicionar Datalist dinâmico de sugestões ao body
    const datalist = document.createElement('datalist');
    datalist.id = 'exercicios-lista-sugeridos';
    EXERCICIOS_SUGERIDOS.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        datalist.appendChild(opt);
    });
    document.body.appendChild(datalist);

    const searchInput = document.getElementById('treino-aluno-search');
    if (searchInput) { searchInput.addEventListener('change', () => {}); }
}

function gerarUsuarioSugerido() {
    const searchEl = document.getElementById('treino-aluno-search');
    if (!searchEl || !searchEl.value) return;

    const nomeAluno = searchEl.value;
    const partesNome = nomeAluno.split(' ');
    
    const primeiroNome = partesNome[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 3);
    const ultimoNome = partesNome.length > 1 ? partesNome[partesNome.length - 1].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").substring(0, 3) : '';
    
    const numeroAleatorio = Math.floor(10 + Math.random() * 90);
    
    document.getElementById('treino-usuario').value = `${primeiroNome}${ultimoNome}${numeroAleatorio}`;
}

function toggleSenhaVisivel(inputId, btn) {
    const input = document.getElementById(inputId);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    const eyeOpen  = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
    const eyeClosed = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>`;
    btn.innerHTML = show ? eyeClosed : eyeOpen;
}

async function salvarTreino(event) {
    event.preventDefault();
    const db = getSupabase();
    if (!db) {
        alert('Supabase não inicializado.');
        return;
    }

    const id = document.getElementById('treino-id').value;
    const alunoId = document.getElementById('treino-aluno-id').value;

    if (!alunoId) {
        alert('Selecione um Aluno.');
        return;
    }

    // 1. Salvar inputs do dia ativo
    salvarInputsDoDiaAtivo();

    const dados = {
        aluno_id: alunoId,
        exercicios: treinoModalState.exerciciosPorDia,
        updated_at: new Date().toISOString()
    };

    const btn = document.getElementById('btn-salvar-treino');
    btn.disabled = true;
    btn.innerText = 'Salvando...';

    try {
        let resultError = null;

        if (id) {
            const { error } = await db
                .from('treinos')
                .update(dados)
                .eq('id', id);
            resultError = error;
        } else {
            const { error } = await db
                .from('treinos')
                .insert([dados]);
            resultError = error;
        }

        if (resultError) throw resultError;

        fecharModalTreino();
        await fetchTreinos();

    } catch (err) {
        console.error('Erro ao salvar treino:', err);
        alert('Erro ao salvar o treino personalizado. Certifique-se de que a tabela no Supabase foi criada.');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Salvar Treino';
    }
}

async function excluirTreino(id) {
    confirmarAcao('Deseja realmente excluir este treino personalizado? Esta ação é irreversível.', async () => {
        const db = getSupabase();
        if (!db) return;
        try {
            const { error } = await db.from('treinos').delete().eq('id', id);
            if (error) throw error;
            await fetchTreinos();
        } catch (err) {
            console.error(err);
            mostrarToast('Erro ao excluir o treino personalizado.', 'erro');
        }
    });
}

// ──────────────────────────────────────────────
// Trocar Senha do Admin
// ──────────────────────────────────────────────
async function trocarSenha(event) {
    event.preventDefault();

    const db = getSupabase();
    if (!db) return;

    const senhaAtual     = document.getElementById('senha-atual').value;
    const senhaNova      = document.getElementById('senha-nova').value;
    const senhaConfirmar = document.getElementById('senha-confirmar').value;
    const erroEl         = document.getElementById('senha-erro');

    function showErro(msg) { erroEl.textContent = msg; erroEl.classList.remove('hidden'); }
    erroEl.classList.add('hidden');

    if (senhaNova.length < 8) { showErro('A nova senha deve ter pelo menos 8 caracteres.'); return; }
    if (senhaNova !== senhaConfirmar) { showErro('A nova senha e a confirmação não coincidem.'); return; }
    if (senhaAtual === senhaNova) { showErro('A nova senha não pode ser igual à senha atual.'); return; }

    // Verifica senha atual via re-autenticação real no Supabase
    const { data: { user } } = await db.auth.getUser();
    if (!user) { showErro('Sessão inválida. Faça login novamente.'); return; }

    const { error: reAuthErr } = await db.auth.signInWithPassword({ email: user.email, password: senhaAtual });
    if (reAuthErr) { showErro('Senha atual incorreta.'); return; }

    const { error } = await db.auth.updateUser({ password: senhaNova });
    if (error) { showErro('Erro ao salvar a nova senha. Tente novamente.'); return; }

    document.getElementById('form-trocar-senha').reset();
    mostrarToast('Senha alterada com sucesso!');
}

async function enviarTreinoPorWhatsApp(alunoId, alunoNome, telefone) {
    const db = getSupabase();
    const { data } = await db
        .from('treinos')
        .select('id')
        .eq('aluno_id', alunoId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (!data) {
        mostrarToast('Nenhum treino cadastrado para este aluno.', 'erro');
        return;
    }
    // Senhas não ficam mais legíveis no banco (bcrypt): envia link para o aluno definir o acesso
    await gerarLinkAcesso(data.id, alunoId, alunoNome, telefone);
}

async function gerarLinkAcesso(treinoId, alunoId, alunoNome, telefone) {
    const db = getSupabase();
    if (!db) return;

    mostrarToast('Gerando link de acesso...', 'info');

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await db.from('tokens_acesso').insert({
        token,
        treino_id: treinoId,
        aluno_id: alunoId,
        expires_at: expiresAt
    });

    if (error) {
        console.error('Erro ao gerar token:', error);
        mostrarToast('Erro ao gerar link de acesso.', 'erro');
        return;
    }

    // Garante que o link use sempre HTTPS/domínio público, não IP local
    const isLocal = /^https?:\/\/(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(window.location.origin);
    const baseUrl = isLocal ? 'https://www.studiofocus.app.br' : window.location.origin;
    const link = `${baseUrl}/treinos/definir-acesso.html?token=${token}`;
    const nome = alunoNome.split(' ')[0];
    const texto = `*Studio Focus*\n\nOlá, ${nome}! Acesse o link abaixo para definir seu usuário e senha de acesso à plataforma de treinos:\n\n${link}\n\nO link expira em 7 dias.`;

    if (telefone) {
        const telLimpo = telefone.replace(/\D/g, '');
        window.open(`https://wa.me/55${telLimpo}?text=${encodeURIComponent(texto)}`, '_blank');
    } else {
        await navigator.clipboard.writeText(texto).catch(() => {});
        mostrarToast('Telefone não encontrado — link copiado para a área de transferência!', 'info');
    }
}

// ==========================================
// HELPER: NAVEGAR PARA UMA SEÇÃO
// ==========================================
function navegarPara(sectionId) {
    const btn = document.querySelector(`[data-section="${sectionId}"]`);
    if (btn) btn.click();
}

// ==========================================
// ANIVERSARIANTES
// ==========================================
const _MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

async function renderSecaoAniversariantes() {
    const content = document.getElementById('aniversariantes-content');
    if (!content) return;
    const db = getSupabase();
    if (!db) return;

    content.innerHTML = '<p class="text-mt text-sm animate-pulse">Carregando...</p>';

    const { data } = await db
        .from('alunos')
        .select('id, nome, telefone, data_nascimento')
        .eq('status', 'ATIVO')
        .not('data_nascimento', 'is', null);

    if (!data || data.length === 0) {
        content.innerHTML = '<div class="glass p-8 rounded-2xl text-center text-mt"><i data-lucide="cake" class="w-10 h-10 mx-auto mb-3 opacity-30"></i><p>Nenhum aluno com data de nascimento cadastrada.</p></div>';
        if (window.lucide) window.lucide.createIcons({ nodes: [content] });
        return;
    }

    // Agrupar por mês de nascimento
    const porMes = Array.from({ length: 12 }, () => []);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    for (const aluno of data) {
        const dt = new Date(aluno.data_nascimento + 'T00:00:00');
        const mes = dt.getMonth(); // 0-based
        const dia = dt.getDate();
        let proxAniv = new Date(hoje.getFullYear(), mes, dia);
        if (proxAniv < hoje) proxAniv = new Date(hoje.getFullYear() + 1, mes, dia);
        const diffDias = Math.round((proxAniv - hoje) / 86400000);
        const idade = proxAniv.getFullYear() - dt.getFullYear();
        porMes[mes].push({ ...aluno, dia, diffDias, idade });
    }

    // Ordenar dentro de cada mês por dia
    porMes.forEach(lista => lista.sort((a, b) => a.dia - b.dia));

    const mesAtual = hoje.getMonth();

    // Reordenar meses: começa do mês atual
    const ordemMeses = Array.from({ length: 12 }, (_, i) => (mesAtual + i) % 12);

    const htmlMeses = ordemMeses.map(m => {
        const lista = porMes[m];
        const isMesAtual = m === mesAtual;
        const total = lista.length;

        const headerClass = isMesAtual
            ? 'bg-pink-500/15 border-pink-500/40'
            : 'bg-s2/40 border-bd/40';
        const titleClass = isMesAtual ? 'text-pink-300' : 'text-white';

        const cards = total === 0
            ? `<p class="text-[11px] text-mt/50 italic px-1">Nenhum aniversariante</p>`
            : lista.map(a => {
                const tel = (a.telefone || '').replace(/\D/g, '');
                const msg = encodeURIComponent(`Feliz aniversário, ${a.nome}! Que seu dia seja muito especial. Toda a equipe Studio Focus deseja a você saúde, alegria e muito treino pela frente!`);
                const waUrl = tel ? `https://wa.me/55${tel}?text=${msg}` : null;
                const isHoje = a.diffDias === 0;
                const isAmanha = a.diffDias === 1;
                const labelDia = isHoje
                    ? `<span class="text-[10px] font-black text-pink-400 uppercase ml-1">Hoje!</span>`
                    : isAmanha
                    ? `<span class="text-[10px] text-yellow-400 ml-1">Amanhã</span>`
                    : '';
                const waBtn = waUrl
                    ? `<a href="${waUrl}" target="_blank" rel="noopener" class="flex-shrink-0 flex items-center gap-1 bg-green-600/20 hover:bg-green-600/40 border border-green-600/30 px-2.5 py-1 rounded-lg transition-all text-[10px] text-green-400 font-bold">
                        <i data-lucide="message-circle" class="w-3 h-3"></i>Parabenizar</a>`
                    : '';
                return `
                <div class="flex items-center gap-3 p-3 rounded-xl border transition-all ${isHoje ? 'bg-pink-500/10 border-pink-500/30' : 'bg-s2/50 border-bd/30 hover:border-bd'}">
                    <div class="w-9 h-9 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 ${isHoje ? 'birthday-ring' : ''}">
                        <span class="text-sm font-black text-pink-300 ${isHoje ? 'birthday-icon' : ''}">${String(a.dia).padStart(2,'0')}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold truncate ${isHoje ? 'birthday-name' : 'text-white'}">${a.nome}${labelDia}</p>
                        <p class="text-[10px] text-mt">${a.idade} anos</p>
                    </div>
                    ${waBtn}
                </div>`;
            }).join('');

        return `
        <div class="glass rounded-2xl overflow-hidden border ${headerClass}">
            <div class="flex items-center justify-between px-5 py-3.5 border-b ${headerClass}">
                <div class="flex items-center gap-2">
                    <i data-lucide="cake" class="w-4 h-4 ${isMesAtual ? 'text-pink-400' : 'text-mt'}"></i>
                    <h3 class="font-bold text-sm ${titleClass}">${_MESES_NOMES[m]}</h3>
                    ${isMesAtual ? '<span class="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full font-bold">Mês atual</span>' : ''}
                </div>
                <span class="text-xs text-mt font-bold">${total} aluno${total !== 1 ? 's' : ''}</span>
            </div>
            <div class="p-4 space-y-2">${cards}</div>
        </div>`;
    }).join('');

    content.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">${htmlMeses}</div>`;
    if (window.lucide) window.lucide.createIcons({ nodes: [content] });
}

async function renderAniversariantes() {
    const db = getSupabase();
    if (!db) return;

    const { data } = await db
        .from('alunos')
        .select('id, nome, telefone, data_nascimento')
        .eq('status', 'ATIVO')
        .not('data_nascimento', 'is', null);

    const card = document.getElementById('card-aniversariantes');
    const lista = document.getElementById('lista-aniversariantes');
    const badge = document.getElementById('badge-aniversariantes');
    if (!card || !lista) return;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const aniversariantes = [];
    for (const aluno of data || []) {
        const dt = new Date(aluno.data_nascimento + 'T00:00:00');
        const mes = dt.getMonth();
        const dia = dt.getDate();
        let proxAniv = new Date(hoje.getFullYear(), mes, dia);
        if (proxAniv < hoje) proxAniv = new Date(hoje.getFullYear() + 1, mes, dia);
        const diffDias = Math.round((proxAniv - hoje) / 86400000);
        if (diffDias > 7) continue;
        const idade = proxAniv.getFullYear() - dt.getFullYear();
        aniversariantes.push({ ...aluno, diffDias, idade });
    }

    if (aniversariantes.length === 0) { card.classList.add('hidden'); return; }
    aniversariantes.sort((a, b) => a.diffDias - b.diffDias);
    card.classList.remove('hidden');

    const hojeCount = aniversariantes.filter(a => a.diffDias === 0).length;
    if (badge) {
        badge.textContent = hojeCount;
        badge.classList.toggle('hidden', hojeCount === 0);
        badge.classList.toggle('flex', hojeCount > 0);
    }

    // Banner de alerta em tela para aniversariantes de hoje
    const hoje_aniv = aniversariantes.filter(a => a.diffDias === 0);
    const banner = document.getElementById('banner-aniversariantes');
    const bannerNomes = document.getElementById('banner-aniv-nomes');
    if (banner && bannerNomes) {
        if (hoje_aniv.length > 0) {
            bannerNomes.textContent = hoje_aniv.map(a => a.nome).join(', ');
            banner.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons({ nodes: [banner] });
        } else {
            banner.classList.add('hidden');
        }
    }

    lista.innerHTML = aniversariantes.map(a => {
        const tel = (a.telefone || '').replace(/\D/g, '');
        const msg = encodeURIComponent(`Feliz aniversário, ${a.nome}! Que seu dia seja muito especial. Toda a equipe Studio Focus deseja a você saúde, alegria e muito treino pela frente!`);
        const waUrl = tel ? `https://wa.me/55${tel}?text=${msg}` : null;
        const isHoje = a.diffDias === 0;
        const labelDia = isHoje
            ? `<span class="text-[10px] font-black text-pink-400 uppercase">Hoje!</span>`
            : a.diffDias === 1
            ? `<span class="text-[10px] text-yellow-400">Amanhã</span>`
            : `<span class="text-[10px] text-mt">Em ${a.diffDias} dias</span>`;
        const waBtn = waUrl
            ? `<a href="${waUrl}" target="_blank" rel="noopener" class="flex-shrink-0 flex items-center gap-1 bg-green-600/20 hover:bg-green-600/40 border border-green-600/30 px-2 py-1 rounded-lg transition-all text-[10px] text-green-400 font-bold whitespace-nowrap">
                <i data-lucide="message-circle" class="w-3 h-3"></i>Parabenizar</a>`
            : '';
        return `
        <div class="flex items-center gap-2 p-2.5 rounded-xl border ${isHoje ? 'bg-pink-500/10 border-pink-500/30' : 'bg-s2/60 border-bd/40'}">
            <div class="w-7 h-7 bg-pink-500/20 rounded-full flex items-center justify-center flex-shrink-0 ${isHoje ? 'birthday-ring' : ''}">
                <i data-lucide="cake" class="w-3.5 h-3.5 text-pink-400 ${isHoje ? 'birthday-icon' : ''}"></i>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-xs font-bold truncate ${isHoje ? 'birthday-name' : 'text-white'}">${a.nome}</p>
                <div class="flex items-center gap-1.5">${labelDia}<span class="text-[10px] text-mt">${a.idade} anos</span></div>
            </div>
            ${waBtn}
        </div>`;
    }).join('');

    if (window.lucide) window.lucide.createIcons({ nodes: [lista] });
}

// ==========================================
// ALERTAS INTELIGENTES (DASHBOARD)
// ==========================================
function _renderizarAlertasInteligentes(pagos, vencidos, novosAlunos) {
    const container = document.getElementById('lista-alertas-inteligentes');
    const badge = document.getElementById('badge-alertas-count');
    if (!container) return;

    const alertas = [];

    if (vencidos.length > 0) {
        alertas.push({
            tipo: 'danger',
            titulo: `${vencidos.length} pagamento(s) vencido(s)`,
            desc: 'Acesse Financeiro → Cobranças para recuperar',
            icone: 'alert-triangle', cor: 'red'
        });
    }
    if (novosAlunos > 0) {
        alertas.push({
            tipo: 'info',
            titulo: `${novosAlunos} novo(s) aluno(s) este mês`,
            desc: 'Cadastre o treino personalizado para eles',
            icone: 'user-plus', cor: 'green'
        });
    }
    if (pagos.length === 0) {
        alertas.push({
            tipo: 'warning',
            titulo: 'Nenhuma receita registrada este mês',
            desc: 'Verifique os pagamentos pendentes',
            icone: 'clock', cor: 'yellow'
        });
    }

    if (badge) {
        if (alertas.length > 0) {
            badge.textContent = alertas.length;
            badge.classList.remove('hidden');
            badge.classList.add('flex');
        } else {
            badge.classList.add('hidden');
        }
    }

    if (alertas.length === 0) {
        container.innerHTML = `<div class="flex items-center gap-2 text-green-400 text-xs"><i data-lucide="check-circle" class="w-4 h-4"></i>Tudo em ordem! Sem alertas.</div>`;
        if (window.lucide) window.lucide.createIcons({ nodes: [container] });
        return;
    }

    container.innerHTML = alertas.map(a => `
        <div class="flex items-start gap-3 p-3 bg-${a.cor}-500/10 border border-${a.cor}-500/20 rounded-xl">
            <i data-lucide="${a.icone}" class="w-4 h-4 text-${a.cor}-400 flex-shrink-0 mt-0.5"></i>
            <div>
                <p class="text-xs font-bold">${a.titulo}</p>
                <p class="text-[10px] text-mt mt-0.5">${a.desc}</p>
            </div>
        </div>
    `).join('');
    if (window.lucide) window.lucide.createIcons({ nodes: [container] });
}

// ==========================================
// LEADS / CRM (Supabase)
// ==========================================

let _leadsCache = [];

function _tempoRelativo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `Há ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Há ${h} hora${h > 1 ? 's' : ''}`;
    const d = Math.floor(h / 24);
    return `Há ${d} dia${d > 1 ? 's' : ''}`;
}

async function renderizarKanban() {
    const db = getSupabase();
    if (!db) return;
    const fases = ['novo', 'contato', 'visita', 'teste', 'negociacao', 'fechado', 'perdido'];

    // Mostra loading em todas as colunas
    fases.forEach(fase => {
        const cards = document.querySelector(`.kanban-col[data-fase="${fase}"] .kanban-cards`);
        if (cards) cards.innerHTML = '<p class="text-[10px] text-mt/50 text-center py-4 animate-pulse">Carregando...</p>';
    });

    const { data, error } = await db.from('leads').select('*').order('created_at', { ascending: false });
    if (error) { mostrarToast('Erro ao carregar leads.', 'erro'); return; }
    _leadsCache = data || [];

    fases.forEach(fase => {
        const col = document.querySelector(`.kanban-col[data-fase="${fase}"]`);
        if (!col) return;
        const cards = col.querySelector('.kanban-cards');
        const countEl = col.querySelector('.kanban-count');
        if (!cards) return;

        const leadsColuna = _leadsCache.filter(l => l.fase === fase);
        if (countEl) countEl.textContent = leadsColuna.length;

        cards.innerHTML = '';
        if (leadsColuna.length === 0) {
            cards.innerHTML = '<p class="text-[10px] text-mt/50 text-center py-4">Sem leads nesta fase</p>';
            return;
        }

        leadsColuna.forEach(lead => {
            const tempo = _tempoRelativo(lead.created_at);
            const div = document.createElement('div');
            div.className = 'kanban-card';
            div.innerHTML = `
                <div class="flex items-start justify-between mb-2">
                    <h4 class="text-sm font-bold text-white leading-tight">${lead.nome}</h4>
                    <span class="text-[9px] text-mt flex-shrink-0 ml-2">${tempo}</span>
                </div>
                <p class="text-[10px] text-mt mb-2">${lead.origem || '-'}</p>
                <p class="text-[10px] text-pu mb-3 font-medium">${lead.interesse || '-'}</p>
                <div class="flex items-center gap-2">
                    <button onclick="moverLead('${lead.id}', -1)" class="text-[10px] text-mt hover:text-white px-2 py-1 bg-s3 rounded transition-all" title="Voltar fase">←</button>
                    <button onclick="moverLead('${lead.id}', 1)" class="text-[10px] text-white px-3 py-1 bg-pu rounded transition-all hover:bg-pu/80 flex-1 font-bold">Avançar</button>
                    ${fase === 'fechado' ? `<button onclick="matricularLeadComoAluno('${lead.id}')" class="text-[10px] bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded transition-all font-bold">✓ Matricular</button>` : ''}
                    <button onclick="excluirLead('${lead.id}')" class="text-[10px] text-mt hover:text-red-400 px-1.5 py-1 transition-all" title="Excluir">✕</button>
                </div>
            `;
            cards.appendChild(div);
        });
    });
}

async function moverLead(id, delta) {
    const db = getSupabase();
    if (!db) return;
    const fases = ['novo', 'contato', 'visita', 'teste', 'negociacao', 'fechado', 'perdido'];
    const lead = _leadsCache.find(l => l.id === id);
    if (!lead) return;
    const idx = fases.indexOf(lead.fase);
    const novoIdx = Math.max(0, Math.min(fases.length - 1, idx + delta));
    const novaFase = fases[novoIdx];
    const { error } = await db.from('leads').update({ fase: novaFase }).eq('id', id);
    if (error) { mostrarToast('Erro ao mover lead.', 'erro'); return; }
    mostrarToast(`Lead movido para "${novaFase}"!`);
    renderizarKanban();
}

function excluirLead(id) {
    confirmarAcao('Deseja excluir este lead?', async () => {
        const db = getSupabase();
        if (!db) return;
        const { error } = await db.from('leads').delete().eq('id', id);
        if (error) { mostrarToast('Erro ao excluir lead.', 'erro'); return; }
        renderizarKanban();
    });
}

function matricularLeadComoAluno(id) {
    const lead = _leadsCache.find(l => l.id === id);
    if (!lead) return;
    abrirModalAluno();
    setTimeout(() => {
        const nomeEl = document.getElementById('aluno-nome');
        const telEl = document.getElementById('aluno-telefone');
        if (nomeEl) nomeEl.value = lead.nome;
        if (telEl) telEl.value = lead.telefone || '';
        mostrarToast('Dados do lead carregados no formulário.');
    }, 200);
}

function abrirModalLead(leadExistente = null) {
    const form = document.getElementById('form-lead');
    if (!form) return;
    form.reset();
    document.getElementById('lead-id').value = leadExistente?.id || '';
    if (leadExistente) {
        document.getElementById('lead-nome').value = leadExistente.nome;
        document.getElementById('lead-telefone').value = leadExistente.telefone || '';
        document.getElementById('lead-origem').value = leadExistente.origem || '';
        document.getElementById('lead-fase').value = leadExistente.fase || 'novo';
        document.getElementById('lead-interesse').value = leadExistente.interesse || '';
        document.getElementById('lead-obs').value = leadExistente.obs || '';
    }
    const modal = document.getElementById('modal-lead');
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    form.onsubmit = async (e) => {
        e.preventDefault();
        const db = getSupabase();
        if (!db) return;
        const btn = form.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;

        const existeId = document.getElementById('lead-id').value;
        const dados = {
            nome: document.getElementById('lead-nome').value,
            telefone: document.getElementById('lead-telefone').value,
            origem: document.getElementById('lead-origem').value,
            fase: document.getElementById('lead-fase').value,
            interesse: document.getElementById('lead-interesse').value,
            obs: document.getElementById('lead-obs').value,
        };

        let error;
        if (existeId) {
            ({ error } = await db.from('leads').update(dados).eq('id', existeId));
        } else {
            ({ error } = await db.from('leads').insert([dados]));
        }

        if (btn) btn.disabled = false;
        if (error) { mostrarToast('Erro ao salvar lead.', 'erro'); return; }
        fecharModalLead();
        renderizarKanban();
        mostrarToast('Lead salvo com sucesso!');
    };
}

function fecharModalLead() {
    const modal = document.getElementById('modal-lead');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

// ==========================================
// FINANCEIRO (TABBED)
// ==========================================
function trocarAbaFinanceiro(aba) {
    ['fluxo', 'caixa-loja', 'dre', 'cobrancas'].forEach(a => {
        const tabEl = document.getElementById(`tab-fin-${a}`);
        const contentEl = document.getElementById(`fin-aba-${a}`);
        if (tabEl) tabEl.className = `fin-tab px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-all ${a === aba ? 'text-pu border-pu' : 'text-mt hover:text-white border-transparent'}`;
        if (contentEl) contentEl.classList.toggle('hidden', a !== aba);
    });
    document.getElementById('dashboard-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    if (aba === 'fluxo') filtrarLancamentos();
    if (aba === 'caixa-loja') carregarCaixaLoja();
    if (aba === 'dre') carregarDRE();
    if (aba === 'cobrancas') carregarCobrancasFinanceiro();
}

async function carregarFinanceiro() {
    const db = getSupabase();
    if (!db) return;
    const hoje = new Date();
    const mesAtual = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');

    // Inicializa o filtro de mês
    const mesInput = document.getElementById('fin-mes-filtro');
    if (mesInput && !mesInput.value) mesInput.value = mesAtual;

    // Receita do dia
    const hojeStr = hoje.toISOString().split('T')[0];
    const { data: pagHoje } = await db.from('pagamentos').select('valor').eq('status', 'PAGO').gte('vencimento', hojeStr + 'T00:00:00').lte('vencimento', hojeStr + 'T23:59:59');
    const recDia = (pagHoje || []).reduce((s, p) => s + parseFloat(p.valor || 0), 0);
    const el = document.getElementById('fin-receita-dia');
    if (el) el.textContent = recDia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Receita do mês
    const { data: pagMes } = await db.from('pagamentos').select('valor').eq('mes_referencia', mesAtual).eq('status', 'PAGO');
    const recMes = (pagMes || []).reduce((s, p) => s + parseFloat(p.valor || 0), 0);
    const elMes = document.getElementById('fin-receita-mes');
    if (elMes) elMes.textContent = recMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Inadimplência
    const { data: pagVenc } = await db.from('pagamentos').select('valor').eq('mes_referencia', mesAtual).neq('status', 'PAGO');
    const inadimpl = (pagVenc || []).reduce((s, p) => s + parseFloat(p.valor || 0), 0);
    const elInad = document.getElementById('fin-inadimplencia');
    if (elInad) { elInad.textContent = inadimpl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

    // Despesas do mês
    const { data: despMes } = await db.from('despesas').select('valor').gte('vencimento', mesAtual + '-01').lte('vencimento', fimDoMes(mesAtual)).eq('status', 'PAGO');
    const totalDesp = (despMes || []).reduce((s, d) => s + parseFloat(d.valor || 0), 0);
    const elDesp = document.getElementById('fin-despesas');
    if (elDesp) elDesp.textContent = totalDesp.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Lucro
    const lucro = recMes - totalDesp;
    const elLucro = document.getElementById('fin-lucro');
    if (elLucro) {
        elLucro.textContent = lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        elLucro.className = `text-lg font-bebas tracking-wider ${lucro >= 0 ? 'text-green-400' : 'text-red-400'}`;
    }

    // Previsão (pendentes)
    const { data: pagPend } = await db.from('pagamentos').select('valor').eq('mes_referencia', mesAtual).eq('status', 'PENDENTE');
    const previsao = (pagPend || []).reduce((s, p) => s + parseFloat(p.valor || 0), 0);
    const elPrev = document.getElementById('fin-previsao');
    if (elPrev) elPrev.textContent = previsao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    filtrarLancamentos();
}


async function filtrarLancamentos() {
    const db = getSupabase();
    if (!db) return;
    const tbody = document.getElementById('fin-fluxo-tbody');
    if (!tbody) return;

    const mesInput = document.getElementById('fin-mes-filtro');
    const hoje = new Date();
    const mesRef = mesInput?.value || (hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0'));
    const busca = (document.getElementById('fin-busca')?.value || '').toLowerCase();
    const tipo = document.getElementById('fin-tipo-filtro')?.value || '';

    tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-mt"><i data-lucide="loader-2" class="w-4 h-4 inline animate-spin mr-2"></i>Carregando...</td></tr>';
    if (window.lucide) window.lucide.createIcons({ nodes: [tbody] });

    const [{ data: pagamentos }, { data: despesas }] = await Promise.all([
        db.from('pagamentos').select('id, vencimento, valor, status, mes_referencia, observacao, alunos(nome, plano)').eq('mes_referencia', mesRef).eq('status', 'PAGO'),
        db.from('despesas').select('id, descricao, vencimento, valor, status').gte('vencimento', mesRef + '-01').lte('vencimento', fimDoMes(mesRef)).eq('status', 'PAGO'),
    ]);

    let linhas = [];
    (pagamentos || []).forEach(p => {
        linhas.push({
            data: p.vencimento, tipo: 'receita',
            desc: `${p.alunos?.nome || 'Aluno'} - ${p.alunos?.plano || 'Mensalidade'} Parcela`,
            subDesc: `Aluno: ${p.alunos?.nome || '-'}`,
            categoria: 'Mensalidade', metodo: p.observacao || '-',
            valor: parseFloat(p.valor || 0), positivo: true
        });
    });
    (despesas || []).forEach(d => {
        linhas.push({
            data: d.vencimento, tipo: 'despesa',
            desc: d.descricao, subDesc: '',
            categoria: 'Despesa', metodo: '-',
            valor: parseFloat(d.valor || 0), positivo: false
        });
    });

    linhas.sort((a, b) => new Date(b.data) - new Date(a.data));

    if (busca) linhas = linhas.filter(l => l.desc.toLowerCase().includes(busca) || l.subDesc.toLowerCase().includes(busca));
    if (tipo) linhas = linhas.filter(l => l.tipo === tipo);

    if (linhas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-mt">Nenhum lançamento encontrado para este período.</td></tr>';
        return;
    }

    tbody.innerHTML = linhas.map(l => `
        <tr class="border-b border-bd/30 hover:bg-s2/20 transition-colors">
            <td class="px-4 py-3 text-xs text-mt">${l.data ? new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
            <td class="px-4 py-3">
                <div class="text-sm font-medium">${l.desc}</div>
                ${l.subDesc ? `<div class="text-[10px] text-mt">${l.subDesc}</div>` : ''}
            </td>
            <td class="px-4 py-3 text-xs text-mt">${l.categoria}</td>
            <td class="px-4 py-3 text-xs text-mt">${l.metodo}</td>
            <td class="px-4 py-3 text-right font-bold text-sm ${l.positivo ? 'text-green-400' : 'text-red-400'}">
                ${l.positivo ? '+' : '-'} ${l.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </td>
        </tr>
    `).join('');
}

let _lancamentosCaixaLoja = [];

async function carregarCaixaLoja() {
    const tbody = document.getElementById('fin-caixa-loja-tbody');
    const totalEl = document.getElementById('fin-loja-total');
    if (!tbody) return;

    const db = getSupabase();
    if (!db) return;

    const mesInput = document.getElementById('fin-loja-mes-filtro');
    const hoje = new Date();
    const mesRef = mesInput?.value || (hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0'));
    
    tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-mt"><i data-lucide="loader-2" class="w-4 h-4 inline animate-spin mr-2"></i>Carregando...</td></tr>';
    if (window.lucide) window.lucide.createIcons({ nodes: [tbody] });

    const inicio = mesRef + '-01T00:00:00.000Z';
    const fim = mesRef + '-31T23:59:59.999Z';

    const { data: vendas } = await db.from('vendas')
        .select('created_at, total, itens, metodo, aluno_id')
        .gte('created_at', inicio)
        .lte('created_at', fim);

    _lancamentosCaixaLoja = vendas || [];
    _lancamentosCaixaLoja.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    filtrarCaixaLoja();
}

function filtrarCaixaLoja() {
    const tbody = document.getElementById('fin-caixa-loja-tbody');
    const totalEl = document.getElementById('fin-loja-total');
    const busca = (document.getElementById('fin-loja-busca')?.value || '').toLowerCase();

    let filtrados = _lancamentosCaixaLoja;
    
    if (busca) {
        filtrados = filtrados.filter(v => {
            const itensStr = (v.itens || []).map(i => i.nome).join(' ').toLowerCase();
            return itensStr.includes(busca);
        });
    }

    const total = filtrados.reduce((acc, v) => acc + parseFloat(v.total || 0), 0);
    if (totalEl) totalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (filtrados.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="py-8 text-center text-mt">Nenhuma venda encontrada no período.</td></tr>';
        return;
    }

    tbody.innerHTML = filtrados.map(v => {
        const dataFormatada = new Date(v.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
        const itensDesc = (v.itens || []).map(i => `${i.qty}x ${i.nome}`).join('<br>');
        return `
        <tr class="border-b border-bd/30 hover:bg-s2/20 transition-colors">
            <td class="px-4 py-3 text-xs text-mt">${dataFormatada}</td>
            <td class="px-4 py-3 text-sm font-medium">${itensDesc}</td>
            <td class="px-4 py-3 text-xs text-mt capitalize">${v.metodo || 'Dinheiro'}</td>
            <td class="px-4 py-3 text-right font-bold text-sm text-green-400">
                + ${parseFloat(v.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </td>
        </tr>
        `;
    }).join('');
}

async function carregarDRE() {
    const db = getSupabase();
    if (!db) return;
    const hoje = new Date();
    const mesRef = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const label = document.getElementById('dre-mes-label');
    if (label) label.textContent = meses[hoje.getMonth()] + ' ' + hoje.getFullYear();

    const [{ data: pags }, { data: desps }] = await Promise.all([
        db.from('pagamentos').select('valor, status').eq('mes_referencia', mesRef).eq('status', 'PAGO'),
        db.from('despesas').select('valor, descricao').gte('vencimento', mesRef + '-01').lte('vencimento', fimDoMes(mesRef)).eq('status', 'PAGO'),
    ]);

    const receita = (pags || []).reduce((s, p) => s + parseFloat(p.valor || 0), 0);
    const despTotal = (desps || []).reduce((s, d) => s + parseFloat(d.valor || 0), 0);
    const lucro = receita - despTotal;
    const margem = receita > 0 ? ((lucro / receita) * 100).toFixed(1) : '0.0';

    const content = document.getElementById('dre-content');
    if (!content) return;
    content.innerHTML = `
        <div class="flex justify-between py-3 border-b border-bd/30">
            <span class="font-bold">Receita Bruta (Mensalidades)</span>
            <span class="text-green-400 font-bold">${receita.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div class="flex justify-between py-3 border-b border-bd/30">
            <span class="text-mt">(-) Total de Despesas Pagas</span>
            <span class="text-red-400">- ${despTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div class="flex justify-between py-3 border-b border-bd font-bold text-lg">
            <span>Lucro Operacional Líquido</span>
            <span class="${lucro >= 0 ? 'text-green-400' : 'text-red-400'}">${lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
        <div class="flex justify-between py-2 text-sm text-mt">
            <span>Margem de Lucro</span>
            <span class="${lucro >= 0 ? 'text-green-400' : 'text-red-400'}">${margem}%</span>
        </div>
        <div class="mt-4 p-3 bg-s2/50 rounded-xl text-xs text-mt">
            <p class="font-bold mb-1">Detalhamento de Despesas:</p>
            ${(desps || []).map(d => `<div class="flex justify-between"><span>${d.descricao}</span><span class="text-red-400">- R$ ${parseFloat(d.valor || 0).toFixed(2)}</span></div>`).join('') || '<p>Nenhuma despesa cadastrada.</p>'}
        </div>
    `;
}

async function carregarCobrancasFinanceiro() {
    const db = getSupabase();
    if (!db) return;
    const tbody = document.getElementById('fin-cobrancas-tbody');
    if (!tbody) return;
    const hoje = new Date();
    const mesRef = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');

    tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-mt">Carregando cobranças...</td></tr>';
    const { data } = await db.from('pagamentos').select('*, alunos(nome, plano, telefone)').eq('mes_referencia', mesRef).neq('status', 'PAGO').order('vencimento');

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-mt text-green-400">Sem inadimplências este mês!</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(p => {
        const venc = new Date(p.vencimento + 'T00:00:00');
        const hoje2 = new Date(); hoje2.setHours(0, 0, 0, 0);
        const atrasado = venc < hoje2;
        const statusCor = atrasado ? 'red' : 'yellow';
        const statusLabel = atrasado ? 'Vencido' : 'Pendente';
        return `
            <tr class="border-b border-bd/30 hover:bg-s2/20 transition-colors">
                <td class="px-4 py-3 text-sm">${p.alunos?.nome || '-'}</td>
                <td class="px-4 py-3 text-xs text-mt">${p.alunos?.plano || '-'}</td>
                <td class="px-4 py-3 text-xs text-mt">${venc.toLocaleDateString('pt-BR')}</td>
                <td class="px-4 py-3 text-sm font-bold">R$ ${parseFloat(p.valor || 0).toFixed(2)}</td>
                <td class="px-4 py-3"><span class="text-[10px] font-bold bg-${statusCor}-500/15 text-${statusCor}-400 px-2 py-0.5 rounded-full">${statusLabel}</span></td>
                <td class="px-4 py-3 text-right">
                    <button onclick='enviarCobrancaWhatsApp(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ml-auto">
                        <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>Cobrar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    if (window.lucide) window.lucide.createIcons({ nodes: [tbody] });
}


// ==========================================
// CHAMADA & FREQUÊNCIA (Supabase)
// ==========================================

let _presencasDoDia = []; // cache: array de aluno_ids presentes na data selecionada

function _getDataFreq() {
    const input = document.getElementById('freq-data');
    if (input?.value) return input.value;
    const h = new Date();
    return h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0') + '-' + String(h.getDate()).padStart(2, '0');
}

async function carregarFrequencia() {
    // Inicializa data de hoje
    const h = new Date();
    const hojeStr = h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0') + '-' + String(h.getDate()).padStart(2, '0');
    const input = document.getElementById('freq-data');
    if (input && !input.value) input.value = hojeStr;

    await renderizarFrequencia();
}

async function renderizarFrequencia() {
    const db = getSupabase();
    const container = document.getElementById('freq-lista-alunos');
    if (!container) return;

    container.innerHTML = '<p class="text-mt text-sm text-center py-8">Carregando...</p>';

    let alunos = _todosAlunos;
    if (!alunos || alunos.length === 0) {
        if (db) {
            const { data } = await db.from('alunos').select('id, nome, telefone, plano, status, pagamentos(status, vencimento)').order('nome');
            alunos = data || [];
        } else { alunos = []; }
    }

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const buscaTermo = (document.getElementById('freq-busca')?.value || '').toLowerCase();
    const statusFiltro = document.getElementById('freq-status-filtro')?.value || '';

    let lista = alunos;
    if (buscaTermo) lista = lista.filter(a => (a.nome || '').toLowerCase().includes(buscaTermo) || (a.telefone || '').includes(buscaTermo));
    if (statusFiltro) lista = lista.filter(a => a.status === statusFiltro);

    const dataRef = _getDataFreq();
    // Busca presenças do dia no Supabase
    if (db) {
        const { data: freqData } = await db.from('frequencias').select('aluno_id').eq('data', dataRef);
        _presencasDoDia = (freqData || []).map(f => f.aluno_id);
    }
    const presentes = _presencasDoDia;

    const inadimplentes = alunos.filter(a => (a.pagamentos || []).some(p => p.status !== 'PAGO' && new Date(p.vencimento + 'T00:00:00') < hoje)).length;

    const countEl = document.getElementById('freq-presentes-count');
    if (countEl) countEl.textContent = presentes.length;
    const totalEl = document.getElementById('freq-total-count');
    if (totalEl) totalEl.textContent = alunos.filter(a => a.status === 'ATIVO').length;
    const inadEl = document.getElementById('freq-inadimplentes-count');
    if (inadEl) inadEl.textContent = inadimplentes;

    if (lista.length === 0) {
        container.innerHTML = '<p class="text-mt text-sm text-center py-8">Nenhum aluno encontrado.</p>';
    } else {
        container.innerHTML = lista.map(aluno => {
            const isPresente = presentes.includes(aluno.id);
            const iniciais = aluno.nome.substring(0, 2).toUpperCase();
            const inadimplente = (aluno.pagamentos || []).some(p => p.status !== 'PAGO' && new Date(p.vencimento + 'T00:00:00') < hoje);
            return `
                <div class="flex items-center justify-between px-4 py-3 hover:bg-s2/30 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 ${isPresente ? 'bg-green-500/20 text-green-400' : inadimplente ? 'bg-red-500/20 text-red-400' : 'bg-pu/20 text-pu'} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">${iniciais}</div>
                        <div>
                            <div class="text-sm font-medium">${aluno.nome}</div>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="text-[9px] ${inadimplente ? 'text-red-400' : 'text-mt'}">${aluno.plano || '-'}</span>
                                ${inadimplente ? '<span class="text-[9px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Vencido</span>' : ''}
                                ${aluno.status !== 'ATIVO' ? `<span class="text-[9px] font-bold text-gray-400 bg-gray-500/10 px-1.5 py-0.5 rounded">${aluno.status}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <button onclick="togglePresenca('${aluno.id}')"
                        class="text-xs font-bold px-4 py-2 rounded-xl transition-all ${isPresente ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30' : 'bg-s2 border border-bd text-mt hover:bg-green-600 hover:text-white hover:border-green-600'}">
                        ${isPresente ? '✓ Presente' : 'Registrar Presença'}
                    </button>
                </div>
            `;
        }).join('');
    }

    _renderizarPresentesPanel(presentes, alunos);
}

function filtrarFrequencia(termo) {
    renderizarFrequencia();
}

async function togglePresenca(alunoId) {
    const db = getSupabase();
    if (!db) return;
    const dataRef   = _getDataFreq();
    const isPresente = _presencasDoDia.includes(alunoId);
    const novoEstado = !isPresente;

    // Atualiza UI imediatamente — sem re-renderizar a lista, sem resetar scroll
    if (novoEstado) {
        _presencasDoDia.push(alunoId);
    } else {
        _presencasDoDia = _presencasDoDia.filter(id => id !== alunoId);
    }
    _atualizarLinhaPresenca(alunoId, novoEstado);
    const countEl = document.getElementById('freq-presentes-count');
    if (countEl) countEl.textContent = _presencasDoDia.length;
    _renderizarPresentesPanel(_presencasDoDia, _todosAlunos || []);

    // Persiste no banco
    if (isPresente) {
        const { error } = await db.from('frequencias').delete().eq('aluno_id', alunoId).eq('data', dataRef);
        if (error) {
            // Reverte em caso de falha
            _presencasDoDia.push(alunoId);
            _atualizarLinhaPresenca(alunoId, true);
            if (countEl) countEl.textContent = _presencasDoDia.length;
            mostrarToast('Erro ao remover presença.', 'erro');
            return;
        }
        mostrarToast('Presença removida.');
    } else {
        const { error } = await db.from('frequencias').insert([{ aluno_id: alunoId, data: dataRef }]);
        if (error) {
            // Reverte em caso de falha
            _presencasDoDia = _presencasDoDia.filter(id => id !== alunoId);
            _atualizarLinhaPresenca(alunoId, false);
            if (countEl) countEl.textContent = _presencasDoDia.length;
            mostrarToast('Erro ao registrar presença.', 'erro');
            return;
        }
        mostrarToast('Presença registrada!');
    }
}

function _atualizarLinhaPresenca(alunoId, isPresente) {
    const btn = document.querySelector(`#freq-lista-alunos button[onclick*="${alunoId}"]`);
    if (!btn) return;

    btn.className = `text-xs font-bold px-4 py-2 rounded-xl transition-all ${isPresente
        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
        : 'bg-s2 border border-bd text-mt hover:bg-green-600 hover:text-white hover:border-green-600'}`;
    btn.textContent = isPresente ? '✓ Presente' : 'Registrar Presença';

    const row = btn.closest('.flex.items-center.justify-between');
    if (!row) return;
    const avatar = row.querySelector('.rounded-full');
    if (avatar) {
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
        const aluno = (_todosAlunos || []).find(a => String(a.id) === String(alunoId));
        const inadimplente = aluno && (aluno.pagamentos || []).some(
            p => p.status !== 'PAGO' && new Date(p.vencimento + 'T00:00:00') < hoje
        );
        avatar.className = `w-9 h-9 ${isPresente
            ? 'bg-green-500/20 text-green-400'
            : inadimplente ? 'bg-red-500/20 text-red-400' : 'bg-pu/20 text-pu'
        } rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0`;
    }
}

function _renderizarPresentesPanel(presentesIds, alunos) {
    const panel = document.getElementById('freq-presentes-lista');
    const badge = document.getElementById('freq-presentes-badge');
    if (!panel) return;
    if (badge) badge.textContent = presentesIds.length + ' Presentes';

    if (presentesIds.length === 0) {
        panel.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-center">
                <i data-lucide="clipboard" class="w-8 h-8 text-mt/40 mb-2"></i>
                <p class="text-xs text-mt">Nenhum registro de presença nesta data.</p>
            </div>`;
        if (window.lucide) window.lucide.createIcons({ nodes: [panel] });
        return;
    }

    panel.innerHTML = presentesIds.map(id => {
        const a = alunos.find(al => al.id === id);
        if (!a) return '';
        const iniciais = a.nome.substring(0, 2).toUpperCase();
        return `<div class="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div class="w-7 h-7 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-[10px] font-bold">${iniciais}</div>
            <span class="text-xs font-medium">${a.nome}</span>
            <button onclick="togglePresenca('${id}')" class="ml-auto text-mt hover:text-red-400 transition-colors text-xs">✕</button>
        </div>`;
    }).join('');
}

// ── Modal Alunos Ausentes ─────────────────────────────────────────────────────
function abrirModalAusentes() {
    const modal = document.getElementById('modal-ausentes');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) lucide.createIcons({ nodes: [modal] });
    buscarAusentes(parseInt(document.getElementById('ausentes-dias')?.value) || 3);
}

function fecharModalAusentes() {
    const modal = document.getElementById('modal-ausentes');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

async function buscarAusentes(dias) {
    const container = document.getElementById('ausentes-lista');
    const countEl   = document.getElementById('ausentes-count');
    if (!container) return;

    container.innerHTML = '<div class="text-center py-10 text-mt text-sm animate-pulse">Buscando alunos ausentes...</div>';

    const db = getSupabase();
    if (!db) return;

    // Datas do período (hoje inclusive)
    const datas = [];
    for (let i = 0; i < dias; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        datas.push(d.toISOString().split('T')[0]);
    }

    // Quem compareceu no período?
    const { data: presencas } = await db
        .from('frequencias')
        .select('aluno_id')
        .in('data', datas);

    const presentesIds = new Set((presencas || []).map(p => String(p.aluno_id)));

    // Alunos ativos sem presença no período
    const ausentes = (_todosAlunos || []).filter(a => a.status === 'ATIVO' && !presentesIds.has(String(a.id)));

    if (countEl) countEl.textContent = ausentes.length;

    if (ausentes.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center py-12 text-center">
                <i data-lucide="check-circle" class="w-10 h-10 text-green-400 mb-3"></i>
                <p class="font-bold text-white">Nenhum aluno ausente!</p>
                <p class="text-sm text-mt mt-1">Todos compareceram nos últimos ${dias} dia(s). 🎉</p>
            </div>`;
        if (window.lucide) lucide.createIcons({ nodes: [container] });
        return;
    }

    // Última presença de cada ausente
    const ausentesIds = ausentes.map(a => a.id);
    const { data: historico } = await db
        .from('frequencias')
        .select('aluno_id, data')
        .in('aluno_id', ausentesIds)
        .order('data', { ascending: false });

    const ultimaPresencaMap = {};
    for (const row of historico || []) {
        if (!ultimaPresencaMap[row.aluno_id]) ultimaPresencaMap[row.aluno_id] = row.data;
    }

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    // Ordenar: mais dias ausente primeiro; "nunca compareceu" vai para o final
    ausentes.sort((a, b) => {
        const hasA = !!ultimaPresencaMap[a.id];
        const hasB = !!ultimaPresencaMap[b.id];
        if (!hasA && !hasB) return 0;
        if (!hasA) return 1;
        if (!hasB) return -1;
        return new Date(ultimaPresencaMap[a.id] + 'T00:00:00') - new Date(ultimaPresencaMap[b.id] + 'T00:00:00');
    });

    container.innerHTML = ausentes.map(aluno => {
        const iniciais   = aluno.nome.substring(0, 2).toUpperCase();
        const ultima     = ultimaPresencaMap[aluno.id];
        const diasAus    = ultima
            ? Math.floor((hoje - new Date(ultima + 'T00:00:00')) / 86400000)
            : null;
        const ultimaLabel = ultima
            ? `Último treino: ${new Date(ultima + 'T00:00:00').toLocaleDateString('pt-BR')} · <strong class="text-orange-400">${diasAus} dias atrás</strong>`
            : '<span class="text-mt/60">Nunca compareceu</span>';

        const tel = (aluno.telefone || '').replace(/\D/g, '');
        const telWpp = tel.length >= 10 ? (tel.startsWith('55') ? tel : '55' + tel) : '';
        const primeiroNome = aluno.nome.split(' ')[0];
        const msg = encodeURIComponent(
            `Oi, ${primeiroNome}! 👋 A equipe do Studio Focus está com saudade de você!\n\nFaz alguns dias que não te vemos por aqui... Sabemos que a rotina pode ser corrida, mas seus treinos fazem toda a diferença para a sua saúde e bem-estar! 💪\n\nQue tal aparecer hoje? Estamos esperando por você! 🏋️🔥`
        );

        return `
        <div class="flex items-center justify-between px-4 py-3 border-b border-bd/40 last:border-0 hover:bg-s2/30 transition-colors gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">${iniciais}</div>
                <div class="min-w-0">
                    <p class="text-sm font-medium truncate">${aluno.nome}</p>
                    <p class="text-xs mt-0.5">${ultimaLabel}</p>
                </div>
            </div>
            ${telWpp
                ? `<a href="https://wa.me/${telWpp}?text=${msg}" target="_blank" rel="noopener"
                       class="flex-shrink-0 flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all whitespace-nowrap">
                       <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> WhatsApp
                   </a>`
                : `<span class="flex-shrink-0 text-xs text-mt/40 whitespace-nowrap">Sem telefone</span>`
            }
        </div>`;
    }).join('');

    if (window.lucide) lucide.createIcons({ nodes: [container] });
}

async function registrarPresencaEmMassa() {
    const db = getSupabase();
    if (!db) return;
    const dataRef = _getDataFreq();
    const ativos = _todosAlunos.filter(a => a.status === 'ATIVO');
    if (ativos.length === 0) { mostrarToast('Nenhum aluno ativo encontrado.', 'erro'); return; }

    // Remove presenças existentes do dia e reinsere todos
    await db.from('frequencias').delete().eq('data', dataRef);
    const registros = ativos.map(a => ({ aluno_id: a.id, data: dataRef }));
    const { error } = await db.from('frequencias').insert(registros);
    if (error) { mostrarToast('Erro ao registrar presenças.', 'erro'); return; }
    renderizarFrequencia();
    mostrarToast(`${ativos.length} alunos registrados como presentes!`);
}

// ==========================================
// MARKETING DIGITAL (Supabase)
// ==========================================

async function carregarMarketing() {
    await renderizarCampanhas();
    _atualizarBtnDisparar();
}

function _atualizarBtnDisparar() {
    const segmento = document.getElementById('mkt-segmento')?.value || 'ativos';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    let count = 0;
    if (segmento === 'ativos') count = _todosAlunos.filter(a => a.status === 'ATIVO').length;
    else if (segmento === 'inativos') count = _todosAlunos.filter(a => a.status === 'INATIVO').length;
    else if (segmento === 'inadimplentes') count = _todosAlunos.filter(a => (a.pagamentos || []).some(p => p.status !== 'PAGO' && new Date(p.vencimento + 'T00:00:00') < hoje)).length;
    else count = _todosAlunos.length;
    const label = document.getElementById('btn-disparar-label');
    if (label) label.textContent = `Disparar agora (${count} Alunos)`;
}

async function renderizarCampanhas() {
    const db = getSupabase();
    const lista = document.getElementById('mkt-campanhas-lista');
    if (!lista) return;
    lista.innerHTML = '<p class="text-mt text-xs text-center py-4 animate-pulse">Carregando campanhas...</p>';
    let campanhas = [];
    if (db) {
        const { data } = await db.from('campanhas').select('*').order('created_at', { ascending: false });
        campanhas = data || [];
    }
    if (campanhas.length === 0) {
        lista.innerHTML = '<p class="text-mt text-xs text-center py-8">Nenhuma campanha cadastrada.</p>';
        return;
    }
    lista.innerHTML = campanhas.map(c => {
        const statusCor = c.status === 'ativa' ? 'green' : c.status === 'agendada' ? 'blue' : 'gray';
        const statusLabel = c.status === 'ativa' ? 'Ativa' : c.status === 'agendada' ? 'Agendada' : 'Pausada';
        return `
            <div class="flex items-start justify-between p-4 bg-s2/50 border border-bd rounded-xl">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                        <h4 class="font-bold text-sm truncate">${c.nome}</h4>
                        <span class="flex-shrink-0 text-[9px] font-bold bg-${statusCor}-500/15 text-${statusCor}-400 px-2 py-0.5 rounded-full">${statusLabel}</span>
                    </div>
                    <p class="text-[10px] text-mt">Canal: ${c.canal} | Data: ${c.data_inicio ? new Date(c.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</p>
                    <div class="flex items-center gap-4 mt-1.5">
                        <span class="text-[10px]">Leads: <strong class="text-pu">${c.leads || 0}</strong></span>
                        <span class="text-[10px]">Vendas: <strong class="text-green-400">${c.vendas || 0}</strong></span>
                    </div>
                </div>
                <button onclick="excluirCampanha('${c.id}')" class="ml-3 text-mt hover:text-red-400 transition-colors p-1 flex-shrink-0">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `;
    }).join('');
    if (window.lucide) window.lucide.createIcons({ nodes: [lista] });
}

function excluirCampanha(id) {
    confirmarAcao('Excluir esta campanha?', async () => {
        const db = getSupabase();
        if (!db) return;
        const { error } = await db.from('campanhas').delete().eq('id', id);
        if (error) { mostrarToast('Erro ao excluir campanha.', 'erro'); return; }
        renderizarCampanhas();
    });
}

function abrirModalCampanha() {
    const modal = document.getElementById('modal-campanha');
    if (!modal) return;
    document.getElementById('form-campanha').reset();
    document.getElementById('campanha-id').value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('form-campanha').onsubmit = async (e) => {
        e.preventDefault();
        const db = getSupabase();
        if (!db) return;
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        const dados = {
            nome: document.getElementById('campanha-nome').value,
            canal: document.getElementById('campanha-canal').value,
            data_inicio: document.getElementById('campanha-data').value || null,
            status: document.getElementById('campanha-status').value,
            leads: 0, vendas: 0
        };
        const { error } = await db.from('campanhas').insert([dados]);
        if (btn) btn.disabled = false;
        if (error) { mostrarToast('Erro ao salvar campanha.', 'erro'); return; }
        fecharModalCampanha();
        renderizarCampanhas();
        mostrarToast('Campanha criada com sucesso!');
    };
}

function fecharModalCampanha() {
    const modal = document.getElementById('modal-campanha');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

async function dispararMensagemMassa() {
    const mensagem = document.getElementById('mkt-mensagem')?.value.trim();
    if (!mensagem) { mostrarToast('Digite a mensagem antes de disparar.', 'erro'); return; }

    const segmento = document.getElementById('mkt-segmento')?.value || 'ativos';
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    let alvos = _todosAlunos;
    if (segmento === 'ativos') alvos = _todosAlunos.filter(a => a.status === 'ATIVO');
    else if (segmento === 'inativos') alvos = _todosAlunos.filter(a => a.status === 'INATIVO');
    else if (segmento === 'inadimplentes') alvos = _todosAlunos.filter(a => (a.pagamentos || []).some(p => p.status !== 'PAGO' && new Date(p.vencimento + 'T00:00:00') < hoje));

    const alvosComTelefone = alvos.filter(a => a.telefone);

    if (alvosComTelefone.length === 0) {
        mostrarToast('Nenhum aluno com telefone no segmento selecionado.', 'erro');
        return;
    }

    const container = document.getElementById('mkt-links-container');
    const lista = document.getElementById('mkt-links-lista');
    if (container) container.classList.remove('hidden');

    lista.innerHTML = alvosComTelefone.map(a => {
        const primeiro = a.nome.split(' ')[0];
        const texto = mensagem.replace(/{nome}/g, primeiro);
        const telLimpo = a.telefone.replace(/\D/g, '');
        // Se houver imagem, abre como link direto (usuário envia manualmente)
        const imgInput = document.getElementById('mkt-imagem');
        const temImagem = imgInput && imgInput.files.length > 0;
        const url = temImagem
            ? `https://wa.me/55${telLimpo}?text=${encodeURIComponent('📎 [Enviar a imagem anexada]\n\n' + texto)}`
            : `https://wa.me/55${telLimpo}?text=${encodeURIComponent(texto)}`;
        return `
            <a href="${url}" target="_blank" rel="noopener"
                class="flex items-center justify-between p-3 bg-s2 border border-bd hover:border-green-500 rounded-xl transition-all group">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0">${a.nome.substring(0, 2).toUpperCase()}</div>
                    <span class="text-sm font-medium group-hover:text-green-400 transition-colors">${a.nome}</span>
                </div>
                <i data-lucide="external-link" class="w-4 h-4 text-mt group-hover:text-green-400 transition-colors"></i>
            </a>
        `;
    }).join('');
    if (window.lucide) window.lucide.createIcons({ nodes: [lista] });
    mostrarToast(`${alvosComTelefone.length} links de WhatsApp gerados!`);
}

function mktPreviewImagem(input) {
    const file = input.files[0];
    const label = document.getElementById('mkt-imagem-label');
    const preview = document.getElementById('mkt-imagem-preview');
    const btnLimpar = document.getElementById('mkt-btn-limpar-img');
    if (file) {
        if (label) label.textContent = file.name;
        if (preview) {
            preview.src = URL.createObjectURL(file);
            preview.classList.remove('hidden');
        }
        if (btnLimpar) { btnLimpar.classList.remove('hidden'); btnLimpar.classList.add('flex'); }
    }
    if (window.lucide) window.lucide.createIcons();
}

function mktLimparImagem() {
    const input = document.getElementById('mkt-imagem');
    const label = document.getElementById('mkt-imagem-label');
    const preview = document.getElementById('mkt-imagem-preview');
    const btnLimpar = document.getElementById('mkt-btn-limpar-img');
    if (input) input.value = '';
    if (label) label.textContent = 'Selecionar imagem...';
    if (preview) { preview.src = ''; preview.classList.add('hidden'); }
    if (btnLimpar) { btnLimpar.classList.add('hidden'); btnLimpar.classList.remove('flex'); }
}

// ==========================================
// LOJA / ESTOQUE (PDV - Supabase)
// ==========================================

let _carrinhoItens = [];
let _descontoTipo = '%';
let _produtosCache = [];

async function carregarLoja() {
    const db = getSupabase();
    if (db) {
        const { data } = await db.from('produtos').select('*').order('nome');
        _produtosCache = data || [];
    }
    renderizarGridProdutos(_produtosCache);
    renderizarEstoqueTabela(_produtosCache);
    atualizarCarrinho();
    carregarAlunosNoSelect('pdv-aluno');
}

function trocarAbaLoja(aba) {
    const abas = ['pdv', 'estoque', 'historico', 'graficos'];
    abas.forEach(a => {
        const btn = document.getElementById('btn-' + a);
        const el = document.getElementById('loja-aba-' + a);
        const ativo = a === aba;
        if (btn) btn.className = `loja-tab-btn ${ativo ? 'bg-pu text-white' : 'bg-s2 border border-bd text-mt hover:bg-s3'} text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5`;
        if (el) el.classList.toggle('hidden', !ativo);
    });
    if (aba === 'historico') carregarHistoricoVendas();
    if (aba === 'graficos') carregarGraficosVendas();
}


function filtrarProdutosPDV(termo) {
    const filtrado = termo ? _produtosCache.filter(p => (p.nome + (p.marca||'') + (p.sabores||'')).toLowerCase().includes(termo.toLowerCase())) : _produtosCache;
    renderizarGridProdutos(filtrado);
}

function renderizarGridProdutos(produtos) {
    const grid = document.getElementById('pdv-grid-produtos');
    if (!grid) return;
    if (produtos.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-mt text-sm text-center py-8">Nenhum produto encontrado.</p>';
        return;
    }
    grid.innerHTML = produtos.map(p => {
        const semEstoque = p.estoque <= 0;
        return `
            <div onclick="${semEstoque ? '' : `adicionarAoCarrinho('${p.id}')`}"
                class="glass p-4 rounded-xl border border-bd ${semEstoque ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-pu hover:shadow-lg hover:shadow-pu/10'} transition-all">
                <div class="w-full aspect-square bg-s2 rounded-lg mb-3 flex items-center justify-center">
                    <i data-lucide="package" class="w-8 h-8 text-mt/40"></i>
                </div>
                <h4 class="text-xs font-bold leading-tight mb-1">${p.nome}</h4>
                <p class="text-[10px] text-mt mb-1">Marca: ${p.marca || '-'}</p>
                ${p.sabores ? `<p class="text-[10px] text-mt mb-2">Sabores: ${p.sabores}</p>` : ''}
                <div class="flex items-center justify-between">
                    <span class="font-bebas text-lg tracking-wider text-pu">R$&nbsp;${parseFloat(p.preco || 0).toFixed(2)}</span>
                    <span class="text-[9px] ${semEstoque ? 'text-red-400' : 'text-mt'}">${semEstoque ? 'Sem estoque' : p.estoque + ' un.'}</span>
                </div>
            </div>
        `;
    }).join('');
    if (window.lucide) window.lucide.createIcons({ nodes: [grid] });
}

function renderizarEstoqueTabela(produtos) {
    const tbody = document.getElementById('loja-estoque-tbody');
    if (!tbody) return;
    if (!produtos) produtos = _produtosCache;
    if (produtos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-mt">Nenhum produto cadastrado.</td></tr>';
        return;
    }
    tbody.innerHTML = produtos.map(p => `
        <tr class="border-b border-bd/30 hover:bg-s2/20 transition-colors">
            <td class="px-4 py-3 text-sm font-medium">${p.nome}</td>
            <td class="px-4 py-3 text-xs text-mt">${p.marca || '-'}</td>
            <td class="px-4 py-3 text-sm font-bold text-pu">R$ ${parseFloat(p.preco || 0).toFixed(2)}</td>
            <td class="px-4 py-3"><span class="text-sm font-bold ${(p.estoque || 0) <= 3 ? 'text-red-400' : 'text-green-400'}">${p.estoque || 0} un.</span></td>
            <td class="px-4 py-3 text-right">
                <button onclick='editarProduto(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="p-1.5 text-mt hover:text-pu transition-colors"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                <button onclick="excluirProduto('${p.id}')" class="p-1.5 text-mt hover:text-red-500 transition-colors"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        </tr>
    `).join('');
    if (window.lucide) window.lucide.createIcons({ nodes: [tbody] });
}

let _produtoAguardandoSabor = null;

function adicionarAoCarrinho(produtoId) {
    const produto = _produtosCache.find(p => p.id === produtoId);
    if (!produto) return;

    if (produto.sabores && produto.sabores.trim() !== '') {
        _produtoAguardandoSabor = produto;
        const listaSabores = produto.sabores.split(',').map(s => s.trim()).filter(s => s);
        
        const divSabores = document.getElementById('lista-sabores-pdv');
        if (divSabores) {
            divSabores.innerHTML = listaSabores.map(sabor => `
                <button onclick="adicionarSaborSelecionado('${sabor}')" class="w-full text-left px-4 py-3 bg-s2 hover:bg-pu rounded-lg transition-colors font-bold text-sm border border-bd hover:border-transparent">
                    ${sabor}
                </button>
            `).join('');
        }
        document.getElementById('modal-sabores-pdv').classList.remove('hidden');
        document.getElementById('modal-sabores-pdv').classList.add('flex');
        return;
    }

    processarAdicaoCarrinho(produto, produtoId);
}

function fecharModalSaboresPdv() {
    _produtoAguardandoSabor = null;
    document.getElementById('modal-sabores-pdv').classList.add('hidden');
    document.getElementById('modal-sabores-pdv').classList.remove('flex');
}

function adicionarSaborSelecionado(sabor) {
    if (!_produtoAguardandoSabor) return;
    const prodSabor = { ..._produtoAguardandoSabor, nome: `${_produtoAguardandoSabor.nome} (${sabor})` };
    const fakeId = `${_produtoAguardandoSabor.id}_${sabor}`; // ID composto para não misturar sabores diferentes no carrinho
    processarAdicaoCarrinho(prodSabor, fakeId, _produtoAguardandoSabor.id);
    fecharModalSaboresPdv();
}

function processarAdicaoCarrinho(produto, cartItemId, originalId = null) {
    const origId = originalId || cartItemId;
    const origProd = _produtosCache.find(p => p.id === origId);
    const existe = _carrinhoItens.find(i => i.cartId === cartItemId);
    
    // Calcula quantos itens do produto original já existem no carrinho (independente do sabor)
    const qtdTotalNoCarrinho = _carrinhoItens.filter(i => i.id === origId).reduce((acc, i) => acc + i.qty, 0);

    if (existe) {
        if (qtdTotalNoCarrinho < origProd.estoque) existe.qty++;
        else { mostrarToast('Estoque insuficiente.', 'erro'); return; }
    } else {
        if (qtdTotalNoCarrinho < origProd.estoque) {
            _carrinhoItens.push({ ...produto, id: origId, cartId: cartItemId, qty: 1 });
        } else {
            mostrarToast('Estoque insuficiente.', 'erro'); return;
        }
    }
    atualizarCarrinho();
    mostrarToast(`${produto.nome.split(' ').slice(0, 2).join(' ')} adicionado!`);
}

function removerDoCarrinho(cartItemId) {
    _carrinhoItens = _carrinhoItens.filter(i => (i.cartId || i.id) !== cartItemId);
    atualizarCarrinho();
}

function atualizarCarrinho() {
    const container = document.getElementById('pdv-carrinho-itens');
    const qtdEl = document.getElementById('pdv-qtd-itens');
    if (!container) return;

    if (_carrinhoItens.length === 0) {
        container.innerHTML = '<p class="text-xs text-mt text-center py-8">Carrinho vazio. Selecione produtos ao lado.</p>';
        const qtdTotal = 0;
        if (qtdEl) qtdEl.textContent = '0 un.';
    } else {
        const totalQtd = _carrinhoItens.reduce((s, i) => s + i.qty, 0);
        if (qtdEl) qtdEl.textContent = totalQtd + ' un.';
        container.innerHTML = _carrinhoItens.map(item => `
            <div class="flex items-center gap-2 p-2 bg-s2/50 border border-bd/40 rounded-lg">
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium truncate">${item.nome}</p>
                    <p class="text-[10px] text-mt">R$ ${parseFloat(item.preco).toFixed(2)} × ${item.qty}</p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="alterarQtyCarrinho('${item.cartId || item.id}', -1)" class="w-6 h-6 bg-s3 rounded text-mt hover:text-white transition-colors text-sm font-bold">−</button>
                    <span class="text-xs font-bold w-5 text-center">${item.qty}</span>
                    <button onclick="alterarQtyCarrinho('${item.cartId || item.id}', 1)" class="w-6 h-6 bg-s3 rounded text-mt hover:text-white transition-colors text-sm font-bold">+</button>
                    <button onclick="removerDoCarrinho('${item.cartId || item.id}')" class="w-6 h-6 text-mt hover:text-red-400 transition-colors text-sm ml-1">✕</button>
                </div>
            </div>
        `).join('');
    }
    recalcularCarrinho();
}

function alterarQtyCarrinho(cartItemId, delta) {
    const item = _carrinhoItens.find(i => (i.cartId || i.id) === cartItemId);
    if (!item) return;
    const produto = _produtosCache.find(p => p.id === item.id);
    
    // Total of this real product in the cart (sum of all flavors)
    const qtdTotalNoCarrinho = _carrinhoItens.filter(i => i.id === item.id).reduce((acc, i) => acc + i.qty, 0);
    const qtdOutrosSabores = qtdTotalNoCarrinho - item.qty;
    const maxQtyParaEsteSabor = (produto?.estoque || 999) - qtdOutrosSabores;
    
    item.qty = Math.max(1, Math.min(item.qty + delta, maxQtyParaEsteSabor));
    atualizarCarrinho();
}

function recalcularCarrinho() {
    const subtotal = _carrinhoItens.reduce((s, i) => s + parseFloat(i.preco) * i.qty, 0);
    const descVal = parseFloat(document.getElementById('pdv-desconto')?.value || 0) || 0;
    let total = subtotal;
    if (_descontoTipo === '%') total = subtotal * (1 - descVal / 100);
    else total = Math.max(0, subtotal - descVal);

    const subEl = document.getElementById('pdv-subtotal');
    const totEl = document.getElementById('pdv-total');
    if (subEl) subEl.textContent = 'R$ ' + subtotal.toFixed(2);
    if (totEl) totEl.textContent = 'R$ ' + total.toFixed(2);
}

function pdvSetDescontoTipo(tipo) {
    _descontoTipo = tipo;
    const pctBtn = document.getElementById('pdv-desc-pct');
    const rsBtn = document.getElementById('pdv-desc-rs');
    if (pctBtn) pctBtn.className = `px-2 py-0.5 rounded text-[10px] font-bold ${tipo === '%' ? 'bg-pu text-white' : 'bg-s3 text-mt'}`;
    if (rsBtn) rsBtn.className = `px-2 py-0.5 rounded text-[10px] font-bold ${tipo === 'R$' ? 'bg-pu text-white' : 'bg-s3 text-mt'}`;
    recalcularCarrinho();
}

function confirmarVendaPDV() {
    if (_carrinhoItens.length === 0) { mostrarToast('Carrinho vazio.', 'erro'); return; }

    const subtotal = _carrinhoItens.reduce((s, i) => s + parseFloat(i.preco) * i.qty, 0);
    const descVal = parseFloat(document.getElementById('pdv-desconto')?.value || 0) || 0;
    let total = _descontoTipo === '%' ? subtotal * (1 - descVal / 100) : Math.max(0, subtotal - descVal);
    const metodo = document.getElementById('pdv-metodo')?.value || 'PIX';

    confirmarAcao(
        `Confirmar venda de R$ ${total.toFixed(2)} via ${metodo}?`,
        async () => {
            const db = getSupabase();
            if (!db) return;
            const alunoId = document.getElementById('pdv-aluno-id')?.value || null;

            // Insere venda no Supabase
            await db.from('vendas').insert([{
                aluno_id: alunoId || null,
                itens: _carrinhoItens.map(i => ({ id: i.id, nome: i.nome, preco: i.preco, qty: i.qty })),
                subtotal, desconto: descVal, desconto_tipo: _descontoTipo, total, metodo
            }]);

            // Baixa no estoque via Supabase
            for (const item of _carrinhoItens) {
                const prod = _produtosCache.find(p => p.id === item.id);
                if (prod) {
                    const novoEstoque = Math.max(0, (prod.estoque || 0) - item.qty);
                    await db.from('produtos').update({ estoque: novoEstoque }).eq('id', item.id);
                }
            }

            _carrinhoItens = [];
            await carregarLoja();
            mostrarToast(`Venda de R$ ${total.toFixed(2)} confirmada!`);
        },
        { icone: 'check-circle', btnLabel: 'Confirmar Venda', btnCor: 'bg-green-600 hover:bg-green-700' }
    );
}

function abrirModalProduto(produtoExistente = null) {
    const modal = document.getElementById('modal-produto');
    if (!modal) return;
    document.getElementById('form-produto').reset();
    document.getElementById('produto-id').value = produtoExistente?.id || '';
    document.getElementById('modal-titulo-produto').textContent = produtoExistente ? 'Editar Produto' : 'Novo Produto';

    // Resetar visibilidade do campo de sabores
    const containerSabores = document.getElementById('container-produto-sabores');
    if (containerSabores) containerSabores.style.display = 'block';

    if (produtoExistente) {
        document.getElementById('produto-nome').value = produtoExistente.nome;
        document.getElementById('produto-marca').value = produtoExistente.marca || '';
        document.getElementById('produto-sabores').value = produtoExistente.sabores || '';
        document.getElementById('produto-preco').value = produtoExistente.preco;
        document.getElementById('produto-estoque').value = produtoExistente.estoque || 0;
        // Ocultar sabores se for creatina
        if (containerSabores && produtoExistente.nome.toLowerCase().includes('creatina')) {
            containerSabores.style.display = 'none';
        }
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    document.getElementById('form-produto').onsubmit = async (e) => {
        e.preventDefault();
        const db = getSupabase();
        if (!db) return;
        const btn = e.target.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        const existeId = document.getElementById('produto-id').value;
        const nomeVal = document.getElementById('produto-nome').value;
        const isCreatina = nomeVal.toLowerCase().includes('creatina');
        const dados = {
            nome: nomeVal,
            marca: document.getElementById('produto-marca').value,
            sabores: isCreatina ? null : (document.getElementById('produto-sabores').value || null),
            preco: parseFloat(document.getElementById('produto-preco').value),
            estoque: parseInt(document.getElementById('produto-estoque').value || 0),
        };
        let error;
        if (existeId) {
            ({ error } = await db.from('produtos').update(dados).eq('id', existeId));
        } else {
            ({ error } = await db.from('produtos').insert([dados]));
        }
        if (btn) btn.disabled = false;
        if (error) { mostrarToast('Erro ao salvar produto.', 'erro'); return; }
        fecharModalProduto();
        await carregarLoja();
        mostrarToast('Produto salvo!');
    };
}

function fecharModalProduto() {
    const modal = document.getElementById('modal-produto');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

function editarProduto(produto) { abrirModalProduto(produto); }

function excluirProduto(id) {
    confirmarAcao('Excluir este produto do estoque?', async () => {
        const db = getSupabase();
        if (!db) return;
        const { error } = await db.from('produtos').delete().eq('id', id);
        if (error) { mostrarToast('Erro ao excluir produto.', 'erro'); return; }
        await carregarLoja();
    });
}

// ==========================================
// LOJA: HISTÓRICO DE VENDAS + GRÁFICOS
// ==========================================

async function carregarHistoricoVendas() {
    const db = getSupabase();
    const tbody = document.getElementById('loja-historico-tbody');
    if (!tbody || !db) return;

    const hoje = new Date();
    const mesInput = document.getElementById('hist-mes');
    if (mesInput && !mesInput.value) {
        mesInput.value = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    }
    const mesRef = mesInput?.value || (hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0'));
    const primeiroDia = mesRef + '-01';
    const ultimoDia = fimDoMes(mesRef);

    tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-mt animate-pulse">Carregando...</td></tr>';

    const busca = (document.getElementById('hist-busca')?.value || '').toLowerCase();

    const { data, error } = await db
        .from('vendas')
        .select('*, alunos(nome)')
        .gte('created_at', primeiroDia + 'T00:00:00')
        .lte('created_at', ultimoDia + 'T23:59:59')
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-mt">Nenhuma venda encontrada neste período.</td></tr>';
        return;
    }

    let vendas = data;
    if (busca) {
        vendas = vendas.filter(v => {
            const itens = (v.itens || []).map(i => i.nome || '').join(' ').toLowerCase();
            const aluno = (v.alunos?.nome || '').toLowerCase();
            return itens.includes(busca) || aluno.includes(busca);
        });
    }

    tbody.innerHTML = vendas.map(v => {
        const dt = new Date(v.created_at);
        const dataHora = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const itensStr = (v.itens || []).map(i => `${i.nome} (${i.qty}x)`).join(', ');
        return `
            <tr class="border-b border-bd/30 hover:bg-s2/20 transition-colors">
                <td class="px-4 py-3 text-xs text-mt whitespace-nowrap">${dataHora}</td>
                <td class="px-4 py-3 text-sm max-w-xs truncate" title="${itensStr}">${itensStr || '-'}</td>
                <td class="px-4 py-3 text-sm">\${v.alunos?.nome || '-'}</td>
                <td class="px-4 py-3 text-xs text-mt">${v.metodo || '-'}</td>
                <td class="px-4 py-3 text-right font-bold text-green-400">R$ ${parseFloat(v.total || 0).toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

function filtrarHistoricoVendas() {
    carregarHistoricoVendas();
}

let _grafVendasChart = null;

async function carregarGraficosVendas() {
    const db = getSupabase();
    if (!db) return;
    await carregarChartJs();

    const hoje = new Date();
    const mesRefInput = document.getElementById('graf-mes-ref');
    const mesCompInput = document.getElementById('graf-mes-comp');

    if (mesRefInput && !mesRefInput.value) {
        mesRefInput.value = hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0');
    }
    const mesRef = mesRefInput?.value || (hoje.getFullYear() + '-' + String(hoje.getMonth() + 1).padStart(2, '0'));
    const mesComp = mesCompInput?.value || null;

    async function buscarVendasMes(mes) {
        const { data } = await db.from('vendas').select('created_at, total, itens')
            .gte('created_at', mes + '-01T00:00:00').lte('created_at', fimDoMes(mes) + 'T23:59:59');
        return data || [];
    }

    const [vendasRef, vendasComp] = await Promise.all([
        buscarVendasMes(mesRef),
        mesComp ? buscarVendasMes(mesComp) : Promise.resolve([])
    ]);

    // Métricas
    const totalMes = vendasRef.reduce((s, v) => s + parseFloat(v.total || 0), 0);
    const numVendas = vendasRef.length;
    const ticket = numVendas > 0 ? totalMes / numVendas : 0;
    const el = (id) => document.getElementById(id);
    if (el('graf-total-mes')) el('graf-total-mes').textContent = 'R$ ' + totalMes.toFixed(2);
    if (el('graf-num-vendas')) el('graf-num-vendas').textContent = numVendas;
    if (el('graf-ticket-medio')) el('graf-ticket-medio').textContent = 'R$ ' + ticket.toFixed(2);

    // Gráfico de vendas por dia
    const diasNoMes = new Date(parseInt(mesRef.split('-')[0]), parseInt(mesRef.split('-')[1]), 0).getDate();
    const labelsRef = Array.from({ length: diasNoMes }, (_, i) => String(i + 1).padStart(2, '0'));
    const dadosRef = Array(diasNoMes).fill(0);
    const dadosComp = Array(diasNoMes).fill(0);

    vendasRef.forEach(v => {
        const dia = new Date(v.created_at).getDate() - 1;
        if (dadosRef[dia] !== undefined) dadosRef[dia] += parseFloat(v.total || 0);
    });
    vendasComp.forEach(v => {
        const dia = new Date(v.created_at).getDate() - 1;
        if (dadosComp[dia] !== undefined) dadosComp[dia] += parseFloat(v.total || 0);
    });

    const ctx = document.getElementById('grafVendasDia');
    if (!ctx) return;
    if (_grafVendasChart) _grafVendasChart.destroy();

    const datasets = [{
        label: mesRef, data: dadosRef,
        backgroundColor: 'rgba(0,102,255,0.2)', borderColor: '#0066FF',
        borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3
    }];
    if (mesComp && vendasComp.length > 0) {
        datasets.push({
            label: mesComp, data: dadosComp,
            backgroundColor: 'rgba(16,185,129,0.1)', borderColor: '#10B981',
            borderWidth: 2, tension: 0.4, fill: true, pointRadius: 3, borderDash: [4, 4]
        });
    }

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    _grafVendasChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labelsRef, datasets },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: isDark ? '#f0f0f8' : '#0f172a', font: { size: 11 } } } },
            scales: {
                x: { ticks: { color: isDark ? '#8a8a9e' : '#5a6a88' }, grid: { color: 'rgba(255,255,255,0.04)' } },
                y: { ticks: { color: isDark ? '#8a8a9e' : '#5a6a88', callback: v => 'R$' + v.toFixed(0) }, grid: { color: 'rgba(255,255,255,0.04)' } }
            }
        }
    });

    // Top produtos
    const contagem = {};
    vendasRef.forEach(v => {
        (v.itens || []).forEach(item => {
            contagem[item.nome] = (contagem[item.nome] || 0) + (item.qty || 1);
        });
    });
    const topEl = document.getElementById('graf-top-produtos');
    if (topEl) {
        const sorted = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const max = sorted[0]?.[1] || 1;
        topEl.innerHTML = sorted.length === 0
            ? '<p class="text-mt text-xs text-center py-4">Nenhuma venda no período.</p>'
            : sorted.map(([nome, qty]) => `
                <div class="flex items-center gap-3">
                    <span class="text-xs text-mt w-40 truncate flex-shrink-0">${nome}</span>
                    <div class="flex-1 bg-s2 rounded-full h-2 overflow-hidden">
                        <div class="h-2 bg-pu rounded-full" style="width:${(qty/max*100).toFixed(0)}%"></div>
                    </div>
                    <span class="text-xs font-bold w-8 text-right">${qty}x</span>
                </div>
            `).join('');
    }
}

// ==========================================
// GANCHO DE INICIALIZAÇÃO DOS MÓDULOS
// ==========================================
const _originalSetupNavigation = setupNavigation;
setupNavigation = function() {
    _originalSetupNavigation();
    // Carrega módulos quando a seção é acessada
    document.querySelectorAll('[data-section]').forEach(btn => {
        btn.addEventListener('click', () => {
            const sec = btn.getAttribute('data-section');
            if (sec === 'leads-crm') setTimeout(renderizarKanban, 50);
            else if (sec === 'financeiro') setTimeout(carregarFinanceiro, 50);
            else if (sec === 'chamada-frequencia') setTimeout(carregarFrequencia, 50);
            else if (sec === 'marketing-digital') setTimeout(carregarMarketing, 50);
            else if (sec === 'loja-estoque') setTimeout(carregarLoja, 50);
            else if (sec === 'avaliacoes') setTimeout(() => { fetchAvaliacoes(); popularSelectAlunos('av-filtro-aluno'); }, 50);
            else if (sec === 'aniversariantes') setTimeout(renderSecaoAniversariantes, 50);
        });
    });
};

// PDV: autocomplete de alunos
document.addEventListener('DOMContentLoaded', () => {
    if (typeof ssInput === 'function') {
        // O sistema de autocomplete compartilhado já funciona com qualquer prefixo
    }
});

// ─────────────────────────────────────────────────────────────
// AVALIAÇÕES FÍSICAS (Bioimpedância)
// ─────────────────────────────────────────────────────────────

async function popularSelectAlunos(selectId, valorAtual = '') {
    const db = getSupabase();
    if (!db) return;
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const { data } = await db.from('alunos').select('id, nome').eq('status', 'ATIVO').order('nome');
    if (!data) return;
    const placeholder = sel.options[0]?.value === '' ? sel.options[0].outerHTML : '';
    sel.innerHTML = placeholder + data.map(a =>
        `<option value="${a.id}" ${a.id === valorAtual ? 'selected' : ''}>${a.nome}</option>`
    ).join('');
}

async function fetchAvaliacoes() {
    const db = getSupabase();
    if (!db) return;
    const listaEl = document.getElementById('av-lista');
    const emptyEl = document.getElementById('av-empty');
    if (!listaEl) return;

    listaEl.innerHTML = '<div class="col-span-3 text-center py-10 text-mt text-sm">Carregando...</div>';
    if (emptyEl) emptyEl.classList.add('hidden');

    const filtroAluno = document.getElementById('av-filtro-aluno')?.value || '';
    
    let qAntigas = db.from('avaliacoes').select('*, alunos(nome)');
    let qNovas = db.from('fichas_avaliacao').select('*, alunos(nome)');
    
    if (filtroAluno) {
        qAntigas = qAntigas.eq('aluno_id', filtroAluno);
        qNovas = qNovas.eq('aluno_id', filtroAluno);
    }

    const [resAntigas, resNovas] = await Promise.all([qAntigas, qNovas]);
    
    if (resAntigas.error && resNovas.error) {
        listaEl.innerHTML = '<div class="col-span-3 text-center py-10 text-red-400 text-sm">Erro ao carregar avaliações.</div>';
        return;
    }
    
    let list = [
        ...(resAntigas.data || []).map(a => ({ ...a, _tipo: 'antiga' })),
        ...(resNovas.data || []).map(n => ({ ...n, _tipo: 'nova' }))
    ];
    
    list.sort((a, b) => new Date(b.data || '2000-01-01') - new Date(a.data || '2000-01-01'));
    
    renderAvaliacoes(list);
}

function renderAvaliacoes(list) {
    const listaEl = document.getElementById('av-lista');
    const emptyEl = document.getElementById('av-empty');
    if (!listaEl) return;

    if (list.length === 0) {
        listaEl.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    listaEl.innerHTML = list.map(av => {
        const nome = av.alunos?.nome || 'Aluno';
        const data = av.data ? new Date(av.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        
        if (av._tipo === 'nova') {
            const d = av.dados || {};
            return `
            <div class="bg-s2 border border-bd rounded-2xl p-5 hover:border-pu transition-all">
                <div class="flex items-start justify-between mb-3">
                    <div>
                        <h4 class="font-bold text-white text-sm">${nome}</h4>
                        <p class="text-xs text-mt mt-0.5">${data} · Ficha Completa Avançada</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="window.location.href='ficha-avaliacao.html?aluno_id=${av.aluno_id}'" class="px-3 py-1.5 bg-pu/10 hover:bg-pu/20 text-pu font-bold text-xs rounded-lg transition-colors border border-pu/20">
                            Ver Ficha
                        </button>
                        <button onclick="window.open('ficha-avaliacao.html?aluno_id=${av.aluno_id}&print=1','_blank')" class="px-3 py-1.5 bg-s3 hover:bg-s3 border border-bd hover:border-pu text-mt hover:text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5" title="Gerar PDF">
                            <i data-lucide="file-down" class="w-3.5 h-3.5"></i>
                            PDF
                        </button>
                        <button onclick="excluirFichaAvaliacao('${av.id}')" class="p-1.5 text-mt hover:text-red-400 transition-colors" title="Excluir">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                ${d['an-objetivos'] ? `<p class="mt-3 text-xs text-mt italic border-t border-bd/50 pt-3 leading-relaxed">Objetivos: ${d['an-objetivos']}</p>` : ''}
            </div>`;
        }

        // Tipo antiga (modal simples)
        const avJson = JSON.stringify(av).replace(/'/g, "&#39;");
        const metric = (label, val, unit, color = 'text-white') =>
            val != null ? `<div class="bg-s3 rounded-xl p-2.5 text-center">
                <p class="text-[10px] text-mt font-bold uppercase leading-tight">${label}</p>
                <p class="${color} font-bold text-sm mt-0.5">${val}${unit}</p>
            </div>` : '';

        return `
        <div class="bg-s2 border border-bd rounded-2xl p-5 hover:border-pu transition-all opacity-80">
            <div class="flex items-start justify-between mb-3">
                <div>
                    <h4 class="font-bold text-white text-sm">${nome}</h4>
                    <p class="text-xs text-mt mt-0.5">${data}${av.objetivo ? ' · ' + av.objetivo : ''} (Avaliação Simples)</p>
                </div>
                <div class="flex items-center gap-0.5">
                    <button onclick='editarAvaliacao(${avJson})' class="p-1.5 text-mt hover:text-pu transition-colors" title="Editar">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="excluirAvaliacao('${av.id}')" class="p-1.5 text-mt hover:text-red-400 transition-colors" title="Excluir">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2">
                ${metric('Peso', av.peso, ' kg')}
                ${metric('Gordura', av.gordura_pct, '%', 'text-orange-400')}
                ${metric('M. Magra', av.massa_magra, ' kg', 'text-pu')}
            </div>
            ${av.obs ? `<p class="mt-3 text-xs text-mt italic border-t border-bd pt-3 leading-relaxed">${av.obs}</p>` : ''}
        </div>`;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}

function abrirModalAvaliacao(alunoId = '') {
    document.getElementById('form-avaliacao').reset();
    document.getElementById('av-id').value = '';
    document.getElementById('modal-titulo-av').innerText = 'Nova Avaliação';
    document.getElementById('av-data').value = new Date().toISOString().split('T')[0];
    popularSelectAlunos('av-aluno-id', alunoId);
    const modal = document.getElementById('modal-avaliacao');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) window.lucide.createIcons();
}

function fecharModalAvaliacao() {
    const modal = document.getElementById('modal-avaliacao');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function editarAvaliacao(av) {
    document.getElementById('av-id').value = av.id;
    document.getElementById('av-data').value = av.data || '';
    document.getElementById('av-peso').value = av.peso ?? '';
    document.getElementById('av-imc').value = av.imc ?? '';
    document.getElementById('av-gordura-pct').value = av.gordura_pct ?? '';
    document.getElementById('av-gordura-kg').value = av.gordura_kg ?? '';
    document.getElementById('av-massa-magra').value = av.massa_magra ?? '';
    document.getElementById('av-massa-muscular').value = av.massa_muscular ?? '';
    document.getElementById('av-massa-ossea').value = av.massa_ossea ?? '';
    document.getElementById('av-gordura-visceral').value = av.gordura_visceral ?? '';
    document.getElementById('av-agua-pct').value = av.agua_pct ?? '';
    document.getElementById('av-metabolismo-basal').value = av.metabolismo_basal ?? '';
    document.getElementById('av-idade-metabolica').value = av.idade_metabolica ?? '';
    document.getElementById('av-objetivo').value = av.objetivo || '';
    document.getElementById('av-obs').value = av.obs || '';
    document.getElementById('modal-titulo-av').innerText = 'Editar Avaliação';
    popularSelectAlunos('av-aluno-id', av.aluno_id);
    const modal = document.getElementById('modal-avaliacao');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) window.lucide.createIcons();
}

async function salvarAvaliacao(event) {
    event.preventDefault();
    const db = getSupabase();
    if (!db) return;
    const btn = document.getElementById('btn-salvar-av');
    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>';

    const id = document.getElementById('av-id').value;

    // Valida a data antes de enviar
    const dataStr = document.getElementById('av-data').value;
    if (dataStr) {
        const [ano, mes, dia] = dataStr.split('-').map(Number);
        const dt = new Date(ano, mes - 1, dia);
        if (dt.getFullYear() !== ano || dt.getMonth() !== mes - 1 || dt.getDate() !== dia) {
            mostrarToast('Data inválida. Verifique o dia informado.', 'erro');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Salvar Avaliação';
            if (window.lucide) window.lucide.createIcons();
            return;
        }
    }

    const n = (id) => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };
    const ni = (id) => { const v = parseInt(document.getElementById(id).value); return isNaN(v) ? null : v; };

    const payload = {
        aluno_id: document.getElementById('av-aluno-id').value,
        data: dataStr,
        peso: n('av-peso'), imc: n('av-imc'),
        gordura_pct: n('av-gordura-pct'), gordura_kg: n('av-gordura-kg'),
        massa_magra: n('av-massa-magra'), massa_muscular: n('av-massa-muscular'),
        massa_ossea: n('av-massa-ossea'), gordura_visceral: ni('av-gordura-visceral'),
        agua_pct: n('av-agua-pct'), metabolismo_basal: ni('av-metabolismo-basal'),
        idade_metabolica: ni('av-idade-metabolica'),
        objetivo: document.getElementById('av-objetivo').value || null,
        obs: document.getElementById('av-obs').value || null,
    };

    try {
        let error;
        if (id) ({ error } = await db.from('avaliacoes').update(payload).eq('id', id));
        else ({ error } = await db.from('avaliacoes').insert(payload));
        if (error) throw error;
        fecharModalAvaliacao();
        fetchAvaliacoes();
        mostrarToast(id ? 'Avaliação atualizada!' : 'Avaliação salva com sucesso!');
    } catch (err) {
        console.error(err);
        mostrarToast('Erro ao salvar avaliação.', 'erro');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save" class="w-4 h-4"></i> Salvar Avaliação';
        if (window.lucide) window.lucide.createIcons();
    }
}

async function excluirAvaliacao(id) {
    confirmarAcao('Excluir esta avaliação permanentemente?', async () => {
        const db = getSupabase();
        if (!db) return;
        const { error } = await db.from('avaliacoes').delete().eq('id', id);
        if (error) { mostrarToast('Erro ao excluir.', 'erro'); return; }
        fetchAvaliacoes();
        mostrarToast('Avaliação excluída.');
    });
}

async function excluirFichaAvaliacao(id) {
    confirmarAcao('Excluir esta Ficha Avançada permanentemente?', async () => {
        const db = getSupabase();
        if (!db) return;
        const { error } = await db.from('fichas_avaliacao').delete().eq('id', id);
        if (error) { mostrarToast('Erro ao excluir.', 'erro'); return; }
        fetchAvaliacoes();
        mostrarToast('Ficha excluída com sucesso.');
    });
}

// ============================================================
// AGENDAMENTO DE AVALIAÇÕES
// ============================================================

let _agAlunosList = [];
let _agNotifAtivo = false;
let _agNotifDias = 3;

const _AG_MSG_DEFAULT = `Olá, {nome}!

Passando para lembrar da sua avaliação *{tipo}* marcada no Studio Focus.

Data: {data}
Horário: {horario}

Caso precise remarcar ou tenha alguma dúvida, é só nos avisar. Te esperamos!`;

async function abrirModalAgendarAv(id = null) {
    const db = getSupabase();
    if (!db) return;

    const { data } = await db.from('alunos').select('id, nome, telefone').eq('status', 'ATIVO').order('nome');
    _agAlunosList = data || [];
    ssInit('ag-aluno', _agAlunosList);

    document.getElementById('form-agendar-av').reset();
    document.getElementById('ag-av-id').value = '';
    ssClear('ag-aluno');
    document.getElementById('ag-data').value = new Date().toISOString().split('T')[0];
    document.getElementById('ag-horario').value = '09:00';
    document.getElementById('ag-notif-msg').value = _AG_MSG_DEFAULT;
    document.getElementById('ag-notif-dias-custom').value = '';
    document.getElementById('ag-notif-historico-container')?.classList.add('hidden');

    _agNotifAtivo = false;
    _agNotifDias = 3;
    _agUpdateToggleUI();
    _agHighlightDias(3);

    if (id) {
        const { data: ag } = await db
            .from('agendamentos_avaliacao')
            .select('*, alunos(nome, telefone)')
            .eq('id', id)
            .single();
        if (ag) {
            document.getElementById('ag-av-id').value = ag.id;
            document.getElementById('ag-av-titulo').textContent = 'Editar Agendamento';
            ssSelect('ag-aluno', ag.aluno_id, ag.alunos?.nome || '');
            document.getElementById('ag-data').value = ag.data;
            document.getElementById('ag-horario').value = (ag.horario || '').substring(0, 5);
            document.getElementById('ag-tipo').value = ag.tipo;
            document.getElementById('ag-obs').value = ag.obs || '';
            _agNotifAtivo = ag.notif_ativo || false;
            _agNotifDias = ag.notif_dias || 3;
            document.getElementById('ag-notif-dias').value = String(_agNotifDias);
            document.getElementById('ag-notif-msg').value = ag.notif_msg || _AG_MSG_DEFAULT;
            _agUpdateToggleUI();
            _agHighlightDias(_agNotifDias);
            if (![2, 3, 5].includes(_agNotifDias)) {
                document.getElementById('ag-notif-dias-custom').value = String(_agNotifDias);
            }

            if (ag.notif_historico?.length) {
                const cont = document.getElementById('ag-notif-historico-container');
                const list = document.getElementById('ag-notif-historico');
                if (cont && list) {
                    cont.classList.remove('hidden');
                    list.innerHTML = ag.notif_historico.map(h => {
                        const d = new Date(h.data).toLocaleString('pt-BR');
                        return `<div class="text-[11px] text-mt flex items-center gap-1.5"><i data-lucide="check-circle" class="w-3 h-3 text-green-400"></i>Enviado em ${d}</div>`;
                    }).join('');
                }
            }
        }
    } else {
        document.getElementById('ag-av-titulo').textContent = 'Agendar Avaliação';
    }

    atualizarPreviewAg();

    const modal = document.getElementById('modal-agendar-av');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (window.lucide) window.lucide.createIcons();
}

function fecharModalAgendarAv() {
    const modal = document.getElementById('modal-agendar-av');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function toggleNotifAg() {
    _agNotifAtivo = !_agNotifAtivo;
    _agUpdateToggleUI();
    atualizarPreviewAg();
}

function _agUpdateToggleUI() {
    const panel = document.getElementById('ag-notif-panel');
    const label = document.getElementById('ag-notif-status-label');
    const toggle = document.getElementById('ag-notif-toggle');
    const knob = document.getElementById('ag-notif-knob');
    if (_agNotifAtivo) {
        panel?.classList.remove('hidden');
        if (label) label.textContent = 'Ativado';
        if (toggle) toggle.style.background = 'var(--pu)';
        if (knob) { knob.style.background = '#ffffff'; knob.style.left = 'calc(100% - 1.125rem)'; }
    } else {
        panel?.classList.add('hidden');
        if (label) label.textContent = 'Desativado';
        if (toggle) toggle.style.background = 'var(--s3)';
        if (knob) { knob.style.background = 'var(--mt)'; knob.style.left = '0.125rem'; }
    }
}

function setNotifDias(dias) {
    _agNotifDias = dias;
    document.getElementById('ag-notif-dias').value = String(dias);
    document.getElementById('ag-notif-dias-custom').value = '';
    _agHighlightDias(dias);
    atualizarPreviewAg();
}

function _agNotifCustomInput(val) {
    const n = parseInt(val);
    if (!isNaN(n) && n > 0) {
        _agNotifDias = n;
        document.getElementById('ag-notif-dias').value = String(n);
        _agHighlightDias(-1);
        atualizarPreviewAg();
    }
}

function _agHighlightDias(dias) {
    document.querySelectorAll('.ag-dias-btn').forEach(btn => {
        const btnDias = parseInt(btn.textContent);
        if (btnDias === dias) {
            btn.style.cssText = 'background:color-mix(in srgb,var(--pu) 15%,transparent);border-color:var(--pu);color:var(--pu2)';
        } else {
            btn.style.cssText = 'background:var(--s3);border-color:var(--bd);color:var(--mt)';
        }
    });
}

function atualizarPreviewAg() {
    const preview = document.getElementById('ag-notif-preview');
    if (!preview) return;
    const nome = document.getElementById('ag-aluno-search')?.value || '[Aluno]';
    const dataVal = document.getElementById('ag-data')?.value;
    const data = dataVal ? new Date(dataVal + 'T00:00:00').toLocaleDateString('pt-BR') : '[Data]';
    const horario = document.getElementById('ag-horario')?.value || '[Horário]';
    const tipo = document.getElementById('ag-tipo')?.value || '[Tipo]';
    const msg = document.getElementById('ag-notif-msg')?.value || '';
    if (!msg.trim()) { preview.textContent = 'Preencha a mensagem para ver a prévia.'; return; }
    preview.textContent = msg.replace(/\{nome\}/g, nome).replace(/\{data\}/g, data).replace(/\{horario\}/g, horario).replace(/\{tipo\}/g, tipo);
}

async function salvarAgendamento(event) {
    event.preventDefault();
    const db = getSupabase();
    if (!db) return;

    const alunoId = document.getElementById('ag-aluno-id').value;
    if (!alunoId) { mostrarToast('Selecione um aluno.', 'erro'); return; }
    const data = document.getElementById('ag-data').value;
    const horario = document.getElementById('ag-horario').value;
    if (!data || !horario) { mostrarToast('Informe a data e horário.', 'erro'); return; }

    const custom = parseInt(document.getElementById('ag-notif-dias-custom').value);
    if (!isNaN(custom) && custom > 0) _agNotifDias = custom;

    const notifAtivo = _agNotifAtivo;
    const payload = {
        aluno_id: alunoId,
        data,
        horario,
        tipo: document.getElementById('ag-tipo').value,
        obs: document.getElementById('ag-obs').value || null,
        notif_ativo: notifAtivo,
        notif_dias: notifAtivo ? _agNotifDias : null,
        notif_msg: notifAtivo ? document.getElementById('ag-notif-msg').value : null,
    };

    const id = document.getElementById('ag-av-id').value;
    let erro;
    if (id) {
        const { error } = await db.from('agendamentos_avaliacao').update(payload).eq('id', id);
        erro = error;
    } else {
        const { error } = await db.from('agendamentos_avaliacao').insert({ ...payload, status: 'PENDENTE' });
        erro = error;
    }

    if (erro) { mostrarToast('Erro ao salvar agendamento.', 'erro'); console.error(erro); return; }
    fecharModalAgendarAv();
    renderAgendamentos();
    mostrarToast(id ? 'Agendamento atualizado!' : 'Avaliação agendada com sucesso! 📅');
}

async function renderAgendamentos() {
    const container = document.getElementById('ag-lista');
    const emptyEl = document.getElementById('ag-empty');
    const badge = document.getElementById('ag-count-badge');
    if (!container) return;

    const db = getSupabase();
    if (!db) return;

    // Badge de pendentes (contagem separada para não ser afetada por filtros)
    const { count: pendentes } = await db
        .from('agendamentos_avaliacao')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDENTE');
    if (badge) { badge.textContent = pendentes || 0; badge.classList.toggle('hidden', !pendentes); }

    // Filtros
    const busca = (document.getElementById('ag-busca')?.value || '').toLowerCase().trim();
    const statusF = document.getElementById('ag-filtro-status')?.value || '';
    const periodo = document.getElementById('ag-filtro-periodo')?.value || '';

    let query = db.from('agendamentos_avaliacao').select('*, alunos(nome, telefone)');
    if (statusF) query = query.eq('status', statusF);
    if (periodo) query = query.gte('data', periodo + '-01').lte('data', fimDoMes(periodo));
    query = query.order('data').order('horario');

    const { data, error } = await query;
    if (error) { console.error(error); return; }

    let ags = (data || []).map(ag => ({
        ...ag,
        aluno_nome: ag.alunos?.nome || '',
        aluno_telefone: ag.alunos?.telefone || '',
        horario: (ag.horario || '').substring(0, 5),
    }));

    if (busca) ags = ags.filter(a => a.aluno_nome.toLowerCase().includes(busca));

    // Ordenação: pendentes primeiro, depois por data
    const sOrder = { PENDENTE: 0, REALIZADA: 1, CANCELADA: 2 };
    ags.sort((a, b) => {
        const d = (sOrder[a.status] ?? 3) - (sOrder[b.status] ?? 3);
        return d !== 0 ? d : (a.data + a.horario).localeCompare(b.data + b.horario);
    });

    if (ags.length === 0) {
        container.innerHTML = '';
        if (emptyEl) emptyEl.classList.remove('hidden');
        return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);

    const sBadge = {
        PENDENTE: 'bg-yellow-500/15 text-yellow-400',
        REALIZADA: 'bg-green-500/15 text-green-400',
        CANCELADA: 'bg-red-500/15 text-red-400',
    };
    const sLabel = { PENDENTE: 'Pendente', REALIZADA: 'Realizada', CANCELADA: 'Cancelada' };

    container.innerHTML = ags.map(ag => {
        const dataFmt = ag.data ? new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        const initials = (ag.aluno_nome || '??').substring(0, 2).toUpperCase();
        const isPendente = ag.status === 'PENDENTE';

        let lembreteHtml = '';
        if (ag.notif_ativo && isPendente) {
            const dataAg = new Date(ag.data + 'T00:00:00');
            const diffDays = Math.round((dataAg - hoje) / 86400000);
            const notifDate = new Date(dataAg); notifDate.setDate(notifDate.getDate() - ag.notif_dias);
            const jaEnviou = ag.notif_historico?.length > 0;
            if (jaEnviou) {
                lembreteHtml = `<span class="inline-flex items-center gap-1 text-[10px] text-green-400 font-bold mt-1.5"><i data-lucide="check-circle" class="w-3 h-3"></i>Lembrete enviado</span>`;
            } else if (notifDate <= hoje && diffDays >= 0) {
                lembreteHtml = `<span class="inline-flex items-center gap-1 text-[10px] text-orange-400 font-bold mt-1.5 animate-pulse"><i data-lucide="bell-ring" class="w-3 h-3"></i>Enviar lembrete agora!</span>`;
            } else {
                lembreteHtml = `<span class="inline-flex items-center gap-1 text-[10px] text-mt mt-1.5"><i data-lucide="bell" class="w-3 h-3"></i>Lembrete ${ag.notif_dias}d antes</span>`;
            }
        }

        const actionBtns = isPendente ? `
            <div class="flex gap-2 mt-3 pt-3 border-t border-bd/40 flex-wrap">
                <button onclick="editarAgendamento('${ag.id}')"
                    class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-s3 hover:bg-s2 border border-bd rounded-lg text-mt hover:text-white transition-all">
                    <i data-lucide="edit-2" class="w-3 h-3"></i>Editar
                </button>
                <button onclick="marcarAgRealizada('${ag.id}')"
                    class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-green-500/10 hover:bg-green-600 border border-green-500/30 rounded-lg text-green-400 hover:text-white transition-all">
                    <i data-lucide="check" class="w-3 h-3"></i>Realizada
                </button>
                ${ag.notif_ativo ? `<button onclick="enviarLembreteAgWA('${ag.id}')"
                    class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-emerald-700/20 hover:bg-emerald-700 border border-emerald-600/30 rounded-lg text-emerald-400 hover:text-white transition-all">
                    <i data-lucide="message-circle" class="w-3 h-3"></i>Lembrete WA
                </button>` : ''}
                <button onclick="cancelarAgendamento('${ag.id}')"
                    class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-red-500/10 hover:bg-red-600 border border-red-500/30 rounded-lg text-red-400 hover:text-white transition-all ml-auto">
                    <i data-lucide="x" class="w-3 h-3"></i>Cancelar
                </button>
            </div>` : `
            <div class="flex gap-2 mt-3 pt-3 border-t border-bd/40">
                <button onclick="excluirAgendamento('${ag.id}')"
                    class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-red-500/10 hover:bg-red-600 border border-red-500/30 rounded-lg text-red-400 hover:text-white transition-all">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>Excluir
                </button>
            </div>`;

        return `<div class="bg-s2 border border-bd rounded-2xl p-4 hover:border-pu/40 transition-all">
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3 min-w-0">
                    <div class="w-9 h-9 bg-pu/20 text-pu2 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">${initials}</div>
                    <div class="min-w-0">
                        <p class="font-bold text-sm leading-tight">${ag.aluno_nome}</p>
                        <div class="flex items-center gap-2 mt-1 flex-wrap">
                            <span class="flex items-center gap-1 text-[11px] text-mt">
                                <i data-lucide="calendar" class="w-3 h-3"></i>${dataFmt} às ${ag.horario}
                            </span>
                            <span class="text-[10px] bg-pu/10 text-pu2 px-2 py-0.5 rounded-full font-bold">${ag.tipo}</span>
                        </div>
                        ${ag.obs ? `<p class="text-[11px] text-mt mt-1.5 leading-relaxed truncate">${ag.obs}</p>` : ''}
                        ${lembreteHtml}
                    </div>
                </div>
                <span class="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${sBadge[ag.status] || sBadge.PENDENTE}">${sLabel[ag.status]}</span>
            </div>
            ${actionBtns}
        </div>`;
    }).join('');

    if (window.lucide) window.lucide.createIcons();
}

function trocarAbaAvaliacoes(aba) {
    ['historico', 'agendamentos'].forEach(p => {
        document.getElementById(`av-panel-${p}`)?.classList.toggle('hidden', p !== aba);
        const tab = document.getElementById(`av-tab-${p}`);
        if (!tab) return;
        if (p === aba) {
            tab.classList.add('text-pu', 'border-pu');
            tab.classList.remove('text-mt', 'border-transparent');
        } else {
            tab.classList.remove('text-pu', 'border-pu');
            tab.classList.add('text-mt', 'border-transparent');
        }
    });
    if (aba === 'agendamentos') renderAgendamentos();
}

function editarAgendamento(id) { abrirModalAgendarAv(id); }

function cancelarAgendamento(id) {
    confirmarAcao('Cancelar este agendamento?', async () => {
        const db = getSupabase();
        if (!db) return;
        const { error } = await db.from('agendamentos_avaliacao').update({ status: 'CANCELADA' }).eq('id', id);
        if (error) { mostrarToast('Erro ao cancelar.', 'erro'); return; }
        renderAgendamentos();
        mostrarToast('Agendamento cancelado.');
    }, { icone: 'x-circle', btnLabel: 'Cancelar Agendamento', btnCor: 'bg-red-500 hover:bg-red-600' });
}

async function marcarAgRealizada(id) {
    const db = getSupabase();
    if (!db) return;
    const { error } = await db.from('agendamentos_avaliacao').update({ status: 'REALIZADA' }).eq('id', id);
    if (error) { mostrarToast('Erro ao atualizar.', 'erro'); return; }
    renderAgendamentos();
    mostrarToast('Agendamento marcado como realizado! ✅');
}

function excluirAgendamento(id) {
    confirmarAcao('Excluir este agendamento permanentemente?', async () => {
        const db = getSupabase();
        if (!db) return;
        const { error } = await db.from('agendamentos_avaliacao').delete().eq('id', id);
        if (error) { mostrarToast('Erro ao excluir.', 'erro'); return; }
        renderAgendamentos();
        mostrarToast('Agendamento excluído.');
    });
}

async function enviarLembreteAgWA(id) {
    const db = getSupabase();
    if (!db) return;
    const { data: ag } = await db
        .from('agendamentos_avaliacao')
        .select('*, alunos(nome, telefone)')
        .eq('id', id)
        .single();
    if (!ag) return;
    const tel = ag.alunos?.telefone?.replace(/\D/g, '');
    if (!tel) { mostrarToast('Telefone do aluno não cadastrado.', 'erro'); return; }
    const nome = ag.alunos?.nome || '';
    const horario = (ag.horario || '').substring(0, 5);
    const dataFmt = ag.data ? new Date(ag.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    const msg = (ag.notif_msg || _AG_MSG_DEFAULT)
        .replace(/\{nome\}/g, nome)
        .replace(/\{data\}/g, dataFmt)
        .replace(/\{horario\}/g, horario)
        .replace(/\{tipo\}/g, ag.tipo);
    window.open(`https://wa.me/55${tel}?text=${encodeURIComponent(msg)}`, '_blank');
    const hist = [...(ag.notif_historico || []), { data: new Date().toISOString(), status: 'enviada' }];
    await db.from('agendamentos_avaliacao').update({ notif_historico: hist }).eq('id', id);
    renderAgendamentos();
    mostrarToast('Lembrete enviado via WhatsApp! 💬');
}
