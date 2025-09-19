// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DoctorRegistry.sol";
import "./ConsentRegistry.sol";
import "./EscrowPayments.sol";
import "./PatientRecords.sol";

/**
 * @title InstaDocHub
 * @notice Glue contract that links doctor registry, consents, and payments
 */
contract InstaDocHub {
	DoctorRegistry public doctorRegistry;
	ConsentRegistry public consentRegistry;
	EscrowPayments public escrow;
	PatientRecords public patientRecords;

	mapping(address => bool) public registeredPatients;

	event PatientRegistered(address indexed patient);

	constructor(
		address doctorRegistryAddr,
		address consentRegistryAddr,
		address escrowAddr,
		address patientRecordsAddr
	) {
		doctorRegistry = DoctorRegistry(doctorRegistryAddr);
		consentRegistry = ConsentRegistry(consentRegistryAddr);
		escrow = EscrowPayments(escrowAddr);
		patientRecords = PatientRecords(patientRecordsAddr);
	}

	/// @notice Patient self-registration
	function registerPatient() external {
		require(!registeredPatients[msg.sender], "Already Registered");
		registeredPatients[msg.sender] =true;
		emit PatientRegistered(msg.sender);
	}

	/// @notice Checks if a doctor is verified
	function isDoctorVerified(address doctor) external view returns (bool) {
		return doctorRegistry.isVerified(doctor);
	}

	/// @notice Allows doctor to add records if patient gave consent
	function addRecordForPatient(
		address patient,
		string calldata description,
		string calldata recordCID
	) external {
		require(doctorRegistry.isVerified(msg.sender), "Doctor not verified");
		require(registeredPatients[patient], "Patient not registered");

		// verify consent exists and active
		bool hasConsent = false;
		for (uint256 i = 0; i < consentRegistry.consentsLength(); i++) {
		    ConsentRegistry.Consent memory c = consentRegistry.getConsent(i);
		    if (c.patient == patient && c.doctor == msg.sender && c.active) {
		        hasConsent = true;
		        break;
		    }
		}
		require(hasConsent, "No Active Consent");

		patientRecords.addRecord(patient, description, recordCID);
	}

	/// @notice Patient views their own medical records
	function viewMyRecords() external view returns (PatientRecords.Record[] memory) {
		require(registeredPatients[msg.sender], "Not Registered");
		return patientRecords.getRecords(msg.sender);
	}
}