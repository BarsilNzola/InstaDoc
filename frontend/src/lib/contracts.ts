import { ethers } from "ethers";
import hubArtifact from "../abis/InstaDocHub.json";
import escrowArtifact from "../abis/EscrowPayments.json";
import patientArtifact from "../abis/PatientRecords.json";

const hubAbi = hubArtifact.abi;
const escrowAbi = escrowArtifact.abi;
const patientAbi = patientArtifact.abi;

const HUB_ADDRESS = import.meta.env.VITE_HUB_ADDRESS;

export async function getProvider() {
  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  return provider;
}

export async function getSigner() {
  const provider = await getProvider();
  return await provider.getSigner();
}

export async function getHubContract() {
  return new ethers.Contract(HUB_ADDRESS, hubAbi, await getSigner());
}

export async function getEscrowContract() {
  const hub = await getHubContract();
  const escrowAddr = await hub.escrow();
  return new ethers.Contract(escrowAddr, escrowAbi, await getSigner());
}

export async function getPatientRecordsContract() {
  const hub = await getHubContract();
  const patientAddr = await hub.patientRecords();
  return new ethers.Contract(patientAddr, patientAbi, await getSigner());
}
