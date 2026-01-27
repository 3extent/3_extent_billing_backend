export const sumBy = (arr, fn) =>
  arr.reduce((sum, item) => sum + (Number(fn(item)) || 0), 0);

export const now = () => Date.now();

export const calculateBillStatus = (payable, paidArray, draft = false) => {
  const totalPaid = sumBy(paidArray, p => p.amount);
  const pending = payable - totalPaid;

  if (draft) return 'DRAFTED';
  if (pending <= 0) return 'PAID';
  if (totalPaid > 0) return 'PARTIALLY_PAID';
  return 'UNPAID';
};

export const calculateGST = profit => {
  if (profit <= 0) return { c_gst: 0, s_gst: 0 };
  return {
    c_gst: profit * 0.09,
    s_gst: profit * 0.09
  };
};
