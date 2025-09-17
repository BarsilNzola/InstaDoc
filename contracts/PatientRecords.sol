// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PatientRecords {
	struct Record {
		address doctor;
		string description;
		string ipfsHash;
		uint256 timestamp;
	}

	mapping(address => Record[]) private patientRecords;

	event RecordAdded(address indexed patient, address indexed doctor, string description, string ipfsHash, uint256 timestamp);

	function addRecord(address patient, string memory description, string memory ipfsHash) external {
		Record memory newRecord = Record({
			doctor: msg.sender,
			description: description,
			ipfsHash: ipfsHash,
			timestamp: block.timestamp
		});

		patientRecords[patient].push(newRecord);
		emit RecordAdded(patient, msg.sender, description, ipfsHash, block.timestamp);
	}

	function getRecords(address patient) external view returns (Record[] memory) {
		return patientRecords[patient];
	}
}