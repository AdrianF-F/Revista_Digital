import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://tcertncsuhrtldeojqfx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6ojNocYnMs6HKTx6kEmsVQ_x_IbL-1E';
const STORAGE_BUCKET = 'imagens';

// Administradores permitidos (usei os dois que você confirmou)
const ADMIN_EMAILS = [
  'miguel.rocha.cardoso@escola.pr.gov.br',
  'francisco.silva.adrian@escola.pr.gov.br'
].map(e => String(e || '').trim().toLowerCase());

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helpers
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// Estado
let isAdmin = false;
let trabalhosCache = [];
let selectedType = null;

// Lista de alunos formatada/ordenada
const alunos = [
  "Adrian Felipe","Adryan Felyp","Ana Gabryella","Ana Lara","Atailton","Caio","Camila",
  "Elieder","Emanuelly","Haniel","Iago","Isadora","João Pedro","João Victor","José Adriano",
  "Kethelyn","Kelly","Lucas","Luiz Gustavo","Maria Heloísa","Milena","Miguel Felipe",
  "Miguel Fernando","Pedro","Samira"
].sort((a,b)=>a.localeCompare(b,'pt-BR'));

// Aguarda DOM
document.addEventListener('DOMContentLoaded', () => {
  attachUiHandlers();
  handleAuthAndData();
});

function attachUiHandlers() {
  // FAB
  const fab = $('#fabAddWork'), workForm = $('#workForm');
  fab?.addEventListener('click', () => {
    const visible = workForm.classList.toggle('visible');
    workForm.setAttribute('aria-hidden', String(!visible));
    if (visible) workForm.scrollIntoView({ behavior:'smooth', block:'center' });
  });

  // theme
  const themeToggle = $('#themeToggle');
  if (themeToggle) {
    try {
      const saved = localStorage.getItem('revista_theme');
      if (saved === 'light') document.body.classList.add('light-theme');
    } catch {}
    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      try { localStorage.setItem('revista_theme', isLight ? 'light' : 'dark'); } catch {}
      themeToggle.textContent = isLight ? '☀️' : '🌙';
    });
  }

  // nav (Inicio / Estatísticas)
  const homeBtn = $('#homeButton'), statsBtn = $('#statisticsButton'), homeSection = $('#homeSection'), statsSection = $('#statisticsSection'), rightSidebar = $('#rightSidebar');
  homeBtn?.addEventListener('click', async () => {
    homeBtn.classList.add('active'); statsBtn?.classList.remove('active');
    homeSection && (homeSection.style.display = 'block');
    statsSection && statsSection.classList.remove('visible');
    if (rightSidebar) rightSidebar.style.display = '';
    await carregarTrabalhos();
  });
  statsBtn?.addEventListener('click', async () => {
    statsBtn.classList.add('active'); homeBtn?.classList.remove('active');
    homeSection && (homeSection.style.display = 'none');
    statsSection && statsSection.classList.add('visible');
    if (rightSidebar) rightSidebar.style.display = 'none';
    await carregarEstatisticas();
  });

  // Tipo buttons
  $$('.type-button').forEach(btn => btn.addEventListener('click', () => {
    $$('.type-button').forEach(b=>b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedType = btn.dataset.type;
    $('#workFields') && $('#workFields').classList.add('visible');
    $('#textField') && $('#textField').classList.toggle('visible', selectedType === 'texto');
    $('#imageField') && $('#imageField').classList.toggle('visible', selectedType === 'imagem');
    $('#videoField') && $('#videoField').classList.toggle('visible', selectedType === 'video');
  }));

  // Add aluno
  $('#addStudentButton')?.addEventListener('click', () => {
    const container = $('#studentSelectContainer');
    if (!container) return;
    const row = document.createElement('div'); row.className='student-row';
    const sel = document.createElement('select'); sel.className='student-select';
    criarOpcoesAluno(sel);
    const rem = document.createElement('button'); rem.type='button'; rem.className='remove-student-button'; rem.textContent='×';
    rem.addEventListener('click', ()=>row.remove());
    row.appendChild(sel); row.appendChild(rem); container.appendChild(row);
  });

  // image preview
  $('#imageFile')?.addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    const preview = $('#imagePreview'); const status = $('#imageUploadStatus');
    if (!f) { preview && (preview.src=''); preview && preview.classList.remove('visible'); if(status) status.textContent='Selecione uma imagem do seu dispositivo.'; return; }
    if (!f.type.startsWith('image/')) { e.target.value=''; preview && (preview.src=''); preview && preview.classList.remove('visible'); if(status) status.textContent='O arquivo selecionado não é uma imagem.'; return; }
    const reader = new FileReader(); reader.onload = ev => { preview.src = ev.target.result; preview.classList.add('visible'); }; reader.readAsDataURL(f);
    if (status) status.textContent = `${f.name} • ${(f.size/1024/1024).toFixed(2)} MB`;
  });

  // Publish
  $('#publishButton')?.addEventListener('click', async () => {
    await publicarTrabalho();
  });
}

// popula select de alunos
function criarOpcoesAluno(select) {
  select.innerHTML = '';
  const first = document.createElement('option'); first.value=''; first.textContent='Selecione seu nome'; select.appendChild(first);
  alunos.forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = a; select.appendChild(o); });
}
$$('.student-select').forEach(s => criarOpcoesAluno(s));

// Auth flow + data
async function handleAuthAndData() {
  // Attach admin button login behavior
  $('#adminButton')?.addEventListener('click', async () => {
    try {
      if (isAdmin) {
        await supabase.auth.signOut(); isAdmin = false; $('#adminButton').textContent = 'Entrar como administrador'; await carregarTrabalhos(); return;
      }
      // start Google OAuth
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
    } catch (err) {
      console.error('login error', err); alert('Erro ao iniciar login com Google.');
    }
  });

  // listen for changes (OAuth redirect)
  supabase.auth.onAuthStateChange(async (event, session) => {
    try {
      if (event === 'SIGNED_OUT') { isAdmin=false; $('#adminButton') && ($('#adminButton').textContent='Entrar como administrador'); return; }
      if (session && session.user) {
        const email = (session.user.email || '').trim().toLowerCase();
        if (ADMIN_EMAILS.includes(email)) {
          isAdmin = true; $('#adminButton') && ($('#adminButton').textContent='Sair do administrador');
          await carregarTrabalhos();
        } else {
          isAdmin = false; await supabase.auth.signOut(); alert('Esta conta do Google não possui acesso de administrador.');
        }
      }
    } catch (err) { console.error('onAuthStateChange', err); }
  });

  // check session on load
  await verificarSessao();

  // initial data
  await carregarTrabalhos();
  await carregarEstatisticas();
  atualizarFiltros();
  atualizarCarousel();
}

async function verificarSessao() {
  try {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;
    if (!session || !session.user) { isAdmin=false; $('#adminButton') && ($('#adminButton').textContent='Entrar como administrador'); return; }
    const email = (session.user.email || '').trim().toLowerCase();
    if (ADMIN_EMAILS.includes(email)) { isAdmin = true; $('#adminButton') && ($('#adminButton').textContent='Sair do administrador'); } else { await supabase.auth.signOut(); isAdmin=false; $('#adminButton') && ($('#adminButton').textContent='Entrar como administrador'); alert('Conta não autorizada.'); }
  } catch (err) { console.error('verificarSessao', err); isAdmin=false; }
}

/* carregar / render */
async function carregarTrabalhos() {
  try {
    let q = supabase.from('trabalhos').select('*');
    if (!isAdmin) q = q.eq('aprovado', true);
    q = q.order('created_at', { ascending:false });
    const { data, error } = await q;
    if (error) { console.error('erro carregarTrabalhos', error); trabalhosCache = []; renderizarTrabalhos([]); return; }
    trabalhosCache = data || [];
    atualizarFiltros();
    aplicarFiltros();
    atualizarCarousel();
  } catch (err) {
    console.error('carregarTrabalhos exception', err);
  }
}

function aplicarFiltros() {
  const f = window.filtroAtual || { tipo:null, pessoa:null, ordenacao:'recentes' };
  let resultado = [...trabalhosCache];
  if (f.tipo) resultado = resultado.filter(t => String(t.tipo||'').trim().toLowerCase() === String(f.tipo).toLowerCase());
  if (f.pessoa) resultado = resultado.filter(t => typeof t.nome === 'string' && t.nome.split(',').map(n=>n.trim()).includes(f.pessoa));
  if (f.ordenacao === 'recentes') resultado.sort((a,b)=>{ const da = a.created_at ? new Date(a.created_at).getTime() : 0; const db = b.created_at ? new Date(b.created_at).getTime() : 0; if(da && db) return db - da; return Number(b.id||0) - Number(a.id||0); });
  renderizarTrabalhos(resultado);
}

function renderizarTrabalhos(trabalhos) {
  const area = $('#worksArea'); if (!area) return; area.innerHTML = '';
  if (!trabalhos || trabalhos.length === 0) {
    const vazio = document.createElement('div'); vazio.className='empty-state';
    const h = document.createElement('h1'); h.textContent='Nenhum trabalho encontrado';
    const p = document.createElement('p'); p.textContent = isAdmin ? 'Não existem trabalhos correspondentes ao filtro selecionado.' : 'Os trabalhos aprovados aparecerão aqui.';
    vazio.appendChild(h); vazio.appendChild(p); area.appendChild(vazio); return;
  }
  trabalhos.forEach(t => {
    if (!isAdmin && !t.aprovado) return;
    const card = document.createElement('article'); card.className='work-card';
    const header = document.createElement('div'); header.className='work-header';
    const info = document.createElement('div');
    const author = document.createElement('div'); author.className='work-author'; author.textContent = t.nome || '';
    const date = document.createElement('div'); date.className='work-date'; date.textContent = t.created_at ? ('Publicado em ' + new Date(t.created_at).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})) : 'Data indisponível';
    info.appendChild(author); info.appendChild(date);
    const type = document.createElement('div'); type.className='work-type'; type.textContent = t.tipo==='texto'?'📝 Texto': t.tipo==='imagem'?'🖼️ Imagem':'▶️ Vídeo';
    header.appendChild(info); header.appendChild(type); card.appendChild(header);
    if (isAdmin && !t.aprovado) { const st=document.createElement('div'); st.className='pending-badge'; st.textContent='⏳ Aguardando aprovação'; card.appendChild(st); }
    if (t.tipo === 'texto') { const d=document.createElement('div'); d.className='work-text'; d.textContent = t.conteudo || ''; card.appendChild(d); }
    if (t.tipo === 'imagem') { const img = document.createElement('img'); img.className='work-image'; img.src = t.conteudo || ''; img.alt='Imagem do trabalho'; img.loading='lazy'; img.onerror = ()=> img.alt='Não foi possível carregar esta imagem.'; card.appendChild(img); }
    if (t.tipo === 'video') { const iframe = document.createElement('iframe'); iframe.className='work-video'; iframe.src = transformarYoutubeUrl(t.conteudo || ''); iframe.title='Vídeo do trabalho'; iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; iframe.allowFullscreen=true; card.appendChild(iframe); }
    if (isAdmin) criarControlesAdmin(card, t);
    area.appendChild(card);
  });
}

/* Admin controls */
function criarControlesAdmin(card, trabalho) {
  const controls = document.createElement('div'); controls.className='admin-controls';
  if (!trabalho.aprovado) {
    const approve = document.createElement('button'); approve.className='btn positive'; approve.textContent='Aprovar';
    approve.addEventListener('click', async ()=> {
      if (!confirm('Deseja aprovar este trabalho?')) return;
      try { approve.disabled=true; approve.textContent='Aprovando...'; const { error } = await supabase.from('trabalhos').update({ aprovado:true }).eq('id', trabalho.id); if(error){ console.error(error); alert('Erro: '+error.message); return; } await carregarTrabalhos(); await carregarEstatisticas(); } finally { approve.disabled=false; approve.textContent='Aprovar'; }
    });
    controls.appendChild(approve);
  }
  const edit = document.createElement('button'); edit.className='btn'; edit.textContent='Editar';
  edit.addEventListener('click', async ()=> {
    const novoNome = prompt('Nome(s) dos alunos:', trabalho.nome || ''); if (novoNome===null) return; if(!novoNome.trim()){ alert('Nome não pode ficar vazio'); return; }
    const mensagem = trabalho.tipo==='video' ? 'URL do vídeo:' : (trabalho.tipo==='imagem' ? 'URL da imagem:' : 'Conteúdo do trabalho:');
    const novoConteudo = prompt(mensagem, trabalho.conteudo || ''); if (novoConteudo===null) return; if(!novoConteudo.trim()){ alert('Conteúdo não pode ficar vazio.'); return; }
    try { edit.disabled=true; edit.textContent='Salvando...'; const { error } = await supabase.from('trabalhos').update({ nome:novoNome.trim(), conteudo:novoConteudo.trim() }).eq('id', trabalho.id); if(error){ console.error(error); alert('Erro: '+error.message); return; } alert('Trabalho editado!'); await carregarTrabalhos(); await carregarEstatisticas(); } finally { edit.disabled=false; edit.textContent='Editar'; }
  });
  controls.appendChild(edit);
  const remove = document.createElement('button'); remove.className='btn danger'; remove.textContent='Apagar';
  remove.addEventListener('click', async ()=> {
    if (!confirm('Apagar este trabalho? Essa ação não pode ser desfeita.')) return;
    try { remove.disabled=true; remove.textContent='Apagando...'; const { error } = await supabase.from('trabalhos').delete().eq('id', trabalho.id); if(error){ console.error(error); alert('Erro: '+error.message); return; } await carregarTrabalhos(); await carregarEstatisticas(); } finally { remove.disabled=false; remove.textContent='Apagar'; }
  });
  controls.appendChild(remove);
  card.appendChild(controls);
}

/* Publish & storage */
function gerarUUIDFallback(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{ const r=(Math.random()*16)|0; return ((c==='x')?r:((r&0x3)|0x8)).toString(16); }); }
async function enviarImagemStorage(file){
  const MAX_MB = 15; const mb = file.size/1024/1024; if(mb > MAX_MB) throw new Error(`Imagem muito grande (${mb.toFixed(2)} MB). Limite ${MAX_MB} MB.`);
  const ext = file.name.split('.').pop().toLowerCase(); const uuid = (crypto && crypto.randomUUID)?crypto.randomUUID():gerarUUIDFallback();
  const path = `trabalhos/${Date.now()}-${uuid}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl:'3600', upsert:false, contentType:file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  if(!data || !data.publicUrl) throw new Error('Não foi possível obter a URL da imagem.');
  return data.publicUrl;
}

async function publicarTrabalho(){
  const publishBtn = $('#publishButton');
  try {
    if (!selectedType) return alert('Escolha o tipo de trabalho.');
    const nomes = Array.from(document.querySelectorAll('.student-select')).map(s => (s.value||'').trim()).filter(Boolean);
    if (nomes.length===0) return alert('Selecione pelo menos um aluno.');
    let conteudo='';
    if (selectedType==='texto'){ conteudo = ($('#textContent')?.value||'').trim(); if(!conteudo) return alert('Digite o conteúdo do trabalho.'); }
    if (selectedType==='imagem'){ const f = $('#imageFile')?.files?.[0]; if(!f) return alert('Escolha uma imagem'); if(!f.type.startsWith('image/')) return alert('Arquivo inválido'); publishBtn.disabled=true; publishBtn.textContent='Enviando imagem...'; conteudo = await enviarImagemStorage(f); }
    if (selectedType==='video'){ conteudo = ($('#videoUrl')?.value||'').trim(); if(!conteudo) return alert('Digite URL do YouTube'); }
    publishBtn.disabled=true; publishBtn.textContent='Publicando...';
    const { error } = await supabase.from('trabalhos').insert({ nome:nomes.join(', '), tipo:selectedType, conteudo, aprovado:false, created_at:new Date().toISOString() });
    if (error) { console.error(error); alert('Erro ao publicar: '+error.message); return; }
    alert('Trabalho enviado para aprovação!');
    limparFormulario();
    await carregarTrabalhos(); await carregarEstatisticas();
  } catch(err) { console.error('publicarTrabalho', err); alert('Erro: '+(err.message||err)); } finally { publishBtn && (publishBtn.disabled=false, publishBtn.textContent='Publicar Trabalho'); }
}

function limparFormulario(){
  $('#textContent') && ($('#textContent').value='');
  $('#videoUrl') && ($('#videoUrl').value='');
  $('#imageFile') && ($('#imageFile').value='');
  $('#imagePreview') && ($('#imagePreview').src='');
  const cont = $('#studentSelectContainer'); if (cont) { cont.innerHTML=''; const r = document.createElement('div'); r.className='student-row'; const s = document.createElement('select'); s.className='student-select'; criarOpcoesAluno(s); r.appendChild(s); cont.appendChild(r); }
  selectedType=null; $$('.type-button').forEach(b=>b.classList.remove('selected')); $('#workFields') && $('#workFields').classList.remove('visible');
}

/* Estatísticas */
function alunoPossuiTipo(trabalhos, aluno, tipo){
  return trabalhos.some(t => t.tipo===tipo && typeof t.nome === 'string' && t.nome.split(',').map(n=>n.trim()).includes(aluno));
}
function renderizarEstatisticas(trabalhos){
  const body = $('#statisticsBody'), cards = $('#statisticsCards'); if (!body) return; body.innerHTML=''; cards && (cards.innerHTML='');
  alunos.forEach(aluno=>{
    const tr = document.createElement('tr'); const nameTd = document.createElement('td'); nameTd.className='statistics-name'; nameTd.textContent = aluno; tr.appendChild(nameTd);
    ['texto','imagem','video'].forEach(tipo=>{
      const td = document.createElement('td'); const ok = alunoPossuiTipo(trabalhos, aluno, tipo);
      const pill = document.createElement('div'); pill.className = 'pill ' + (ok ? 'completed' : 'missing'); pill.textContent = ok ? '✓' : '—';
      td.appendChild(pill); tr.appendChild(td);
    });
    body.appendChild(tr);
    if (cards) {
      const card = document.createElement('div'); card.className='stat-card';
      const n = document.createElement('div'); n.className='name'; n.textContent=aluno;
      const badges = document.createElement('div'); badges.className='stat-badges';
      [['texto','T'],['imagem','F'],['video','V']].forEach(([k,label])=>{ const ok = alunoPossuiTipo(trabalhos, aluno, k); const b = document.createElement('div'); b.className='stat-badge ' + (ok ? 'completed' : 'missing'); b.textContent=label; badges.appendChild(b); });
      card.appendChild(n); card.appendChild(badges); cards.appendChild(card);
    }
  });
}
async function carregarEstatisticas(){
  try { const { data, error } = await supabase.from('trabalhos').select('*').eq('aprovado', true); if(error){ console.error('carregarEstatisticas', error); return; } renderizarEstatisticas(data || []); } catch(e){ console.error(e); }
}

/* Carousel */
let carouselState = { currentIndex: 0, timer:null, autoplayDelay:4000, slidesCount:0, paused:false };
function buildSlidesFromTrabalhos(){ return (trabalhosCache || []).filter(t => t.tipo==='imagem' && (isAdmin?true:t.aprovado)); }
function atualizarCarousel(){
  const track = document.querySelector('.carousel-track'); const section = $('#carouselSection');
  if (!track || !section) return;
  const slides = buildSlidesFromTrabalhos();
  if (!slides || slides.length === 0) { section.style.display='none'; clearInterval(carouselState.timer); return; } else section.style.display='';
  track.innerHTML='';
  slides.forEach(s => { const slide = document.createElement('div'); slide.className='carousel-slide'; const img = document.createElement('img'); img.src = s.conteudo; img.alt = s.nome || ''; slide.appendChild(img); track.appendChild(slide); });
  carouselState.slidesCount = slides.length; carouselState.currentIndex = 0; updateCarouselUI(); startCarouselTimer();
}
function updateCarouselUI(){ const track = document.querySelector('.carousel-track'); if(!track) return; track.style.transform = `translateX(${ -carouselState.currentIndex * 100 }%)`; }
function nextSlide(){ if(carouselState.slidesCount===0) return; carouselState.currentIndex = (carouselState.currentIndex + 1) % carouselState.slidesCount; updateCarouselUI(); }
function prevSlide(){ if(carouselState.slidesCount===0) return; carouselState.currentIndex = (carouselState.currentIndex - 1 + carouselState.slidesCount) % carouselState.slidesCount; updateCarouselUI(); }
function startCarouselTimer(){ clearInterval(carouselState.timer); carouselState.timer = setInterval(()=>{ if(!carouselState.paused) nextSlide(); }, carouselState.autoplayDelay); }
document.addEventListener('click', (e)=>{ if (e.target.matches('.carousel-prev')) { prevSlide(); startCarouselTimer(); } if (e.target.matches('.carousel-next')) { nextSlide(); startCarouselTimer(); } });
document.addEventListener('mouseover', e=>{ if (e.target.closest('#imageCarousel')) carouselState.paused = true; });
document.addEventListener('mouseout', e=>{ if (e.target.closest('#imageCarousel')) carouselState.paused = false; });

/* Filters (people) */
function atualizarFiltros(){
  const list = $('#peopleFilterList'); if(!list) return; list.innerHTML='';
  alunos.forEach(a => {
    const b = document.createElement('button'); b.className='filter-subbutton btn'; b.textContent = a;
    b.addEventListener('click', ()=> { window.filtroAtual = { tipo:null, pessoa:a, ordenacao:'recentes' }; $$('#peopleFilterList .filter-subbutton').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); aplicarFiltros(); });
    list.appendChild(b);
  });
}
window.filtroAtual = { tipo:null, pessoa:null, ordenacao:'recentes' };

/* Start-like calls (called by auth flow) */
(async function initialLoads(){
  // nothing here — all called after auth state resolved in handleAuthAndData
})();
