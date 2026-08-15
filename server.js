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

const DEFAULT_SETTINGS = {
  telegram: "https://t.me/Jkhub_premium",
  contactNumber: "6371406885",
  upiId: "",
  qrImage: "",
  freeTrialEnabled: true,

  plans: [
    {
      id: "7days",
      name: "7 Days",
      amount: 999,
      description: "Premium Vexora access for 7 days."
    },
    {
      id: "15days",
      name: "15 Days",
      amount: 1499,
      description: "Premium Vexora access for 15 days."
    },
    {
      id: "30days",
      name: "30 Days",
      amount: 2499,
      description: "Premium Vexora access for 30 days."
    },
    {
      id: "lifetime",
      name: "Lifetime",
      amount: 11000,
      description: "Lifetime Vexora premium access."
    }
  ]
};

// ======================================================
// PARSE FORM DATA
// ======================================================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ======================================================
// DIRECTORIES
// ======================================================

const publicDir = path.join(__dirname, "public");
const uploadDir = path.join(publicDir, "uploads");
const dataDir = path.join(__dirname, "data");

const paymentsFile =
  path.join(dataDir, "payments.json");

const settingsFile =
  path.join(dataDir, "settings.json");

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

// ======================================================
// SETTINGS HELPERS
// ======================================================

function cloneDefaultSettings() {
  return JSON.parse(
    JSON.stringify(DEFAULT_SETTINGS)
  );
}

function normalizeSettings(settings) {

  const defaults =
    cloneDefaultSettings();

  const result = {
    ...defaults,
    ...(settings || {})
  };

  if (
    !Array.isArray(
      result.plans
    )
  ) {
    result.plans =
      defaults.plans;
  }

  result.plans =
    result.plans
      .filter(
        plan =>
          plan &&
          typeof plan === "object"
      )
      .map(
        plan => ({
          id:
            String(
              plan.id || ""
            ),
          name:
            String(
              plan.name || ""
            ),
          amount:
            Number(
              plan.amount || 0
            ),
          description:
            String(
              plan.description || ""
            )
        })
      )
      .filter(
        plan =>
          plan.id &&
          plan.name
      );

  result.freeTrialEnabled =
    Boolean(
      result.freeTrialEnabled
    );

  result.telegram =
    String(
      result.telegram || ""
    );

  result.contactNumber =
    String(
      result.contactNumber || ""
    );

  result.upiId =
    String(
      result.upiId || ""
    );

  result.qrImage =
    String(
      result.qrImage || ""
    );

  return result;
}

function getSettings() {

  try {

    if (
      !fs.existsSync(
        settingsFile
      )
    ) {

      const defaults =
        cloneDefaultSettings();

      fs.writeFileSync(
        settingsFile,
        JSON.stringify(
          defaults,
          null,
          2
        ),
        "utf8"
      );

      return defaults;
    }

    const data =
      fs.readFileSync(
        settingsFile,
        "utf8"
      );

    if (!data.trim()) {

      return cloneDefaultSettings();

    }

    return normalizeSettings(
      JSON.parse(data)
    );

  } catch (error) {

    console.error(
      "Could not read settings:",
      error
    );

    return cloneDefaultSettings();
  }
}

function saveSettings(settings) {

  const cleanSettings =
    normalizeSettings(
      settings
    );

  fs.writeFileSync(
    settingsFile,
    JSON.stringify(
      cleanSettings,
      null,
      2
    ),
    "utf8"
  );

  return cleanSettings;
}

// Create settings file if missing
saveSettings(
  getSettings()
);

// ======================================================
// PAYMENT FILE
// ======================================================

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

function updateExpiredPayments() {

  const payments =
    getPayments();

  let changed = false;

  payments.forEach(
    payment => {

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
          "file-" +
          Date.now() +
          "-" +
          Math.random()
            .toString(36)
            .substring(2, 9) +
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

app.get(
  "/",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );

  }
);

// ======================================================
// DYNAMIC PLANS PAGE
// ======================================================

app.get(
  "/plans",
  (req, res) => {

    const settings =
      getSettings();

    const planCards =
      settings.plans
        .map(
          plan => `

<div class="plan">

  <h2>
    ${escapeHTML(
      plan.name
    )}
  </h2>

  <div class="price">
    ₹${Number(
      plan.amount
    ).toLocaleString("en-IN")}
  </div>

  <p>
    ${escapeHTML(
      plan.description
    )}
  </p>

  <a
    class="btn"
    href="/payment?plan=${encodeURIComponent(
      plan.id
    )}"
  >
    Select Plan
  </a>

</div>

          `
        )
        .join("");

    const freeTrial =
      settings.freeTrialEnabled
        ? `

<div class="plan free">

  <h2>
    1 Day Free
  </h2>

  <div class="price">
    FREE
  </div>

  <p>
    Try Vexora for 1 day.
    Contact us to activate your free access.
  </p>

  <a
    class="btn"
    href="https://wa.me/${escapeHTML(
      settings.contactNumber
    )}?text=Hi%20Vexora%2C%20I%20want%20the%201%20Day%20Free%20plan."
    target="_blank"
    rel="noopener"
  >
    Get 1 Day Free
  </a>

</div>

        `
        : "";

    res.send(`

<!doctype html>

<html lang="en">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
>

<title>Vexora — Plans</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  color: #f5f7ff;
  background: #070d1d;
}

a {
  text-decoration: none;
}

.topbar {
  height: 90px;
  display: flex;
  align-items: center;
  padding: 0 28px;
  background: #080d1b;
  border-bottom: 1px solid #202c49;
}

.logo {
  font-size: 36px;
  font-weight: 800;
}

.logo span {
  color: #8b5cff;
}

.container {
  max-width: 950px;
  margin: auto;
  padding: 35px 20px 60px;
}

.hero {
  text-align: center;
  padding: 20px 10px 35px;
}

.hero h1 {
  font-size: 48px;
  margin-bottom: 15px;
}

.hero p {
  color: #9eaccb;
  font-size: 18px;
  line-height: 1.6;
}

.plans {
  display: grid;
  grid-template-columns:
    repeat(2, 1fr);
  gap: 18px;
}

.plan {
  background: #101a31;
  border: 1px solid #29395b;
  border-radius: 22px;
  padding: 28px;
}

.plan.free {
  border-color: #28875d;
}

.plan h2 {
  margin: 0 0 10px;
  font-size: 25px;
}

.price {
  font-size: 38px;
  font-weight: 800;
  margin: 15px 0;
  color: #a879ff;
}

.plan p {
  min-height: 55px;
  color: #9eaccb;
  line-height: 1.6;
}

.btn {
  display: block;
  text-align: center;
  padding: 16px;
  border-radius: 14px;
  background:
    linear-gradient(
      90deg,
      #8b35ff,
      #147cff
    );
  color: white;
  font-weight: 800;
  margin-top: 20px;
}

.free .btn {
  background: #168653;
}

.support {
  text-align: center;
  margin-top: 35px;
}

.support p {
  color: #9eaccb;
}

@media(max-width:650px) {

  .plans {
    grid-template-columns: 1fr;
  }

  .hero h1 {
    font-size: 39px;
  }

}

</style>

</head>

<body>

<header class="topbar">

  <div class="logo">
    V<span>exora</span>
  </div>

</header>

<main class="container">

<section class="hero">

  <h1>
    Choose Your
    <span style="color:#8b5cff">
      Plan
    </span>
  </h1>

  <p>
    Select your preferred Vexora membership plan.
  </p>

</section>

<section class="plans">

  ${freeTrial}

  ${planCards}

</section>

<section class="support">

  <p>
    Need help with a plan?
  </p>

  <a
    class="btn"
    href="${escapeHTML(
      settings.telegram
    )}"
    target="_blank"
    rel="noopener"
  >
    Telegram Support
  </a>

</section>

</main>

</body>

</html>

    `);
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
// SETTINGS API
// Payment page can use this for QR/contact/UPI.
// ======================================================

app.get(
  "/api/settings",
  (req, res) => {

    const settings =
      getSettings();

    res.json({
      telegram:
        settings.telegram,

      contactNumber:
        settings.contactNumber,

      upiId:
        settings.upiId,

      qrImage:
        settings.qrImage,

      freeTrialEnabled:
        settings.freeTrialEnabled,

      plans:
        settings.plans
    });

  }
);

// ======================================================
// SUBMIT
// ======================================================

app.get(
  "/submit",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "submit.html"
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

    const settings =
      getSettings();

    res.send(`

<!doctype html>

<html lang="en">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>
  Payment Request Submitted
</title>

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
  ></div>

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
      href="${escapeHTML(
        settings.telegram
      )}"
      target="_blank"
      rel="noopener"
    >
      Contact on Telegram
    </a>

  </div>

  <button
    class="ok-btn"
    onclick="window.location.href='/'"
  >
    OK
  </button>

</div>

<script>

const paymentId =
  ${JSON.stringify(
    payment.id
  )};

const expiresAt =
  ${JSON.stringify(
    payment.expiresAt
  )};

const timer =
  document.getElementById(
    "timer"
  );

const manualReview =
  document.getElementById(
    "manualReview"
  );

const statusMessage =
  document.getElementById(
    "statusMessage"
  );

let finished = false;

function formatTime(ms) {

  const totalSeconds =
    Math.max(
      0,
      Math.ceil(
        ms / 1000
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
      .padStart(2, "0") +
    ":" +
    String(seconds)
      .padStart(2, "0")
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

    timer.style.display =
      "none";

    manualReview.style.display =
      "block";

    manualReview.querySelector(
      "h2"
    ).textContent =
      "Payment Rejected";

    manualReview.querySelector(
      "p"
    ).textContent =
      "Your payment request was rejected. Please contact us on Telegram for assistance.";

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
          cache:
            "no-store"
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
          status:
            "Not Found"
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
// ADMIN DASHBOARD + SETTINGS
// ======================================================

app.get(
  "/admin",
  (req, res) => {

    const payments =
      updateExpiredPayments();

    const settings =
      getSettings();

    const rows =
      payments
        .map(
          payment => {

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
  action="/admin/payment/${encodeURIComponent(
    payment.id
  )}/approve"
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
  action="/admin/payment/${encodeURIComponent(
    payment.id
  )}/reject"
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

            } else if (
              payment.status ===
              "Expired"
            ) {

              actionHTML = `

<div class="manual-admin">

<strong>
Manual Review
</strong>

<a
  href="${escapeHTML(
    settings.telegram
  )}"
  target="_blank"
  rel="noopener"
>
Telegram
</a>

</div>

              `;

            } else {

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
  href="${escapeHTML(
    payment.proof
  )}"
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
${escapeHTML(
  date
)}
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

    const planRows =
      settings.plans
        .map(
          plan => `

<tr>

<td>

<input
  class="setting-input"
  type="text"
  name="planName"
  form="edit-${escapeHTML(
    plan.id
  )}"
  value="${escapeHTML(
    plan.name
  )}"
  required
>

</td>

<td>

<input
  class="setting-input small"
  type="number"
  min="0"
  name="planAmount"
  form="edit-${escapeHTML(
    plan.id
  )}"
  value="${Number(
    plan.amount
  )}"
  required
>

</td>

<td>

<input
  class="setting-input"
  type="text"
  name="planDescription"
  form="edit-${escapeHTML(
    plan.id
  )}"
  value="${escapeHTML(
    plan.description
  )}"
>

</td>

<td>

<div class="plan-actions">

<form
  id="edit-${escapeHTML(
    plan.id
  )}"
  method="POST"
  action="/admin/settings/plan/${encodeURIComponent(
    plan.id
  )}/edit"
>

<button
  class="save-btn"
  type="submit"
>
Save
</button>

</form>

<form
  method="POST"
  action="/admin/settings/plan/${encodeURIComponent(
    plan.id
  )}/delete"
  onsubmit="return confirm('Delete this plan?')"
>

<button
  class="delete-btn"
  type="submit"
>
Delete
</button>

</form>

</div>

</td>

</tr>

          `
        )
        .join("");

    res.send(`

<!doctype html>

<html lang="en">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>
Vexora Admin
</title>

<style>

* {
  box-sizing:
    border-box;
}

body {

  margin: 0;

  min-height: 100vh;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  background:
    #050b1d;

  color:
    #f4f7ff;

}

.topbar {

  padding:
    22px 28px;

  background:
    #071025;

  border-bottom:
    1px solid
    rgba(
      139,
      92,
      255,
      .25
    );

}

.logo {

  font-size:
    36px;

  font-weight:
    800;

}

.logo span {

  background:
    linear-gradient(
      90deg,
      #a12cff,
      #087cff
    );

  -webkit-background-clip:
    text;

  background-clip:
    text;

  color:
    transparent;

}

.container {

  width:
    100%;

  max-width:
    1500px;

  margin:
    auto;

  padding:
    30px 20px 60px;

}

.header {

  margin-bottom:
    25px;

}

.header h1 {

  margin:
    0 0 8px;

  font-size:
    34px;

}

.header p {

  margin:
    0;

  color:
    #9eacd0;

}

.stats {

  display:
    flex;

  gap:
    14px;

  flex-wrap:
    wrap;

  margin-bottom:
    25px;

}

.stat {

  min-width:
    150px;

  padding:
    20px;

  border-radius:
    18px;

  background:
    #0d1a35;

  border:
    1px solid
    rgba(
      125,
      153,
      220,
      .25
    );

}

.stat-number {

  display:
    block;

  font-size:
    28px;

  font-weight:
    800;

}

.stat-label {

  color:
    #9eacd0;

  font-size:
    14px;

}

.panel {

  margin-bottom:
    25px;

  padding:
    24px;

  border-radius:
    20px;

  background:
    #0d1a35;

  border:
    1px solid
    rgba(
      125,
      153,
      220,
      .25
    );

}

.panel h2 {

  margin:
    0 0 18px;

  font-size:
    24px;

}

.settings-grid {

  display:
    grid;

  grid-template-columns:
    repeat(
      2,
      minmax(
        0,
        1fr
      )
    );

  gap:
    16px;

}

.setting-group {

  display:
    flex;

  flex-direction:
    column;

  gap:
    7px;

}

.setting-group.full {

  grid-column:
    1 / -1;

}

.setting-group label {

  color:
    #cbd7f4;

  font-size:
    14px;

  font-weight:
    700;

}

.setting-input {

  width:
    100%;

  padding:
    12px 13px;

  border:
    1px solid
    #2b3d61;

  border-radius:
    10px;

  background:
    #071126;

  color:
    #fff;

  outline:
    none;

}

.setting-input:focus {

  border-color:
    #8b5cff;

}

.setting-input.small {

  max-width:
    150px;

}

.checkbox-row {

  display:
    flex;

  align-items:
    center;

  gap:
    10px;

  padding:
    13px;

  border-radius:
    10px;

  background:
    #071126;

}

.checkbox-row input {

  width:
    18px;

  height:
    18px;

}

.save-settings {

  margin-top:
    18px;

  border:
    0;

  padding:
    13px 20px;

  border-radius:
    10px;

  background:
    linear-gradient(
      90deg,
      #8b2cff,
      #087cff
    );

  color:
    white;

  font-weight:
    800;

  cursor:
    pointer;

}

.qr-preview {

  margin-top:
    10px;

  max-width:
    180px;

  max-height:
    180px;

  border-radius:
    12px;

  border:
    1px solid
    #34486f;

}

.table-wrap {

  overflow-x:
    auto;

  background:
    #0d1a35;

  border:
    1px solid
    rgba(
      125,
      153,
      220,
      .25
    );

  border-radius:
    20px;

}

table {

  width:
    100%;

  border-collapse:
    collapse;

  min-width:
    1350px;

}

th {

  text-align:
    left;

  padding:
    16px;

  color:
    #aebce0;

  font-size:
    13px;

  text-transform:
    uppercase;

  border-bottom:
    1px solid
    #25385c;

}

td {

  padding:
    16px;

  border-bottom:
    1px solid
    #1b2b49;

  color:
    #dce5fb;

  vertical-align:
    middle;

}

tr:last-child td {

  border-bottom:
    0;

}

.amount-text {

  color:
    #a879ff;

  white-space:
    nowrap;

}

.status {

  display:
    inline-block;

  padding:
    7px 11px;

  border-radius:
    999px;

  font-size:
    13px;

  font-weight:
    700;

}

.pending {

  background:
    #3a2d08;

  color:
    #ffd75c;

}

.approved {

  background:
    #103923;

  color:
    #65e99a;

}

.rejected {

  background:
    #42191d;

  color:
    #ff7d87;

}

.expired {

  background:
    #422417;

  color:
    #ffad72;

}

.admin-timer {

  margin-bottom:
    9px;

}

.countdown {

  display:
    inline-block;

  padding:
    6px 10px;

  border-radius:
    8px;

  background:
    #071126;

  border:
    1px solid
    rgba(
      139,
      92,
      255,
      .35
    );

  color:
    #a879ff;

  font-size:
    13px;

  font-weight:
    800;

}

.actions {

  display:
    flex;

  gap:
    8px;

}

.actions form {

  margin:
    0;

}

.actions button,
.save-btn,
.delete-btn {

  border:
    0;

  border-radius:
    9px;

  padding:
    9px 12px;

  color:
    white;

  font-weight:
    700;

  cursor:
    pointer;

}

.approve,
.save-btn {

  background:
    #16834b;

}

.reject,
.delete-btn {

  background:
    #a93440;

}

.action-done {

  color:
    #8998b8;

  font-size:
    13px;

  white-space:
    nowrap;

}

.manual-admin {

  display:
    flex;

  align-items:
    center;

  gap:
    8px;

  flex-wrap:
    wrap;

}

.manual-admin strong {

  color:
    #ffad72;

  font-size:
    13px;

}

.manual-admin a {

  display:
    inline-block;

  padding:
    8px 10px;

  border-radius:
    8px;

  background:
    #168dcc;

  color:
    #fff;

  text-decoration:
    none;

  font-size:
    12px;

  font-weight:
    700;

}

.proof-btn {

  display:
    inline-block;

  padding:
    9px 12px;

  border-radius:
    9px;

  background:
    linear-gradient(
      90deg,
      #8b2cff,
      #087cff
    );

  color:
    white;

  text-decoration:
    none;

  font-weight:
    700;

  font-size:
    13px;

  white-space:
    nowrap;

}

.no-proof {

  color:
    #7787a9;

}

.plan-actions {

  display:
    flex;

  gap:
    8px;

  flex-wrap:
    wrap;

}

.add-plan {

  display:
    grid;

  grid-template-columns:
    1fr 150px 1fr auto;

  gap:
    10px;

  align-items:
    end;

}

.add-plan label {

  display:
    block;

  color:
    #cbd7f4;

  font-size:
    13px;

  margin-bottom:
    7px;

}

.add-btn {

  border:
    0;

  padding:
    12px 18px;

  border-radius:
    10px;

  background:
    linear-gradient(
      90deg,
      #8b2cff,
      #087cff
    );

  color:
    white;

  font-weight:
    800;

  cursor:
    pointer;

}

.empty {

  text-align:
    center;

  padding:
    50px;

  color:
    #9eacd0;

}

@media(max-width:800px) {

  .settings-grid {
    grid-template-columns:
      1fr;
  }

  .setting-group.full {
    grid-column:
      auto;
  }

  .add-plan {
    grid-template-columns:
      1fr;
  }

}

@media(max-width:600px) {

  .topbar {
    padding:
      18px 20px;
  }

  .logo {
    font-size:
      30px;
  }

  .container {
    padding:
      25px 14px;
  }

  .header h1 {
    font-size:
      28px;
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
Manage payments, plans and website settings.
</p>

</section>

<!-- ================================================ -->
<!-- WEBSITE SETTINGS -->
<!-- ================================================ -->

<section class="panel">

<h2>
Website Settings
</h2>

<form
  method="POST"
  action="/admin/settings/save"
  enctype="multipart/form-data"
>

<div class="settings-grid">

<div class="setting-group">

<label>
Telegram Link
</label>

<input
  class="setting-input"
  type="text"
  name="telegram"
  value="${escapeHTML(
    settings.telegram
  )}"
  placeholder="https://t.me/username"
>

</div>

<div class="setting-group">

<label>
Contact Number
</label>

<input
  class="setting-input"
  type="text"
  name="contactNumber"
  value="${escapeHTML(
    settings.contactNumber
  )}"
  placeholder="6371406885"
>

</div>

<div class="setting-group">

<label>
UPI ID
</label>

<input
  class="setting-input"
  type="text"
  name="upiId"
  value="${escapeHTML(
    settings.upiId
  )}"
  placeholder="example@upi"
>

</div>

<div class="setting-group">

<label>
QR Code
</label>

<input
  class="setting-input"
  type="file"
  name="qr"
  accept="image/*"
>

${
  settings.qrImage

    ? `

<img
  class="qr-preview"
  src="${escapeHTML(
    settings.qrImage
  )}"
  alt="Current QR"
>

    `

    : ""
}

</div>

<div class="setting-group full">

<label>
Free Trial
</label>

<div class="checkbox-row">

<input
  type="checkbox"
  name="freeTrialEnabled"
  value="1"
  ${
    settings.freeTrialEnabled
      ? "checked"
      : ""
  }
>

<span>
Show 1 Day Free Trial on Plans page
</span>

</div>

</div>

</div>

<button
  class="save-settings"
  type="submit"
>
Save Website Settings
</button>

</form>

</section>

<!-- ================================================ -->
<!-- PLAN MANAGER -->
<!-- ================================================ -->

<section class="panel">

<h2>
Plan Manager
</h2>

<div class="table-wrap">

<table style="min-width:900px">

<thead>

<tr>

<th>
Plan Name
</th>

<th>
Amount
</th>

<th>
Description
</th>

<th>
Action
</th>

</tr>

</thead>

<tbody>

${
  planRows ||

  `

<tr>

<td
colspan="4"
class="empty"
>
No plans found.
</td>

</tr>

  `
}

</tbody>

</table>

</div>

<h3 style="margin-top:30px">
Add New Plan
</h3>

<form
  class="add-plan"
  method="POST"
  action="/admin/settings/plan/add"
>

<div>

<label>
Plan Name
</label>

<input
  class="setting-input"
  type="text"
  name="name"
  placeholder="90 Days"
  required
>

</div>

<div>

<label>
Amount
</label>

<input
  class="setting-input"
  type="number"
  name="amount"
  min="0"
  placeholder="3999"
  required
>

</div>

<div>

<label>
Description
</label>

<input
  class="setting-input"
  type="text"
  name="description"
  placeholder="Premium access for 90 days."
>

</div>

<button
  class="add-btn"
  type="submit"
>
+ Add Plan
</button>

</form>

</section>

<!-- ================================================ -->
<!-- STATS -->
<!-- ================================================ -->

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

<!-- ================================================ -->
<!-- PAYMENTS -->
<!-- ================================================ -->

<div class="table-wrap">

<table>

<thead>

<tr>

<th>
Plan
</th>

<th>
Amount
</th>

<th>
UTR
</th>

<th>
TradingView
</th>

<th>
Telegram
</th>

<th>
Proof
</th>

<th>
Status
</th>

<th>
Date
</th>

<th>
Action
</th>

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
          remaining /
          1000
        );

      const minutes =
        Math.floor(
          totalSeconds /
          60
        );

      const seconds =
        totalSeconds %
        60;

      element.textContent =
        String(minutes)
          .padStart(
            2,
            "0"
          ) +
        ":" +
        String(seconds)
          .padStart(
            2,
            "0"
          );

      if (
        remaining <=
        0
      ) {

        shouldReload =
          true;

      }

    }
  );

  if (
    shouldReload
  ) {

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

  }
);

// ======================================================
// SAVE WEBSITE SETTINGS
// ======================================================

app.post(
  "/admin/settings/save",
  upload.single("qr"),
  (req, res) => {

    const settings =
      getSettings();

    settings.telegram =
      req.body.telegram ||
      "";

    settings.contactNumber =
      req.body.contactNumber ||
      "";

    settings.upiId =
      req.body.upiId ||
      "";

    settings.freeTrialEnabled =
      req.body.freeTrialEnabled ===
      "1";

    if (req.file) {

      settings.qrImage =
        "/uploads/" +
        req.file.filename;

    }

    saveSettings(
      settings
    );

    res.redirect(
      "/admin"
    );

  }
);

// ======================================================
// ADD PLAN
// ======================================================

app.post(
  "/admin/settings/plan/add",
  (req, res) => {

    const settings =
      getSettings();

    const name =
      String(
        req.body.name ||
        ""
      ).trim();

    const amount =
      Number(
        req.body.amount ||
        0
      );

    const description =
      String(
        req.body.description ||
        ""
      ).trim();

    if (!name) {

      return res.redirect(
        "/admin"
      );

    }

    let id =
      name
        .toLowerCase()
        .replace(
          /[^a-z0-9]+/g,
          "-"
        )
        .replace(
          /^-+|-+$/g,
          ""
        );

    if (!id) {
      id =
        "plan-" +
        Date.now();
    }

    const originalId =
      id;

    let counter =
      2;

    while (
      settings.plans.some(
        plan =>
          plan.id === id
      )
    ) {

      id =
        originalId +
        "-" +
        counter;

      counter++;
    }

    settings.plans.push({

      id,

      name,

      amount:
        Math.max(
          0,
          amount
        ),

      description

    });

    saveSettings(
      settings
    );

    res.redirect(
      "/admin"
    );

  }
);

// ======================================================
// EDIT PLAN
// ======================================================

app.post(
  "/admin/settings/plan/:id/edit",
  (req, res) => {

    const settings =
      getSettings();

    const plan =
      settings.plans.find(
        p =>
          p.id ===
          req.params.id
      );

    if (plan) {

      const name =
        String(
          req.body.planName ||
          ""
        ).trim();

      const amount =
        Number(
          req.body.planAmount ||
          0
        );

      const description =
        String(
          req.body.planDescription ||
          ""
        ).trim();

      if (name) {

        plan.name =
          name;

      }

      plan.amount =
        Math.max(
          0,
          amount
        );

      plan.description =
        description;

      saveSettings(
        settings
      );

    }

    res.redirect(
      "/admin"
    );

  }
);

// ======================================================
// DELETE PLAN
// ======================================================

app.post(
  "/admin/settings/plan/:id/delete",
  (req, res) => {

    const settings =
      getSettings();

    settings.plans =
      settings.plans.filter(
        plan =>
          plan.id !==
          req.params.id
      );

    saveSettings(
      settings
    );

    res.redirect(
      "/admin"
    );

  }
);

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

      if (
        payment.status ===
        "Pending" &&
        !isExpired(
          payment
        )
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

      if (
        payment.status ===
        "Pending" &&
        !isExpired(
          payment
        )
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
        remainingMs /
        1000
      )
    );

  const minutes =
    Math.floor(
      totalSeconds /
      60
    );

  const seconds =
    totalSeconds %
    60;

  return (
    String(minutes)
      .padStart(
        2,
        "0"
      ) +
    ":" +
    String(seconds)
      .padStart(
        2,
        "0"
      )
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
