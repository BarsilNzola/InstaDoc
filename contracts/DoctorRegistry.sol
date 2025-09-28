// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DoctorRegistry
 * @notice Maintains a verified list of doctors approved by the admin
 */
contract DoctorRegistry {
	address public admin;

	struct Doctor {
		string name;
		string specialization;
		string profileCID; //IPFS CID to off-chain profile
		bool verified;
	}

	mapping(address => Doctor) public doctors;

	event DoctorRegistered(address indexed doctor, string name, string specialization, string profileCID);
	event DoctorRevoked(address indexed doctor);

	modifier onlyAdmin() {
		require(msg.sender == admin, "Only Admin");
		_;
	}

	constructor() {
		admin = msg.sender;
	}

	function registerDoctor(
		address doctorAddr,
		string calldata name,
		string calldata specialization,
		string calldata profileCID
	) external onlyAdmin {
		require(!doctors[doctorAddr].verified, "Doctor already registered");
		doctors[doctorAddr] = Doctor(name, specialization, profileCID, true);
		emit DoctorRegistered(doctorAddr, name, specialization, profileCID);
	}

	function revokeDoctor(address doctorAddr) external onlyAdmin {
		doctors[doctorAddr].verified = false;
		emit DoctorRevoked(doctorAddr);
	}

	function isVerified(address doctorAddr) external view returns (bool) {
		return doctors[doctorAddr].verified;
	}

	function transferAdmin(address newAdmin) external onlyAdmin {
        admin = newAdmin;
    }
}