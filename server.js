const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "posts.json");
const users = []; // In-memory user store

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "sonusonua22409@gmail.com",
    pass: "rill olsf ynri iudt",
  },
});

// ===== Signup =====
app.post("/signup", (req, res) => {
  const { email, password } = req.body;
  const exists = users.find((u) => u.email === email);
  if (exists) return res.json({ success: false, message: "User already exists" });
  users.push({ email, password });
  res.json({ success: true, message: "Signup successful" });
});

// ===== Login =====
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);
  if (user) {
    res.json({ success: true, message: "Login successful" });
  } else {
    res.json({ success: false, message: "Invalid credentials" });
  }
});

// ===== Get All Posts =====
app.get("/posts", (req, res) => {
  const posts = loadData();
  res.json(posts);
});

// ===== Submit New Roommate Post =====
app.post("/submit", (req, res) => {
  const { name, phone, email, gender, message } = req.body;
  const id = uuidv4();
  const data = loadData();
  data.push({ id, name, phone, email, gender, message, replies: [] });
  saveData(data);

  const deleteLink = `http://localhost:${PORT}/delete/${id}`;
  transporter.sendMail({
    from: "Find Roommate <sonusonua22409@gmail.com>",
    to: email,
    subject: "Manage Your Roommate Post",
    text: `Thank you for your post!\nTo delete it, click: ${deleteLink}`,
  });

  res.json({ success: true });
});

// ===== Delete Post =====
app.get("/delete/:id", (req, res) => {
  const id = req.params.id;
  let data = loadData();
  data = data.filter((p) => p.id !== id);
  saveData(data);
  res.send("✅ Your post has been deleted.");
});

// ===== Reply to a Post =====
app.post("/reply-roommate", (req, res) => {
  const { postId, fromName, fromGender, message } = req.body;
  const data = loadData();
  const post = data.find(p => p.id === postId);
  if (!post) return res.status(404).json({ success: false, message: "Post not found" });

  if (!post.replies) post.replies = [];
  post.replies.push({
    fromName,
    fromGender,
    text: message,
    timestamp: new Date().toISOString()
  });

  saveData(data);
  res.json({ success: true });
});

// ===== Get Replies for a Post =====
app.post("/get-post-replies", (req, res) => {
  const { postId } = req.body;
  const data = loadData();
  const post = data.find(p => p.id === postId);
  if (!post) return res.status(404).json({ success: false, message: "Post not found" });

  res.json(post.replies || []);
});

// ===== Submit Room Form (with imageLinks) =====
app.post("/submit-form", (req, res) => {
  const {
    name, phone, email, room_type, gender, facilities,
    deposit, available_from, location, map_link,
    rent_by_person, imageLinks
  } = req.body;

  const id = uuidv4();
  const data = loadData();

  data.push({
    id,
    name,
    phone,
    email,
    room_type,
    gender,
    facilities,
    deposit,
    available_from,
    location,
    map_link,
    rent_by_person,
    imageLinks,
    timestamp: new Date().toISOString()
  });

  saveData(data);

  transporter.sendMail({
    from: "Room Post <sonusonua22409@gmail.com>",
    to: email,
    subject: "Room Posted Successfully",
    text: `Thank you ${name}, your room post was received.\n\nLocation: ${location}\n\nImages:\n${imageLinks.join("\n")}`,
  });

  res.json({ success: true });
});

// ===== Helpers =====
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
function loadData() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
