import { useState } from 'react';
import '../styles/main.scss';
import axios from 'axios';
import { RESUME_URL, RESUME_ARIA_LABEL } from '../lib/sections.js';

// Same trailing-slash guard as my-taste.jsx: a trailing slash on the env var
// would produce "//api/contact", which Express treats as an unregistered path.
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050').replace(/\/+$/, '');

const EMPTY = { name: '', email: '', message: '', website: '' };

export default function Connect() {
    const [formData, setFormData] = useState(EMPTY);
    // idle | sending | sent | error — the previous version had no notion of
    // this at all: it alert()ed a thank-you before the request was even sent,
    // so a failure was invisible to the visitor and the message was lost.
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (status === 'error') setStatus('idle');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (status === 'sending') return;

        setStatus('sending');
        setErrorMessage('');

        try {
            await axios.post(`${apiBaseUrl}/api/contact`, formData);
            setStatus('sent');
            setFormData(EMPTY);
        } catch (error) {
            // The server sends a visitor-safe string for the cases it can
            // anticipate (validation, rate limit, SMTP down); anything else
            // falls back to a generic line rather than surfacing an axios dump.
            setErrorMessage(
                error.response?.data?.error ||
                "Something went wrong sending that. Please try again, or email me directly at diegodamiango02@gmail.com."
            );
            setStatus('error');
        }
    };

    const isSending = status === 'sending';

    return (
        <section className="contact-section">
            <div className="contact-container">
                <h2 className="contact-title">Let&apos;s have a coffee talk</h2>
                <p className="contact-description">
                    Let&apos;s connect and build something amazing together — reach me directly at{' '}
                    <a href="mailto:diegodamiango02@gmail.com">diegodamiango02@gmail.com</a> or send a message below.
                </p>

                {/* Sits with the email rather than in the form: this is where
                    someone who has already decided to act looks first. */}
                <p className="contact-resume">
                    <a
                        href={RESUME_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={RESUME_ARIA_LABEL}
                    >
                        Resume (PDF)
                    </a>
                </p>

                {status === 'sent' ? (
                    <div className="contact-success" role="status">
                        <p>Thanks for reaching out — your message is on its way.</p>
                        <p>I&apos;ll get back to you soon.</p>
                        <button type="button" className="submit-button" onClick={() => setStatus('idle')}>
                            Send another
                        </button>
                    </div>
                ) : (
                    <form className="contact-form" onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input
                                type="text"
                                name="name"
                                id="name"
                                maxLength={100}
                                value={formData.name}
                                onChange={handleChange}
                                disabled={isSending}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                type="email"
                                name="email"
                                id="email"
                                maxLength={254}
                                value={formData.email}
                                onChange={handleChange}
                                disabled={isSending}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="message">Message</label>
                            <textarea
                                name="message"
                                id="message"
                                rows="5"
                                maxLength={5000}
                                value={formData.message}
                                onChange={handleChange}
                                disabled={isSending}
                                required
                            />
                        </div>

                        {/* Honeypot — hidden from humans, irresistible to bots.
                            aria-hidden + tabIndex keep it out of the keyboard
                            and screen-reader path so it never traps a real
                            visitor. The server drops anything that fills it. */}
                        <div className="contact-hp" aria-hidden="true">
                            <label htmlFor="website">Leave this field empty</label>
                            <input
                                type="text"
                                name="website"
                                id="website"
                                tabIndex={-1}
                                autoComplete="off"
                                value={formData.website}
                                onChange={handleChange}
                            />
                        </div>

                        {status === 'error' && (
                            <p className="contact-error" role="alert">{errorMessage}</p>
                        )}

                        <button type="submit" className="submit-button" disabled={isSending}>
                            {isSending ? 'Sending…' : 'Send Message'}
                        </button>
                    </form>
                )}
            </div>
        </section>
    );
}
