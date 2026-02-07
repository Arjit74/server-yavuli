
function calculatePaymentBreakdown(itemPriceInRupees) {
  if (!itemPriceInRupees || itemPriceInRupees <= 0) {
    throw new Error('Item price must be a positive number');
  }
  if (itemPriceInRupees > 1000000) { // 10 lakh rupees limit
    throw new Error('Item price exceeds maximum allowed limit');
  }

  // Buyer pays exactly the item price
  const totalAmountInRupees = itemPriceInRupees;
  
  // Platform fee is 5% of the item price
  const platformFeeInRupees = Math.round(itemPriceInRupees * 0.05);
  
  // Seller receives 95% of the item price
  const sellerAmountInRupees = itemPriceInRupees - platformFeeInRupees;

  // Convert to paise for Razorpay
  const totalAmountInPaise = totalAmountInRupees * 100;
  const platformFeeInPaise = platformFeeInRupees * 100;
  const sellerAmountInPaise = sellerAmountInRupees * 100;

  return {
    itemPrice: {
      rupees: itemPriceInRupees,
      paise: itemPriceInRupees * 100,
    },
    platformFee: {
      rupees: platformFeeInRupees,
      paise: platformFeeInPaise,
    },
    sellerAmount: {
      rupees: sellerAmountInRupees,
      paise: sellerAmountInPaise,
    },
    totalAmount: {
      rupees: totalAmountInRupees,
      paise: totalAmountInPaise,
    },
    feePercentage: 5,
  };
}

function formatForDatabase(itemPriceInRupees) {
  const breakdown = calculatePaymentBreakdown(itemPriceInRupees);

  return {
    itemPrice: breakdown.itemPrice.rupees,
    platformFee: breakdown.platformFee.rupees,
    sellerAmount: breakdown.sellerAmount.rupees,
    totalAmount: breakdown.totalAmount.rupees,
  };
}

function getTotalAmountInPaise(itemPriceInRupees) {
  const breakdown = calculatePaymentBreakdown(itemPriceInRupees);
  return breakdown.totalAmount.paise;
}

module.exports = {
  calculatePaymentBreakdown,
  formatForDatabase,
  getTotalAmountInPaise,
};
