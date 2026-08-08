/* ==================================================
   CONFIGURAÇÃO DO SUPABASE
================================================== */

const SUPABASE_URL =
    "https://tcertncsuhrtldeojqfx.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_6ojNocYnMs6HKTx6kEmsVQ_x_IbL-1E";


let supabaseClient = null;


/* Inicia o Supabase */

if (
    window.supabase &&
    SUPABASE_URL &&
    SUPABASE_KEY
) {

    supabaseClient =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

}



/* ==================================================
   ELEMENTOS
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

let isAdmin = false;

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



/* ==================================================
   VERIFICAÇÃO DOS ELEMENTOS
================================================== */

console.log(
    "Sistema carregado."
);

console.log(
    "Botão adicionar:",
    addWorkButton
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

        }
    );

});



/* ==================================================
   BOTÃO ADICIONAR TRABALHO
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
   ESCOLHER TIPO
================================================== */

typeButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            /* Remove seleção */

            typeButtons.forEach(item => {

                item.classList.remove(
                    "selected"
                );

            });


            /* Seleciona */

            button.classList.add(
                "selected"
            );


            /* Guarda tipo */

            selectedType =
                button.dataset.type;


            /* Mostra campos */

            workFields.classList.add(
                "visible"
            );


            /* TEXTO */

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


            /* VÍDEO */

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
   PUBLICAR
================================================== */

if (publishButton) {

    publishButton.addEventListener(
        "click",
        publicarTrabalho
    );

}



async function publicarTrabalho() {


    /* Verifica Supabase */

    if (!supabaseClient) {

        alert(
            "O sistema de banco de dados não foi carregado."
        );

        return;
    }



    /* Verifica tipo */

    if (!selectedType) {

        alert(
            "Escolha o tipo de trabalho."
        );

        return;
    }



    /* Verifica nome */

    const nome =
        studentName.value;


    if (!nome) {

        alert(
            "Selecione seu nome."
        );

        return;
    }



    /* Conteúdo */

    let conteudo = "";



    /* ==================================================
       TEXTO
    ================================================== */

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



    /* ==================================================
       VÍDEO
    ================================================== */

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



    /* ==================================================
       PUBLICANDO
    ================================================== */

    publishButton.disabled =
        true;

    publishButton.textContent =
        "Publicando...";



    try {

        const {
            error
        } = await supabaseClient
            .from("trabalhos")
          .insert({
    nome: nome,
    tipo: selectedType,
    conteudo: conteudo,
    aprovado: false
});



        /* ==================================================
           ERRO
        ================================================== */

        if (error) {

            console.error(
                "Erro do Supabase:",
                error
            );


            alert(
                "Não foi possível publicar o trabalho.\n\n" +
                error.message
            );


            return;
        }



        /* ==================================================
           SUCESSO
        ================================================== */

        alert(
            "Trabalho publicado com sucesso!"
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
   CARREGAR TRABALHOS
================================================== */

async function carregarTrabalhos() {

   let query =
    supabaseClient
        .from("trabalhos")
        .select("*");

if (!isAdmin) {

    query =
        query.eq("aprovado", true);

}

const { data, error } =
    await query.order("id", {
        ascending: false
    });
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


    /* Nenhum trabalho */

    if (
        !trabalhos ||
        trabalhos.length === 0
    ) {

        worksArea.innerHTML = `

            <div class="empty-state">

                <h1>
                    Trabalhos postados
                </h1>

                <p>
                    Os trabalhos aparecerão aqui.
                </p>

            </div>

        `;

        return;
    }



    /* Criar cards */

    trabalhos.forEach(
        trabalho => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "work-card";



            /* Data */

            const data =
                new Date(
                    trabalho.created_at
                );


            const dataFormatada =
                data.toLocaleString(
                    "pt-BR",
                    {
                        dateStyle:
                            "short",

                        timeStyle:
                            "short"
                    }
                );



            /* Cabeçalho */

            card.innerHTML = `

                <div class="work-header">

                    <div>

                        <div class="work-author">

                            ${escaparHTML(
                                trabalho.nome
                            )}

                        </div>

                        <div class="work-date">

                            ${dataFormatada}

                        </div>

                    </div>


                    <div class="work-type">

                        ${
                            trabalho.tipo === "texto"
                                ? "📝 Texto"
                                : "▶️ Vídeo"
                        }

                    </div>

                </div>

            `;



            /* ==================================================
               TEXTO
            ================================================== */

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



            /* ==================================================
               VÍDEO
            ================================================== */

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

if (isAdmin) {

    const controls =
        document.createElement("div");

    controls.className =
        "admin-controls";

    if (!trabalho.aprovado) {

        const approve =
            document.createElement("button");

        approve.className =
            "approve-button";

        approve.textContent =
            "Aprovar";

        approve.onclick = async () => {

            await supabaseClient
                .from("trabalhos")
                .update({
                    aprovado: true
                })
                .eq("id", trabalho.id);

            carregarTrabalhos();

        };

        controls.appendChild(approve);

    }

    const edit =
        document.createElement("button");

    edit.className =
        "edit-button";

    edit.textContent =
        "Editar";

    edit.onclick = async () => {

        const novo =
            prompt(
                "Editar conteúdo:",
                trabalho.conteudo
            );

        if (novo !== null) {

            await supabaseClient
                .from("trabalhos")
                .update({
                    conteudo: novo
                })
                .eq("id", trabalho.id);

            carregarTrabalhos();

        }

    };

    const del =
        document.createElement("button");

    del.className =
        "delete-button";

    del.textContent =
        "Apagar";

    del.onclick = async () => {

        if (
            confirm(
                "Apagar este trabalho?"
            )
        ) {

            await supabaseClient
                .from("trabalhos")
                .delete()
                .eq("id", trabalho.id);

            carregarTrabalhos();

        }

    };

    controls.appendChild(edit);
    controls.appendChild(del);

    card.appendChild(controls);

}
           
            worksArea.appendChild(
                card
            );

        }
    );

}



/* ==================================================
   YOUTUBE
================================================== */

function transformarYoutubeUrl(
    url
) {

    try {

        const endereco =
            new URL(url);


        let id =
            "";



        /* youtu.be */

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



        /* youtube.com */

        if (
            endereco.hostname.includes(
                "youtube.com"
            )
        ) {

            id =
                endereco.searchParams.get(
                    "v"
                );

        }



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
   SEGURANÇA
================================================== */

function escaparHTML(
    texto
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        texto;


    return div.innerHTML;

}

adminButton.addEventListener("click", async () => {

    if (isAdmin) {

        await supabaseClient.auth.signOut();

        isAdmin = false;

        adminButton.textContent =
            "Entrar como administrador";

        carregarTrabalhos();

        return;
    }

    adminModal.classList.add("visible");

});


cancelAdminLogin.addEventListener("click", () => {

    adminModal.classList.remove("visible");

});


confirmAdminLogin.addEventListener("click", async () => {

    const { error } =
        await supabaseClient.auth.signInWithPassword({
            email: adminEmail.value,
            password: adminPassword.value
        });

    if (error) {

        alert("Login inválido.");

        return;
    }

    isAdmin = true;

    adminButton.textContent =
        "Sair do administrador";

    adminModal.classList.remove("visible");

    carregarTrabalhos();

});

/* ==================================================
   INICIAR SITE
================================================== */

carregarTrabalhos();
