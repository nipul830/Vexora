const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// ===============================
// BASIC SETUP
// ===============================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// ===============================
// FOLDERS
// ===============================

const publicDir = path.join(__dirname, "public");
const uploadDir = path.join(publicDir, "uploads");
const dataDir = path.join(__dirname, "data");

const paymentsFile = path.join(dataDir, "payments.json");


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (!fs.existsSync(paymentsFile)) {
  fs.writeFileSync(paymentsFile, "[]", "utf8");
}


// ===============================
// PAYMENT DATA HELPERS
// ===============================

function getPayments() {
  try {
    const data = fs.readFileSync(paymentsFile, "utf8");

    if (!data.trim()) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("Could not read payments:", error);
    return [];
  }
}


function savePayments(payments) {
  fs.writeFileSync(
    paymentsFile,
    JSON.stringify(payments, null, 2),
    "utf8"
  );
}


// ===============================
// FILE UPLOAD
// ===============================

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
      Math.random()
        .toString(36)
        .substring(2, 8) +
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


// ===============================
// STATIC FILES
// ===============================

app.use(express.static(publicDir));


// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});


// ===============================
// PLANS
// ===============================

app.get("/plans", (req, res) => {
  res.sendFile(
    path.join(__dirname, "plans.html")
  );
});


// ===============================
// PAYMENT
// ===============================

app.get("/payment", (req, res) => {
  res.sendFile(
    path.join(__dirname, "payment.html")
  );
});


// ===============================
// SUBMIT PAGE
// ===============================

app.get("/submit", (req, res) => {
  res.sendFile(
    path.join(__dirname, "submit.html")
  );
});


// ===============================
// SUBMIT PAYMENT
// ===============================

app.post(
  "/submit-payment",
  upload.single("proof"),
  (req, res) => {

    const payment = {

      id:
        Date.now().toString() +
        "-" +
        Math.random()
          .toString(36)
          .substring(2, 8),

      transactionId:
        req.body.transactionId || "",

      tradingview:
        req.body.tradingview || "",

      telegram:
        req.body.telegram || "",

      proof:
        req.file
          ? "/uploads/" + req.file.filename
          : "",

      status: "Pending",

      createdAt:
        new Date().toISOString()
    };


    // Save payment
    const payments = getPayments();

    payments.unshift(payment);

    savePayments(payments);


    // Console
    console.log(
      "Payment submission received"
    );

    console.log(
      "ID:",
      payment.id
    );

    console.log(
      "UTR:",
      payment.transactionId
    );

    console.log(
      "TradingView:",
      payment.tradingview
    );

    console.log(
      "Telegram:",
      payment.telegram
    );

    console.log(
      "Proof:",
      payment.proof
    );


    // ===========================
    // SUCCESS PAGE
    // ===========================

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

  border:
    1px solid
    rgba(139,92,255,.35);

  box-shadow:
    0 20px 60px
    rgba(0,0,0,.35);

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

  background:
    linear-gradient(
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

  background:
    linear-gradient(
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


  <div class="success-icon">
    ✓
  </div>


  <h1>
    Payment Details Submitted
  </h1>


  <p>
    Your payment details have been
    submitted successfully.
    We will verify your payment
    and activate your plan.
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
  }
);


// ======================================================
// ADMIN DASHBOARD
// ======================================================

app.get("/admin", (req, res) => {

  const payments = getPayments();


  const rows = payments.map((payment) => {

    const date = new Date(
      payment.createdAt
    ).toLocaleString();


    let statusClass = "pending";

    if (payment.status === "Approved") {
      statusClass = "approved";
    }

    if (payment.status === "Rejected") {
      statusClass = "rejected";
    }


    const proofHTML = payment.proof
      ? `
        <a
          class="proof-btn"
          href="${payment.proof}"
          target="_blank"
          rel="noopener"
        >
          View Proof
        </a>
      `
      : `
        <span class="no-proof">
          No Proof
        </span>
      `;


    return `

<tr>

  <td>
    <strong>${escapeHTML(payment.transactionId)}</strong>
  </td>


  <td>
    ${escapeHTML(payment.tradingview)}
  </td>


  <td>
    ${escapeHTML(payment.telegram)}
  </td>


  <td>
    ${proofHTML}
  </td>


  <td>
    <span class="status ${statusClass}">
      ${escapeHTML(payment.status)}
    </span>
  </td>


  <td>
    ${date}
  </td>


  <td>

    <div class="actions">

      <form
        method="POST"
        action="/admin/payment/${payment.id}/approve"
      >

        <button
          class="approve"
          type="submit"
        >
          ✓ Approve
        </button>

      </form>


      <form
        method="POST"
        action="/admin/payment/${payment.id}/reject"
      >

        <button
          class="reject"
          type="submit"
        >
          ✕ Reject
        </button>

      </form>

    </div>

  </td>

</tr>

    `;

  }).join("");


  res.send(`

<!doctype html>

<html lang="en">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>Vexora Admin</title>


<style>

* {
  box-sizing: border-box;
}


body {

  margin: 0;

  min-height: 100vh;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  background: #050b1d;

  color: #f4f7ff;

}


.topbar {

  padding: 22px 28px;

  background: #071025;

  border-bottom:
    1px solid
    rgba(139,92,255,.25);

}


.logo {

  font-size: 36px;

  font-weight: 800;

}


.logo span {

  background:
    linear-gradient(
      90deg,
      #a12cff,
      #087cff
    );

  -webkit-background-clip: text;

  background-clip: text;

  color: transparent;

}


.container {

  width: 100%;

  max-width: 1400px;

  margin: auto;

  padding: 30px 20px 60px;

}


.header {

  margin-bottom: 25px;

}


.header h1 {

  margin: 0 0 8px;

  font-size: 34px;

}


.header p {

  margin: 0;

  color: #9eacd0;

}


.stats {

  display: flex;

  gap: 14px;

  flex-wrap: wrap;

  margin-bottom: 25px;

}


.stat {

  min-width: 150px;

  padding: 20px;

  border-radius: 18px;

  background: #0d1a35;

  border:
    1px solid
    rgba(125,153,220,.25);

}


.stat-number {

  display: block;

  font-size: 28px;

  font-weight: 800;

}


.stat-label {

  color: #9eacd0;

  font-size: 14px;

}


.table-wrap {

  overflow-x: auto;

  background: #0d1a35;

  border:
    1px solid
    rgba(125,153,220,.25);

  border-radius: 20px;

}


table {

  width: 100%;

  border-collapse: collapse;

  min-width: 1000px;

}


th {

  text-align: left;

  padding: 16px;

  color: #aebce0;

  font-size: 13px;

  text-transform: uppercase;

  border-bottom:
    1px solid #25385c;

}


td {

  padding: 16px;

  border-bottom:
    1px solid #1b2b49;

  color: #dce5fb;

  vertical-align: middle;

}


tr:last-child td {

  border-bottom: 0;

}


.status {

  display: inline-block;

  padding: 7px 11px;

  border-radius: 999px;

  font-size: 13px;

  font-weight: 700;

}


.pending {

  background: #3a2d08;

  color: #ffd75c;

}


.approved {

  background: #103923;

  color: #65e99a;

}


.rejected {

  background: #42191d;

  color: #ff7d87;

}


.actions {

  display: flex;

  gap: 8px;

}


.actions form {

  margin: 0;

}


.actions button {

  border: 0;

  border-radius: 9px;

  padding: 9px 12px;

  color: white;

  font-weight: 700;

  cursor: pointer;

}


.approve {

  background: #16834b;

}


.reject {

  background: #a93440;

}


.proof-btn {

  display: inline-block;

  padding: 9px 12px;

  border-radius: 9px;

  background:
    linear-gradient(
      90deg,
      #8b2cff,
      #087cff
    );

  color: white;

  text-decoration: none;

  font-weight: 700;

  font-size: 13px;

}


.no-proof {

  color: #7787a9;

}


.empty {

  text-align: center;

  padding: 50px;

  color: #9eacd0;

}


@media(max-width:600px) {

  .topbar {

    padding: 18px 20px;

  }


  .logo {

    font-size: 30px;

  }


  .container {

    padding: 25px 14px;

  }


  .header h1 {

    font-size: 28px;

  }

}

</style>

</head>


<body>


<header class="topbar">

  <div class="logo">
    V<span>exora</span> Admin
  </div>

</header>


<main class="container">


<section class="header">

  <h1>
    Payment Dashboard
  </h1>

  <p>
    Review and manage payment submissions.
  </p>

</section>


<div class="stats">

  <div class="stat">

    <span class="stat-number">
      ${payments.length}
    </span>

    <span class="stat-label">
      Total
    </span>

  </div>


  <div class="stat">

    <span class="stat-number">
      ${payments.filter(
        p => p.status === "Pending"
      ).length}
    </span>

    <span class="stat-label">
      Pending
    </span>

  </div>


  <div class="stat">

    <span class="stat-number">
      ${payments.filter(
        p => p.status === "Approved"
      ).length}
    </span>

    <span class="stat-label">
      Approved
    </span>

  </div>


  <div class="stat">

    <span class="stat-number">
      ${payments.filter(
        p => p.status === "Rejected"
      ).length}
    </span>

    <span class="stat-label">
      Rejected
    </span>

  </div>

</div>


<div class="table-wrap">

<table>

<thead>

<tr>

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
    <td
      colspan="7"
      class="empty"
    >
      No payment submissions yet.
    </td>
  </tr>
  `
}

</tbody>

</table>

</div>


</main>

</body>

</html>

  `);

});


// ======================================================
// ADMIN APPROVE
// ======================================================

app.post(
  "/admin/payment/:id/approve",
  (req, res) => {

    const payments = getPayments();

    const payment =
      payments.find(
        p => p.id === req.params.id
      );


    if (payment) {

      payment.status = "Approved";

      savePayments(payments);

    }


    res.redirect("/admin");
  }
);


// ======================================================
// ADMIN REJECT
// ======================================================

app.post(
  "/admin/payment/:id/reject",
  (req, res) => {

    const payments = getPayments();

    const payment =
      payments.find(
        p => p.id === req.params.id
      );


    if (payment) {

      payment.status = "Rejected";

      savePayments(payments);

    }


    res.redirect("/admin");
  }
);


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHTML(value) {

  if (value === undefined || value === null) {
    return "";
  }

  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");
}


// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {

  console.log(
    `Vexora running on port ${PORT}`
  );

});
