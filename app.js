// app.js — lógica da aplicação (módulo)
// Observação: este arquivo usa a biblioteca supabase-js via CDN. index.html carrega app.js como module.

const SUPABASE_URL = "https://tcertncsuhrtldeojqfx.supabase.co";
const SUPABASE_KEY = "sb_publishable_6ojNocYnMs6HKTx6kEmsVQ_x_IbL-1E";
const STORAGE_BUCKET = "imagens";

// Administradores permitidos (normalizados)
const ADMIN_EMAILS = [
  "francisco.silva.adrian@escola.pr.gov.br",
  "luciane.lima.23@escola.pr.gov.br",
  "miguel.rocha.cardoso@escola.pr.gov.br"
].map(e => String(e || "").trim().toLowerCase());

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ---------- Elementos ---------- */
const fabAddWork = document.getElementById("fabAddWork");
const workForm = document.getElementById("workForm");
const publishButton = document.getElementById("publishButton");
const adminButton = document.getElementById("adminButton");
const adminModal = document.getElementById("adminModal");
const googleAdminLogin = document.getElementById("googleAdminLogin");
const cancelAdminLogin = document.getElementById("cancelAdminLogin");
const themeToggle = document.getElementById("themeToggle");
const organizeToggle = document.getElementById("organizeToggle");
const rightSidebar = document.getElementById("rightSidebar");
const imageCarousel = document.getElementById("imageCarousel");
const carouselTrack = imageCarousel ? imageCarousel.querySelector(".carousel-track") : null;
const carouselPrev = imageCarousel ? imageCarousel.querySelector(".carousel-prev") : null;
const carouselNext = imageCarousel ? imageCarousel.querySelector(".carousel-next") : null;
const worksArea = document.getElementById("worksArea");
const statisticsBody = document.getElementById("statisticsBody");
const statisticsCards = document.getElementById("statisticsCards");
const peopleFilterList = document.getElementById("peopleFilterList");

/* ---------- Estado ---------- */
let isAdmin = false;
let trabalhosCache = [];
let selectedType = null;
let carouselState = { idx: 0, timer: null, delay: 4000, count: 0, paused: false };

/* ---------- Lista de alunos (mantenha em maiúsculas e acentos corretos) ---------- */
const alunos = [
  "Adrian Felipe",
  "Adryan Felyp",
  "Ana Gabryella",
  "Ana Lara",
  "Atailton",
  "Caio",
  "Camila",
  "Elieder",
  "Emanuelly",
  "Haniel",
  "Iago",
  "Isadora",
  "João Pedro",
  "João Victor",
  "José Adriano",
  "Kethelyn",
  "Kelly",
  "Lucas",
  "Luiz Gustavo",
  "Maria Heloísa",
  "Milena",
  "Miguel Felipe",
  "Miguel Fernando",
  "Pedro",
  "Samira"
].slice().sort((a,b)=>a.localeCompare(b,'pt-BR')); // ordenar alfabeticamente para estatísticas

/* ========== Tema ========== */
function applyTheme(t) {
  if (t === "light") { document.body.classList.add("light-theme"); themeToggle.textContent = "☀️"; }
  else { document.body.classList.remove("light-theme"); themeToggle.textContent = "🌙"; }
  try { localStorage.setItem("revista_theme", t); } catch {}
}
function initTheme() {
  try { const s = localStorage.getItem("revista_theme"); applyTheme(s === "light" ? "light" : "dark"); } catch { applyTheme("dark"); }
}
themeToggle?.addEventListener("click", ()=>applyTheme(document.body.classList.contains("light-theme") ? "dark" : "light"));

/* ========== FAB ========== */
fabAddWork?.addEventListener("click", ()=>{
  const visible = workForm.classList.toggle("visible");
  workForm.setAttribute("aria-hidden", String(!visible));
  if (visible) workForm.scrollIntoView({ behavior: "smooth", block: "center" });
});

/* ========== Organizar por (abre painel de filtros) ========== */
organizeToggle?.addEventListener("click", ()=> {
  const shown = rightSidebar.style.display === "" || rightSidebar.style.display === "block";
  rightSidebar.style.display = shown ? "none" : "block";
});

/* ========== Alunos: preencher selects ========= */
function criarOpcoesAluno(select) {
  select.innerHTML = "";
  const primeira = document.createElement("option");
  primeira.value = "";
  primeira.textContent = "Selecione seu nome";
  select.appendChild(primeira);
  alunos.forEach(aluno => {
    const o = document.createElement("option");
    o.value = aluno;
    o.textContent = aluno;
    select.appendChild(o);
  });
}
document.querySelectorAll(".student-select").forEach(s => criarOpcoesAluno(s));
document.getElementById("addStudentButton")?.addEventListener("click", ()=>{
  const row = document.createElement("div"); row.className = "student-row";
  const sel = document.createElement("select"); sel.className = "student-select"; criarOpcoesAluno(sel);
  const remove = document.createElement("button"); remove.type = "button"; remove.className = "remove-student-button"; remove.textContent = "×";
  remove.addEventListener("click", ()=> row.remove());
  row.appendChild(sel); row.appendChild(remove); document.getElementById("studentSelectContainer").appendChild(row);
});

/* ========== Tipo de trabalho ========== */
document.querySelectorAll(".type-button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".type-button").forEach(b=>b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedType = btn.dataset.type;
    document.getElementById("workFields").classList.add("visible");
    document.getElementById("textField").classList.toggle("visible", selectedType === "texto");
    document.getElementById("imageField").classList.toggle("visible", selectedType === "imagem");
    document.getElementById("videoField").classList.toggle("visible", selectedType === "video");
  });
});

/* ========== Image preview ========== */
document.getElementById("imageFile")?.addEventListener("change", ()=>{
  const arquivo = document.getElementById("imageFile").files[0];
  const preview = document.getElementById("imagePreview");
  const status = document.getElementById("imageUploadStatus");
  if(!arquivo){ preview.src=""; preview.classList.remove("visible"); status.textContent = "Selecione uma imagem do seu dispositivo."; return; }
  if(!arquivo.type.startsWith("image/")){ document.getElementById("imageFile").value=""; preview.src=""; preview.classList.remove("visible"); status.textContent = "O arquivo selecionado não é uma imagem."; return; }
  const reader = new FileReader(); reader.onload = e => { preview.src = e.target.result; preview.classList.add("visible"); }; reader.readAsDataURL(arquivo);
  const mb = arquivo.size / 1024 / 1024; status.textContent = arquivo.name + " • " + mb.toFixed(2) + " MB";
});

/* ========== Supabase auth & admin checks ========== */
async function verificarSessao() {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const session = data.session;
    if(!session || !session.user){ isAdmin = false; adminButton.textContent = "Entrar como administrador"; return; }
    const email = (session.user.email || "").trim().toLowerCase();
    if(ADMIN_EMAILS.includes(email)){ isAdmin = true; adminButton.textContent = "Sair do administrador"; }
    else { await supabaseClient.auth.signOut(); isAdmin = false; adminButton.textContent = "Entrar como administrador"; alert("Esta conta do Google não possui acesso de administrador."); }
  } catch(e) { console.error(e); isAdmin = false; }
}

adminButton?.addEventListener("click", async ()=>{
  if(isAdmin) { await supabaseClient.auth.signOut(); isAdmin = false; adminButton.textContent = "Entrar como administrador"; await carregarTrabalhos(); return; }
  // mostrar modal simples de login: redireciona para OAuth (já implementado via botão no modal em versões anteriores)
  // aqui faremos signInWithOAuth direto
  try {
    await supabaseClient.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin + window.location.pathname } });
  } catch(e) { console.error(e); alert("Erro ao iniciar login: " + (e.message || e)); }
});

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if(event === "SIGNED_OUT") { isAdmin = false; adminButton.textContent = "Entrar como administrador"; return; }
  if(session && session.user) {
    const email = (session.user.email || "").trim().toLowerCase();
    if(ADMIN_EMAILS.includes(email)){ isAdmin = true; adminButton.textContent = "Sair do administrador"; await carregarTrabalhos(); }
    else { isAdmin = false; await supabaseClient.auth.signOut(); alert("Esta conta do Google não possui acesso de administrador."); }
  }
});

/* ========== Carregar trabalhos ========== */
async function carregarTrabalhos() {
  try {
    let q = supabaseClient.from("trabalhos").select("*");
    if(!isAdmin) q = q.eq("aprovado", true);
    q = q.order("created_at", { ascending: false });
    const { data, error } = await q;
    if(error){ console.error(error); return; }
    trabalhosCache = data || [];
    atualizarFiltros();
    aplicarFiltros();
    atualizarCarousel();
  } catch(e) { console.error(e); }
}

/* ========== Render trabalhos ========== */
function criarControlesAdmin(card, trabalho) {
  if(!isAdmin) return;
  const controls = document.createElement("div"); controls.className = "admin-controls";

  if(!trabalho.aprovado) {
    const approve = document.createElement("button"); approve.className = "approve-button"; approve.textContent = "Aprovar";
    approve.onclick = async ()=> {
      if(!confirm("Deseja aprovar este trabalho?")) return;
      try { approve.disabled = true; approve.textContent = "Aprovando..."; const { error } = await supabaseClient.from("trabalhos").update({ aprovado: true }).eq("id", trabalho.id); if(error) { alert("Erro: "+error.message); return; } await carregarTrabalhos(); } finally { approve.disabled = false; approve.textContent = "Aprovar"; }
    };
    controls.appendChild(approve);
  }

  const edit = document.createElement("button"); edit.className = "edit-button"; edit.textContent = "Editar";
  edit.onclick = async ()=> {
    if(!isAdmin) { alert("Ação restrita a administradores."); return; }
    const novoNome = prompt("Nome(s) dos alunos:", trabalho.nome); if(novoNome === null) return; if(!novoNome.trim()){ alert("Nome não pode ficar vazio."); return; }
    const mensagem = trabalho.tipo === "video" ? "URL do vídeo:" : (trabalho.tipo === "imagem" ? "URL atual da imagem:" : "Conteúdo do trabalho:");
    const novoConteudo = prompt(mensagem, trabalho.conteudo); if(novoConteudo === null) return; if(!novoConteudo.trim()){ alert("Conteúdo não pode ficar vazio."); return; }
    try { edit.disabled=true; edit.textContent="Salvando..."; const { error } = await supabaseClient.from("trabalhos").update({ nome: novoNome.trim(), conteudo: novoConteudo.trim() }).eq("id", trabalho.id); if(error){ alert("Erro: "+error.message); return; } alert("Trabalho editado!"); await carregarTrabalhos(); } finally { edit.disabled=false; edit.textContent="Editar"; }
  };
  controls.appendChild(edit);

  const remove = document.createElement("button"); remove.className = "delete-button"; remove.textContent = "Apagar";
  remove.onclick = async ()=> {
    if(!isAdmin) { alert("Ação restrita a administradores."); return; }
    if(!confirm("Tem certeza que deseja apagar este trabalho? Essa ação não pode ser desfeita.")) return;
    try { remove.disabled=true; remove.textContent="Apagando..."; const { error } = await supabaseClient.from("trabalhos").delete().eq("id", trabalho.id); if(error){ alert("Erro: "+error.message); return; } await carregarTrabalhos(); } finally { remove.disabled=false; remove.textContent="Apagar"; }
  };
  controls.appendChild(remove);
  card.appendChild(controls);
}

function renderizarTrabalhos(trabalhos) {
  worksArea.innerHTML = "";
  if(!trabalhos || trabalhos.length === 0) {
    const vazio = document.createElement("div"); vazio.className = "empty-state";
    const h = document.createElement("h1"); h.textContent = "Nenhum trabalho encontrado";
    const p = document.createElement("p"); p.textContent = isAdmin ? "Não existem trabalhos correspondentes ao filtro selecionado." : "Os trabalhos aprovados aparecerão aqui.";
    vazio.appendChild(h); vazio.appendChild(p); worksArea.appendChild(vazio); return;
  }

  trabalhos.forEach(trabalho => {
    if(!isAdmin && !trabalho.aprovado) return; // não mostrar pendentes para público

    const card = document.createElement("article"); card.className = "work-card";
    const header = document.createElement("div"); header.className = "work-header";
    const info = document.createElement("div");
    const author = document.createElement("div"); author.className = "work-author"; author.textContent = trabalho.nome;
    const date = document.createElement("div"); date.className = "work-date";
    date.textContent = trabalho.created_at ? ("Publicado em " + new Date(trabalho.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })) : "Data de publicação indisponível";
    info.appendChild(author); info.appendChild(date);
    const type = document.createElement("div"); type.className = "work-type"; type.textContent = trabalho.tipo === "texto" ? "📝 Texto" : (trabalho.tipo === "imagem" ? "🖼️ Imagem" : "▶️ Vídeo");
    header.appendChild(info); header.appendChild(type); card.appendChild(header);

    if(isAdmin && !trabalho.aprovado) { const status = document.createElement("div"); status.className = "pending-badge"; status.textContent = "⏳ Aguardando aprovação"; card.appendChild(status); }

    if(trabalho.tipo === "texto") { const t = document.createElement("div"); t.className = "work-text"; t.textContent = trabalho.conteudo; card.appendChild(t); }
    if(trabalho.tipo === "imagem") { const img = document.createElement("img"); img.className = "work-image"; img.src = trabalho.conteudo; img.alt = "Imagem do trabalho"; img.loading = "lazy"; img.onerror = ()=> img.alt = "Não foi possível carregar esta imagem."; card.appendChild(img); }
    if(trabalho.tipo === "video") { const iframe = document.createElement("iframe"); iframe.className = "work-video"; iframe.src = transformarYoutubeUrl(trabalho.conteudo); iframe.title = "Vídeo do trabalho"; iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"; iframe.allowFullscreen = true; card.appendChild(iframe); }

    criarControlesAdmin(card, trabalho);
    worksArea.appendChild(card);
  });
}

/* ========== Publicar trabalho (simplificado) ========== */
document.getElementById("publishButton")?.addEventListener("click", async ()=>{
  if(!selectedType){ alert("Escolha o tipo de trabalho."); return; }
  const nomes = Array.from(document.querySelectorAll(".student-select")).map(s => (s.value||"").trim()).filter(Boolean);
  if(nomes.length === 0){ alert("Selecione pelo menos um aluno."); return; }
  let conteudo = "", arquivoImagem = null;
  if(selectedType === "texto"){ conteudo = (document.getElementById("textContent").value||"").trim(); if(!conteudo){ alert("Digite o conteúdo do trabalho."); return; } }
  if(selectedType === "imagem"){ arquivoImagem = document.getElementById("imageFile").files[0]; if(!arquivoImagem){ alert("Escolha uma imagem antes de publicar."); return; } if(!arquivoImagem.type.startsWith("image/")){ alert("O arquivo selecionado não é uma imagem."); return; } }
  if(selectedType === "video"){ conteudo = (document.getElementById("videoUrl").value||"").trim(); if(!conteudo){ alert("Digite a URL do vídeo."); return; } if(!conteudo.includes("youtube.com") && !conteudo.includes("youtu.be")){ alert("Digite uma URL válida do YouTube."); return; } }

  publishButton.disabled = true; publishButton.textContent = selectedType === "imagem" ? "Enviando imagem..." : "Publicando...";

  try {
    if(selectedType === "imagem"){
      const MAX_MB = 15; if(arquivoImagem.size/1024/1024 > MAX_MB) throw new Error(`Imagem muito grande (limite ${MAX_MB} MB).`);
      const ext = arquivoImagem.name.split(".").pop().toLowerCase();
      const uuid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + "-" + Math.random().toString(36).slice(2));
      const path = `trabalhos/${Date.now()}-${uuid}.${ext}`;
      const { error: uploadError } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, arquivoImagem, { cacheControl: "3600", upsert: false, contentType: arquivoImagem.type });
      if(uploadError) throw uploadError;
      const { data } = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      if(!data || !data.publicUrl) throw new Error("Não foi possível obter a URL da imagem.");
      conteudo = data.publicUrl;
    }

    const { error } = await supabaseClient.from("trabalhos").insert({
      nome: nomes.join(", "),
      tipo: selectedType,
      conteudo,
      aprovado: false,
      created_at: new Date().toISOString()
    });

    if(error){ alert("Não foi possível publicar: " + error.message); return; }

    alert("Trabalho enviado para aprovação!");
    // limpar formulário
    document.getElementById("textContent").value = "";
    document.getElementById("videoUrl").value = "";
    document.getElementById("imageFile").value = "";
    document.getElementById("imagePreview").src = "";
    // reset selects
    const container = document.getElementById("studentSelectContainer"); container.innerHTML = "";
    const row = document.createElement("div"); row.className = "student-row";
    const sel = document.createElement("select"); sel.className = "student-select"; criarOpcoesAluno(sel); row.appendChild(sel); container.appendChild(row);
    document.querySelectorAll(".type-button").forEach(b=>b.classList.remove("selected"));
    selectedType = null; document.getElementById("workFields").classList.remove("visible");

    await carregarTrabalhos();
    await carregarEstatisticas();
  } catch(e) {
    console.error(e); alert("Erro: " + (e.message || e));
  } finally {
    publishButton.disabled = false; publishButton.textContent = "Publicar Trabalho";
  }
