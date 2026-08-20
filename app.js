// app.js (substitua o arquivo atual por este)
// Usa ESM import do pacote supabase-js para evitar dependência de global window.supabase

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://tcertncsuhrtldeojqfx.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6ojNocYnMs6HKTx6kEmsVQ_x_IbL-1E';
const STORAGE_BUCKET = 'imagens';

const ADMIN_EMAILS = [
  'francisco.silva.adrian@escola.pr.gov.br',
  'luciane.lima.23@escola.pr.gov.br',
  'miguel.rocha.cardoso@escola.pr.gov.br'
].map(e => String(e || '').trim().toLowerCase());

let supabaseClient;
try {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
  console.error('Erro ao criar supabase client:', e);
  // continuamos; algumas funcionalidades ficarão sem backend
}

function safe(query) {
  return document.querySelector(query);
}

function safeAll(query) {
  return Array.from(document.querySelectorAll(query));
}

function logAndAlertError(err) {
  console.error(err);
  // alert(err.message || String(err)); // opcional para o usuário
}

document.addEventListener('DOMContentLoaded', () => {
  // Elementos principais (IDs do index.html)
  const fabAddWork = safe('#fabAddWork');
  const workForm = safe('#workForm');
  const publishButton = safe('#publishButton');
  const themeToggle = safe('#themeToggle');
  const adminButton = safe('#adminButton');
  const organizeToggle = safe('#organizeToggle');
  const rightSidebar = safe('#rightSidebar');
  const addStudentButton = safe('#addStudentButton');
  const typeButtons = safeAll('.type-button');

  // Verificações básicas:
  if (!fabAddWork) console.warn('Fab não encontrado (#fabAddWork). Verifique seu index.html');
  if (!workForm) console.warn('Form não encontrado (#workForm).');
  if (!publishButton) console.warn('Publish button não encontrado (#publishButton).');

  // Theme init
  try {
    const saved = localStorage.getItem('revista_theme');
    if (saved === 'light') document.body.classList.add('light-theme');
  } catch (e) { console.warn(e); }

  // FAB open/close
  if (fabAddWork && workForm) {
    fabAddWork.addEventListener('click', () => {
      const visible = workForm.classList.toggle('visible');
      workForm.setAttribute('aria-hidden', String(!visible));
      if (visible) workForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-theme');
      try { localStorage.setItem('revista_theme', isLight ? 'light' : 'dark'); } catch {}
      themeToggle.textContent = isLight ? '☀️' : '🌙';
    });
  }

  // Organize toggle (show/hide right sidebar)
  if (organizeToggle && rightSidebar) {
    organizeToggle.addEventListener('click', () => {
      rightSidebar.style.display = (rightSidebar.style.display === 'none' || rightSidebar.style.display === '') ? 'block' : 'none';
    });
  }

  // Type buttons (texto/imagem/video)
  if (typeButtons.length) {
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        typeButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        // mostra campos correspondentes
        const t = btn.dataset.type;
        const workFields = safe('#workFields');
        if (workFields) workFields.classList.add('visible');
        const textField = safe('#textField');
        const imageField = safe('#imageField');
        const videoField = safe('#videoField');
        if (textField) textField.classList.toggle('visible', t === 'texto');
        if (imageField) imageField.classList.toggle('visible', t === 'imagem');
        if (videoField) videoField.classList.toggle('visible', t === 'video');
        // guarda em window para compatibilidade com o restante do código
        window.selectedType = t;
      });
    });
  }

  // Add student button
  if (addStudentButton) {
    addStudentButton.addEventListener('click', () => {
      const container = safe('#studentSelectContainer');
      if (!container) return;
      const row = document.createElement('div');
      row.className = 'student-row';
      const select = document.createElement('select');
      select.className = 'student-select';
      // create options (simple)
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Selecione seu nome';
      select.appendChild(defaultOption);
      // keep a short static list here if you want; otherwise the main code should populate
      ['Aluno Exemplo'].forEach(a => {
        const o = document.createElement('option'); o.value = a; o.textContent = a; select.appendChild(o);
      });
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'remove-student-button'; remove.textContent = '×';
      remove.addEventListener('click', () => row.remove());
      row.appendChild(select); row.appendChild(remove); container.appendChild(row);
    });
  }

  // Publish button (minimal stub — evita erro caso supabase não configurado)
  if (publishButton) {
    publishButton.addEventListener('click', async () => {
      try {
        // Basic validation
        const type = window.selectedType;
        if (!type) return alert('Escolha o tipo de trabalho.');
        // collect students
        const selects = Array.from(document.querySelectorAll('.student-select'));
        const nomes = selects.map(s => (s.value || '').trim()).filter(Boolean);
        if (nomes.length === 0) return alert('Selecione pelo menos um aluno.');
        // simple content check for texto
        if (type === 'texto') {
          const text = (safe('#textContent')?.value || '').trim();
          if (!text) return alert('Digite o conteúdo do trabalho.');
          // Here you would call supabase insert — simplified:
          if (!supabaseClient) { alert('Salvo local (modo offline) — supabase indisponível.'); console.log({ nome: nomes.join(', '), tipo: type, conteudo: text }); return; }
        }
        // For imagem/video you should implement upload/validation as before.
        alert('Publicação simulada — ver console. Se tudo ok, integra com Supabase.');
      } catch (err) {
        logAndAlertError(err);
      }
    });
  }

  // Admin button: attempt sign-in with OAuth if supabase available
  if (adminButton) {
    adminButton.addEventListener('click', async () => {
      try {
        if (!supabaseClient) { alert('Supabase não configurado no cliente.'); return; }
        // signInWithOAuth will redirect; keep simple:
        await supabaseClient.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + window.location.pathname } });
      } catch (err) { logAndAlertError(err); }
    });
  }

  // Carousel controls (prev/next)
  if (carouselPrev && carouselNext && carouselTrack) {
    carouselPrev.addEventListener('click', () => {
      // simple previous: translateX by 0 (you can implement full logic)
      carouselTrack.style.transform = 'translateX(0%)';
    });
    carouselNext.addEventListener('click', () => {
      // simple next placeholder (you should implement slide logic)
      carouselTrack.style.transform = 'translateX(-100%)';
    });
  }

  // Finally, try to initialize Supabase session and load data minimally
  (async function init() {
    try {
      if (supabaseClient) {
        const { data } = await supabaseClient.auth.getSession();
        const session = data.session;
        if (session && session.user) {
          const email = (session.user.email || '').trim().toLowerCase();
          if (ADMIN_EMAILS.includes(email)) {
            adminButton.textContent = 'Sair do administrador';
            window.isAdmin = true;
          }
        }
        // load trabalhos (light-weight): do not fail if table missing
        try {
          const q = supabaseClient.from('trabalhos').select('*').order('created_at', { ascending: false });
          const { data: trabalhos, error } = await q;
          if (error) console.debug('carregarTrabalhos: ', error.message);
          else {
            console.debug('Trabalhos carregados:', trabalhos?.length || 0);
            // build carousel slides if any images (minimal)
            if (Array.isArray(trabalhos) && trabalhos.length > 0 && carouselTrack) {
              carouselTrack.innerHTML = '';
              const imgs = trabalhos.filter(t => t.tipo === 'imagem' && (t.aprovado || window.isAdmin));
              imgs.forEach(t => {
                const s = document.createElement('div'); s.className = 'carousel-slide';
                const img = document.createElement('img'); img.src = t.conteudo; img.alt = t.nome || 'imagem'; img.loading = 'lazy';
                s.appendChild(img); carouselTrack.appendChild(s);
              });
            }
          }
        } catch (e) { console.debug('Ignorado: erro ao buscar trabalhos', e); }
      }
    } catch (e) { console.error('init supabase erro', e); }
  })();
});
