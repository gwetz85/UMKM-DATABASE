'use client';

import {
  ref,
  set,
  push,
  update,
  remove,
  DatabaseReference,
} from 'firebase/database';

export function setDocumentNonBlocking(docRef: DatabaseReference, data: any, options?: any) {
  set(docRef, data).catch(error => {
    console.error("Set error:", error);
  });
}

export function addDocumentNonBlocking(colRef: DatabaseReference, data: any) {
  const promise = push(colRef, data).catch(error => {
    console.error("Push error:", error);
  });
  return promise;
}

export function updateDocumentNonBlocking(docRef: DatabaseReference, data: any) {
  update(docRef, data).catch(error => {
    console.error("Update error:", error);
  });
}

export function deleteDocumentNonBlocking(docRef: DatabaseReference) {
  remove(docRef).catch(error => {
    console.error("Remove error:", error);
  });
}