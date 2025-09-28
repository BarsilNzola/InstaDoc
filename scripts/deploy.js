const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", await deployer.getAddress());

  const DoctorRegistry = await ethers.getContractFactory("DoctorRegistry");
  const doctorRegistry = await DoctorRegistry.deploy();
  await doctorRegistry.waitForDeployment();
  console.log("DoctorRegistry deployed to:", await doctorRegistry.getAddress());

  const ConsentRegistry = await ethers.getContractFactory("ConsentRegistry");
  const consentRegistry = await ConsentRegistry.deploy();
  await consentRegistry.waitForDeployment();
  console.log("ConsentRegistry deployed to:", await consentRegistry.getAddress());

  const EscrowPayments = await ethers.getContractFactory("EscrowPayments");
  const escrow = await EscrowPayments.deploy();
  await escrow.waitForDeployment();
  console.log("EscrowPayments deployed to:", await escrow.getAddress());

  const PatientRecords = await ethers.getContractFactory("PatientRecords");
  const patientRecords = await PatientRecords.deploy();
  await patientRecords.waitForDeployment();
  console.log("PatientRecords deployed to:", await patientRecords.getAddress());

  const InstaDocHub = await ethers.getContractFactory("InstaDocHub");
  const hub = await InstaDocHub.deploy(
    await doctorRegistry.getAddress(),
    await consentRegistry.getAddress(),
    await escrow.getAddress(),
    await patientRecords.getAddress(),
  );
  await hub.waitForDeployment();
  console.log("InstaDocHub deployed to:", await hub.getAddress());

  // Transfer admin rights from deployer to InstaDocHub
  console.log("Transferring DoctorRegistry admin to InstaDocHub...");
  await doctorRegistry.transferAdmin(await hub.getAddress());
  console.log("Admin transferred successfully!");

  console.log("\n=== Deployment Summary ===");
  console.log("DoctorRegistry:", await doctorRegistry.getAddress());
  console.log("ConsentRegistry:", await consentRegistry.getAddress());
  console.log("EscrowPayments:", await escrow.getAddress());
  console.log("PatientRecords:", await patientRecords.getAddress());
  console.log("InstaDocHub:", await hub.getAddress());
  console.log("DoctorRegistry Admin:", await doctorRegistry.admin());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});