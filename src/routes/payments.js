const express = require('express');
const crypto = require('crypto');


const supabase = require('../config/supabase');
const { authMiddleware } = require('../middleware/authmiddleware');
const paymentHelper = require('../utils/paymentHelper');
const razorpay = require('../config/razorpay');

const router = express.Router();

// Health check - verify payments router is loaded
router.get('/health', (req, res) => {
  res.json({ 
    status: 'Payments router is loaded and working',
    timestamp: new Date().toISOString()
  });
});

// Test POST endpoint without auth
router.post('/test', (req, res) => {
  res.json({
    message: 'POST endpoint works',
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Test authenticated endpoint
router.post('/test-auth', authMiddleware, (req, res) => {
  res.json({
    message: 'Authenticated endpoint works',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    console.log('✅ CREATE-ORDER ENDPOINT REACHED');
    console.log('User:', req.user);
    console.log('Body:', req.body);
    
    // Extract data from request
    const { listingId, itemPrice } = req.body;
    const buyerId = req.user.id;

    if (!listingId || !itemPrice) {
      return res.status(400).json({
        success: false,
        message: 'listingId and itemPrice are required',
      });
    }

    // Validate item price is a positive number
    if (typeof itemPrice !== 'number' || itemPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'itemPrice must be a positive number',
      });
    }

    // Step 1: Get listing details to verify it exists and get seller_id
    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('id, seller_id, title')
      .eq('id', listingId)
      .single();

    if (listingError) {
      console.error('❌ Supabase error fetching listing:', listingError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch listing details',
        error: listingError.message
      });
    }

    if (!listingData) {
      console.log('⚠️ Listing not found for ID:', listingId);
      return res.status(404).json({
        success: false,
        message: 'Listing not found',
      });
    }

    // Security check: Make sure buyer is not the seller
    if (listingData.seller_id === buyerId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot buy your own listing',
      });
    }

    // Step 2: Calculate payment breakdown
    const breakdown = paymentHelper.calculatePaymentBreakdown(itemPrice);

    // Step 3: Create order in Razorpay
    const razorpayOrder = await razorpay.orders.create({
      // Amount in paise 
      amount: breakdown.totalAmount.paise,
      currency: 'INR',
      receipt: `receipt_${listingId}_${Date.now()}`,
      notes: {
        listingId: listingId,
        buyerId: buyerId,
        listingTitle: listingData.title,
      },
    });

// Step 4: Save transaction to database
    const { data: savedTransaction, error: dbError } = await supabase
      .from('transactions')
      .insert({
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: listingData.seller_id,
        amount: breakdown.totalAmount.rupees,
        status: 'created',
        payment_method: 'razorpay',
        transaction_date: new Date(),
      })
      .select();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create transaction in database',
      });
    }

// Step 6: Return response to frontend
    return res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      transactionId: savedTransaction[0].id,
      totalAmount: breakdown.totalAmount.rupees,
      feeBreakdown: {
        itemPrice: breakdown.itemPrice.rupees,
        marketplaceFee: breakdown.marketplaceFee.rupees,
        totalAmount: breakdown.totalAmount.rupees,
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message,
    });
  }
});

// ENDPOINT 2: Verify Payment
router.post('/verify-payment', async (req, res) => {
  try {
    // Extract payment data from frontend
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      transactionId,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification fields',
      });
    }

    // Step 1: Generate signature on our server
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // Step 2: Compare our generated signature with what Razorpay sent
    const isSignatureValid = generatedSignature === razorpaySignature;

    if (!isSignatureValid) {
      console.warn('Signature mismatch for order:', razorpayOrderId);
      // Mark transaction as failed in database
      if (transactionId) {
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
          })
          .eq('id', transactionId);
      }

      return res.status(400).json({
        success: false,
        message: 'Payment signature verification failed - possible fraud attempt',
      });
    }

    // Step 3: Signature is valid! Update database
    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID is required for verification',
      });
    }

    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        transaction_date: new Date(),
      })
      .eq('id', transactionId)
      .select();

    if (updateError || !updatedTransaction || updatedTransaction.length === 0) {
      console.error('Database update error:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update transaction status',
      });
    }

    // Step 4: Mark listing as sold and update with buyer info
    const transaction = updatedTransaction[0];
    const { error: listingUpdateError } = await supabase
      .from('listings')
      .update({
        status: 'sold',
        updated_at: new Date(),
      })
      .eq('id', transaction.listing_id);

    if (listingUpdateError) {
      console.error('Error updating listing status:', listingUpdateError);
      // Don't fail the payment verification if listing update fails
      // The transaction is already completed, so we log the error but continue
      console.warn('Payment successful but listing status update failed - manual intervention may be needed');
    }

    // Step 5: Success! Payment is verified and saved
    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      transactionId: transactionId,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
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

router.get('/transaction/:transactionId', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const userId = req.user.id;
 // Fetch transaction from database
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error || !transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

// This prevents users from viewing other people's transactions
    if (transaction.buyer_id !== userId && transaction.seller_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to transaction',
      });
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
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction',
      error: error.message,
    });
  }
});


// ENDPOINT 4: Get Buyer's Transaction History
router.get('/my-purchases', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('buyer_id', userId);

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('buyer_id', userId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch purchase history',
      });
    }

    return res.status(200).json({
      success: true,
      transactions: transactions || [],
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase history',
      error: error.message,
    });
  }
});

// ENDPOINT 5: Get Seller's Transaction History (Sales)
router.get('/my-sales', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, data: countData } = await supabase
      .from('transactions')
      .select('amount', { count: 'exact' })
      .eq('seller_id', userId)
      .eq('status', 'completed');

    const totalEarnings = countData ? countData.reduce((sum, t) => sum + t.amount, 0) : 0;

    // Fetch paginated transactions
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('seller_id', userId)
      .order('transaction_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch sales history',
      });
    }

    return res.status(200).json({
      success: true,
      transactions: transactions || [],
      total: count,
      totalEarnings: totalEarnings,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Get sales error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales history',
      error: error.message,
    });
  }
});

module.exports = router;