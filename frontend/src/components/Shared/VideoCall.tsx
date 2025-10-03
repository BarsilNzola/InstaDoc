import { useState, useEffect, useRef } from 'react';

interface VideoCallProps {
  consultationId: number;
  patientAddress: string;
  doctorAddress: string;
  isDoctor: boolean;
  onEndCall: () => void;
}

export default function VideoCall({ 
  consultationId, 
  patientAddress, 
  doctorAddress, 
  isDoctor, 
  onEndCall 
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');

  useEffect(() => {
    initializeVideoCall();
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const initializeVideoCall = async () => {
    try {
      // Get user media (local camera)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setConnectionStatus('Connected - Demo Mode');
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setConnectionStatus('Failed to connect - Camera/Mic permission needed');
    }
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleEndCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    onEndCall();
  };

  const otherUserAddress = isDoctor ? patientAddress : doctorAddress;
  const otherUserRole = isDoctor ? 'Patient' : 'Doctor';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xl font-bold mb-2" style={{ color: '#344f1f' }}>
            Video Consultation #{consultationId}
          </h4>
          <p className="text-lg" style={{ color: '#344f1f', opacity: 0.8 }}>
            {otherUserRole}: {otherUserAddress.slice(0, 8)}...
          </p>
          <div className="flex items-center space-x-2 mt-2">
            <span className={`inline-block w-3 h-3 rounded-full ${
              connectionStatus.includes('Connected') ? 'bg-green-500' : 
              connectionStatus.includes('Connecting') ? 'bg-yellow-500' : 'bg-red-500'
            }`}></span>
            <span className="text-sm font-medium" style={{ color: '#344f1f' }}>
              {connectionStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative rounded-xl overflow-hidden bg-gray-900 min-h-[400px]">
        {/* Remote Video Placeholder (Main) */}
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-6xl mb-4">👨‍⚕️</div>
            <div className="text-2xl font-bold mb-2">WebRTC Video Feed</div>
            <p className="text-gray-300">Real-time video communication would appear here</p>
            <p className="text-gray-400 text-sm mt-2">(WebRTC integration required for full functionality)</p>
          </div>
        </div>
        
        {/* Local Video (Picture-in-picture) */}
        <div className="absolute bottom-4 right-4 w-48 h-36 border-2 border-white rounded-lg overflow-hidden bg-gray-800">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
            Your Camera
          </div>
        </div>
      </div>

      {/* Call Controls */}
      <div className="flex justify-center space-x-6">
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all duration-300 ${
            isMuted 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMuted ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7.975 7.975 0 014.242 1.226M9.168 15.832a3 3 0 010-4.242M5.636 19.364a9 9 0 010-12.728M12 11a1 1 0 11-2 0 1 1 0 012 0z" />
            )}
          </svg>
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all duration-300 ${
            isVideoOff 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gray-600 hover:bg-gray-700'
          }`}
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isVideoOff ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            )}
          </svg>
        </button>

        <button
          onClick={handleEndCall}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition-all duration-300"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Demo Notice */}
      <div className="p-4 border rounded-lg" style={{ backgroundColor: '#fffbeb', borderColor: '#fcd34d' }}>
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="font-semibold text-yellow-800">Demo Mode</p>
            <p className="text-sm text-yellow-700">
              This shows local camera feed only. Full WebRTC implementation required for real-time video communication between doctor and patient.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}