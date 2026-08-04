import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(ScrollTrigger, SplitText, Draggable, InertiaPlugin);

export { gsap, ScrollTrigger, SplitText, Draggable, InertiaPlugin };
