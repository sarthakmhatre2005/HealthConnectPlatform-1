// HealthConnect Main JavaScript

// Document Ready Function
document.addEventListener('DOMContentLoaded', function() {
    // Hide loading screen
    hideLoadingScreen();
    
    // Activate fade-in animations
    activateFadeAnimations();
    
    // Setup tooltips
    initializeTooltips();
    
    // Initialize theme toggle
    initializeThemeToggle();
    
    // Set up password visibility toggles
    setupPasswordToggles();
    
    // Form validations
    setupFormValidations();
    
    // Handle status messages
    handleStatusMessages();
});

// Loading Screen Functions
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        setTimeout(() => {
            loadingScreen.style.opacity = '0';
            loadingScreen.style.visibility = 'hidden';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 800);
    }
}

function showLoadingScreen(message = 'Loading...') {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        const loadingText = loadingScreen.querySelector('.loading-text');
        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingScreen.style.display = 'flex';
        setTimeout(() => {
            loadingScreen.style.opacity = '1';
            loadingScreen.style.visibility = 'visible';
        }, 10);
    }
}

// Animation Functions
function activateFadeAnimations() {
    const fadeElements = document.querySelectorAll('.fade-in');
    
    // Function to check if an element is in viewport
    function isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.bottom >= 0
        );
    }
    
    // Function to handle scroll animations
    function handleScrollAnimations() {
        fadeElements.forEach(element => {
            if (isInViewport(element)) {
                // Add a delay based on data-delay attribute if present
                const delay = element.dataset.delay || 0;
                setTimeout(() => {
                    element.classList.add('active');
                }, delay);
            }
        });
    }
    
    // Initial check for elements already in viewport on load
    handleScrollAnimations();
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScrollAnimations);
}

// UI Component Initialization
function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const htmlElement = document.documentElement;
            const currentTheme = htmlElement.getAttribute('data-bs-theme');
            
            if (currentTheme === 'dark') {
                htmlElement.setAttribute('data-bs-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            } else {
                htmlElement.setAttribute('data-bs-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            }
        });
    }
}

// Form Utilities
function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Toggle icon
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    });
}

function setupFormValidations() {
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
    
    // Password confirmation validation
    const passwordInputs = document.querySelectorAll('input[type="password"][id="password"]');
    passwordInputs.forEach(passwordInput => {
        const confirmPasswordInput = document.getElementById('confirm_password');
        if (confirmPasswordInput) {
            function validatePasswordMatch() {
                if (passwordInput.value !== confirmPasswordInput.value) {
                    confirmPasswordInput.setCustomValidity('Passwords do not match');
                } else {
                    confirmPasswordInput.setCustomValidity('');
                }
            }
            
            passwordInput.addEventListener('change', validatePasswordMatch);
            confirmPasswordInput.addEventListener('keyup', validatePasswordMatch);
        }
    });
}

// Status Message Handling
function handleStatusMessages() {
    // Generic function to show toast notifications
    window.showToast = function(message, type = 'info') {
        const toast = document.getElementById('status-toast');
        if (toast) {
            const toastMessage = document.getElementById('toast-message');
            if (toastMessage) {
                toastMessage.textContent = message;
            }
            
            // Set the appropriate background color based on the type
            const toastHeader = toast.querySelector('.toast-header');
            if (toastHeader) {
                toastHeader.className = 'toast-header';
                
                const iconElement = toastHeader.querySelector('i');
                if (iconElement) {
                    iconElement.className = 'me-2 ';
                    
                    switch (type) {
                        case 'success':
                            iconElement.className += 'fas fa-check-circle text-success';
                            break;
                        case 'warning':
                            iconElement.className += 'fas fa-exclamation-triangle text-warning';
                            break;
                        case 'danger':
                            iconElement.className += 'fas fa-times-circle text-danger';
                            break;
                        default:
                            iconElement.className += 'fas fa-info-circle text-info';
                    }
                }
            }
            
            const bsToast = new bootstrap.Toast(toast);
            bsToast.show();
        }
    };
}

// Ajax Form Submission
function submitFormWithAjax(formElement, url, successCallback, errorCallback) {
    const formData = new FormData(formElement);
    
    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (typeof successCallback === 'function') {
            successCallback(data);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        if (typeof errorCallback === 'function') {
            errorCallback(error);
        }
    });
}

// Format date function
function formatDate(dateString, format = 'long') {
    const date = new Date(dateString);
    
    if (isNaN(date)) {
        return 'Invalid date';
    }
    
    if (format === 'long') {
        // Example: January 1, 2023
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } else if (format === 'short') {
        // Example: Jan 1, 2023
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } else if (format === 'time') {
        // Example: 3:30 PM
        const options = { hour: 'numeric', minute: '2-digit', hour12: true };
        return date.toLocaleTimeString('en-US', options);
    }
    
    return date.toLocaleDateString();
}

// Format time function 
function formatTime(timeString) {
    if (!timeString) return '';
    
    // Handle time in HH:MM format
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    
    // Convert to 12-hour format
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${period}`;
}

// Parse JSON helper function
function parseJSON(jsonString) {
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error('Error parsing JSON:', e);
        return null;
    }
}
