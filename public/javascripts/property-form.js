// Define all functions at the top level
function initializeImageHandlers() {
  const imageInput = document.querySelector('input[name="images"]');
  const imageGrid = document.querySelector('.image-grid');
  const mainImageInput = document.querySelector('input[name="mainImage"]');
  const mainImagePreview = document.querySelector('.current-image img');

  if (imageInput && imageGrid) {
    // Initialize sortable
    new Sortable(imageGrid, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: updateImageOrder
    });

    // Handle image uploads
    imageInput.addEventListener('change', function(e) {
      const files = Array.from(this.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
          const container = document.createElement('div');
          container.className = 'image-container';
          const nextIndex = imageGrid.querySelectorAll('.image-container').length;
          container.dataset.index = nextIndex;
          container.innerHTML = `
            <img src="${e.target.result}" alt="New image">
            <div class="image-actions">
              <button type="button" class="delete-image" title="Remove image">
                <i class="fas fa-times"></i>
              </button>
              <button type="button" class="set-main-image" title="Set as main image">
                <i class="fas fa-star"></i>
              </button>
            </div>
            <div class="drag-handle" title="Drag to reorder">
              <i class="fas fa-grip-lines"></i>
            </div>
          `;
          imageGrid.appendChild(container);
          
          // Add delete handler
          container.querySelector('.delete-image').addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to remove this image?')) {
              container.remove();
              updateImageOrder();
            }
          });
        };
        reader.readAsDataURL(file);
      });
      updateImageOrder();
    });
  }

  // Update preview when main image is selected
  if (mainImageInput && mainImagePreview) {
    mainImageInput.addEventListener('change', function(e) {
      const file = this.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          mainImagePreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

function initializeVideoHandlers() {
  const videoInput = document.querySelector('input[name="videos"]');
  const videoGrid = document.querySelector('.video-grid');
  
  if (videoInput && videoGrid) {
    // Initialize sortable for videos
    new Sortable(videoGrid, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: updateVideoOrder
    });

    // Handle video uploads
    videoInput.addEventListener('change', function(e) {
      const files = Array.from(this.files);
      files.forEach(file => {
        // Create video preview container
        const container = document.createElement('div');
        container.className = 'video-container';
        const nextIndex = videoGrid.querySelectorAll('.video-container').length;
        container.dataset.index = nextIndex;
        
        // Create video element
        const video = document.createElement('video');
        video.controls = true;
        video.width = 320;
        const source = document.createElement('source');
        source.src = URL.createObjectURL(file);
        source.type = file.type;
        video.appendChild(source);
        
        container.appendChild(video);
        videoGrid.appendChild(container);
      });
      updateVideoOrder();
    });
  }
}

function updateImageOrder() {
  const imageGrid = document.querySelector('.image-grid');
  const imageOrderInput = document.getElementById('imageOrder');
  
  if (imageGrid && imageOrderInput) {
    const containers = imageGrid.querySelectorAll('.image-container');
    const order = Array.from(containers).map(container => container.dataset.index);
    imageOrderInput.value = JSON.stringify(order);
  }
}

function updateVideoOrder() {
  const videoGrid = document.querySelector('.video-grid');
  const videoOrderInput = document.getElementById('videoOrder');
  
  if (videoGrid && videoOrderInput) {
    const containers = videoGrid.querySelectorAll('.video-container');
    const order = Array.from(containers).map(container => container.dataset.index);
    videoOrderInput.value = JSON.stringify(order);
  }
}

async function handleFormSubmit(e) {
  const form = e.target;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  
  try {
    // Validate required fields
    const requiredFields = form.querySelectorAll('[required]');
    let missingFields = [];
    
    requiredFields.forEach(field => {
      if (!field.value) {
        missingFields.push(field.labels[0]?.textContent || field.name);
      }
    });
    
    if (missingFields.length > 0) {
      throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
    }
    
    const formData = new FormData(form);
    const csrfToken = formData.get('_csrf');
    
    if (!csrfToken) {
      throw new Error('Security token missing');
    }
    
    // Add CSRF token to URL
    const url = new URL(form.action, window.location.origin);
    url.searchParams.set('_csrf', csrfToken);
    
    console.log('Submitting to URL:', url.toString());
    console.log('Form data entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}: ${value instanceof File ? value.name : value}`);
    }
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save property');
    }
    
    const data = await response.json();
    window.location.href = data.redirect || '/manage';
    
  } catch (error) {
    console.error('Upload error:', error);
    alert(error.message || 'Failed to save property. Please try again.');
  } finally {
    submitButton.disabled = false;
  }
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('propertyForm');
  if (form) {
    console.log('Initializing property form handler');
    
    // Remove any existing onsubmit handler
    form.removeAttribute('onsubmit');
    
    // Prevent form from submitting normally
    form.addEventListener('submit', function(e) {
      console.log('Form submit intercepted');
      e.preventDefault();
      e.stopPropagation();
      handleFormSubmit(e);
    });

    // Initialize other handlers
    initializeImageHandlers();
    initializeVideoHandlers();
    updateImageOrder();
    updateVideoOrder();

    const listingTypeSelect = document.getElementById('listingType');
    const priceIntervalSelect = document.getElementById('priceInterval');
    
    if (listingTypeSelect && priceIntervalSelect) {
      listingTypeSelect.addEventListener('change', function() {
        if (this.value === 'rental') {
          priceIntervalSelect.value = 'monthly';
        } else {
          priceIntervalSelect.value = 'total';
        }
      });
    }
  }
}); 