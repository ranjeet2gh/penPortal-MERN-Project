const express = require("express");
const cors = require("cors");
const fs = require("fs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");

const app = express();
// const PORT = 5000;
const PORT = process.env.PORT || 5000;
const SECRET_KEY = "your_secret_key";

app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// File-based storage (Replace with MongoDB in future if needed)
const dbFile = "database.json";
if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({ users: [], blogs: [] }));

const readDatabase = () => JSON.parse(fs.readFileSync(dbFile));
const writeDatabase = (data) => fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));

// Multer for image upload
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// User Signup
app.post("/api/signup", upload.single("profileImage"), (req, res) => {
  const { email, password } = req.body;
  const profileImage = req.file ? `/uploads/${req.file.filename}` : "";
  const db = readDatabase();

  if (db.users.find((user) => user.email === email)) {
    return res.status(400).json({ message: "User already exists" });
  }

  const newUser = { email, password, profileImage };
  db.users.push(newUser);
  writeDatabase(db);

  res.status(201).json({ message: "User registered successfully" });
});

// User Login
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  const db = readDatabase();
  const user = db.users.find((u) => u.email === email && u.password === password);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ email: user.email }, SECRET_KEY, { expiresIn: "1h" });
  res.json({ token, user });
});

// Fetch User Data
app.get("/api/user", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const db = readDatabase();
    const user = db.users.find((u) => u.email === decoded.email);
    res.json(user);
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Fetch Blogs
app.get("/api/blogs", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ message: "No token provided" });

  try {
    jwt.verify(token, SECRET_KEY);
    const db = readDatabase();
    res.json(db.blogs);
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Create Blog
 
app.post("/api/blogs", upload.single("image"), (req, res) => {
    const { title, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : "";
    const newBlog = { id: Date.now(), title, description, image };
  
    const db = readDatabase();
    db.blogs.push(newBlog);
    writeDatabase(db);
  
    res.status(201).json(newBlog);  
  });
// update Blog
  app.put("/api/blogs/:id", upload.single("image"), (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : "";
  
    const db = readDatabase();
    const blogIndex = db.blogs.findIndex((b) => b.id === Number(id));
    if (blogIndex === -1) return res.status(404).json({ error: "Blog not found" });
  
    db.blogs[blogIndex] = { ...db.blogs[blogIndex], title, description, image };
    writeDatabase(db);
    res.json(db.blogs[blogIndex]);
  });
  
  

// Delete Blog
app.delete("/api/blogs/:id", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ message: "No token provided" });

  try {
    jwt.verify(token, SECRET_KEY);
    const db = readDatabase();
    db.blogs = db.blogs.filter((blog) => blog.id !== parseInt(req.params.id));
    writeDatabase(db);
    res.status(200).json({ message: "Blog deleted" });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

/**
 * Future Migration Notes:
 * - Replace file-based storage with MongoDB.
 * - Use Mongoose to define schemas.
 * - Replace fs read/write operations with MongoDB queries.
 * - Example: Replace readDatabase() with `User.findOne({ email })`
 */
