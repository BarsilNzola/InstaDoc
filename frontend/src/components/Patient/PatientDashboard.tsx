import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import PatientSignup from "./PatientSignup";
import ViewRecords from "./ViewRecords";
import PatientVideoConsultation from "./PatientVideoConsultation";
import BookAppointment from "./BookAppointment";
import hubArtifact from "../../abis/InstaDocHub.json";
import PatientBookedAppointments from "./PatientBookedAppointments";

export default function PatientDashboard() {
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const { address } = useAccount();
  const hubAddress = import.meta.env.VITE_HUB_ADDRESS;
  const hubAbi = hubArtifact.abi;

  const { 
    data: isPatientRegistered, 
    refetch: checkRegistration, 
    isLoading: checkingRegistration,
    error: registrationError 
  } = useReadContract({
    address: hubAddress as `0x${string}`,
    abi: hubAbi,
    functionName: "registeredPatients",
    args: [address],
    query: {
      enabled: !!address,
    },
  });

  useEffect(() => {
    console.log('🔍 Registration check:', {
      address,
      isPatientRegistered,
      checkingRegistration,
      registrationError
    });

    if (registrationError) {
      console.error('❌ Error checking registration:', registrationError);
      setIsRegistered(false);
    } else if (isPatientRegistered !== undefined) {
      setIsRegistered(!!isPatientRegistered);
    }
  }, [isPatientRegistered, checkingRegistration, registrationError, address]);

  const handleRegistrationSuccess = () => {
    console.log('✅ Registration successful, refreshing...');
    
    // Wait a bit for blockchain state to update, then refresh
    setTimeout(() => {
      checkRegistration();
    }, 3000);
  };

  if (!address) {
    return (
      <div 
        className="p-6 border rounded-xl shadow-md mx-auto max-w-md"
        style={{ backgroundColor: '#f2ead3' }}
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold mb-3" style={{ color: '#344f1f' }}>Connect Your Wallet</h3>
          <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
            Please connect your wallet to access the patient dashboard and manage your healthcare services.
          </p>
        </div>
      </div>
    );
  }

  if (checkingRegistration && isRegistered === null) {
    return (
      <div className="p-6 border rounded-xl shadow-md mx-auto max-w-md" style={{ backgroundColor: '#f2ead3' }}>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: '#344f1f' }}></div>
            <span className="text-xl" style={{ color: '#344f1f', opacity: 0.8 }}>Checking registration status...</span>
          </div>
          <p className="text-sm mt-3" style={{ color: '#344f1f', opacity: 0.6 }}>
            Verifying your patient registration on the blockchain
          </p>
        </div>
      </div>
    );
  }

  if (isRegistered === false) {
    return (
      <div className="space-y-8 p-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold" style={{ color: '#344f1f' }}>Patient Dashboard</h2>
          </div>
          <p className="text-xl max-w-2xl mx-auto" style={{ color: '#344f1f', opacity: 0.8 }}>
            Complete your registration to access healthcare services
          </p>
        </div>

        {/* Registration Section */}
        <div className="flex justify-center">
          <PatientSignup onRegistrationSuccess={handleRegistrationSuccess} />
        </div>

        {/* Benefits Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-6 border rounded-xl shadow-sm text-center" style={{ backgroundColor: '#f9f5f0' }}>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f4991a' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#344f1f' }}>Book Appointments</h3>
            <p className="text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>
              Schedule consultations with verified healthcare providers
            </p>
          </div>

          <div className="p-6 border rounded-xl shadow-sm text-center" style={{ backgroundColor: '#f9f5f0' }}>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f4991a' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#344f1f' }}>Video Consultations</h3>
            <p className="text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>
              Connect with doctors through secure video calls
            </p>
          </div>

          <div className="p-6 border rounded-xl shadow-sm text-center" style={{ backgroundColor: '#f9f5f0' }}>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f4991a' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#344f1f' }}>Medical Records</h3>
            <p className="text-sm" style={{ color: '#344f1f', opacity: 0.7 }}>
              Access and manage your health records securely
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold" style={{ color: '#344f1f' }}>Patient Dashboard</h2>
        </div>
        <p className="text-xl max-w-2xl mx-auto" style={{ color: '#344f1f', opacity: 0.8 }}>
          Manage your healthcare services, appointments, and medical records
        </p>
      </div>

      {/* Dashboard Components Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Appointments & Consultations */}
        <div className="space-y-8">
          <BookAppointment />
          <PatientBookedAppointments />
          <PatientVideoConsultation />
        </div>

        {/* Right Column - Records & Quick Actions */}
        <div className="space-y-8">
          <ViewRecords />
          
          {/* Quick Actions Card */}
          <div className="p-6 border rounded-xl shadow-md" style={{ backgroundColor: '#f2ead3' }}>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344f1f' }}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold" style={{ color: '#344f1f' }}>Quick Actions</h3>
            </div>
            
            <div className="space-y-3">
              <button className="w-full p-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-md flex items-center justify-center space-x-2"
                style={{ backgroundColor: '#344f1f', color: '#ffffff' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>Find Doctors</span>
              </button>
              
              <button className="w-full p-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-md flex items-center justify-center space-x-2"
                style={{ backgroundColor: '#f4991a', color: '#ffffff' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download All Records</span>
              </button>
              
              <button className="w-full p-3 rounded-lg font-semibold transition-all duration-300 hover:shadow-md flex items-center justify-center space-x-2"
                style={{ backgroundColor: '#7c3aed', color: '#ffffff' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Emergency Contact</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center pt-8 border-t" style={{ borderColor: '#d6d3d1' }}>
        <p className="text-sm" style={{ color: '#344f1f', opacity: 0.6 }}>
          InstaDoc Patient Portal • Your Health, Your Control
        </p>
      </div>
    </div>
  );
}