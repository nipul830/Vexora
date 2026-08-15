const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const ROOT = __dirname;

// Static files root folder se serve honge
app.use(express.static(ROOT));

// JSON / form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

// Plans page
app.get("/plans", (req, res) => {
  res.sendFile(path.join(ROOT, "plans.html"));
});

// Payment page
app.get("/payment", (req, res) => {
  res.sendFile(path.join(ROOT, "payment.html"));
});

// Direct .html URLs bhi work karenge
app.get("/plans.html", (req, res) => {
  res.sendFile(path.join(ROOT, "plans.html"));
});

app.get("/payment.html", (req, res) => {
  res.sendFile(path.join(ROOT, "payment.html"));
});

// 404
app.use((req, res) => {
  res.status(404).send("Page Not Found");
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Vexora running on port ${PORT}`);
});
