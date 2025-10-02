import { useState, useEffect, useMemo } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { readContract } from "wagmi/actions";
import { parseEther } from "viem";
import { retrieveJSON } from "../../lib/ipfs";
import { config } from "../Shared/wallet";
import escrowArtifact from "../../abis/EscrowPayments.json";
import hubArtifact from "../../abis/InstaDocHub.json";

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

export default function BookAppointment() {
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  
  const hubAddress = import.meta.env.VITE_HUB_ADDRESS;
  const hubAbi = hubArtifact.abi;
  const escrowAbi = escrowArtifact.abi;

  // Get escrow address from Hub contract
  const { data: escrowAddress } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "escrow",
  });

  // Get all verified doctor addresses from Hub contract
  const { data: doctorAddresses, refetch: refetchDoctors } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "getAllVerifiedDoctors",
  });

  // Remove duplicates from doctor addresses
  const uniqueDoctorAddresses = useMemo(() => {
    if (!doctorAddresses || !Array.isArray(doctorAddresses)) return [];
    return Array.from(new Set(doctorAddresses as string[]));
  }, [doctorAddresses]);

  // Fetch doctor profile from IPFS
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

  // Load doctor details with IPFS data
  useEffect(() => {
    const loadDoctorDetails = async () => {
      if (!hubAddress || !uniqueDoctorAddresses || uniqueDoctorAddresses.length === 0) {
        console.log('🔄 No verified doctors found');
        setDoctors([]);
        setLoadingDoctors(false);
        return;
      }

      console.log('🔄 Loading doctor details for', uniqueDoctorAddresses.length, 'doctors from contract and IPFS');
      setLoadingDoctors(true);

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

              console.log(`✅ Contract details for ${addr}:`, details);

              const profileCID = details?.[2] ?? details?.profileCID ?? "";
              let ipfsProfile: DoctorProfile | null = null;
              
              // Fetch from IPFS if CID exists and is not empty
              if (profileCID && profileCID !== "" && profileCID !== "0x") {
                console.log(`  - Found IPFS CID: ${profileCID}, fetching from IPFS...`);
                ipfsProfile = await fetchDoctorProfile(profileCID);
                
                if (ipfsProfile) {
                  console.log(`  ✅ Successfully loaded IPFS profile:`, ipfsProfile);
                } else {
                  console.log(`  ⚠️ Could not load IPFS profile from CID: ${profileCID}`);
                }
              } else {
                console.log(`  - No valid IPFS CID found in contract data`);
              }

              // The contract returns: (name, specialization, profileCID, verified)
              const name = ipfsProfile?.name || details?.[0] || `Dr. ${addr.slice(0, 6)}...${addr.slice(-4)}`;
              const specializationVal = ipfsProfile?.specialization || details?.[1] || "General Medicine";

              console.log(`  - Final doctor: ${name} - ${specializationVal}`);

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
              console.error(`❌ Error loading doctor ${addr}:`, err);
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

        console.log('✅ Final doctors list for booking:', doctorDetails);
        setDoctors(doctorDetails);
      } catch (err) {
        console.error('❌ Error loading doctor details:', err);
        setDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctorDetails();
  }, [hubAddress, uniqueDoctorAddresses]); 

  const { 
    writeContract: bookAppointment, 
    isPending: isBooking,
    data: txHash 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleBook = async () => {
    if (!selectedDoctor) {
      alert("Please select a doctor");
      return;
    }

    if (!escrowAddress) {
      alert("Escrow contract not configured");
      return;
    }

    // Find the selected doctor to show in confirmation
    const selectedDoctorInfo = doctors.find(d => d.address === selectedDoctor);
    const doctorName = selectedDoctorInfo?.name || selectedDoctor;

    if (!confirm(`Book appointment with ${doctorName} for ${amount} U2U?`)) {
      return;
    }

    bookAppointment({
      address: escrowAddress as `0x${string}`,
      abi: escrowAbi,
      functionName: "bookAppointment",
      args: [selectedDoctor],
      value: parseEther(amount),
    }, {
      onSuccess: (txHash) => {
        console.log("Appointment booking submitted:", txHash);
        // Reset selection after successful booking
        setSelectedDoctor("");
        setAmount("0.1");
      },
      onError: (error) => {
        console.error("Booking failed:", error);
        alert(`❌ Appointment booking failed: ${error.message}`);
      },
    });
  };

  const isSubmitting = isBooking || isConfirming;
  const isFormDisabled = isSubmitting || !selectedDoctor;

  // Doctor selection
  const renderDoctorSelection = () => {
    if (loadingDoctors) {
      return (
        <div className="flex items-center space-x-3" style={{ color: '#344f1f', opacity: 0.8 }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: '#344f1f' }}></div>
          <span className="text-lg">Loading verified doctors...</span>
        </div>
      );
    }

    if (doctors.length === 0) {
      const hasAddresses = uniqueDoctorAddresses.length > 0;
      return (
        <div 
          className="p-4 rounded-lg border"
          style={{ backgroundColor: '#fffbeb', borderColor: '#fcd34d', color: '#d97706' }}
        >
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="font-semibold">No verified doctors available yet.</p>
          </div>
          <p className="text-sm">
            Doctors need to be approved through the admin panel first.
            {hasAddresses && (
              <span> Found {uniqueDoctorAddresses.length} doctor(s) in contract but couldn't load details.</span>
            )}
          </p>
        </div>
      );
    }

    return (
      <select
        value={selectedDoctor}
        onChange={(e) => setSelectedDoctor(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 appearance-none bg-no-repeat bg-right"
        style={{ 
          backgroundColor: '#f9f5f0',
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23344f1f' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.5em 1.5em'
        }}
      >
        <option value="">Choose a doctor...</option>
        {doctors.map((doctor) => (
          <option key={doctor.address} value={doctor.address}>
            {doctor.name} - {doctor.specialization}
            {doctor.bio && ` (${doctor.bio.slice(0, 30)}...)`}
          </option>
        ))}
      </select>
    );
  };

  // Selected doctor info
  const renderSelectedDoctorInfo = () => {
    if (!selectedDoctor) return null;
    
    const doctor = doctors.find(d => d.address === selectedDoctor);
    if (!doctor) return null;

    return (
      <div 
        className="p-4 rounded-lg border transition-all duration-300"
        style={{ backgroundColor: '#f0f9ff', borderColor: '#7dd3fc' }}
      >
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0ea5e9' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-lg" style={{ color: '#0369a1' }}>{doctor.name}</h4>
            <p className="text-sm" style={{ color: '#0369a1', opacity: 0.8 }}>{doctor.specialization}</p>
          </div>
        </div>
        
        {doctor.bio && (
          <p className="text-sm mb-2" style={{ color: '#0369a1', opacity: 0.8 }}>{doctor.bio}</p>
        )}
        {doctor.qualifications && doctor.qualifications.length > 0 && (
          <p className="text-xs" style={{ color: '#0369a1', opacity: 0.7 }}>
            <strong>Qualifications:</strong> {doctor.qualifications.join(', ')}
          </p>
        )}
      </div>
    );
  };

  // Booking form
  const renderBookingForm = () => {
    if (doctors.length === 0) return null;

    return (
      <>
        {renderSelectedDoctorInfo()}
        
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>Appointment Fee (U2U)</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.01"
              min="0.01"
              className="w-full p-3 border border-gray-300 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-opacity-50 pr-12"
              style={{ backgroundColor: '#f9f5f0' }}
              placeholder="0.1"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-sm font-semibold" style={{ color: '#344f1f', opacity: 0.7 }}>U2U</span>
            </div>
          </div>
          <p className="text-sm mt-1" style={{ color: '#344f1f', opacity: 0.6 }}>
            Minimum fee: 0.01 U2U
          </p>
        </div>

        <button 
          onClick={handleBook} 
          disabled={isFormDisabled}
          className="w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
          style={{ 
            backgroundColor: isFormDisabled ? '#9ca3af' : '#f4991a', 
            color: '#ffffff'
          }}
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>
                {isBooking ? "Confirming in wallet..." : "Processing transaction..."}
              </span>
            </>
          ) : (
            <>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Book Appointment - {amount} U2U</span>
            </>
          )}
        </button>

        {isConfirmed && (
          <div 
            className="p-4 rounded-lg border"
            style={{ backgroundColor: '#f0f9f0', borderColor: '#86efac', color: '#166534' }}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="font-semibold">Appointment booked successfully!</p>
            </div>
            <p className="text-sm mt-1">
              The doctor has been notified and will accept your appointment.
            </p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6 p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3' }}>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Book Appointment</h3>
        </div>
        <button
          onClick={() => refetchDoctors()}
          disabled={loadingDoctors}
          className="px-4 py-2 rounded-lg font-semibold transition-all duration-300 hover:shadow-md disabled:opacity-50 flex items-center space-x-2"
          style={{ backgroundColor: '#344f1f', color: '#ffffff' }}
        >
          {loadingDoctors ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </>
          )}
        </button>
      </div>
      
      {/* Doctor Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: '#344f1f' }}>Select Doctor</label>
        {renderDoctorSelection()}
        
        {/* Doctor Count Info */}
        {doctors.length > 0 && (
          <div className="mt-2 flex items-center space-x-2">
            <span className="text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>
              {doctors.length} verified doctor{doctors.length !== 1 ? 's' : ''} available
            </span>
          </div>
        )}
      </div>

      {renderBookingForm()}
    </div>
  );
}