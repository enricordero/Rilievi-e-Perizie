import http from 'http';
import fs from 'fs';
import express, { NextFunction, Request, Response } from 'express';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import cors, { CorsOptions } from 'cors';

/* ********************** HTTP server ********************** */
dotenv.config({ path: ".env" });
const connectionString = process.env.connectionStringAtlas!;
const dbName = process.env.dbName;
const port = process.env.PORT;
let paginaErrore: string;
const app = express();
const server = http.createServer(app);
server.listen(port, () => {
  init();
  console.log(`Server listening on port ${port}`);
});
function init() {
  fs.readFile('./static/error.html', (err, data) => {
    if (!err) {
      paginaErrore = data.toString();
    } else {
      paginaErrore = '<h1>Resource not found</h1>';
    }
  });
}
/* ********************** Middleware ********************** */
// 1. Request log
app.use('/', (req: Request, res: Response, next: NextFunction) => {
  console.log(req.method + ': ' + req.originalUrl);
  next();
});

// 2. Static resources
app.use('/', express.static('./static'));

// 3. Body params
app.use('/', express.json({ limit: '50mb' })); // Parsifica i parametri in formato json
app.use('/', express.urlencoded({ limit: '50mb', extended: true })); // Parsifica i parametri urlencoded

// 4. Params log
app.use('/', (req, res, next) => {
  if (Object.keys(req.query).length > 0) {
    console.log('--> GET params: ' + JSON.stringify(req.query));
  }
  if (Object.keys(req.body).length > 0) {
    console.log('--> BODY params: ' + JSON.stringify(req.body));
  }
  next();
});

// 5. CORS
const whitelist = [
  'http://localhost:3000',
  'https://localhost:3001',
  'http://localhost:4200',
  'https://cordovaapp',
  'https://rilievi-e-perizie-un3o.onrender.com',
  'http://localhost:8100',
  'https://localhost:8100'
];

const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    const trimmedOrigin = origin.trim();
    console.log("Request from origin:", trimmedOrigin);
    if (whitelist.includes(trimmedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS: " + trimmedOrigin));
    }
  }
};

app.use(cors(corsOptions));


/* ********************** Client routes ********************** */
app.post('/api/login', async (req: Request, res: Response) => {
  let collectionName = "Utenti";
  let { username, password } = req.body;

  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(dbName).collection(collectionName);
    const utente = await collection.findOne({ username: username });

    if (!utente) {
      res.status(404).send("Utente non trovato");
      return;
    }
    else {
      if (utente.password !== password) {
        res.status(401).send("Password errata");
        return;
      }
      else {
        if (utente.admin !== true) {
          res.status(403).send("Accesso riservato agli amministratori");
          return;
        }
      }
    }
    res.status(200).send({ message: "Login riuscito", utente: { username: utente.username, nome: utente.nome } });

  } catch (err) {
    console.error("Errore login:", err);
    res.status(500).send({ error: "Errore durante il login" });
  } finally {
    await client.close();
  }
});

app.post('/api/loginUtenti', async (req: Request, res: Response) => {
  let collectionName = "Utenti";
  let { username, password } = req.body;

  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(dbName).collection(collectionName);
    const utente = await collection.findOne({ username: username });

    if (!utente) {
      res.status(404).send("Utente non trovato");
      return;
    }
    else {
      if (utente.password !== password) {
        res.status(401).send("Password errata");
        return;
      }
      else {
        if (utente.admin == true) {
          res.status(403).send("Accesso riservato agli operatori");
          return;
        }
      }
    }
    res.status(200).send({ message: "Login riuscito", utente: { id: utente._id, username: utente.username, nome: utente.nome } });

  } catch (err) {
    console.error("Errore login:", err);
    res.status(500).send({ error: "Errore durante il login" });
  } finally {
    await client.close();
  }
});

app.post('/api/cambiaPassword', async (req: Request, res: Response) => {
  const collectionName = "Utenti";
  const { username, newPassword } = req.body;

  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(dbName).collection(collectionName);
    const utente = await collection.findOne({ username: username });

    if (!utente) {
      res.status(404).send("Utente non trovato");
      return;
    }

    const result = await collection.updateOne(
      { username: username },
      { $set: { password: newPassword } }
    );

    if (result.modifiedCount === 1) {
      res.status(200).send({ message: "Password aggiornata con successo" });
    } else {
      res.status(500).send({ error: "Impossibile aggiornare la password" });
    }

  } catch (err) {
    console.error("Errore durante il cambio password:", err);
    res.status(500).send({ error: "Errore durante il cambio password" });
  } finally {
    await client.close();
  }
});

app.get('/api/getOperatori', async (req: Request, res: Response) => {
  const collectionName = "Utenti";

  const client = new MongoClient(connectionString);
  await client.connect();
  const collection = client.db(dbName).collection(collectionName);

  const filter = { admin: false };

  const request = collection.find(filter).toArray();

  request.catch((err) => {
    res.status(500).send(`Errore esecuzione query: ${err}`);
  });
  request.then((data) => {
    res.send(data);
  });
  request.finally(() => {
    client.close();
  });
});


app.get('/api/getPerizie', async (req: Request, res: Response) => {
  let collectionName = "Perizie";

  const client = new MongoClient(connectionString);
  await client.connect();
  const collection = client.db(dbName).collection(collectionName);

  const request = collection.find().toArray();

  request.catch((err) => {
    res.status(500).send(`Errore esecuzione query: ${err}`);
  });
  request.then((data) => {
    res.send(data);
  });
  request.finally(() => {
    client.close();
  });
});

app.get('/api/getPeriziePerUtente', async (req: Request, res: Response) => {
  let collectionName = "Perizie";
  let utente = req.query.Utente

  const client = new MongoClient(connectionString);
  await client.connect();
  const collection = client.db(dbName).collection(collectionName);

  const request = collection.find({ "idUtente": utente }).toArray();

  request.catch((err) => {
    res.status(500).send(`Errore esecuzione query: ${err}`);
  });
  request.then((data) => {
    res.send(data);
  });
  request.finally(() => {
    client.close();
  });
});

app.get('/api/getDettagliPerizia', async (req: Request, res: Response) => {
  let collectionName = "Perizie";
  let idPerizia = req.query.periziaId
  
  const client = new MongoClient(connectionString);
  await client.connect();
  const collection = client.db(dbName).collection(collectionName);
  let request
  if(idPerizia!.toString().length > 6){
    let id = new ObjectId(idPerizia?.toString())
    request = collection.find({ "_id": id }).toArray();
  }
  else{
    request = collection.find({ "_id": idPerizia }).toArray();
  }
  request.catch((err) => {
    res.status(500).send(`Errore esecuzione query: ${err}`);
  });
  request.then((data) => {
    res.send(data);
  });
  request.finally(() => {
    client.close();
  });
});

app.post('/api/creaUtente', async (req: Request, res: Response) => {
  let collectionName = "Utenti";
  let nuovoUtente = req.body.nuovoUtente;

  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(dbName).collection(collectionName);

    const utenteDaInserire = {
      nome: nuovoUtente["nome"],
      username: nuovoUtente["username"],
      password: "password",
      email: nuovoUtente["email"],
      admin: false
    };

    const result = await collection.insertOne(utenteDaInserire);

    res.status(201).send({ message: "Utente creato correttamente", insertedId: result.insertedId });
  } catch (err) {
    console.error("Errore durante la creazione dell'utente:", err);
    res.status(500).send({ error: "Errore durante la creazione dell'utente" });
  } finally {
    await client.close();
  }
});

app.post('/api/creaPerizia', async (req: Request, res: Response) => {
  const collectionName = "Perizie";
  const nuovaPerizia = req.body.perizia;

  const client = new MongoClient(connectionString);
  try {
    await client.connect();
    const collection = client.db(dbName).collection(collectionName);

    const periziaDaInserire = {
      idUtente: nuovaPerizia["idUtente"],
      dataOra: nuovaPerizia["dataOra"],
      coordinate: nuovaPerizia["coordinate"],
      descrizione: nuovaPerizia["descrizione"],
      fotografie: nuovaPerizia["fotografie"]
    };

    const result = await collection.insertOne(periziaDaInserire);

    res.status(201).send({ message: "Perizia creata correttamente", insertedId: result.insertedId });
  } catch (err) {
    console.error("Errore durante la creazione della perizia:", err);
    res.status(500).send({ error: "Errore durante la creazione della perizia" });
  } finally {
    await client.close();
  }
});


app.post("/api/aggiornaPerizia", async (req, res) => {
  let collectionName = "Perizie";
  let { idPerizia, descrizione, commentiFoto } = req.body;

  const client = new MongoClient(connectionString);
  await client.connect();
  const collection = client.db(dbName).collection(collectionName);

  try {
    let perizia = await collection.findOne({ _id: idPerizia });

    if (!perizia) {
      res.status(404).send("Perizia non trovata");
      return;
    }

    perizia.coordinate.descrizione = descrizione;

    if (perizia.fotografie && commentiFoto.length === perizia.fotografie.length) {
      for (let i = 0; i < perizia.fotografie.length; i++) {
        perizia.fotografie[i].commento = commentiFoto[i];
      }
    } else {
      res.status(400).send("Errore: numero di commenti diverso dal numero di foto");
      return;
    }

    await collection.updateOne(
      { _id: idPerizia },
      { $set: { descrizione: descrizione, fotografie: perizia.fotografie } }
    );

    res.send("Perizia aggiornata correttamente!");

  } catch (err) {
    res.status(500).send(`Errore server: ${err}`);
  } finally {
    client.close();
  }
});


/* ********************** Default Route & Error Handler ********************** */
app.use('/', (req: Request, res: Response) => {
  res.status(404);
  if (!req.originalUrl.startsWith('/api/')) {
    res.send(paginaErrore);
  } else {
    res.send(`Resource not found: ${req.originalUrl}`);
  }
});

app.use((err: any, req: Request, res: Response) => {
  console.log(err.stack);
  res.status(500).send(err.message);
});
