import { readContract, writeContract, getPublicClient } from "@wagmi/core";
import { config } from "../../src/components/Shared/wallet";
import hubArtifact from "../abis/InstaDocHub.json";
import escrowArtifact from "../abis/EscrowPayments.json";
import patientArtifact from "../abis/PatientRecords.json";
import doctorRegistryArtifact from "../abis/DoctorRegistry.json";

const hubAbi = hubArtifact.abi;
const escrowAbi = escrowArtifact.abi;
const patientAbi = patientArtifact.abi;
const doctorRegistryAbi = doctorRegistryArtifact.abi;

// --- Contract Addresses ---
const HUB_ADDRESS = (import.meta.env.VITE_HUB_ADDRESS || "") as `0x${string}`;
if (!HUB_ADDRESS) {
  throw new Error("VITE_HUB_ADDRESS is missing in .env");
}

// Types for our contracts
export type Appointment = {
  patient: `0x${string}`;
  doctor: `0x${string}`;
  amount: bigint;
  status: number;
};

// --- Hub Contract Functions ---
export async function getEscrowAddress(): Promise<`0x${string}`> {
  try {
    const escrowAddress = await readContract(config, {
      address: HUB_ADDRESS,
      abi: hubAbi,
      functionName: "escrow",
    });
    return escrowAddress as `0x${string}`;
  } catch (error) {
    console.error("Error getting escrow address:", error);
    throw error;
  }
}

export async function getPatientRecordsAddress(): Promise<`0x${string}`> {
  const patientAddress = await readContract(config, {
    address: HUB_ADDRESS,
    abi: hubAbi,
    functionName: "patientRecords",
  });
  return patientAddress as `0x${string}`;
}

export async function getDoctorRegistryAddress(): Promise<`0x${string}`> {
  const doctorRegistryAddress = await readContract(config, {
    address: HUB_ADDRESS,
    abi: hubAbi,
    functionName: "doctorRegistry",
  });
  return doctorRegistryAddress as `0x${string}`;
}

export async function getAllVerifiedDoctors(): Promise<`0x${string}`[]> {
  const doctors = await readContract(config, {
    address: HUB_ADDRESS,
    abi: hubAbi,
    functionName: "getAllVerifiedDoctors",
  });
  return doctors as `0x${string}`[];
}

export async function getDoctorDetails(doctorAddress: `0x${string}`) {
  const details = await readContract(config, {
    address: HUB_ADDRESS,
    abi: hubAbi,
    functionName: "getDoctorDetails",
    args: [doctorAddress],
  });
  return details;
}

// --- Escrow Contract Functions ---
export async function getNextAppointmentId(): Promise<bigint> {
  const escrowAddress = await getEscrowAddress();
  const nextId = await readContract(config, {
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "nextAppointmentId",
  });
  return nextId as bigint;
}

export async function getAppointment(appointmentId: bigint): Promise<Appointment> {
  const escrowAddress = await getEscrowAddress();
  const appointment = await readContract(config, {
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "appointments",
    args: [appointmentId],
  });
  
  // The contract returns a tuple: [patient, doctor, amount, status]
  const [patient, doctor, amount, status] = appointment as [`0x${string}`, `0x${string}`, bigint, number];
  
  return {
    patient,
    doctor,
    amount,
    status,
  };
}

export async function bookAppointment(doctor: `0x${string}`, value: bigint) {
  const escrowAddress = await getEscrowAddress();
  const result = await writeContract(config, {
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "bookAppointment",
    args: [doctor],
    value,
  });
  return result;
}

export async function confirmAppointment(appointmentId: bigint) {
  const escrowAddress = await getEscrowAddress();
  const result = await writeContract(config, {
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "confirmAppointment", // New function
    args: [appointmentId],
  });
  return result;
}

export async function completeAppointment(appointmentId: bigint) {
  const escrowAddress = await getEscrowAddress();
  const result = await writeContract(config, {
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "completeAppointment",
    args: [appointmentId],
  });
  return result;
}

export async function cancelAppointment(appointmentId: bigint) {
  const escrowAddress = await getEscrowAddress();
  const result = await writeContract(config, {
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "cancelAppointment",
    args: [appointmentId],
  });
  return result;
}

export async function disputeAppointment(appointmentId: bigint) {
  const escrowAddress = await getEscrowAddress();
  const result = await writeContract(config, {
    address: escrowAddress,
    abi: escrowAbi,
    functionName: "disputeAppointment",
    args: [appointmentId],
  });
  return result;
}

// --- Patient Records Functions ---
export async function getPatientDetails(patientAddress: `0x${string}`) {
  const patientRecordsAddress = await getPatientRecordsAddress();
  const details = await readContract(config, {
    address: patientRecordsAddress,
    abi: patientAbi,
    functionName: "getPatientDetails",
    args: [patientAddress],
  });
  return details;
}

export async function registerPatient(name: string, cid: string) {
  const patientRecordsAddress = await getPatientRecordsAddress();
  const result = await writeContract(config, {
    address: patientRecordsAddress,
    abi: patientAbi,
    functionName: "registerPatient",
    args: [name, cid],
  });
  return result;
}

// --- Doctor Registry Functions ---
export async function registerDoctor(
  name: string, 
  specialization: string, 
  cid: string
) {
  const doctorRegistryAddress = await getDoctorRegistryAddress();
  const result = await writeContract(config, {
    address: doctorRegistryAddress,
    abi: doctorRegistryAbi,
    functionName: "registerDoctor",
    args: [name, specialization, cid],
  });
  return result;
}

export async function verifyDoctor(doctorAddress: `0x${string}`) {
  const doctorRegistryAddress = await getDoctorRegistryAddress();
  const result = await writeContract(config, {
    address: doctorRegistryAddress,
    abi: doctorRegistryAbi,
    functionName: "verifyDoctor",
    args: [doctorAddress],
  });
  return result;
}

// --- Utility Functions ---
export async function checkNetwork() {
  const publicClient = getPublicClient(config);
  if (!publicClient) {
    console.error("No public client available");
    return null;
  }
  
  try {
    const network = await publicClient.getChainId();
    console.log("Connected to network chain ID:", network);
    return network;
  } catch (error) {
    console.error("Error getting network:", error);
    return null;
  }
}

// Alternative network check using window.ethereum
export async function checkNetworkWithEthereum() {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log("Connected to network chain ID:", parseInt(chainId, 16));
      return parseInt(chainId, 16);
    } catch (error) {
      console.error("Error getting network from ethereum provider:", error);
      return null;
    }
  }
  console.error("Ethereum provider not available");
  return null;
}

// Helper function to convert wei to ether
export function weiToEther(wei: bigint): string {
  return (Number(wei) / 1e18).toString();
}

// Helper function to convert ether to wei
export function etherToWei(ether: string): bigint {
  return BigInt(Math.floor(Number(ether) * 1e18));
}

// Safe version of weiToEther with error handling
export function weiToEtherSafe(wei: bigint | string): string {
  try {
    const weiBigInt = typeof wei === 'string' ? BigInt(wei) : wei;
    return (Number(weiBigInt) / 1e18).toFixed(6);
  } catch (error) {
    console.error("Error converting wei to ether:", error);
    return "0";
  }
}