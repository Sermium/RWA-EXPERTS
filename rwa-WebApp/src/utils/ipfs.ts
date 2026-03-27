// src/utils/ipfs.ts

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
];

// Default gateway - you can change this to your preferred one
const DEFAULT_GATEWAY = IPFS_GATEWAYS[0];

/**
 * Convert IPFS URL to HTTP gateway URL
 * Handles: ipfs://, ipfs://ipfs/, raw CID, or already-http URLs
 */
export function ipfsToHttp(url: string | null | undefined): string {
  if (!url) return '';
  
  // Already an HTTP URL - return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Handle ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '').replace('ipfs/', '');
    return `${DEFAULT_GATEWAY}${cid}`;
  }
  
  // Handle /ipfs/ path
  if (url.startsWith('/ipfs/')) {
    const cid = url.replace('/ipfs/', '');
    return `${DEFAULT_GATEWAY}${cid}`;
  }
  
  // Assume it's a raw CID (starts with Qm or bafy)
  if (url.startsWith('Qm') || url.startsWith('bafy')) {
    return `${DEFAULT_GATEWAY}${url}`;
  }
  
  // Return as-is if we can't determine the format
  return url;
}
