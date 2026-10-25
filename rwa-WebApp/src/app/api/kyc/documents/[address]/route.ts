import { NextRequest, NextResponse } from 'next/server';
import { getKYCDocuments } from '@/lib/kycStorage';
import { validateSelfOrAdminAccess } from '@/lib/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;
    
    // Also rejects anything that is not exactly an address, so it cannot
    // reach outside the storage folder.
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    // KYC documents are the wallet owner's, and the reviewers'.
    const auth = await validateSelfOrAdminAccess(request, address);
    if (!auth.isValid) return auth.error;
    
    const documents = await getKYCDocuments(address);
    
    if (!documents) {
      return NextResponse.json({ 
        found: false, 
        message: 'No documents found for this address' 
      });
    }
    
    return NextResponse.json({
      found: true,
      documents
    });
    
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
