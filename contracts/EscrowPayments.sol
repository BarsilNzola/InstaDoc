// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EscrowPayments
 * @notice Handles payments for consultations with proper workflow
 */
contract EscrowPayments {
    enum AppointmentStatus { Pending, Confirmed, Completed, CancelledByPatient, CancelledByDoctor, Disputed }

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
    event AppointmentConfirmed(uint256 indexed appointmentId);
    event AppointmentCompleted(uint256 indexed appointmentId);
    event AppointmentCancelledByPatient(uint256 indexed appointmentId);
    event AppointmentCancelledByDoctor(uint256 indexed appointmentId);
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
        require(doctor != address(0), "Invalid doctor address");
        require(doctor != msg.sender, "Cannot book appointment with yourself");

        appointments[nextAppointmentId] = Appointment({
            patient: msg.sender,
            doctor: doctor,
            amount: msg.value,
            status: AppointmentStatus.Pending
        });

        emit AppointmentBooked(nextAppointmentId, msg.sender, doctor, msg.value);
        return nextAppointmentId++;
    }

    // Doctor confirms the appointment
    function confirmAppointment(uint256 appointmentId) external {
        Appointment storage appt = appointments[appointmentId];
        require(msg.sender == appt.doctor, "Only doctor can confirm");
        require(appt.status == AppointmentStatus.Pending, "Invalid status");

        appt.status = AppointmentStatus.Confirmed;
        emit AppointmentConfirmed(appointmentId);
    }

    // Either party can complete after confirmation
    function completeAppointment(uint256 appointmentId) external {
        Appointment storage appt = appointments[appointmentId];
        require(msg.sender == appt.patient || msg.sender == appt.doctor, "Only patient or doctor can complete");
        require(appt.status == AppointmentStatus.Confirmed, "Appointment must be confirmed first");

        appt.status = AppointmentStatus.Completed;
        payable(appt.doctor).transfer(appt.amount);

        emit AppointmentCompleted(appointmentId);
        emit FundsReleased(appointmentId, appt.doctor, appt.amount);
    }

    // Patient cancels (gets refund)
    function cancelByPatient(uint256 appointmentId) external {
        Appointment storage appt = appointments[appointmentId];
        require(msg.sender == appt.patient, "Only patient can cancel");
        require(appt.status == AppointmentStatus.Pending || appt.status == AppointmentStatus.Confirmed, "Invalid status");

        appt.status = AppointmentStatus.CancelledByPatient;
        payable(appt.patient).transfer(appt.amount);

        emit AppointmentCancelledByPatient(appointmentId);
        emit FundsReleased(appointmentId, appt.patient, appt.amount);
    }

    // Doctor declines/cancels (patient gets refund)
    function cancelByDoctor(uint256 appointmentId) external {
        Appointment storage appt = appointments[appointmentId];
        require(msg.sender == appt.doctor, "Only doctor can cancel");
        require(appt.status == AppointmentStatus.Pending || appt.status == AppointmentStatus.Confirmed, "Invalid status");

        appt.status = AppointmentStatus.CancelledByDoctor;
        payable(appt.patient).transfer(appt.amount);

        emit AppointmentCancelledByDoctor(appointmentId);
        emit FundsReleased(appointmentId, appt.patient, appt.amount);
    }

    function disputeAppointment(uint256 appointmentId) external {
        Appointment storage appt = appointments[appointmentId];
        require(msg.sender == appt.patient || msg.sender == appt.doctor, "Unauthorized");
        require(appt.status == AppointmentStatus.Pending || appt.status == AppointmentStatus.Confirmed, "Invalid status");

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

    // View function to check if user has any pending/confirmed appointments
    function getPatientAppointments(address patient) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First count
        for (uint256 i = 0; i < nextAppointmentId; i++) {
            if (appointments[i].patient == patient && 
                (appointments[i].status == AppointmentStatus.Pending || 
                 appointments[i].status == AppointmentStatus.Confirmed)) {
                count++;
            }
        }
        
        // Then populate
        uint256[] memory patientAppointments = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < nextAppointmentId; i++) {
            if (appointments[i].patient == patient && 
                (appointments[i].status == AppointmentStatus.Pending || 
                 appointments[i].status == AppointmentStatus.Confirmed)) {
                patientAppointments[index] = i;
                index++;
            }
        }
        
        return patientAppointments;
    }
}