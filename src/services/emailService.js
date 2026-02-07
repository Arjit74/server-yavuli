const { Resend } = require('resend');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@yavulimarketplace.com';
  }

  /**
   * Send order confirmation email to buyer with invoice
   */
  async sendOrderConfirmationToBuyer(orderDetails) {
    try {
      const { buyer, listing, transaction, invoiceBuffer } = orderDetails;

      const htmlContent = this.generateBuyerEmailTemplate({
        buyerName: buyer.full_name || buyer.email,
        listingTitle: listing.title,
        amount: transaction.amount,
        transactionId: transaction.id,
        transactionDate: new Date(transaction.transaction_date).toLocaleDateString('en-IN'),
      });

      const emailPayload = {
        from: this.fromEmail,
        to: buyer.email,
        subject: `Order Confirmation - ${listing.title}`,
        html: htmlContent,
      };

      // Add invoice attachment if provided
      if (invoiceBuffer) {
        emailPayload.attachments = [
          {
            filename: `invoice_${transaction.id}.pdf`,
            content: invoiceBuffer,
          },
        ];
      }

      const result = await this.resend.emails.send(emailPayload);
      console.log('✅ Buyer email sent:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Error sending buyer email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order notification email to seller
   */
  async sendOrderNotificationToSeller(orderDetails) {
    try {
      const { seller, listing, transaction, buyer } = orderDetails;

      const htmlContent = this.generateSellerEmailTemplate({
        sellerName: seller.full_name || seller.email,
        listingTitle: listing.title,
        amount: transaction.amount,
        buyerName: buyer.full_name || buyer.email,
        transactionId: transaction.id,
        transactionDate: new Date(transaction.transaction_date).toLocaleDateString('en-IN'),
      });

      const emailPayload = {
        from: this.fromEmail,
        to: seller.email,
        subject: `New Sale - ${listing.title}`,
        html: htmlContent,
      };

      const result = await this.resend.emails.send(emailPayload);
      console.log('✅ Seller email sent:', result);
      return { success: true, messageId: result.id };
    } catch (error) {
      console.error('❌ Error sending seller email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML template for buyer email
   */
  generateBuyerEmailTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
    .order-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; }
    .amount { font-size: 24px; color: #4CAF50; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    .button { background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Order Confirmed!</h1>
    </div>
    <div class="content">
      <h2>Hi ${data.buyerName},</h2>
      <p>Thank you for your purchase on Yavuli Marketplace! Your order has been confirmed.</p>
      
      <div class="order-details">
        <h3>Order Details</h3>
        <div class="detail-row">
          <span class="detail-label">Item:</span>
          <span>${data.listingTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID:</span>
          <span>#${data.transactionId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span>${data.transactionDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount Paid:</span>
          <span class="amount">₹${data.amount}</span>
        </div>
      </div>

      <p>Your invoice is attached to this email. The seller will contact you soon regarding delivery/pickup details.</p>
      
      <a href="https://yavulimarketplace.com/my-purchases" class="button">View My Orders</a>
    </div>
    
    <div class="footer">
      <p>This is an automated email from Yavuli Marketplace.</p>
      <p>If you have any questions, please contact support@yavulimarketplace.com</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate HTML template for seller email
   */
  generateSellerEmailTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; border-radius: 5px; margin-top: 20px; }
    .order-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { font-weight: bold; }
    .amount { font-size: 24px; color: #2196F3; font-weight: bold; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    .button { background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💰 New Sale!</h1>
    </div>
    <div class="content">
      <h2>Hi ${data.sellerName},</h2>
      <p>Great news! Your item has been sold on Yavuli Marketplace.</p>
      
      <div class="order-details">
        <h3>Sale Details</h3>
        <div class="detail-row">
          <span class="detail-label">Item Sold:</span>
          <span>${data.listingTitle}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Buyer:</span>
          <span>${data.buyerName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Transaction ID:</span>
          <span>#${data.transactionId}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span>${data.transactionDate}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="amount">₹${data.amount}</span>
        </div>
      </div>

      <p>Please coordinate with the buyer for delivery/pickup. The buyer's contact details are available in your dashboard.</p>
      
      <a href="https://yavulimarketplace.com/my-sales" class="button">View My Sales</a>
    </div>
    
    <div class="footer">
      <p>This is an automated email from Yavuli Marketplace.</p>
      <p>If you have any questions, please contact support@yavulimarketplace.com</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

module.exports = new EmailService();
