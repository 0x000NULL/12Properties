async function initRecaptcha(formId = 'contactForm') {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitButton = form.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    // Show loading state
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    // Wait for reCAPTCHA to be ready
    if (!window.grecaptcha) {
      showFormError(form, 'reCAPTCHA is still loading. Please try again in a moment.');
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      return;
    }

    grecaptcha.ready(function() {
      console.log('reCAPTCHA is ready');
      grecaptcha.execute(document.querySelector('meta[name="recaptcha-key"]').content, {action: 'contact'})
        .then(function(token) {
          console.log('Got reCAPTCHA token');
          const recaptchaInput = form.querySelector('input[name="g-recaptcha-response"]');
          if (!recaptchaInput) {
            throw new Error('reCAPTCHA input not found');
          }
          recaptchaInput.value = token;
          console.log('Submitting form with token');
          form.submit();
        })
        .catch(function(error) {
          console.error('reCAPTCHA error:', error);
          // Show error in form instead of alert
          showFormError(form, 'Error verifying reCAPTCHA. Please try again.');
        })
        .finally(function() {
          submitButton.disabled = false;
          submitButton.textContent = originalText;
        });
    });
  });
}

function showFormError(form, message) {
  let errorDiv = form.querySelector('.form-error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'form-error alert alert-error';
    form.insertBefore(errorDiv, form.firstChild);
  }
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  
  // Hide error after 5 seconds
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

async function executeRecaptcha(siteKey, maxRetries = 3) {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      return await new Promise((resolve, reject) => {
        grecaptcha.ready(async function() {
          try {
            const token = await grecaptcha.execute(siteKey, {action: 'contact'});
            resolve(token);
          } catch (error) {
            reject(error);
          }
        });
      });
    } catch (error) {
      attempts++;
      if (attempts === maxRetries) throw error;
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
    }
  }
}

const RateLimit = {
  attempts: {},
  maxAttempts: 3,
  resetTime: 3600000, // 1 hour

  check: function() {
    const now = Date.now();
    const attempts = this.attempts;

    // Clean up old entries
    Object.keys(attempts).forEach(key => {
      if (now - attempts[key].timestamp > this.resetTime) {
        delete attempts[key];
      }
    });

    // Check current IP
    const currentAttempts = attempts[window.location.host] || { count: 0, timestamp: now };
    if (currentAttempts.count >= this.maxAttempts) {
      return false;
    }

    // Update attempts
    attempts[window.location.host] = {
      count: currentAttempts.count + 1,
      timestamp: now
    };
    return true;
  }
};

// Wait for both DOM and reCAPTCHA
window.onload = function() {
  initRecaptcha();
};

function validateForm(form) {
  const name = form.querySelector('input[name="name"]');
  const email = form.querySelector('input[name="email"]');
  const message = form.querySelector('textarea[name="message"]');
  
  const errors = [];
  
  if (name.value.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.push('Please enter a valid email address');
  }
  
  if (message.value.length < 10) {
    errors.push('Message must be at least 10 characters long');
  }
  
  return errors;
} 