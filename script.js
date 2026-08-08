// =========================
// MENU PRINCIPAL
// =========================

const navButtons = document.querySelectorAll(".nav-button");

navButtons.forEach(button => {

    button.addEventListener("click", () => {

        navButtons.forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

    });

});



// =========================
// FILTROS
// =========================

const filterButtons =
    document.querySelectorAll(".filter-button");


filterButtons.forEach(button => {

    button.addEventListener("click", () => {

        filterButtons.forEach(item => {
            item.classList.remove("active");
        });

        button.classList.add("active");

    });

});



// =========================
// FUTURO
// =========================

// Login de administrador
// Sistema de trabalhos
// Estatísticas
// Instruções
// Upload de arquivos
// Banco de dados
// Permissões
//
// Serão implementados posteriormente.
