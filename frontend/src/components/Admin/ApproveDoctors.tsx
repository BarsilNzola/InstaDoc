import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { readContract } from "wagmi/actions";
import { storeJSON, retrieveJSON, testIPFSConnection } from "../../lib/ipfs";
import { config } from "../Shared/wallet";
import hubArtifact from "../../abis/InstaDocHub.json";
import doctorRegistryArtifact from "../../abis/DoctorRegistry.json";

interface Doctor {
  address: string;
  name: string;
  specialization: string;
  profileCID: string;
  verified: boolean;
  bio?: string;
  qualifications?: string[];
  contactInfo?: string;
}

interface DoctorProfile {
  name: string;
  specialization: string;
  bio?: string;
  qualifications?: string[];
  contactInfo?: string;
  timestamp: number;
}

export default function ApproveDoctors() {
  // form state
  const [doctorAddress, setDoctorAddress] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  // status state
  const [uploading, setUploading] = useState(false);
  const [ipfsStatus, setIpfsStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  const { chain, address: currentUserAddress } = useAccount();

  const hubAddress = import.meta.env.VITE_HUB_ADDRESS as string | undefined;
  const hubAbi = hubArtifact.abi;
  const doctorRegistryAbi = doctorRegistryArtifact.abi;

  // Test IPFS connection once on mount
  useEffect(() => {
    (async () => {
      setIpfsStatus('testing');
      try {
        const ok = await testIPFSConnection();
        setIpfsStatus(ok ? 'connected' : 'error');
      } catch {
        setIpfsStatus('error');
      }
    })();
  }, []);

  // Get doctor registry address & verified addresses (single hooks - top-level only)
  const { data: doctorRegistryAddr } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "doctorRegistry",
  });

  const {
    data: verifiedDoctorAddresses,
    refetch: refetchDoctors,
    isLoading: isLoadingDoctors,
  } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "getAllVerifiedDoctors",
  });

  const isAddressValid = doctorAddress && doctorAddress.match(/^0x[a-fA-F0-9]{40}$/);
  const { data: isDoctorApproved, refetch: refetchDoctorCheck } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "isDoctorVerified",
    args: [doctorAddress as `0x${string}`],
    query: {
      // the hook is always called; the network request is gated by enabled
      enabled: !!isAddressValid && !!hubAddress,
    },
  });

  // write hooks (top-level)
  const {
    writeContract: approveDoctor,
    isPending: isApproving,
    data: approveTxHash,
    reset: resetApprove,
  } = useWriteContract();

  const {
    writeContract: revokeDoctor,
    isPending: isRevoking,
    data: revokeTxHash,
    reset: resetRevoke,
  } = useWriteContract();

  // receipts
  const { isLoading: isConfirmingApprove, isSuccess: isApproved, error: approveError } =
    useWaitForTransactionReceipt({ hash: approveTxHash });

  const { isLoading: isConfirmingRevoke, isSuccess: isRevoked, error: revokeError } =
    useWaitForTransactionReceipt({ hash: revokeTxHash });

  // reset transaction hooks when chain or mount changes
  useEffect(() => {
    resetApprove();
    resetRevoke();
    setTransactionStatus('idle');
  }, [chain?.id, resetApprove, resetRevoke]);

  // post-approval behavior
  useEffect(() => {
    if (isApproved) {
      setTransactionStatus('success');

      // small delayed refetch to allow chain reorgs / indexing
      setTimeout(async () => {
        await refetchDoctors();
        await refetchDoctorCheck();
      }, 2000);

      setTimeout(() => {
        setDoctorAddress("");
        setDoctorName("");
        setSpecialization("");
        setBio("");
        setQualifications("");
        setContactInfo("");
        setTransactionStatus('idle');
        resetApprove();
      }, 4000);
    }
  }, [isApproved, refetchDoctors, refetchDoctorCheck, resetApprove]);

  // post-revoke behavior
  useEffect(() => {
    if (isRevoked) {
      setTransactionStatus('success');

      // multiple refetch attempts to ensure UI eventually catches up
      (async () => {
        await refetchDoctors();
        setTimeout(async () => await refetchDoctors(), 3000);
        setTimeout(async () => await refetchDoctors(), 6000);
      })();

      setTimeout(() => {
        setTransactionStatus('idle');
        resetRevoke();
      }, 7000);
    }
  }, [isRevoked, refetchDoctors, resetRevoke]);

  // transaction errors
  useEffect(() => {
    if (approveError || revokeError) {
      setTransactionStatus('error');
      console.error("Transaction error:", approveError || revokeError);
    }
  }, [approveError, revokeError]);

  // upload helpers
  const uploadDoctorProfile = async (profile: DoctorProfile): Promise<string> => {
    const timeout = new Promise<string>((_, reject) => setTimeout(() => reject(new Error("IPFS upload timeout")), 30000));
    const upload = storeJSON(profile);
    return await Promise.race([upload, timeout]);
  };

  const fetchDoctorProfile = async (cid: string): Promise<DoctorProfile | null> => {
    if (!cid) return null;
    try {
      const data = await retrieveJSON(cid);
      if (data && typeof data === "object") {
        return {
          name: data.name || "",
          specialization: data.specialization || "",
          bio: data.bio,
          qualifications: data.qualifications,
          contactInfo: data.contactInfo,
          timestamp: data.timestamp || Date.now(),
        };
      }
      return null;
    } catch (err) {
      console.error("Failed to fetch IPFS profile:", err);
      return null;
    }
  };

  // Approve doctor flow
  const handleApproveDoctor = async () => {
    if (!doctorAddress || !doctorName || !specialization) {
      alert("Please fill in doctor address, name and specialization");
      return;
    }
    if (!doctorAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert("Please enter a valid address");
      return;
    }
    if (!hubAddress) {
      alert("Hub contract not configured");
      return;
    }
    if (chain?.id !== 2484) {
      alert("Please switch to U2U Testnet in your wallet");
      return;
    }
    if (isDoctorApproved === true) {
      alert("This doctor is already approved");
      return;
    }

    setUploading(true);
    setTransactionStatus('pending');

    try {
      const profile: DoctorProfile = {
        name: doctorName,
        specialization,
        bio: bio || undefined,
        qualifications: qualifications ? qualifications.split(",").map(s => s.trim()) : undefined,
        contactInfo: contactInfo || undefined,
        timestamp: Date.now(),
      };

      let profileCID = "";
      if (ipfsStatus === 'connected') {
        try {
          profileCID = await uploadDoctorProfile(profile);
        } catch (err) {
          console.warn("IPFS upload failed, continuing without CID", err);
          profileCID = "";
        }
      }

      approveDoctor({
        address: hubAddress as `0x${string}`,
        abi: hubAbi,
        functionName: "approveDoctor",
        args: [doctorAddress, doctorName, specialization, profileCID || ""],
        gas: BigInt(500000),
      });
    } catch (err: any) {
      console.error("Approval failed:", err);
      setTransactionStatus('error');
      alert("Error: " + (err?.message || err));
    } finally {
      setUploading(false);
    }
  };

  // Revoke doctor
  const handleRevokeDoctor = async (addr: string) => {
    if (!hubAddress) {
      alert("Hub contract not configured");
      return;
    }
    if (!confirm(`Revoke doctor ${addr}?`)) return;

    setTransactionStatus('pending');
    revokeDoctor({
      address: hubAddress as `0x${string}`,
      abi: hubAbi,
      functionName: "revokeDoctor",
      args: [addr],
      gas: BigInt(300000),
    });
  };

  // existing doctors state
  const [existingDoctors, setExistingDoctors] = useState<Doctor[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // dedupe addresses
  const uniqueDoctorAddresses = useMemo(() => {
    if (!verifiedDoctorAddresses || !Array.isArray(verifiedDoctorAddresses)) return [];
    return Array.from(new Set(verifiedDoctorAddresses as string[]));
  }, [verifiedDoctorAddresses]);

  // load doctor details via readContract inside async function (no hooks in map)
  useEffect(() => {
    const loadDoctorDetails = async () => {
      if (!hubAddress || uniqueDoctorAddresses.length === 0) {
        setExistingDoctors([]);
        return;
      }

      setLoadingProfiles(true);

      try {
        const doctorDetails = await Promise.all(
          uniqueDoctorAddresses.map(async (addr) => {
            try {
              const details: any = await readContract(config, {
                address: hubAddress as `0x${string}`,
                abi: hubAbi,
                functionName: "getDoctorDetails",
                args: [addr],
              });

              const profileCID = details?.[2] ?? details?.profileCID ?? "";
              let ipfsProfile: DoctorProfile | null = null;
              if (profileCID) {
                ipfsProfile = await fetchDoctorProfile(profileCID);
              }

              const name = ipfsProfile?.name || details?.[0] || `Dr. ${addr.slice(0, 6)}...${addr.slice(-4)}`;
              const specializationVal = ipfsProfile?.specialization || details?.[1] || "General Medicine";

              return {
                address: addr,
                name,
                specialization: specializationVal,
                profileCID,
                verified: details?.[3] ?? true,
                bio: ipfsProfile?.bio,
                qualifications: ipfsProfile?.qualifications,
                contactInfo: ipfsProfile?.contactInfo,
              } as Doctor;
            } catch (err) {
              console.error(`Error loading doctor ${addr}:`, err);
              return {
                address: addr,
                name: `Dr. ${addr.slice(0, 6)}...${addr.slice(-4)}`,
                specialization: "General Medicine",
                profileCID: "",
                verified: true,
              } as Doctor;
            }
          })
        );

        setExistingDoctors(doctorDetails);
      } catch (err) {
        console.error("Failed to load doctor details:", err);
        setExistingDoctors([]);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadDoctorDetails();
    // intentionally depend on hubAddress and uniqueDoctorAddresses
  }, [hubAddress, uniqueDoctorAddresses]);

  // UI helpers
  const isSubmitting = uploading || isApproving || isConfirmingApprove || isRevoking || isConfirmingRevoke;
  const isDoctorAlreadyApproved = isDoctorApproved === true;
  const isWrongNetwork = chain?.id !== 2484;
  const isApproveDisabled = isSubmitting || isWrongNetwork || isDoctorAlreadyApproved;

  const getIpfsStatusColor = () => {
    switch (ipfsStatus) {
      case "connected": return { bg: '#f0f9f0', border: '#86efac', text: '#166534' };
      case "error": return { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' };
      case "testing": return { bg: '#fffbeb', border: '#fcd34d', text: '#d97706' };
      default: return { bg: '#f9f5f0', border: '#d6d3d1', text: '#57534e' };
    }
  };

  const getIpfsStatusText = () => {
    switch (ipfsStatus) {
      case "connected": return "✅ IPFS Connected";
      case "error": return "❌ IPFS Error";
      case "testing": return "🔄 Testing IPFS...";
      default: return "⚪ IPFS Idle";
    }
  };

  const getTransactionStatusText = () => {
    switch (transactionStatus) {
      case "success": return "✅ Transaction successful!";
      case "error": return "❌ Transaction failed";
      case "pending": return "🔄 Transaction in progress...";
      default: return "";
    }
  };

  const ipfsStatusColors = getIpfsStatusColor();

  return (
    <div className="space-y-6">
      {/* Transaction Status */}
      {transactionStatus !== "idle" && (
        <div 
          className="p-4 border rounded-lg shadow-sm"
          style={{
            backgroundColor: transactionStatus === "success" ? '#f0f9f0' : 
                           transactionStatus === "error" ? '#fef2f2' : '#fffbeb',
            borderColor: transactionStatus === "success" ? '#86efac' : 
                        transactionStatus === "error" ? '#fca5a5' : '#fcd34d',
            color: transactionStatus === "success" ? '#166534' : 
                  transactionStatus === "error" ? '#dc2626' : '#d97706'
          }}
        >
          <div className="flex justify-between items-center">
            <span className="font-semibold">{getTransactionStatusText()}</span>
            <button 
              onClick={() => setTransactionStatus('idle')} 
              className="text-sm underline hover:no-underline transition-all"
            >
              Dismiss
            </button>
          </div>
          {transactionStatus === "success" && (
            <p className="text-sm mt-2">
              The list will update automatically. If revoked doctors still appear, click "Refresh List".
            </p>
          )}
        </div>
      )}

      {/* IPFS status */}
      <div 
        className="p-4 border rounded-lg shadow-sm"
        style={{
          backgroundColor: ipfsStatusColors.bg,
          borderColor: ipfsStatusColors.border,
          color: ipfsStatusColors.text
        }}
      >
        <div className="flex justify-between items-center">
          <span className="font-semibold">{getIpfsStatusText()}</span>
          <button 
            onClick={async () => { 
              setIpfsStatus('testing'); 
              const ok = await testIPFSConnection(); 
              setIpfsStatus(ok ? 'connected' : 'error'); 
            }} 
            className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 hover:shadow-md"
            style={{ backgroundColor: '#f2ead3', color: '#344f1f' }}
          >
            Test Connection
          </button>
        </div>
        {ipfsStatus === "error" && (
          <p className="text-sm mt-2">IPFS not available. Doctor profiles will be stored on-chain only.</p>
        )}
      </div>

      {/* Register form */}
      <div className="p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3' }}>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f4991a' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Register New Doctor</h3>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>
              Doctor Wallet Address *
            </label>
            <input 
              type="text" 
              value={doctorAddress} 
              onChange={(e) => setDoctorAddress(e.target.value)} 
              placeholder="0x..." 
              className={`w-full p-3 border rounded-lg font-mono transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
                isDoctorAlreadyApproved ? "border-red-500 bg-red-50" : "border-gray-300"
              }`}
              style={{ 
                backgroundColor: '#f9f5f0',
                borderColor: isDoctorAlreadyApproved ? '#ef4444' : '#d6d3d1'
              }}
            />
            {isDoctorAlreadyApproved && (
              <p className="text-red-600 text-sm mt-2 flex items-center space-x-1">
                <span>⚠️</span>
                <span>This doctor is already approved!</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>
              Doctor Name *
            </label>
            <input 
              type="text" 
              value={doctorName} 
              onChange={(e) => setDoctorName(e.target.value)} 
              placeholder="Dr. John Smith" 
              className="w-full p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ backgroundColor: '#f9f5f0' }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>
              Specialization *
            </label>
            <select 
              value={specialization} 
              onChange={(e) => setSpecialization(e.target.value)} 
              className="w-full p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 appearance-none bg-no-repeat bg-right"
              style={{ 
                backgroundColor: '#f9f5f0',
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23344f1f' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.75rem center',
                backgroundSize: '1.5em 1.5em'
              }}
            >
              <option value="">Select specialization...</option>
              <option>Cardiology</option>
              <option>Pediatrics</option>
              <option>Dermatology</option>
              <option>Neurology</option>
              <option>Orthopedics</option>
              <option>General Medicine</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>
              Bio (Optional)
            </label>
            <textarea 
              rows={3} 
              value={bio} 
              onChange={(e) => setBio(e.target.value)} 
              className="w-full p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 resize-vertical"
              style={{ backgroundColor: '#f9f5f0' }}
              placeholder="Brief professional background..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>
              Qualifications (Optional)
            </label>
            <input 
              type="text" 
              value={qualifications} 
              onChange={(e) => setQualifications(e.target.value)} 
              placeholder="MD, PhD, Board Certified (comma separated)" 
              className="w-full p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ backgroundColor: '#f9f5f0' }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>
              Contact Info (Optional)
            </label>
            <input 
              type="text" 
              value={contactInfo} 
              onChange={(e) => setContactInfo(e.target.value)} 
              placeholder="email@example.com or phone" 
              className="w-full p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ backgroundColor: '#f9f5f0' }}
            />
          </div>

          <div className="flex space-x-4 pt-4">
            <button 
              onClick={handleApproveDoctor} 
              disabled={isApproveDisabled}
              className="flex-1 py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              style={{ 
                backgroundColor: isDoctorAlreadyApproved ? '#9ca3af' : '#f4991a', 
                color: '#ffffff'
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>
                    {uploading ? "Uploading Profile..." : 
                     isApproving ? "Approving..." : 
                     isConfirmingApprove ? "Confirming..." : "Processing..."}
                  </span>
                </>
              ) : isDoctorAlreadyApproved ? (
                "Already Approved"
              ) : (
                "Approve Doctor"
              )}
            </button>

            <button 
              onClick={async () => { await refetchDoctors(); await refetchDoctorCheck(); }} 
              disabled={isLoadingDoctors}
              className="px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-md disabled:opacity-50 flex items-center space-x-2"
              style={{ backgroundColor: '#344f1f', color: '#ffffff' }}
            >
              {isLoadingDoctors ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Refreshing...</span>
                </>
              ) : (
                "Refresh List"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Existing doctors list */}
      <div className="p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3' }}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Verified Doctors</h3>
          </div>
          <div className="flex items-center space-x-3">
            {loadingProfiles && (
              <span className="text-sm flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{ borderColor: '#344f1f' }}></div>
                <span style={{ color: '#344f1f', opacity: 0.8 }}>Loading profiles...</span>
              </span>
            )}
            <span 
              className="px-3 py-1 rounded-full text-sm font-semibold"
              style={{ backgroundColor: '#f9f5f0', color: '#344f1f' }}
            >
              {existingDoctors.length} doctor(s)
            </span>
          </div>
        </div>

        {existingDoctors.length > 0 ? (
          <div className="space-y-4">
            {existingDoctors.map((doc) => (
              <div 
                key={doc.address} 
                className="border p-6 rounded-xl transition-all duration-300 hover:shadow-md"
                style={{ backgroundColor: '#f9f5f0', borderColor: '#d6d3d1' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-3" />
                      <h4 className="font-bold text-xl" style={{ color: '#344f1f' }}>{doc.name}</h4>
                    </div>
                    <p className="mb-2 text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
                      <strong>Specialization:</strong> {doc.specialization}
                    </p>
                    {doc.bio && (
                      <p className="mb-3 text-base" style={{ color: '#344f1f', opacity: 0.8 }}>
                        {doc.bio}
                      </p>
                    )}
                    {doc.qualifications && doc.qualifications.length > 0 && (
                      <p className="mb-2 text-base" style={{ color: '#344f1f', opacity: 0.8 }}>
                        <strong>Qualifications:</strong> {doc.qualifications.join(", ")}
                      </p>
                    )}
                    {doc.contactInfo && (
                      <p className="mb-2 text-base" style={{ color: '#344f1f', opacity: 0.8 }}>
                        <strong>Contact:</strong> {doc.contactInfo}
                      </p>
                    )}
                    <p className="text-sm font-mono mb-3" style={{ color: '#344f1f', opacity: 0.6 }}>
                      {doc.address}
                    </p>
                    {doc.profileCID && (
                      <p className="text-xs" style={{ color: '#f4991a' }}>
                        <strong>IPFS CID:</strong> {doc.profileCID}
                      </p>
                    )}
                  </div>

                  <button 
                    onClick={() => handleRevokeDoctor(doc.address)} 
                    disabled={isSubmitting}
                    className="ml-6 px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 flex items-center space-x-2"
                    style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                  >
                    {isRevoking || isConfirmingRevoke ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Revoking...</span>
                      </>
                    ) : (
                      "Revoke"
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f9f5f0' }}>
              <svg className="w-10 h-10" style={{ color: '#f4991a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-xl mb-3" style={{ color: '#344f1f', opacity: 0.8 }}>No verified doctors yet.</p>
            <p className="text-lg" style={{ color: '#344f1f', opacity: 0.6 }}>
              Use the form above to register doctors. They will appear here once approved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}