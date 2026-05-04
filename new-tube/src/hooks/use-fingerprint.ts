// hooks/useFingerprint.ts
"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";


export const getFingerprint = async () => {
  let id;

  const fp = await FingerprintJS.load();
  const result = await fp.get();

  id = result.visitorId;
  localStorage.setItem("viewerId", id);
  
  return id;
};
