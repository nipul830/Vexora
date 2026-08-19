const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 10000;

// ======================================================
// CONFIG
// ======================================================

const REVIEW_TIME_MS = 15 * 60 * 1000;

const DEFAULT_SETTINGS = {
  telegram: "https://t.me/Jkhub_premium",
  contactNumber: "6371406885",
  upiId: "",
  qrImage: "",
  freeTrialEnabled: true,

  paymentQrs: {
    upi: "/assets/upi-phonepe.jpg",
    trc20: "/assets/usdt-trc20.jpg",
    bep20: "/assets/usdt-bep20.jpg",
    eth: "/assets/eth-erc20.jpg"
  },

  paymentAddresses: {
    upi: "+91 70676 03886",
    trc20: "TGnAWoHjXizow51pMuwhwKiboYy22DC2bJ",
    bep20: "0x4ab23A898208485D2bDa4C34D28C57649C1752fD",
    eth: "0x4ab23A898208485D2bDa4C34D28C57649C1752fD"
  },

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
// DIRECTORIES
// ======================================================

const publicDir = path.join(__dirname, "public");
const uploadDir = path.join(publicDir, "uploads");
const dataDir = path.join(__dirname, "data");

const paymentsFile = path.join(
  dataDir,
  "payments.json"
);

const settingsFile = path.join(
  dataDir,
  "settings.json"
);

const reviewsFile = path.join(
  dataDir,
  "reviews.json"
);

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

// ======================================================
// DATA FILES
// ======================================================

if (!fs.existsSync(paymentsFile)) {
  fs.writeFileSync(
    paymentsFile,
    "[]",
    "utf8"
  );
}

if (!fs.existsSync(reviewsFile)) {
  fs.writeFileSync(
    reviewsFile,
    "[]",
    "utf8"
  );
}

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(express.json());

app.use(
  express.static(publicDir)
);

// ======================================================
// HELPERS
// ======================================================

function cloneDefaults() {
  return JSON.parse(
    JSON.stringify(DEFAULT_SETTINGS)
  );
}

function normalizeSettings(input) {

  const defaults = cloneDefaults();

  const settings = {
    ...defaults,
    ...(input || {})
  };

  settings.telegram =
    String(
      settings.telegram || ""
    );

  settings.contactNumber =
    String(
      settings.contactNumber || ""
    );

  settings.upiId =
    String(
      settings.upiId || ""
    );

  settings.qrImage =
    String(
      settings.qrImage || ""
    );

  settings.freeTrialEnabled =
    Boolean(
      settings.freeTrialEnabled
    );

  settings.paymentQrs = {
    ...defaults.paymentQrs,
    ...(settings.paymentQrs || {})
  };

  settings.paymentAddresses = {
    ...defaults.paymentAddresses,
    ...(settings.paymentAddresses || {})
  };

  if (!Array.isArray(settings.plans)) {
    settings.plans =
      defaults.plans;
  }

  settings.plans =
    settings.plans
      .filter(
        p =>
          p &&
          typeof p === "object"
      )
      .map(
        p => ({
          id: String(p.id || ""),
          name: String(p.name || ""),
          amount: Number(p.amount || 0),
          description:
            String(
              p.description || ""
            )
        })
      )
      .filter(
        p =>
          p.id &&
          p.name
      );

  return settings;
}

function getSettings() {

  try {

    if (
      !fs.existsSync(
        settingsFile
      )
    ) {

      const defaults =
        cloneDefaults();

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
      return cloneDefaults();
    }

    return normalizeSettings(
      JSON.parse(data)
    );

  } catch (error) {

    console.error(
      "Settings read error:",
      error
    );

    return cloneDefaults();
  }
}

function saveSettings(settings) {

  const clean =
    normalizeSettings(
      settings
    );

  fs.writeFileSync(
    settingsFile,
    JSON.stringify(
      clean,
      null,
      2
    ),
    "utf8"
  );

  return clean;
}

saveSettings(
  getSettings()
);

// ======================================================
// PAYMENTS
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
      "Payments read error:",
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
// CUSTOMER FEEDBACK
// ======================================================

function getReviews() {

  try {

    const data =
      fs.readFileSync(
        reviewsFile,
        "utf8"
      );

    if (!data.trim()) {
      return [];
    }

    const reviews =
      JSON.parse(data);

    if (!Array.isArray(reviews)) {
      return [];
    }

    return reviews;

  } catch (error) {

    console.error(
      "Reviews read error:",
      error
    );

    return [];
  }
}

function saveReviews(reviews) {

  fs.writeFileSync(
    reviewsFile,
    JSON.stringify(
      reviews,
      null,
      2
    ),
    "utf8"
  );
}

function getPublicReviews() {

  return getReviews()
    .filter(
      review =>
        review &&
        review.enabled !== false
    )
    .map(
      review => ({
        id:
          String(
            review.id || ""
          ),

        name:
          String(
            review.name || "Vexora User"
          ),

        message:
          String(
            review.message || ""
          ),

        rating:
          Math.min(
            5,
            Math.max(
              1,
              Number(
                review.rating || 5
              )
            )
          ),

        photo:
          String(
            review.photo || ""
          )
      })
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
// PAYMENT TIMER
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

  payments.forEach(payment => {

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

  });

  if (changed) {
    savePayments(payments);
  }

  return payments;
}

function formatAdminTime(ms) {

  const seconds =
    Math.max(
      0,
      Math.ceil(ms / 1000)
    );

  const minutes =
    Math.floor(
      seconds / 60
    );

  const remaining =
    seconds % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(remaining).padStart(2, "0")
  );
}

// ======================================================
// UPLOAD
// ======================================================

const storage =
  multer.diskStorage({

    destination(req, file, cb) {
      cb(
        null,
        uploadDir
      );
    },

    filename(req, file, cb) {

      const ext =
        path.extname(
          file.originalname
        );

      cb(
        null,
        "file-" +
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .slice(2, 9) +
        ext
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
// CUSTOMER FEEDBACK HTML
// ======================================================

function getFeedbackSection() {

  const reviews =
    getPublicReviews();

  if (!reviews.length) {

    return `
<section class="vx-feedback">

  <div class="vx-feedback-inner">

    <div class="vx-feedback-badge">
      CUSTOMER FEEDBACK
    </div>

    <h2>
      What Our Customers Say
    </h2>

    <p class="vx-feedback-subtitle">
      Real feedback from Vexora users.
    </p>

    <div class="vx-empty-feedback">
      Customer reviews coming soon.
    </div>

  </div>

</section>
    `;

  }

  const cards =
    reviews
      .map(review => {

        const stars =
          "★".repeat(
            Number(review.rating)
          ) +
          "☆".repeat(
            5 -
            Number(review.rating)
          );

        const photo =
          review.photo
            ? `
              <img
                src="${escapeHTML(
                  review.photo
                )}"
                alt="${escapeHTML(
                  review.name
                )}"
              >
            `
            : `
              <div class="vx-avatar">
                ${escapeHTML(
                  review.name
                    .charAt(0)
                    .toUpperCase()
                )}
              </div>
            `;

        return `
<div class="vx-review-card">

  <div class="vx-review-top">

    <div class="vx-review-photo">
      ${photo}
    </div>

    <div class="vx-review-user">

      <div class="vx-review-name">
        ${escapeHTML(
          review.name
        )}
      </div>

      <div class="vx-stars">
        ${stars}
      </div>

    </div>

  </div>

  <div class="vx-review-message">
    ${escapeHTML(
      review.message
    )}
  </div>

</div>
        `;

      })
      .join("");

  /*
    Duplicate cards so the horizontal
    animation remains continuous.
  */

  return `
<section class="vx-feedback">

<style>

.vx-feedback{
  width:100%;
  overflow:hidden;
  padding:55px 0 65px;
  margin:0;
  position:relative;
  background:
    radial-gradient(
      circle at 50% 0%,
      rgba(124,65,255,.12),
      transparent 55%
    );
}

.vx-feedback-inner{
  width:100%;
  text-align:center;
}

.vx-feedback-badge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:9px 20px;
  border-radius:999px;
  border:1px solid
    rgba(160,110,255,.55);
  color:#b78aff;
  background:
    rgba(108,65,255,.06);
  font-size:13px;
  font-weight:900;
  letter-spacing:1px;
  box-shadow:
    0 0 25px
    rgba(139,92,255,.08);
}

.vx-feedback h2{
  margin:22px 15px 8px;
  color:#f5f7ff;
  font-size:clamp(
    32px,
    5vw,
    52px
  );
  line-height:1.1;
  font-weight:900;
}

.vx-feedback-subtitle{
  margin:0 15px 35px;
  color:#93a4c9;
  font-size:17px;
}

.vx-review-viewport{
  width:100%;
  overflow:hidden;
  position:relative;
  padding:10px 0 25px;
}

.vx-review-track{
  width:max-content;
  display:flex;
  gap:20px;
  padding-left:20px;

  animation:
    vxFeedbackMove
    35s linear infinite;
}

.vx-review-viewport:hover
.vx-review-track{
  animation-play-state:paused;
}

.vx-review-card{
  width:330px;
  min-height:210px;
  padding:25px;
  border-radius:24px;
  text-align:left;

  background:
    linear-gradient(
      145deg,
      rgba(17,31,61,.96),
      rgba(8,19,43,.96)
    );

  border:
    1px solid
    rgba(105,133,202,.28);

  box-shadow:
    0 20px 60px
    rgba(0,0,0,.25);

  flex-shrink:0;

  transition:
    transform .3s ease,
    border-color .3s ease;
}

.vx-review-card:hover{
  transform:
    translateY(-5px);

  border-color:
    rgba(151,101,255,.65);
}

.vx-review-top{
  display:flex;
  align-items:center;
  gap:14px;
  margin-bottom:20px;
}

.vx-review-photo{
  width:58px;
  height:58px;
  flex-shrink:0;
  overflow:hidden;
  border-radius:50%;

  border:
    2px solid
    rgba(158,102,255,.75);

  background:
    linear-gradient(
      135deg,
      #8b2cff,
      #087cff
    );

  box-shadow:
    0 0 22px
    rgba(139,92,255,.22);
}

.vx-review-photo img{
  width:100%;
  height:100%;
  object-fit:cover;
}

.vx-avatar{
  width:100%;
  height:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  color:white;
  font-size:25px;
  font-weight:900;
}

.vx-review-name{
  color:#f6f8ff;
  font-size:18px;
  font-weight:900;
  margin-bottom:6px;
}

.vx-stars{
  color:#ffd21f;
  font-size:18px;
  letter-spacing:1px;
}

.vx-review-message{
  color:#aab9d8;
  font-size:15px;
  line-height:1.7;
}

.vx-empty-feedback{
  max-width:700px;
  margin:30px auto;
  padding:30px;
  border-radius:20px;
  color:#899abd;
  background:#0b1730;
  border:1px solid #26385e;
}

@keyframes vxFeedbackMove{

  0%{
    transform:
      translateX(0);
  }

  100%{
    transform:
      translateX(
        calc(
          -50% - 10px
        )
      );
  }

}

@media(max-width:600px){

  .vx-feedback{
    padding:42px 0 50px;
  }

  .vx-review-track{
    gap:14px;
    padding-left:14px;

    animation-duration:
      28s;
  }

  .vx-review-card{
    width:285px;
    min-height:205px;
    padding:21px;
  }

  .vx-feedback h2{
    font-size:34px;
  }

}

</style>

<div class="vx-feedback-inner">

  <div class="vx-feedback-badge">
    CUSTOMER FEEDBACK
  </div>

  <h2>
    What Our Customers Say
  </h2>

  <p class="vx-feedback-subtitle">
    Real feedback from Vexora users.
  </p>

</div>

<div class="vx-review-viewport">

  <div class="vx-review-track">

    ${cards}

    ${cards}

  </div>

</div>

</section>
  `;
}

// ======================================================
// HOME
// ======================================================

app.get("/", (req, res) => {

  const indexPath =
    path.join(
      __dirname,
      "index.html"
    );

  fs.readFile(
    indexPath,
    "utf8",
    (error, html) => {

      if (error) {

        console.error(
          "Home read error:",
          error
        );

        return res
          .status(500)
          .send(
            "Home page error"
          );
      }

      const feedback =
        getFeedbackSection();

      /*
        Feedback is inserted immediately
        after the company header/logo.
      */

      if (
        html.includes(
          "</header>"
        )
      ) {

        html =
          html.replace(
            "</header>",
            "</header>" +
            feedback
          );

      } else {

        html =
          html.replace(
            "<body>",
            "<body>" +
            feedback
          );

      }

      res.send(html);

    }
  );

});

// ======================================================
// PLANS PAGE
// ======================================================

app.get("/plans", (req, res) => {

  const settings =
    getSettings();

  const freeTrial =
    settings.freeTrialEnabled
      ? `
        <div class="plan free">
          <div class="tag">FREE TRIAL</div>
          <h2>1 Day Free</h2>
          <div class="price">FREE</div>
          <p>
            Try Vexora premium access
            for 1 day.
          </p>

          <a
            class="btn"
            href="https://wa.me/${escapeHTML(
              settings.contactNumber
            )}?text=Hi%20Vexora%2C%20I%20want%20the%201%20Day%20Free%20plan."
            target="_blank"
            rel="noopener"
          >
            Get Free Trial
          </a>
        </div>
      `
      : "";

  const cards =
    settings.plans
      .map(
        plan => `
        <div class="plan">

          <div class="tag">
            VEXORA PREMIUM
          </div>

          <h2>
            ${escapeHTML(plan.name)}
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

  res.send(`
<!doctype html>
<html lang="en">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>Vexora Plans</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  min-height:100vh;
  font-family:Arial,sans-serif;
  color:#f5f7ff;
  background:
    radial-gradient(
      circle at top,
      #152044,
      #050b1d 55%
    );
}

.topbar{
  padding:22px 28px;
  border-bottom:1px solid #263455;
  background:rgba(5,11,29,.9);
}

.logo{
  font-size:36px;
  font-weight:900;
}

.logo span{
  color:#8b5cff;
}

.container{
  max-width:1000px;
  margin:auto;
  padding:45px 20px 70px;
}

.hero{
  text-align:center;
  margin-bottom:35px;
}

.hero h1{
  font-size:48px;
  margin:0 0 12px;
}

.hero p{
  color:#9eacd0;
  font-size:18px;
}

.plans{
  display:grid;
  grid-template-columns:
    repeat(2,1fr);
  gap:20px;
}

.plan{
  position:relative;
  padding:28px;
  border-radius:24px;
  background:
    linear-gradient(
      145deg,
      #111d39,
      #0a142b
    );
  border:1px solid #2b3d61;
  box-shadow:
    0 20px 50px
    rgba(0,0,0,.25);
}

.plan.free{
  border-color:#239c65;
}

.tag{
  display:inline-block;
  padding:6px 10px;
  border-radius:999px;
  background:#18274a;
  color:#a879ff;
  font-size:11px;
  font-weight:800;
}

.free .tag{
  color:#64e69b;
  background:#103b2a;
}

.plan h2{
  font-size:27px;
  margin:18px 0 5px;
}

.price{
  font-size:38px;
  font-weight:900;
  color:#a879ff;
  margin:12px 0;
}

.plan p{
  color:#9eacd0;
  line-height:1.6;
  min-height:50px;
}

.btn{
  display:block;
  text-align:center;
  padding:15px;
  margin-top:20px;
  border-radius:14px;
  color:white;
  font-weight:800;
  text-decoration:none;
  background:
    linear-gradient(
      90deg,
      #8b2cff,
      #087cff
    );
}

.free .btn{
  background:#168653;
}

@media(max-width:650px){

  .plans{
    grid-template-columns:1fr;
  }

  .hero h1{
    font-size:38px;
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
Choose Your Plan
</h1>

<p>
Select your Vexora premium membership.
</p>

</section>

<section class="plans">

${freeTrial}

${cards}

</section>

</main>

</body>

</html>
  `);

});

// ======================================================
// PAYMENT PAGE
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
// SETTINGS API
// ======================================================

app.get(
  "/api/settings",
  (req, res) => {

    const settings =
      getSettings();

    res.json(settings);

  }
);

// ======================================================
// REVIEWS API
// ======================================================

app.get(
  "/api/reviews",
  (req, res) => {

    res.json(
      getPublicReviews()
    );

  }
);

// ======================================================
// SUBMIT PAGE
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
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .slice(2, 8),

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
Payment Submitted
</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:20px;
  font-family:Arial,sans-serif;
  background:#050b1d;
  color:white;
}

.card{
  width:100%;
  max-width:440px;
  padding:35px 25px;
  text-align:center;
  border-radius:25px;
  background:#0d1a36;
  border:1px solid #3a3470;
  box-shadow:
    0 25px 70px
    rgba(0,0,0,.4);
}

.icon{
  width:70px;
  height:70px;
  margin:auto auto 20px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:50%;
  background:
    linear-gradient(
      135deg,
      #8b2cff,
      #087cff
    );
  font-size:38px;
  font-weight:900;
}

h1{
  font-size:27px;
  margin:0 0 20px;
}

.plan{
  padding:17px;
  border-radius:15px;
  background:#071126;
  border:1px solid #343f69;
}

.plan-name{
  font-size:21px;
  font-weight:800;
}

.amount{
  margin-top:5px;
  color:#a879ff;
  font-size:27px;
  font-weight:900;
}

.message{
  color:#a9b8dc;
  line-height:1.6;
  margin:20px 0;
}

.timer{
  font-size:34px;
  font-weight:900;
  margin-top:5px;
}

.timer.expired{
  color:#ff7d87;
}

.status{
  display:none;
  margin-top:18px;
  padding:13px;
  border-radius:12px;
  font-weight:800;
}

.approved{
  background:#103923;
  color:#65e99a;
}

.rejected{
  background:#42191d;
  color:#ff7d87;
}

.manual{
  display:none;
  margin-top:18px;
  padding:16px;
  border-radius:15px;
  background:#27181a;
}

.manual h2{
  color:#ff9aa3;
  margin:0 0 8px;
}

.manual p{
  color:#c5cad8;
  line-height:1.5;
}

.telegram{
  display:block;
  padding:14px;
  border-radius:12px;
  background:#168dcc;
  color:white;
  text-decoration:none;
  font-weight:800;
}

.ok{
  width:100%;
  margin-top:20px;
  padding:15px;
  border:0;
  border-radius:14px;
  background:
    linear-gradient(
      135deg,
      #8b2cff,
      #087cff
    );
  color:white;
  font-size:17px;
  font-weight:800;
}

</style>

</head>

<body>

<div class="card">

<div class="icon">
✓
</div>

<h1>
Payment Request Submitted
</h1>

<div class="plan">

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
Your payment request has been submitted.
Please wait while we verify your payment.
</p>

<div>
Verification time remaining
</div>

<div
  id="timer"
  class="timer"
>
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

<h2>
Manual Review Required
</h2>

<p>
Verification time has expired.
Please contact us on Telegram.
</p>

<a
  class="telegram"
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
  class="ok"
  onclick="location.href='/'"
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

const status =
document.getElementById(
  "status"
);

const manual =
document.getElementById(
  "manual"
);

let finished = false;

function showStatus(value){

  if(
    value === "Approved"
  ){

    finished = true;

    status.textContent =
      "✓ Payment Approved";

    status.className =
      "status approved";

    status.style.display =
      "block";

    timer.style.display =
      "none";

    manual.style.display =
      "none";

  }

  if(
    value === "Rejected"
  ){

    finished = true;

    status.textContent =
      "✕ Payment Rejected";

    status.className =
      "status rejected";

    status.style.display =
      "block";

    timer.style.display =
      "none";

    manual.style.display =
      "block";

    manual.querySelector(
      "h2"
    ).textContent =
      "Payment Rejected";

    manual.querySelector(
      "p"
    ).textContent =
      "Your payment was rejected. Please contact us on Telegram.";

  }

  if(
    value === "Expired"
  ){

    finished = true;

    timer.textContent =
      "00:00";

    timer.classList.add(
      "expired"
    );

    manual.style.display =
      "block";

  }

}

async function checkStatus(){

  if(finished) return;

  try{

    const response =
      await fetch(
        "/payment-status/" +
        encodeURIComponent(
          paymentId
        ),
        {
          cache:"no-store"
        }
      );

    if(!response.ok) return;

    const data =
      await response.json();

    showStatus(
      data.status
    );

  }catch(error){

    console.error(
      error
    );

  }

}

function updateTimer(){

  if(finished) return;

  const remaining =
    new Date(
      expiresAt
    ).getTime() -
    Date.now();

  if(
    remaining <= 0
  ){

    timer.textContent =
      "00:00";

    timer.classList.add(
      "expired"
    );

    manual.style.display =
      "block";

    checkStatus();

    return;
  }

  const seconds =
    Math.ceil(
      remaining / 1000
    );

  const min =
    Math.floor(
      seconds / 60
    );

  const sec =
    seconds % 60;

  timer.textContent =
    String(min)
      .padStart(2,"0") +
    ":" +
    String(sec)
      .padStart(2,"0");

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

    if(!payment){

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
// ADMIN DASHBOARD
// ======================================================

app.get(
  "/admin",
  (req, res) => {

    const payments =
      updateExpiredPayments();

    const settings =
      getSettings();

    const reviews =
      getReviews();

    // ==================================================
    // PAYMENT ROWS
    // ==================================================

    const rows =
      payments
        .map(
          payment => {

            let statusClass =
              "pending";

            if(
              payment.status ===
              "Approved"
            )
              statusClass =
                "approved";

            if(
              payment.status ===
              "Rejected"
            )
              statusClass =
                "rejected";

            if(
              payment.status ===
              "Expired"
            )
              statusClass =
                "expired";

            let action = "";

            if(
              payment.status ===
              "Pending"
            ){

              action = `

<div class="timer">

<span
  class="countdown"
  data-expiry="${escapeHTML(
    payment.expiresAt
  )}"
>
${formatAdminTime(
  getRemainingMs(
    payment
  )
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

<button class="approve">
✓ Approve
</button>

</form>

<form
  method="POST"
  action="/admin/payment/${encodeURIComponent(
    payment.id
  )}/reject"
>

<button class="reject">
✕ Reject
</button>

</form>

</div>

              `;

            }else if(
              payment.status ===
              "Expired"
            ){

              action = `

<div class="manual">

<strong>
Manual Review
</strong>

<a
  href="${escapeHTML(
    settings.telegram
  )}"
  target="_blank"
>
Telegram
</a>

</div>

              `;

            }else{

              action = `

<span class="done">

${
  payment.status ===
  "Approved"
    ? "✓ Approved"
    : "✕ Rejected"
}

</span>

              `;

            }

            const proof =
              payment.proof
                ? `

<a
  class="proof"
  href="${escapeHTML(
    payment.proof
  )}"
  target="_blank"
>
View Proof
</a>

                `
                : "No Proof";

            return `

<tr>

<td>
<strong>
${escapeHTML(
  payment.plan
)}
</strong>
</td>

<td class="amount">
₹${Number(
  payment.amount || 0
).toLocaleString("en-IN")}
</td>

<td>
${escapeHTML(
  payment.transactionId
)}
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
${proof}
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
  new Date(
    payment.createdAt
  ).toLocaleString()
)}
</td>

<td>
${action}
</td>

</tr>

            `;

          }
        )
        .join("");

    // ==================================================
    // STATS
    // ==================================================

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

    // ==================================================
    // PLAN ROWS
    // ==================================================

    const planRows =
      settings.plans
        .map(
          plan => `

<tr>

<td>

<input
  class="input"
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
  class="input small"
  type="number"
  name="planAmount"
  form="edit-${escapeHTML(
    plan.id
  )}"
  value="${Number(
    plan.amount
  )}"
  min="0"
  required
>

</td>

<td>

<input
  class="input"
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

<button class="save">
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

<button class="delete">
Delete
</button>

</form>

</div>

</td>

</tr>

          `
        )
        .join("");

    // ==================================================
    // REVIEW ROWS
    // ==================================================

    const reviewRows =
      reviews
        .map(
          review => {

            const stars =
              "★".repeat(
                Math.min(
                  5,
                  Math.max(
                    1,
                    Number(
                      review.rating ||
                      5
                    )
                  )
                )
              );

            return `

<tr>

<td>

<div class="admin-review-user">

${
  review.photo
    ? `
<img
  src="${escapeHTML(
    review.photo
  )}"
  class="admin-review-photo"
>
`
    : `
<div class="admin-review-avatar">
${escapeHTML(
  String(
    review.name ||
    "U"
  )
    .charAt(0)
    .toUpperCase()
)}
</div>
`
}

<strong>
${escapeHTML(
  review.name
)}
</strong>

</div>

</td>

<td>

<span class="admin-stars">
${stars}
</span>

</td>

<td class="review-message">
${escapeHTML(
  review.message
)}
</td>

<td>

<span
  class="review-enabled ${
    review.enabled !== false
      ? "yes"
      : "no"
  }"
>
${
  review.enabled !== false
    ? "Visible"
    : "Hidden"
}
</span>

</td>

<td>

<div class="review-actions">

<form
  method="POST"
  action="/admin/review/${encodeURIComponent(
    review.id
  )}/toggle"
>

<button class="toggle">
${
  review.enabled !== false
    ? "Hide"
    : "Show"
}
</button>

</form>

<form
  method="POST"
  action="/admin/review/${encodeURIComponent(
    review.id
  )}/delete"
  onsubmit="return confirm('Delete this feedback?')"
>

<button class="delete">
Delete
</button>

</form>

</div>

</td>

</tr>

            `;

          }
        )
        .join("");

    // ==================================================
    // ADMIN HTML
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

<title>
Vexora Admin Dashboard
</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  min-height:100vh;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  color:#f4f7ff;

  background:
    radial-gradient(
      circle at top right,
      #182650 0,
      #050b1d 42%
    );
}

.topbar{
  position:sticky;
  top:0;
  z-index:20;

  padding:20px 28px;

  background:
    rgba(5,11,29,.88);

  backdrop-filter:
    blur(18px);

  border-bottom:
    1px solid
    rgba(139,92,255,.22);
}

.logo{
  font-size:34px;
  font-weight:900;
}

.logo span{
  background:
    linear-gradient(
      90deg,
      #a12cff,
      #087cff
    );

  -webkit-background-clip:text;
  background-clip:text;

  color:transparent;
}

.container{
  max-width:1550px;
  margin:auto;
  padding:30px 20px 70px;
}

.header{
  margin-bottom:25px;
}

.header h1{
  margin:0 0 8px;
  font-size:36px;
}

.header p{
  margin:0;
  color:#91a0c2;
}

.stats{
  display:grid;
  grid-template-columns:
    repeat(5,1fr);

  gap:14px;
  margin-bottom:25px;
}

.stat{
  padding:20px;
  border-radius:20px;

  background:
    linear-gradient(
      145deg,
      rgba(20,34,66,.92),
      rgba(10,19,40,.92)
    );

  border:
    1px solid
    rgba(111,140,205,.22);

  box-shadow:
    0 15px 40px
    rgba(0,0,0,.18);
}

.stat-number{
  display:block;
  font-size:30px;
  font-weight:900;
}

.stat-label{
  color:#8e9dbd;
  font-size:13px;
}

.panel{
  margin-bottom:25px;
  padding:25px;

  border-radius:22px;

  background:
    rgba(13,26,53,.88);

  border:
    1px solid
    rgba(111,140,205,.22);
}

.panel h2{
  margin:0 0 20px;
  font-size:23px;
}

.panel h3{
  margin-top:30px;
}

.settings{
  display:grid;
  grid-template-columns:
    repeat(2,1fr);

  gap:15px;
}

.group{
  display:flex;
  flex-direction:column;
  gap:7px;
}

.group.full{
  grid-column:1/-1;
}

.group label{
  color:#cbd7f4;
  font-size:13px;
  font-weight:700;
}

.input{
  width:100%;
  padding:12px 13px;

  border:
    1px solid
    #293d65;

  border-radius:11px;
  outline:none;

  background:#071126;
  color:#fff;
}

.input:focus{
  border-color:#8b5cff;
}

.small{
  max-width:150px;
}

.checkbox{
  display:flex;
  align-items:center;
  gap:10px;

  padding:13px;
  border-radius:11px;

  background:#071126;
}

.checkbox input{
  width:18px;
  height:18px;
}

.primary,
.add{
  margin-top:18px;

  border:0;
  padding:13px 20px;

  border-radius:11px;

  color:white;
  font-weight:800;
  cursor:pointer;

  background:
    linear-gradient(
      90deg,
      #8b2cff,
      #087cff
    );
}

.table-wrap{
  overflow:auto;

  border-radius:20px;

  border:
    1px solid
    rgba(111,140,205,.22);

  background:#0b1730;
}

table{
  width:100%;
  min-width:1400px;

  border-collapse:
    collapse;
}

th{
  padding:16px;

  text-align:left;

  color:#8e9dbd;

  font-size:12px;
  text-transform:uppercase;

  border-bottom:
    1px solid
    #263756;
}

td{
  padding:16px;

  border-bottom:
    1px solid
    #192a48;

  color:#dce5fb;

  vertical-align:
    middle;
}

tr:last-child td{
  border-bottom:0;
}

.amount{
  color:#a879ff;
  font-weight:900;
  white-space:nowrap;
}

.status{
  display:inline-block;

  padding:7px 11px;

  border-radius:999px;

  font-size:12px;
  font-weight:800;
}

.pending{
  background:#3a2d08;
  color:#ffd75c;
}

.approved{
  background:#103923;
  color:#65e99a;
}

.rejected{
  background:#42191d;
  color:#ff7d87;
}

.expired{
  background:#422417;
  color:#ffad72;
}

.timer{
  margin-bottom:8px;
}

.countdown{
  display:inline-block;

  padding:6px 10px;

  border-radius:8px;

  color:#b487ff;

  background:#071126;

  border:
    1px solid
    #3b3272;

  font-weight:900;
  font-size:12px;
}

.actions{
  display:flex;
  gap:7px;
}

.actions form{
  margin:0;
}

.actions button,
.save,
.delete,
.toggle{
  border:0;

  border-radius:9px;

  padding:9px 12px;

  color:white;

  font-weight:800;
  cursor:pointer;
}

.approve,
.save{
  background:#16834b;
}

.reject,
.delete{
  background:#a93440;
}

.toggle{
  background:#315a9b;
}

.done{
  color:#8c9ab7;
  font-size:13px;
}

.proof{
  display:inline-block;

  padding:9px 12px;

  border-radius:9px;

  color:white;
  text-decoration:none;

  font-size:12px;
  font-weight:800;

  background:
    linear-gradient(
      90deg,
      #8b2cff,
      #087cff
    );
}

.manual{
  display:flex;
  gap:8px;
  align-items:center;
  flex-wrap:wrap;
}

.manual strong{
  color:#ffad72;
  font-size:12px;
}

.manual a{
  padding:8px 10px;

  border-radius:8px;

  color:white;
  text-decoration:none;

  background:#168dcc;

  font-size:12px;
  font-weight:800;
}

.plan-actions,
.review-actions{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}

.add-plan{
  display:grid;

  grid-template-columns:
    1fr 150px 1fr auto;

  gap:10px;
  align-items:end;
}

.add-plan label{
  display:block;

  margin-bottom:7px;

  color:#aebce0;
  font-size:12px;
}

.empty{
  padding:45px;

  text-align:center;

  color:#8190b0;
}

/* =====================================================
   FEEDBACK ADMIN
===================================================== */

.feedback-add{
  display:grid;

  grid-template-columns:
    1fr 150px 1.5fr 180px auto;

  gap:12px;

  align-items:end;
}

.feedback-add label{
  display:block;

  margin-bottom:7px;

  color:#aebce0;

  font-size:12px;
}

.feedback-add .add{
  margin-top:0;
}

.admin-review-user{
  display:flex;
  align-items:center;
  gap:12px;
}

.admin-review-photo,
.admin-review-avatar{
  width:48px;
  height:48px;

  flex-shrink:0;

  border-radius:50%;

  object-fit:cover;

  border:
    2px solid
    #925cff;
}

.admin-review-avatar{
  display:flex;
  align-items:center;
  justify-content:center;

  color:white;

  font-size:20px;
  font-weight:900;

  background:
    linear-gradient(
      135deg,
      #8b2cff,
      #087cff
    );
}

.admin-stars{
  color:#ffd21f;
  font-size:18px;
}

.review-message{
  max-width:400px;
  line-height:1.5;
  color:#9eacd0;
}

.review-enabled{
  display:inline-block;

  padding:6px 10px;

  border-radius:999px;

  font-size:11px;
  font-weight:900;
}

.review-enabled.yes{
  color:#65e99a;
  background:#103923;
}

.review-enabled.no{
  color:#ff7d87;
  background:#42191d;
}

/* =====================================================
   MOBILE
===================================================== */

@media(max-width:1100px){

  .stats{
    grid-template-columns:
      repeat(3,1fr);
  }

  .feedback-add{
    grid-template-columns:
      1fr 1fr;
  }

}

@media(max-width:750px){

  .settings{
    grid-template-columns:
      1fr;
  }

  .group.full{
    grid-column:auto;
  }

  .add-plan{
    grid-template-columns:
      1fr;
  }

  .feedback-add{
    grid-template-columns:
      1fr;
  }

  .stats{
    grid-template-columns:
      repeat(2,1fr);
  }

}

@media(max-width:500px){

  .container{
    padding:
      22px
      12px
      50px;
  }

  .topbar{
    padding:18px;
  }

  .logo{
    font-size:29px;
  }

  .header h1{
    font-size:28px;
  }

  .stats{
    gap:10px;
  }

  .stat{
    padding:15px;
  }

  .stat-number{
    font-size:25px;
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
Payments, plans, feedback and website controls.
</p>

</section>

<!-- ===================================================
     STATS
=================================================== -->

<section class="stats">

<div class="stat">
<span class="stat-number">
${total}
</span>

<span class="stat-label">
Total Payments
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

</section>

<!-- ===================================================
     WEBSITE SETTINGS
=================================================== -->

<section class="panel">

<h2>
⚙️ Website Settings
</h2>

<form
  method="POST"
  action="/admin/settings/save"
  enctype="multipart/form-data"
>

<div class="settings">

<div class="group">

<label>
Telegram Link
</label>

<input
  class="input"
  type="text"
  name="telegram"
  value="${escapeHTML(
    settings.telegram
  )}"
>

</div>

<div class="group">

<label>
Contact Number
</label>

<input
  class="input"
  type="text"
  name="contactNumber"
  value="${escapeHTML(
    settings.contactNumber
  )}"
>

</div>

<div class="group">

<label>
UPI ID
</label>

<input
  class="input"
  type="text"
  name="upiId"
  value="${escapeHTML(
    settings.upiId
  )}"
>

</div>

<div class="group">

<label>
UPI QR Upload
</label>

<input
  class="input"
  type="file"
  name="qr"
  accept="image/*"
>

</div>

<div class="group full">

<label>
Free Trial
</label>

<div class="checkbox">

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
Show 1 Day Free Trial
</span>

</div>

</div>

</div>

<button class="primary">
Save Website Settings
</button>

</form>

</section>

<!-- ===================================================
     PLAN MANAGER
=================================================== -->

<section class="panel">

<h2>
📦 Plan Manager
</h2>

<div class="table-wrap">

<table style="min-width:900px">

<thead>

<tr>

<th>
Plan
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

<h3>
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
  class="input"
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
  class="input"
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
  class="input"
  name="description"
  placeholder="Premium access for 90 days."
>

</div>

<button class="add">
+ Add Plan
</button>

</form>

</section>

<!-- ===================================================
     CUSTOMER FEEDBACK MANAGER
=================================================== -->

<section class="panel">

<h2>
⭐ Customer Feedback
</h2>

<p style="color:#8e9dbd;margin-top:-10px">
Add customer reviews here. Enabled reviews will appear
automatically below the Vexora logo on the homepage.
</p>

<form
  class="feedback-add"
  method="POST"
  action="/admin/review/add"
  enctype="multipart/form-data"
>

<div>

<label>
Customer Name
</label>

<input
  class="input"
  name="name"
  placeholder="Rahul"
  required
>

</div>

<div>

<label>
Rating
</label>

<select
  class="input"
  name="rating"
  required
>

<option value="5">
★★★★★ 5
</option>

<option value="4">
★★★★☆ 4
</option>

<option value="3">
★★★☆☆ 3
</option>

<option value="2">
★★☆☆☆ 2
</option>

<option value="1">
★☆☆☆☆ 1
</option>

</select>

</div>

<div>

<label>
Feedback Message
</label>

<input
  class="input"
  name="message"
  placeholder="Excellent service..."
  required
>

</div>

<div>

<label>
Customer Photo
</label>

<input
  class="input"
  type="file"
  name="photo"
  accept="image/*"
>

</div>

<button class="add">
+ Add Feedback
</button>

</form>

<br>

<div class="table-wrap">

<table style="min-width:1000px">

<thead>

<tr>

<th>
Customer
</th>

<th>
Rating
</th>

<th>
Message
</th>

<th>
Visibility
</th>

<th>
Action
</th>

</tr>

</thead>

<tbody>

${
  reviewRows ||
  `
<tr>

<td
  colspan="5"
  class="empty"
>
No feedback added yet.
</td>

</tr>
`
}

</tbody>

</table>

</div>

</section>

<!-- ===================================================
     PAYMENT DASHBOARD
=================================================== -->

<section class="panel">

<h2>
💳 Payment Submissions
</h2>

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

</section>

</main>

<script>

function updateTimers(){

  let reload = false;

  document
    .querySelectorAll(
      ".countdown"
    )
    .forEach(
      el => {

        const expiry =
          new Date(
            el.dataset.expiry
          ).getTime();

        const remaining =
          Math.max(
            0,
            expiry -
            Date.now()
          );

        const seconds =
          Math.ceil(
            remaining /
            1000
          );

        const minutes =
          Math.floor(
            seconds /
            60
          );

        const sec =
          seconds % 60;

        el.textContent =
          String(minutes)
            .padStart(
              2,
              "0"
            ) +
          ":" +
          String(sec)
            .padStart(
              2,
              "0"
            );

        if(
          remaining <= 0
        ){

          reload = true;

        }

      }
    );

  if(reload){

    location.reload();

  }

}

updateTimers();

setInterval(
  updateTimers,
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
      String(
        req.body.telegram || ""
      ).trim();

    settings.contactNumber =
      String(
        req.body.contactNumber || ""
      ).trim();

    settings.upiId =
      String(
        req.body.upiId || ""
      ).trim();

    settings.freeTrialEnabled =
      req.body.freeTrialEnabled ===
      "1";

    if(req.file){

      settings.qrImage =
        "/uploads/" +
        req.file.filename;

      settings.paymentQrs.upi =
        settings.qrImage;

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
        req.body.name || ""
      ).trim();

    const amount =
      Math.max(
        0,
        Number(
          req.body.amount || 0
        )
      );

    const description =
      String(
        req.body.description || ""
      ).trim();

    if(!name){

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

    if(!id){

      id =
        "plan-" +
        Date.now();

    }

    const originalId =
      id;

    let counter = 2;

    while(
      settings.plans.some(
        p =>
          p.id === id
      )
    ){

      id =
        originalId +
        "-" +
        counter;

      counter++;

    }

    settings.plans.push({

      id,
      name,
      amount,
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

    if(plan){

      const name =
        String(
          req.body.planName ||
          ""
        ).trim();

      if(name){

        plan.name =
          name;

      }

      plan.amount =
        Math.max(
          0,
          Number(
            req.body.planAmount ||
            0
          )
        );

      plan.description =
        String(
          req.body.planDescription ||
          ""
        ).trim();

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
        p =>
          p.id !==
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
// ADD CUSTOMER FEEDBACK
// ======================================================

app.post(
  "/admin/review/add",
  upload.single("photo"),
  (req, res) => {

    const name =
      String(
        req.body.name || ""
      ).trim();

    const message =
      String(
        req.body.message || ""
      ).trim();

    const rating =
      Math.min(
        5,
        Math.max(
          1,
          Number(
            req.body.rating || 5
          )
        )
      );

    if(
      !name ||
      !message
    ){

      return res.redirect(
        "/admin"
      );

    }

    const review = {

      id:
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .slice(2,8),

      name,

      message,

      rating,

      photo:
        req.file
          ? "/uploads/" +
            req.file.filename
          : "",

      enabled:
        true,

      createdAt:
        new Date().toISOString()

    };

    const reviews =
      getReviews();

    reviews.unshift(
      review
    );

    saveReviews(
      reviews
    );

    res.redirect(
      "/admin"
    );

  }
);

// ======================================================
// TOGGLE CUSTOMER FEEDBACK
// ======================================================

app.post(
  "/admin/review/:id/toggle",
  (req, res) => {

    const reviews =
      getReviews();

    const review =
      reviews.find(
        r =>
          r.id ===
          req.params.id
      );

    if(review){

      review.enabled =
        review.enabled === false;

      saveReviews(
        reviews
      );

    }

    res.redirect(
      "/admin"
    );

  }
);

// ======================================================
// DELETE CUSTOMER FEEDBACK
// ======================================================

app.post(
  "/admin/review/:id/delete",
  (req, res) => {

    const reviews =
      getReviews();

    const review =
      reviews.find(
        r =>
          r.id ===
          req.params.id
      );

    const remaining =
      reviews.filter(
        r =>
          r.id !==
          req.params.id
      );

    saveReviews(
      remaining
    );

    /*
      Delete uploaded customer photo
      when feedback is deleted.
    */

    if(
      review &&
      review.photo &&
      review.photo.startsWith(
        "/uploads/"
      )
    ){

      const photoPath =
        path.join(
          publicDir,
          review.photo
            .replace(
              /^\/+/,
              ""
            )
        );

      try{

        if(
          fs.existsSync(
            photoPath
          )
        ){

          fs.unlinkSync(
            photoPath
          );

        }

      }catch(error){

        console.error(
          "Review photo delete error:",
          error
        );

      }

    }

    res.redirect(
      "/admin"
    );

  }
);

// ======================================================
// APPROVE PAYMENT
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

    if(
      payment &&
      payment.status ===
      "Pending" &&
      !isExpired(payment)
    ){

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
// REJECT PAYMENT
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

    if(
      payment &&
      payment.status ===
      "Pending" &&
      !isExpired(payment)
    ){

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
