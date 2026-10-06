'use strict';

const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');
const dialog = document.querySelector('#detail-dialog');
const detailButton = document.querySelector('#project-detail');

function closeMenu() {
  menuToggle.setAttribute('aria-expanded', 'false');
  siteNav.classList.remove('is-open');
}

menuToggle.hidden = false;
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  siteNav.classList.toggle('is-open', open);
});
siteNav.addEventListener('click', (event) => {
  if (event.target.closest('a')) closeMenu();
});
document.addEventListener('click', (event) => {
  if (!siteNav.contains(event.target) && !menuToggle.contains(event.target)) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && siteNav.classList.contains('is-open')) {
    closeMenu();
    menuToggle.focus();
  }
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 620) closeMenu();
});

if (typeof dialog.showModal === 'function') {
  detailButton.hidden = false;
  detailButton.addEventListener('click', () => dialog.showModal());
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => detailButton.focus());
}

document.querySelector('#current-year').textContent = String(new Date().getFullYear());
