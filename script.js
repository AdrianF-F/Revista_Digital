/* =====================================
   CONFIGURAÇÃO DO SUPABASE
===================================== */

// COLOQUE AQUI OS DADOS DO SEU PROJETO

const SUPABASE_URL = "https://tcertncsuhrtldeojqfx.supabase.co";

const SUPABASE_KEY = "sb_publishable_6ojNocYnMs6HKTx6kEmsVQ_x_IbL-1E";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =====================================
   ELEMENTOS
===================================== */

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

const emptyState =
    document.getElementById("emptyState");


let selectedType = null;


/* =====================================
   ABRIR FORMULÁRIO
===================================== */

addWorkButton.addEventListener("click", () => {

    workForm.classList.toggle("visible");

});


/* =====================================
   ESCOLHER TIPO
===================================== */

typeButtons.forEach(button => {

    button.addEventListener("click", () => {

        typeButtons.forEach(item => {

            item.classList.remove("selected");

        });


        button.classList.add("selected");


        selectedType =
            button.dataset.type;


        workFields.classList.add("visible");


        if (selectedType === "texto") {

            textField.classList.add("visible");

            videoField.classList.remove("visible");

        }


        if (selectedType === "video") {

            videoField.classList.add("visible");

            textField.classList.remove("visible");

        }

    });

});


/* =====================================
   PUBLICAR
===================================== */

publishButton.addEventListener(
    "click",
    publicarTrabalho
);


async function publicarTrabalho() {

    const nome =
        studentName.value;


    if (!selectedType) {

        alert(
            "Escolha o tipo de trabalho."
        );

        return;
    }


    if (!nome) {

        alert(
            "Selecione seu nome."
        );

        return;
    }


    let conteudo = null;


    /* TRABALHO DE TEXTO */

    if (selectedType === "texto") {

        conteudo =
            textContent.value.trim();


        if (!conteudo) {

            alert(
                "Digite o conteúdo do trabalho."
            );

            return;
        }

    }


    /* TRABALHO DE VÍDEO */

    if (selectedType === "video") {

        conteudo =
            videoUrl.value.trim();


        if (!conteudo) {

            alert(
                "Digite a URL do vídeo."
            );

            return;
        }


        if (
            !conteudo.includes("youtube.com") &&
            !conteudo.includes("youtu.be")
        ) {

            alert(
                "Digite uma URL válida do YouTube."
            );

            return;
        }

    }


    publishButton.disabled = true;

    publishButton.textContent =
        "Publicando...";


    const { error } =
        await supabaseClient
            .from("trabalhos")
            .insert({

                nome: nome,

                tipo: selectedType,

                conteudo: conteudo

            });


    if (error) {

        console.error(error);

        alert(
            "Não foi possível publicar o trabalho."
        );

        publishButton.disabled = false;

        publishButton.textContent =
            "Publicar Trabalho";

        return;
    }


    alert(
        "Trabalho publicado com sucesso!"
    );


    limparFormulario();


    await carregarTrabalhos();


    publishButton.disabled = false;

    publishButton.textContent =
        "Publicar Trabalho";

}


/* =====================================
   LIMPAR FORMULÁRIO
===================================== */

function limparFormulario() {

    studentName.value = "";

    textContent.value = "";

    videoUrl.value = "";

    selectedType = null;


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


/* =====================================
   CARREGAR TRABALHOS
===================================== */

async function carregarTrabalhos() {

    const { data, error } =
        await supabaseClient
            .from("trabalhos")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(error);

        return;
    }


    renderizarTrabalhos(data);

}


/* =====================================
   MOSTRAR TRABALHOS
===================================== */

function renderizarTrabalhos(trabalhos) {

    worksArea.innerHTML = "";


    if (!trabalhos || trabalhos.length === 0) {

        worksArea.appendChild(
            criarEstadoVazio()
        );

        return;
    }


    trabalhos.forEach(trabalho => {

        const card =
            document.createElement("article");


        card.className =
            "work-card";


        const data =
            new Date(
                trabalho.created_at
            );


        const dataFormatada =
            data.toLocaleString(
                "pt-BR",
                {
                    dateStyle: "short",
                    timeStyle: "short"
                }
            );


        card.innerHTML = `

            <div class="work-header">

                <div>

                    <div class="work-author">
                        ${escaparHTML(trabalho.nome)}
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


        if (trabalho.tipo === "texto") {

            const texto =
                document.createElement("div");


            texto.className =
                "work-text";


            texto.textContent =
                trabalho.conteudo;


            card.appendChild(texto);

        }


        if (trabalho.tipo === "video") {

            const iframe =
                document.createElement("iframe");


            iframe.className =
                "work-video";


            iframe.src =
                transformarYoutubeUrl(
                    trabalho.conteudo
                );


            iframe.allow =
                "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";


            iframe.allowFullscreen =
                true;


            card.appendChild(iframe);

        }


        worksArea.appendChild(card);

    });

}


/* =====================================
   YOUTUBE
===================================== */

function transformarYoutubeUrl(url) {

    try {

        const endereco =
            new URL(url);


        let id = "";


        if (
            endereco.hostname.includes(
                "youtu.be"
            )
        ) {

            id =
                endereco.pathname.substring(1);

        }


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


        return `https://www.youtube.com/embed/${id}`;

    }

    catch {

        return url;

    }

}


/* =====================================
   SEGURANÇA BÁSICA
===================================== */

function escaparHTML(texto) {

    const div =
        document.createElement("div");


    div.textContent =
        texto;


    return div.innerHTML;

}


/* =====================================
   ESTADO VAZIO
===================================== */

function criarEstadoVazio() {

    const div =
        document.createElement("div");


    div.className =
        "empty-state";


    div.innerHTML = `

        <h1>
            Trabalhos postados
        </h1>

        <p>
            Os trabalhos aparecerão aqui.
        </p>

    `;


    return div;

}


/* =====================================
   INICIALIZAÇÃO
===================================== */

carregarTrabalhos();
