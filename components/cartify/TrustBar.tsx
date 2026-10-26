import { Bell, CreditCard, LockKeyhole, PackageCheck, ShieldCheck } from "lucide-react";

export function TrustBar() {
  return (
    <section className="cartify-shell cartify-trust" aria-label="Trust and security">
      <div className="cartify-trust__main">
        <strong><ShieldCheck size={15} /> Why choose us?</strong>
        <span><LockKeyhole size={15} /> Secure privacy</span>
        <span><CreditCard size={15} /> Safe payments</span>
        <span><PackageCheck size={15} /> Delivery guarantee</span>
      </div>
      <div className="cartify-trust__alert">
        <Bell size={14} />
        <span>Security reminder: Please be wary of scam messages and links. Cartify will never ask for extra fees via SMS or email.</span>
        <a href="#security">View</a>
      </div>
    </section>
  );
}
