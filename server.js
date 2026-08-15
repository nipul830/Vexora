const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// Parse normal form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Upload folder
const uploadDir = path.join(__dirname, "public", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File upload settings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name =
      "proof-" +
      Date.now() +
      "-" +
      Math.random().toString(36).substring(2, 8) +
      ext;

    cb(null, name);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// Serve everything inside /public
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

// ===============================
// SUBMIT PAYMENT DETAILS
// ===============================
app.post("/submit-payment", upload.single("proof"), (req, res) => {

  console.log("Payment submission received");

  console.log("UTR:", req.body.transactionId);
  console.log("TradingView:", req.body.tradingview);
  console.log("Telegram:", req.body.telegram);

  if (req.file) {
    console.log("Proof uploaded:", req.file.filename);
  }

  // Success page
  res.send(`
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  >

  <title>Payment Submitted</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: Arial, sans-serif;
      background: #050b1d;
      color: #f4f7ff;
    }

    .success-card {
      width: 100%;
      max-width: 430px;
      padding: 40px 28px;
      text-align: center;
      border-radius: 24px;
      background: #0d1a36;
      border: 1px solid rgba(139, 92, 255, .35);
      box-shadow: 0 20px 60px rgba(0,0,0,.35);
    }

    .success-icon {
      width: 70px;
      height: 70px;
      margin: 0 auto 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 38px;
      font-weight: bold;
      color: white;
      background: linear-gradient(
        135deg,
        #8b2cff,
        #087cff
      );
    }

    h1 {
      margin: 0 0 14px;
      font-size: 28px;
    }

    p {
      margin: 0 0 28px;
      color: #a9b8dc;
      font-size: 16px;
      line-height: 1.6;
    }

    .ok-btn {
      width: 100%;
      border: 0;
      border-radius: 14px;
      padding: 16px 20px;
      font-size: 18px;
      font-weight: 700;
      color: white;
      cursor: pointer;
      background: linear-gradient(
        135deg,
        #8b2cff,
        #087cff
      );
    }

    .ok-btn:active {
      transform: scale(.98);
    }
  </style>
</head>

<body>

  <div class="success-card">

    <div class="success-icon">✓</div>

    <h1>Payment Details Submitted</h1>

    <p>
      Your payment details have been submitted successfully.
      We will verify your payment and activate your plan.
    </p>

    <button
      class="ok-btn"
      onclick="window.location.href='/'"
    >
      OK
    </button>

  </div>

</body>
</html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`Vexora running on port ${PORT}`);
});
