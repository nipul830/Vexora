const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, name + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed."));
  }
});

app.get("/", (_, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/plans", (_, res) => res.sendFile(path.join(__dirname, "public", "plans.html")));
app.get("/payment", (_, res) => res.sendFile(path.join(__dirname, "public", "payment.html")));
app.get("/submit", (_, res) => res.sendFile(path.join(__dirname, "public", "submit.html")));
app.get("/success", (_, res) => res.sendFile(path.join(__dirname, "public", "success.html")));

app.post("/submit-payment", upload.single("proof"), (req, res) => {
  const submission = {
    transactionId: req.body.transactionId || "",
    tradingview: req.body.tradingview || "",
    telegram: req.body.telegram || "",
    proofFile: req.file ? req.file.filename : "",
    submittedAt: new Date().toISOString()
  };

  const file = path.join(__dirname, "submissions.json");
  let submissions = [];

  if (fs.existsSync(file)) {
    try { submissions = JSON.parse(fs.readFileSync(file, "utf8")); }
    catch { submissions = []; }
  }

  submissions.push(submission);
  fs.writeFileSync(file, JSON.stringify(submissions, null, 2));
  res.redirect("/success");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Vexora running on port ${PORT}`);
});
