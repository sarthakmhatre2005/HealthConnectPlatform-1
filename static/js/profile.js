// HealthConnect Profile JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Form validation
    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');
    
    if (profileForm) {
        profileForm.addEventListener('submit', function(event) {
            if (!this.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            } else {
                // Show loading screen
                showLoadingScreen('Saving your profile...');
            }
            
            this.classList.add('was-validated');
        });
    }
    
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(event) {
            if (!this.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            } else {
                // Verify passwords match
                const newPassword = document.getElementById('new_password').value;
                const confirmPassword = document.getElementById('confirm_password').value;
                
                if (newPassword !== confirmPassword) {
                    event.preventDefault();
                    document.getElementById('confirm_password').setCustomValidity('Passwords do not match');
                    showToast('New passwords do not match', 'danger');
                    return;
                }
                
                // Show loading screen
                showLoadingScreen('Updating your password...');
            }
            
            this.classList.add('was-validated');
        });
        
        // Password confirmation validation
        const newPasswordInput = document.getElementById('new_password');
        const confirmPasswordInput = document.getElementById('confirm_password');
        
        if (newPasswordInput && confirmPasswordInput) {
            function validatePasswordMatch() {
                if (newPasswordInput.value !== confirmPasswordInput.value) {
                    confirmPasswordInput.setCustomValidity('Passwords do not match');
                } else {
                    confirmPasswordInput.setCustomValidity('');
                }
            }
            
            newPasswordInput.addEventListener('input', validatePasswordMatch);
            confirmPasswordInput.addEventListener('input', validatePasswordMatch);
        }
    }
    
    // Handle available days checkboxes
    const availableDaysCheckboxes = document.querySelectorAll('input[name="available_days"]');
    const availableDaysInput = document.createElement('input');
    availableDaysInput.type = 'hidden';
    availableDaysInput.name = 'available_days';
    
    if (availableDaysCheckboxes.length > 0 && profileForm) {
        profileForm.appendChild(availableDaysInput);
        
        function updateAvailableDaysValue() {
            const selectedDays = Array.from(availableDaysCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);
            
            availableDaysInput.value = selectedDays.join(',');
        }
        
        // Set initial value
        updateAvailableDaysValue();
        
        // Update on change
        availableDaysCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateAvailableDaysValue);
        });
    }
    
    // Handle available hours inputs
    const hoursStartInput = document.getElementById('hours_start');
    const hoursEndInput = document.getElementById('hours_end');
    const availableHoursInput = document.createElement('input');
    availableHoursInput.type = 'hidden';
    availableHoursInput.name = 'available_hours';
    
    if (hoursStartInput && hoursEndInput && profileForm) {
        profileForm.appendChild(availableHoursInput);
        
        function updateAvailableHoursValue() {
            availableHoursInput.value = JSON.stringify({
                start: hoursStartInput.value,
                end: hoursEndInput.value
            });
        }
        
        // Set initial value
        updateAvailableHoursValue();
        
        // Update on change
        hoursStartInput.addEventListener('change', updateAvailableHoursValue);
        hoursEndInput.addEventListener('change', updateAvailableHoursValue);
    }
    
    // Location detection for doctors
    const detectLocationBtn = document.getElementById('detect-location');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const locationStatusDiv = document.getElementById('location-status');
    
    if (detectLocationBtn && latitudeInput && longitudeInput) {
        detectLocationBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (!navigator.geolocation) {
                updateLocationStatus('error', 'Geolocation is not supported by your browser');
                return;
            }
            
            // Update status
            updateLocationStatus('info', 'Detecting your location...');
            
            // Get current position
            navigator.geolocation.getCurrentPosition(
                // Success callback
                position => {
                    latitudeInput.value = position.coords.latitude;
                    longitudeInput.value = position.coords.longitude;
                    updateLocationStatus('success', 'Location detected successfully');
                },
                // Error callback
                error => {
                    let errorMessage = 'Unable to retrieve your location.';
                    
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access was denied. Please allow access to your location.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information is unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'The request to get your location timed out.';
                            break;
                    }
                    
                    updateLocationStatus('error', errorMessage);
                },
                // Options
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }
    
    // Helper function to update location status
    function updateLocationStatus(type, message) {
        if (locationStatusDiv) {
            let alertClass = '';
            let icon = '';
            
            switch (type) {
                case 'success':
                    alertClass = 'alert-success';
                    icon = 'fas fa-check-circle';
                    break;
                case 'error':
                    alertClass = 'alert-danger';
                    icon = 'fas fa-exclamation-circle';
                    break;
                default:
                    alertClass = 'alert-info';
                    icon = 'fas fa-info-circle';
            }
            
            locationStatusDiv.innerHTML = `
                <div class="alert ${alertClass}">
                    <i class="${icon} me-2"></i> ${message}
                </div>
            `;
        }
    }
    
    // Profile image animation on hover
    const profileAvatar = document.querySelector('.profile-avatar');
    if (profileAvatar) {
        profileAvatar.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.05)';
            this.style.transition = 'transform 0.3s ease';
        });
        
        profileAvatar.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    }
});
