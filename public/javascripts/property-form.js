document.addEventListener('DOMContentLoaded', function() {
  const imageGrid = document.querySelector('#sortable-grid');
  const mainImageInput = document.getElementById('mainImage');
  const mainImagePreview = document.querySelector('.current-image img');
  if (!imageGrid) {
    console.log('No image grid found');
    return;
  }

  // Function to set main image
  function setMainImage(imageUrl) {
    // Update the preview
    if (mainImagePreview) {
      mainImagePreview.src = imageUrl;
    }
    
    // Create a new hidden input for the main image URL
    let mainImageUrlInput = document.getElementById('mainImageUrl');
    if (!mainImageUrlInput) {
      mainImageUrlInput = document.createElement('input');
      mainImageUrlInput.type = 'hidden';
      mainImageUrlInput.id = 'mainImageUrl';
      mainImageUrlInput.name = 'mainImageUrl';
      mainImageInput.parentNode.appendChild(mainImageUrlInput);
    }
    mainImageUrlInput.value = imageUrl;
    
    // Update visual indicators
    imageGrid.querySelectorAll('.image-container').forEach(container => {
      container.classList.remove('is-main');
      if (container.querySelector('img').src === imageUrl) {
        container.classList.add('is-main');
      }
    });
  }

  // Handle "Set as Main" clicks
  imageGrid.addEventListener('click', function(e) {
    const setMainButton = e.target.closest('.set-main-image');
    if (setMainButton) {
      e.preventDefault();
      const container = e.target.closest('.image-container');
      const imageUrl = container.querySelector('img').src;
      console.log('Setting main image:', imageUrl);
      setMainImage(imageUrl);
    }
  });

  // Simple Sortable initialization
  const sortable = new Sortable(imageGrid, {
    animation: 150,
    handle: '.drag-handle',
    draggable: '.image-container',
    onSort: function() {
      console.log('Sort happened!');
      updateImageOrder();
    }
  });

  console.log('Sortable initialized with element:', imageGrid);

  function updateImageOrder() {
    const images = Array.from(imageGrid.querySelectorAll('.image-container:not(.marked-delete)'));
    const order = images.map(img => img.dataset.index);
    document.getElementById('imageOrder').value = JSON.stringify(order);
    
    const deletedImages = Array.from(document.querySelectorAll('.image-container.marked-delete'))
      .map(img => parseInt(img.dataset.index));
    document.getElementById('deleteImages').value = JSON.stringify(deletedImages);
  }

  // Handle image deletions
  imageGrid.querySelectorAll('.delete-image').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      if (confirm('Are you sure you want to delete this image?')) {
        const imageContainer = this.closest('.image-container');
        imageContainer.classList.add('marked-delete');
        imageContainer.style.opacity = '0.5';
        updateImageOrder();
      }
    });
  });

  // Handle new image uploads
  const imageInput = document.getElementById('images');
  if (imageInput) {
    imageInput.addEventListener('change', function(e) {
      const files = Array.from(e.target.files);
      
      if (!document.querySelector('.image-grid')) {
        const grid = document.createElement('div');
        grid.id = 'sortable-grid';
        grid.className = 'image-grid';
        this.parentNode.insertBefore(grid, this.nextSibling);
        initializeSortable(grid);
      }
      
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

  // Update preview when main image is selected via file input
  mainImageInput.addEventListener('change', function(e) {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        if (mainImagePreview) {
          mainImagePreview.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    }
  });

  // Initialize order on page load
  updateImageOrder();

  const form = document.getElementById('propertyForm');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('Form submission started');
      
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      
      try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
        if (!csrfToken) {
          throw new Error('Security token missing');
        }
        
        const formData = new FormData(form);
        
        // Log form data for debugging
        for (let [key, value] of formData.entries()) {
          if (value instanceof File) {
            console.log(`${key}: ${value.name} (${value.size} bytes)`);
          } else {
            console.log(`${key}: ${value}`);
          }
        }
        
        const response = await fetch(form.action, {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
          headers: {
            'CSRF-Token': csrfToken
          }
        });
        
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
          window.location.href = '/manage';
        } else {
          throw new Error(data.error || 'Failed to update property');
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert(error.message || 'Failed to update property. Please try again.');
      } finally {
        submitButton.disabled = false;
      }
    });
  }
}); 