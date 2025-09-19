import { ethers } from "hardhat";

async function main() {
	const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
	const doctorRegistry = await DoctorRegistry.deploy();
	await doctorRegistry.waitForDeployment();

	const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
	const consentRegistry = await ConsentRegistry.deploy();
	await consentRegistry.waitForDeployment();

	const EscrowPayments = await ethers.getContractFactory("EscrowPayments");
	const escrow = await EscrowPayments.deploy();
	await escrow.waitForDeployment();

	const PatientRecords = await ethers.getContractFactory("PatientRecords");
	const patientRecords = await PatientRecords.deploy();
	await patientRecords.waitForDeployment();

	const InstaDocHub = await ethers.getContractFactory("InstaDocHub");
	const hub = await InstaDocHub.deploy(
		await doctorRegistry.getAddress(),
		await consentRegistry.getAddress(),
		await escrow.getAddress(),
		await patientRecords.getAddress(),
	);
	await hub.waitForDeployment();

	console.log("DoctorRegistry:", await doctorRegistry.getAddress());
	console.log("ConsentRegistry:", await consentRegistry.getAddress());
	console.log("EscrowPayments:", await escrow.getAddress());
	console.log("PatientRecords:", await patientRecords.getAddress());
	console.log("InstaDocHub:", await hub.getAddress()); 
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});