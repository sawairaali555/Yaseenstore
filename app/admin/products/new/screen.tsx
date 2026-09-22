"use client";

import { useEffect } from "react";

export default function Listing() {
  useEffect(() => {
    window.location.replace("/admin?section=new_product");
  }, []);

  return null;
}
