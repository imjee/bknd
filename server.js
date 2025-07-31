const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_FILE = path.join(__dirname, 'barang.json');
const SECRET = process.env.JWT_SECRET || "drcsupersecret";
const ADMIN = { username: "admin", password: "drc123" };

app.use(cors());
app.use(express.json({ limit: '4mb' }));

function readDB() {
    if (!fs.existsSync(DB_FILE)) return [];
    return JSON.parse(fs.readFileSync(DB_FILE));
}
function writeDB(list) {
    fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2));
}

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if(username === ADMIN.username && password === ADMIN.password){
        const token = jwt.sign({ role: "admin" }, SECRET, { expiresIn: "12h" });
        res.json({ token });
    } else {
        res.status(401).json({ error: "Username/password salah" });
    }
});

// Auth middleware
function adminAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.split(" ")[1];
    if(!token) return res.status(401).json({error:"Unauthorized"});
    try {
        const data = jwt.verify(token, SECRET);
        if(data.role === "admin") return next();
        return res.status(401).json({error:"Unauthorized"});
    } catch {
        return res.status(401).json({error:"Unauthorized"});
    }
}

// Get all barang
app.get('/api/barang', (req, res) => {
    res.json(readDB());
});

// Create barang (admin only)
app.post('/api/barang', adminAuth, (req, res) => {
    const { nama, deskripsi, harga, foto, link, newLaunching, bestSeller } = req.body;
    if (!nama || !deskripsi || !harga || !foto || !link) {
        return res.status(400).json({error: 'Data tidak lengkap'});
    }
    const list = readDB();
    const id = Date.now().toString();
    const newBarang = { id, nama, deskripsi, harga, foto, link, newLaunching: !!newLaunching, bestSeller: !!bestSeller };
    list.push(newBarang);
    writeDB(list);
    res.json({sukses: true, barang: newBarang});
});

// Update barang (admin only)
app.put('/api/barang/:id', adminAuth, (req, res) => {
    const { id } = req.params;
    const { nama, deskripsi, harga, foto, link, newLaunching, bestSeller } = req.body;
    let list = readDB();
    const idx = list.findIndex(b => b.id === id);
    if(idx === -1) return res.status(404).json({error: 'Barang tidak ditemukan'});
    list[idx] = { ...list[idx], nama, deskripsi, harga, foto, link, newLaunching: !!newLaunching, bestSeller: !!bestSeller };
    writeDB(list);
    res.json({sukses: true, barang: list[idx]});
});

// Delete barang (admin only)
app.delete('/api/barang/:id', adminAuth, (req, res) => {
    const { id } = req.params;
    let list = readDB();
    const idx = list.findIndex(b => b.id === id);
    if(idx === -1) return res.status(404).json({error: 'Barang tidak ditemukan'});
    list.splice(idx, 1);
    writeDB(list);
    res.json({sukses: true});
});

app.get('/', (req, res) => {
    res.send('DRC Victory API Running!');
});

app.listen(PORT, () => console.log('Server running on http://localhost:' + PORT));
