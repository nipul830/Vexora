const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Static files
app.use(express.static(__dirname));

// Upload folder
const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, name + ext);
  }
});

// Only image uploads
const upload = multer({
  storage: storage,

  limits: {
    fileSize: 8 * 1024 * 1024
  },

  fileFilter: function (req, file, cb) {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  }
});


// =========================
// HOME
// =========================

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});


// =========================
// PLANS
// =========================

app.get("/plans", function (req, res) {
  res.sendFile(path.join(__dirname, "plans.html"));
});


// =========================
// PAYMENT
// =========================

app.get("/payment", function (req, res) {
  res.sendFile(path.join(__dirname, "payment.html"));
});


// =========================
// SUBMIT PAYMENT
// =========================

app.get("/submit", function (req, res) {
  res.sendFile(path.join(__dirname, "submit.html"));
});


// =========================
// SUCCESS
// =========================

app.get("/success", function (req, res) {
  res.sendFile(path.join(__dirname, "success.html"));
});


// =========================
// PAYMENT SUBMISSION
// =========================

app.post(
  "/submit-payment",
  upload.single("proof"),
  function (req, res) {

    const submission = {
      transactionId: req.body.transactionId || "",
      tradingview: req.body.tradingview || "",
      telegram: req.body.telegram || "",

      proofFile: req.file
        ? req.file.filename
        : "",

      submittedAt: new Date().toISOString()
    };

    const file = path.join(
      __dirname,
      "submissions.json"
    );

    let submissions = [];

    if (fs.existsSync(file)) {
      try {
        submissions = JSON.parse(
          fs.readFileSync(file, "utf8")
        );
      } catch (error) {
        submissions = [];
      }
    }

    submissions.push(submission);

    fs.writeFileSync(
      file,
      JSON.stringify(submissions, null, 2)
    );

    res.redirect("/success");
  }
);


// =========================
// ERROR HANDLER
// =========================

app.use(function (err, req, res, next) {

  console.error(err);

  res.status(400).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport"
            content="width=device-width, initial-scale=1">
      <title>Vexora</title>
    </head>

    <body style="
      background:#080d1c;
      color:white;
      font-family:Arial;
      padding:40px;
      text-align:center;
    ">

      <h2>Something went wrong</h2>

      <p>
        ${err.message || "Upload failed"}
      </p>

      <a
        href="/submit"
        style="
          display:inline-block;
          margin-top:20px;
          padding:14px 24px;
          background:#6c35ff;
          color:white;
          text-decoration:none;
          border-radius:10px;
        "
      >
        Back
      </a>

    </body>
    </html>
  `);
});


// =========================
// START SERVER
// =========================

app.listen(PORT, "0.0.0.0", function () {
  console.log(
    `Vexora running on port ${PORT}`
  );
});
