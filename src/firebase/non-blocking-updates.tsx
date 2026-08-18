'use client';

import {
  ref,
  set,
  push,
  update,
  remove,
  DatabaseReference,
} from 'firebase/database';

export function sanitizeForFirebase(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirebase(item));
  }
  const clean: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirebase(value);
    }
  }
  return clean;
}

export function setDocumentNonBlocking(docRef: DatabaseReference, data: any, options?: any) {
  const cleanData = sanitizeForFirebase(data);
  set(docRef, cleanData).catch(error => {
    console.error("Set error:", error);
  });
}

export function addDocumentNonBlocking(colRef: DatabaseReference, data: any) {
  const cleanData = sanitizeForFirebase(data);
  const promise = push(colRef, cleanData).catch(error => {
    console.error("Push error:", error);
  });
  return promise;
}

export function updateDocumentNonBlocking(docRef: DatabaseReference, data: any) {
  const cleanData = sanitizeForFirebase(data);
  update(docRef, cleanData).catch(error => {
    console.error("Update error:", error);
  });
}

export function deleteDocumentNonBlocking(docRef: DatabaseReference) {
  remove(docRef).catch(error => {
    console.error("Remove error:", error);
  });
}