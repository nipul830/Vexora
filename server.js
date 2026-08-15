const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const ROOT = __dirname;
const UPLOADS = path.join(ROOT, "uploads");
const DATA = path.join(ROOT, "data", "orders.json");

fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(path.dirname(DATA), { recursive: true });
if (!fs.existsSync(DATA)) fs.writeFileSync(DATA, "[]");

const upload = multer({
  dest: UPLOADS,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["image/jpeg","image/png","image/webp","application/pdf"].includes(file.mimetype);
    cb(ok ? null : new Error("Only JPG, PNG, WEBP or PDF files are allowed."), ok);
  }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(ROOT, "public")));

app.get("/api/plans", (req,res) => res.json([
  {id:"free1", name:"1 Day Free", price:0, duration:"1 day"},
  {id:"p7", name:"7 Days", price:999, duration:"7 days"},
  {id:"p15", name:"15 Days", price:1499, duration:"15 days"},
  {id:"p30", name:"30 Days", price:2499, duration:"30 days"},
  {id:"life", name:"Lifetime", price:11000, duration:"Lifetime"},
  {id:"source", name:"Source Code", price:35000, duration:"One-time", note:"+ GST"}
]));

app.post("/api/payment", upload.single("screenshot"), (req,res) => {
  try {
    const orders = JSON.parse(fs.readFileSync(DATA, "utf8"));
    const order = {
      id: "VX" + Date.now(),
      createdAt: new Date().toISOString(),
      plan: req.body.plan || "",
      amount: req.body.amount || "",
      method: req.body.method || "",
      utr: req.body.utr || "",
      tradingview: req.body.tradingview || "",
      telegram: req.body.telegram || "",
      screenshot: req.file ? req.file.filename : "",
      status: "Pending"
    };
    orders.unshift(order);
    fs.writeFileSync(DATA, JSON.stringify(orders, null, 2));
    res.json({ok:true, id:order.id});
  } catch(e) {
    res.status(500).json({ok:false, error:e.message});
  }
});

app.get("/admin", (req,res) => {
  const key = req.query.key || "";
  if (key !== (process.env.ADMIN_KEY || "change-me")) return res.status(403).send("Forbidden");
  const orders = JSON.parse(fs.readFileSync(DATA, "utf8"));
  res.type("html").send(`<!doctype html><html><head><meta charset="utf-8"><title>Vexora Admin</title><style>
  body{font-family:system-ui;background:#0b1020;color:#fff;padding:24px} table{width:100%;border-collapse:collapse;background:#151c32}
  td,th{padding:10px;border:1px solid #303a58;text-align:left} a{color:#7dd3fc}
  </style></head><body><h1>Vexora Payment Requests</h1>
  <table><tr><th>ID</th><th>Plan</th><th>Amount</th><th>Method</th><th>UTR</th><th>TradingView</th><th>Telegram</th><th>Screenshot</th><th>Status</th></tr>
  ${orders.map(o=>`<tr><td>${esc(o.id)}</td><td>${esc(o.plan)}</td><td>${esc(o.amount)}</td><td>${esc(o.method)}</td><td>${esc(o.utr)}</td><td>${esc(o.tradingview)}</td><td>${esc(o.telegram)}</td><td>${o.screenshot?`<a href="/uploads/${encodeURIComponent(o.screenshot)}">View</a>`:"-"}</td><td>${esc(o.status)}</td></tr>`).join("")}
  </table></body></html>`);
});

app.use("/uploads", express.static(UPLOADS));

function esc(s=""){ return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }

app.use((err,req,res,next)=>{
  res.status(400).json({ok:false,error:err.message || "Upload failed"});
});

app.listen(PORT, ()=>console.log(`Vexora running on ${PORT}`));
