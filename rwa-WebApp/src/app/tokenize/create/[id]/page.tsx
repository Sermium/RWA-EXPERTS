// src/app/tokenize/create/[id]/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useChainId} from 'wagmi';
import { formatUnits, parseUnits, Address, zeroAddress } from 'viem';
import { 
  ArrowLeft, 
  Upload, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Settings,
  Send,
  Wallet,
  Globe,
  AlertTriangle,
  XCircle,
  Plus,
  Shield,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { useChainConfig } from '@/hooks/useChainConfig';
import { ERC20ABI, RWATokenizationFactoryABI } from '@/config/abis';

// Types
interface TokenizationApplication {
  id: string;
  user_address: string;
  asset_type: string;
  asset_name: string;
  asset_description: string;
  estimated_value: number;
  documentation_url?: string;
  status: string;
  fee_amount?: number;
  fee_currency?: string;
  fee_paid_at?: string;
  fee_tx_hash?: string;
  needs_escrow?: boolean;
  needs_dividends?: boolean;
  funding_goal?: number;
  funding_deadline?: string;
  token_name?: string;
  token_symbol?: string;
  desired_token_supply?: number;
  token_supply?: number;
  token_price_estimate?: number;
  fundraising_goal?: number;
  created_at: string;
  updated_at: string;
  // Media fields
  logo_url?: string;
  logo_ipfs?: string;
  banner_url?: string;
  banner_ipfs?: string;
  documents?: any;
  // Asset details
  asset_location?: string;
  asset_country?: string;
  legal_entity_name?: string;
  legal_entity_type?: string;
  legal_jurisdiction?: string;
  contact_name?: string;
  contact_email?: string;
  website?: string;
}

interface DeploymentResult {
  nftContract: Address;
  tokenContract: Address;
  escrowContract?: Address;
  dividendModule?: Address;
}

interface DocumentFile {
  name: string;
  url: string;
  type: string;
  category?: string;
}

interface ExistingDocument {
  name: string;
  type: string;
  url: string;
  mimeType?: string;
  size?: number;
}

interface DocumentsData {
  files?: ExistingDocument[];
  website?: string;
  useCase?: string;
  originalAssetType?: string;
  chainId?: number;
}

// Document categories for legal docs
const DOCUMENT_CATEGORIES = [
  { value: 'ownership_proof', label: 'Ownership Proof' },
  { value: 'valuation_report', label: 'Valuation Report' },
  { value: 'legal_opinion', label: 'Legal Opinion' },
  { value: 'company_registration', label: 'Company Registration' },
  { value: 'tax_certificate', label: 'Tax Certificate' },
  { value: 'insurance', label: 'Insurance Documents' },
  { value: 'audit_report', label: 'Audit Report' },
  { value: 'other', label: 'Other Supporting Document' },
];

// Step definitions
const STEPS = [
  { id: 1, name: 'Token Details', icon: FileText },
  { id: 2, name: 'Media & Files', icon: ImageIcon },
  { id: 3, name: 'Review & Deploy', icon: Send }
];

export default function TokenCreatePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = params.id as string;
  
  // Check if coming from dashboard
  const fromDashboard = searchParams.get('from') === 'dashboard';
  const backUrl = fromDashboard ? '/dashboard' : '/tokenize';
  const backLabel = fromDashboard ? 'Back to Dashboard' : 'Back to Applications';

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const walletChainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract();
  const deploymentHandledRef = useRef(false);
  
  // Chain config hook
  const {
    chainId,
    chainName,
    contracts,
    fees,
    explorerUrl,
    nativeCurrency,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    deployedChains
  } = useChainConfig();

  // Derive contract addresses
  const factoryAddress = useMemo(() => 
    contracts?.RWATokenizationFactory as Address | undefined,
    [contracts]
  );

  const usdcAddress = useMemo(() => 
    (contracts as any)?.USDC as Address | undefined,
    [contracts]
  );

  // Check for wrong chain
  const isWrongChain = useMemo(() => 
    isConnected && walletChainId !== chainId,
    [isConnected, walletChainId, chainId]
  );

  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [application, setApplication] = useState<TokenizationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    tokenName: '',
    tokenSymbol: '',
    totalSupply: '1000000',
    pricePerToken: '1',
    description: '',
    imageUrl: '',
    bannerUrl: '',
    useEscrow: true,
    fundingGoal: '100000',
    fundingDeadline: '',
    addDividends: false
  });

  // Document state
  const [existingDocuments, setExistingDocuments] = useState<ExistingDocument[]>([]);
  const [newDocuments, setNewDocuments] = useState<DocumentFile[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedDocCategory, setSelectedDocCategory] = useState('');

  // Deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'uploading' | 'approving' | 'deploying' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [deployedContracts, setDeployedContracts] = useState<DeploymentResult | null>(null);
  const [metadataUri, setMetadataUri] = useState<string>('');

  // Fee state
  const [contractFees, setContractFees] = useState({
    bundleFee: BigInt(0),
    escrowFeePercent: 0,
    dividendFeePercent: 0
  });

  // Balance state
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0));
  const [usdcAllowance, setUsdcAllowance] = useState<bigint>(BigInt(0));

  // Transaction receipt
  const { data: txReceipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash
  });

  // Format helpers
  const formatNumber = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US');
  };

  const formatCurrency = (value: string | number, decimals: number = 2): string => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(num)) return '$0';
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  };

  // Load application data
  const loadApplication = useCallback(async () => {
    if (!address || !applicationId) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/tokenization/${applicationId}`, {
        headers: { 
          'x-wallet-address': address,
          'x-chain-id': chainId?.toString() || ''
        }
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load application');
      }
      
      if (data.status !== 'approved') {
        throw new Error('Application must be approved before token creation');
      }
      
      setApplication(data);
      
      // Parse existing documents - handle both formats
      let docs: ExistingDocument[] = [];
      if (data.documents) {
        let documentsData: DocumentsData | ExistingDocument[];
        
        // Parse if string
        if (typeof data.documents === 'string') {
          try {
            documentsData = JSON.parse(data.documents);
          } catch {
            documentsData = { files: [] };
          }
        } else {
          documentsData = data.documents;
        }
        
        // Handle new format: { files: [...], website, useCase, ... }
        if (documentsData && typeof documentsData === 'object' && 'files' in documentsData) {
          docs = (documentsData as DocumentsData).files || [];
        }
        // Handle old format: [{ fileName, type, ipfsUrl, ... }]
        else if (Array.isArray(documentsData)) {
          docs = documentsData.map((doc: any) => ({
            name: doc.fileName || doc.name || 'Document',
            type: doc.type || 'other',
            url: doc.ipfsUrl || doc.url || '',
            mimeType: doc.mimeType,
            size: doc.size,
          }));
        }
      }
      setExistingDocuments(docs);
      
      // Pre-fill form data
      setFormData(prev => ({
        ...prev,
        tokenName: data.token_name || data.asset_name || '',
        tokenSymbol: data.token_symbol || '',
        totalSupply: data.token_supply?.toString() || data.desired_token_supply?.toString() || '1000000',
        pricePerToken: data.token_price_estimate?.toString() || '1',
        description: data.asset_description || '',
        imageUrl: data.logo_url || data.logo_ipfs || '',
        bannerUrl: data.banner_url || data.banner_ipfs || '',
        useEscrow: data.needs_escrow || false,  // Changed from escrowEnabled
        fundingGoal: data.funding_goal?.toString() || '100000',
        fundingDeadline: data.funding_deadline || '',
        addDividends: data.enable_dividends || false,  // Changed from dividendsEnabled
      }));
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [address, applicationId, chainId]);

  // Load contract fees
  const loadFees = useCallback(async () => {
    setContractFees({
      bundleFee: BigInt(100000000),
      escrowFeePercent: 1,
      dividendFeePercent: 0.5
    });
    
    if (!publicClient || !factoryAddress || !isDeployed) return;
    
    try {
      const bundleFee = await publicClient.readContract({
        address: factoryAddress,
        abi: RWATokenizationFactoryABI,
        functionName: 'bundleFee'
      });
      setContractFees(prev => ({ ...prev, bundleFee }));
    } catch (err) {
      console.warn('Could not read bundleFee from contract, using defaults');
    }
  }, [publicClient, factoryAddress, isDeployed]);

  // Load USDC balance and allowance
  const loadBalances = useCallback(async () => {
    if (!publicClient || !address || !usdcAddress || !factoryAddress) return;
    
    try {
      const [balance, allowance] = await Promise.all([
        publicClient.readContract({
          address: usdcAddress,
          abi: ERC20ABI,
          functionName: 'balanceOf',
          args: [address]
        }),
        publicClient.readContract({
          address: usdcAddress,
          abi: ERC20ABI,
          functionName: 'allowance',
          args: [address, factoryAddress]
        })
      ]);
      
      setUsdcBalance(balance as bigint);
      setUsdcAllowance(allowance as bigint);
    } catch (err) {
      console.error('Error loading balances:', err);
    }
  }, [publicClient, address, usdcAddress, factoryAddress]);

  // Effects
  useEffect(() => {if (address && applicationId) {loadApplication();}}, [address, applicationId, chainId]);
  useEffect(() => { loadFees(); }, [loadFees]);
  useEffect(() => { loadBalances(); }, [loadBalances]);

  useEffect(() => {
    if (!txReceipt) return;
    if (txReceipt.status !== 'success') return;
    if (deploymentHandledRef.current) return;
    if (!application) return;
    
    const handleDeploymentSuccess = async () => {
    deploymentHandledRef.current = true;
    
    console.log('[Deploy] Transaction confirmed, recording deployment...');
    
    try {
      let tokenAddress: Address = zeroAddress;
      let nftAddress: Address = zeroAddress;
      
      // Extract addresses from transaction receipt logs
      if (txReceipt && txReceipt.logs && txReceipt.logs.length > 0) {
        console.log('[Deploy] Found', txReceipt.logs.length, 'logs');
        
        // Collect all unique contract addresses from logs
        const knownAddresses = new Set([
          factoryAddress?.toLowerCase(),
          address?.toLowerCase(),
          usdcAddress?.toLowerCase(),
          '0x0000000000000000000000000000000000000000',
        ]);
        
        const contractAddresses: string[] = [];
        
        for (const log of txReceipt.logs) {
          const logAddr = log.address.toLowerCase();
          if (!knownAddresses.has(logAddr) && !contractAddresses.includes(logAddr)) {
            contractAddresses.push(logAddr);
            console.log('[Deploy] Found contract:', logAddr);
          }
        }
        
        // Order from factory: Compliance (0), Security Token (1), NFT (2)
        if (contractAddresses.length >= 3) {
          // contractAddresses[0] = Modular Compliance (not stored)
          tokenAddress = contractAddresses[1] as Address;  // Security Token
          nftAddress = contractAddresses[2] as Address;    // RWA Project NFT
        } else if (contractAddresses.length === 2) {
          // Might be Token and NFT without compliance
          tokenAddress = contractAddresses[0] as Address;
          nftAddress = contractAddresses[1] as Address;
        }
        
        console.log('[Deploy] Extracted - Token:', tokenAddress, 'NFT:', nftAddress);
      }
      
      const deployed: DeploymentResult = {
        nftContract: nftAddress,
        tokenContract: tokenAddress
      };
      
      // Send to API
      const response = await fetch(`/api/tokenization/${applicationId}/deploy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': address || ''
        },
        body: JSON.stringify({
          txHash,
          chainId,
          contracts: deployed,
          metadataUri,
          totalSupply: formData.totalSupply.replace(/,/g, ''),
          pricePerToken: formData.pricePerToken,
          tokenName: formData.tokenName,
          tokenSymbol: formData.tokenSymbol
        })
      });
      
      const responseData = await response.json();
      console.log('[Deploy] API Response:', response.status, responseData);
      
      setDeployedContracts(deployed);
      setDeploymentStatus('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } catch (err) {
      console.error('[Deploy] Error recording deployment:', err);
      deploymentHandledRef.current = false;
    } finally {
      setIsDeploying(false);
    }
  };
    
    handleDeploymentSuccess();
  }, [txReceipt?.status, application, factoryAddress, publicClient, address, txHash, chainId, metadataUri, formData, applicationId]);

  // Calculated values
  const totalFee = useMemo(() => contractFees.bundleFee, [contractFees.bundleFee]);
  const formattedTotalFee = useMemo(() => formatUnits(totalFee, 6), [totalFee]);
  const hasInsufficientBalance = useMemo(() => usdcBalance < totalFee, [usdcBalance, totalFee]);
  const needsApproval = useMemo(() => usdcAllowance < totalFee, [usdcAllowance, totalFee]);

  // All documents for NFT metadata
  const allDocuments = useMemo(() => [
    ...existingDocuments,
    ...newDocuments
  ], [existingDocuments, newDocuments]);

  // File upload handler
  const handleFileUpload = async (file: File, type: 'image' | 'document'): Promise<string> => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('type', type);
    
    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      body: uploadFormData
    });
    
    if (!response.ok) throw new Error('Failed to upload file');
    
    const data = await response.json();
    return data.url;
  };

  const formatDocumentType = (type: string): string => {
    const category = DOCUMENT_CATEGORIES.find(c => c.value === type);
    return category?.label || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Format file size
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Upload metadata to IPFS with all documents
  const uploadMetadata = async (): Promise<string> => {
    // Combine existing and new documents for NFT metadata
    const documentsForMetadata = [
      ...existingDocuments.map(doc => ({
        name: doc.name,
        type: doc.type,
        url: doc.url,
        size: doc.size,
        source: 'application'
      })),
      ...newDocuments.map(doc => ({
        name: doc.name,
        type: doc.category || doc.type,
        url: doc.url,
        source: 'deployment'
      }))
    ];

    const metadata = {
      name: formData.tokenName,
      symbol: formData.tokenSymbol,
      description: formData.description || application?.asset_description || '',
      image: formData.imageUrl || application?.logo_url || application?.logo_ipfs || '',
      banner: formData.bannerUrl || application?.banner_url || application?.banner_ipfs || '',
      external_url: application?.website || '',
      
      attributes: [
        { trait_type: 'Asset Type', value: application?.asset_type || 'Real World Asset' },
        { trait_type: 'Total Supply', value: formData.totalSupply.replace(/,/g, '') },
        { trait_type: 'Price per Token', value: formData.pricePerToken },
        { trait_type: 'Chain', value: chainName || 'Unknown' },
        { trait_type: 'Escrow Enabled', value: formData.useEscrow ? 'Yes' : 'No' },
        { trait_type: 'Dividends Enabled', value: formData.addDividends ? 'Yes' : 'No' },
        { trait_type: 'Document Count', value: documentsForMetadata.length.toString() },
      ],
      
      documents: documentsForMetadata,
      
      properties: {
        asset: {
          name: application?.asset_name || formData.tokenName,
          type: application?.asset_type || '',
          location: application?.asset_location || '',
          estimatedValue: application?.estimated_value || '',
        },
        legal: {
          companyName: application?.legal_entity_name || '',
          jurisdiction: application?.legal_jurisdiction || '',
          documentCount: documentsForMetadata.length,
          documents: documentsForMetadata,
        },
        contact: {
          name: application?.contact_name || '',
          email: application?.contact_email || '',
        },
        creation: {
          createdAt: new Date().toISOString(),
          platform: 'RWA Launchpad',
          chainId: chainId,
        }
      }
    };

    const res = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: 'metadata',  // ADD THIS - required by the API
        metadata 
      }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload metadata');
    }

    return data.url;
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploadingImage(true);
      const url = await handleFileUpload(file, 'image');
      setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle banner upload
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploadingBanner(true);
      const url = await handleFileUpload(file, 'image');
      setFormData(prev => ({ ...prev, bannerUrl: url }));
    } catch (err) {
      setError('Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  // Handle new document upload
  const handleNewDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!selectedDocCategory) {
      setError('Please select a document type first');
      return;
    }
    
    try {
      setUploadingDoc(true);
      const url = await handleFileUpload(file, 'document');
      setNewDocuments(prev => [...prev, {
        name: file.name,
        url,
        type: file.type,
        category: selectedDocCategory
      }]);
      setSelectedDocCategory('');
    } catch (err) {
      setError('Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Remove new document
  const removeNewDocument = (index: number) => {
    setNewDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const saveApplicationUpdates = async () => {
    if (!address || !applicationId) return;
    
    try {
      const response = await fetch(`/api/tokenization/${applicationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address
        },
        body: JSON.stringify({
          token_name: formData.tokenName,
          token_symbol: formData.tokenSymbol,
          token_supply: formData.totalSupply.replace(/,/g, ''),
          token_price_estimate: parseFloat(formData.pricePerToken),
          asset_description: formData.description,
          logo_url: formData.imageUrl || null,
          banner_url: formData.bannerUrl || null,
          needs_escrow: formData.useEscrow,
          funding_goal: formData.fundingGoal ? parseFloat(formData.fundingGoal.replace(/,/g, '')) : null,
          enable_dividends: formData.addDividends
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.warn('[TokenCreate] Failed to save updates:', data.error);
      } else {
        console.log('[TokenCreate] Application updated:', data);
      }
    } catch (err) {
      console.warn('[TokenCreate] Error saving updates:', err);
    }
  };

  // Handle deployment
  const handleDeploy = async () => {
    if (!factoryAddress || !isDeployed) {
      setError('Tokenization factory not available on this network');
      return;
    }
    
    if (isWrongChain) {
      setError('Please switch to the correct network');
      return;
    }

    if (!publicClient || !address) {
      setError('Wallet not connected');
      return;
    }
    
    try {
      setIsDeploying(true);
      setDeploymentStatus('uploading');
      setError(null);
      
      // Save form data to database before deploying
      await saveApplicationUpdates();
      
      const tokenUri = await uploadMetadata();
      setMetadataUri(tokenUri);

      setDeploymentStatus('deploying');
      
      const totalSupplyRaw = parseUnits(formData.totalSupply.replace(/,/g, ''), 18);
      const pricePerTokenWei = parseUnits(formData.pricePerToken.replace(/,/g, ''), 6);
      
      let hash: `0x${string}`;
      
      if (formData.useEscrow) {
        hash = await writeContractAsync({
          address: factoryAddress,
          abi: RWATokenizationFactoryABI,
          functionName: 'deployWithEscrow',
          args: [formData.tokenName, formData.tokenSymbol, totalSupplyRaw, tokenUri],
        });
      } else {
        hash = await writeContractAsync({
          address: factoryAddress,
          abi: RWATokenizationFactoryABI,
          functionName: 'deployNFTAndToken',
          args: [formData.tokenName, formData.tokenSymbol, totalSupplyRaw, tokenUri],
        });
      }
      
      setTxHash(hash);
      
    } catch (err: any) {
      console.error('Deployment error:', err);
      
      if (err.message?.includes('User rejected') || err.message?.includes('user rejected')) {
        setError('Transaction was rejected');
      } else if (err.message?.includes('insufficient funds')) {
        setError(`Insufficient ${nativeCurrency} for gas fees`);
      } else {
        setError(err.message || 'Deployment failed');
      }
      
      setDeploymentStatus('error');
      setIsDeploying(false);
    }
  };

  // Handle network switch
  const handleSwitchNetwork = async (targetChainId: number) => {
    try {
      await switchToChain(targetChainId as any);
    } catch (err) {
      console.error('Failed to switch network:', err);
    }
  };

  // Form handlers
  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.tokenName && formData.tokenSymbol && formData.totalSupply && formData.pricePerToken);
      case 2:
        return true;
      case 3:
        return isStepValid(1);
      default:
        return false;
    }
  };

  // Explorer URL helpers
  const getTxUrl = (hash: string) => `${explorerUrl}/tx/${hash}`;
  const getAddressUrl = (addr: string) => `${explorerUrl}/address/${addr}`;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading application...</p>
        </div>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md text-center">
          <Wallet className="h-16 w-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Connect Wallet</h2>
          <p className="text-gray-400 mb-6">Please connect your wallet to create tokens.</p>
        </div>
      </div>
    );
  }

  // Network not supported
  if (!isDeployed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md text-center">
          <Globe className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Network Not Supported</h2>
          <p className="text-gray-400 mb-6">Token creation is not available on {chainName}.</p>
          <div className="space-y-2">
            {deployedChains.map((chainInfo) => (
              <button
                key={chainInfo.chain.id}
                onClick={() => handleSwitchNetwork(chainInfo.chain.id)}
                disabled={isSwitching}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isSwitching && <Loader2 className="h-4 w-4 animate-spin" />}
                Switch to {chainInfo.name}
                {chainInfo.testnet && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Testnet</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Wrong chain warning
  if (isWrongChain) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Wrong Network</h2>
          <p className="text-gray-400 mb-6">Please switch to {chainName} to continue.</p>
          <button
            onClick={() => handleSwitchNetwork(chainId)}
            disabled={isSwitching}
            className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isSwitching && <Loader2 className="h-4 w-4 animate-spin" />}
            Switch to {chainName}
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !application) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link href={backUrl} className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300">
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (deploymentStatus === 'success' && deployedContracts) {
    return (
      <div className="min-h-screen bg-gray-900 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-gray-800 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">Token Created!</h2>
            <p className="text-gray-400 mb-8">
              Your {formData.tokenName} token has been successfully deployed on {chainName}.
            </p>

            <div className="flex items-center justify-center gap-2 mb-6">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isTestnet ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
              }`}>
                {chainName} {isTestnet ? '(Testnet)' : '(Mainnet)'}
              </span>
            </div>

            <div className="bg-gray-900 rounded-xl p-6 mb-8 text-left">
              <h3 className="text-lg font-semibold text-white mb-4">Deployed Contracts</h3>
              
              <div className="space-y-3">
                {deployedContracts.nftContract && deployedContracts.nftContract !== zeroAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">NFT Contract</span>
                    <a href={getAddressUrl(deployedContracts.nftContract)} target="_blank" rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-sm">
                      {deployedContracts.nftContract.slice(0, 8)}...{deployedContracts.nftContract.slice(-6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                
                {deployedContracts.tokenContract && deployedContracts.tokenContract !== zeroAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Token Contract</span>
                    <a href={getAddressUrl(deployedContracts.tokenContract)} target="_blank" rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-sm">
                      {deployedContracts.tokenContract.slice(0, 8)}...{deployedContracts.tokenContract.slice(-6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                
                {deployedContracts.escrowContract && deployedContracts.escrowContract !== zeroAddress && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Escrow Contract</span>
                    <a href={getAddressUrl(deployedContracts.escrowContract)} target="_blank" rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-sm">
                      {deployedContracts.escrowContract.slice(0, 8)}...{deployedContracts.escrowContract.slice(-6)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {txHash && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Transaction</span>
                    <a href={getTxUrl(txHash)} target="_blank" rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono text-sm">
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={backUrl} className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors text-center">
                Back to Dashboard
              </Link>
              {deployedContracts?.tokenContract && deployedContracts.tokenContract !== zeroAddress && (
                <a 
                  href={getAddressUrl(deployedContracts.tokenContract)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium transition-colors text-center flex items-center justify-center gap-2"
                >
                  View Token on Explorer
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href={backUrl} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4" /> {backLabel}
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Create Token</h1>
              <p className="text-gray-400 mt-1">Deploy your tokenized asset on {chainName}</p>
            </div>
            
            <div className={`px-4 py-2 rounded-lg ${isTestnet ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}`}>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="font-medium">{chainName}</span>
                {isTestnet && <span className="text-xs">(Testnet)</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentStep === step.id
                      ? 'bg-purple-600 text-white'
                      : currentStep > step.id
                      ? 'bg-green-600/20 text-green-400'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  <step.icon className="h-5 w-5" />
                  <span className="hidden sm:inline">{step.name}</span>
                </button>
                {index < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 mx-2 ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-700'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1"><p className="text-red-400">{error}</p></div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">×</button>
          </div>
        )}

        {/* Form Content */}
        <div className="bg-gray-800 rounded-2xl p-8">
          {/* Step 1: Token Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Token Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-400 mb-2">Token Name *</label>
                  <input
                    type="text"
                    value={formData.tokenName}
                    onChange={(e) => handleInputChange('tokenName', e.target.value)}
                    placeholder="e.g., Real Estate Token"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Token Symbol *</label>
                  <input
                    type="text"
                    value={formData.tokenSymbol}
                    onChange={(e) => handleInputChange('tokenSymbol', e.target.value.toUpperCase())}
                    placeholder="e.g., RET"
                    maxLength={8}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Total Supply *</label>
                  <input
                    type="text"
                    value={formatNumber(formData.totalSupply)}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                      handleInputChange('totalSupply', rawValue);
                    }}
                    placeholder="1,000,000"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 mb-2">Price per Token (USDC) *</label>
                  <input
                    type="text"
                    value={formData.pricePerToken}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/[^0-9.]/g, '');
                      handleInputChange('pricePerToken', rawValue);
                    }}
                    placeholder="1.00"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your tokenized asset..."
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="mt-6 p-4 bg-gray-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Selected Features (from application)</h3>
                <div className="flex flex-wrap gap-2">
                  {formData.useEscrow && (
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">Escrow Enabled</span>
                  )}
                  {formData.addDividends && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">Dividends Enabled</span>
                  )}
                  {!formData.useEscrow && !formData.addDividends && (
                    <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">Standard Token</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Media & Files */}
          {currentStep === 2 && (
          <div className="space-y-8">
            <h2 className="text-xl font-semibold text-white mb-4">Media & Documents</h2>
            
            {/* Logo & Banner Section - Inline */}
            <div className="flex gap-6">
              {/* Token Logo - Square 1:1 */}
              <div className="flex-shrink-0">
                <label className="block text-gray-400 mb-2">Token Logo (1:1)</label>
                <div className="w-40 h-40 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center overflow-hidden bg-gray-900">
                  {formData.imageUrl ? (
                    <img
                      src={formData.imageUrl}
                      alt="Token Logo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      {uploadingImage ? (
                        <Loader2 className="h-8 w-8 text-purple-500 mx-auto animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-500 text-xs">400x400</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {formData.imageUrl && (
                    <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                      {application?.logo_url || application?.logo_ipfs ? 'Loaded' : 'New'}
                    </span>
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs transition-colors">
                    {uploadingImage ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    {formData.imageUrl ? 'Change' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>

              {/* Token Banner - 3:1 ratio */}
              <div className="flex-1 min-w-0">
                <label className="block text-gray-400 mb-2">Project Banner (3:1)</label>
                <div className="w-full h-40 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center overflow-hidden bg-gray-900">
                  {formData.bannerUrl ? (
                    <img
                      src={formData.bannerUrl}
                      alt="Token Banner"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      {uploadingBanner ? (
                        <Loader2 className="h-8 w-8 text-purple-500 mx-auto animate-spin" />
                      ) : (
                        <>
                          <ImageIcon className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-500 text-xs">1200x400 recommended</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {formData.bannerUrl && (
                    <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded">
                      {application?.banner_url || application?.banner_ipfs ? 'Loaded' : 'New'}
                    </span>
                  )}
                  <label className="cursor-pointer inline-flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs transition-colors">
                    {uploadingBanner ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    {formData.bannerUrl ? 'Change' : 'Upload'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                      disabled={uploadingBanner}
                    />
                  </label>
                </div>
              </div>
            </div>

              {/* Existing Documents from Application */}
              {existingDocuments.length > 0 && (
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-400" />
                    Application Documents
                    <span className="ml-auto bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
                      {existingDocuments.length} documents
                    </span>
                  </h3>
                  
                  {existingDocuments.length > 0 ? (
                    <div className="space-y-3">
                      {existingDocuments.map((doc, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg">
                          <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">
                                {formatDocumentType(doc.type)}
                              </span>
                              {doc.size && (
                                <span className="text-xs text-gray-500">{formatFileSize(doc.size)}</span>
                              )}
                              {doc.mimeType && (
                                <span className="text-xs text-gray-500">{doc.mimeType.split('/')[1]?.toUpperCase()}</span>
                              )}
                            </div>
                          </div>
                          <a 
                            href={doc.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            NFT
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No documents from application</p>
                  )}
                  
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-blue-300 text-sm flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      These documents will be permanently linked to your NFT certificate
                    </p>
                  </div>
                </div>
              )}

              {/* Additional Documents */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-purple-400" />
                    Additional Legal Documents
                  </h3>
                  <span className="text-sm text-gray-400">
                    {newDocuments.length} additional document{newDocuments.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* New Documents List */}
                {newDocuments.length > 0 && (
                  <div className="bg-gray-900 rounded-xl p-4 space-y-2 mb-4">
                    {newDocuments.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-purple-400" />
                          <div>
                            <p className="text-white text-sm">{doc.name}</p>
                            <p className="text-gray-500 text-xs capitalize">
                              {doc.category?.replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-1 rounded">New</span>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button onClick={() => removeNewDocument(idx)} className="text-red-400 hover:text-red-300">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload New Document */}
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-6">
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="flex-1 w-full">
                      <select
                        value={selectedDocCategory}
                        onChange={(e) => setSelectedDocCategory(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="">Select document type...</option>
                        {DOCUMENT_CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className={`cursor-pointer px-6 py-3 rounded-lg text-white font-medium transition-colors flex items-center gap-2 ${
                      selectedDocCategory 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}>
                      {uploadingDoc ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Document
                        </>
                      )}
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleNewDocumentUpload}
                        disabled={uploadingDoc || !selectedDocCategory}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-gray-500 text-sm text-center mt-4">
                    PDF, DOC, DOCX, or images up to 50MB. All documents will be linked in the NFT metadata.
                  </p>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-400 font-medium">Document Storage</p>
                  <p className="text-blue-400/70 text-sm">
                    All documents are stored on IPFS and their links will be permanently embedded in the NFT metadata, 
                    ensuring transparency and immutability of your asset's legal documentation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Review & Deploy */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-white mb-4">Review & Deploy</h2>
              
              {/* Summary */}
              <div className="bg-gray-900 rounded-xl p-6 space-y-4">
                <h3 className="text-lg font-medium text-white">Token Summary</h3>
                
                {/* Token Preview */}
                {formData.imageUrl && (
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-700">
                    <img src={formData.imageUrl} alt="Token" className="w-16 h-16 rounded-lg object-cover" />
                    <div>
                      <p className="text-white font-semibold">{formData.tokenName}</p>
                      <p className="text-gray-400">${formData.tokenSymbol}</p>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Name</p>
                    <p className="text-white">{formData.tokenName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Symbol</p>
                    <p className="text-white">{formData.tokenSymbol || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Supply</p>
                    <p className="text-white">{formatNumber(formData.totalSupply)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Price per Token</p>
                    <p className="text-white">${parseFloat(formData.pricePerToken).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Value</p>
                    <p className="text-white font-semibold">
                      {formatCurrency(parseFloat(formData.totalSupply.replace(/,/g, '')) * parseFloat(formData.pricePerToken))}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Network</p>
                    <p className="text-white flex items-center gap-2">
                      {chainName}
                      {isTestnet && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Testnet</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Features</p>
                    <p className="text-white">
                      {formData.useEscrow ? 'Escrow' : ''}
                      {formData.useEscrow && formData.addDividends ? ', ' : ''}
                      {formData.addDividends ? 'Dividends' : ''}
                      {!formData.useEscrow && !formData.addDividends ? 'Standard' : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Documents</p>
                    <p className="text-white">{allDocuments.length} document{allDocuments.length !== 1 ? 's' : ''} included</p>
                  </div>
                </div>

                {formData.useEscrow && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Escrow Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Funding Goal</p>
                        <p className="text-white">{formatCurrency(formData.fundingGoal, 0)} USDC</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Deadline</p>
                        <p className="text-white">{formData.fundingDeadline || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Confirmed Badge */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-green-400 font-medium">Payment Confirmed</p>
                  <p className="text-green-400/70 text-sm">
                    Fee of {formatCurrency(application?.fee_amount || 0, 0)} {application?.fee_currency || 'USDC'} has been paid
                  </p>
                </div>
              </div>
              
              {/* Transaction Status */}
              {(isDeploying || deploymentStatus !== 'idle') && (
                <div className="bg-gray-900 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Deployment Progress</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {deploymentStatus === 'uploading' ? (
                        <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
                      ) : deploymentStatus !== 'idle' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
                      )}
                      <span className={deploymentStatus === 'uploading' ? 'text-white' : 'text-gray-400'}>
                        Uploading metadata & documents to IPFS
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {deploymentStatus === 'deploying' || isConfirming ? (
                        <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
                      ) : deploymentStatus === 'success' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
                      )}
                      <span className={deploymentStatus === 'deploying' ? 'text-white' : 'text-gray-400'}>
                        Deploying contracts
                      </span>
                    </div>
                  </div>
                  
                  {txHash && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <a href={getTxUrl(txHash)} target="_blank" rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 flex items-center gap-2 text-sm">
                        View transaction on Explorer
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-700">
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1 || isDeploying}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg text-white font-medium transition-colors"
            >
              Previous
            </button>
            
            {currentStep < 3 ? (
              <button
                onClick={async () => {
                  // Save before moving to next step
                  await saveApplicationUpdates();
                  setCurrentStep(prev => Math.min(3, prev + 1));
                }}
                disabled={!isStepValid(currentStep)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg text-white font-medium transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleDeploy}
                disabled={isDeploying || !isStepValid(3)}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg text-white font-medium transition-colors flex items-center gap-2"
              >
                {isDeploying || isWritePending || isConfirming ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {deploymentStatus === 'uploading' ? 'Uploading...' : 
                    deploymentStatus === 'deploying' ? 'Deploying...' : 
                    isConfirming ? 'Confirming...' : 'Processing...'}
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Deploy Token
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
