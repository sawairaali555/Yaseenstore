import { Truck, RotateCcw, Smartphone } from 'lucide-react';
export default function PromoBar() {
  return <div className="market-promo"><span><Truck size={15} /> Free shipping <small>on orders over Rs. 5,000</small></span><span><RotateCcw size={15} /> Free returns <small>within 30 days</small></span><a href="#download-app"><Smartphone size={15} /> Download the app <small>Shop on the go</small></a></div>;
}
