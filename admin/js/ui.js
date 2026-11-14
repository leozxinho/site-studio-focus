// ==========================================
// UI — Toast, Cache, Supabase, Helpers
// ==========================================

var SUPABASE_URL = 'https://dvjjproexhetqlazftln.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2ampwcm9leGhldHFsYXpmdGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NzEwNzUsImV4cCI6MjA5NDI0NzA3NX0._Y22KalUdIzT6TzalVR2haBsUvXeeyBeC_cpwPOTKNk';

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
// SUPABASE CLIENT
// ==========================================

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

// ==========================================
// SKELETON TABLE HELPER
// ==========================================

function _mostrarSkeletonTabela(tbody, colunas, linhas = 5) {
    tbody.innerHTML = Array.from({ length: linhas }).map(() =>
        `<tr class="skeleton-row border-b border-bd/30">${
            Array.from({ length: colunas }).map(() =>
                `<td class="py-4"><div class="skeleton-cell" style="width:${60 + Math.random()*30|0}%"></div></td>`
            ).join('')
        }</tr>`
    ).join('');
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

// ==========================================
// ERROR HANDLER
// ==========================================

function handleError(error, contexto) {
    contexto = contexto || '';
    const msg = contexto ? ('Erro em ' + contexto + ': ' + (error && error.message ? error.message : error)) : (error && error.message ? error.message : 'Erro inesperado.');
    console.error('[StudioFocus]', contexto, error);
    mostrarToast(msg, 'erro');
}
