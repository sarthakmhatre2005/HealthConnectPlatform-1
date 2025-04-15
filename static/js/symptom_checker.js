// HealthConnect Symptom Checker JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize symptom chips
    initializeSymptomChips();
    
    // Initialize symptom search
    initializeSymptomSearch();
    
    // Add animation to the analysis process
    initializeAnalysisAnimation();
    
    // Initialize form validation
    const symptomForm = document.getElementById('symptom-form');
    if (symptomForm) {
        symptomForm.addEventListener('submit', function(event) {
            if (!validateSymptomForm()) {
                event.preventDefault();
                return false;
            }
            
            // Show loading screen during analysis
            showLoadingScreen('Analyzing your symptoms...');
            return true;
        });
    }
});

// Initialize symptom chips for selection
function initializeSymptomChips() {
    const symptomChips = document.querySelectorAll('.symptom-chip');
    const selectedSymptomsContainer = document.getElementById('selected-symptoms');
    const hiddenSymptomsInput = document.getElementById('symptoms-input');
    
    // Array to keep track of selected symptoms
    let selectedSymptoms = [];
    
    // Initialize selected symptoms from hidden input if it has a value
    if (hiddenSymptomsInput && hiddenSymptomsInput.value) {
        try {
            selectedSymptoms = JSON.parse(hiddenSymptomsInput.value);
            updateSelectedSymptomsDisplay();
        } catch (e) {
            console.error('Error parsing symptoms:', e);
        }
    }
    
    // Add click event to symptom chips
    symptomChips.forEach(chip => {
        chip.addEventListener('click', function() {
            const symptom = this.dataset.symptom;
            
            // Toggle selection
            if (this.classList.contains('selected')) {
                // Remove from selected symptoms
                this.classList.remove('selected');
                selectedSymptoms = selectedSymptoms.filter(s => s !== symptom);
            } else {
                // Add to selected symptoms
                this.classList.add('selected');
                selectedSymptoms.push(symptom);
            }
            
            // Update hidden input and display
            updateSelectedSymptomsInput();
            updateSelectedSymptomsDisplay();
        });
    });
    
    // Update the hidden input with selected symptoms
    function updateSelectedSymptomsInput() {
        if (hiddenSymptomsInput) {
            hiddenSymptomsInput.value = JSON.stringify(selectedSymptoms);
        }
    }
    
    // Update the visual display of selected symptoms
    function updateSelectedSymptomsDisplay() {
        if (selectedSymptomsContainer) {
            if (selectedSymptoms.length > 0) {
                let html = '';
                selectedSymptoms.forEach(symptom => {
                    html += `
                        <div class="selected-symptom-badge badge bg-primary me-2 mb-2">
                            ${symptom}
                            <button type="button" class="btn-close btn-close-white ms-2" 
                                data-symptom="${symptom}" aria-label="Remove"></button>
                        </div>
                    `;
                });
                selectedSymptomsContainer.innerHTML = html;
                
                // Add event listeners to remove buttons
                document.querySelectorAll('.selected-symptom-badge .btn-close').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const symptomToRemove = this.dataset.symptom;
                        
                        // Remove from selected symptoms
                        selectedSymptoms = selectedSymptoms.filter(s => s !== symptomToRemove);
                        
                        // Update chip status
                        document.querySelectorAll(`.symptom-chip[data-symptom="${symptomToRemove}"]`).forEach(chip => {
                            chip.classList.remove('selected');
                        });
                        
                        // Update hidden input and display
                        updateSelectedSymptomsInput();
                        updateSelectedSymptomsDisplay();
                    });
                });
                
                // Show the selected symptoms container
                selectedSymptomsContainer.classList.remove('d-none');
            } else {
                selectedSymptomsContainer.innerHTML = '<p class="text-muted">No symptoms selected</p>';
            }
        }
    }
}

// Initialize symptom search functionality
function initializeSymptomSearch() {
    const searchInput = document.getElementById('symptom-search');
    const symptomContainer = document.querySelector('.symptom-container');
    
    if (searchInput && symptomContainer) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const symptomChips = symptomContainer.querySelectorAll('.symptom-chip');
            
            symptomChips.forEach(chip => {
                const symptom = chip.dataset.symptom.toLowerCase();
                
                if (symptom.includes(searchTerm)) {
                    chip.style.display = '';
                } else {
                    chip.style.display = 'none';
                }
            });
            
            // Show message if no results
            const noResults = symptomContainer.querySelector('.no-results');
            if (noResults) {
                const hasVisibleChips = Array.from(symptomChips).some(chip => chip.style.display !== 'none');
                noResults.style.display = hasVisibleChips ? 'none' : 'block';
            }
        });
    }
}

// Initialize analysis animation
function initializeAnalysisAnimation() {
    const analyzeButton = document.querySelector('button[type="submit"]');
    
    if (analyzeButton) {
        analyzeButton.addEventListener('click', function() {
            if (validateSymptomForm()) {
                // Show the loading animation
                const loadingContainer = document.createElement('div');
                loadingContainer.className = 'text-center py-5';
                loadingContainer.innerHTML = `
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Analyzing...</span>
                    </div>
                    <h4 class="mt-3">Analyzing your symptoms...</h4>
                    <p class="text-muted">This may take a few moments</p>
                `;
                
                // Replace the form with the loading animation
                const formContainer = document.querySelector('.symptom-form-container');
                if (formContainer) {
                    formContainer.style.opacity = '0';
                    setTimeout(() => {
                        formContainer.innerHTML = '';
                        formContainer.appendChild(loadingContainer);
                        formContainer.style.opacity = '1';
                    }, 300);
                }
            }
        });
    }
}

// Validate the symptom form before submission
function validateSymptomForm() {
    const hiddenSymptomsInput = document.getElementById('symptoms-input');
    let selectedSymptoms = [];
    
    if (hiddenSymptomsInput && hiddenSymptomsInput.value) {
        try {
            selectedSymptoms = JSON.parse(hiddenSymptomsInput.value);
        } catch (e) {
            console.error('Error parsing symptoms:', e);
        }
    }
    
    // Check if at least one symptom is selected
    if (selectedSymptoms.length === 0) {
        // Show error message
        const errorContainer = document.getElementById('symptom-error');
        if (errorContainer) {
            errorContainer.textContent = 'Please select at least one symptom';
            errorContainer.classList.remove('d-none');
        }
        return false;
    }
    
    return true;
}

// Additional functions for symptom results page
function viewDoctorRecommendations() {
    const analysisSection = document.getElementById('analysis-section');
    const doctorsSection = document.getElementById('doctors-section');
    
    if (analysisSection && doctorsSection) {
        // Scroll to doctors section with animation
        doctorsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function toggleAnalysisDetails() {
    const detailsContainer = document.getElementById('analysis-details');
    const toggleButton = document.getElementById('toggle-details-btn');
    
    if (detailsContainer && toggleButton) {
        if (detailsContainer.classList.contains('d-none')) {
            // Show details
            detailsContainer.classList.remove('d-none');
            detailsContainer.style.opacity = '0';
            setTimeout(() => {
                detailsContainer.style.opacity = '1';
            }, 10);
            
            toggleButton.innerHTML = '<i class="fas fa-chevron-up me-2"></i>Hide Details';
        } else {
            // Hide details
            detailsContainer.style.opacity = '0';
            setTimeout(() => {
                detailsContainer.classList.add('d-none');
            }, 300);
            
            toggleButton.innerHTML = '<i class="fas fa-chevron-down me-2"></i>Show Details';
        }
    }
}

// Function to book appointment with a recommended doctor
function bookWithRecommendedDoctor(doctorId) {
    window.location.href = `/book-appointment?doctor_id=${doctorId}`;
}
