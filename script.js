/* ==================================================
   CONFIGURAÇÃO DO SUPABASE
================================================== */

const SUPABASE_URL =
    "https://tcertncsuhrtldeojqfx.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_6ojNocYnMs6HKTx6kEmsVQ_x_IbL-1E";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );



/* ==================================================
   ELEMENTOS - ADICIONAR TRABALHO
================================================== */

const addWorkButton =
    document.getElementById("addWorkButton");

const workForm =
    document.getElementById("workForm");

const typeButtons =
    document.querySelectorAll(".type-button");

const workFields =
    document.getElementById("workFields");

const textField =
    document.getElementById("textField");

const videoField =
    document.getElementById("videoField");

const studentName =
    document.getElementById("studentName");

const textContent =
    document.getElementById("textContent");

const videoUrl =
    document.getElementById("videoUrl");

const publishButton =
    document.getElementById("publishButton");

const worksArea =
    document.getElementById("worksArea");



/* ==================================================
   ELEMENTOS - ADMINISTRADOR
================================================== */

const adminButton =
    document.getElementById("adminButton");

const adminModal =
    document.getElementById("adminModal");

const adminEmail =
    document.getElementById("adminEmail");

const adminPassword =
    document.getElementById("adminPassword");

const confirmAdminLogin =
    document.getElementById("confirmAdminLogin");

const cancelAdminLogin =
    document.getElementById("cancelAdminLogin");



/* ==================================================
   VARIÁVEIS
================================================== */

let selectedType = null;

let isAdmin = false;



/* ==================================================
   VERIFICAÇÃO INICIAL
================================================== */

console.log("Sistema carregado.");

console.log(
    "Supabase:",
    supabaseClient
);



/* ==================================================
   MENU ESQUERDO
================================================== */

const navButtons =
    document.querySelectorAll(
        ".nav-button"
    );


navButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            navButtons.forEach(item => {

                item.classList.remove(
                    "active"
                );

            });

            button.classList.add(
                "active"
            );

        }
    );

});



/* ==================================================
   MENU DIREITO
================================================== */

const filterButtons =
    document.querySelectorAll(
        ".filter-button"
    );


filterButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            filterButtons.forEach(item => {

                item.classList.remove(
                    "active"
                );

            });

            button.classList.add(
                "active"
            );


            /*
                Por enquanto os botões
                apenas mudam visualmente.

                Depois implementaremos
                a organização real.
            */

        }
    );

});



/* ==================================================
   BOTÃO "ADICIONAR TRABALHO"
================================================== */

if (addWorkButton) {

    addWorkButton.addEventListener(
        "click",
        () => {

            workForm.classList.toggle(
                "visible"
            );

        }
    );

}



/* ==================================================
   ESCOLHER TIPO DE TRABALHO
================================================== */

typeButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            /* Remove seleção anterior */

            typeButtons.forEach(item => {

                item.classList.remove(
                    "selected"
                );

            });


            /* Seleciona o botão */

            button.classList.add(
                "selected"
            );


            /* Guarda o tipo */

            selectedType =
                button.dataset.type;


            /* Mostra campos */

            workFields.classList.add(
                "visible"
            );


            /* =========================
               TEXTO
            ========================== */

            if (
                selectedType === "texto"
            ) {

                textField.classList.add(
                    "visible"
                );

                videoField.classList.remove(
                    "visible"
                );

            }


            /* =========================
               VÍDEO
            ========================== */

            if (
                selectedType === "video"
            ) {

                videoField.classList.add(
                    "visible"
                );

                textField.classList.remove(
                    "visible"
                );

            }

        }
    );

});



/* ==================================================
   PUBLICAR TRABALHO
================================================== */

if (publishButton) {

    publishButton.addEventListener(
        "click",
        publicarTrabalho
    );

}



async function publicarTrabalho() {


    /* =========================
       VERIFICAR TIPO
    ========================== */

    if (!selectedType) {

        alert(
            "Escolha o tipo de trabalho."
        );

        return;
    }



    /* =========================
       VERIFICAR NOME
    ========================== */

    const nome =
        studentName.value;


    if (!nome) {

        alert(
            "Selecione seu nome."
        );

        return;
    }



    /* =========================
       CONTEÚDO
    ========================== */

    let conteudo = "";



    /* =========================
       TRABALHO EM TEXTO
    ========================== */

    if (
        selectedType === "texto"
    ) {

        conteudo =
            textContent.value.trim();


        if (!conteudo) {

            alert(
                "Digite o conteúdo do trabalho."
            );

            return;
        }

    }



    /* =========================
       TRABALHO EM VÍDEO
    ========================== */

    if (
        selectedType === "video"
    ) {

        conteudo =
            videoUrl.value.trim();


        if (!conteudo) {

            alert(
                "Digite a URL do vídeo."
            );

            return;
        }


        if (
            !conteudo.includes(
                "youtube.com"
            ) &&
            !conteudo.includes(
                "youtu.be"
            )
        ) {

            alert(
                "Digite uma URL válida do YouTube."
            );

            return;
        }

    }



    /* =========================
       DESABILITAR BOTÃO
    ========================== */

    publishButton.disabled =
        true;

    publishButton.textContent =
        "Publicando...";



    try {


        /* =========================
           INSERIR NO BANCO
        ========================== */

        const {
            error
        } = await supabaseClient
            .from("trabalhos")
            .insert({

                nome:
                    nome,

                tipo:
                    selectedType,

                conteudo:
                    conteudo,

                /*
                    Todo trabalho começa
                    como NÃO aprovado.
                */

                aprovado:
                    false

            });



        /* =========================
           VERIFICAR ERRO
        ========================== */

        if (error) {

            console.error(
                "Erro ao publicar:",
                error
            );


            alert(
                "Não foi possível publicar o trabalho.\n\n" +
                error.message
            );


            return;
        }



        /* =========================
           SUCESSO
        ========================== */

        alert(
            "Trabalho enviado para aprovação!"
        );


        limparFormulario();


        await carregarTrabalhos();

    }


    catch (error) {

        console.error(
            "Erro:",
            error
        );


        alert(
            "Ocorreu um erro ao publicar o trabalho."
        );

    }


    finally {

        publishButton.disabled =
            false;

        publishButton.textContent =
            "Publicar Trabalho";

    }

}



/* ==================================================
   LIMPAR FORMULÁRIO
================================================== */

function limparFormulario() {

    studentName.value =
        "";

    textContent.value =
        "";

    videoUrl.value =
        "";


    selectedType =
        null;


    typeButtons.forEach(button => {

        button.classList.remove(
            "selected"
        );

    });


    workFields.classList.remove(
        "visible"
    );


    textField.classList.remove(
        "visible"
    );


    videoField.classList.remove(
        "visible"
    );

}



/* ==================================================
   LOGIN DO ADMINISTRADOR
================================================== */

if (adminButton) {

    adminButton.addEventListener(
        "click",
        abrirLoginAdmin
    );

}



function abrirLoginAdmin() {


    /*
       Se já estiver logado,
       o botão funciona como
       botão de sair.
    */

    if (isAdmin) {

        sairAdministrador();

        return;
    }


    adminModal.classList.add(
        "visible"
    );


    adminEmail.focus();

}



/* ==================================================
   CANCELAR LOGIN
================================================== */

if (cancelAdminLogin) {

    cancelAdminLogin.addEventListener(
        "click",
        () => {

            adminModal.classList.remove(
                "visible"
            );

        }
    );

}



/* ==================================================
   LOGIN
================================================== */

if (confirmAdminLogin) {

    confirmAdminLogin.addEventListener(
        "click",
        fazerLoginAdmin
    );

}



async function fazerLoginAdmin() {


    const email =
        adminEmail.value.trim();

    const senha =
        adminPassword.value;



    /* =========================
       VALIDAR CAMPOS
    ========================== */

    if (!email || !senha) {

        alert(
            "Digite o e-mail e a senha."
        );

        return;
    }



    confirmAdminLogin.disabled =
        true;

    confirmAdminLogin.textContent =
        "Entrando...";



    try {


        /* =========================
           LOGIN SUPABASE
        ========================== */

        const {
            data,
            error
        } = await supabaseClient.auth
            .signInWithPassword({

                email:
                    email,

                password:
                    senha

            });



        /* =========================
           ERRO
        ========================== */

        if (error) {

            console.error(
                "Erro de login:",
                error
            );


            alert(
                "E-mail ou senha incorretos."
            );


            return;
        }



        /* =========================
           LOGIN REALIZADO
        ========================== */

        if (data.session) {

            isAdmin =
                true;


            adminModal.classList.remove(
                "visible"
            );


            adminEmail.value =
                "";

            adminPassword.value =
                "";


            adminButton.textContent =
                "Sair do administrador";


            await carregarTrabalhos();

        }

    }


    catch (error) {

        console.error(
            error
        );


        alert(
            "Não foi possível realizar o login."
        );

    }


    finally {

        confirmAdminLogin.disabled =
            false;

        confirmAdminLogin.textContent =
            "Entrar";

    }

}



/* ==================================================
   SAIR DO ADMINISTRADOR
================================================== */

async function sairAdministrador() {

    await supabaseClient.auth.signOut();


    isAdmin =
        false;


    adminButton.textContent =
        "Entrar como administrador";


    await carregarTrabalhos();

}



/* ==================================================
   VERIFICAR LOGIN EXISTENTE
================================================== */

async function verificarSessao() {

    const {
        data
    } = await supabaseClient.auth.getSession();


    if (data.session) {

        isAdmin =
            true;


        adminButton.textContent =
            "Sair do administrador";

    }

}



/* ==================================================
   CARREGAR TRABALHOS
================================================== */

async function carregarTrabalhos() {


    try {


        /*
            Administrador:
            vê todos.

            Visitante:
            vê somente aprovados.
        */

        let query =
            supabaseClient
                .from("trabalhos")
                .select("*");


        if (!isAdmin) {

            query =
                query.eq(
                    "aprovado",
                    true
                );

        }


        /*
            Usamos "id" porque,
            pela sua tabela atual,
            ela possui:

            id
            nome
            tipo
            conteudo
            aprovado
        */

        query =
            query.order(
                "id",
                {
                    ascending:
                        false
                }
            );


        const {
            data,
            error
        } = await query;



        /* =========================
           ERRO
        ========================== */

        if (error) {

            console.error(
                "Erro ao carregar trabalhos:",
                error
            );

            return;
        }



        renderizarTrabalhos(
            data
        );

    }


    catch (error) {

        console.error(
            "Erro:",
            error
        );

    }

}



/* ==================================================
   RENDERIZAR TRABALHOS
================================================== */

function renderizarTrabalhos(
    trabalhos
) {


    worksArea.innerHTML =
        "";



    /* =========================
       NENHUM TRABALHO
    ========================== */

    if (
        !trabalhos ||
        trabalhos.length === 0
    ) {


        if (isAdmin) {

            worksArea.innerHTML = `

                <div class="empty-state">

                    <h1>
                        Nenhum trabalho encontrado
                    </h1>

                    <p>
                        Não existem trabalhos publicados ou pendentes.
                    </p>

                </div>

            `;

        }

        else {

            worksArea.innerHTML = `

                <div class="empty-state">

                    <h1>
                        Trabalhos postados
                    </h1>

                    <p>
                        Os trabalhos aprovados aparecerão aqui.
                    </p>

                </div>

            `;

        }


        return;
    }



    /* =========================
       CRIAR CARDS
    ========================== */

    trabalhos.forEach(
        trabalho => {


            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "work-card";



            /* =========================
               CABEÇALHO
            ========================== */

            const header =
                document.createElement(
                    "div"
                );


            header.className =
                "work-header";



            /* =========================
               INFORMAÇÕES
            ========================== */

            const info =
                document.createElement(
                    "div"
                );



            const author =
                document.createElement(
                    "div"
                );


            author.className =
                "work-author";


            author.textContent =
                trabalho.nome;



            const date =
                document.createElement(
                    "div"
                );


            date.className =
                "work-date";


            date.textContent =
                "ID do trabalho: #" +
                trabalho.id;



            info.appendChild(
                author
            );


            info.appendChild(
                date
            );



            /* =========================
               TIPO
            ========================== */

            const type =
                document.createElement(
                    "div"
                );


            type.className =
                "work-type";


            if (
                trabalho.tipo === "texto"
            ) {

                type.textContent =
                    "📝 Texto";

            }

            else {

                type.textContent =
                    "▶️ Vídeo";

            }



            header.appendChild(
                info
            );


            header.appendChild(
                type
            );


            card.appendChild(
                header
            );



            /* =========================
               STATUS ADMIN
            ========================== */

            if (
                isAdmin &&
                !trabalho.aprovado
            ) {

                const status =
                    document.createElement(
                        "div"
                    );


                status.className =
                    "pending-badge";


                status.textContent =
                    "⏳ Aguardando aprovação";


                card.appendChild(
                    status
                );

            }



            /* =========================
               TRABALHO DE TEXTO
            ========================== */

            if (
                trabalho.tipo === "texto"
            ) {

                const texto =
                    document.createElement(
                        "div"
                    );


                texto.className =
                    "work-text";


                texto.textContent =
                    trabalho.conteudo;


                card.appendChild(
                    texto
                );

            }



            /* =========================
               TRABALHO DE VÍDEO
            ========================== */

            if (
                trabalho.tipo === "video"
            ) {

                const iframe =
                    document.createElement(
                        "iframe"
                    );


                iframe.className =
                    "work-video";


                iframe.src =
                    transformarYoutubeUrl(
                        trabalho.conteudo
                    );


                iframe.title =
                    "Vídeo do trabalho";


                iframe.allow =
                    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";


                iframe.allowFullscreen =
                    true;


                card.appendChild(
                    iframe
                );

            }



            /* =========================
               CONTROLES DO ADMIN
            ========================== */

            if (isAdmin) {

                criarControlesAdmin(
                    card,
                    trabalho
                );

            }



            worksArea.appendChild(
                card
            );

        }
    );

}



/* ==================================================
   CONTROLES DO ADMINISTRADOR
================================================== */

function criarControlesAdmin(
    card,
    trabalho
) {


    const controls =
        document.createElement(
            "div"
        );


    controls.className =
        "admin-controls";



    /* =========================
       APROVAR
    ========================== */

    if (
        !trabalho.aprovado
    ) {

        const approveButton =
            document.createElement(
                "button"
            );


        approveButton.className =
            "approve-button";


        approveButton.textContent =
            "Aprovar";


        approveButton.addEventListener(
            "click",
            async () => {

                await aprovarTrabalho(
                    trabalho.id
                );

            }
        );


        controls.appendChild(
            approveButton
        );

    }



    /* =========================
       EDITAR
    ========================== */

    const editButton =
        document.createElement(
            "button"
        );


    editButton.className =
        "edit-button";


    editButton.textContent =
        "Editar";


    editButton.addEventListener(
        "click",
        async () => {

            await editarTrabalho(
                trabalho
            );

        }
    );


    controls.appendChild(
        editButton
    );



    /* =========================
       APAGAR
    ========================== */

    const deleteButton =
        document.createElement(
            "button"
        );


    deleteButton.className =
        "delete-button";


    deleteButton.textContent =
        "Apagar";


    deleteButton.addEventListener(
        "click",
        async () => {

            await apagarTrabalho(
                trabalho.id
            );

        }
    );


    controls.appendChild(
        deleteButton
    );



    card.appendChild(
        controls
    );

}



/* ==================================================
   APROVAR TRABALHO
================================================== */

async function aprovarTrabalho(
    id
) {


    const confirmar =
        confirm(
            "Deseja aprovar este trabalho?"
        );


    if (!confirmar) {

        return;
    }



    try {

        const {
            error
        } = await supabaseClient
            .from("trabalhos")
            .update({

                aprovado:
                    true

            })
            .eq(
                "id",
                id
            );


        if (error) {

            console.error(
                error
            );


            alert(
                "Não foi possível aprovar o trabalho."
            );


            return;
        }


        await carregarTrabalhos();

    }


    catch (error) {

        console.error(
            error
        );


        alert(
            "Ocorreu um erro."
        );

    }

}



/* ==================================================
   EDITAR TRABALHO
================================================== */

async function editarTrabalho(
    trabalho
) {


    /* =========================
       EDITAR NOME
    ========================== */

    const novoNome =
        prompt(
            "Nome do aluno:",
            trabalho.nome
        );


    if (
        novoNome === null
    ) {

        return;
    }


    if (
        novoNome.trim() === ""
    ) {

        alert(
            "O nome não pode ficar vazio."
        );

        return;
    }



    /* =========================
       EDITAR CONTEÚDO
    ========================== */

    const novoConteudo =
        prompt(
            trabalho.tipo === "video"
                ? "URL do vídeo do YouTube:"
                : "Conteúdo do trabalho:",
            trabalho.conteudo
        );


    if (
        novoConteudo === null
    ) {

        return;
    }


    if (
        novoConteudo.trim() === ""
    ) {

        alert(
            "O conteúdo não pode ficar vazio."
        );

        return;
    }



    /* =========================
       VALIDAR VÍDEO
    ========================== */

    if (
        trabalho.tipo === "video" &&
        !novoConteudo.includes(
            "youtube.com"
        ) &&
        !novoConteudo.includes(
            "youtu.be"
        )
    ) {

        alert(
            "Digite uma URL válida do YouTube."
        );

        return;
    }



    /* =========================
       ATUALIZAR
    ========================== */

    try {

        const {
            error
        } = await supabaseClient
            .from("trabalhos")
            .update({

                nome:
                    novoNome.trim(),

                conteudo:
                    novoConteudo.trim()

            })
            .eq(
                "id",
                trabalho.id
            );


        if (error) {

            console.error(
                error
            );


            alert(
                "Não foi possível editar o trabalho."
            );


            return;
        }


        alert(
            "Trabalho editado com sucesso!"
        );


        await carregarTrabalhos();

    }


    catch (error) {

        console.error(
            error
        );


        alert(
            "Ocorreu um erro ao editar."
        );

    }

}



/* ==================================================
   APAGAR TRABALHO
================================================== */

async function apagarTrabalho(
    id
) {


    const confirmar =
        confirm(
            "Tem certeza que deseja apagar este trabalho?\n\nEssa ação não pode ser desfeita."
        );


    if (!confirmar) {

        return;
    }



    try {

        const {
            error
        } = await supabaseClient
            .from("trabalhos")
            .delete()
            .eq(
                "id",
                id
            );


        if (error) {

            console.error(
                error
            );


            alert(
                "Não foi possível apagar o trabalho."
            );


            return;
        }


        await carregarTrabalhos();

    }


    catch (error) {

        console.error(
            error
        );


        alert(
            "Ocorreu um erro ao apagar."
        );

    }

}



/* ==================================================
   TRANSFORMAR URL DO YOUTUBE
================================================== */

function transformarYoutubeUrl(
    url
) {

    try {

        const endereco =
            new URL(url);


        let id =
            "";



        /* =========================
           youtu.be
        ========================== */

        if (
            endereco.hostname.includes(
                "youtu.be"
            )
        ) {

            id =
                endereco.pathname.substring(
                    1
                );

        }



        /* =========================
           youtube.com
        ========================== */

        if (
            endereco.hostname.includes(
                "youtube.com"
            )
        ) {

            id =
                endereco.searchParams.get(
                    "v"
                );


            /*
                Também suporta:
                /shorts/ID
            */

            if (
                !id &&
                endereco.pathname.startsWith(
                    "/shorts/"
                )
            ) {

                id =
                    endereco.pathname
                        .split(
                            "/"
                        )[2];

            }

        }



        /* =========================
           NÃO ENCONTROU ID
        ========================== */

        if (!id) {

            return url;

        }



        return (
            "https://www.youtube.com/embed/" +
            id
        );

    }


    catch {

        return url;

    }

}



/* ==================================================
   INICIAR SISTEMA
================================================== */

async function iniciarSistema() {


    await verificarSessao();


    await carregarTrabalhos();

}



/* ==================================================
   INICIAR
================================================== */

iniciarSistema();
