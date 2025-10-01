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

  // Debug info
  const renderDebugInfo = () => {
    if (!uniqueDoctorAddresses || uniqueDoctorAddresses.length === 0) {
      return null;
    }
    
    return (
      <div className="text-xs text-gray-500 mt-2">
        Found {uniqueDoctorAddresses.length} verified doctor(s) in contract
        {doctors.length > 0 && `, loaded details for ${doctors.length}`}
      </div>
    );
  };

  // Doctor selection
  const renderDoctorSelection = () => {
    if (loadingDoctors) {
      return (
        <div className="flex items-center space-x-2 text-gray-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span>Loading verified doctors...</span>
        </div>
      );
    }

    if (doctors.length === 0) {
      const hasAddresses = uniqueDoctorAddresses.length > 0;
      return (
        <div className="text-yellow-600 bg-yellow-50 p-3 rounded">
          <p>No verified doctors available yet.</p>
          <p className="text-sm mt-1">
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
        className="w-full p-2 border rounded"
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
      <div className="bg-blue-50 p-3 rounded border border-blue-200">
        <h4 className="font-semibold text-blue-800">{doctor.name}</h4>
        <p className="text-sm text-blue-700">Specialization: {doctor.specialization}</p>
        {doctor.bio && (
          <p className="text-sm text-blue-600 mt-1">{doctor.bio}</p>
        )}
        {doctor.qualifications && doctor.qualifications.length > 0 && (
          <p className="text-xs text-blue-500 mt-1">
            Qualifications: {doctor.qualifications.join(', ')}
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
          <label className="block text-sm font-medium mb-2">Appointment Fee (U2U)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0.01"
            className="w-full p-2 border rounded"
            placeholder="0.1"
          />
        </div>

        <button 
          onClick={handleBook} 
          disabled={isBooking || isConfirming || !selectedDoctor}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors disabled:opacity-50 w-full"
        >
          {isBooking ? "Confirming in wallet..." : 
           isConfirming ? "Processing transaction..." : 
           `Book Appointment - ${amount} U2U`}
        </button>

        {isConfirmed && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <p className="font-semibold">✅ Appointment booked successfully!</p>
            <p className="text-sm mt-1">The doctor has been notified and will accept your appointment.</p>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6 p-6 border rounded bg-white shadow">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Book Appointment</h3>
        <button
          onClick={() => refetchDoctors()}
          disabled={loadingDoctors}
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loadingDoctors ? "Refreshing..." : "Refresh Doctors"}
        </button>
      </div>
      
      {/* Doctor Selection */}
      <div>
        <label className="block text-sm font-medium mb-2">Select Doctor</label>
        {renderDoctorSelection()}
        {renderDebugInfo()}
      </div>

      {renderBookingForm()}
    </div>
  );
}