import express from 'express';
import nodemailer from 'nodemailer';
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());  // Parse JSON bodies

// Email sending setup
const transporter = nodemailer.createTransport({
    service: 'gmail',  // You can change this to your email provider
    auth: {
        user: 'your-email@gmail.com',  // Use your email
        pass: 'your-email-password',   // Use your email password or app-specific password
    },
});

app.post('/send-email', (req, res) => {
    const { name, email, message } = req.body;

    // Compose email
    const mailOptions = {
        from: email,  // Sender's email
        to: 'diegodamiango02@gmail.com',  // Receiver's email
        subject: 'New Contact Form Submission',
        text: `You have a new message from ${name} (${email}):\n\n${message}`,
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error sending email');
        }
        console.log('Email sent: ' + info.response);
        return res.status(200).send('Email sent successfully');
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
