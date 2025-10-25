// login.js

document.addEventListener('DOMContentLoaded', () => {
    // --- IMPORTANT: SET YOUR PIN HERE ---
    const CORRECT_PIN = "1234"; // Change this to your desired PIN

    const loginForm = document.getElementById('login-form');
    const pinInput = document.getElementById('pin-input');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Stop the form from submitting normally

        const enteredPin = pinInput.value;

        if (enteredPin === CORRECT_PIN) {
            // If the PIN is correct, store a "logged in" flag
            // sessionStorage is cleared when the browser tab is closed
            sessionStorage.setItem('isAuthenticated', 'true');
            
            // Redirect to the admin panel
            window.location.href = 'admin.html';
        } else {
            // If the PIN is incorrect, show an error message
            errorMessage.classList.remove('hidden');
            pinInput.classList.add('border-red-500'); // Highlight the input field
            pinInput.value = ''; // Clear the input
        }
    });
});
