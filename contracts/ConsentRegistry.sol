// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ConsentRegistry
 * @notice Patients grant consent for doctors to view encrypted medical records stored on IPFS
 */
 contract ConsentRegistry {
 	struct Consent {
 		address patient;
 		address doctor;
 		string encryptedCID; // Encrypted IPFS CID (AES encrypted before upload)
 		uint256 timestamp;
 		bool active;
 	}

 	Consent[] public consents;
 	mapping(uint256 => bool) public consentExists;

 	event ConsentCreated(uint256 indexed id, address indexed patient, address indexed doctor, string cid);
 	event ConsentRevoked(uint256 indexed id);

 	function createConsent(address doctor, string calldata encryptedCID) external returns (uint256) {
 		Consent memory c = Consent({
 			patient: msg.sender,
 			doctor: doctor,
 			encryptedCID: encryptedCID,
 			timestamp: block.timestamp,
 			active: true
 		});

 		consents.push(c);
 		uint256 id = consents.length - 1;
 		consentExists[id] = true;

 		emit ConsentCreated(id, msg.sender, doctor, encryptedCID);
 		return id;
 	}

 	function revokeConsent(uint256 id) external {
 		require(consentExists[id], "Consent does not exist");
 		Consent storage c = consents[id];
 		require(msg.sender == c.patient, "Only patient can revoke");
 		c.active = false;
 		emit ConsentRevoked(id);
 	}

 	function getConsent(uint256 id) external view returns (Consent memory) {
 		require(consentExists[id], "Consent does not exist");
 		return consents[id];
 	}

 	function consentsLength() external view returns (uint256) {
 		return consents.length;
 	}
} 