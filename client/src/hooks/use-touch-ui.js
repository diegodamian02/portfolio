import { useEffect, useState } from "react";

// "Is this the touch / narrow UI?" — Stage 12.3.
//
// The query itself was already in record-crate.jsx, where the comment above
// it records why it is this exact pair: a `pointer: coarse` check ALONE
// disagreed with the inclusive CSS `max-width` at exactly 768px (an iPad Mini
// in portrait) and the crate's dropdown opened off the top of the screen.
//
// Lifted here because Stage 12.3 adds a second consumer that must agree with
// the first: the Pocket Player moves the deck out of the hero and into the
// bottom sheet on the same viewports where the crate becomes a full-screen
// dig takeover. Two copies of a breakpoint are two things to forget to change
// together, and the failure mode — a phone with the crate in takeover mode
// and the deck still in the hero — is exactly the kind that only shows up on
// a real device.
export const TOUCH_UI_QUERY = "(pointer: coarse), (max-width: 768px)";

export default function useTouchUI() {
    const [isTouchUI, setIsTouchUI] = useState(
        () => typeof window !== "undefined" && window.matchMedia(TOUCH_UI_QUERY).matches,
    );

    useEffect(() => {
        const mq = window.matchMedia(TOUCH_UI_QUERY);
        const onChange = (e) => setIsTouchUI(e.matches);
        mq.addEventListener("change", onChange);
        // Re-read on mount: the media query can have changed between the
        // useState initialiser and this effect (a rotation during hydration,
        // or a devtools device switch), and the initialiser never runs again.
        setIsTouchUI(mq.matches);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    return isTouchUI;
}
