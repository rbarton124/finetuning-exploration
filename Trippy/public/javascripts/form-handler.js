document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS animations
    AOS.init({
        duration: 800,
        easing: 'ease-out',
        once: true
    });
    
    // Initialize date picker
    const dateRangePicker = flatpickr('#date-range', {
        mode: 'range',
        minDate: 'today',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'F j, Y',
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                // Update hidden inputs for form submission
                document.getElementById('start-date').value = flatpickr.formatDate(selectedDates[0], 'Y-m-d');
                document.getElementById('end-date').value = flatpickr.formatDate(selectedDates[1], 'Y-m-d');
                updateSummary();
            }
        }
    });
    
    // Initialize destination input
    const destinationInput = document.getElementById('destination-input');
    if (destinationInput) {
        destinationInput.addEventListener('input', updateSummary);
        // Quick destination buttons
        document.querySelectorAll('.destination-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                destinationInput.value = this.dataset.destination;
                updateSummary();
            });
        });
    }
    
    // Initialize custom interest functionality
    const customInterestInput = document.getElementById('custom-interest');
    const addCustomInterestBtn = document.getElementById('add-custom-interest');
    
    if (customInterestInput && addCustomInterestBtn) {
        // Add custom interest on Enter key
        customInterestInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCustomInterest();
            }
        });
        
        // Add custom interest on button click
        addCustomInterestBtn.addEventListener('click', addCustomInterest);
    }
    
    // Setup interest checkboxes
    document.querySelectorAll('input[name="interests[]"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateSummary);
    });
    
    // Setup trip type radio buttons and option cards
    document.querySelectorAll('input[name="vacation-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            // Handle custom trip type option
            if (this.value === 'custom') {
                document.getElementById('custom-trip-type-container').classList.remove('hidden');
                // If a custom trip type has already been set, show it again
                if (document.getElementById('custom-trip-type-display').textContent.trim()) {
                    document.getElementById('custom-trip-type-display-container').classList.remove('hidden');
                    document.getElementById('custom-trip-type-container').classList.add('hidden');
                }
                
                // Reset the "Update" button text if it was changed
                document.getElementById('add-custom-trip-type').textContent = 'Add';
            } else {
                // If selecting a preset, hide and reset custom trip type elements
                document.getElementById('custom-trip-type-container').classList.add('hidden');
                document.getElementById('custom-trip-type-display-container').classList.add('hidden');
                document.getElementById('custom-trip-type-display').textContent = '';
                
                // Update the hidden select for form submission
                document.getElementById('vacation-type').value = this.value;
                updateSummary();
            }
        });
    });
    
    // Make option cards work with radio inputs
    document.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', function() {
            const radio = this.querySelector('input[type="radio"]');
            if (radio) {
                // Clear existing selection styling
                document.querySelectorAll('.option-card').forEach(c => {
                    c.classList.remove('selected');
                });
                
                // Add selection styling to this card
                this.classList.add('selected');
                
                // Add has-selection class to parent grid
                const optionGrid = document.querySelector('.option-grid');
                if (optionGrid) {
                    optionGrid.classList.add('has-selection');
                }
                
                // Set radio as checked
                radio.checked = true;
                
                // Trigger the change event to handle custom type logic
                const event = new Event('change');
                radio.dispatchEvent(event);
            }
        });
    });
    
    // Handle custom trip type
    const customTripInput = document.getElementById('custom-trip-type');
    const addCustomTripBtn = document.getElementById('add-custom-trip-type');
    
    if (customTripInput && addCustomTripBtn) {
        // Add custom trip type on Enter key
        customTripInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCustomTripType();
            }
        });
        
        // Add custom trip type on button click
        addCustomTripBtn.addEventListener('click', addCustomTripType);
        
        // Allow changing custom trip type by clicking on the display container
        const customTypeContainer = document.getElementById('custom-trip-type-display-container');
        if (customTypeContainer) {
            customTypeContainer.addEventListener('click', function() {
                // Hide display and show input to modify
                this.classList.add('hidden');
                document.getElementById('custom-trip-type-container').classList.remove('hidden');
                
                // Focus the input field for better UX
                document.getElementById('custom-trip-type').focus();
                
                // Add "Edit" text for clarity
                document.getElementById('add-custom-trip-type').textContent = 'Update';
            });
        }
    }
    
    // Message/description textarea
    const messageTextarea = document.getElementById('message');
    if (messageTextarea) {
        messageTextarea.addEventListener('input', updateSummary);
    }
    
    // Form submission
    const form = document.getElementById('form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Update summary on page load
    updateSummary();
});

/**
 * Add a custom interest to the form
 */
function addCustomInterest() {
    const customInterestInput = document.getElementById('custom-interest');
    const interest = customInterestInput.value.trim();
    
    if (!interest) return;
    
    const container = document.getElementById('custom-interests-container');
    
    // Create the visual tag
    const tag = document.createElement('div');
    tag.className = 'inline-flex items-center rounded-full bg-primary-100 py-1 px-2 text-sm font-medium text-primary-700 mr-2 mb-2';
    tag.innerHTML = `
        <span>${interest}</span>
        <button type="button" class="ml-1 inline-flex h-4 w-4 rounded-full items-center justify-center hover:bg-primary-200">
            <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
            </svg>
        </button>
        <input type="hidden" name="interests[]" value="${interest}">
    `;
    
    // Add remove functionality
    tag.querySelector('button').addEventListener('click', function() {
        tag.remove();
        updateSummary();
    });
    
    // Add to container
    container.appendChild(tag);
    
    // Clear input
    customInterestInput.value = '';
    
    // Update summary
    updateSummary();
}

/**
 * Add custom trip type
 */
function addCustomTripType() {
    const customTripInput = document.getElementById('custom-trip-type');
    const tripType = customTripInput.value.trim();
    
    if (!tripType) {
        return; // Don't add empty trip type
    }
    
    // Set the custom value to the hidden select
    document.getElementById('vacation-type').value = tripType;
    
    // Update the custom trip display
    const customTypeDisplay = document.getElementById('custom-trip-type-display');
    customTypeDisplay.textContent = tripType;
    
    // Show the custom type display
    document.getElementById('custom-trip-type-display-container').classList.remove('hidden');
    
    // Hide the input
    document.getElementById('custom-trip-type-container').classList.add('hidden');
    
    // Clear input
    customTripInput.value = '';
    
    // Apply styling to indicate custom type is selected
    const optionGrid = document.querySelector('.option-grid');
    const customCard = document.querySelector('.option-card input[value="custom"]').closest('.option-card');
    
    // Clear all other selections
    document.querySelectorAll('.option-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Highlight the custom card
    customCard.classList.add('selected');
    optionGrid.classList.add('has-selection');
    
    // Update summary
    updateSummary();
}

/**
 * Update the trip summary based on all form inputs
 */
function updateSummary() {
    // Get destination
    const destination = document.getElementById('destination-input').value;
    
    // Get dates
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    
    // Get interests
    const interestCheckboxes = document.querySelectorAll('input[name="interests[]"]:checked, #custom-interests-container input[name="interests[]"]');
    const interests = Array.from(interestCheckboxes).map(cb => cb.value);
    
    // Get vacation type
    let vacationType = document.getElementById('vacation-type').value;
    const customTripType = document.getElementById('custom-trip-type-display').textContent;
    if (customTripType) {
        vacationType = customTripType;
    }
    
    // Get description
    const description = document.getElementById('message').value;
    
    // Build summary
    let summary = '';
    
    if (destination) {
        summary += `🌎 <strong>Destination:</strong> ${destination}\n`;
    }
    
    if (startDate && endDate) {
        summary += `✈️ <strong>Trip Dates:</strong> ${startDate} to ${endDate}\n`;
    }
    
    if (interests.length > 0) {
        summary += `⭐ <strong>Interests:</strong> ${interests.join(', ')}\n`;
    }
    
    if (vacationType) {
        summary += `👥 <strong>Trip Type:</strong> ${vacationType.replace(/-/g, ' ')}\n`;
    }
    
    if (description) {
        summary += `\n<strong>Additional Details:</strong>\n${description}`;
    }
    
    // Update the summary display
    const summaryElement = document.getElementById('trip-summary');
    
    if (summary) {
        summaryElement.innerHTML = summary;
    } else {
        summaryElement.innerHTML = 'Please fill out the form sections above to see your trip summary.';
    }
}

/**
 * Handle form submission 
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Show loading state
    const submitBtn = document.getElementById('submit-btn');
    const loadingSpinner = document.getElementById('loading-spinner');
    const loadingModal = document.getElementById('loading-modal');
    const errorMessage = document.getElementById('error-message');
    
    // Initialize prompt content
    let promptContent = '';
    
    submitBtn.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    loadingModal.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    
    const destination = document.getElementById('destination-input').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const interestCheckboxes = document.querySelectorAll('input[name="interests[]"]:checked, #custom-interests-container input[name="interests[]"]');
    const interests = Array.from(interestCheckboxes).map(cb => cb.value).join(', ');
    let vacationType = document.getElementById('vacation-type').value;
    const messageText = document.getElementById('message').value;
    
    // Validate required inputs
    let isValid = true;
    let errorText = '';
    
    if (!destination) {
        isValid = false;
        errorText = 'Please enter a destination';
    } else if (!startDate || !endDate) {
        isValid = false;
        errorText = 'Please select travel dates';
    }
    
    if (!isValid) {
        errorMessage.classList.remove('hidden');
        // Check if errorMessage has a <p> element inside before setting textContent
        const errorParagraph = errorMessage.querySelector('p');
        if (errorParagraph) {
            errorParagraph.textContent = errorText;
        } else {
            // If there's no <p> element, create one
            const pElement = document.createElement('p');
            pElement.textContent = errorText;
            pElement.className = 'text-red-600';
            errorMessage.appendChild(pElement);
        }
        submitBtn.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
        loadingModal.classList.add('hidden');
        return;
    }
    
    if (destination) {
        promptContent += `Destination: ${destination}\n\n`;
    }
    
    if (startDate && endDate) {
        promptContent += `Trip Dates: ${startDate} to ${endDate}\n\n`;
    }
    
    if (interests) {
        promptContent += `Interests: ${interests}\n\n`;
    }
    
    if (vacationType) {
        promptContent += `Vacation Type: ${vacationType}\n\n`;
    }
    
    if (messageText.trim()) {
        promptContent += `Additional Details and Instructions: ${messageText}`;
    }
    
    const finalMessage = promptContent;
    console.log('Submitting message:', finalMessage);

    fetch('/api/GPTItinerary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalMessage })
    })
    .then(async res => {
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text);
        }
        return res.json();
    })
    .then(data => {
        sessionStorage.setItem("itinerary", data.completion.content);
        window.location.href = '/itinPage';
    })
    .catch(error => {
        console.error('Error:', error);
        errorMessage.classList.remove('hidden');
        
        // Check if errorMessage has a <p> element inside before setting textContent
        const errorParagraph = errorMessage.querySelector('p');
        const errorText = error.message || 'An unexpected error occurred. Please try again.';
        
        if (errorParagraph) {
            errorParagraph.textContent = errorText;
        } else {
            // If there's no <p> element, create one
            const pElement = document.createElement('p');
            pElement.textContent = errorText;
            pElement.className = 'text-red-600';
            errorMessage.appendChild(pElement);
        }
        
        // Scroll to error message
        errorMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    })
    .finally(() => {
        // Reset loading state
        submitBtn.classList.remove('hidden');
        loadingSpinner.classList.add('hidden');
        loadingModal.classList.add('hidden');
    });
}
