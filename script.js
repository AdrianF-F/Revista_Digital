// =========================
// MENU PRINCIPAL
// =========================

const navButtons =
    document.querySelectorAll(".nav-button");


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
// FUTURAMENTE
// =========================
//
// Login de administrador
// Adicionar trabalhos
// Estatísticas
// Instruções
// Filtros reais
// Banco de dados
// Permissões
//
