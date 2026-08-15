# Vexora Payment Page

Replace the existing `payment.html` with this file and upload the `public/assets` folder.

Assets:
- `upi-phonepe.jpg` — UPI/PhonePe QR
- `usdt-trc20.jpg` — USDT TRC20 QR
- `usdt-bep20.jpg` — USDT BEP20 QR
- `eth-erc20.jpg` — ETH ERC20 QR

The page expects the existing backend endpoint:
`POST /api/payment`

Form fields sent:
plan, amount, payment_method, network, utr, tradingview, telegram, payment_screenshot
