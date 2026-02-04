import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import "dotenv/config";
import mysql from 'mysql2/promise';

const app = express();
const PORT = process.env.PORT || 5000;

// Create the connection to database
const connection = await mysql.createConnection({
    host: process.env.HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    password: process.env.DB_PASS
});

// Clé secrète pour signer les tokens JWT
const SECRET_KEY = "ma_cle_secrete_super_longue_123";

// "Base de données" en mémoire
const users = [];

// Middleware pour parser le JSON
app.use(express.json());
//cors
app.use(cors());

//UTILS FUNCTIONS

/**
 * 
 * @param {*} body the main req.body
 * @param {*} mode Whether to use "todos" or "users"
 * @returns 
 */
function check_for_body(body, mode) {
    let result = {
        error: false,
        err_message: "",
        res_number: 0,
    };

    if (!body || body === undefined) {
        result.error = true;
        result.err_message = "No body found...";
        result.res_number = 400;
        return result;
    }

    if (mode == "todos") {

    }

    if (mode == "users") {

    }

    return result;
}

//ROUTES

//HOME
app.get("/", (req, res) => {
    res.send("<h1>Bienvenue sur l'API</h1>");
});

//ALL
app.get("/api/seeall", async (req, res) => {
    try {
        const sql_todos = "SELECT * FROM todos";
        const [todo_result, todo_fields] = await connection.query(sql_todos);
        const sql_users = "SELECT * FROM users";
        const [users_result, users_fields] = await connection.query(sql_users);
        res.json({
            results: {
                todos: todo_result,
                users: users_result
            }
        });
        console.log("response SEEALL OK");
    } catch (err) {
        console.log(err);
        res.json({ error: err });
    }
});

// DB_TODOS
app.get("/api/todos", async (req, res) => {
    try {
        const sql = "SELECT * FROM todos";
        const [result, fields] = await connection.query(sql);;
        res.json({ results: result });
    } catch (err) {
        console.log(err);
    }
});

app.post('api/todos/:id', async (req, res) => {
    try {
        const sql = "INSERT INTO `todos`(`text`, `completed`) VALUES (?, ?)";
        if (!req.body) {
            return res.status(400).json({ message: "No body found..." })
        }

        if (!req.body.text || req.body.completed === undefined) {
            return res.status(400).json({ message: "Champs invalides." })
        }

        const values = [req.body.text, req.body.completed];
        const [result, fields] = await connection.execute(sql, values);
        console.log("POST in TODOS done!");
    } catch (err) {
        console.log(err);
    }

})

// ========================
// POST /api/register
// ========================
app.post("/api/register", async (req, res) => {

    //check if req.body exists, sends error if not.
    if (!req.body) {
        console.log("POST attempted but no body found.");
        return res.status(400).json({ message: "No body found." });
    }

    const { email, password } = req.body;

    // Vérifier que les champs sont remplis
    if (!email || !password) {
        console.log("POST attempted but no email or password found");
        return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = users.find((u) => u.email === email);
    if (existingUser) {
        return res.status(409).json({ message: "Cet email est déjà utilisé" });
    }

    // Hasher le mot de passe avec bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Stocker l'utilisateur
    const newUser = { id: users.length + 1, email, password: hashedPassword };
    users.push(newUser);

    res.status(201).json({ message: "Utilisateur créé", user: { id: newUser.id, email: newUser.email } });
});

// ========================
// POST /api/login
// ========================
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    // Chercher l'utilisateur
    const user = users.find((u) => u.email === email);
    if (!user) {
        console.log(users);
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Comparer le mot de passe avec le hash
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // ==============================
    // jwt.sign(payload, secretKey, options)
    // Crée un token JWT signé
    // ==============================
    const token = jwt.sign(
        { id: user.id, email: user.email },  // payload (données dans le token)
        SECRET_KEY,                            // clé secrète pour signer
        { expiresIn: "1h" }                    // options : expire dans 1 heure
    );

    res.json({ message: "Connexion réussie", token });
});

// ========================
// Middleware d'authentification
// ========================
function authenticateToken(req, res, next) {
    // next est pour passer au middleware suivant
    // Récupérer le header Authorization: "Bearer <token>"
    const authHeader = req.headers.authorization;
    // Avoid errors with .split() if authHeader empty (first get authHeader
    // THEN split)
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "Token manquant" });
    }

    // ==============================
    // jwt.verify(token, secretKey, callback)
    // Vérifie et décode le token
    // ==============================
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Token invalide ou expiré" });
        }

        // Le payload décodé est disponible dans decoded
        req.user = decoded;
        next();
    });
}

// ========================
// GET /api/protected (route protégée)
// ========================
app.get("/api/protected", authenticateToken, (req, res) => {
    res.json({
        message: "Bienvenue sur la route protégée !",
        user: req.user,
    });
});

// ========================
// GET /api/protected (route non protégée)
// ========================
app.get("/api/not-protected", (req, res) => {
    res.json({
        message: "Bienvenue sur la route non protégée !"
    });
});

app.listen(PORT, () => {
    console.log(`Serveur démarré : http://localhost:${PORT}`);
});
