function calculatePaymentBreakdown(itemPriceInRupees) {
  if (!itemPriceInRupees || itemPriceInRupees <= 0) {
    throw new Error('Item price must be a positive number');
  }
  if (itemPriceInRupees > 100000) {
    throw new Error('Item price exceeds maximum allowed limit');
  }

  const marketplaceFeeinRupees = Math.round(itemPriceInRupees * 0.05);

  const totalAmountInRupees = itemPriceInRupees + marketplaceFeeinRupees;
  const itemPriceInPaise = itemPriceInRupees * 100;
  const marketplaceFeeInPaise = marketplaceFeeinRupees * 100;
  const totalAmountInPaise = totalAmountInRupees * 100;

  return {
    itemPrice: {
      rupees: itemPriceInRupees,
      paise: itemPriceInPaise,
    },
    marketplaceFee: {
      rupees: marketplaceFeeinRupees,
      paise: marketplaceFeeInPaise,
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
    marketplaceFee: breakdown.marketplaceFee.rupees,
    totalAmount: breakdown.totalAmount.rupees,
    sellerAmount: breakdown.itemPrice.rupees,
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