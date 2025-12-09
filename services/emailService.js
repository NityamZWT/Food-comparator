const nodemailer = require("nodemailer");

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendRecommendationEmail({ to, userName, recommendations, location }) {
        const html = this.generateEmailHTML(userName, recommendations, location);

        const mailOptions = {
            from: `"${process.env.APP_NAME || 'FoodApp'} Recommendations" <${process.env.SMTP_USER}>`,
            to: to,
            subject: `🍽️ Personalized Food Recommendations for ${userName}`,
            html: html,
        };

        return await this.transporter.sendMail(mailOptions);
    }

    generateEmailHTML(userName, recommendations, location) {
        const topRecs = recommendations.slice(0, 5);

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
        }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .header p { margin: 0; font-size: 16px; opacity: 0.95; }
        .content { padding: 30px; }
        .content h2 { color: #2d3748; margin-top: 0; font-size: 22px; }
        .dish-card { 
            background: #f8f9fa; 
            padding: 20px; 
            margin: 15px 0; 
            border-radius: 8px; 
            border-left: 4px solid #667eea;
            transition: transform 0.2s;
        }
        .dish-card:hover { transform: translateX(5px); }
        .dish-name { 
            font-size: 18px; 
            font-weight: bold; 
            color: #2d3748; 
            margin-bottom: 8px; 
        }
        .reason { 
            color: #4a5568; 
            font-size: 14px;
            margin-bottom: 10px;
        }
        .dish-details {
            margin-top: 10px; 
            font-size: 13px; 
            color: #718096;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }
        .detail-item {
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .cta-container {
            text-align: center;
            margin: 30px 0 20px 0;
        }
        .cta { 
            background: #667eea; 
            color: white; 
            padding: 14px 32px; 
            text-decoration: none; 
            border-radius: 6px; 
            display: inline-block;
            font-weight: 600;
            transition: background 0.3s;
        }
        .cta:hover { background: #5568d3; }
        .footer { 
            text-align: center; 
            padding: 25px 20px; 
            background: #f8f9fa;
            color: #718096; 
            font-size: 13px;
            border-top: 1px solid #e2e8f0;
        }
        .footer a { 
            color: #667eea; 
            text-decoration: none;
        }
        .footer a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍽️ Your Daily Food Picks</h1>
            <p>Hi ${userName}! Here are today's personalized recommendations in ${location}</p>
        </div>
        
        <div class="content">
            <h2>Top Recommendations for You</h2>
            
            ${topRecs.map((rec, idx) => `
                <div class="dish-card">
                    <div class="dish-name">${idx + 1}. ${rec.name}</div>
                    <div class="reason">${rec.reason}</div>
                    ${rec.details ? `
                        <div class="dish-details">
                            <span class="detail-item">💰 ₹${rec.details.price}</span>
                            <span class="detail-item">⭐ ${rec.details.rating}/5</span>
                            <span class="detail-item">🍴 ${rec.details.cuisine}</span>
                            ${rec.details.discount ? `<span class="detail-item">🎉 ${rec.details.discount}% OFF</span>` : ''}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
            
            <div class="cta-container">
                <a href="${process.env.APP_URL || 'https://yourapp.com'}/recommendations" class="cta">
                    View All ${recommendations.length} Recommendations →
                </a>
            </div>
        </div>
        
        <div class="footer">
            <p>You're receiving this because you opted in for personalized recommendations.</p>
            <p style="margin-top: 10px;">
                <a href="${process.env.APP_URL}/preferences">Update Preferences</a> | 
                <a href="${process.env.APP_URL}/unsubscribe">Unsubscribe</a>
            </p>
            <p style="margin-top: 15px; color: #a0aec0;">
                © ${new Date().getFullYear()} ${process.env.APP_NAME || 'FoodApp'}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }
}

module.exports = new EmailService();