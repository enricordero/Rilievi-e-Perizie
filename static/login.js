"use strict"

$(document).ready(function () {
    let _username = $("#usr")
    let _password = $("#pwd")
    let _lblErrore = $("#lblErrore")

    _lblErrore.hide();

    $("#btnLogin").on("click", controllaLogin)

    // il submit deve partire anche senza click 
    // con il solo tasto INVIO
    $(document).on('keydown', function (event) {
        if (event.keyCode == 13)
            controllaLogin();
    });


    async function controllaLogin() {
        const request = await inviaRichiesta('POST', '/api/login',
            {
                "username": _username.val(),
                "password": _password.val()
            }
        );
        if (request.status != 200) {
            Swal.fire({
                html: `<h2>${request.err}</h2>`,
                icon: "error"
            })
        }
        else {
            Swal.fire({
                html: `<h3>Login effettuato, benvenuto ${request.data.utente.nome}!</h3>`,
                icon: "success",
                confirmButtonText: "Prosegui"
            }).then(() => {
                window.location.href = "adminPage.html";
            });
        }
    }
});