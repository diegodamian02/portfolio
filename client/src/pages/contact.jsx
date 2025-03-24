import React, {useState} from 'react';
import '../styles/main.scss'

export default function Contact() {
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

