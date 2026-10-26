import { ShieldCheck, PackageCheck, RotateCcw, BadgeCheck } from 'lucide-react';
export default function BenefitsBanner() {
  return <section className="market-benefits" aria-label="Shopping guarantees">{[[ShieldCheck,'Secure payments'],[PackageCheck,'Delivery guarantee'],[RotateCcw,'Easy returns'],[BadgeCheck,'Price adjustment']].map(([Icon,label]) => <div key={label}><Icon size={20} /><span>{label}</span></div>)}</section>;
}
