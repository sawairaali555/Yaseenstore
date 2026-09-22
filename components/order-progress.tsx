const steps = ['Placed', 'Confirmed', 'Dispatched', 'Delivered'];
const confirmed = ['Confirmed', 'Picklist', 'Picking', 'Packing', 'Pack & AirwayBill', 'Ready to Ship'];
const dispatched = ['Shipped', 'Dispatched', 'In Transit', 'Out for Delivery', 'Failed Delivery'];

export default function OrderProgress({ status }: { status: string }) {
  if (['Cancelled', 'RTO', 'Returned', 'Refunded', 'On Hold'].includes(status)) {
    return <p className="text-sm text-slate-600" role="status">Order status: {status}</p>;
  }
  const current = ['Delivered', 'COD Settled'].includes(status) ? 3
    : dispatched.includes(status) ? 2 : confirmed.includes(status) ? 1 : 0;
  return (
    <ol aria-label="Order progress" className="grid grid-cols-4 gap-2 pt-2 text-center text-[10px] font-bold">
      {steps.map((step, index) => (
        <li key={step} aria-current={index === current ? 'step' : undefined} className="space-y-1">
          <div className={`h-2 rounded-full ${index <= current ? 'bg-[#203664]' : 'bg-slate-200'}`} />
          <span className={index <= current ? 'text-[#203664]' : 'text-slate-400'}>{step}</span>
        </li>
      ))}
    </ol>
  );
}
