"use client";

import { useEffect, useMemo, useState } from "react";
import { products } from "../data/products";

const shoppers = [
  { name: "Abdul", city: "Faisalabad", ago: "Just Now" },
  { name: "Ayesha", city: "Lahore", ago: "5 minutes ago" },
  { name: "Usman", city: "Islamabad", ago: "12 minutes ago" },
  { name: "Hira", city: "Rawalpindi", ago: "1 hour ago" },
  { name: "Ali", city: "Karachi", ago: "2 hours ago" },
  { name: "Sana", city: "Multan", ago: "4 hours ago" },
];

export default function SalePopup() {
  const notices = useMemo(
    () => products.length ? shoppers.map((shopper, index) => ({ ...shopper, product: products[index % products.length] })) : [],
    [],
  );
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notices.length) return;

    let hideTimer;
    const showNext = () => {
      setVisible(true);
      hideTimer = window.setTimeout(() => setVisible(false), 5000);
      setIndex((current) => (current + 1) % notices.length);
    };
    const firstTimer = window.setTimeout(showNext, 1200);
    const interval = window.setInterval(showNext, 15000);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(hideTimer);
      window.clearInterval(interval);
    };
  }, [notices.length]);

  if (!notices.length) return null;
  const notice = notices[(index + notices.length - 1) % notices.length];

  return (
    <aside className={`sale-popup ${visible ? "show" : ""}`} aria-live="polite" aria-hidden={!visible}>
      <a href={`/product/${notice.product.id}`} className="sale-popup__image" tabIndex={visible ? 0 : -1}>
        <img src={notice.product.images[0]} alt="" />
      </a>
      <div className="sale-popup__copy">
        <p><strong>{notice.name}</strong> <span className="sale-popup__muted">purchased</span></p>
        <p className="sale-popup__product">{notice.product.name}</p>
        <small>{notice.ago} <span className="sale-popup__verified">✓</span> Verified</small>
      </div>
      <button type="button" className="sale-popup__close" onClick={() => setVisible(false)} aria-label="Dismiss purchase notification" tabIndex={visible ? 0 : -1}>×</button>
    </aside>
  );
}
