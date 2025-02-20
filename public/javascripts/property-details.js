document.addEventListener('DOMContentLoaded', function() {
  // Image gallery functionality
  const mainImage = document.querySelector('.main-image');
  const thumbnails = document.querySelectorAll('.thumbnail');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  let currentIndex = 0;

  // Function to update main image with dynamic aspect ratio
  function updateMainImage(imageUrl) {
    // Create a temporary image to get the natural dimensions
    const img = new Image();
    img.onload = function() {
      const aspectRatio = (this.height / this.width) * 100;
      mainImage.style.paddingTop = `${aspectRatio}%`;
      mainImage.style.backgroundImage = `url('${imageUrl}')`;
    };
    img.src = imageUrl;
  }

  // Function to update active thumbnail
  function updateActiveThumbnail(index) {
    thumbnails.forEach(thumb => thumb.classList.remove('active'));
    thumbnails[index].classList.add('active');
    currentIndex = index;
  }

  // Initialize first image's aspect ratio
  if (mainImage.style.backgroundImage) {
    const initialUrl = mainImage.style.backgroundImage.replace(/url\(['"](.+)['"]\)/, '$1');
    updateMainImage(initialUrl);
  }

  // Add click handlers to thumbnails
  thumbnails.forEach((thumbnail, index) => {
    thumbnail.addEventListener('click', () => {
      const imageUrl = thumbnail.dataset.image;
      updateMainImage(imageUrl);
      updateActiveThumbnail(index);
    });
  });

  // Navigation button handlers
  prevBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + thumbnails.length) % thumbnails.length;
    const imageUrl = thumbnails[currentIndex].dataset.image;
    updateMainImage(imageUrl);
    updateActiveThumbnail(currentIndex);
  });

  nextBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % thumbnails.length;
    const imageUrl = thumbnails[currentIndex].dataset.image;
    updateMainImage(imageUrl);
    updateActiveThumbnail(currentIndex);
  });

  // Video gallery functionality
  const videoThumbnails = document.querySelectorAll('.video-thumbnail');
  const mainVideo = document.querySelector('.main-video');
  const videoTitle = document.querySelector('.video-title');

  function updateMainVideo(videoUrl, title) {
    if (mainVideo) {
      // Pause current video if playing
      mainVideo.pause();
      // Update video source
      mainVideo.src = videoUrl;
      // Load and play new video
      mainVideo.load();
      // Update title if provided
      if (title && videoTitle) {
        videoTitle.textContent = title;
      }
    }
  }

  // Add click handlers to video thumbnails
  videoThumbnails.forEach(thumbnail => {
    thumbnail.addEventListener('click', () => {
      const videoUrl = thumbnail.dataset.video;
      const title = thumbnail.dataset.title;
      updateMainVideo(videoUrl, title);
      
      // Update active state
      videoThumbnails.forEach(thumb => thumb.classList.remove('active'));
      thumbnail.classList.add('active');
    });
  });
}); 