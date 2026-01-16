const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// =======================
// MongoDB
// =======================
mongoose
  .connect("mongodb://127.0.0.1:27017/marketplace_db")
  .then(() => console.log("✅ MongoDB connecté (marketplace_db)"))
  .catch((err) => console.error("❌ Erreur MongoDB :", err.message));

// =======================
// Models
// =======================

const categorySchema = new mongoose.Schema({
  nom: { type: String, required: true }
});
const Category = mongoose.model("Category", categorySchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ["client", "admin"], default: "client" }
});
const User = mongoose.model("User", userSchema);

const productSchema = new mongoose.Schema({
  nom: { type: String, required: true },
  prix: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0 },
  categorie: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }
});
const Product = mongoose.model("Product", productSchema);

const reviewSchema = new mongoose.Schema({
  commentaire: { type: String, required: true },
  note: { type: Number, required: true, min: 1, max: 5 },
  produit: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  auteur: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});
const Review = mongoose.model("Review", reviewSchema);

// =======================
// Routes
// =======================

// ---- Categories ----
app.post("/api/categories", async (req, res) => {
  try {
    if (!req.body.nom) {
      return res.status(400).json({ message: "nom obligatoire" });
    }
    const cat = await Category.create({ nom: req.body.nom });
    res.status(201).json(cat);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const cats = await Category.find();
    res.json(cats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Users ----
app.post("/api/users", async (req, res) => {
  try {
    const { username, email, role } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: "username et email obligatoires" });
    }

    const user = await User.create({ username, email, role });
    res.status(201).json(user);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find().select("username email role");
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---- Products ----
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().populate("categorie");
    res.json(products);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/products", async (req, res) => {
  try {
    const { nom, prix, stock, categorie } = req.body;

    if (!nom || prix == null || stock == null || !categorie) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    if (prix <= 0) {
      return res.status(400).json({ message: "Le prix doit être positif" });
    }

    const product = await Product.create({
      nom,
      prix,
      stock,
      categorie
    });

    res.status(201).json(product);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- Reviews ----
app.post("/api/reviews", async (req, res) => {
  try {
    const { commentaire, note, produit, auteur } = req.body;

    if (!commentaire || note == null || !produit || !auteur) {
      return res.status(400).json({ message: "champs manquants" });
    }

    if (note < 1 || note > 5) {
      return res.status(400).json({ message: "note entre 1 et 5" });
    }

    const review = await Review.create({ commentaire, note, produit, auteur });
    res.status(201).json(review);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/reviews/:productId", async (req, res) => {
  try {
    const reviews = await Review.find({ produit: req.params.productId })
      .populate("auteur", "username")
      .populate({
        path: "produit",
        populate: { path: "categorie" }
      });

    res.json(reviews);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- Delete intelligent ----
app.delete("/api/products/:id", async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    await Review.deleteMany({ produit: req.params.id });

    res.json({ message: "Produit supprimé + avis supprimés" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 Serveur lancé sur http://localhost:3000");
})
