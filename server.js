const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// IMPORTANT:
// Serve everything inside /public
// Example:
// public/assets/usdt-bep20.jpg
// becomes:
// /assets/usdt-bep20.jpg
app.use(express.static(path.join(__dirname, "public")));

// Home
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Plans
app.get("/plans", (req, res) => {
  res.sendFile(path.join(__dirname, "plans.html"));
});

// Payment
app.get("/payment", (req, res) => {
  res.sendFile(path.join(__dirname, "payment.html"));
});

// Submit page
app.get("/submit", (req, res) => {
  res.sendFile(path.join(__dirname, "submit.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`Vexora running on port ${PORT}`);
});
