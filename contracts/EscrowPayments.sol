// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EscrowPayments
 * @notice Handles payments for consultations with dispute resolution
 */
contract EscrowPayments {
	enum AppointmentStatus { Pending, Completed, Cancelled, Disputed }

	struct Appointment {
		address patient;
		address doctor;
		uint256 amount;
		AppointmentStatus status;
	}

	address public admin;
	mapping(uint256 => Appointment) public appointments;
	uint256 public nextAppointmentId;

	event AppointmentBooked(uint256 indexed appointmentId, address indexed patient, address indexed doctor, uint256 amount);
	event AppointmentCompleted(uint256 indexed appointmentId);
	event AppointmentCancelled(uint256 indexed appointmentId);
	event AppointmentDisputed(uint256 indexed appointmentId);
	event FundsReleased(uint256 indexed appointmentId, address indexed to, uint256 amount);

	modifier onlyAdmin() {
		require(msg.sender == admin, "Only Admin");
		_;
	}

	constructor() {
		admin = msg.sender;
	}

	function bookAppointment(address doctor) external payable returns (uint256) {
		require(msg.value > 0, "Deposit required");

		appointments[nextAppointmentId] = Appointment({
			patient: msg.sender,
			doctor: doctor,
			amount: msg.value,
			status: AppointmentStatus.Pending
		});

		emit AppointmentBooked(nextAppointmentId, msg.sender, doctor, msg.value);
		return nextAppointmentId++;
	}

	function completeAppointment(uint256 appointmentId) external {
		Appointment storage appt = appointments[appointmentId];
		require(msg.sender == appt.patient, "Only patient can confirm");
		require(appt.status == AppointmentStatus.Pending, "Invalid status");

		appt.status = AppointmentStatus.Completed;
		payable(appt.doctor).transfer(appt.amount);

		emit AppointmentCompleted(appointmentId);
		emit FundsReleased(appointmentId, appt.doctor, appt.amount);
	}

	function cancelAppointment(uint256 appointmentId) external {
		Appointment storage appt = appointments[appointmentId];
		require(msg.sender == appt.patient, "Only patient can cancel");
		require(appt.status == AppointmentStatus.Pending, "Invalid status");

		appt.status = AppointmentStatus.Cancelled;
		payable(appt.patient).transfer(appt.amount);

		emit AppointmentCancelled(appointmentId);
		emit FundsReleased(appointmentId, appt.patient, appt.amount);
	}

	function disputeAppointment(uint256 appointmentId) external {
		Appointment storage appt = appointments[appointmentId];
		require(msg.sender == appt.patient || msg.sender == appt.doctor, "Unauthorized");
		require(appt.status == AppointmentStatus.Pending, "Invalid status");

		appt.status = AppointmentStatus.Disputed;
		emit AppointmentDisputed(appointmentId);
	}

	function resolveDispute(uint256 appointmentId, address payable winner) external onlyAdmin {
		Appointment storage appt = appointments[appointmentId];
		require(appt.status == AppointmentStatus.Disputed, "Not disputed");

		appt.status = AppointmentStatus.Completed;
		winner.transfer(appt.amount);

		emit FundsReleased(appointmentId, winner, appt.amount);
	}
}