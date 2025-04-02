function showNotificationModal(propertyId, propertyTitle) {
  const modalHtml = `
    <div id="notificationModal" class="modal">
      <div class="modal-content">
        <span class="close">&times;</span>
        <h2>Get Notified</h2>
        <p>Receive updates when ${propertyTitle} becomes available</p>
        <form id="notificationForm" class="notification-form">
          <input type="hidden" name="propertyId" value="${propertyId}">
          <input type="hidden" name="_csrf" value="${document.querySelector('meta[name="csrf-token"]').content}">
          <div class="form-group">
            <label for="name">Name *</label>
            <input type="text" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="email">Email *</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="phone">Phone (optional)</label>
            <input type="tel" id="phone" name="phone">
          </div>
          <button type="submit" class="btn-primary">Subscribe</button>
        </form>
        <div id="notificationMessage" class="notification-message"></div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = document.getElementById('notificationModal');
  const closeBtn = modal.querySelector('.close');
  const form = document.getElementById('notificationForm');
  const messageDiv = document.getElementById('notificationMessage');

  modal.style.display = 'block';

  closeBtn.onclick = function() {
    modal.remove();
  }

  window.onclick = function(event) {
    if (event.target === modal) {
      modal.remove();
    }
  }

  form.onsubmit = async function(e) {
    e.preventDefault();
    
    try {
      const response = await fetch('/notifications/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({
          propertyId: this.propertyId.value,
          name: this.name.value,
          email: this.email.value,
          phone: this.phone.value
        })
      });

      const data = await response.json();

      if (response.ok) {
        messageDiv.className = 'notification-message success';
        messageDiv.textContent = data.message;
        form.reset();
        setTimeout(() => modal.remove(), 3000);
      } else {
        messageDiv.className = 'notification-message error';
        messageDiv.textContent = data.error;
      }
    } catch (error) {
      messageDiv.className = 'notification-message error';
      messageDiv.textContent = 'An error occurred. Please try again.';
    }
  }
} 