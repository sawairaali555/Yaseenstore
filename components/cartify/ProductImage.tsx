"use client";

import { useState } from "react";

export function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  return <>
    {!ready && !failed && <span className="cartify-image-skeleton" aria-hidden="true" />}
    {failed ? <span className="cartify-image-fallback">{alt}</span> : (
      // Local placeholder images use native lazy loading without a remote optimizer.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} loading="lazy" decoding="async" width={400} height={400}
        ref={(image) => { if (image?.complete && image.naturalWidth > 0) setReady(true); }}
        onLoad={() => setReady(true)} onError={() => setFailed(true)} style={{ opacity: ready ? 1 : 0 }} />
    )}
  </>;
}
