const fileinput = document.getElementById("ydkInput");
const result = document.getElementById("result");
const label_errYdk = document.getElementById("label-error");
const label_Ncards = document.getElementById("cards-number");
const spinner = document.getElementById("spinner");
const copyButton = document.getElementById("copy-button");
const resultBox = document.getElementById("result");

fileinput.addEventListener("change", handleYdk);

function handleYdk(event) {
    const file = event.target.files[0];
    result.textContent = "";
    label_Ncards.textContent = "";
    label_errYdk.textContent = "";

    if (!file) {
        showMessage(label_errYdk, "No file selected. Please choose a file.", "error");
        return;
    }

    if (!file.name.toLowerCase().endsWith(".ydk")) {
        showMessage(label_errYdk, "Unsupported file type. Please select a .ydk file.", "error");
        return;
    }

    // Mostra lo spinner e disabilita input
    spinner.style.display = "inline-block";
    fileinput.disabled = true;

    const reader = new FileReader();

    reader.onload = () => {
        analiseYdk(reader.result)
            .then(({ risultati, totale }) => {
                // Stampa ogni carta su una riga
                result.textContent = risultati
                    .map(item => `${item.quantità} ${item.nome}`)
                    .join("\n");

                // Mostra il totale all'utente
                showMessage(label_Ncards, `Totale carte: ${totale}`, "success");
            })
            .catch(err => {
                console.error(err);
                showMessage(label_errYdk, "Errore durante l'elaborazione.", "error");
            })
            .finally(() => {
                // Nasconde lo spinner e riabilita input
                spinner.style.display = "none";
                fileinput.disabled = false;
            });
    };

    reader.onerror = () => {
        showMessage(label_errYdk, "Error reading the file. Please try again.", "error");

        // Nasconde lo spinner e riabilita input anche in caso di errore
        spinner.style.display = "none";
        fileinput.disabled = false;
    };

    reader.readAsText(file);
}

// Displays a message to the user
function showMessage(label, message, type) {
    label.textContent = message;
    label.style.color = type === "error" ? "red" : "green";
}

async function analiseYdk(text) {
    const text_array = text.split(/\r?\n/);

    // Mantieni solo le righe che contengono solo numeri
    const id_array = text_array.filter(element => /^\d+$/.test(element));
    const name_array = [];

    for (const id of id_array) {
        const card_name = await chiamataAPI(id);
        if (card_name) name_array.push(card_name);
    }

    // Conta le copie
    const contatore = {};
    name_array.forEach(nome => {
        contatore[nome] = (contatore[nome] || 0) + 1;
    });

    // Array di oggetti { nome, quantità }
    const risultati = Object.entries(contatore).map(([nome, count]) => ({
        nome: nome,
        quantità: count
    }));

    // Calcola il totale
    const totale = risultati.reduce((sum, item) => sum + item.quantità, 0);

    return { risultati, totale };
}

async function chiamataAPI(id) {
    const maxRetry = 3; // numero massimo di tentativi
    const delay = ms => new Promise(res => setTimeout(res, ms)); // funzione per pausa

    for (let attempt = 1; attempt <= maxRetry; attempt++) {
        try {
            const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${id}`);

            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

            const data = await response.json();

            if (!data.data || !data.data[0]) throw new Error("Dati mancanti");

            return data.data[0].name; // tutto ok
        } catch (error) {
            console.warn(`Tentativo ${attempt} fallito per ID ${id}: ${error.message}`);
            if (attempt < maxRetry) {
                await delay(500); // mezzo secondo di pausa
            } else {
                console.error(`ID ${id} non trovato dopo ${maxRetry} tentativi.`);
                return null;
            }
        }
    }
}

copyButton.addEventListener("click", () => {
    const testo = resultBox.innerText;
  
    if (!testo) return; // niente da copiare
  
    navigator.clipboard.writeText(testo).then(() => {
      // Feedback: cambia colore e testo
      copyButton.textContent = "✔ Copiato!";
      copyButton.classList.add("copied");
  
      setTimeout(() => {
        copyButton.textContent = "📋 Copia";
        copyButton.classList.remove("copied");
      }, 2000);
    }).catch(err => {
      console.error("Errore copia:", err);
    });
  });
