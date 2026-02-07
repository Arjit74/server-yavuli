import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@yavulimarketplace.com';

Deno.serve(async (req) => {
  try {
    const { transactionId } = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'transactionId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 Processing email notifications for transaction: ${transactionId}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select(`
        *,
        buyer:users!transactions_buyer_id_fkey(id, email, full_name, phone),
        seller:users!transactions_seller_id_fkey(id, email, full_name, phone),
        listing:listings(id, title, price, description)
      `)
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      console.error('Error fetching transaction:', txError);
      throw new Error('Transaction not found');
    }

    console.log('✅ Transaction data fetched');

    const buyerEmailResult = await sendBuyerEmail(transaction);
    console.log('Buyer email result:', buyerEmailResult);

    const sellerEmailResult = await sendSellerEmail(transaction);
    console.log('Seller email result:', sellerEmailResult);

    return new Response(
      JSON.stringify({
        success: true,
        buyerEmailSent: buyerEmailResult.success,
        sellerEmailSent: sellerEmailResult.success,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in notify-order function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function sendBuyerEmail(transaction: any) {
  try {
    const html = generateBuyerEmailHTML(transaction);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [transaction.buyer.email],
        subject: `Order Confirmation - ${transaction.listing.title}`,
        html: html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error: any) {
    console.error('Error sending buyer email:', error);
    return { success: false, error: error.message };
  }
}

async function sendSellerEmail(transaction: any) {
  try {
    const html = generateSellerEmailHTML(transaction);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [transaction.seller.email],
        subject: `Item Sold - ${transaction.listing.title}`,
        html: html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error: any) {
    console.error('Error sending seller email:', error);
    return { success: false, error: error.message };
  }
}

function generateBuyerEmailHTML(transaction: any): string {
  const buyerName = transaction.buyer.full_name || transaction.buyer.email;
  const listingTitle = transaction.listing.title;
  const amount = transaction.amount;
  const transactionDate = new Date(transaction.transaction_date).toLocaleDateString('en-IN');
  const transactionId = transaction.id;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .order-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4CAF50; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #666; }
    .detail-value { color: #333; }
    .amount { font-size: 24px; color: #4CAF50; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; padding: 20px; }
    h1 { margin: 0; font-size: 28px; }
    h2 { color: #333; margin-top: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Order Confirmed!</h1>
    </div>
    <div class="content">
      <h2>Hi ${buyerName},</h2>
      <p>Thank you for your purchase on Yavuli Marketplace! Your payment has been received successfully.</p>
      <div class="order-box">
        <h3 style="margin-top: 0; color: #4CAF50;">Order Details</h3>
        <div class="detail-row">
          <span class="detail-label">Item:</span>
          <span class="detail-value">${listingTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID:</span>
          <span class="detail-value">#${transactionId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${transactionDate}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Amount Paid:</span>
          <span class="amount">₹${amount}</span>
        </div>
      </div>
      <p><strong>What happens next?</strong></p>
      <p>The seller has been notified and will contact you soon to arrange delivery or pickup. You can view your order details in your Yavuli account.</p>
      <p style="margin-top: 30px;">If you have any questions, feel free to reach out to our support team.</p>
    </div>
    <div class="footer">
      <p>This is an automated email from Yavuli Marketplace</p>
      <p>© 2026 Yavuli. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

function generateSellerEmailHTML(transaction: any): string {
  const sellerName = transaction.seller.full_name || transaction.seller.email;
  const buyerName = transaction.buyer.full_name || transaction.buyer.email;
  const buyerEmail = transaction.buyer.email;
  const buyerPhone = transaction.buyer.phone || 'Not provided';
  const listingTitle = transaction.listing.title;
  const amount = transaction.amount;
  const sellerAmount = transaction.seller_amount;
  const platformFee = transaction.platform_fee;
  const transactionDate = new Date(transaction.transaction_date).toLocaleDateString('en-IN');
  const transactionId = transaction.id;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .sale-box { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3; }
    .buyer-box { background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
    .payout-box { background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; color: #666; }
    .detail-value { color: #333; }
    .amount { font-size: 24px; color: #28a745; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; padding: 20px; }
    h1 { margin: 0; font-size: 28px; }
    h2 { color: #333; margin-top: 0; }
    h3 { margin-top: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 Congratulations!</h1>
      <p style="margin: 10px 0 0 0; font-size: 18px;">Your item has been sold</p>
    </div>
    <div class="content">
      <h2>Hi ${sellerName},</h2>
      <p>Great news! Your listing on Yavuli Marketplace has been purchased.</p>
      <div class="sale-box">
        <h3 style="color: #2196F3;">Sale Details</h3>
        <div class="detail-row">
          <span class="detail-label">Item Sold:</span>
          <span class="detail-value">${listingTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID:</span>
          <span class="detail-value">#${transactionId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${transactionDate}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Sale Amount:</span>
          <span class="detail-value" style="font-size: 18px; font-weight: bold;">₹${amount}</span>
        </div>
      </div>
      <div class="buyer-box">
        <h3 style="color: #f57c00;">👤 Buyer Contact Information</h3>
        <div class="detail-row">
          <span class="detail-label">Name:</span>
          <span class="detail-value">${buyerName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${buyerEmail}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">Phone:</span>
          <span class="detail-value">${buyerPhone}</span>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 14px;">Please contact the buyer to arrange delivery or pickup.</p>
      </div>
      <div class="payout-box">
        <h3 style="color: #28a745;">💵 Your Payout</h3>
        <div class="detail-row">
          <span class="detail-label">Sale Amount:</span>
          <span class="detail-value">₹${amount}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Platform Fee (5%):</span>
          <span class="detail-value">- ₹${platformFee}</span>
        </div>
        <div class="detail-row" style="border-bottom: none;">
          <span class="detail-label">You will receive:</span>
          <span class="amount">₹${sellerAmount}</span>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 14px; color: #666;">
          <strong>Payment Timeline:</strong> Your payment will be transferred to your account within 3-7 working days after successful delivery.
        </p>
      </div>
      <p style="margin-top: 30px;"><strong>Next Steps:</strong></p>
      <ol>
        <li>Contact the buyer using the information provided above</li>
        <li>Arrange delivery or pickup of the item</li>
        <li>Your payment will be processed automatically after delivery</li>
      </ol>
      <p style="margin-top: 20px;">If you have any questions, please contact our support team.</p>
    </div>
    <div class="footer">
      <p>This is an automated email from Yavuli Marketplace</p>
      <p>© 2026 Yavuli. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  return html;
}
