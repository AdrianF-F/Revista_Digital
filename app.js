// app.js (ESM) — compatível com index.html & statistics.html
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://tcertncsuhrtldeojqfx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6ojNocYnMs6HKTx6kEmsVQ_x_IbL-1E';
const STORAGE_BUCKET = 'imagens';

// Admins autorizados (exatamente)
const ADMIN_EMAILS = [
  'miguel.rocha.cardoso@escola.pr.gov.br',
  'francisco.silva.adrian@escola.pr.gov.br'
].map(e => String(e || '').trim().toLowerCase());

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Utils
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// Estado
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

// DOM ready
document.addEventListener('DOMContentLoaded', async () => {
  applySavedTheme();
  attachCommonHandlers();
  await handleAuthState();
  await loadInitialData();
  // If on statistics page, render stats view
  if (location.pathname.endsWith('statistics.html')) {
    await carregarEstatisticas();
    await carregarSubmissionsList();
  } else {
    // on index: update works and carousel
    await carregarTrabalhos();
  }
});

/* ----------------- THEME ----------------- */
function applySavedTheme(){
  try{
    const s = localStorage.getItem('revista_theme');
    if (s === 'light') { document.body.classList.add('light-theme'); $('#themeToggle') && ($('#themeToggle').textContent = '☀️'); }
    else { document.body.classList.remove('light-theme'); $('#themeToggle') && ($('#themeToggle').textContent = '🌙'); }
  }catch(e){}
}

/* ----------------- COMMON UI HANDLERS ----------------- */
function attachCommonHandlers(){
  // theme toggle
  $('#themeToggle')?.addEventListener('click', ()=> {
    const isLight = document.body.classList.toggle('light-theme');
    try{ localStorage.setItem('revista_theme', isLight ? 'light' : 'dark'); }catch{}
    $('#themeToggle').textContent = isLight ? '☀️' : '🌙';
  });

  // FAB
  $('#fabAddWork')?.addEventListener('click', ()=> {
    const form = $('#workForm');
    if (!form) return;
    const visible = form.classList.toggle('visible');
    form.setAttribute('aria-hidden', String(!visible));
    if (visible) form.scrollIntoView({ behavior:'smooth', block:'center' });
  });

  // populate first select(s)
  $$('.student-select').forEach(s => criarOpcoesAluno(s));
  $('#addStudentButton')?.addEventListener('click', ()=> {
    const container = $('#studentSelectContainer');
    if (!container) return;
    const row = document.createElement('div'); row.className = 'student-row';
    const sel = document.createElement('select'); sel.className = 'student-select'; criarOpcoesAluno(sel);
    const rem = document.createElement('button'); rem.type='button'; rem.className='remove-student-button'; rem.textContent='×';
    rem.addEventListener('click', ()=> row.remove());
    row.appendChild(sel); row.appendChild(rem); container.appendChild(row);
  });

  // type buttons
  $$('.type-button').forEach(btn => {
    btn.addEventListener('click', ()=> {
      $$('.type-button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedType = btn.dataset.type;
      $('#workFields') && $('#workFields').classList.add('visible');
      $('#textField') && $('#textField').classList.toggle('visible', selectedType === 'texto');
      $('#imageField') && $('#imageField').classList.toggle('visible', selectedType === 'imagem');
      $('#videoField') && $('#videoField').classList.toggle('visible', selectedType === 'video');
    });
  });

  // image preview
  $('#imageFile')?.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    const preview = $('#imagePreview'); const status = $('#imageUploadStatus');
    if (!f) { if(preview) { preview.src=''; preview.classList.remove('visible'); } if(status) status.textContent='Selecione uma imagem do seu dispositivo.'; return; }
    if (!f.type.startsWith('image/')) { e.target.value=''; if(preview) preview.src=''; if(status) status.textContent='O arquivo selecionado não é uma imagem.'; return; }
    const reader = new FileReader(); reader.onload = ev => { if(preview) { preview.src = ev.target.result; preview.classList.add('visible'); } }; reader.readAsDataURL(f);
    if(status) status.textContent = `${f.name} • ${(f.size/1024/1024).toFixed(2)} MB`;
  });

  // publish
  $('#publishButton')?.addEventListener('click', async () => {
    await publicarTrabalho();
  });

  // admin login button
  $('#adminButton')?.addEventListener('click', async () => {
    try {
      if (isAdmin) { await supabase.auth.signOut(); isAdmin = false; $('#adminButton').textContent = 'Entrar como administrador'; await carregarTrabalhos(); return; }
      // start Google OAuth; Supabase will redirect
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
    } catch (err) {
      console.error('Erro iniciar login', err);
      alert('Erro ao iniciar login com Google.');
    }
  });
}

/* ----------------- AUTH STATE ----------------- */
async function handleAuthState(){
  // listen for auth changes (including redirect)
  supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      if (event === 'SIGNED_OUT') { isAdmin = false; $('#adminButton') && ($('#adminButton').textContent = 'Entrar como administrador'); return; }
      if (session && session.user) {
        const email = (session.user.email || '').trim().toLowerCase();
        if (ADMIN_EMAILS.includes(email)) {
          isAdmin = true;
          $('#adminButton') && ($('#adminButton').textContent = 'Sair do administrador');
          await carregarTrabalhos(); // refresh to show pendentes
        } else {
          isAdmin = false;
          await supabase.auth.signOut();
          alert('Conta não autorizada como administrador.');
        }
      }
    } catch(e) {
      console.error('onAuthStateChange error', e);
    }
  });

  // initial session check
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (session && session.user) {
      const email = (session.user.email || '').trim().toLowerCase();
      if (ADMIN_EMAILS.includes(email)) {
        isAdmin = true;
        $('#adminButton') && ($('#adminButton').textContent = 'Sair do administrador');
      } else {
        // optional: sign out unauthorized user
        await supabase.auth.signOut();
      }
    }
  } catch(e) { console.error('verificarSessao', e); isAdmin = false; }
}

/* ----------------- DATA: carregarTrabalhos / render ----------------- */
async function carregarTrabalhos(){
  try {
    let q = supabase.from('trabalhos').select('*');
    if (!isAdmin) q = q.eq('aprovado', true);
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) { console.error('erro carregarTrabalhos', error); trabalhosCache = []; renderizarTrabalhos([]); return; }
    trabalhosCache = data || [];
    atualizarFiltros();
    aplicarFiltros();
    atualizarCarousel();
  } catch (e) { console.error(e); }
}

function aplicarFiltros(){
  const filtro = window.filtroAtual || { tipo: null, pessoa: null, ordenacao: 'recentes' };
  let resultado = [...trabalhosCache];
  if (filtro.tipo) resultado = resultado.filter(t => String(t.tipo || '').trim().toLowerCase() === String(filtro.tipo).trim().toLowerCase());
  if (filtro.pessoa) resultado = resultado.filter(t => typeof t.nome === 'string' && t.nome.split(',').map(n => n.trim()).includes(filtro.pessoa));
  if (filtro.ordenacao === 'recentes') resultado.sort((a,b)=> {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (da && db) return db - da;
    return Number(b.id || 0) - Number(a.id || 0);
  });
  renderizarTrabalhos(resultado);
}

function renderizarTrabalhos(trabalhos){
  const area = $('#worksArea');
  if (!area) return;
  area.innerHTML = '';
  if (!trabalhos || trabalhos.length === 0) {
    const vazio = document.createElement('div'); vazio.className = 'empty-state';
    vazio.innerHTML = '<h1>Nenhum trabalho encontrado</h1><p>Os trabalhos aprovados aparecerão aqui.</p>';
    area.appendChild(vazio);
    return;
  }

  trabalhos.forEach(trabalho => {
    if (!isAdmin && !trabalho.aprovado) return;
    const card = document.createElement('article'); card.className = 'work-card';
    const header = document.createElement('div'); header.className = 'work-header';
    const info = document.createElement('div');
    const author = document.createElement('div'); author.className = 'work-author'; author.textContent = trabalho.nome || '';
    const date = document.createElement('div'); date.className = 'work-date'; date.textContent = trabalho.created_at ? ('Publicado em ' + new Date(trabalho.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})) : 'Data indisponível';
    info.appendChild(author); info.appendChild(date);
    const type = document.createElement('div'); type.className = 'work-type'; type.textContent = trabalho.tipo === 'texto' ? '📝 Texto' : (trabalho.tipo === 'imagem' ? '🖼️ Imagem' : '▶️ Vídeo');
    header.appendChild(info); header.appendChild(type); card.appendChild(header);

    if (isAdmin && !trabalho.aprovado) {
      const pending = document.createElement('div'); pending.className = 'pending-badge'; pending.textContent = '⏳ Aguardando aprovação';
      card.appendChild(pending);
    }

    if (trabalho.tipo === 'texto') {
      const t = document.createElement('div'); t.className = 'work-text'; t.textContent = trabalho.conteudo || '';
      card.appendChild(t);
    } else if (trabalho.tipo === 'imagem') {
      const img = document.createElement('img'); img.className = 'work-image'; img.src = trabalho.conteudo || ''; img.alt = 'Imagem do trabalho'; img.loading = 'lazy';
      img.onerror = () => img.alt = 'Não foi possível carregar esta imagem.';
      card.appendChild(img);
    } else if (trabalho.tipo === 'video') {
      const iframe = document.createElement('iframe'); iframe.className = 'work-video'; iframe.src = transformarYoutubeUrl(trabalho.conteudo || ''); iframe.title = 'Vídeo do trabalho';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; iframe.allowFullscreen = true;
      card.appendChild(iframe);
    }

    if (isAdmin) criarControlesAdmin(card, trabalho);
    area.appendChild(card);
  });
}

/* ----------------- Admin controls (Aprovar / Editar / Apagar) ----------------- */
function criarControlesAdmin(card, trabalho){
  if (!isAdmin) return;
  const controls = document.createElement('div'); controls.className = 'admin-controls';

  if (!trabalho.aprovado) {
    const approve = document.createElement('button'); approve.className = 'btn positive'; approve.textContent = 'Aprovar';
    approve.addEventListener('click', async () => {
      if (!confirm('Deseja aprovar este trabalho?')) return;
      try { approve.disabled = true; approve.textContent = 'Aprovando...'; const { error } = await supabase.from('trabalhos').update({ aprovado: true }).eq('id', trabalho.id); if (error) { alert('Erro: '+error.message); return; } await carregarTrabalhos(); await carregarEstatisticas(); } finally { approve.disabled = false; approve.textContent = 'Aprovar'; }
    });
    controls.appendChild(approve);
  }

  const edit = document.createElement('button'); edit.className = 'btn'; edit.textContent = 'Editar';
  edit.addEventListener('click', async () => {
    if (!isAdmin) return alert('Ação restrita a administradores.');
    const novoNome = prompt('Nome(s) dos alunos:', trabalho.nome || '');
    if (novoNome === null) return;
    if (!novoNome.trim()) return alert('Nome não pode ficar vazio.');
    const mensagem = trabalho.tipo === 'video' ? 'URL do vídeo:' : (trabalho.tipo === 'imagem' ? 'URL atual da imagem:' : 'Conteúdo do trabalho:');
    const novoConteudo = prompt(mensagem, trabalho.conteudo || '');
    if (novoConteudo === null) return;
    if (!novoConteudo.trim()) return alert('O conteúdo não pode ficar vazio.');
    try { edit.disabled = true; edit.textContent = 'Salvando...'; const { error } = await supabase.from('trabalhos').update({ nome: novoNome.trim(), conteudo: novoConteudo.trim() }).eq('id', trabalho.id); if (error) { alert('Erro: '+error.message); return; } alert('Trabalho editado com sucesso!'); await carregarTrabalhos(); await carregarEstatisticas(); } finally { edit.disabled = false; edit.textContent = 'Editar'; }
  });
  controls.appendChild(edit);

  const remove = document.createElement('button'); remove.className = 'btn danger'; remove.textContent = 'Apagar';
  remove.addEventListener('click', async () => {
    if (!confirm('Tem certeza que deseja apagar este trabalho? Essa ação não pode ser desfeita.')) return;
    try { remove.disabled = true; remove.textContent = 'Apagando...'; const { error } = await supabase.from('trabalhos').delete().eq('id', trabalho.id); if (error) { alert('Erro: '+error.message); return; } await carregarTrabalhos(); await carregarEstatisticas(); } finally { remove.disabled = false; remove.textContent = 'Apagar'; }
  });
  controls.appendChild(remove);

  card.appendChild(controls);
}

/* ----------------- Publish (upload imagem) ----------------- */
function gerarUUIDFallback(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{ const r=(Math.random()*16)|0; return ((c==='x')?r:((r&0x3)|0x8)).toString(16); }); }

async function enviarImagemStorage(file){
  const MAX_MB = 15; const mb = file.size / 1024 / 1024; if (mb > MAX_MB) throw new Error(`Imagem muito grande (${mb.toFixed(2)} MB). Limite ${MAX_MB} MB.`);
  const ext = file.name.split('.').pop().toLowerCase();
  const uuid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : gerarUUIDFallback();
  const path = `trabalhos/${Date.now()}-${uuid}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if (!data || !data.publicUrl) throw new Error('Não foi possível obter a URL da imagem.');
  return data.publicUrl;
}

async function publicarTrabalho(){
  const publishBtn = $('#publishButton');
  try {
    if (!selectedType) return alert('Escolha o tipo de trabalho.');
    const nomes = Array.from(document.querySelectorAll('.student-select')).map(s => (s.value||'').trim()).filter(Boolean);
    if (nomes.length === 0) return alert('Selecione pelo menos um aluno.');
    let conteudo = '';
    if (selectedType === 'texto') {
      conteudo = ($('#textContent')?.value || '').trim();
      if (!conteudo) return alert('Digite o conteúdo do trabalho.');
    }
    if (selectedType === 'imagem') {
      const f = $('#imageFile')?.files?.[0];
      if (!f) return alert('Escolha uma imagem antes de publicar.');
      if (!f.type.startsWith('image/')) return alert('O arquivo selecionado não é uma imagem.');
      publishBtn.disabled = true; publishBtn.textContent = 'Enviando imagem...';
      conteudo = await enviarImagemStorage(f);
    }
    if (selectedType === 'video') {
      conteudo = ($('#videoUrl')?.value || '').trim();
      if (!conteudo) return alert('Digite a URL do vídeo.');
      if (!conteudo.includes('youtube.com') && !conteudo.includes('youtu.be')) return alert('Digite uma URL válida do YouTube.');
    }

    publishBtn.disabled = true; publishBtn.textContent = 'Publicando...';
    const { error } = await supabase.from('trabalhos').insert({ nome: nomes.join(', '), tipo: selectedType, conteudo, aprovado: false, created_at: new Date().toISOString() });
    if (error) { alert('Não foi possível publicar: ' + error.message); return; }
    alert('Trabalho enviado para aprovação!');
    limparFormulario();
    await carregarTrabalhos(); await carregarEstatisticas();
  } catch (err) {
    console.error(err); alert('Erro: ' + (err.message || err));
  } finally {
    if (publishBtn) { publishBtn.disabled = false; publishBtn.textContent = 'Publicar Trabalho'; }
  }
}

function limparFormulario(){
  $('#textContent') && ($('#textContent').value='');
  $('#videoUrl') && ($('#videoUrl').value='');
  $('#imageFile') && ($('#imageFile').value='');
  $('#imagePreview') && ($('#imagePreview').src='');
  const cont = $('#studentSelectContainer');
  if (cont) { cont.innerHTML = ''; const r = document.createElement('div'); r.className='student-row'; const s = document.createElement('select'); s.className='student-select'; criarOpcoesAluno(s); r.appendChild(s); cont.appendChild(r); }
  selectedType = null;
  $$('.type-button').forEach(b => b.classList.remove('selected'));
  $('#workFields') && $('#workFields').classList.remove('visible');
}

/* ----------------- Statistics & Submissions list ----------------- */
function alunoPossuiTipo(trabalhos, aluno, tipo){
  return trabalhos.some(t => t.tipo === tipo && typeof t.nome === 'string' && t.nome.split(',').map(n => n.trim()).includes(aluno));
}

function renderizarEstatisticas(trabalhos){
  const body = $('#statisticsBody'); if (!body) return; body.innerHTML = '';
  alunos.forEach(aluno => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td'); tdName.className = 'statistics-name'; tdName.textContent = aluno; tr.appendChild(tdName);
    ['texto','imagem','video'].forEach(tipo => {
      const td = document.createElement('td');
      const ok = alunoPossuiTipo(trabalhos, aluno, tipo);
      const pill = document.createElement('div'); pill.className = 'pill ' + (ok ? 'completed' : 'missing'); pill.textContent = ok ? '✓' : '—';
      td.appendChild(pill); tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  // mobile cards
  const cards = $('#statisticsCards'); if (cards) { cards.innerHTML = ''; alunos.forEach(aluno => {
    const card = document.createElement('div'); card.className = 'stat-card';
    const name = document.createElement('div'); name.className = 'name'; name.textContent = aluno;
    const badges = document.createElement('div'); badges.className = 'stat-badges';
    [['texto','T'],['imagem','F'],['video','V']].forEach(([k,l]) => {
      const ok = alunoPossuiTipo(trabalhos, aluno, k);
      const b = document.createElement('div'); b.className = 'stat-badge ' + (ok ? 'completed' : 'missing'); b.textContent = l; badges.appendChild(b);
    });
    card.appendChild(name); card.appendChild(badges); cards.appendChild(card);
  }); }
}

async function carregarEstatisticas(){
  try {
    const { data, error } = await supabase.from('trabalhos').select('*').eq('aprovado', true);
    if (error) { console.error(error); return; }
    renderizarEstatisticas(data || []);
  } catch (e) { console.error(e); }
}

/* Submissions list (view details) */
async function carregarSubmissionsList(){
  const container = $('#submissionsContainer'); if (!container) return;
  try {
    // admins see all; public sees only approved
    let q = supabase.from('trabalhos').select('*').order('created_at', { ascending:false });
    if (!isAdmin) q = q.eq('aprovado', true);
    const { data, error } = await q;
    if (error) { console.error('carregarSubmissionsList', error); container.textContent = 'Erro ao carregar envios.'; return; }
    container.innerHTML = '';
    (data || []).forEach(item => {
      const card = document.createElement('div'); card.className = 'work-card';
      const header = document.createElement('div'); header.className = 'work-header';
      const info = document.createElement('div');
      const author = document.createElement('div'); author.className = 'work-author'; author.textContent = item.nome || '';
      const date = document.createElement('div'); date.className = 'work-date'; date.textContent = item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '';
      info.appendChild(author); info.appendChild(date);
      const type = document.createElement('div'); type.className = 'work-type'; type.textContent = item.tipo === 'texto' ? '📝' : (item.tipo === 'imagem' ? '🖼️' : '▶️');
      header.appendChild(info); header.appendChild(type); card.appendChild(header);

      const actions = document.createElement('div'); actions.style.marginTop = '8px';
      const viewBtn = document.createElement('button'); viewBtn.className = 'btn'; viewBtn.textContent = 'Ver envio';
      viewBtn.addEventListener('click', ()=> openSubmissionModal(item));
      actions.appendChild(viewBtn);

      if (isAdmin && !item.aprovado) {
        const approve = document.createElement('button'); approve.className = 'btn positive'; approve.textContent = 'Aprovar';
        approve.addEventListener('click', async ()=> { if (!confirm('Aprovar?')) return; const { error } = await supabase.from('trabalhos').update({ aprovado:true }).eq('id', item.id); if (error) { alert('Erro: '+error.message); return; } await carregarSubmissionsList(); await carregarTrabalhos(); });
        actions.appendChild(approve);
      }

      card.appendChild(actions);
      container.appendChild(card);
    });
  } catch (e) { console.error(e); container.textContent = 'Erro ao carregar envios.'; }
}

/* Modal */
function openSubmissionModal(item){
  const modal = $('#submissionModal'); const content = $('#modalContent'); if(!modal || !content) return;
  content.innerHTML = '';
  const title = document.createElement('h3'); title.textContent = `Envio de: ${item.nome || ''}`; content.appendChild(title);
  const meta = document.createElement('p'); meta.style.color = 'var(--muted)'; meta.textContent = `Tipo: ${item.tipo} • Publicado em: ${ item.created_at ? new Date(item.created_at).toLocaleString('pt-BR') : '—' }`; content.appendChild(meta);
  if (item.tipo === 'texto') {
    const div = document.createElement('div'); div.style.whiteSpace = 'pre-wrap'; div.style.marginTop = '10px'; div.textContent = item.conteudo || ''; content.appendChild(div);
  } else if (item.tipo === 'imagem') {
    const img = document.createElement('img'); img.src = item.conteudo || ''; img.alt = 'Imagem do envio'; img.style.maxWidth = '100%'; img.style.borderRadius='8px'; img.style.marginTop='10px'; content.appendChild(img);
  } else if (item.tipo === 'video') {
    const iframe = document.createElement('iframe'); iframe.src = transformarYoutubeUrl(item.conteudo || ''); iframe.style.width='100%'; iframe.style.height='420px'; iframe.style.border='none'; iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; content.appendChild(iframe);
  }
  modal.style.display = 'flex';
  $('#closeModal')?.addEventListener('click', ()=> { modal.style.display = 'none'; });
}

/* ----------------- Carousel ----------------- */
let carouselState = { currentIndex:0, timer:null, autoplayDelay:4000, slidesCount:0, paused:false };
function buildSlidesFromTrabalhos(){ return (trabalhosCache || []).filter(t => t.tipo === 'imagem' && (isAdmin ? true : t.aprovado)); }
function atualizarCarousel(){
  const track = document.querySelector('.carousel-track'); const section = $('#carouselSection');
  if (!track || !section) return;
  const slides = buildSlidesFromTrabalhos();
  if (!slides || slides.length === 0) { section.style.display = 'none'; clearInterval(carouselState.timer); return; } else section.style.display = '';
  track.innerHTML = '';
  slides.forEach(s => {
    const slide = document.createElement('div'); slide.className = 'carousel-slide';
    const img = document.createElement('img'); img.src = s.conteudo; img.alt = s.nome || ''; slide.appendChild(img); track.appendChild(slide);
  });
  carouselState.slidesCount = slides.length; carouselState.currentIndex = 0; updateCarouselUI(); startCarouselTimer();
}
function updateCarouselUI(){ const track = document.querySelector('.carousel-track'); if(!track) return; track.style.transform = `translateX(${ -carouselState.currentIndex * 100 }%)`; }
function nextSlide(){ if(carouselState.slidesCount === 0) return; carouselState.currentIndex = (carouselState.currentIndex + 1) % carouselState.slidesCount; updateCarouselUI(); }
function prevSlide(){ if(carouselState.slidesCount === 0) return; carouselState.currentIndex = (carouselState.currentIndex - 1 + carouselState.slidesCount) % carouselState.slidesCount; updateCarouselUI(); }
function startCarouselTimer(){ clearInterval(carouselState.timer); carouselState.timer = setInterval(()=>{ if(!carouselState.paused) nextSlide(); }, carouselState.autoplayDelay); }
document.addEventListener('click', e => { if (e.target.matches('.carousel-prev')) { prevSlide(); startCarouselTimer(); } if (e.target.matches('.carousel-next')) { nextSlide(); startCarouselTimer(); } });
document.addEventListener('mouseover', e => { if (e.target.closest && e.target.closest('#imageCarousel')) carouselState.paused = true; });
document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('#imageCarousel')) carouselState.paused = false; });

/* ----------------- Helper: Youtube embed ----------------- */
function transformarYoutubeUrl(url){
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url.trim());
    let id = '';
    const h = u.hostname.toLowerCase();
    if (h.includes('youtu.be')) id = u.pathname.substring(1);
    else if (h.includes('youtube.com')) {
      id = u.searchParams.get('v') || '';
      if (!id && u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
      if (!id && u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
    }
    if (!id || !/^[a-zA-Z0-9_-]{6,}$/.test(id)) return url;
    return 'https://www.youtube.com/embed/' + encodeURIComponent(id);
  } catch {
    return url;
  }
}

/* ----------------- Filters: populate people ----------------- */
function atualizarFiltros(){
  const list = $('#peopleFilterList'); if (!list) return; list.innerHTML = '';
  alunos.forEach(a => {
    const b = document.createElement('button'); b.className = 'filter-subbutton btn'; b.textContent = a;
    b.addEventListener('click', ()=> {
      window.filtroAtual = { tipo: null, pessoa: a, ordenacao: 'recentes' };
      $$('#peopleFilterList .filter-subbutton').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      aplicarFiltros();
    });
    list.appendChild(b);
  });
}
window.filtroAtual = { tipo: null, pessoa: null, ordenacao: 'recentes' };

/* ----------------- Util: criarOpcoesAluno ----------------- */
function criarOpcoesAluno(select){
  select.innerHTML = ''; const first = document.createElement('option'); first.value=''; first.textContent='Selecione seu nome'; select.appendChild(first);
  alunos.forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = a; select.appendChild(o); });
}

/* ----------------- Initial data loads ----------------- */
async function loadInitialData(){
  await carregarTrabalhos();
  await carregarEstatisticas();
  atualizarFiltros();
  atualizarCarousel();
}

/* ----------------- Exports for manual testing if needed ----------------- */
window.supabaseClient = supabase;
window.isAdmin = () => isAdmin;
window.carregarTrabalhos = carregarTrabalhos;
window.carregarEstatisticas = carregarEstatisticas;
window.carregarSubmissionsList = carregarSubmissionsList;
