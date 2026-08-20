// app.js — versão robusta que liga todos os botões e verifica admin via Google (Supabase OAuth)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://tcertncsuhrtldeojqfx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6ojNocYnMs6HKTx6kEmsVQ_x_IbL-1E';
const STORAGE_BUCKET = 'imagens';

const ADMIN_EMAILS = [
  'miguel.rocha.cardoso@escola.pr.gov.br',
  'francisco.silva.adrian@escola.pr.gov.br'
].map(e => String(e || '').trim().toLowerCase());

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Safe DOM helper — evita exceção se elemento não existir
const $ = sel => {
  const el = document.querySelector(sel);
  if (!el) console.debug(`[app.js] elemento não encontrado: ${sel}`);
  return el;
};
const $$ = sel => Array.from(document.querySelectorAll(sel));

// State
let isAdmin = false;
let trabalhosCache = [];
let selectedType = null;

// Lista de alunos (ordenada)
const alunos = [
  "Adrian Felipe","Adryan Felyp","Ana Gabryella","Ana Lara","Atailton","Caio","Camila",
  "Elieder","Emanuelly","Haniel","Iago","Isadora","João Pedro","João Victor","José Adriano",
  "Kethelyn","Kelly","Lucas","Luiz Gustavo","Maria Heloísa","Milena","Miguel Felipe",
  "Miguel Fernando","Pedro","Samira"
].sort((a,b)=>a.localeCompare(b,'pt-BR'));

// Wait for DOM ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    initUI();
    initAuthAndData();
  } catch (err) {
    console.error('[app] erro na inicialização:', err);
  }
});

function initUI() {
  // Elements
  const fab = $('#fabAddWork');
  const workForm = $('#workForm');
  const typeButtons = $$('.type-button');
  const addStudentButton = $('#addStudentButton');
  const publishButton = $('#publishButton');
  const adminButton = $('#adminButton');
  const themeToggle = $('#themeToggle');
  const organizeToggle = $('#organizeToggle');
  const homeButton = $('#homeButton');
  const statisticsButton = $('#statisticsButton');
  const homeSection = $('#homeSection');
  const statisticsSection = $('#statisticsSection');
  const rightSidebar = $('#rightSidebar');

  // Basic UI wiring
  if (fab && workForm) {
    fab.addEventListener('click', () => {
      const visible = workForm.classList.toggle('visible');
      workForm.setAttribute('aria-hidden', String(!visible));
      if (visible) workForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      themeToggle.textContent = isLight ? '☀️' : '🌙';
      try { localStorage.setItem('revista_theme', isLight ? 'light' : 'dark'); } catch {}
    });
  }

  if (organizeToggle && rightSidebar) {
    organizeToggle.addEventListener('click', () => {
      rightSidebar.style.display = rightSidebar.style.display === 'block' ? 'none' : 'block';
    });
  }

  if (homeButton && statisticsButton && homeSection && statisticsSection) {
    homeButton.addEventListener('click', async () => {
      homeButton.classList.add('active');
      statisticsButton.classList.remove('active');
      homeSection.style.display = 'block';
      statisticsSection.classList.remove('visible');
      rightSidebar.style.display = '';
      await carregarTrabalhos(); // refresh
    });
    statisticsButton.addEventListener('click', async () => {
      statisticsButton.classList.add('active');
      homeButton.classList.remove('active');
      homeSection.style.display = 'none';
      statisticsSection.classList.add('visible');
      rightSidebar.style.display = 'none';
      await carregarEstatisticas();
    });
  }

  // type buttons (texto/imagem/video)
  if (typeButtons && typeButtons.length) {
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        typeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedType = btn.dataset.type;
        const workFields = $('#workFields');
        if (workFields) workFields.classList.add('visible');
        const tf = $('#textField'), imf = $('#imageField'), vf = $('#videoField');
        if (tf) tf.classList.toggle('visible', selectedType === 'texto');
        if (imf) imf.classList.toggle('visible', selectedType === 'imagem');
        if (vf) vf.classList.toggle('visible', selectedType === 'video');
      });
    });
  }

  // add student
  if (addStudentButton) {
    addStudentButton.addEventListener('click', () => {
      const container = $('#studentSelectContainer');
      if (!container) return;
      const row = document.createElement('div');
      row.className = 'student-row';
      const select = document.createElement('select');
      select.className = 'student-select';
      criarOpcoesAluno(select);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove-student-button';
      remove.textContent = '×';
      remove.addEventListener('click', () => row.remove());
      row.appendChild(select);
      row.appendChild(remove);
      container.appendChild(row);
    });
  }

  // publish button will be wired after DOM validation below in initAuthAndData
  if (!publishButton) console.debug('[app] publishButton não encontrado (#publishButton)');

  // pre-fill first student select(s)
  $$('.student-select').forEach(s => criarOpcoesAluno(s));
}

function criarOpcoesAluno(select) {
  select.innerHTML = '';
  const first = document.createElement('option');
  first.value = '';
  first.textContent = 'Selecione seu nome';
  select.appendChild(first);
  alunos.forEach(a => {
    const o = document.createElement('option');
    o.value = a;
    o.textContent = a;
    select.appendChild(o);
  });
}

// --- Auth + Data init
async function initAuthAndData() {
  // Attach publish button behavior and other functions that may rely on supabase
  const publishButton = $('#publishButton');
  if (publishButton) {
    publishButton.addEventListener('click', publicarTrabalho);
  } else {
    console.debug('[app] publishButton não ligado — elemento ausente');
  }

  // Admin login button
  const adminButton = $('#adminButton');
  if (adminButton) {
    adminButton.addEventListener('click', async () => {
      try {
        if (isAdmin) {
          await supabase.auth.signOut();
          isAdmin = false;
          adminButton.textContent = 'Entrar como administrador';
          await carregarTrabalhos();
          return;
        }
        // start Google OAuth flow
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin + window.location.pathname }
        });
      } catch (err) {
        console.error('[app] erro no login:', err);
        alert('Erro ao iniciar login com Google.');
      }
    });
  }

  // Listen auth state changes (important for redirect flow)
  supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      if (event === 'SIGNED_OUT') {
        isAdmin = false;
        $('#adminButton') && ($('#adminButton').textContent = 'Entrar como administrador');
        return;
      }
      if (session && session.user) {
        const email = (session.user.email || '').trim().toLowerCase();
        if (ADMIN_EMAILS.includes(email)) {
          isAdmin = true;
          $('#adminButton') && ($('#adminButton').textContent = 'Sair do administrador');
          // refresh data to show admin-only items
          await carregarTrabalhos();
        } else {
          isAdmin = false;
          $('#adminButton') && ($('#adminButton').textContent = 'Entrar como administrador');
          // immediately sign out unauthorized users to prevent token misuse in client
          await supabase.auth.signOut();
          alert('Conta não autorizada como administrador.');
        }
      }
    } catch (err) {
      console.error('[app] onAuthStateChange handler error:', err);
    }
  });

  // Check existing session (on page load)
  await verificarSessao();

  // Load data
  await carregarTrabalhos();
  await carregarEstatisticas();

  // Wire carousel controls now (after imageCarousel exists)
  wireCarouselControls();
}

async function verificarSessao() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session || !session.user) {
      isAdmin = false;
      $('#adminButton') && ($('#adminButton').textContent = 'Entrar como administrador');
      return;
    }
    const email = (session.user.email || '').trim().toLowerCase();
    if (ADMIN_EMAILS.includes(email)) {
      isAdmin = true;
      $('#adminButton') && ($('#adminButton').textContent = 'Sair do administrador');
    } else {
      // sign out unauthorized user for safety
      await supabase.auth.signOut();
      isAdmin = false;
      $('#adminButton') && ($('#adminButton').textContent = 'Entrar como administrador');
      alert('Esta conta do Google não possui acesso de administrador.');
    }
  } catch (err) {
    console.error('[app] verificarSessao erro:', err);
    isAdmin = false;
  }
}

/* ========== Core: carregarTrabalhos / aplicarFiltros / render ========== */

async function carregarTrabalhos() {
  try {
    let query = supabase.from('trabalhos').select('*');
    if (!isAdmin) query = query.eq('aprovado', true);
    query = query.order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) {
      console.error('[app] erro ao buscar trabalhos:', error);
      trabalhosCache = [];
      renderizarTrabalhos([]);
      return;
    }
    trabalhosCache = data || [];
    atualizarFiltros();
    aplicarFiltros();
    atualizarCarousel();
  } catch (err) {
    console.error('[app] carregarTrabalhos exception:', err);
  }
}

function aplicarFiltros() {
  // For now use global filtroAtual if set, otherwise show all
  const filtro = window.filtroAtual || { tipo: null, pessoa: null, ordenacao: 'recentes' };
  let resultado = [...trabalhosCache];
  if (filtro.tipo) {
    resultado = resultado.filter(t => String(t.tipo || '').trim().toLowerCase() === String(filtro.tipo).trim().toLowerCase());
  }
  if (filtro.pessoa) {
    resultado = resultado.filter(t => typeof t.nome === 'string' && t.nome.split(',').map(n => n.trim()).includes(filtro.pessoa));
  }
  if (filtro.ordenacao === 'recentes') {
    resultado.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (da && db) return db - da;
      return Number(b.id || 0) - Number(a.id || 0);
    });
  }
  renderizarTrabalhos(resultado);
}

function renderizarTrabalhos(trabalhos) {
  const worksArea = $('#worksArea');
  if (!worksArea) return;
  worksArea.innerHTML = '';
  if (!trabalhos || trabalhos.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'empty-state';
    const h = document.createElement('h1'); h.textContent = 'Nenhum trabalho encontrado';
    const p = document.createElement('p'); p.textContent = isAdmin ? 'Não existem trabalhos correspondentes ao filtro selecionado.' : 'Os trabalhos aprovados aparecerão aqui.';
    vazio.appendChild(h); vazio.appendChild(p);
    worksArea.appendChild(vazio);
    return;
  }

  trabalhos.forEach(trabalho => {
    if (!isAdmin && !trabalho.aprovado) return; // extra safety

    const card = document.createElement('article');
    card.className = 'work-card';

    const header = document.createElement('div'); header.className = 'work-header';
    const info = document.createElement('div');
    const author = document.createElement('div'); author.className = 'work-author'; author.textContent = trabalho.nome || '—';
    const date = document.createElement('div'); date.className = 'work-date';
    date.textContent = trabalho.created_at ? ('Publicado em ' + new Date(trabalho.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })) : 'Data de publicação indisponível';
    info.appendChild(author); info.appendChild(date);

    const type = document.createElement('div'); type.className = 'work-type';
    type.textContent = trabalho.tipo === 'texto' ? '📝 Texto' : (trabalho.tipo === 'imagem' ? '🖼️ Imagem' : '▶️ Vídeo');

    header.appendChild(info); header.appendChild(type);
    card.appendChild(header);

    if (isAdmin && !trabalho.aprovado) {
      const status = document.createElement('div'); status.className = 'pending-badge'; status.textContent = '⏳ Aguardando aprovação';
      card.appendChild(status);
    }

    if (trabalho.tipo === 'texto') {
      const t = document.createElement('div'); t.className = 'work-text'; t.textContent = trabalho.conteudo || '';
      card.appendChild(t);
    } else if (trabalho.tipo === 'imagem') {
      const img = document.createElement('img'); img.className = 'work-image'; img.src = trabalho.conteudo || ''; img.alt = 'Imagem do trabalho';
      img.loading = 'lazy';
      img.onerror = () => { img.alt = 'Não foi possível carregar esta imagem.'; };
      card.appendChild(img);
    } else if (trabalho.tipo === 'video') {
      const iframe = document.createElement('iframe'); iframe.className = 'work-video';
      iframe.src = transformarYoutubeUrl(trabalho.conteudo || '');
      iframe.title = 'Vídeo do trabalho';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      iframe.allowFullscreen = true;
      card.appendChild(iframe);
    }

    // Admin controls (created per-card)
    if (isAdmin) criarControlesAdmin(card, trabalho);

    worksArea.appendChild(card);
  });
}

/* Admin controls creation + actions */
function criarControlesAdmin(card, trabalho) {
  const controls = document.createElement('div'); controls.className = 'admin-controls';

  if (!trabalho.aprovado) {
    const approve = document.createElement('button'); approve.className = 'btn approve-button'; approve.textContent = 'Aprovar';
    approve.addEventListener('click', async () => {
      if (!confirm('Deseja aprovar este trabalho?')) return;
      try {
        approve.disabled = true; approve.textContent = 'Aprovando...';
        const { error } = await supabase.from('trabalhos').update({ aprovado: true }).eq('id', trabalho.id);
        if (error) { console.error(error); alert('Erro: ' + error.message); return; }
        await carregarTrabalhos(); await carregarEstatisticas();
      } catch (err) {
        console.error('aprovarTrabalho', err);
      } finally { approve.disabled = false; approve.textContent = 'Aprovar'; }
    });
    controls.appendChild(approve);
  }

  const edit = document.createElement('button'); edit.className = 'btn edit-button'; edit.textContent = 'Editar';
  edit.addEventListener('click', async () => {
    if (!isAdmin) { alert('Ação restrita a administradores.'); return; }
    const novoNome = prompt('Nome(s) dos alunos:', trabalho.nome || '');
    if (novoNome === null) return;
    if (!novoNome.trim()) { alert('O nome não pode ficar vazio.'); return; }
    const mensagem = trabalho.tipo === 'video' ? 'URL do vídeo:' : (trabalho.tipo === 'imagem' ? 'URL atual da imagem:' : 'Conteúdo do trabalho:');
    const novoConteudo = prompt(mensagem, trabalho.conteudo || '');
    if (novoConteudo === null) return;
    if (!novoConteudo.trim()) { alert('O conteúdo não pode ficar vazio.'); return; }
    try {
      edit.disabled = true; edit.textContent = 'Salvando...';
      const { error } = await supabase.from('trabalhos').update({ nome: novoNome.trim(), conteudo: novoConteudo.trim() }).eq('id', trabalho.id);
      if (error) { console.error(error); alert('Erro: ' + error.message); return; }
      alert('Trabalho editado com sucesso!');
      await carregarTrabalhos(); await carregarEstatisticas();
    } catch (err) {
      console.error('editarTrabalho', err);
    } finally { edit.disabled = false; edit.textContent = 'Editar'; }
  });
  controls.appendChild(edit);

  const remove = document.createElement('button'); remove.className = 'btn delete-button'; remove.textContent = 'Apagar';
  remove.addEventListener('click', async () => {
    if (!isAdmin) { alert('Ação restrita a administradores.'); return; }
    if (!confirm('Tem certeza que deseja apagar este trabalho? Essa ação não pode ser desfeita.')) return;
    try {
      remove.disabled = true; remove.textContent = 'Apagando...';
      const { error } = await supabase.from('trabalhos').delete().eq('id', trabalho.id);
      if (error) { console.error(error); alert('Erro: ' + error.message); return; }
      await carregarTrabalhos(); await carregarEstatisticas();
    } catch (err) {
      console.error('apagarTrabalho', err);
    } finally { remove.disabled = false; remove.textContent = 'Apagar'; }
  });
  controls.appendChild(remove);

  card.appendChild(controls);
}

/* Publish flow with image upload */
function gerarUUIDFallback() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = (Math.random() * 16) | 0; return ((c === 'x') ? r : (r & 0x3) | 0x8).toString(16); }); }

async function enviarImagemStorage(arquivo) {
  const MAX_MB = 15;
  const mb = arquivo.size / 1024 / 1024;
  if (mb > MAX_MB) throw new Error(`Imagem muito grande (${mb.toFixed(2)} MB). Limite ${MAX_MB} MB.`);
  const ext = arquivo.name.split('.').pop().toLowerCase();
  const uuid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : gerarUUIDFallback();
  const path = `trabalhos/${Date.now()}-${uuid}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, arquivo, { cacheControl: '3600', upsert: false, contentType: arquivo.type });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data || !data.publicUrl) throw new Error('Não foi possível obter a URL da imagem.');
  return data.publicUrl;
}

async function publicarTrabalho() {
  const publishButton = $('#publishButton');
  try {
    const type = selectedType;
    if (!type) return alert('Escolha o tipo de trabalho.');
    const nomes = Array.from(document.querySelectorAll('.student-select')).map(s => (s.value || '').trim()).filter(Boolean);
    if (nomes.length === 0) return alert('Selecione pelo menos um aluno.');
    let conteudo = '', arquivoImagem = null;
    if (type === 'texto') {
      conteudo = ($('#textContent')?.value || '').trim();
      if (!conteudo) return alert('Digite o conteúdo do trabalho.');
    }
    if (type === 'imagem') {
      arquivoImagem = $('#imageFile')?.files?.[0];
      if (!arquivoImagem) return alert('Escolha uma imagem antes de publicar.');
      if (!arquivoImagem.type.startsWith('image/')) return alert('O arquivo selecionado não é uma imagem.');
    }
    if (type === 'video') {
      conteudo = ($('#videoUrl')?.value || '').trim();
      if (!conteudo) return alert('Digite a URL do vídeo.');
      if (!conteudo.includes('youtube.com') && !conteudo.includes('youtu.be')) return alert('Digite uma URL válida do YouTube.');
    }

    publishButton.disabled = true; publishButton.textContent = type === 'imagem' ? 'Enviando imagem...' : 'Publicando...';

    if (type === 'imagem') {
      conteudo = await enviarImagemStorage(arquivoImagem);
    }

    const { error } = await supabase.from('trabalhos').insert({
      nome: nomes.join(', '),
      tipo: type,
      conteudo,
      aprovado: false,
      created_at: new Date().toISOString()
    });

    if (error) { console.error('insert error', error); alert('Não foi possível publicar: ' + error.message); return; }

    alert('Trabalho enviado para aprovação!');
    limparFormulario();
    await carregarTrabalhos(); await carregarEstatisticas();

  } catch (err) {
    console.error('publicarTrabalho', err);
    alert('Erro: ' + (err.message || err));
  } finally {
    if (publishButton) { publishButton.disabled = false; publishButton.textContent = 'Publicar Trabalho'; }
  }
}

function limparFormulario() {
  const text = $('#textContent'); const vid = $('#videoUrl'); const file = $('#imageFile'); const preview = $('#imagePreview');
  if (text) text.value = '';
  if (vid) vid.value = '';
  if (file) file.value = '';
  if (preview) { preview.src = ''; preview.classList.remove('visible'); }
  const container = $('#studentSelectContainer');
  if (container) {
    container.innerHTML = '';
    const row = document.createElement('div'); row.className = 'student-row';
    const sel = document.createElement('select'); sel.className = 'student-select';
    criarOpcoesAluno(sel);
    row.appendChild(sel); container.appendChild(row);
  }
  selectedType = null;
  $$('.type-button').forEach(b => b.classList.remove('selected'));
  $('#workFields') && $('#workFields').classList.remove('visible');
}

/* Estatísticas */
function alunoPossuiTipo(trabalhos, aluno, tipo) {
  return trabalhos.some(t => t.tipo === tipo && typeof t.nome === 'string' && t.nome.split(',').map(n => n.trim()).includes(aluno));
}

function renderizarEstatisticas(trabalhos) {
  const body = $('#statisticsBody'); const cards = $('#statisticsCards');
  if (!body) return;
  body.innerHTML = ''; if (cards) cards.innerHTML = '';
  alunos.forEach(aluno => {
    const tr = document.createElement('tr');
    const name = document.createElement('td'); name.className = 'statistics-name'; name.textContent = aluno; tr.appendChild(name);
    ['texto','imagem','video'].forEach(tipo => {
      const td = document.createElement('td');
      const ok = alunoPossuiTipo(trabalhos, aluno, tipo);
      const pill = document.createElement('div'); pill.className = 'pill ' + (ok ? 'completed' : 'missing'); pill.textContent = ok ? '✓' : '—';
      td.appendChild(pill); tr.appendChild(td);
    });
    body.appendChild(tr);

    if (cards) {
      const card = document.createElement('div'); card.className = 'stat-card';
      const n = document.createElement('div'); n.className = 'name'; n.textContent = aluno;
      const badges = document.createElement('div'); badges.className = 'stat-badges';
      [['texto','T'],['imagem','F'],['video','V']].forEach(([k,label])=>{
        const ok = alunoPossuiTipo(trabalhos, aluno, k);
        const b = document.createElement('div'); b.className = 'stat-badge ' + (ok ? 'completed' : 'missing'); b.textContent = label; badges.appendChild(b);
      });
      card.appendChild(n); card.appendChild(badges); cards.appendChild(card);
    }
  });
}

async function carregarEstatisticas() {
  try {
    const { data, error } = await supabase.from('trabalhos').select('*').eq('aprovado', true);
    if (error) { console.error('carregarEstatisticas', error); return; }
    renderizarEstatisticas(data || []);
  } catch (err) {
    console.error('carregarEstatisticas exception', err);
  }
}

/* Carousel */
let carouselState = { currentIndex: 0, timer: null, autoplayDelay: 4000, slidesCount: 0, paused: false };
function buildSlidesFromTrabalhos() { return (trabalhosCache || []).filter(t => t.tipo === 'imagem' && (isAdmin ? true : t.aprovado)); }
function atualizarCarousel() {
  const carouselTrack = document.querySelector('.carousel-track');
  const carouselSection = $('#carouselSection');
  if (!carouselTrack || !carouselSection) return;
  const slidesData = buildSlidesFromTrabalhos();
  if (!slidesData || slidesData.length === 0) { carouselSection.style.display = 'none'; clearInterval(carouselState.timer); return; } else carouselSection.style.display = '';
  carouselTrack.innerHTML = '';
  slidesData.forEach(s => {
    const slide = document.createElement('div'); slide.className = 'carousel-slide';
    const img = document.createElement('img'); img.src = s.conteudo; img.alt = s.nome || ''; img.loading = 'lazy';
    slide.appendChild(img); carouselTrack.appendChild(slide);
  });
  carouselState.slidesCount = slidesData.length; carouselState.currentIndex = 0; updateCarouselUI(); startCarouselTimer();
}
function updateCarouselUI() {
  const carouselTrack = document.querySelector('.carousel-track');
  if (!carouselTrack) return;
  carouselTrack.style.transform = `translateX(${ -carouselState.currentIndex * 100 }%)`;
}
function nextSlide() { if (carouselState.slidesCount === 0) return; carouselState.currentIndex = (carouselState.currentIndex + 1) % carouselState.slidesCount; updateCarouselUI(); }
function prevSlide() { if (carouselState.slidesCount === 0) return; carouselState.currentIndex = (carouselState.currentIndex - 1 + carouselState.slidesCount) % carouselState.slidesCount; updateCarouselUI(); }
function startCarouselTimer() { clearInterval(carouselState.timer); carouselState.timer = setInterval(()=>{ if(!carouselState.paused) nextSlide(); }, carouselState.autoplayDelay); }
function wireCarouselControls() {
  const prev = document.querySelector('.carousel-prev');
  const next = document.querySelector('.carousel-next');
  if (prev) prev.addEventListener('click', () => { prevSlide(); startCarouselTimer(); });
  if (next) next.addEventListener('click', () => { nextSlide(); startCarouselTimer(); });
  const imageCarouselEl = $('#imageCarousel');
  if (imageCarouselEl) {
    imageCarouselEl.addEventListener('mouseenter', ()=> carouselState.paused = true);
    imageCarouselEl.addEventListener('mouseleave', ()=> carouselState.paused = false);
  }
}

/* Filtros (people list) */
function atualizarFiltros() {
  const list = $('#peopleFilterList');
  if (!list) return;
  list.innerHTML = '';
  alunos.forEach(aluno => {
    const b = document.createElement('button'); b.className = 'filter-subbutton btn'; b.textContent = aluno;
    b.addEventListener('click', () => {
      window.filtroAtual = { tipo: null, pessoa: aluno, ordenacao: 'recentes' };
      $$('#peopleFilterList .filter-subbutton').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      aplicarFiltros();
    });
    list.appendChild(b);
  });
}
window.filtroAtual = { tipo: null, pessoa: null, ordenacao: 'recentes' };

/* Start */
(async function start() {
  // just ensure UI created handlers are available after file loaded
})();
