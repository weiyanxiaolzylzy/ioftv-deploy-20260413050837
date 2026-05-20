let sharedPlyPayload = null;

export function setSharedPlyPayload(payload) {
  sharedPlyPayload = payload || null;
}

export function getSharedPlyPayload() {
  return sharedPlyPayload;
}

export function clearSharedPlyPayload() {
  sharedPlyPayload = null;
}

export function isServerPlyFileId(fileId) {
  return !!(fileId && !String(fileId).startsWith('local-'));
}
