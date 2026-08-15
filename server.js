const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// ======================================================
// SETTINGS
// ======================================================

const REVIEW_TIME_MS = 15 * 60 * 1000;

const MANUAL_REVIEW_TELEGRAM =
  "https://t.me/Jkhub_premium";

const WHATSAPP_NUMBER =
  "916371406885";

// QR files already in GitHub:
// public/assets/upi-phonepe.jpg
// public/assets/usdt-trc20.jpg
// public/assets/usdt-bep20.jpg
// public/assets/eth-erc20.jpg

// ======================================================
// PLANS
// ======================================================

const PLANS = {
  "7days": {
    name: "7 Days",
    amount: 999
  },

  "15days": {
    name: "15 Days",
    amount: 1499
  },

  "30days": {
    name: "30 Days",
    amount: 2499
  },

  "lifetime": {
    name: "Lifetime",
    amount: 11000
  }
};

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.json()
);

// ======================================================
// DIRECTORIES
// ======================================================

const publicDir =
  path.join(__dirname, "public");

const uploadDir =
  path.join(
    publicDir,
    "uploads"
  );

const dataDir =
  path.join(
    __dirname,
    "data"
  );

const paymentsFile =
  path.join(
    dataDir,
    "payments.json"
  );

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(
    uploadDir,
    {
      recursive: true
    }
  );
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(
    dataDir,
    {
      recursive: true
    }
  );
}

if (!fs.existsSync(paymentsFile)) {
  fs.writeFileSync(
    paymentsFile,
    "[]",
    "utf8"
  );
}

// ======================================================
// PAYMENT HELPERS
// ======================================================

function getPayments() {

  try {

    const data =
      fs.readFileSync(
        paymentsFile,
        "utf8"
      );

    if (!data.trim()) {
      return [];
    }

    return JSON.parse(data);

  } catch (error) {

    console.error(
      "Payment read error:",
      error
    );

    return [];
  }
}

function savePayments(payments) {

  fs.writeFileSync(
    paymentsFile,
    JSON.stringify(
      payments,
      null,
      2
    ),
    "utf8"
  );
}

// ======================================================
// EXPIRY
// ======================================================

function getCreatedTime(payment) {

  const time =
    new Date(
      payment.createdAt
    ).getTime();

  return Number.isNaN(time)
    ? Date.now()
    : time;
}

function getExpiryTime(payment) {

  return (
    getCreatedTime(payment) +
    REVIEW_TIME_MS
  );
}

function getRemainingMs(payment) {

  return Math.max(
    0,
    getExpiryTime(payment) -
    Date.now()
  );
}

function isExpired(payment) {

  return (
    payment.status === "Pending" &&
    getRemainingMs(payment) <= 0
  );
}

function updateExpiredPayments() {

  const payments =
    getPayments();

  let changed = false;

  payments.forEach(
    payment => {

      if (
        payment.status === "Pending" &&
        getRemainingMs(payment) <= 0
      ) {

        payment.status =
          "Expired";

        payment.expiredAt =
          new Date().toISOString();

        changed = true;
      }
    }
  );

  if (changed) {
    savePayments(payments);
  }

  return payments;
}

// ======================================================
// MULTER
// ======================================================

const storage =
  multer.diskStorage({

    destination:
      (req, file, cb) => {

        cb(
          null,
          uploadDir
        );
      },

    filename:
      (req, file, cb) => {

        const ext =
          path.extname(
            file.originalname
          );

        const name =
          "proof-" +
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .substring(2, 8) +
          ext;

        cb(
          null,
          name
        );
      }
  });

const upload =
  multer({

    storage,

    limits: {
      fileSize:
        10 * 1024 * 1024
    }

  });

// ======================================================
// STATIC
// ======================================================

app.use(
  express.static(
    publicDir
  )
);

// ======================================================
// HOME
// ======================================================

app.get(
  "/",
  (req, res) => {

    res.send(`

<!doctype html>

<html lang="en">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>Vexora</title>

<style>

* {
  box-sizing:border-box;
}

body {
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  font-family:Arial,sans-serif;
  background:#050b1d;
  color:#fff;
  padding:20px;
}

.card {
  width:100%;
  max-width:500px;
  text-align:center;
  padding:45px 25px;
  border-radius:25px;
  background:#0d1a36;
  border:1px solid rgba(139,92,255,.35);
  box-shadow:0 20px 60px rgba(0,0,0,.35);
}

.logo {
  font-size:48px;
  font-weight:900;
  margin-bottom:15px;
}

.logo span {
  color:#8b5cff;
}

p {
  color:#a9b8dc;
  font-size:17px;
  line-height:1.6;
}

.btn {
  display:block;
  margin-top:20px;
  padding:16px;
  border-radius:14px;
  color:#fff;
  text-decoration:none;
  font-weight:800;
  background:linear-gradient(
    135deg,
    #8b2cff,
    #087cff
  );
}

.whatsapp {
  background:#168653;
}

</style>

</head>

<body>

<div class="card">

  <div class="logo">
    V<span>exora</span>
  </div>

  <h1>
    Premium Trading Access
  </h1>

  <p>
    Choose your Vexora membership plan
    and get premium access.
  </p>

  <a
    class="btn"
    href="/plans"
  >
    View Plans
  </a>

  <a
    class="btn whatsapp"
    href="https://wa.me/${WHATSAPP_NUMBER}"
    target="_blank"
  >
    WhatsApp Support
  </a>

</div>

</body>

</html>

    `);

  }
);

// ======================================================
// PLANS
// ======================================================

app.get(
  "/plans",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "plans.html"
      )
    );

  }
);

// ======================================================
// PAYMENT
// ======================================================

app.get(
  "/payment",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "payment.html"
      )
    );

  }
);

// ======================================================
// SUBMIT PAYMENT
// ======================================================

app.post(
  "/submit-payment",
  upload.single("proof"),
  (req, res) => {

    const planKey =
      req.body.plan || "";

    const selectedPlan =
      PLANS[planKey];

    if (!selectedPlan) {

      return res
        .status(400)
        .send("Invalid plan.");

    }

    const createdAt =
      new Date().toISOString();

    const payment = {

      id:
        Date.now().toString() +
        "-" +
        Math.random()
          .toString(36)
          .substring(2, 8),

      plan:
        selectedPlan.name,

      planKey,

      amount:
        selectedPlan.amount,

      transactionId:
        req.body.transactionId || "",

      tradingview:
        req.body.tradingview || "",

      telegram:
        req.body.telegram || "",

      proof:
        req.file
          ? "/uploads/" +
            req.file.filename
          : "",

      status:
        "Pending",

      createdAt,

      expiresAt:
        new Date(
          new Date(createdAt).getTime() +
          REVIEW_TIME_MS
        ).toISOString()
    };

    const payments =
      getPayments();

    payments.unshift(
      payment
    );

    savePayments(
      payments
    );

    res.send(`

<!doctype html>

<html>

<head>

<meta charset="utf-8">

<meta
 name="viewport"
 content="width=device-width,initial-scale=1"
>

<title>Payment Submitted</title>

<style>

body {
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
  background:#050b1d;
  color:#fff;
  font-family:Arial,sans-serif;
}

.card {
  width:100%;
  max-width:430px;
  padding:35px 25px;
  text-align:center;
  border-radius:24px;
  background:#0d1a36;
  border:1px solid #57329c;
}

.icon {
  width:70px;
  height:70px;
  margin:auto auto 20px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:40px;
  background:linear-gradient(
    135deg,
    #8b2cff,
    #087cff
  );
}

.amount {
  color:#a879ff;
  font-size:28px;
  font-weight:800;
}

.timer {
  margin-top:20px;
  font-size:30px;
  font-weight:800;
}

.status {
  margin-top:18px;
  padding:14px;
  border-radius:12px;
  display:none;
  font-weight:800;
}

.manual {
  display:none;
  margin-top:18px;
  padding:18px;
  border-radius:15px;
  background:#27181a;
}

.telegram {
  display:block;
  margin-top:14px;
  padding:14px;
  border-radius:12px;
  background:#168dcc;
  color:#fff;
  text-decoration:none;
  font-weight:800;
}

.ok {
  display:block;
  margin-top:20px;
  padding:15px;
  border-radius:14px;
  background:linear-gradient(
    135deg,
    #8b2cff,
    #087cff
  );
  color:#fff;
  text-decoration:none;
  font-weight:800;
}

</style>

</head>

<body>

<div class="card">

<div class="icon">✓</div>

<h1>
Payment Request Submitted
</h1>

<h2>
${escapeHTML(selectedPlan.name)}
</h2>

<div class="amount">
₹${selectedPlan.amount.toLocaleString("en-IN")}
</div>

<p>
Your payment is being verified.
</p>

<div class="timer" id="timer">
15:00
</div>

<div
 id="status"
 class="status"
></div>

<div
 id="manual"
 class="manual"
>

<h3>
Manual Review Required
</h3>

<p>
Please contact us on Telegram
for assistance.
</p>

<a
 class="telegram"
 href="${MANUAL_REVIEW_TELEGRAM}"
 target="_blank"
>
Contact on Telegram
</a>

</div>

<a
 class="ok"
 href="/"
>
OK
</a>

</div>

<script>

const paymentId =
${JSON.stringify(payment.id)};

const expiresAt =
${JSON.stringify(payment.expiresAt)};

const timer =
document.getElementById("timer");

const statusBox =
document.getElementById("status");

const manual =
document.getElementById("manual");

let finished = false;

function showStatus(status) {

  if (
    status === "Approved"
  ) {

    finished = true;

    timer.style.display =
      "none";

    statusBox.textContent =
      "✓ Payment Approved";

    statusBox.style.display =
      "block";

    statusBox.style.background =
      "#103923";

    statusBox.style.color =
      "#65e99a";

    manual.style.display =
      "none";

    return;
  }

  if (
    status === "Rejected"
  ) {

    finished = true;

    timer.style.display =
      "none";

    statusBox.textContent =
      "✕ Payment Rejected";

    statusBox.style.display =
      "block";

    statusBox.style.background =
      "#42191d";

    statusBox.style.color =
      "#ff7d87";

    manual.style.display =
      "block";

    return;
  }

  if (
    status === "Expired"
  ) {

    finished = true;

    timer.textContent =
      "00:00";

    manual.style.display =
      "block";
  }
}

async function checkStatus() {

  if (finished) {
    return;
  }

  try {

    const response =
      await fetch(
        "/payment-status/" +
        encodeURIComponent(paymentId),
        {
          cache:"no-store"
        }
      );

    if (!response.ok) {
      return;
    }

    const data =
      await response.json();

    showStatus(
      data.status
    );

  } catch (error) {

    console.error(error);

  }
}

function updateTimer() {

  if (finished) {
    return;
  }

  const remaining =
    new Date(
      expiresAt
    ).getTime() -
    Date.now();

  if (
    remaining <= 0
  ) {

    timer.textContent =
      "00:00";

    manual.style.display =
      "block";

    checkStatus();

    return;
  }

  const seconds =
    Math.ceil(
      remaining / 1000
    );

  const minutes =
    Math.floor(
      seconds / 60
    );

  const secs =
    seconds % 60;

  timer.textContent =
    String(minutes).padStart(2,"0") +
    ":" +
    String(secs).padStart(2,"0");
}

updateTimer();

setInterval(
  updateTimer,
  1000
);

setInterval(
  checkStatus,
  3000
);

</script>

</body>

</html>

    `);

  }
);

// ======================================================
// PAYMENT STATUS
// ======================================================

app.get(
  "/payment-status/:id",
  (req, res) => {

    const payments =
      updateExpiredPayments();

    const payment =
      payments.find(
        p =>
          p.id ===
          req.params.id
      );

    if (!payment) {

      return res
        .status(404)
        .json({
          status:"Not Found"
        });

    }

    res.json({

      status:
        payment.status,

      remainingMs:
        getRemainingMs(
          payment
        ),

      expiresAt:
        payment.expiresAt

    });

  }
);

// ======================================================
// ADMIN
// ======================================================

app.get(
  "/admin",
  (req, res) => {

    const payments =
      updateExpiredPayments();

    const rows =
      payments.map(
        payment => {

          const status =
            escapeHTML(
              payment.status
            );

          let action = "";

          if (
            payment.status ===
            "Pending"
          ) {

            action = `

<div class="actions">

<form
 method="POST"
 action="/admin/payment/${payment.id}/approve"
>

<button class="approve">
✓ Approve
</button>

</form>

<form
 method="POST"
 action="/admin/payment/${payment.id}/reject"
>

<button class="reject">
✕ Reject
</button>

</form>

</div>

`;

          } else if (
            payment.status ===
            "Expired"
          ) {

            action = `

<a
 class="telegram"
 href="${MANUAL_REVIEW_TELEGRAM}"
 target="_blank"
>
Telegram Manual Review
</a>

`;

          } else {

            action =
              `<span>Action completed</span>`;

          }

          const proof =
            payment.proof
              ? `
<a
 href="${payment.proof}"
 target="_blank"
>
View Proof
</a>
`
              : "No Proof";

          return `

<tr>

<td>
${escapeHTML(payment.plan)}
</td>

<td>
₹${Number(payment.amount).toLocaleString("en-IN")}
</td>

<td>
${escapeHTML(payment.transactionId)}
</td>

<td>
${escapeHTML(payment.tradingview)}
</td>

<td>
${escapeHTML(payment.telegram)}
</td>

<td>
${proof}
</td>

<td>
<span class="status">
${status}
</span>
</td>

<td>
${new Date(
  payment.createdAt
).toLocaleString()}
</td>

<td>
${action}
</td>

</tr>

`;

        }
      ).join("");

    res.send(`

<!doctype html>

<html>

<head>

<meta
 charset="utf-8"
>

<meta
 name="viewport"
 content="width=device-width,initial-scale=1"
>

<title>Vexora Admin</title>

<style>

body {
  margin:0;
  background:#050b1d;
  color:#fff;
  font-family:Arial,sans-serif;
  padding:25px;
}

h1 {
  margin-bottom:25px;
}

.table {
  overflow-x:auto;
  background:#0d1a35;
  border-radius:18px;
}

table {
  width:100%;
  min-width:1200px;
  border-collapse:collapse;
}

th,td {
  padding:15px;
  border-bottom:1px solid #263653;
  text-align:left;
}

button,
.telegram,
td a {
  border:0;
  padding:9px 12px;
  border-radius:9px;
  color:#fff;
  text-decoration:none;
  font-weight:700;
}

.approve {
  background:#16834b;
}

.reject {
  background:#a93440;
}

.telegram {
  background:#168dcc;
}

.actions {
  display:flex;
  gap:8px;
}

.status {
  font-weight:800;
}

</style>

</head>

<body>

<h1>
Vexora Payment Admin
</h1>

<div class="table">

<table>

<thead>

<tr>
<th>Plan</th>
<th>Amount</th>
<th>UTR</th>
<th>TradingView</th>
<th>Telegram</th>
<th>Proof</th>
<th>Status</th>
<th>Date</th>
<th>Action</th>
</tr>

</thead>

<tbody>

${
  rows ||
  `
<tr>
<td colspan="9">
No payments yet.
</td>
</tr>
`
}

</tbody>

</table>

</div>

</body>

</html>

`);

  }
);

// ======================================================
// APPROVE
// ======================================================

app.post(
  "/admin/payment/:id/approve",
  (req, res) => {

    const payments =
      updateExpiredPayments();

    const payment =
      payments.find(
        p =>
          p.id ===
          req.params.id
      );

    if (
      payment &&
      payment.status ===
      "Pending" &&
      !isExpired(payment)
    ) {

      payment.status =
        "Approved";

      payment.approvedAt =
        new Date().toISOString();

      savePayments(
        payments
      );

    }

    res.redirect(
      "/admin"
    );

  }
);

// ======================================================
// REJECT
// ======================================================

app.post(
  "/admin/payment/:id/reject",
  (req, res) => {

    const payments =
      updateExpiredPayments();

    const payment =
      payments.find(
        p =>
          p.id ===
          req.params.id
      );

    if (
      payment &&
      payment.status ===
      "Pending" &&
      !isExpired(payment)
    ) {

      payment.status =
        "Rejected";

      payment.rejectedAt =
        new Date().toISOString();

      savePayments(
        payments
      );

    }

    res.redirect(
      "/admin"
    );

  }
);

// ======================================================
// ESCAPE
// ======================================================

function escapeHTML(value) {

  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}

// ======================================================
// START
// ======================================================

app.listen(
  PORT,
  () => {

    console.log(
      `Vexora running on port ${PORT}`
    );

  }
);
