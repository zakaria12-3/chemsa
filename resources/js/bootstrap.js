import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

const prefetchedPages = new Set();

function prefetchPage(link) {
    if (!(link instanceof HTMLAnchorElement)) {
        return;
    }

    if (
        !link.href ||
        link.target ||
        link.hasAttribute('download') ||
        link.dataset.prefetch === 'false'
    ) {
        return;
    }

    const url = new URL(link.href, window.location.href);

    if (
        url.origin !== window.location.origin ||
        url.pathname === window.location.pathname && url.search === window.location.search ||
        prefetchedPages.has(url.href)
    ) {
        return;
    }

    prefetchedPages.add(url.href);

    fetch(url.href, {
        credentials: 'same-origin',
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Purpose': 'prefetch',
        },
        priority: 'low',
    }).catch(() => {
        prefetchedPages.delete(url.href);
    });
}

document.addEventListener('pointerover', (event) => {
    const link = event.target.closest('a[href]');
    prefetchPage(link);
}, { passive: true });

document.addEventListener('focusin', (event) => {
    const link = event.target.closest('a[href]');
    prefetchPage(link);
});

document.addEventListener('touchstart', (event) => {
    const link = event.target.closest('a[href]');
    prefetchPage(link);
}, { passive: true });
