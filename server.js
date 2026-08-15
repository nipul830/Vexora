const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;


// ======================================================
// SETTINGS
// ======================================================

// 15 minutes
const REVIEW_TIME_MS = 15 * 60 * 1000;

// IMPORTANT:
// Yahan apna Telegram username/link baad me daal dena.
// Example:
// const MANUAL_REVIEW_TELEGRAM = "https://t.me/yourusername";

const MANUAL_REVIEW_TELEGRAM =
  "https://t.me/Jkhub_premium";


// ======================================================
// PARSE FORM DATA
// ======================================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());


// ======================================================
// DIRECTORIES
// ======================================================

const publicDir =
  path.join(__dirname, "public");

const uploadDir =
  path.join(publicDir, "uploads");

const dataDir =
  path.join(__dirname, "data");

const paymentsFile =
  path.join(dataDir, "payments.json");


if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}


if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, {
    recursive: true
  });
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
      "Could not read payments:",
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
// EXPIRY HELPERS
// ======================================================

function getCreatedTime(payment) {

  const time =
    new Date(
      payment.createdAt
    ).getTime();

  if (Number.isNaN(time)) {
    return Date.now();
  }

  return time;
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

  if (
    payment.status !==
    "Pending"
  ) {
    return false;
  }

  return (
    getRemainingMs(payment) <= 0
  );
}


/*
  Automatically convert old Pending
  submissions into Expired when
  they cross the 15-minute limit.
*/
function updateExpiredPayments() {

  const payments =
    getPayments();

  let changed = false;


  payments.forEach(
    (payment) => {

      if (
        payment.status ===
        "Pending"
      ) {

        if (
          getRemainingMs(payment) <=
          0
        ) {

          payment.status =
            "Expired";

          payment.expiredAt =
            new Date().toISOString();

          changed = true;

        }

      }

    }
  );


  if (changed) {
    savePayments(payments);
  }


  return payments;
}


// ======================================================
// FILE UPLOAD
// ======================================================

const storage =
  multer.diskStorage({

    destination:
      function(req, file, cb) {

        cb(
          null,
          uploadDir
        );

      },


    filename:
      function(req, file, cb) {

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

    storage: storage,

    limits: {
      fileSize:
        10 * 1024 * 1024
    }

  });


// ======================================================
// STATIC FILES
// ======================================================

app.use(
  express.static(
    publicDir
  )
);


// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

});


// ======================================================
// PLANS
// ======================================================

app.get("/plans", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "plans.html"
    )
  );

});


// ======================================================
// PAYMENT
// ======================================================

app.get("/payment", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "payment.html"
    )
  );

});


// ======================================================
// SUBMIT
// ======================================================

app.get("/submit", (req, res) => {

  res.sendFile(
    path.join(
      __dirname,
      "submit.html"
    )
  );

});


// ======================================================
// SUBMIT PAYMENT
// ======================================================

app.post(
  "/submit-payment",
  upload.single("proof"),
  (req, res) => {

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
        req.body.plan || "",


      amount:
        req.body.amount || "",


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


      createdAt:
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


    console.log(
      "Payment submission received"
    );


    console.log(
      "Plan:",
      payment.plan
    );


    console.log(
      "Amount:",
      payment.amount
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


    // ==================================================
    // SUCCESS PAGE
    // ==================================================

    res.send(`

<!doctype html>

<html lang="en">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>Payment Request Submitted</title>


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

  font-size: 27px;

}


.plan {

  margin-top: 15px;

  padding: 16px;

  border-radius: 14px;

  background: #071126;

  border:
    1px solid
    rgba(139,92,255,.30);

}


.plan-label {

  color: #9eacd0;

  font-size: 13px;

}


.plan-name {

  margin-top: 5px;

  font-size: 21px;

  font-weight: 800;

}


.amount {

  margin-top: 5px;

  color: #a879ff;

  font-size: 27px;

  font-weight: 800;

}


.message {

  margin: 20px 0 15px;

  color: #a9b8dc;

  font-size: 16px;

  line-height: 1.6;

}


.timer-label {

  color: #9eacd0;

  font-size: 13px;

  margin-top: 18px;

}


.timer {

  margin-top: 6px;

  font-size: 32px;

  font-weight: 800;

  color: #ffffff;

  letter-spacing: 1px;

}


.timer.expired {

  color: #ff7d87;

}


.manual-review {

  display: none;

  margin-top: 18px;

  padding: 16px;

  border-radius: 15px;

  background: #27181a;

  border:
    1px solid
    rgba(255,100,110,.30);

}


.manual-review h2 {

  margin: 0 0 8px;

  font-size: 18px;

  color: #ff9aa3;

}


.manual-review p {

  margin: 0 0 14px;

  color: #c5cad8;

  font-size: 14px;

  line-height: 1.5;

}


.telegram-btn {

  display: block;

  width: 100%;

  padding: 14px;

  border-radius: 12px;

  text-decoration: none;

  color: white;

  font-weight: 800;

  background: #168dcc;

}


.ok-btn {

  width: 100%;

  border: 0;

  border-radius: 14px;

  padding: 16px 20px;

  margin-top: 22px;

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


.status-message {

  display: none;

  margin-top: 18px;

  padding: 14px;

  border-radius: 13px;

  font-weight: 700;

}


.status-approved {

  background: #103923;

  color: #65e99a;

}


.status-rejected {

  background: #42191d;

  color: #ff7d87;

}


</style>

</head>


<body>


<div class="success-card">


  <div class="success-icon">
    ✓
  </div>


  <h1>
    Payment Request Submitted
  </h1>


  <div class="plan">

    <div class="plan-label">
      Selected Plan
    </div>


    <div class="plan-name">
      ${escapeHTML(
        payment.plan
      )}
    </div>


    <div class="amount">
      ₹${Number(
        payment.amount || 0
      ).toLocaleString("en-IN")}
    </div>

  </div>


  <p class="message">

    Your payment request has
    been submitted successfully.
    Please wait while we verify
    your payment.

  </p>


  <div class="timer-label">
    Verification time remaining
  </div>


  <div
    id="timer"
    class="timer"
  >
    15:00
  </div>


  <div
    id="statusMessage"
    class="status-message"
  >
  </div>


  <div
    id="manualReview"
    class="manual-review"
  >

    <h2>
      Manual Review Required
    </h2>

    <p>
      Verification time has expired.
      Please contact us on Telegram
      for manual assistance.
    </p>

    <a
      class="telegram-btn"
      href="${MANUAL_REVIEW_TELEGRAM}"
      target="_blank"
      rel="noopener"
    >
      Contact on Telegram
    </a>

  </div>


  <button
    id="okBtn"
    class="ok-btn"
    onclick="window.location.href='/'"
  >
    OK
  </button>


</div>


<script>

const paymentId =
  ${JSON.stringify(payment.id)};

const expiresAt =
  ${JSON.stringify(payment.expiresAt)};


const timer =
  document.getElementById("timer");

const manualReview =
  document.getElementById("manualReview");

const statusMessage =
  document.getElementById("statusMessage");


let finished =
  false;


function formatTime(ms) {

  const totalSeconds =
    Math.max(
      0,
      Math.ceil(ms / 1000)
    );


  const minutes =
    Math.floor(
      totalSeconds / 60
    );


  const seconds =
    totalSeconds % 60;


  return (
    String(minutes).padStart(2,"0") +
    ":" +
    String(seconds).padStart(2,"0")
  );

}


function showExpired() {

  timer.textContent =
    "00:00";

  timer.classList.add(
    "expired"
  );

  manualReview.style.display =
    "block";

}


function showStatus(status) {

  if (
    status ===
    "Approved"
  ) {

    finished = true;

    statusMessage.textContent =
      "✓ Payment Approved";

    statusMessage.className =
      "status-message status-approved";

    statusMessage.style.display =
      "block";

    manualReview.style.display =
      "none";

    timer.style.display =
      "none";

    return;

  }


  if (
    status ===
    "Rejected"
  ) {

    finished = true;

    statusMessage.textContent =
      "✕ Payment Rejected";

    statusMessage.className =
      "status-message status-rejected";

    statusMessage.style.display =
      "block";

    manualReview.style.display =
      "none";

    timer.style.display =
      "none";

    return;

  }


  if (
    status ===
    "Expired"
  ) {

    finished = true;

    showExpired();

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
        encodeURIComponent(
          paymentId
        ),
        {
          cache: "no-store"
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

    console.error(
      "Status check failed:",
      error
    );

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


  if (remaining <= 0) {

    showExpired();

    checkStatus();

    return;

  }


  timer.textContent =
    formatTime(
      remaining
    );

}


updateTimer();


const timerInterval =
  setInterval(
    updateTimer,
    1000
  );


const statusInterval =
  setInterval(
    checkStatus,
    3000
  );


window.addEventListener(
  "beforeunload",
  function() {

    clearInterval(
      timerInterval
    );

    clearInterval(
      statusInterval
    );

  }
);

</script>


</body>

</html>

    `);

  }
);


// ======================================================
// PAYMENT STATUS API
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
          status: "Not Found"
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
// ADMIN DASHBOARD
// ======================================================

app.get(
  "/admin",
  (req, res) => {

    const payments =
      updateExpiredPayments();


    const rows =
      payments.map(
        (payment) => {


          const date =
            new Date(
              payment.createdAt
            ).toLocaleString();


          let statusClass =
            "pending";


          if (
            payment.status ===
            "Approved"
          ) {

            statusClass =
              "approved";

          }


          if (
            payment.status ===
            "Rejected"
          ) {

            statusClass =
              "rejected";

          }


          if (
            payment.status ===
            "Expired"
          ) {

            statusClass =
              "expired";

          }


          let actionHTML =
            "";


          if (
            payment.status ===
            "Pending"
          ) {

            const remaining =
              getRemainingMs(
                payment
              );


            actionHTML = `

              <div class="admin-timer">

                <span
                  class="countdown"
                  data-expiry="${escapeHTML(
                    payment.expiresAt
                  )}"
                >
                  ${formatAdminTime(
                    remaining
                  )}
                </span>

              </div>


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

            `;

          }

          else if (
            payment.status ===
            "Expired"
          ) {

            actionHTML = `

              <div class="manual-admin">

                <strong>
                  Manual Review
                </strong>

                <a
                  href="${MANUAL_REVIEW_TELEGRAM}"
                  target="_blank"
                  rel="noopener"
                >
                  Telegram
                </a>

              </div>

            `;

          }

          else {

            actionHTML = `

              <span class="action-done">

                ${
                  payment.status ===
                  "Approved"

                  ? "✓ Approved"

                  : "✕ Rejected"
                }

              </span>

            `;

          }


          const proofHTML =
            payment.proof

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

    <strong>
      ${escapeHTML(
        payment.plan
      )}
    </strong>

  </td>


  <td>

    <strong class="amount-text">
      ₹${Number(
        payment.amount || 0
      ).toLocaleString("en-IN")}
    </strong>

  </td>


  <td>

    <strong>
      ${escapeHTML(
        payment.transactionId
      )}
    </strong>

  </td>


  <td>
    ${escapeHTML(
      payment.tradingview
    )}
  </td>


  <td>
    ${escapeHTML(
      payment.telegram
    )}
  </td>


  <td>
    ${proofHTML}
  </td>


  <td>

    <span
      class="status ${statusClass}"
    >
      ${escapeHTML(
        payment.status
      )}
    </span>

  </td>


  <td>
    ${date}
  </td>


  <td>
    ${actionHTML}
  </td>

</tr>

          `;

        }
      )
      .join("");


    const total =
      payments.length;


    const pending =
      payments.filter(
        p =>
          p.status ===
          "Pending"
      ).length;


    const approved =
      payments.filter(
        p =>
          p.status ===
          "Approved"
      ).length;


    const rejected =
      payments.filter(
        p =>
          p.status ===
          "Rejected"
      ).length;


    const expired =
      payments.filter(
        p =>
          p.status ===
          "Expired"
      ).length;


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

  max-width: 1500px;

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

  min-width: 1350px;

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


.amount-text {

  color: #a879ff;

  white-space: nowrap;

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


.expired {

  background: #422417;

  color: #ffad72;

}


.admin-timer {

  margin-bottom: 9px;

}


.countdown {

  display: inline-block;

  padding: 6px 10px;

  border-radius: 8px;

  background: #071126;

  border:
    1px solid
    rgba(139,92,255,.35);

  color: #a879ff;

  font-size: 13px;

  font-weight: 800;

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


.action-done {

  color: #8998b8;

  font-size: 13px;

  white-space: nowrap;

}


.manual-admin {

  display: flex;

  align-items: center;

  gap: 8px;

  flex-wrap: wrap;

}


.manual-admin strong {

  color: #ffad72;

  font-size: 13px;

}


.manual-admin a {

  display: inline-block;

  padding: 8px 10px;

  border-radius: 8px;

  background: #168dcc;

  color: #fff;

  text-decoration: none;

  font-size: 12px;

  font-weight: 700;

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

  white-space: nowrap;

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
      ${total}
    </span>

    <span class="stat-label">
      Total
    </span>

  </div>


  <div class="stat">

    <span class="stat-number">
      ${pending}
    </span>

    <span class="stat-label">
      Pending
    </span>

  </div>


  <div class="stat">

    <span class="stat-number">
      ${approved}
    </span>

    <span class="stat-label">
      Approved
    </span>

  </div>


  <div class="stat">

    <span class="stat-number">
      ${rejected}
    </span>

    <span class="stat-label">
      Rejected
    </span>

  </div>


  <div class="stat">

    <span class="stat-number">
      ${expired}
    </span>

    <span class="stat-label">
      Expired
    </span>

  </div>


</div>


<div class="table-wrap">

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

    <td
      colspan="9"
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


<script>

/*
  Live admin countdown.
  When timer reaches 00:00,
  reload the dashboard so the
  submission becomes Expired.
*/

function updateAdminTimers() {

  const elements =
    document.querySelectorAll(
      ".countdown"
    );


  let shouldReload =
    false;


  elements.forEach(
    function(element) {

      const expiry =
        new Date(
          element.dataset.expiry
        ).getTime();


      const remaining =
        Math.max(
          0,
          expiry -
          Date.now()
        );


      const totalSeconds =
        Math.ceil(
          remaining / 1000
        );


      const minutes =
        Math.floor(
          totalSeconds / 60
        );


      const seconds =
        totalSeconds % 60;


      element.textContent =
        String(minutes)
          .padStart(2,"0") +
        ":" +
        String(seconds)
          .padStart(2,"0");


      if (
        remaining <= 0
      ) {

        shouldReload =
          true;

      }

    }
  );


  if (shouldReload) {

    window.location.reload();

  }

}


updateAdminTimers();


setInterval(
  updateAdminTimers,
  1000
);

</script>


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

    const payments =
      updateExpiredPayments();


    const payment =
      payments.find(
        p =>
          p.id ===
          req.params.id
      );


    if (payment) {

      // Do not allow approval
      // after the 15-minute window.

      if (
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

    }


    res.redirect(
      "/admin"
    );

  }
);


// ======================================================
// ADMIN REJECT
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


    if (payment) {

      // Do not allow rejection
      // after the 15-minute window.

      if (
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

    }


    res.redirect(
      "/admin"
    );

  }
);


// ======================================================
// ADMIN TIMER FORMAT
// ======================================================

function formatAdminTime(
  remainingMs
) {

  const totalSeconds =
    Math.max(
      0,
      Math.ceil(
        remainingMs / 1000
      )
    );


  const minutes =
    Math.floor(
      totalSeconds / 60
    );


  const seconds =
    totalSeconds % 60;


  return (
    String(minutes)
      .padStart(2,"0") +
    ":" +
    String(seconds)
      .padStart(2,"0")
  );

}


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHTML(value) {

  if (
    value === undefined ||
    value === null
  ) {

    return "";

  }


  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


// ======================================================
// START SERVER
// ======================================================

app.listen(
  PORT,
  () => {

    console.log(
      `Vexora running on port ${PORT}`
    );

  }
);
