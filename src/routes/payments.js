const express = require('express');
const crypto = require('crypto');

const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/authmiddleware');
const paymentHelper = require('../utils/paymentHelper');
const razorpay = require('../config/razorpay');

const router = express.Router();

// ==========================================
// Health Checks & Tests
// ==========================================

router.get('/health', (req, res) => {
  res.json({
    status: 'Payments router is loaded and working',
    timestamp: new Date().toISOString()
  });
});

router.post('/test', (req, res) => {
  res.json({
    message: 'POST endpoint works',
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

router.post('/test-auth', authMiddleware, (req, res) => {
  res.json({
    message: 'Authenticated endpoint works',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 1. CREATE ORDER (Initiate Payment)
// ==========================================

router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    console.log('CREATE-ORDER ENDPOINT REACHED');
    const { listingId } = req.body;
    const buyerId = req.user.id;

    if (!listingId) {
      return res.status(400).json({ success: false, message: 'listingId is required' });
    }

    // Step 1: Fetch Listing & Verify Price (Security)
    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('id, user_id, title, price')
      .eq('id', listingId)
      .single();

    if (listingError || !listingData) {
      console.error('Error fetching listing:', listingError);
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    // Security: Prevent self-buying
    if (listingData.user_id === buyerId) {
      return res.status(400).json({ success: false, message: 'You cannot buy your own listing' });
    }

    const itemPrice = listingData.price;
    if (!itemPrice || itemPrice <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid listing price' });
    }

    // Step 2: Calculate Breakdown
    const breakdown = paymentHelper.calculatePaymentBreakdown(itemPrice);

    // Step 3: Create Razorpay Order
    if (!razorpay || !razorpay.orders) {
      throw new Error('Razorpay not configured properly');
    }

    const shortReceipt = `rcpt_${Date.now().toString().slice(-8)}`;
    const razorpayOrder = await razorpay.orders.create({
      amount: breakdown.totalAmount.paise,
      currency: 'INR',
      receipt: shortReceipt,
      notes: {
        listingId: listingId,
        buyerId: buyerId,
        listingTitle: listingData.title,
      },
    });

    if (!razorpayOrder || !razorpayOrder.id) {
      throw new Error('Failed to generate Razorpay order ID');
    }

    // Step 4: Save Initial Transaction to DB
    const { data: savedTransaction, error: dbError } = await supabase
      .from('transactions')
      .insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: listingData.user_id,
        amount: breakdown.totalAmount.rupees,
        status: 'created',
        payment_method: 'razorpay',
        transaction_date: new Date(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ success: false, message: 'Failed to create transaction record' });
    }

    // Step 5: Respond to Client
    return res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      transactionId: savedTransaction.id,
      totalAmount: breakdown.totalAmount.rupees,
      feeBreakdown: {
        itemPrice: breakdown.itemPrice.rupees,
        platformFee: breakdown.platformFee.rupees,
        sellerAmount: breakdown.sellerAmount.rupees,
        totalAmount: breakdown.totalAmount.rupees,
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });

  } catch (error) {
    console.error('CREATE-ORDER ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
});

// ==========================================
// 2. VERIFY PAYMENT (Complete Transaction)
// ==========================================

router.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      transactionId,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !transactionId) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    // Step 1: Verify Signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (generatedSignature !== razorpaySignature) {
      console.warn(`Signature mismatch for tx: ${transactionId}`);
      // Mark as failed
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', transactionId);
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    // Step 2: Fetch Transaction
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (fetchError || !existingTransaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Idempotency Check: Don't process if already completed
    if (existingTransaction.status === 'completed') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        transactionId: existingTransaction.id
      });
    }

    // Step 3: Calculate Fees
    const transactionAmount = existingTransaction.amount;
    const platformFee = Math.round(transactionAmount * 0.05); // 5%
    const sellerAmount = transactionAmount - platformFee;     // 95%

    // Step 4: Update Transaction Status
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        transaction_date: new Date(),
        platform_fee: platformFee,
        seller_amount: sellerAmount,
        payout_status: 'pending',
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) {
      console.error('Transaction update failed:', updateError);
      return res.status(500).json({ success: false, message: 'Failed to update transaction status' });
    }

    // Step 5: Update Listing Status to 'Sold'
    await supabase
      .from('listings')
      .update({ status: 'sold', updated_at: new Date() })
      .eq('id', updatedTransaction.listing_id);

    // Step 6: Trigger Email Notifications (Edge Function)
    try {
      // Ensure URL doesn't have double slash if env var ends with /
      const baseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
      const edgeFunctionUrl = `${baseUrl}/functions/v1/notify-order`;
      
      console.log('Triggering email notification...');
      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_KEY}`, // Service Role Key usually required here
        },
        body: JSON.stringify({ transactionId: updatedTransaction.id }),
      }).then(response => {
         if (!response.ok) console.error('Email trigger failed status:', response.status);
         else console.log('Email trigger sent successfully');
      }).catch(err => console.error('Email trigger network error:', err));
      
      // We don't await this to keep response fast for the user
    } catch (emailError) {
      console.error('Email notification setup failed:', emailError);
    }

    // Step 7: Success Response
    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      transactionId: updatedTransaction.id,
      orderId: razorpayOrderId,
      payoutStatus: 'pending',
      breakdown: {
        total: transactionAmount,
        platformFee,
        sellerAmount,
      },
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message,
    });
  }
});

// ==========================================
// 3. GET SINGLE TRANSACTION
// ==========================================

router.get('/transaction/:transactionId', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error || !transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    // Security: Only allow buyer or seller to view
    if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    return res.status(200).json({
      success: true,
      transaction: {
        id: transaction.id,
        listingId: transaction.listing_id,
        buyerId: transaction.buyer_id,
        sellerId: transaction.seller_id,
        amount: transaction.amount,
        status: transaction.status,
        paymentMethod: transaction.payment_method,
        transactionDate: transaction.transaction_date,
        createdAt: transaction.created_at,
      },
    });
  } catch (error) {
    console.error('Get transaction error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch transaction' });
  }
});

// ==========================================
// 4. BUYER HISTORY
// ==========================================

router.get('/my-purchases', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get Total Count
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', userId);
    
    if (countError) throw countError;

    // Get Data
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('buyer_id', userId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      transactions: transactions || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch purchase history' });
  }
});

// ==========================================
// 5. SELLER SALES HISTORY
// ==========================================

router.get('/my-sales', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get Completed Sales for Earnings Calculation
    const { count, data: completedSales, error: countError } = await supabase
      .from('transactions')
      .select('amount', { count: 'exact' })
      .eq('seller_id', userId)
      .eq('status', 'completed');

    if (countError) throw countError;

    const totalEarnings = completedSales 
      ? completedSales.reduce((sum, t) => sum + (t.amount || 0), 0) 
      : 0;

    // Get Paginated Sales Data
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('seller_id', userId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      transactions: transactions || [],
      total: count || 0,
      totalEarnings,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Get sales error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch sales history' });
  }
});

module.exports = router;