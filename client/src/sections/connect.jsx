import React, {useState} from 'react';
import '../styles/main.scss';
import axios from 'axios';

export default function Connect() {
    const [formData, setFormData] = useState( {
        name: '',
        email: '',
        message: ''
    });

    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData({ ...formData, [name]: value});
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form Submitted:', formData);
        alert("Thank you for reaching out! I'll get back to you soon." );

        // Send form data to the backend
        axios.post('https://diegosportfolio-3094a3e5fc1b.herokuapp.com/send-email', formData)
            .then(response => {
                console.log('Email sent successfully:', response.data);
            })
            .catch(error => {
                console.error('Error sending email:', error);
                alert('There was an issue sending your message. Please try again later.');
            });

        //Clear the form after submision
        setFormData({
            name: '',
            email: '',
            message: ''
        });
    };

    return(
        <section className="contact-section">
            <div className="contact-container">
                <h2 className="contact-title">Let's have a coffee talk</h2>
                <p className="contact-description">Let's connect and build something amazing together — reach me directly at <a href="mailto:diegodamiango02@gmail.com">diegodamiango02@gmail.com</a> or send a message below.</p>
                <form className="contact-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="name">Name</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="message">Message</label>
                        <textarea
                            name="message"
                            id="message"
                            rows="5"
                            value={formData.message}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <button type="submit" className="submit-button">Send Message</button>
                </form>
            </div>
        </section>
    );
}

