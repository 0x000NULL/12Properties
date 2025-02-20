const PropertyNotification = require('../models/PropertyNotification');
const transporter = require('../config/mailer');

class NotificationService {
  static async notifySubscribersOfNewProperty(property) {
    try {
      // Get all subscribers who want notifications (both general and property-specific)
      const notifications = await PropertyNotification.find({
        $or: [
          { type: 'general' },
          { propertyId: null }
        ],
        notified: false
      }).lean(); // Use lean() to get plain objects instead of Mongoose documents

      // Prepare email content
      const emailContent = `
        <h2>New Property Available!</h2>
        <div style="margin: 20px 0;">
          <img 
            src="${process.env.BASE_URL}${property.mainImage}" 
            alt="${property.title}"
            style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
        </div>
        <h3>${property.title}</h3>
        <p><strong>Location:</strong> ${property.location}</p>
        <p><strong>Price:</strong> $${property.price.toLocaleString()}</p>
        <p><strong>Details:</strong></p>
        <ul>
          <li>${property.beds} Bedrooms</li>
          <li>${property.baths} Bathrooms</li>
          <li>${property.sqft.toLocaleString()} sq.ft</li>
        </ul>
        <p>${property.description}</p>
        <p>
          <a 
            href="${process.env.BASE_URL}/property/${property._id}"
            style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 4px;
              margin-top: 20px;
            "
          >
            View Full Property Details
          </a>
        </p>
      `;

      // Send emails to all subscribers
      for (const notification of notifications) {
        const mailOptions = {
          from: `"12 Properties" <${process.env.SMTP_FROM}>`,
          to: notification.email,
          subject: 'New Property Available - 12 Properties',
          html: `
            <div style="
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            ">
              <h2>Hello ${notification.name},</h2>
              ${emailContent}
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p>
                <small style="color: #666;">
                  You received this email because you subscribed to property notifications. 
                  To unsubscribe, please contact us.
                </small>
              </p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        
        // Update notification status using findByIdAndUpdate instead of save()
        await PropertyNotification.findByIdAndUpdate(notification._id, { notified: true });
      }

      return {
        success: true,
        notifiedCount: notifications.length
      };
    } catch (error) {
      console.error('Error sending notifications:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = NotificationService; 