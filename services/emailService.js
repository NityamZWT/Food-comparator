const nodemailer = require("nodemailer");

class EmailService {
  constructor(senderMail, senderPassword) {
    (this.service = "gmail"),
      (this.senderMail = senderMail),
      (this.senderPassword = senderPassword);
  }

  async sendEmail(userEmail) {
    console.log(userEmail, "USEREMAIL");
    console.log(process.env.SENDER_EMAIL, "SENDER EMAIL")
    console.log(process.env.SENDER_PASSWORD, "SENDER PASSWORD")

    
    let transporter = nodemailer.createTransport({
      service: this.service,
      auth: {
        user: this.senderMail,
        pass: this.senderPassword,
      },
    });

    let mailOptions = {
      from: this.senderMail,
      to: userEmail,
      subject: "Sending Email using Node.js",
      text: "That was easy!",
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Email sent: " + info.response);
      }
    });
  }
}

module.exports = new EmailService(
  process.env.SENDER_EMAIL,
  process.env.SENDER_PASSWORD
);
