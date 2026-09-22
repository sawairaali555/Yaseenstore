"use client";

import { useEffect } from "react";

export default function ProductEdit() {
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) {
      window.location.replace(`/admin?section=edit_product&id=${encodeURIComponent(id)}`);
    } else {
      window.location.replace("/admin?section=products");
    }
  }, []);

  return null;
}
