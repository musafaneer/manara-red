import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Moamalat Payment Initiation
  app.post("/api/moamalat/initiate", (req, res) => {
    const { amount, studentId } = req.body;
    
    if (!amount || !studentId) {
      return res.status(400).json({ error: "Missing amount or studentId" });
    }

    const merchantId = process.env.MOAMALAT_MERCHANT_ID || "test_mer";
    const terminalId = process.env.MOAMALAT_TERMINAL_ID || "test_term";
    const merchantSecret = process.env.MOAMALAT_MERCHANT_SECRET || "test_sec";
    const baseUrl = process.env.MOAMALAT_BASE_URL || "https://moamalat.net/pay/payment/api/payment/pay";
    const returnUrl = process.env.MOAMALAT_RETURN_URL || "http://localhost:3000/api/moamalat/callback";
    
    const orderId = `ORD-${Date.now()}-${studentId}`;
    const dateTime = new Date().toISOString().replace(/T/, " ").replace(/\..+/, ""); // YYYY-MM-DD HH:mm:ss

    // Secure Hash Calculation
    // Sequence: TerminalID+MerchantID+MerchantSecret+Amount+OrderID+DateTime+ReturnUrl
    const hashString = `${terminalId}${merchantId}${merchantSecret}${amount}${orderId}${dateTime}${returnUrl}`;
    const secureHash = crypto.createHash("sha256").update(hashString).digest("hex").toUpperCase();

    res.json({
      url: baseUrl,
      fields: {
        Amount: amount,
        MerchantId: merchantId,
        TerminalId: terminalId,
        OrderId: orderId,
        DateTime: dateTime,
        ReturnUrl: returnUrl,
        SecureHash: secureHash
      }
    });
  });

  // Moamalat Callback Route
  app.post("/api/moamalat/callback", (req, res) => {
    console.log("Moamalat Payment Callback:", req.body);
    // In a real app, you would verify the ResponseCode and secure hash here
    // and update the student balance in storageService.ts
    // For this preview, we'll just redirect back to the financials page
    const success = req.body.ResponseCode === "000";
    res.redirect(`/#/financials?status=${success ? "success" : "failed"}`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
