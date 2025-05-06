$(document).ready(function () {
    let selectOperatori = $("#userFilter")
    let indirizzo = $("#indirizzo").hide()
    let dataOra = $("#dataOra").hide()
    let descrizionePerizia = $("#descrizionePerizia").hide()
    let fotoContainer = $("#fotoContainer").hide()
    let btnSalvaModifiche = $("#btnSalvaModifiche").hide()
    let nome = $("#nome")
    let username = $("#username")
    let password = $("#password")
    let email = $("#email")
    let btnCreaUtente = $("#btnCreaUtente")

    getPerizie()
    popolaOperatori()

    selectOperatori.on("change", function () {
        if (this.value == "all") {
            getPerizie()
        }
        else {
            console.log(this.value)
            getPeriziePerUtente(this.value)
        }
    })

    async function popolaOperatori() {
        selectOperatori.empty()
        selectOperatori.append($("<option>").val("all").text("Tutti"))
        const request = await inviaRichiesta("GET", "/api/getOperatori")
        if (request) {
            request.data.forEach(operatore => {
                $("<option>").val(operatore._id).text(operatore.nome).appendTo(selectOperatori)
            });
        }
    }

    async function getPerizie() {
        const request = await inviaRichiesta("GET", "/api/getPerizie")
        if (request) {
            let perizie = request.data
            popolaMappa(perizie)
        }
    }

    async function getPeriziePerUtente(utente) {
        const request = await inviaRichiesta("GET", "/api/getPeriziePerUtente", { utente })
        if (request) {
            let perizie = request.data
            popolaMappa(perizie)
        }
    }

    btnCreaUtente.on("click", function () {
        let emailValue = email.val()
        const regexEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (nome.val() && username.val() && email.val()) {
            if (!regexEmail.test(emailValue)) {
                Swal.fire({
                    title: "Email non valida!",
                    icon: "error"
                });
                return;
            }
            else{
                const nuovoUtente = {
                    "nome": nome.val(),
                    "username": username.val(),
                    "password": "password",
                    "email": email.val()
                }
                console.log(nuovoUtente)
                const request = inviaRichiesta("POST", "/api/creaUtente", {nuovoUtente})
                if(request){
                    Swal.fire({
                        title: "Utente creato con successo!",
                        icon: "success"
                    });
                    popolaOperatori()
                }
            }
        }
    })

    btnSalvaModifiche.on("click", function(){
        let descrizione = descrizionePerizia.val()
        let commentiFoto = []
        let nFoto = 0
        let idPerizia = $("#dettagliPerizia").find("b1").text()

        $(".commentoFoto").each(function(){
            nFoto++
            let commentoFoto = $(`#cF-${nFoto}`).val()
            commentiFoto.push(commentoFoto)
        })

        let modifiche = {
            idPerizia,
            descrizione,
            commentiFoto
        }

        const request = inviaRichiesta("POST", "/api/aggiornaPerizia", modifiche)
        if(request.status == 200){
            Swal.fire({
                title: "Modifiche salvate con successo!",
                icon: "success"
            })
        }
    })
})
