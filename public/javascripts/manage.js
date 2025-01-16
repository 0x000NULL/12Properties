document.addEventListener('DOMContentLoaded', function() {
  // Get CSRF token from meta tag
  const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

  document.querySelectorAll('.delete-form').forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      if (confirm('Are you sure you want to delete this property?')) {
        const propertyId = this.dataset.propertyId;
        fetch(`/api/properties/${propertyId}`, {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: {
            'CSRF-Token': csrfToken
          }
        })
        .then(response => {
          if (response.ok) {
            window.location.reload();
          } else {
            alert('Failed to delete property');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('Failed to delete property');
        });
      }
    });
  });
}); 