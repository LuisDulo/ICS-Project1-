const express = require('express');
const axios = require('axios');
const moment = require('moment');
const router = express.Router();
const StkCallback = require('../models/StkCallback');
const logActivity = require('../utils/logActivity'); 
const Product = require('../models/Product');
require('dotenv').config();
const { ObjectId } = require('mongodb');


router.get('/pay', (req, res) => {
  const { amount, accountReference } = req.query;
  res.render('pay', { amount, accountReference });
});

router.post('/pay', async (req, res) => {
  const { phone, amount, accountReference } = req.body;

  if (!phone || !amount || !accountReference) {
    return res.status(400).send("❌ Missing required payment fields");
  }

  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

  try {
    // ✅ Step 0: Save pending payment BEFORE sending STK push
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db('artify');
    const pendingPayments = db.collection('pendingPayments');

    // Save reference + user (if logged in)
    await pendingPayments.insertOne({
  reference: accountReference,
  productId: new ObjectId(req.body.productId), // ensure you send it from frontend
  username: req.session?.user?.username || "guest",
  timestamp: new Date(),
  status: "pending"
});


    // STEP 1: Get Access Token
    const tokenRes = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        auth: {
          username: process.env.MPESA_CONSUMER_KEY,
          password: process.env.MPESA_CONSUMER_SECRET,
        },
      }
    );

    const access_token = tokenRes.data.access_token;
    console.log("🔐 Access Token:", access_token);

    if (!access_token) {
      await client.close();
      return res.status(500).send("❌ Failed to retrieve access token");
    }

    // STEP 2: Log payload for debugging
    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: accountReference,
      TransactionDesc: `Payment for ${accountReference}`,
    };

    console.log("📦 STK Push Payload:", payload);

    // STEP 3: Send STK Push Request
    const stkRes = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      payload,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    console.log("✅ STK Push Response:", stkRes.data);
    await client.close();

    // STEP 4: Respond to user
   res.render('processing', { accountReference });

  } catch (error) {
    if (error.response) {
      console.error("❌ M-Pesa API Error:", error.response.data);
      res.status(500).send(`Payment failed: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error("❌ Network/Server Error:", error.message);
      res.status(500).send("Payment failed: Internal server error.");
    }
  }
});

// ✅ Callback URL to receive transaction confirmation
router.post('/callback', (req, res) => {
  console.log("📥 M-Pesa Callback:", JSON.stringify(req.body, null, 2));
  res.status(200).send('✅ Callback received');
});
const { MongoClient } = require('mongodb');


router.post('/stk-callback', async (req, res) => {
  try {
    const callbackData = req.body.Body.stkCallback;
    const isSuccess = callbackData.ResultCode === 0;

    // ✅ Save full callback to DB
    await StkCallback.create(callbackData);

    // ✅ Connect to DB
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db('artify');
    const users = db.collection('users');
    const products = db.collection('products');
    const pendingPayments = db.collection('pendingPayments');

    // ✅ Log activity
    await logActivity(db, {
      type: 'payment',
      description: isSuccess
        ? `Payment successful: ${callbackData.MerchantRequestID}`
        : `Payment failed: ${callbackData.ResultDesc}`,
      userId: null
    });

    // ✅ Respond early to Safaricom
    res.status(200).json({ message: "Callback received" });

    if (!isSuccess) {
      console.warn("❌ Payment failed:", callbackData.ResultDesc);
      await client.close();
      return;
    }

    // ✅ Extract metadata
    const metadata = callbackData.CallbackMetadata?.Item || [];
    const amount = metadata.find(i => i.Name === 'Amount')?.Value;
    const reference = metadata.find(i => i.Name === 'AccountReference')?.Value;
    const receipt = metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
    const phone = metadata.find(i => i.Name === 'PhoneNumber')?.Value;
    const txDate = metadata.find(i => i.Name === 'TransactionDate')?.Value;

    // ✅ Terminal log
    console.log("\n🎉 Payment Successful!");
    console.log(`🧾 Receipt: ${receipt}`);
    console.log(`📦 Account Reference: ${reference}`);
    console.log(`💰 Amount: KES ${amount}`);
    console.log(`📱 Phone: ${phone}`);
    console.log(`🕒 Date: ${txDate}`);
    console.log(`🆔 CheckoutRequestID: ${callbackData.CheckoutRequestID}`);
    console.log(`🆔 MerchantRequestID: ${callbackData.MerchantRequestID}`);

    if (!reference) {
      console.warn("⚠️ No AccountReference found.");
      await client.close();
      return;
    }

    // ✅ Find pending payment
    const pending = await pendingPayments.findOne({ reference });
    if (!pending) {
      console.warn("⚠️ No pending payment found for:", reference);
      await client.close();
      return;
    }

    // ✅ Find buyer
    const buyer = await users.findOne({ username: pending.username });
    if (!buyer) {
      console.warn("⚠️ Buyer not found:", pending.username);
      await client.close();
      return;
    }

    // ✅ Update pending payment
    await pendingPayments.updateOne(
      { reference },
      { $set: { status: "success" } }
    );

    // ✅ Get product
    const product = await products.findOne({ title: reference });
    if (!product) {
      console.warn("⚠️ Product not found for reference:", reference);
      await client.close();
      return;
    }

    const oldSellerId = product.artist;

    // ✅ Transfer ownership
    await products.updateOne(
      { _id: product._id },
      {
        $set: {
          artist: buyer._id,
          stockCount: 0
        }
      }
    );

    // ✅ Log purchase to buyer’s history
    await users.updateOne(
      { _id: buyer._id },
      {
        $push: {
          purchased: {
            name: product.title,
            price: product.price,
            image: product.imageUrl,
            seller: oldSellerId.toString(),
            receipt,
            date: new Date()
          }
        }
      }
    );

    console.log(`✅ Product "${product.title}" sold to ${buyer.username}`);

    await client.close();
  } catch (err) {
    console.error("❌ STK Callback Error:", err);
    res.status(500).json({ message: "Callback processing failed" });
  }
});
router.get('/payment-status/:reference', async (req, res) => {
  const { reference } = req.params;
  try {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    const db = client.db('artify');

    // If the pending payment is gone, it means payment was successful and processed
    const pending = await db.collection('pendingPayments').findOne({ reference });
    await client.close();

   
if (pending?.status === "success") {
  return res.json({ status: 'confirmed' });
} else if (pending?.status === "failed") {
  return res.json({ status: 'failed' });
} else {
  return res.json({ status: 'pending' });
}
  } catch (err) {
    console.error("❌ Payment status error:", err);
    res.status(500).json({ status: 'error' });
  }
});


module.exports = router;


