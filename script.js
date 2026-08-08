/* ==================================================
   CONFIGURAÇÃO DO SUPABASE
================================================== */

// COLOQUE OS DADOS DO SEU PROJETO AQUI

const SUPABASE_URL = "COLE_SUA_URL_AQUI";

const SUPABASE_KEY = "COLE_SUA_CHAVE_ANON_AQUI";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );



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



/* ==================================================
   VARIÁVEIS
================================================== */

let selectedType = null;



/* ==================================================
   MENU ESQUERDO
================================================== */

const navButtons =
    document.querySelectorAll(".nav-button");


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
   ABRIR / FECHAR FORMULÁRIO
================================================== */

addWorkButton.addEventListener(
    "click",
    () => {

        workForm.classList.toggle(
            "visible"
        );

    }
);



/* ==================================================
   ESCOLHER TIPO
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


            /* Seleciona botão */

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

publishButton.addEventListener(
    "click",
    publicarTrabalho
);



async function publicarTrabalho() {


    /* =========================
       VALIDAR TIPO
    ========================== */

    if (!selectedType) {

        alert(
            "Escolha o tipo de trabalho."
        );

        return;
    }



    /* =========================
       VALIDAR NOME
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
       TEXTO
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
       VÍDEO
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
       BOTÃO
    ========================== */

    publishButton.disabled = true;

    publishButton.textContent =
        "Publicando...";



    /* =========================
       ENVIAR PARA SUPABASE
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
                conteudo

        });



    /* =========================
       ERRO
    ========================== */

    if (error) {

        console.error(
            "Erro ao publicar:",
            error
        );


        alert(
            "Não foi possível publicar o trabalho."
        );


        publishButton.disabled =
            false;


        publishButton.textContent =
            "Publicar Trabalho";


        return;
    }



    /* =========================
       SUCESSO
    ========================== */

    alert(
        "Trabalho publicado com sucesso!"
    );


    limparFormulario();


    await carregarTrabalhos();



    publishButton.disabled =
        false;


    publishButton.textContent =
        "Publicar Trabalho";

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


    const {
        data,
        error
    } = await supabaseClient
        .from("trabalhos")
        .select("*")
        .order(
            "created_at",
            {
                ascending: false
            }
        );



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



            /* DATA */

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



            /* CABEÇALHO */

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



            /* =========================
               TEXTO
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
               VÍDEO
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



            worksArea.appendChild(
                card
            );

        }
    );

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



        /* Caso não consiga encontrar */

        if (!id) {

            return url;

        }



        return `https://www.youtube.com/embed/${id}`;

    }

    catch {

        return url;

    }

}



/* ==================================================
   PROTEÇÃO CONTRA HTML
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



/* ==================================================
   CARREGAR AO ABRIR O SITE
================================================== */

carregarTrabalhos();
