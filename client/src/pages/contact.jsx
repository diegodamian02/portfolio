export default function Contact() {
    return (
        <section className="contact">
            <h2>Contact Me 📩</h2>
            <p>Let's connect and build something amazing!</p>
            <form className="contact-form">
                <input type="text" placeholder="Your Name" required />
                <input type="email" placeholder="Your Email" required />
                <textarea placeholder="Your Message" required></textarea>
                <button type="submit">Send Message</button>
            </form>
        </section>
    );
}
