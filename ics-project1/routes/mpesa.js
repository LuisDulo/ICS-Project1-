const express = require('express');
const axios = require('axios');
const moment = require('moment');
const router = express.Router();
require('dotenv').config();
router.get('/pay', (req, res) => {
  const { amount, accountReference } = req.query;
  res.render('pay', { amount, accountReference });
});


router.post('/pay', async (req, res) => {
  const { phone, amount, accountReference } = req.body;
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = moment().format("YYYYMMDDHHmmss");
  const password = Buffer.from(shortcode + passkey + timestamp).toString("base64");

  try {
    // Step 1: Get Access Token
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
    console.log("Access token:", access_token);

    // Step 2: STK Push
    const stkRes = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
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
      },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    console.log("STK Push Response:", stkRes.data);
    res.send("✅ Payment request sent. Check your phone.");
  } catch (error) {
    if (error.response) {
      console.error("❌ M-Pesa Error:", error.response.data);
      res.status(500).send(`Payment failed: ${JSON.stringify(error.response.data)}`);
    } else {
      console.error("❌ Unexpected Error:", error.message);
      res.status(500).send("Payment failed: Internal server error.");
    }
  }
});

router.post('/callback', (req, res) => {
  console.log('M-Pesa Callback:', req.body);
  res.status(200).send('OK');
});


module.exports = router;
