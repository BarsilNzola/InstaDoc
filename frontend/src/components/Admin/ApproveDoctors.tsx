import { useState, useEffect } from "react";
import { useMemo } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { storeJSON, retrieveJSON, testIPFSConnection } from "../../lib/ipfs";
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
  const [doctorAddress, setDoctorAddress] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [ipfsStatus, setIpfsStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  
  const { chain, address: currentUserAddress } = useAccount();
  const hubAddress = import.meta.env.VITE_HUB_ADDRESS;
  const hubAbi = hubArtifact.abi;
  const doctorRegistryAbi = doctorRegistryArtifact.abi;
  
  // Test IPFS connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      setIpfsStatus('testing');
      const isConnected = await testIPFSConnection();
      setIpfsStatus(isConnected ? 'connected' : 'error');
    };

    testConnection();
  }, []);

  // Get doctor registry address from Hub
  const { data: doctorRegistryAddr } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "doctorRegistry",
  });

  // Get all verified doctors from Hub
  const { 
    data: verifiedDoctorAddresses, 
    refetch: refetchDoctors,
    isLoading: isLoadingDoctors 
  } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "getAllVerifiedDoctors",
  });

  // Check if doctor is already approved
  const isAddressValid = doctorAddress && doctorAddress.match(/^0x[a-fA-F0-9]{40}$/);
  const { data: isDoctorApproved, refetch: refetchDoctorCheck } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "isDoctorVerified",
    args: [doctorAddress as `0x${string}`],
    query: {
      enabled: !!isAddressValid && !!hubAddress,
    },
  });

  const { 
    writeContract: approveDoctor, 
    isPending: isApproving,
    data: approveTxHash,
    reset: resetApprove
  } = useWriteContract();

  const { 
    writeContract: revokeDoctor, 
    isPending: isRevoking,
    data: revokeTxHash,
    reset: resetRevoke
  } = useWriteContract();

  const { 
    isLoading: isConfirmingApprove, 
    isSuccess: isApproved,
    error: approveError 
  } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const { 
    isLoading: isConfirmingRevoke, 
    isSuccess: isRevoked,
    error: revokeError 
  } = useWaitForTransactionReceipt({
    hash: revokeTxHash,
  });

  // Reset transaction states when component mounts or chain changes
  useEffect(() => {
    resetApprove();
    resetRevoke();
    setTransactionStatus('idle');
  }, [chain?.id, resetApprove, resetRevoke]);

  // Handle approval success
  useEffect(() => {
    if (isApproved) {
      console.log('✅ Doctor approval confirmed, refreshing data...');
      setTransactionStatus('success');
      
      // Force refresh all data with delay for blockchain state
      setTimeout(async () => {
        console.log('🔄 Refreshing doctor data after approval...');
        await refetchDoctors();
        await refetchDoctorCheck();
      }, 2000);
      
      // Clear form and reset states after success
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

  // Handle revocation success - FIXED: Better state management
  useEffect(() => {
    if (isRevoked) {
      console.log('✅ Doctor revocation confirmed, refreshing data...');
      setTransactionStatus('success');
      
      // Immediately remove the revoked doctor from local state for better UX
      if (revokeTxHash) {
        // We can't know which doctor was revoked from the transaction hash alone,
        // so we'll rely on the contract refresh
      }
      
      // Force refresh with multiple attempts to ensure blockchain state is updated
      const refreshData = async () => {
        console.log('🔄 First refresh after revocation...');
        await refetchDoctors();
        
        setTimeout(async () => {
          console.log('🔄 Second refresh after revocation...');
          await refetchDoctors();
        }, 3000);

        setTimeout(async () => {
          console.log('🔄 Final refresh after revocation...');
          await refetchDoctors();
        }, 6000);
      };
      
      refreshData();
      
      // Reset states after success
      setTimeout(() => {
        setTransactionStatus('idle');
        resetRevoke();
      }, 7000);
    }
  }, [isRevoked, revokeTxHash, refetchDoctors, resetRevoke]);

  // Handle transaction errors
  useEffect(() => {
    if (approveError) {
      console.error('❌ Approval transaction failed:', approveError);
      setTransactionStatus('error');
    }
    if (revokeError) {
      console.error('❌ Revocation transaction failed:', revokeError);
      setTransactionStatus('error');
    }
  }, [approveError, revokeError]);

  // Simple IPFS upload with timeout
  const uploadDoctorProfile = async (profile: DoctorProfile): Promise<string> => {
    console.log('📤 Uploading doctor profile to IPFS...');
    
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('IPFS upload timeout')), 30000);
    });
    
    const uploadPromise = storeJSON(profile);
    
    const cid = await Promise.race([uploadPromise, timeoutPromise]);
    console.log('✅ Doctor profile uploaded:', cid);
    return cid;
  };

  // Fetch doctor profile with better error handling and logging
  const fetchDoctorProfile = async (cid: string): Promise<DoctorProfile | null> => {
    if (!cid || cid === "") {
      console.log('🔄 No CID provided, skipping IPFS fetch');
      return null;
    }
    
    try {
      console.log('🔄 Fetching doctor profile from IPFS with CID:', cid);
      const profileData = await retrieveJSON(cid);
      console.log('✅ Doctor profile fetched successfully:', profileData);
      
      // Validate the profile data structure
      if (profileData && typeof profileData === 'object') {
        const validatedProfile: DoctorProfile = {
          name: profileData.name || '',
          specialization: profileData.specialization || '',
          bio: profileData.bio,
          qualifications: profileData.qualifications,
          contactInfo: profileData.contactInfo,
          timestamp: profileData.timestamp || Date.now(),
        };
        return validatedProfile;
      } else {
        console.warn('❌ Invalid profile data structure:', profileData);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to fetch doctor profile from IPFS:', error);
      return null;
    }
  };

  const handleApproveDoctor = async () => {
    console.log('=== APPROVING DOCTOR ===');

    // Basic validation
    if (!doctorAddress || !doctorName || !specialization) {
      alert("Please fill in doctor address, name, and specialization");
      return;
    }

    if (!doctorAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert("Please enter a valid Ethereum address starting with 0x");
      return;
    }

    if (!hubAddress) {
      alert("Hub contract not configured");
      return;
    }

    // Network check
    if (chain?.id !== 2484) {
      alert("Please switch to U2U Testnet in your wallet");
      return;
    }

    // Check if doctor is already approved
    if (isDoctorApproved === true) {
      alert("❌ This doctor is already approved! Please use a different wallet address.");
      return;
    }

    setUploading(true);
    setTransactionStatus('pending');

    try {
      // Create doctor profile
      const doctorProfile: DoctorProfile = {
        name: doctorName,
        specialization: specialization,
        bio: bio || undefined,
        qualifications: qualifications ? qualifications.split(',').map(q => q.trim()) : undefined,
        contactInfo: contactInfo || undefined,
        timestamp: Date.now(),
      };

      console.log('📝 Doctor profile created:', doctorProfile);

      let profileCID = "";
      
      // Upload to IPFS only if connected, but don't let it block the transaction
      if (ipfsStatus === 'connected') {
        try {
          profileCID = await uploadDoctorProfile(doctorProfile);
          console.log('✅ IPFS upload successful, CID:', profileCID);
        } catch (ipfsError) {
          console.warn('❌ IPFS upload failed, continuing without IPFS:', ipfsError);
          profileCID = ""; // Empty CID if IPFS fails
        }
      } else {
        console.log('⚠️ IPFS not connected, storing basic info only');
      }

      console.log('📝 Approving doctor on blockchain with gas limit...');

      // Call Hub contract's approveDoctor function
      approveDoctor({
        address: hubAddress as `0x${string}`,
        abi: hubAbi,
        functionName: "approveDoctor",
        args: [doctorAddress, doctorName, specialization, profileCID || ""],
        gas: BigInt(500000),
      });

    } catch (error: any) {
      console.error('❌ Error in approval process:', error);
      setTransactionStatus('error');
      alert(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRevokeDoctor = async (doctorAddr: string) => {
    if (!hubAddress) {
      alert("Hub contract not configured");
      return;
    }

    if (!confirm(`Are you sure you want to revoke doctor ${doctorAddr}?`)) {
      return;
    }

    setTransactionStatus('pending');

    // Call Hub contract's revokeDoctor function
    revokeDoctor({
      address: hubAddress as `0x${string}`,
      abi: hubAbi,
      functionName: "revokeDoctor",
      args: [doctorAddr],
      gas: BigInt(300000),
    });
  };

  // Load doctor details with proper contract data fetching
  const [existingDoctors, setExistingDoctors] = useState<Doctor[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Remove duplicates from verifiedDoctorAddresses before processing
  const uniqueDoctorAddresses = useMemo(() => {
    if (!verifiedDoctorAddresses || !Array.isArray(verifiedDoctorAddresses)) return [];
    return Array.from(new Set(verifiedDoctorAddresses as string[]));
  }, [verifiedDoctorAddresses]);

  // Use individual contract calls for each doctor (with unique addresses only)
  const doctorDetailQueries = uniqueDoctorAddresses.map(addr => 
    useReadContract({
      address: hubAddress as `0x${string}`,
      abi: hubAbi,
      functionName: "getDoctorDetails",
      args: [addr],
      query: {
        enabled: !!uniqueDoctorAddresses && uniqueDoctorAddresses.length > 0,
      },
    })
  );

  useEffect(() => {
    const loadDoctorDetails = async () => {
      if (!uniqueDoctorAddresses || !Array.isArray(uniqueDoctorAddresses)) {
        console.log('🔄 No verified doctors found');
        setExistingDoctors([]);
        return;
      }

      console.log('🔄 Loading doctor details for', uniqueDoctorAddresses.length, 'doctors from contract');
      setLoadingProfiles(true);

      try {
        const doctorsWithDetails: Doctor[] = [];

        for (let i = 0; i < uniqueDoctorAddresses.length; i++) {
          const addr = uniqueDoctorAddresses[i];
          try {
            console.log(`🔄 Processing doctor ${i + 1}/${uniqueDoctorAddresses.length}: ${addr}`);
            
            // Get doctor details from the query
            const details = doctorDetailQueries[i]?.data as any;
            
            if (details) {
              console.log(`✅ Contract details for ${addr}:`, details);
              
              let doctorProfile: DoctorProfile | null = null;
              const profileCID = details.profileCID || details[2] || ""; // Try different property access patterns
              
              console.log(`  - Profile CID from contract: "${profileCID}"`);
              
              // Fetch from IPFS if CID exists and is not empty
              if (profileCID && profileCID !== "" && profileCID !== "0x") {
                console.log(`  - Found IPFS CID: ${profileCID}`);
                doctorProfile = await fetchDoctorProfile(profileCID);
                
                if (doctorProfile) {
                  console.log(`  ✅ Successfully loaded IPFS profile:`, doctorProfile);
                } else {
                  console.log(`  ⚠️ Could not load IPFS profile`);
                }
              } else {
                console.log(`  - No valid IPFS CID found in contract`);
              }

              // Use contract data - try different property access patterns
              const contractName = details.name || details[0] || "";
              const contractSpecialization = details.specialization || details[1] || "";

              console.log(`  - Contract name: "${contractName}"`);
              console.log(`  - Contract specialization: "${contractSpecialization}"`);

              const finalName = doctorProfile?.name || contractName || `Dr. ${addr.slice(0, 6)}...${addr.slice(-4)}`;
              const finalSpecialization = doctorProfile?.specialization || contractSpecialization || "General Medicine";

              console.log(`  - Final data:`, {
                name: finalName,
                specialization: finalSpecialization,
                hasIPFSData: !!doctorProfile,
                hasContractData: !!contractName
              });

              doctorsWithDetails.push({
                address: addr,
                name: finalName,
                specialization: finalSpecialization,
                profileCID: profileCID,
                verified: true,
                bio: doctorProfile?.bio,
                qualifications: doctorProfile?.qualifications,
                contactInfo: doctorProfile?.contactInfo,
              });
            } else {
              console.log(`❌ No contract details found for ${addr}`);
              // Add basic fallback
              doctorsWithDetails.push({
                address: addr,
                name: `Dr. ${addr.slice(0, 6)}...${addr.slice(-4)}`,
                specialization: "General Medicine",
                profileCID: "",
                verified: true,
              });
            }
          } catch (error) {
            console.error(`❌ Error processing doctor ${addr}:`, error);
            // Add basic fallback
            doctorsWithDetails.push({
              address: addr,
              name: `Dr. ${addr.slice(0, 6)}...${addr.slice(-4)}`,
              specialization: "General Medicine",
              profileCID: "",
              verified: true,
            });
          }
        }

        console.log('✅ Final doctors list:', doctorsWithDetails);
        setExistingDoctors(doctorsWithDetails);
      } catch (error) {
        console.error('❌ Error loading doctor details:', error);
        setExistingDoctors([]);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadDoctorDetails();
  }, [uniqueDoctorAddresses, doctorDetailQueries]);
  
  // Check if a doctor is still verified using Hub contract
  const checkDoctorVerification = async (doctorAddr: string): Promise<boolean> => {
    if (!hubAddress) return false;

    try {
      // In a real implementation, you would call the Hub contract's isDoctorVerified function
      // For now, assume all doctors from getAllVerifiedDoctors are verified
      return true;
    } catch (error) {
      console.error(`Error checking verification for ${doctorAddr}:`, error);
      return false;
    }
  };

  // Get doctor details from Hub contract
  const getHubDoctorDetails = async (address: string): Promise<any> => {
    if (!hubAddress) return null;

    try {
      // In a real implementation, you would call the Hub contract's getDoctorDetails function
      // For now, return the expected structure
      return {
        name: "", // These would come from actual Hub contract calls
        specialization: "",
        profileCID: "",
        verified: true
      };
    } catch (error) {
      console.error(`Error fetching Hub details for ${address}:`, error);
      return null;
    }
  };

  // Manual refresh function with better error handling
  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    try {
      await refetchDoctors();
      await refetchDoctorCheck();
      console.log('✅ Manual refresh completed');
    } catch (error) {
      console.error('❌ Manual refresh failed:', error);
    }
  };

  // Proper TypeScript types for disabled props
  const isSubmitting = uploading || isApproving || isConfirmingApprove || isRevoking || isConfirmingRevoke;
  const isDoctorAlreadyApproved = isDoctorApproved === true;
  const isWrongNetwork = chain?.id !== 2484;
  const isApproveDisabled = isSubmitting || isWrongNetwork || isDoctorAlreadyApproved;

  const getIpfsStatusColor = () => {
    switch (ipfsStatus) {
      case 'connected': return 'bg-green-100 border-green-400 text-green-800';
      case 'error': return 'bg-red-100 border-red-400 text-red-800';
      case 'testing': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
      default: return 'bg-gray-100 border-gray-400 text-gray-800';
    }
  };

  const getIpfsStatusText = () => {
    switch (ipfsStatus) {
      case 'connected': return '✅ IPFS Connected';
      case 'error': return '❌ IPFS Error';
      case 'testing': return '🔄 Testing IPFS...';
      default: return '⚪ IPFS Idle';
    }
  };

  const getTransactionStatusText = () => {
    switch (transactionStatus) {
      case 'success': return '✅ Transaction successful!';
      case 'error': return '❌ Transaction failed';
      case 'pending': return '🔄 Transaction in progress...';
      default: return '';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Transaction Status Banner */}
      {transactionStatus !== 'idle' && (
        <div className={`p-4 border rounded ${
          transactionStatus === 'success' ? 'bg-green-100 border-green-400 text-green-800' :
          transactionStatus === 'error' ? 'bg-red-100 border-red-400 text-red-800' :
          'bg-yellow-100 border-yellow-400 text-yellow-800'
        }`}>
          <div className="flex justify-between items-center">
            <span className="font-semibold">{getTransactionStatusText()}</span>
            <button
              onClick={() => setTransactionStatus('idle')}
              className="text-sm underline"
            >
              Dismiss
            </button>
          </div>
          {transactionStatus === 'success' && (
            <p className="text-sm mt-2">
              The list will update automatically. If revoked doctors still appear, click "Refresh List".
            </p>
          )}
        </div>
      )}

      {/* IPFS Status Banner */}
      <div className={`p-4 border rounded ${getIpfsStatusColor()}`}>
        <div className="flex justify-between items-center">
          <span className="font-semibold">{getIpfsStatusText()}</span>
          <button
            onClick={async () => {
              setIpfsStatus('testing');
              const connected = await testIPFSConnection();
              setIpfsStatus(connected ? 'connected' : 'error');
            }}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            Test Connection
          </button>
        </div>
        {ipfsStatus === 'error' && (
          <p className="text-sm mt-2">
            IPFS not available. Doctor profiles will be stored on-chain only.
          </p>
        )}
      </div>

      {/* Network Warning */}
      {isWrongNetwork && (
        <div className="p-4 border border-red-400 bg-red-100 text-red-800 rounded">
          ⚠️ Please switch to U2U Testnet in your wallet
        </div>
      )}

      {/* Register New Doctor Form */}
      <div className="p-6 border rounded bg-white shadow">
        <h3 className="text-xl font-semibold mb-4">Register New Doctor</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Doctor Wallet Address *</label>
            <input
              type="text"
              value={doctorAddress}
              onChange={(e) => setDoctorAddress(e.target.value)}
              placeholder="0x..."
              className={`w-full p-2 border rounded font-mono ${
                isDoctorAlreadyApproved ? 'border-red-500 bg-red-50' : ''
              }`}
            />
            {isDoctorAlreadyApproved && (
              <p className="text-red-600 text-sm mt-1">
                ⚠️ This doctor is already approved!
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Doctor Name *</label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="Dr. John Smith"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Specialization *</label>
            <select
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select specialization...</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="Dermatology">Dermatology</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bio (Optional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief professional background..."
              rows={3}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Qualifications (Optional)</label>
            <input
              type="text"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              placeholder="MD, PhD, Board Certified (comma separated)"
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contact Info (Optional)</label>
            <input
              type="text"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="email@example.com or phone number"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={handleApproveDoctor}
              disabled={isApproveDisabled}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors disabled:opacity-50 flex-1"
            >
              {isSubmitting ? (
                uploading ? "Uploading Profile..." :
                isApproving ? "Approving..." : 
                isConfirmingApprove ? "Confirming..." :
                "Processing..."
              ) : isDoctorAlreadyApproved ? "Already Approved" : "Approve Doctor"}
            </button>
            
            <button
              onClick={handleManualRefresh}
              disabled={isLoadingDoctors}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoadingDoctors ? "Refreshing..." : "Refresh List"}
            </button>
          </div>
        </div>
      </div>

      {/* Existing Doctors List */}
      <div className="p-6 border rounded bg-white shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Verified Doctors</h3>
          <div className="flex items-center space-x-2">
            {loadingProfiles && (
              <span className="text-sm text-gray-500">Loading profiles...</span>
            )}
            <span className="bg-gray-100 px-2 py-1 rounded text-sm">
              {existingDoctors.length} doctor(s)
            </span>
          </div>
        </div>
        
        {existingDoctors.length > 0 ? (
          <div className="space-y-4">
            {existingDoctors.map((doctor, index) => (
              <div key={`${doctor.address}-${index}`} className="border p-4 rounded hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      <h4 className="font-semibold text-lg">{doctor.name}</h4>
                    </div>
                    <p className="text-gray-600 mb-1">
                      <strong>Specialization:</strong> {doctor.specialization}
                    </p>
                    
                    {doctor.bio && (
                      <p className="text-sm text-gray-700 mb-2">{doctor.bio}</p>
                    )}
                    
                    {doctor.qualifications && doctor.qualifications.length > 0 && (
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Qualifications:</strong> {doctor.qualifications.join(', ')}
                      </p>
                    )}
                    
                    {doctor.contactInfo && (
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Contact:</strong> {doctor.contactInfo}
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500 font-mono mb-2">
                      {doctor.address}
                    </p>
                    
                    {doctor.profileCID && (
                      <p className="text-xs text-blue-600">
                        <strong>IPFS CID:</strong> {doctor.profileCID}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRevokeDoctor(doctor.address)}
                    disabled={isSubmitting}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors disabled:opacity-50 ml-4"
                  >
                    {isRevoking || isConfirmingRevoke ? "Revoking..." : "Revoke"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 mb-2">No verified doctors yet.</p>
            <p className="text-sm text-gray-500">
              Use the form above to register doctors. They will appear here once approved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}