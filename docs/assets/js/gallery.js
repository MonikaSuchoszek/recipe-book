// Gallery viewer: full screen <dialog> with scroll snap. Swipe, arrow keys or buttons move.
import { escapeHtml } from "./ui.js";

const viewer = document.getElementById("gallery-viewer");
const thumbs = [...document.querySelectorAll("[data-gallery-index]")];

if (viewer && thumbs.length) {
  const track = viewer.querySelector("[data-viewer-track]");
  track.innerHTML = thumbs.map((thumb, index) => `
    <figure class="viewer__slide" aria-label="Photo ${index + 1} of ${thumbs.length}">
      <img src="${escapeHtml(thumb.dataset.full)}" srcset="${escapeHtml(thumb.dataset.srcset)}" sizes="100vw" alt="${escapeHtml(thumb.querySelector("img").alt)}" loading="lazy">
      ${thumb.dataset.caption ? `<figcaption>${escapeHtml(thumb.dataset.caption)}</figcaption>` : ""}
    </figure>`).join("");

  const slideWidth = () => track.clientWidth;
  const current = () => Math.round(track.scrollLeft / slideWidth());
  const go = (index) => {
    const clamped = Math.max(0, Math.min(thumbs.length - 1, index));
    track.scrollTo({ left: clamped * slideWidth(), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  for (const thumb of thumbs) {
    thumb.addEventListener("click", (event) => {
      event.preventDefault();
      viewer.showModal();
      track.scrollLeft = Number(thumb.dataset.galleryIndex) * slideWidth();
    });
  }
  viewer.querySelector("[data-viewer-close]").addEventListener("click", () => viewer.close());
  viewer.querySelector("[data-viewer-prev]").addEventListener("click", () => go(current() - 1));
  viewer.querySelector("[data-viewer-next]").addEventListener("click", () => go(current() + 1));
  viewer.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") go(current() - 1);
    if (event.key === "ArrowRight") go(current() + 1);
  });
}
