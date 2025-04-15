// HealthConnect Appointments JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const doctorSelect = document.getElementById('doctor_id');
    const dateInput = document.getElementById('date');
    const timeSelect = document.getElementById('time');
    const dateAlert = document.getElementById('date-alert');
    const bookingForm = document.getElementById('booking-form');
    const confirmModal = new bootstrap.Modal(document.getElementById('confirm-appointment-modal'));
    
    // Current date for minimum selectable date
    const today = new Date();
    const formattedToday = formatYYYYMMDD(today);
    if (dateInput) {
        dateInput.setAttribute('min', formattedToday);
    }
    
    // Handle doctor selection
    if (doctorSelect) {
        doctorSelect.addEventListener('change', function() {
            resetTimeSelect();
            if (dateInput.value) {
                fetchAvailableTimeSlots();
            }
        });
    }
    
    // Handle date selection
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            resetTimeSelect();
            if (this.value) {
                const selectedDate = new Date(this.value);
                const dayOfWeek = selectedDate.getDay();
                
                // Check if date is in the past
                if (selectedDate < today) {
                    showDateAlert('Cannot book appointments in the past.');
                    return;
                }
                
                // Check if date is a weekend (0 = Sunday, 6 = Saturday)
                // Note: This is just an example restriction and can be adjusted based on business rules
                /*if (dayOfWeek === 0 || dayOfWeek === 6) {
                    showDateAlert('Appointments are not available on weekends.');
                    return;
                }*/
                
                // Check if date is too far in the future (e.g., more than 3 months)
                const threeMonthsFromNow = new Date();
                threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
                if (selectedDate > threeMonthsFromNow) {
                    showDateAlert('Appointments can only be booked up to 3 months in advance.');
                    return;
                }
                
                // Date is valid, fetch available time slots
                hideDateAlert();
                fetchAvailableTimeSlots();
            }
        });
    }
    
    // Handle booking form submission with confirmation modal
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            // Perform form validation
            if (!this.checkValidity()) {
                this.classList.add('was-validated');
                return;
            }
            
            // Get form data for confirmation modal
            const formData = new FormData(this);
            const doctorId = formData.get('doctor_id');
            const date = formData.get('date');
            const time = formData.get('time');
            const reason = formData.get('reason') || 'Not specified';
            
            const doctorName = doctorSelect.options[doctorSelect.selectedIndex].text;
            const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const formattedTime = formatTime(time);
            
            // Update confirmation modal
            document.getElementById('confirm-doctor').textContent = doctorName;
            document.getElementById('confirm-date').textContent = formattedDate;
            document.getElementById('confirm-time').textContent = formattedTime;
            document.getElementById('confirm-reason').textContent = reason;
            
            // Show confirmation modal
            confirmModal.show();
        });
        
        // Handle confirmation modal submission
        const confirmButton = document.getElementById('confirm-booking');
        if (confirmButton) {
            confirmButton.addEventListener('click', function() {
                showLoadingScreen('Booking your appointment...');
                bookingForm.submit();
            });
        }
    }
    
    // Handle appointment cancellation/status changes
    setupAppointmentStatusButtons();
    
    // Format date as YYYY-MM-DD for the min attribute
    function formatYYYYMMDD(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    // Reset time select dropdown
    function resetTimeSelect() {
        if (timeSelect) {
            timeSelect.innerHTML = '<option value="" selected disabled>Select a date first</option>';
            timeSelect.disabled = true;
        }
    }
    
    // Show date alert message
    function showDateAlert(message) {
        if (dateAlert) {
            dateAlert.textContent = message;
            dateAlert.classList.remove('d-none');
            resetTimeSelect();
        }
    }
    
    // Hide date alert message
    function hideDateAlert() {
        if (dateAlert) {
            dateAlert.classList.add('d-none');
        }
    }
    
    // Fetch available time slots from the server
    function fetchAvailableTimeSlots() {
        const doctorId = doctorSelect.value;
        const date = dateInput.value;
        
        if (!doctorId || !date) {
            return;
        }
        
        // Show loading indicator in time select
        timeSelect.innerHTML = '<option value="" selected disabled>Loading available times...</option>';
        
        fetch(`/api/doctor-availability?doctor_id=${doctorId}&date=${date}`)
            .then(response => response.json())
            .then(data => {
                if (data.available && data.available_slots.length > 0) {
                    // Populate time slots
                    timeSelect.innerHTML = '';
                    timeSelect.disabled = false;
                    
                    // Add default option
                    const defaultOption = document.createElement('option');
                    defaultOption.value = '';
                    defaultOption.disabled = true;
                    defaultOption.selected = true;
                    defaultOption.textContent = 'Select a time slot';
                    timeSelect.appendChild(defaultOption);
                    
                    // Add available slots
                    data.available_slots.forEach(slot => {
                        const option = document.createElement('option');
                        option.value = slot.value;
                        option.textContent = slot.display;
                        timeSelect.appendChild(option);
                    });
                } else {
                    // No available slots
                    timeSelect.innerHTML = '<option value="" selected disabled>No available slots on this day</option>';
                    timeSelect.disabled = true;
                    
                    // Show message in date alert
                    if (data.message) {
                        showDateAlert(data.message);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching time slots:', error);
                timeSelect.innerHTML = '<option value="" selected disabled>Error loading time slots</option>';
                timeSelect.disabled = true;
            });
    }
});

// Setup appointment status change buttons
function setupAppointmentStatusButtons() {
    // Handle appointment approval/rejection/completion/cancellation
    const actionButtons = document.querySelectorAll('.appointment-action-btn');
    if (actionButtons.length > 0) {
        actionButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Get data from button
                const appointmentId = this.dataset.appointmentId;
                const status = this.dataset.status;
                const patientName = this.dataset.patientName;
                const appointmentDate = this.dataset.appointmentDate;
                const appointmentTime = this.dataset.appointmentTime;
                
                // Get modal elements
                const modalTitle = document.querySelector('#approvalModal .modal-title, #rejectionModal .modal-title');
                const modalPatient = document.querySelector('#approvalModal .patient-name, #rejectionModal .patient-name');
                const modalDate = document.querySelector('#approvalModal .appointment-date, #rejectionModal .appointment-date');
                const modalTime = document.querySelector('#approvalModal .appointment-time, #rejectionModal .appointment-time');
                const appointmentIdInput = document.querySelector('#approvalModal [name="appointment_id"], #rejectionModal [name="appointment_id"]');
                const statusInput = document.querySelector('#approvalModal [name="status"], #rejectionModal [name="status"]');
                
                // Update modal elements
                if (modalPatient) modalPatient.textContent = patientName;
                if (modalDate) modalDate.textContent = appointmentDate;
                if (modalTime) modalTime.textContent = appointmentTime;
                if (appointmentIdInput) appointmentIdInput.value = appointmentId;
                if (statusInput) statusInput.value = status;
                
                // Update modal title based on status
                if (modalTitle) {
                    if (status === 'approved') {
                        modalTitle.textContent = 'Approve Appointment';
                    } else if (status === 'rejected') {
                        modalTitle.textContent = 'Reject Appointment';
                    }
                }
            });
        });
    }
    
    // Handle appointment status update form submission
    const approvalForm = document.getElementById('appointment-approval-form');
    const rejectionForm = document.getElementById('appointment-rejection-form');
    
    [approvalForm, rejectionForm].forEach(form => {
        if (form) {
            form.addEventListener('submit', function(event) {
                event.preventDefault();
                
                const formData = new FormData(this);
                const submitButton = this.querySelector('[type="submit"]');
                const originalButtonText = submitButton.innerHTML;
                
                // Update button to show loading state
                submitButton.disabled = true;
                submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
                
                // Send form data to server
                fetch('/appointment/update-status', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Show success message
                        showToast(data.message, 'success');
                        
                        // Close modal
                        const modal = bootstrap.Modal.getInstance(this.closest('.modal'));
                        if (modal) {
                            modal.hide();
                        }
                        
                        // Refresh page after a brief delay
                        setTimeout(() => {
                            location.reload();
                        }, 1500);
                    } else {
                        // Show error message
                        showToast(data.message || 'An error occurred', 'danger');
                        
                        // Reset button
                        submitButton.disabled = false;
                        submitButton.innerHTML = originalButtonText;
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('An error occurred. Please try again.', 'danger');
                    
                    // Reset button
                    submitButton.disabled = false;
                    submitButton.innerHTML = originalButtonText;
                });
            });
        }
    });
    
    // Handle cancel appointment buttons
    const cancelButtons = document.querySelectorAll('.cancel-appointment-btn');
    if (cancelButtons.length > 0) {
        cancelButtons.forEach(button => {
            button.addEventListener('click', function() {
                const appointmentId = this.dataset.appointmentId;
                const appointmentDate = this.dataset.appointmentDate;
                
                if (confirm(`Are you sure you want to cancel your appointment on ${appointmentDate}?`)) {
                    const formData = new FormData();
                    formData.append('appointment_id', appointmentId);
                    formData.append('status', 'cancelled');
                    formData.append('notes', 'Cancelled by user');
                    
                    fetch('/appointment/update-status', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            showToast(data.message, 'success');
                            setTimeout(() => {
                                location.reload();
                            }, 1500);
                        } else {
                            showToast(data.message || 'Failed to cancel appointment', 'danger');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        showToast('An error occurred. Please try again.', 'danger');
                    });
                }
            });
        });
    }
}
