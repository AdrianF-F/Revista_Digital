// app.js (ESM) — liga botões, estatísticas e admin permitido
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://tcertncsuhrtldeojqfx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6ojNocYnMs6HKTx6kEmsVQ_x_IbL-1E';
const STORAGE_BUCKET = 'imagens';

// Apenas os administradores autorizados
const ADMIN_EMAILS = [
  'miguel.rocha.cardoso@escola.pr.gov.br',
  'francisco.silva.adrian@escola.pr.gov.br'
].map(e => String(e || '').trim().toLowerCase());

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helpers
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

// Elementos
let fab, workForm, typeButtons, workFields, textField, imageField, videoField, textContent;
let imageFile, imagePreview, imageUploadStatus, videoUrl, publishButton;
let worksArea, statisticsBody, statisticsCards, studentSelectContainer, addStudentButton;
let adminButton, themeToggle, organizeToggle, rightSidebar;
let carouselSection, imageCarousel, carouselTrack, carouselPrev, carouselNext;

let isAdmin = false;
let trabalhosCache = [];
let selectedType = null;

// Lista de alunos (formatada e ordenada)
const alunos = [
  "Adrian Felipe","Adryan Felyp","Ana Gabryella","Ana Lara","Atailton","Caio","Camila",
  "Elieder","Emanuelly","Haniel","Iago","Isadora","João Pedro","João Victor","José Adriano",
  "Kethelyn","Kelly","Lucas","Luiz Gustavo","Maria Heloísa","Milena","Miguel Felipe",
  "Miguel Fernando","Pedro","Samira"
].sort((a,b)=>a.localeCompare(b,'pt-BR'));

// Inicialização quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  // selecionar elementos (garantindo que existam)
  fab = $('#fabAddWork');
  workForm = $('#workForm');
  typeButtons = $$('.type-button');
  workFields = $('#workFields');
  textField = $('#textField');
  imageField = $('#imageField');
  videoField = $('#videoField');
  textContent = $('#textContent');
  imageFile = $('#imageFile');
  imagePreview = $('#imagePreview');
  imageUploadStatus = $('#imageUploadStatus');
  videoUrl = $('#videoUrl');
  publishButton = $('#publishButton');
  worksArea = $('#worksArea');
  statisticsBody = $('#statisticsBody');
  statisticsCards = $('#statisticsCards');
  studentSelectContainer = $('#studentSelectContainer');
  addStudentButton = $('#addStudentButton');
  adminButton = $('#adminButton');
  themeToggle = $('#themeToggle');
  organizeToggle = $('#organizeToggle');
  rightSidebar = $('#rightSidebar');
  carouselSection = $('#carouselSection');
  imageCarousel = $('#imageCarousel');
  carouselTrack = imageCarousel?.querySelector('.carousel-track');
  carouselPrev = imageCarousel?.querySelector('.carousel-prev');
  carouselNext = imageCarousel?.querySelector('.carousel-next');

  initTheme();
  attachUiEvents();
  verificarSessao().then(() => {
    carregarTrabalhos();
    carregarEstatisticas();
    atualizarFiltros();
  });
});

function initTheme(){
  try{
    const saved = localStorage.getItem('revista_theme');
    if(saved === 'light') document.body.classList.add('light-theme');
    else document.body.classList.remove('light-theme');
  }catch(e){ document.body.classList.remove('light-theme'); }
  themeToggle?.addEventListener('click', ()=>{
    const isLight = document.body.classList.toggle('light-theme');
    try{ localStorage.setItem('revista_theme', isLight ? 'light' : 'dark'); }catch{}
    themeToggle.textContent = isLight ? '☀️' : '🌙';
  });
}

function attachUiEvents(){
  // FAB
  fab?.addEventListener('click', ()=>{
    const visible = workForm.classList.toggle('visible');
    workForm.setAttribute('aria-hidden', String(!visible));
    if(visible) workForm.scrollIntoView({ behavior:'smooth', block:'center' });
  });

  // Organize toggle shows/hides rightSidebar
  organizeToggle?.addEventListener('click', ()=> {
    rightSidebar.style.display = (rightSidebar.style.display === 'block') ? 'none' : 'block';
  });

  // Type buttons
  typeButtons?.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      typeButtons.forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedType = btn.dataset.type;
      workFields.classList.add('visible');
      textField.classList.toggle('visible', selectedType === 'texto');
      imageField.classList.toggle('visible', selectedType === 'imagem');
      videoField.classList.toggle('visible', selectedType === 'video');
    });
  });

  // add student
  addStudentButton?.addEventListener('click', ()=>{
    const row = document.createElement('div'); row.className = 'student-row';
    const select = document.createElement('select'); select.className = 'student-select';
    criarOpcoesAluno(select);
    const remove = document.createElement('button'); remove.type='button'; remove.className='remove-student-button'; remove.textContent='×';
    remove.addEventListener('click', ()=> row.remove());
    row.appendChild(select); row.appendChild(remove); studentSelectContainer.appendChild(row);
  });

  // image preview
  imageFile?.addEventListener('change', ()=>{
    const arquivo = imageFile.files[0];
    if(!arquivo){ imagePreview.src=''; imagePreview.classList.remove('visible'); imageUploadStatus.textContent='Selecione uma imagem do seu dispositivo.'; return; }
    if(!arquivo.type.startsWith('image/')){ imageFile.value=''; imagePreview.src=''; imagePreview.classList.remove('visible'); imageUploadStatus.textContent='O arquivo selecionado não é uma imagem.'; return; }
    const tamanhoMB = arquivo.size / 1024 / 1024;
    imageUploadStatus.textContent = `${arquivo.name} • ${tamanhoMB.toFixed(2)} MB`;
    const reader = new FileReader(); reader.onload = e => { imagePreview.src = e.target.result; imagePreview.classList.add('visible'); }; reader.readAsDataURL(arquivo);
  });

  // publish
  publishButton?.addEventListener('click', async ()=>{
    if(!selectedType){ alert('Escolha o tipo de trabalho.'); return; }
    const nomes = Array.from(document.querySelectorAll('.student-select')).map(s => (s.value||'').trim()).filter(Boolean);
    if(nomes.length === 0){ alert('Selecione pelo menos um aluno.'); return; }
    let conteudo = '', arquivoImagem = null;
    if(selectedType === 'texto'){ conteudo = (textContent.value||'').trim(); if(!conteudo){ alert('Digite o conteúdo do trabalho.'); return; } }
    if(selectedType === 'imagem'){ arquivoImagem = imageFile.files[0]; if(!arquivoImagem){ alert('Escolha uma imagem antes de publicar.'); return; } if(!arquivoImagem.type.startsWith('image/')){ alert('O arquivo selecionado não é uma imagem.'); return; } }
    if(selectedType === 'video'){ conteudo = (videoUrl.value||'').trim(); if(!conteudo){ alert('Digite a URL do vídeo.'); return; } if(!conteudo.includes('youtube.com') && !conteudo.includes('youtu.be')){ alert('Digite uma URL válida do YouTube.'); return; } }
    publishButton.disabled = true; publishButton.textContent = selectedType === 'imagem' ? 'Enviando imagem...' : 'Publicando...';
    try{
      if(selectedType === 'imagem') conteudo = await enviarImagemStorage(arquivoImagem);
      const { error } = await supabase.from('trabalhos').insert({ nome: nomes.join(', '), tipo: selectedType, conteudo, aprovado:false, created_at: new Date().toISOString() });
      if(error){ console.error(error); alert('Não foi possível publicar: ' + error.message); return; }
      alert('Trabalho enviado para aprovação!');
      limparFormulario();
      await carregarTrabalhos(); await carregarEstatisticas();
    }catch(e){ console.error(e); alert('Erro: ' + (e.message || e)); }
    finally{ publishButton.disabled = false; publishButton.textContent = 'Publicar Trabalho'; }
  });

  // admin button
  adminButton?.addEventListener('click', async ()=>{
    if(isAdmin){ await supabase.auth.signOut(); isAdmin=false; adminButton.textContent='Entrar como administrador'; await carregarTrabalhos(); return; }
    try{ await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: window.location.origin + window.location.pathname } }); } catch(e){ console.error(e); alert('Erro ao iniciar login com Google'); }
  });

  // carousel controls are handled after data load
}

/* ---------- util functions ---------- */
function criarOpcoesAluno(select){
  select.innerHTML = '';
  const first = document.createElement('option'); first.value=''; first.textContent='Selecione seu nome'; select.appendChild(first);
  alunos.forEach(a => { const o=document.createElement('option'); o.value=a; o.textContent=a; select.appendChild(o); });
}
function limparFormulario(){
  textContent.value=''; videoUrl.value=''; imageFile.value=''; imagePreview.src=''; imagePreview.classList.remove('visible');
  studentSelectContainer.innerHTML = ''; const row = document.createElement('div'); row.className='student-row'; const sel = document.createElement('select'); sel.className='student-select'; criarOpcoesAluno(sel); row.appendChild(sel); studentSelectContainer.appendChild(row);
  selectedType = null; $$('.type-button').forEach(b=>b.classList.remove('selected')); workFields.classList.remove('visible');
}

/* ---------- Supabase auth/session ---------- */
async function verificarSessao(){
  try{
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if(!session || !session.user){ isAdmin=false; adminButton.textContent='Entrar como administrador'; return; }
    const email = (session.user.email || '').trim().toLowerCase();
    if(ADMIN_EMAILS.includes(email)){ isAdmin = true; adminButton.textContent='Sair do administrador'; } else { await supabase.auth.signOut(); isAdmin=false; adminButton.textContent='Entrar como administrador'; alert('Esta conta do Google não possui acesso de administrador.'); }
  }catch(e){ console.error('verificarSessao', e); isAdmin=false; }
}
supabase.auth.onAuthStateChange(async (event, session) => {
  if(event === 'SIGNED_OUT'){ isAdmin=false; adminButton.textContent='Entrar como administrador'; return; }
  if(session && session.user){ const email = (session.user.email||'').trim().toLowerCase(); if(ADMIN_EMAILS.includes(email)){ isAdmin=true; adminButton.textContent='Sair do administrador'; await carregarTrabalhos(); } else { isAdmin=false; await supabase.auth.signOut(); alert('Conta não autorizada.'); } }
});

/* ---------- Storage upload ---------- */
function gerarUUIDFallback(){ return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{ const r = (Math.random()*16)|0; const v = c==='x'?r:(r&0x3)|0x8; return v.toString(16); }); }
async function enviarImagemStorage(arquivo){
  const MAX_MB = 15; const mb = arquivo.size/1024/1024; if(mb > MAX_MB) throw new Error(`Imagem muito grande (${mb.toFixed(2)} MB). Limite ${MAX_MB} MB.`);
  const ext = arquivo.name.split('.').pop().toLowerCase();
  const uuid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : gerarUUIDFallback();
  const nome = `trabalhos/${Date.now()}-${uuid}.${ext}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(nome, arquivo, { cacheControl:'3600', upsert:false, contentType:arquivo.type });
  if(error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(nome);
  if(!data || !data.publicUrl) throw new Error('Não foi possível obter a URL da imagem.');
  return data.publicUrl;
}

/* ---------- Data load and render ---------- */
async function carregarTrabalhos(){
  try{
    let q = supabase.from('trabalhos').select('*');
    if(!isAdmin) q = q.eq('aprovado', true);
    q = q.order('created_at', { ascending:false });
    const { data, error } = await q;
    if(error){ console.error('carregarTrabalhos', error); return; }
    trabalhosCache = data || [];
    atualizarFiltros();
    aplicarFiltros();
    atualizarCarousel();
  }catch(e){ console.error(e); }
}

function aplicarFiltros(){
  let resultado = [...trabalhosCache];
  // apply basic global filters if present (window.filtroAtual)
  const filtro = window.filtroAtual || { tipo:null, pessoa:null, ordenacao:'recentes' };
  if(filtro.tipo) resultado = resultado.filter(t => String(t.tipo||'').toLowerCase() === String(filtro.tipo).toLowerCase());
  if(filtro.pessoa) resultado = resultado.filter(t => typeof t.nome === 'string' && t.nome.split(',').map(n=>n.trim()).includes(filtro.pessoa));
  if(filtro.ordenacao === 'recentes') resultado.sort((a,b)=>{ const da = a.created_at ? new Date(a.created_at).getTime() : 0; const db = b.created_at ? new Date(b.created_at).getTime() : 0; if(da && db) return db - da; return Number(b.id || 0) - Number(a.id || 0); });
  renderizarTrabalhos(resultado);
}

function renderizarTrabalhos(trabalhos){
  worksArea.innerHTML = '';
  if(!trabalhos || trabalhos.length === 0){ const vazio = document.createElement('div'); vazio.className='empty-state'; const h=document.createElement('h1'); h.textContent='Nenhum trabalho encontrado'; const p=document.createElement('p'); p.textContent = isAdmin ? 'Não existem trabalhos correspondentes ao filtro selecionado.' : 'Os trabalhos aprovados aparecerão aqui.'; vazio.appendChild(h); vazio.appendChild(p); worksArea.appendChild(vazio); return; }
  trabalhos.forEach(trabalho=>{
    if(!isAdmin && !trabalho.aprovado) return;
    const card = document.createElement('article'); card.className='work-card';
    const header = document.createElement('div'); header.className='work-header';
    const info = document.createElement('div');
    const author = document.createElement('div'); author.className='work-author'; author.textContent = trabalho.nome;
    const date = document.createElement('div'); date.className='work-date'; date.textContent = trabalho.created_at ? ('Publicado em ' + new Date(trabalho.created_at).toLocaleString('pt-BR', { dateStyle:'short', timeStyle:'short' })) : 'Data indisponível';
    info.appendChild(author); info.appendChild(date);
    const type = document.createElement('div'); type.className='work-type'; type.textContent = trabalho.tipo === 'texto' ? '📝 Texto' : (trabalho.tipo==='imagem' ? '🖼️ Imagem' : '▶️ Vídeo');
    header.appendChild(info); header.appendChild(type); card.appendChild(header);
    if(isAdmin && !trabalho.aprovado){ const status = document.createElement('div'); status.className='pending-badge'; status.textContent='⏳ Aguardando aprovação'; card.appendChild(status); }
    if(trabalho.tipo === 'texto'){ const t = document.createElement('div'); t.className='work-text'; t.textContent = trabalho.conteudo; card.appendChild(t); }
    if(trabalho.tipo === 'imagem'){ const img = document.createElement('img'); img.className='work-image'; img.src = trabalho.conteudo; img.alt='Imagem do trabalho'; img.loading='lazy'; img.onerror = ()=> img.alt = 'Não foi possível carregar esta imagem.'; card.appendChild(img); }
    if(trabalho.tipo === 'video'){ const iframe = document.createElement('iframe'); iframe.className='work-video'; iframe.src = transformarYoutubeUrl(trabalho.conteudo); iframe.title='Vídeo do trabalho'; iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; iframe.allowFullscreen=true; card.appendChild(iframe); }
    criarControlesAdmin(card, trabalho);
    worksArea.appendChild(card);
  });
}

/* ---------- Admin controls (UI + checks) ---------- */
function criarControlesAdmin(card, trabalho){
  if(!isAdmin) return;
  const controls = document.createElement('div'); controls.className='admin-controls';
  if(!trabalho.aprovado){
    const approve = document.createElement('button'); approve.className='btn approve-button'; approve.textContent='Aprovar';
    approve.addEventListener('click', async ()=> {
      if(!confirm('Deseja aprovar este trabalho?')) return;
      try{ approve.disabled=true; approve.textContent='Aprovando...'; const { error } = await supabase.from('trabalhos').update({ aprovado:true }).eq('id', trabalho.id); if(error){ alert('Erro: '+error.message); return; } await carregarTrabalhos(); await carregarEstatisticas(); } finally{ approve.disabled=false; approve.textContent='Aprovar'; }
    });
    controls.appendChild(approve);
  }
  const edit = document.createElement('button'); edit.className='btn edit-button'; edit.textContent='Editar';
  edit.addEventListener('click', async ()=> {
    if(!isAdmin){ alert('Ação restrita a administradores.'); return; }
    const novoNome = prompt('Nome(s) dos alunos:', trabalho.nome); if(novoNome === null) return; if(!novoNome.trim()){ alert('O nome não pode ficar vazio.'); return; }
    const mensagem = trabalho.tipo === 'video' ? 'URL do vídeo:' : (trabalho.tipo === 'imagem' ? 'URL atual da imagem:' : 'Conteúdo do trabalho:');
    const novoConteudo = prompt(mensagem, trabalho.conteudo); if(novoConteudo === null) return; if(!novoConteudo.trim()){ alert('O conteúdo não pode ficar vazio.'); return; }
    try{ edit.disabled=true; edit.textContent='Salvando...'; const { error } = await supabase.from('trabalhos').update({ nome: novoNome.trim(), conteudo: novoConteudo.trim() }).eq('id', trabalho.id); if(error){ alert('Erro: '+error.message); return; } alert('Trabalho editado com sucesso!'); await carregarTrabalhos(); await carregarEstatisticas(); } finally{ edit.disabled=false; edit.textContent='Editar'; }
  });
  controls.appendChild(edit);
  const remove = document.createElement('button'); remove.className='btn delete-button'; remove.textContent='Apagar';
  remove.addEventListener('click', async ()=> {
    if(!isAdmin){ alert('Ação restrita a administradores.'); return; }
    if(!confirm('Tem certeza que deseja apagar este trabalho? Essa ação não pode ser desfeita.')) return;
    try{ remove.disabled=true; remove.textContent='Apagando...'; const { error } = await supabase.from('trabalhos').delete().eq('id', trabalho.id); if(error){ alert('Erro: '+error.message); return; } await carregarTrabalhos(); await carregarEstatisticas(); } finally{ remove.disabled=false; remove.textContent='Apagar'; }
  });
  controls.appendChild(remove);
  card.appendChild(controls);
}

/* ---------- Statistics ---------- */
function alunoPossuiTipo(trabalhos, aluno, tipo){
  return trabalhos.some(t => t.tipo === tipo && typeof t.nome === 'string' && t.nome.split(',').map(n => n.trim()).includes(aluno));
}
function renderizarEstatisticas(trabalhos){
  statisticsBody.innerHTML=''; statisticsCards.innerHTML='';
  alunos.forEach(aluno=>{
    const tr = document.createElement('tr');
    const name = document.createElement('td'); name.className='statistics-name'; name.textContent = aluno; tr.appendChild(name);
    ['texto','imagem','video'].forEach(tipo=>{
      const td = document.createElement('td'); const ok = alunoPossuiTipo(trabalhos, aluno, tipo);
      const pill = document.createElement('div'); pill.className = 'pill ' + (ok ? 'completed' : 'missing'); pill.textContent = ok ? '✓' : '—';
      td.appendChild(pill); tr.appendChild(td);
    });
    statisticsBody.appendChild(tr);
    // mobile card
    const card = document.createElement('div'); card.className='stat-card';
    const ndiv = document.createElement('div'); ndiv.className='name'; ndiv.textContent = aluno;
    const badges = document.createElement('div'); badges.className='stat-badges';
    [['texto','T'],['imagem','F'],['video','V']].forEach(([k,l])=>{
      const ok = alunoPossuiTipo(trabalhos, aluno, k);
      const b = document.createElement('div'); b.className = 'stat-badge ' + (ok ? 'completed' : 'missing'); b.textContent = l; badges.appendChild(b);
    });
    card.appendChild(ndiv); card.appendChild(badges); statisticsCards.appendChild(card);
  });
}
async function carregarEstatisticas(){
  try{ const { data, error } = await supabase.from('trabalhos').select('*').eq('aprovado', true); if(error){ console.error('carregarEstatisticas', error); return; } renderizarEstatisticas(data || []); } catch(e){ console.error(e); }
}

/* ---------- Carousel ---------- */
let carouselState = { currentIndex:0, timer:null, autoplayDelay:4000, slidesCount:0, paused:false };
function buildSlidesFromTrabalhos(){ return (trabalhosCache || []).filter(t => t.tipo === 'imagem' && (isAdmin ? true : t.aprovado)); }
function atualizarCarousel(){
  if(!carouselTrack || !carouselSection) return; const slides = buildSlidesFromTrabalhos();
  if(!slides || slides.length === 0){ carouselSection.style.display='none'; clearInterval(carouselState.timer); return; } else carouselSection.style.display='';
  carouselTrack.innerHTML = '';
  slides.forEach(s => { const slide = document.createElement('div'); slide.className='carousel-slide'; const img = document.createElement('img'); img.src = s.conteudo; img.alt = s.nome || ''; slide.appendChild(img); carouselTrack.appendChild(slide); });
  carouselState.slidesCount = slides.length; carouselState.currentIndex = 0; updateCarouselUI(); startCarouselTimer();
}
function updateCarouselUI(){ if(!carouselTrack) return; carouselTrack.style.transform = `translateX(${ -carouselState.currentIndex * 100 }%)`; }
function nextSlide(){ if(carouselState.slidesCount === 0) return; carouselState.currentIndex = (carouselState.currentIndex + 1) % carouselState.slidesCount; updateCarouselUI(); }
function prevSlide(){ if(carouselState.slidesCount === 0) return; carouselState.currentIndex = (carouselState.currentIndex - 1 + carouselState.slidesCount) % carouselState.slidesCount; updateCarouselUI(); }
function startCarouselTimer(){ clearInterval(carouselState.timer); carouselState.timer = setInterval(()=>{ if(!carouselState.paused) nextSlide(); }, carouselState.autoplayDelay); }
carouselPrev?.addEventListener('click', ()=>{ prevSlide(); startCarouselTimer(); });
carouselNext?.addEventListener('click', ()=>{ nextSlide(); startCarouselTimer(); });
if(imageCarousel){ imageCarousel.addEventListener('mouseenter', ()=> carouselState.paused = true); imageCarousel.addEventListener('mouseleave', ()=> carouselState.paused = false); }

/* ---------- Filters list ---------- */
function atualizarFiltros(){
  const list = $('#peopleFilterList'); if(!list) return; list.innerHTML='';
  alunos.forEach(a => { const b = document.createElement('button'); b.className='filter-subbutton btn'; b.textContent = a; b.addEventListener('click', ()=> { window.filtroAtual = { tipo:null, pessoa:a, ordenacao:'recentes' }; $$('#peopleFilterList .filter-subbutton').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); aplicarFiltros(); }); list.appendChild(b); });
}
window.filtroAtual = { tipo:null, pessoa:null, ordenacao:'recentes' };

/* ---------- Init sequence ---------- */
async function iniciarSistema(){
  initTheme();
  await verificarSessao();
  await carregarTrabalhos();
  await carregarEstatisticas();
  atualizarFiltros();
}
iniciarSistema();
