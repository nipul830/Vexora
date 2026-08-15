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

const dataDir = path.join(__dirname, "data");
const publicDir = path.join(__dirname, "public");
const uploadDir = path.join(publicDir, "uploads");
const settingsFile = path.join(dataDir, "settings.json");
const paymentsFile = path.join(dataDir, "payments.json");

const DEFAULT_SETTINGS = {
  site: {
    whatsapp: "916371406885",
    telegram: "https://t.me/Jkhub_premium"
  },

  plans: [
    {
      id: "1day-free",
      name: "1 Day Free",
      amount: 0,
      displayAmount: "FREE",
      description: "Try Vexora for 1 day.",
      free: true,
      hidden: false
    },

    {
      id: "7days",
      name: "7 Days",
      amount: 999,
      displayAmount: "₹999",
      description: "Premium Vexora access for 7 days.",
      free: false,
      hidden: false
    },

    {
      id: "15days",
      name: "15 Days",
      amount: 1499,
      displayAmount: "₹1,499",
      description: "Premium Vexora access for 15 days.",
      free: false,
      hidden: false
    },

    {
      id: "30days",
      name: "30 Days",
      amount: 2499,
      displayAmount: "₹2,499",
      description: "Premium Vexora access for 30 days.",
      free: false,
      hidden: false
    },

    {
      id: "lifetime",
      name: "Lifetime",
      amount: 11000,
      displayAmount: "₹11,000",
      description: "Lifetime Vexora premium access.",
      free: false,
      hidden: false
    }
  ],

  payments: {
    upi: {
      title: "UPI / PhonePe",
      description: "Tap to show the UPI QR.",
      address: "+91 70676 03886",
      note: "UPI / PhonePe contact",
      qr: "/assets/upi-phonepe.jpg"
    },

    trc20: {
      title: "USDT — TRC20",
      description: "Tap to show the TRC20 QR.",
      address: "TGnAWoHjXizow51pMuwhwKiboYy22DC2bJ",
      note: "USDT network: TRC20",
      qr: "/assets/usdt-trc20.jpg"
    },

    bep20: {
      title: "USDT — BEP20",
      description: "Tap to show the BEP20 QR.",
      address: "0x4ab23A898208485D2bDa4C34D28C57649C1752fD",
      note: "USDT network: BEP20",
      qr: "/assets/usdt-bep20.jpg"
    },

    eth: {
      title: "ETH — ERC20",
      description: "Tap to show the ERC20 QR.",
      address: "0x4ab23A898208485D2bDa4C34D28C57649C1752fD",
      note: "ETH network: ERC20",
      qr: "/assets/eth-erc20.jpg"
    }
  }
};


// ======================================================
// DIRECTORIES
// ======================================================

fs.mkdirSync(uploadDir, {
  recursive: true
});

fs.mkdirSync(dataDir, {
  recursive: true
});


if (!fs.existsSync(paymentsFile)) {
  fs.writeFileSync(
    paymentsFile,
    "[]",
    "utf8"
  );
}


// ======================================================
// SETTINGS HELPERS
// ======================================================

function clone(obj) {
  return JSON.parse(
    JSON.stringify(obj)
  );
}


function saveSettings(settings) {

  fs.writeFileSync(
    settingsFile,
    JSON.stringify(
      settings,
      null,
      2
    ),
    "utf8"
  );

}


function loadSettings() {

  try {

    if (!fs.existsSync(settingsFile)) {

      saveSettings(
        clone(DEFAULT_SETTINGS)
      );

    }


    const data =
      JSON.parse(
        fs.readFileSync(
          settingsFile,
          "utf8"
        )
      );


    return {

      ...clone(
        DEFAULT_SETTINGS
      ),

      ...data,

      site: {
        ...clone(
          DEFAULT_SETTINGS
        ).site,

        ...(data.site || {})
      },

      plans:
        Array.isArray(data.plans)
          ? data.plans
          : clone(
              DEFAULT_SETTINGS.plans
            ),

      payments: {
        ...clone(
          DEFAULT_SETTINGS
        ).payments,

        ...(data.payments || {})
      }

    };

  } catch (error) {

    console.error(
      "Could not read settings:",
      error
    );

    return clone(
      DEFAULT_SETTINGS
    );

  }

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

    return data.trim()
      ? JSON.parse(data)
      : [];

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
// GENERAL HELPERS
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


function slugify(value) {

  return String(value || "")

    .toLowerCase()

    .trim()

    .replace(
      /[^a-z0-9]+/g,
      "-"
    )

    .replace(
      /^-+|-+$/g,
      ""
    )

    .slice(
      0,
      50
    );

}


function formatINR(value) {

  const n =
    Number(value);


  return Number.isFinite(n)
    ? n.toLocaleString("en-IN")
    : "0";

}


function getPlan(
  settings,
  id
) {

  return settings.plans.find(
    p =>
      p.id === id &&
      !p.hidden
  );

}


function telegramLink(value) {

  const raw =
    String(value || "")
      .trim();


  if (!raw) {
    return "";
  }


  if (
    /^https?:\/\//i.test(raw)
  ) {

    return raw;

  }


  return (
    "https://t.me/" +
    raw.replace(
      /^@/,
      ""
    )
  );

}


function whatsappLink(
  number,
  message
) {

  const clean =
    String(number || "")
      .replace(
        /\D/g,
        ""
      );


  const text =
    encodeURIComponent(
      message || ""
    );


  return (
    `https://wa.me/${clean}` +
    (
      text
        ? `?text=${text}`
        : ""
    )
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


  if (
    Number.isNaN(time)
  ) {

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

  return (
    payment.status ===
    "Pending" &&
    getRemainingMs(payment) <=
    0
  );

}


function updateExpiredPayments() {

  const payments =
    getPayments();


  let changed =
    false;


  payments.forEach(
    payment => {

      if (
        payment.status ===
        "Pending" &&
        getRemainingMs(payment) <=
        0
      ) {

        payment.status =
          "Expired";

        payment.expiredAt =
          new Date()
            .toISOString();

        changed =
          true;

      }

    }
  );


  if (changed) {

    savePayments(
      payments
    );

  }


  return payments;

}


function formatAdminTime(ms) {

  const total =
    Math.max(
      0,
      Math.ceil(
        ms / 1000
      )
    );


  const min =
    Math.floor(
      total / 60
    );


  const sec =
    total % 60;


  return (
    String(min)
      .padStart(2, "0") +
    ":" +
    String(sec)
      .padStart(2, "0")
  );

}


// ======================================================
// FILE UPLOAD
// ======================================================

const storage =
  multer.diskStorage({

    destination(
      req,
      file,
      cb
    ) {

      cb(
        null,
        uploadDir
      );

    },


    filename(
      req,
      file,
      cb
    ) {

      const ext =
        path.extname(
          file.originalname
        ).toLowerCase();


      const prefix =
        file.fieldname ===
        "qr"
          ? "qr-"
          : "proof-";


      cb(
        null,

        prefix +
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .substring(2, 8) +
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
    },

    fileFilter(
      req,
      file,
      cb
    ) {

      if (
        file.fieldname === "qr" ||
        file.fieldname === "proof"
      ) {

        if (
          file.mimetype &&
          file.mimetype.startsWith(
            "image/"
          )
        ) {

          return cb(
            null,
            true
          );

        }


        return cb(
          new Error(
            "Only image files are allowed."
          )
        );

      }


      cb(
        null,
        true
      );

    }

  });


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

app.use(
  express.static(
    publicDir
  )
);


// ======================================================
// CUSTOMER: PLANS
// ======================================================

app.get(
  "/plans",
  (req, res) => {

    const settings =
      loadSettings();


    const visiblePlans =
      settings.plans.filter(
        p => !p.hidden
      );


    const cards =
      visiblePlans.map(
        plan => {

          const free =
            Number(plan.amount) === 0 ||
            plan.free;


          const link =
            free

              ? whatsappLink(
                  settings.site.whatsapp,
                  `Hi Vexora, I want the ${plan.name} plan.`
                )

              : `/payment?plan=${encodeURIComponent(
                  plan.id
                )}`;


          return `

<div
  class="plan
    ${free ? "free" : ""}
    ${plan.id === "lifetime" ? "lifetime" : ""}"
>

  <h2>
    ${escapeHTML(
      plan.name
    )}
  </h2>


  <div class="price">
    ${escapeHTML(
      plan.displayAmount ||
      (
        free
          ? "FREE"
          : "₹" +
            formatINR(
              plan.amount
            )
      )
    )}
  </div>


  <p>
    ${escapeHTML(
      plan.description
    )}
  </p>


  <a
    class="btn"
    href="${escapeHTML(
      link
    )}"
    ${
      free
        ? 'target="_blank" rel="noopener"'
        : ""
    }
  >
    ${
      free
        ? "Get " +
          escapeHTML(
            plan.name
          )
        : "Select Plan"
    }
  </a>

</div>

`;

        }
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
  Vexora — Plans
</title>

<style>

*{
  box-sizing:border-box
}

body{
  margin:0;
  font-family:Arial,Helvetica,sans-serif;
  color:#f5f7ff;
  background:#070d1d;
}

a{
  text-decoration:none
}

.topbar{
  height:90px;
  display:flex;
  align-items:center;
  padding:0 28px;
  background:#080d1b;
  border-bottom:1px solid #202c49;
}

.logo{
  font-size:36px;
  font-weight:800;
}

.logo span{
  color:#8b5cff
}

.container{
  max-width:950px;
  margin:auto;
  padding:35px 20px 60px;
}

.hero{
  text-align:center;
  padding:20px 10px 35px;
}

.hero h1{
  font-size:48px;
  margin-bottom:15px;
}

.hero p{
  color:#9eaccb;
  font-size:18px;
  line-height:1.6;
}

.plans{
  display:grid;
  grid-template-columns:
    repeat(2,1fr);
  gap:18px;
}

.plan{
  background:#101a31;
  border:1px solid #29395b;
  border-radius:22px;
  padding:28px;
}

.plan.free{
  border-color:#28875d;
}

.plan.lifetime{
  border-color:#8b5cff;
}

.plan h2{
  margin:0 0 10px;
  font-size:25px;
}

.price{
  font-size:38px;
  font-weight:800;
  margin:15px 0;
  color:#a879ff;
}

.plan p{
  min-height:55px;
  color:#9eaccb;
  line-height:1.6;
}

.btn{
  display:block;
  text-align:center;
  padding:16px;
  border-radius:14px;
  background:
    linear-gradient(
      90deg,
      #8b35ff,
      #147cff
    );
  color:white;
  font-weight:800;
  margin-top:20px;
}

.free .btn{
  background:#168653;
}

.support{
  text-align:center;
  margin-top:35px;
}

.support p{
  color:#9eaccb;
}

@media(max-width:650px){

  .plans{
    grid-template-columns:1fr;
  }

  .hero h1{
    font-size:39px;
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
  Select your preferred
  Vexora membership plan.
</p>

</section>

<section class="plans">

${
  cards ||
  "<p>No plans available.</p>"
}

</section>

<section class="support">

<p>
  Need help with a plan?
</p>

<a
  class="btn"
  href="${escapeHTML(
    whatsappLink(
      settings.site.whatsapp,
      "Hi Vexora, I need help with a plan."
    )
  )}"
  target="_blank"
  rel="noopener"
>
  WhatsApp Support
</a>

</section>

</main>

</body>

</html>

`);

  }
);


// ================= PART 1 END =================
// ======================================================
// CUSTOMER: PAYMENT PAGE
// ======================================================

app.get(
  "/payment",
  (req, res) => {

    const settings =
      loadSettings();

    const plan =
      getPlan(
        settings,
        req.query.plan
      );


    if (!plan) {

      return res.redirect(
        "/plans"
      );

    }


    const methods =
      Object.entries(
        settings.payments
      );


    const methodCards =
      methods.map(
        ([id, method]) => `

<div
  class="card payment-method"
  onclick="showQR('${escapeHTML(id)}',this)"
>

  <h2>
    ${escapeHTML(
      method.title
    )}
  </h2>

  <p>
    ${escapeHTML(
      method.description
    )}
  </p>


  <div
    id="${escapeHTML(id)}"
    class="qr-box"
  >

    <div
      class="payment-address"
      id="${escapeHTML(id)}-address"
    >
      ${escapeHTML(
        method.address
      )}
    </div>


    <div class="payment-note">
      ${escapeHTML(
        method.note
      )}
    </div>


    <img
      src="${escapeHTML(
        method.qr
      )}?v=${Date.now()}"
      alt="${escapeHTML(
        method.title
      )} QR"
    >


    <div class="qr-actions">

      <button
        type="button"
        class="copy-btn"
        onclick="copyAddress(
          event,
          '${escapeHTML(id)}-address',
          '${escapeHTML(id)}-status'
        )"
      >
        📋 Copy
      </button>


      <a
        class="download-btn"
        href="${escapeHTML(
          method.qr
        )}"
        download
        onclick="event.stopPropagation()"
      >
        ↓ Download QR
      </a>


      <span
        id="${escapeHTML(id)}-status"
        class="copy-status"
      ></span>

    </div>

  </div>

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

<title>
  Vexora Payment
</title>

<style>

*{
  box-sizing:border-box;
}

html,body{
  margin:0;
  padding:0;
  min-height:100%;
  background:#050b1c;
  color:#f4f7ff;
  font-family:
    Arial,
    Helvetica,
    sans-serif;
}

body{
  min-height:100vh;
}

.topbar{
  width:100%;
  padding:22px 32px;
  background:#071025;
  border-bottom:
    1px solid
    rgba(139,92,255,.25);
}

.logo{
  font-size:40px;
  font-weight:800;
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
  width:100%;
  max-width:900px;
  margin:0 auto;
  padding:30px 18px 60px;
}

.hero-small{
  text-align:center;
  padding:20px 10px 30px;
}

.hero-small h1{
  margin:0 0 12px;
  font-size:42px;
}

.hero-small p{
  margin:0;
  color:#9eacd0;
  font-size:18px;
  line-height:1.6;
}

.selected-plan{
  margin-bottom:20px;
  padding:20px;
  text-align:center;
  background:#0c1830;
  border:
    1px solid
    rgba(139,92,255,.35);
  border-radius:20px;
}

.selected-label{
  color:#9eacd0;
  font-size:14px;
}

.selected-name{
  margin-top:6px;
  font-size:23px;
  font-weight:800;
}

.selected-amount{
  margin-top:5px;
  color:#a879ff;
  font-size:30px;
  font-weight:800;
}

.card{
  background:#0c1830;
  border:
    1px solid
    rgba(96,125,180,.30);
  border-radius:24px;
  padding:28px;
  margin-bottom:20px;
}

.payment-method{
  cursor:pointer;
  transition:.2s ease;
}

.payment-method:hover{
  border-color:
    rgba(139,92,255,.55);
}

.payment-method.active{
  border-color:#8b5cff;
  box-shadow:
    0 0 0 2px
    rgba(139,92,255,.25);
}

.payment-method h2{
  margin:0 0 10px;
  font-size:28px;
}

.payment-method p{
  margin:0;
  color:#9eacd0;
  font-size:17px;
  line-height:1.5;
}

.qr-box{
  display:none;
  margin-top:20px;
  text-align:center;
}

.qr-box.show{
  display:block;
}

.qr-box img{
  width:100%;
  max-width:360px;
  height:auto;
  display:block;
  margin:15px auto;
  border-radius:14px;
  background:#fff;
}

.payment-address{
  margin-top:15px;
  padding:14px;
  border:
    1px solid
    rgba(139,92,255,.35);
  border-radius:12px;
  background:#070f22;
  color:#dce5ff;
  font-size:14px;
  line-height:1.5;
  word-break:break-all;
  user-select:text;
  text-align:left;
}

.payment-note{
  margin-top:10px;
  color:#9eacd0;
  font-size:13px;
}

.qr-actions{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:10px;
  margin-top:12px;
  flex-wrap:wrap;
}

.copy-btn,
.download-btn{
  border:0;
  border-radius:12px;
  padding:12px 18px;
  font-size:14px;
  font-weight:700;
  cursor:pointer;
  text-decoration:none;
  display:inline-flex;
  align-items:center;
  justify-content:center;
}

.copy-btn{
  background:
    linear-gradient(
      135deg,
      #8b2cff,
      #087cff
    );
  color:#fff;
}

.download-btn{
  background:#17243d;
  color:#fff;
  border:
    1px solid
    rgba(139,92,255,.45);
}

.copy-status{
  display:block;
  width:100%;
  min-height:20px;
  color:#72f0a3;
  font-size:13px;
  font-weight:600;
}

.continue-btn{
  display:block;
  width:100%;
  margin-top:25px;
  padding:17px 20px;
  text-align:center;
  text-decoration:none;
  border-radius:16px;
  background:
    linear-gradient(
      90deg,
      #9b2cff,
      #087cff
    );
  color:#fff;
  font-size:18px;
  font-weight:700;
}

@media(max-width:520px){

  .topbar{
    padding:18px 20px;
  }

  .logo{
    font-size:34px;
  }

  .container{
    padding:20px 14px 50px;
  }

  .hero-small h1{
    font-size:32px;
  }

  .card{
    padding:20px;
    border-radius:20px;
  }

  .qr-actions{
    flex-direction:column;
  }

  .copy-btn,
  .download-btn{
    width:100%;
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

<section class="hero-small">

<h1>
  Complete Your Payment
</h1>

<p>
  Select a payment method and
  tap to show the QR.
</p>

</section>


<div class="selected-plan">

<div class="selected-label">
  Selected Plan
</div>

<div class="selected-name">
  ${escapeHTML(
    plan.name
  )}
</div>

<div class="selected-amount">
  ${
    Number(plan.amount) === 0
      ? "FREE"
      : "₹" +
        formatINR(
          plan.amount
        )
  }
</div>

</div>


<section>

${methodCards}

</section>


<a
  class="continue-btn"
  href="/submit?plan=${encodeURIComponent(
    plan.id
  )}"
>
  I Have Paid — Continue
</a>


</main>


<script>

function showQR(
  id,
  el
) {

  document
    .querySelectorAll(
      ".qr-box"
    )
    .forEach(
      function(box) {

        box.classList.remove(
          "show"
        );

      }
    );


  document
    .querySelectorAll(
      ".payment-method"
    )
    .forEach(
      function(card) {

        card.classList.remove(
          "active"
        );

      }
    );


  const selected =
    document.getElementById(id);


  if (selected) {

    selected.classList.add(
      "show"
    );

  }


  el.classList.add(
    "active"
  );

}


function copyAddress(
  event,
  elementId,
  statusId
) {

  event.stopPropagation();


  const element =
    document.getElementById(
      elementId
    );


  const status =
    document.getElementById(
      statusId
    );


  if (!element) {
    return;
  }


  const text =
    element.innerText.trim();


  function copied() {

    if (status) {

      status.textContent =
        "✓ Copied!";


      setTimeout(
        function() {

          status.textContent =
            "";

        },
        2000
      );

    }

  }


  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {

    navigator.clipboard
      .writeText(text)
      .then(copied)
      .catch(
        function() {

          fallbackCopy(
            text,
            copied
          );

        }
      );

  } else {

    fallbackCopy(
      text,
      copied
    );

  }

}


function fallbackCopy(
  text,
  callback
) {

  const textarea =
    document.createElement(
      "textarea"
    );


  textarea.value =
    text;


  textarea.style.position =
    "fixed";

  textarea.style.left =
    "-9999px";


  document.body.appendChild(
    textarea
  );


  textarea.focus();
  textarea.select();


  try {

    document.execCommand(
      "copy"
    );

    callback();

  } catch (error) {

    alert(
      "Address copy nahi hua. Long press karke copy karein."
    );

  }


  document.body.removeChild(
    textarea
  );

}

</script>

</body>

</html>

`);

  }
);


// ======================================================
// CUSTOMER: SUBMIT PAGE
// ======================================================

app.get(
  "/submit",
  (req, res) => {

    const settings =
      loadSettings();


    const plan =
      getPlan(
        settings,
        req.query.plan
      );


    if (!plan) {

      return res.redirect(
        "/plans"
      );

    }


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
  Submit Payment Details
</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  background:#050b1c;
  color:#eef3ff;
  font-family:
    Arial,
    Helvetica,
    sans-serif;
}

.topbar{
  padding:22px 32px;
  background:#050b1c;
  border-bottom:
    1px solid
    rgba(139,92,255,.18);
}

.logo{
  color:#fff;
  font-size:32px;
  font-weight:800;
}

.logo span{
  background:
    linear-gradient(
      90deg,
      #9b35ff,
      #087cff
    );
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
}

.container{
  width:100%;
  max-width:700px;
  margin:auto;
  padding:30px 18px 60px;
}

.hero-small{
  text-align:center;
  padding:20px 10px 30px;
}

.hero-small h1{
  color:#f4f7ff;
}

.hero-small p{
  color:#9eacd0;
  line-height:1.6;
}

.card{
  background:#0d1a35;
  border:
    1px solid
    rgba(125,153,220,.25);
  border-radius:28px;
  padding:28px;
}

.selected-plan{
  margin-bottom:25px;
  padding:18px;
  text-align:center;
  border-radius:16px;
  background:#071126;
  border:
    1px solid
    rgba(139,92,255,.30);
}

.selected-label{
  color:#9eacd0;
  font-size:13px;
}

.selected-name{
  margin-top:5px;
  font-size:22px;
  font-weight:800;
}

.selected-amount{
  margin-top:5px;
  color:#a879ff;
  font-size:28px;
  font-weight:800;
}

label{
  display:block;
  color:#dce6ff;
  font-size:17px;
  font-weight:700;
  margin-top:22px;
  margin-bottom:9px;
}

input[type="text"],
input[type="file"]{
  width:100%;
  padding:16px 18px;
  border-radius:16px;
  border:
    1px solid
    rgba(125,153,220,.28);
  background:#050c20;
  color:#fff;
  font-size:16px;
  outline:none;
}

input:focus{
  border-color:#8b5cff;
  box-shadow:
    0 0 0 2px
    rgba(139,92,255,.15);
}

input::placeholder{
  color:#687696;
}

.utr-guide{
  margin:8px 0 14px;
}

.utr-guide summary{
  color:#a56bff;
  font-size:15px;
  font-weight:700;
  cursor:pointer;
}

.utr-guide-text{
  color:#9eacd0;
  font-size:14px;
  line-height:1.6;
}

.utr-guide-image{
  width:100%;
  max-width:430px;
  display:block;
  margin:12px auto;
  border-radius:16px;
  border:
    1px solid
    rgba(139,92,255,.4);
}

.btn{
  width:100%;
  border:0;
  border-radius:18px;
  padding:17px 20px;
  margin-top:25px;
  color:#fff;
  font-size:17px;
  font-weight:800;
  cursor:pointer;
  background:
    linear-gradient(
      90deg,
      #9b2cff,
      #5b55ff,
      #087cff
    );
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

<section class="hero-small">

<h1>
  Submit Payment Details
</h1>

<p>
  Payment complete karne ke baad
  apni details submit karein.
</p>

</section>


<section class="card">


<div class="selected-plan">

<div class="selected-label">
  Selected Plan
</div>

<div class="selected-name">
  ${escapeHTML(
    plan.name
  )}
</div>

<div class="selected-amount">
  ${
    Number(plan.amount) === 0
      ? "FREE"
      : "₹" +
        formatINR(
          plan.amount
        )
  }
</div>

</div>


<form
  action="/submit-payment"
  method="POST"
  enctype="multipart/form-data"
>


<input
  type="hidden"
  name="plan"
  value="${escapeHTML(
    plan.name
  )}"
>


<input
  type="hidden"
  name="amount"
  value="${escapeHTML(
    plan.amount
  )}"
>


<label
  for="transactionId"
>
  UTR / Transaction ID
</label>


<details class="utr-guide">

<summary>
  How to find UTR?
</summary>

<p class="utr-guide-text">
  PhonePe payment complete hone ke
  baad Transaction Details me UTR
  number dekhein.
</p>

<img
  src="/assets/utr-guide.jpg"
  alt="How to find UTR"
  class="utr-guide-image"
>

</details>


<input
  id="transactionId"
  type="text"
  name="transactionId"
  placeholder="Enter UTR / Transaction ID"
  inputmode="numeric"
  autocomplete="off"
  required
>


<label
  for="tradingview"
>
  TradingView Username
</label>

<input
  id="tradingview"
  type="text"
  name="tradingview"
  placeholder="@username or username"
  required
>


<label
  for="telegram"
>
  Telegram Username
</label>

<input
  id="telegram"
  type="text"
  name="telegram"
  placeholder="@username"
  required
>


<label
  for="proof"
>
  Payment Proof / Screenshot
</label>

<input
  id="proof"
  type="file"
  name="proof"
  accept="image/*"
  required
>


<button
  class="btn"
  type="submit"
>
  Submit Payment Details
</button>


</form>

</section>

</main>

</body>

</html>

`);

  }
);


// ======================================================
// SUBMIT PAYMENT
// ======================================================

app.post(
  "/submit-payment",
  upload.single("proof"),
  (req, res) => {

    const settings =
      loadSettings();


    const plan =
      settings.plans.find(
        p =>
          p.name ===
          req.body.plan
      );


    const createdAt =
      new Date()
        .toISOString();


    const payment = {

      id:
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .substring(2,8),

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
          new Date(createdAt)
            .getTime() +
          REVIEW_TIME_MS
        ).toISOString()

    };


    if (
      plan &&
      Number.isFinite(
        Number(plan.amount)
      )
    ) {

      payment.amount =
        String(
          plan.amount
        );

    }


    const payments =
      getPayments();


    payments.unshift(
      payment
    );


    savePayments(
      payments
    );


    const telegram =
      telegramLink(
        settings.site.telegram
      );


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
  color:#f4f7ff;
}

.success-card{
  width:100%;
  max-width:430px;
  padding:40px 28px;
  text-align:center;
  border-radius:24px;
  background:#0d1a36;
  border:
    1px solid
    rgba(139,92,255,.35);
  box-shadow:
    0 20px 60px
    rgba(0,0,0,.35);
}

.success-icon{
  width:70px;
  height:70px;
  margin:0 auto 22px;
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:38px;
  font-weight:bold;
  background:
    linear-gradient(
      135deg,
      #8b2cff,
      #087cff
    );
}

h1{
  margin:0 0 14px;
  font-size:27px;
}

.plan{
  margin-top:15px;
  padding:16px;
  border-radius:14px;
  background:#071126;
  border:
    1px solid
    rgba(139,92,255,.30);
}

.plan-label{
  color:#9eacd0;
  font-size:13px;
}

.plan-name{
  margin-top:5px;
  font-size:21px;
  font-weight:800;
}

.amount{
  margin-top:5px;
  color:#a879ff;
  font-size:27px;
  font-weight:800;
}

.message{
  margin:20px 0 15px;
  color:#a9b8dc;
  font-size:16px;
  line-height:1.6;
}

.timer-label{
  color:#9eacd0;
  font-size:13px;
  margin-top:18px;
}

.timer{
  margin-top:6px;
  font-size:32px;
  font-weight:800;
}

.timer.expired{
  color:#ff7d87;
}

.manual-review{
  display:none;
  margin-top:18px;
  padding:16px;
  border-radius:15px;
  background:#27181a;
  border:
    1px solid
    rgba(255,100,110,.30);
}

.manual-review h2{
  margin:0 0 8px;
  font-size:18px;
  color:#ff9aa3;
}

.manual-review p{
  margin:0 0 14px;
  color:#c5cad8;
  font-size:14px;
  line-height:1.5;
}

.telegram-btn{
  display:block;
  width:100%;
  padding:14px;
  border-radius:12px;
  text-decoration:none;
  color:white;
  font-weight:800;
  background:#168dcc;
}

.ok-btn{
  width:100%;
  border:0;
  border-radius:14px;
  padding:16px 20px;
  margin-top:22px;
  font-size:18px;
  font-weight:700;
  color:white;
  cursor:pointer;
  background:
    linear-gradient(
      135deg,
      #8b2cff,
      #087cff
    );
}

.status-message{
  display:none;
  margin-top:18px;
  padding:14px;
  border-radius:13px;
  font-weight:700;
}

.status-approved{
  background:#103923;
  color:#65e99a;
}

.status-rejected{
  background:#42191d;
  color:#ff7d87;
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
  ₹${formatINR(
    payment.amount
  )}
</div>

</div>


<p class="message">

Your payment request has been
submitted successfully. Please wait
while we verify your payment.

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

${
  telegram
    ? `
<a
  class="telegram-btn"
  href="${escapeHTML(
    telegram
  )}"
  target="_blank"
  rel="noopener"
>
  Contact on Telegram
</a>
`
    : ""
}

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


let finished =
false;


function formatTime(ms){

const total =
Math.max(
  0,
  Math.ceil(
    ms / 1000
  )
);

const minutes =
Math.floor(
  total / 60
);

const seconds =
total % 60;

return (
  String(minutes)
    .padStart(2,"0") +
  ":" +
  String(seconds)
    .padStart(2,"0")
);

}


function showExpired(){

timer.textContent =
"00:00";

timer.classList.add(
"expired"
);

manualReview.style.display =
"block";

}


function showStatus(status){

if(
status ===
"Approved"
){

finished =
true;

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


if(
status ===
"Rejected"
){

finished =
true;

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


if(
status ===
"Expired"
){

finished =
true;

showExpired();

}

}


async function checkStatus(){

if(finished){
return;
}

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

if(!response.ok){
return;
}

const data =
await response.json();

showStatus(
data.status
);

}catch(error){

console.error(
"Status check failed:",
error
);

}

}


function updateTimer(){

if(finished){
return;
}

const remaining =
new Date(
expiresAt
).getTime() -
Date.now();

if(
remaining <= 0
){

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


// ================= PART 2 END =================
// ======================================================
// ADMIN DASHBOARD
// ======================================================

app.get(
  "/admin",
  (req, res) => {

    const payments =
      updateExpiredPayments();

    const settings =
      loadSettings();


    const rows =
      payments.map(
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

            actionHTML = `

<div class="admin-timer">

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

          }

          else if (
            payment.status ===
            "Expired"
          ) {

            const telegram =
              telegramLink(
                settings.site.telegram
              );


            actionHTML = `

<div class="manual-admin">

<strong>
  Manual Review
</strong>

${
  telegram
    ? `
<a
  href="${escapeHTML(
    telegram
  )}"
  target="_blank"
  rel="noopener"
>
  Telegram
</a>
`
    : ""
}

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

${
  payment.status ===
  "Rejected" &&
  settings.site.telegram
    ? `
<a
  class="rejected-telegram"
  href="${escapeHTML(
    telegramLink(
      settings.site.telegram
    )
  )}"
  target="_blank"
  rel="noopener"
>
  Contact Telegram
</a>
`
    : ""
}

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
₹${formatINR(
  payment.amount
)}
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
background:#050b1d;
color:#f4f7ff;
}

.topbar{
padding:22px 28px;
background:#071025;
border-bottom:
1px solid
rgba(139,92,255,.25);
}

.logo{
font-size:34px;
font-weight:800;
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
width:100%;
max-width:1500px;
margin:auto;
padding:30px 20px 60px;
}

.header{
display:flex;
justify-content:space-between;
align-items:center;
gap:15px;
flex-wrap:wrap;
margin-bottom:25px;
}

.header h1{
margin:0 0 8px;
font-size:34px;
}

.header p{
margin:0;
color:#9eacd0;
}

.settings-btn{
display:inline-block;
padding:13px 18px;
border-radius:12px;
background:
linear-gradient(
90deg,
#8b2cff,
#087cff
);
color:#fff;
font-weight:800;
text-decoration:none;
}

.stats{
display:flex;
gap:14px;
flex-wrap:wrap;
margin-bottom:25px;
}

.stat{
min-width:150px;
padding:20px;
border-radius:18px;
background:#0d1a35;
border:
1px solid
rgba(125,153,220,.25);
}

.stat-number{
display:block;
font-size:28px;
font-weight:800;
}

.stat-label{
color:#9eacd0;
font-size:14px;
}

.table-wrap{
overflow-x:auto;
background:#0d1a35;
border:
1px solid
rgba(125,153,220,.25);
border-radius:20px;
}

table{
width:100%;
border-collapse:collapse;
min-width:1400px;
}

th{
text-align:left;
padding:16px;
color:#aebce0;
font-size:13px;
text-transform:uppercase;
border-bottom:
1px solid #25385c;
}

td{
padding:16px;
border-bottom:
1px solid #1b2b49;
color:#dce5fb;
vertical-align:middle;
}

.amount-text{
color:#a879ff;
white-space:nowrap;
}

.status{
display:inline-block;
padding:7px 11px;
border-radius:999px;
font-size:13px;
font-weight:700;
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

.admin-timer{
margin-bottom:9px;
}

.countdown{
display:inline-block;
padding:6px 10px;
border-radius:8px;
background:#071126;
border:
1px solid
rgba(139,92,255,.35);
color:#a879ff;
font-size:13px;
font-weight:800;
}

.actions{
display:flex;
gap:8px;
}

.actions form{
margin:0;
}

.actions button{
border:0;
border-radius:9px;
padding:9px 12px;
color:white;
font-weight:700;
cursor:pointer;
}

.approve{
background:#16834b;
}

.reject{
background:#a93440;
}

.action-done{
display:block;
color:#8998b8;
font-size:13px;
white-space:nowrap;
}

.rejected-telegram{
display:inline-block;
margin-top:7px;
padding:7px 9px;
border-radius:8px;
background:#168dcc;
color:#fff;
text-decoration:none;
font-size:12px;
font-weight:700;
}

.manual-admin{
display:flex;
align-items:center;
gap:8px;
flex-wrap:wrap;
}

.manual-admin strong{
color:#ffad72;
font-size:13px;
}

.manual-admin a{
display:inline-block;
padding:8px 10px;
border-radius:8px;
background:#168dcc;
color:#fff;
text-decoration:none;
font-size:12px;
font-weight:700;
}

.proof-btn{
display:inline-block;
padding:9px 12px;
border-radius:9px;
background:
linear-gradient(
90deg,
#8b2cff,
#087cff
);
color:white;
text-decoration:none;
font-weight:700;
font-size:13px;
white-space:nowrap;
}

.no-proof{
color:#7787a9;
}

.empty{
text-align:center;
padding:50px;
color:#9eacd0;
}

@media(max-width:600px){

.topbar{
padding:18px 20px;
}

.logo{
font-size:29px;
}

.container{
padding:25px 14px;
}

.header h1{
font-size:28px;
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

<div>

<h1>
Payment Dashboard
</h1>

<p>
Review and manage payment submissions.
</p>

</div>


<a
class="settings-btn"
href="/admin/settings"
>
⚙ Settings
</a>

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

function updateAdminTimers(){

const elements =
document.querySelectorAll(
".countdown"
);

let reload =
false;


elements.forEach(
function(element){

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


const total =
Math.ceil(
remaining /
1000
);


const minutes =
Math.floor(
total /
60
);


const seconds =
total %
60;


element.textContent =
String(minutes)
.padStart(2,"0") +
":" +
String(seconds)
.padStart(2,"0");


if(
remaining <= 0
){

reload =
true;

}

}
);


if(reload){

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
// ADMIN SETTINGS PAGE
// ======================================================

app.get(
  "/admin/settings",
  (req, res) => {

    const settings =
      loadSettings();


    const planRows =
      settings.plans.map(
        plan => `

<div class="plan-row">

<div class="plan-main">

<strong>
${escapeHTML(
  plan.name
)}
</strong>

<span>
ID: ${escapeHTML(
  plan.id
)}
</span>

</div>


<form
method="POST"
action="/admin/settings/plan/update"
class="plan-form"
>

<input
type="hidden"
name="id"
value="${escapeHTML(
  plan.id
)}"
>


<label>
Plan Name

<input
type="text"
name="name"
value="${escapeHTML(
  plan.name
)}"
required
>

</label>


<label>
Amount

<input
type="number"
name="amount"
min="0"
step="1"
value="${escapeHTML(
  plan.amount
)}"
required
>

</label>


<label>
Description

<input
type="text"
name="description"
value="${escapeHTML(
  plan.description
)}"
required
>

</label>


<label class="check">

<input
type="checkbox"
name="free"
value="1"
${plan.free ? "checked" : ""}
>

Free plan

</label>


<label class="check">

<input
type="checkbox"
name="hidden"
value="1"
${plan.hidden ? "checked" : ""}
>

Hide plan

</label>


<button
class="save-btn"
type="submit"
>
Save Plan
</button>

</form>


<form
method="POST"
action="/admin/settings/plan/delete"
onsubmit="return confirm('Delete this plan?')"
>

<input
type="hidden"
name="id"
value="${escapeHTML(
  plan.id
)}"
>

<button
class="delete-btn"
type="submit"
>
Delete
</button>

</form>

</div>

`
      )
      .join("");


    const paymentRows =
      Object.entries(
        settings.payments
      ).map(
        ([id, method]) => `

<div class="payment-setting">

<h3>
${escapeHTML(
  method.title
)}
</h3>


<form
method="POST"
action="/admin/settings/payment/update"
enctype="multipart/form-data"
>

<input
type="hidden"
name="id"
value="${escapeHTML(id)}"
>


<label>
Title

<input
type="text"
name="title"
value="${escapeHTML(
  method.title
)}"
required
>

</label>


<label>
Description

<input
type="text"
name="description"
value="${escapeHTML(
  method.description
)}"
required
>

</label>


<label>
Address / Number

<input
type="text"
name="address"
value="${escapeHTML(
  method.address
)}"
required
>

</label>


<label>
Note

<input
type="text"
name="note"
value="${escapeHTML(
  method.note
)}"
required
>

</label>


<label>
QR Image

<input
type="file"
name="qr"
accept="image/*"
>

</label>


<div class="current-qr">

<img
src="${escapeHTML(
  method.qr
)}?v=${Date.now()}"
alt="Current QR"
>

</div>


<button
class="save-btn"
type="submit"
>
Save Payment Method
</button>

</form>

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

<title>
Vexora Admin Settings
</title>


<style>

*{
box-sizing:border-box;
}

body{
margin:0;
background:#050b1d;
color:#f4f7ff;
font-family:
Arial,
Helvetica,
sans-serif;
}

.topbar{
padding:20px 28px;
background:#071025;
border-bottom:
1px solid
rgba(139,92,255,.25);
}

.logo{
font-size:32px;
font-weight:800;
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
max-width:1100px;
margin:auto;
padding:30px 18px 60px;
}

.header{
display:flex;
justify-content:space-between;
align-items:center;
gap:15px;
flex-wrap:wrap;
margin-bottom:25px;
}

.header h1{
margin:0 0 8px;
font-size:32px;
}

.header p{
margin:0;
color:#9eacd0;
}

.back-btn{
display:inline-block;
padding:12px 16px;
border-radius:11px;
background:#17243d;
border:
1px solid
rgba(139,92,255,.35);
color:#fff;
text-decoration:none;
font-weight:700;
}

.section{
margin-bottom:25px;
padding:24px;
border-radius:20px;
background:#0d1a35;
border:
1px solid
rgba(125,153,220,.25);
}

.section h2{
margin-top:0;
}

.section-note{
color:#9eacd0;
line-height:1.5;
}

.contact-form{
display:grid;
grid-template-columns:
1fr 1fr;
gap:16px;
}

label{
display:block;
color:#dce6ff;
font-size:14px;
font-weight:700;
}

input[type="text"],
input[type="number"],
input[type="url"],
input[type="file"]{
width:100%;
margin-top:7px;
padding:13px;
border-radius:11px;
border:
1px solid
rgba(125,153,220,.28);
background:#050c20;
color:#fff;
outline:none;
}

input:focus{
border-color:#8b5cff;
}

.save-btn{
border:0;
padding:12px 16px;
border-radius:10px;
background:
linear-gradient(
90deg,
#8b2cff,
#087cff
);
color:#fff;
font-weight:800;
cursor:pointer;
}

.plan-row{
margin-top:16px;
padding:18px;
border-radius:16px;
background:#071126;
border:
1px solid
rgba(125,153,220,.20);
}

.plan-main{
display:flex;
justify-content:space-between;
gap:10px;
flex-wrap:wrap;
margin-bottom:15px;
}

.plan-main span{
color:#7787a9;
font-size:12px;
}

.plan-form{
display:grid;
grid-template-columns:
repeat(3,1fr);
gap:12px;
align-items:end;
}

.check{
display:flex;
align-items:center;
gap:7px;
min-height:42px;
}

.check input{
width:auto;
}

.delete-btn{
margin-top:12px;
border:0;
padding:10px 14px;
border-radius:9px;
background:#a93440;
color:#fff;
font-weight:700;
cursor:pointer;
}

.add-form{
display:grid;
grid-template-columns:
repeat(3,1fr);
gap:12px;
align-items:end;
}

.payment-setting{
margin-top:18px;
padding:18px;
border-radius:16px;
background:#071126;
border:
1px solid
rgba(125,153,220,.20);
}

.payment-setting h3{
margin-top:0;
}

.payment-setting form{
display:grid;
grid-template-columns:
repeat(2,1fr);
gap:14px;
align-items:end;
}

.current-qr{
grid-column:
1 / -1;
padding:10px;
text-align:center;
}

.current-qr img{
max-width:180px;
max-height:180px;
padding:8px;
background:#fff;
border-radius:12px;
}

@media(max-width:700px){

.contact-form,
.plan-form,
.add-form,
.payment-setting form{
grid-template-columns:1fr;
}

.container{
padding:24px 14px 50px;
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

<div>

<h1>
Admin Settings
</h1>

<p>
Manage plans, contact details
and payment methods.
</p>

</div>


<a
class="back-btn"
href="/admin"
>
← Dashboard
</a>

</section>


<section class="section">

<h2>
Contact Settings
</h2>

<p class="section-note">
These details are used on the
plans page and manual review.
</p>


<form
class="contact-form"
method="POST"
action="/admin/settings/contact"
>

<label>
WhatsApp Number

<input
type="text"
name="whatsapp"
value="${escapeHTML(
  settings.site.whatsapp
)}"
placeholder="919999999999"
required
>

</label>


<label>
Telegram Username / Link

<input
type="text"
name="telegram"
value="${escapeHTML(
  settings.site.telegram
)}"
placeholder="@username or https://t.me/username"
required
>

</label>


<div>

<button
class="save-btn"
type="submit"
>
Save Contact Settings
</button>

</div>

</form>

</section>


<section class="section">

<h2>
Plans
</h2>

<p class="section-note">
Yahan se amount change, free trial
hide/show aur extra plans add kar
sakte ho.
</p>


${planRows}


<h3>
Add New Plan
</h3>


<form
class="add-form"
method="POST"
action="/admin/settings/plan/add"
>

<label>
Plan Name

<input
type="text"
name="name"
placeholder="90 Days"
required
>

</label>


<label>
Amount

<input
type="number"
name="amount"
min="0"
step="1"
placeholder="4999"
required
>

</label>


<label>
Description

<input
type="text"
name="description"
placeholder="Premium access for 90 days"
required
>

</label>


<div>

<button
class="save-btn"
type="submit"
>
+ Add Plan
</button>

</div>

</form>

</section>


<section class="section">

<h2>
Payment Methods
</h2>

<p class="section-note">
Existing QR files ko replace kiye bina
address change kar sakte ho. New QR
upload karoge to wahi method ka QR
update ho jayega.
</p>


${paymentRows}

</section>


</main>

</body>

</html>

`);

  }
);


// ======================================================
// ADMIN: CONTACT SETTINGS
// ======================================================

app.post(
  "/admin/settings/contact",
  (req, res) => {

    const settings =
      loadSettings();


    settings.site.whatsapp =
      String(
        req.body.whatsapp || ""
      ).trim();


    settings.site.telegram =
      String(
        req.body.telegram || ""
      ).trim();


    saveSettings(
      settings
    );


    res.redirect(
      "/admin/settings"
    );

  }
);


// ======================================================
// ADMIN: ADD PLAN
// ======================================================

app.post(
  "/admin/settings/plan/add",
  (req, res) => {

    const settings =
      loadSettings();


    const name =
      String(
        req.body.name || ""
      ).trim();


    const amount =
      Math.max(
        0,
        Number(
          req.body.amount
        ) || 0
      );


    const description =
      String(
        req.body.description || ""
      ).trim();


    if (!name) {

      return res.redirect(
        "/admin/settings"
      );

    }


    let id =
      slugify(
        name
      );


    if (!id) {

      id =
        "plan-" +
        Date.now();

    }


    let uniqueId =
      id;


    let counter =
      2;


    while (
      settings.plans.some(
        p =>
          p.id ===
          uniqueId
      )
    ) {

      uniqueId =
        id +
        "-" +
        counter;

      counter++;

    }


    settings.plans.push({

      id:
        uniqueId,

      name,

      amount,

      displayAmount:
        amount === 0
          ? "FREE"
          : "₹" +
            formatINR(
              amount
            ),

      description:
        description ||
        `Premium Vexora access for ${name}.`,

      free:
        amount === 0,

      hidden:
        false

    });


    saveSettings(
      settings
    );


    res.redirect(
      "/admin/settings"
    );

  }
);


// ======================================================
// ADMIN: UPDATE PLAN
// ======================================================

app.post(
  "/admin/settings/plan/update",
  (req, res) => {

    const settings =
      loadSettings();


    const plan =
      settings.plans.find(
        p =>
          p.id ===
          req.body.id
      );


    if (!plan) {

      return res.redirect(
        "/admin/settings"
      );

    }


    const amount =
      Math.max(
        0,
        Number(
          req.body.amount
        ) || 0
      );


    plan.name =
      String(
        req.body.name || ""
      ).trim();


    plan.amount =
      amount;


    plan.displayAmount =
      amount === 0
        ? "FREE"
        : "₹" +
          formatINR(
            amount
          );


    plan.description =
      String(
        req.body.description || ""
      ).trim();


    plan.free =
      req.body.free ===
      "1";


    plan.hidden =
      req.body.hidden ===
      "1";


    saveSettings(
      settings
    );


    res.redirect(
      "/admin/settings"
    );

  }
);


// ======================================================
// ADMIN: DELETE PLAN
// ======================================================

app.post(
  "/admin/settings/plan/delete",
  (req, res) => {

    const settings =
      loadSettings();


    settings.plans =
      settings.plans.filter(
        p =>
          p.id !==
          req.body.id
      );


    saveSettings(
      settings
    );


    res.redirect(
      "/admin/settings"
    );

  }
);


// ======================================================
// ADMIN: UPDATE PAYMENT METHOD
// ======================================================

app.post(
  "/admin/settings/payment/update",
  upload.single("qr"),
  (req, res) => {

    const settings =
      loadSettings();


    const id =
      req.body.id;


    const method =
      settings.payments[id];


    if (!method) {

      return res.redirect(
        "/admin/settings"
      );

    }


    method.title =
      String(
        req.body.title || ""
      ).trim();


    method.description =
      String(
        req.body.description || ""
      ).trim();


    method.address =
      String(
        req.body.address || ""
      ).trim();


    method.note =
      String(
        req.body.note || ""
      ).trim();


    if (req.file) {

      method.qr =
        "/uploads/" +
        req.file.filename;

    }


    saveSettings(
      settings
    );


    res.redirect(
      "/admin/settings"
    );

  }
);


// ======================================================
// ADMIN: APPROVE
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
        new Date()
          .toISOString();


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
// ADMIN: REJECT
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
        new Date()
          .toISOString();


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
