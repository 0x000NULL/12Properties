function openImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    
    modal.style.display = "block";
    modalImg.src = imageSrc;
}

function changeMainImage(thumbnailElement, imageSrc) {
    // Update main image
    const mainImage = thumbnailElement.closest('.property-gallery').querySelector('.main-image');
    mainImage.style.backgroundImage = `url('${imageSrc}')`;
    
    // Update onclick handler for the main image
    mainImage.onclick = () => openImageModal(imageSrc);
    
    // Update active thumbnail
    const thumbnails = thumbnailElement.closest('.thumbnail-strip').querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => thumb.classList.remove('active'));
    thumbnailElement.classList.add('active');
}

// Close modal when clicking the x button
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.getElementsByClassName('modal-close')[0];
    
    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    // Close modal when clicking outside the image
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = "none";
        }
    }

    // Close modal with escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === "block") {
            modal.style.display = "none";
        }
    });
}); 